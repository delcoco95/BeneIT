'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beneit-db-'));
process.env.BENEIT_DATA_DIR = dir;
const db = require('../lib/db');
const FILE = path.join(dir, 'audits.json');

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
test.beforeEach(() => { fs.rmSync(FILE, { force: true }); });

const mk = (id, extra = {}) => ({ id, createdAt: new Date().toISOString(), ...extra });
const files = () => fs.readdirSync(dir).filter((f) => f !== 'reports');

test('respecte BENEIT_DATA_DIR', () => {
  assert.equal(db.getReportPath('x'), path.join(dir, 'reports', 'x.pdf'));
  db.saveAudit(mk('a'));
  assert.ok(fs.existsSync(FILE));
});

test('getAudits renvoie [] si le fichier est absent', () => {
  assert.deepEqual(db.getAudits(), []);
});

test('getAudits leve une erreur sur JSON corrompu et ne l ecrase pas', () => {
  fs.writeFileSync(FILE, '{corrompu');
  assert.throws(() => db.getAudits());
  assert.throws(() => db.saveAudit(mk('a')));
  assert.equal(fs.readFileSync(FILE, 'utf-8'), '{corrompu');
});

test('save / get / delete', () => {
  db.saveAudit(mk('a'));
  db.saveAudit(mk('b'));
  db.saveAudit(mk('a', { profile: 'x' }));
  assert.equal(db.getAudits().length, 2);
  assert.equal(db.getAuditById('a').profile, 'x');
  assert.equal(db.deleteAudit('a'), true);
  assert.equal(db.deleteAudit('a'), false);
  assert.equal(db.getAuditById('a'), null);
});

test('ecriture atomique : aucun fichier temporaire residuel', () => {
  db.saveAudit(mk('a'));
  db.deleteAudit('a');
  assert.deepEqual(files(), ['audits.json']);
});

test('purge les diagnostics expires selon leur rattachement a une demande', () => {
  const old = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString();
  db.saveAudit(mk('anon', { createdAt: old }));
  db.saveAudit(mk('lead', { createdAt: old, leadId: 'l1' }));
  db.saveAudit(mk('new'));
  assert.equal(db.purgeExpiredAudits(), 1);
  assert.deepEqual(db.getAudits().map((a) => a.id).sort(), ['lead', 'new']);
  assert.deepEqual(files(), ['audits.json']);
});
