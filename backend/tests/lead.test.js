'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beneit-lead-'));
process.env.BENEIT_DATA_DIR = dir;
process.env.FRONTEND_URL = 'https://exemple.test';
delete process.env.ADMIN_ALERT_EMAIL;

const sent = [];
const mailerPath = require.resolve('../lib/mailer');
require.cache[mailerPath] = { id: mailerPath, filename: mailerPath, loaded: true, exports: { sendMail: async (m) => { sent.push(m); } } };

const express = require('express');
const db = require('../lib/db');
const leadsDb = require('../lib/leadsDb');
const { NEEDS } = require('../lib/leadValidation');
const leadRouter = require('../routes/lead');
const { NEED_LABELS } = leadRouter;

const app = express();
app.use(express.json());
app.use('/api/lead', leadRouter);
let server; let base;
test.before(async () => { await new Promise((r) => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}/api/lead`; });
test.after(() => { server.close(); });

let n = 0;
const uuid = () => `3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c${String(++n).padStart(4, '0')}`;
const audit = (id, extra = {}) => ({
  id, createdAt: new Date().toISOString(), profile: 'particulier', answers: [],
  report: { score: 50, summary: 's', categories: {}, priorities: [], recommendations: [] }, ...extra,
});
const post = (b) => fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const body = (auditId, email = 'a@exemple.fr') => ({ source: 'diagnostic', name: 'Jeanne Martin', email, consent: true, auditId });

test('NEED_LABELS couvre exactement NEEDS', () => {
  assert.deepEqual(Object.keys(NEED_LABELS).sort(), [...NEEDS].sort());
});

test('idempotence : un audit deja rattache ne cree ni demande ni mail', async () => {
  const id = uuid();
  db.saveAudit(audit(id, { leadId: 'existant', reportGenerated: true }));
  const before = leadsDb.listLeads().length;
  const mails = sent.length;
  const r = await post(body(id));
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, downloadUrl: `/api/report/${id}` });
  assert.equal(leadsDb.listLeads().length, before);
  assert.equal(sent.length, mails);
});

test('pas de demande enregistree si la generation du PDF echoue', async () => {
  const id = uuid();
  db.saveAudit(audit(id, { report: null }));
  const before = leadsDb.listLeads().length;
  const r = await post(body(id));
  assert.equal(r.status, 500);
  assert.equal(leadsDb.listLeads().length, before);
  assert.equal(db.getAuditById(id).leadId, undefined);
});

test('mail de confirmation limite a 3 par destinataire et par 24 h, demande toujours acceptee', async () => {
  const email = 'quota@exemple.fr';
  const before = leadsDb.listLeads().length;
  for (let i = 0; i < 5; i++) {
    const id = uuid();
    db.saveAudit(audit(id));
    const r = await post(body(id, email));
    assert.equal(r.status, 200);
    assert.equal(r.body.ok, true);
  }
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(leadsDb.listLeads().length, before + 5);
  assert.equal(sent.filter((m) => m.to === email).length, 3);
});
