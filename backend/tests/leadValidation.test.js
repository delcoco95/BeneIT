'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateLead } = require('../lib/leadValidation');

const base = { source: 'contact', need: 'bilan', name: 'Jeanne Martin', email: 'jeanne@exemple.fr', consent: true };
const AUDIT_ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e';

test('accepte une demande de contact complete et normalise les champs', () => {
  const r = validateLead({ ...base, email: ' Jeanne@Exemple.FR ', company: 'Boulangerie', phone: '06 12 34 56 78', message: 'Bonjour\nnous avons 5 postes' });
  assert.equal(r.ok, true);
  assert.equal(r.lead.email, 'jeanne@exemple.fr');
  assert.equal(r.lead.phone, '06 12 34 56 78');
  assert.equal(r.lead.message, 'Bonjour\nnous avons 5 postes');
  assert.equal(r.lead.auditId, null);
});

test('refuse sans consentement explicite (booleen true uniquement)', () => {
  assert.equal(validateLead({ ...base, consent: false }).ok, false);
  assert.equal(validateLead({ ...base, consent: 'true' }).ok, false);
  assert.equal(validateLead({ ...base, consent: undefined }).ok, false);
});

test('refuse un e-mail, un telephone ou un nom invalides', () => {
  assert.equal(validateLead({ ...base, email: 'pas-un-email' }).ok, false);
  assert.equal(validateLead({ ...base, phone: '<script>' }).ok, false);
  assert.equal(validateLead({ ...base, name: 'A' }).ok, false);
  assert.equal(validateLead({ ...base, name: 'x'.repeat(81) }).ok, false);
});

test('refuse un nom contenant des caracteres d en-tete ou de ponctuation dangereuse', () => {
  const r = validateLead({ ...base, name: 'Jeanne\r\nBcc: spam@exemple.com' });
  assert.equal(r.ok, false);
  assert.match(r.error, /nom/i);
  assert.equal(validateLead({ ...base, name: 'Bob <script>' }).ok, false);
  assert.equal(validateLead({ ...base, name: 'Bob@evil.com' }).ok, false);
});

test('accepte les noms composes, accentues et avec apostrophe', () => {
  for (const name of ["Jean-Pierre D'Arc", 'Zoé Lefèvre', 'J. Dupont', 'Anaïs Östberg']) {
    const r = validateLead({ ...base, name });
    assert.equal(r.ok, true, name);
    assert.equal(r.lead.name, name);
  }
});

test('retire les sauts de ligne en bord de nom (caracteres de controle nettoyes)', () => {
  const r = validateLead({ ...base, name: 'Jeanne Martin\n' });
  assert.equal(r.ok, true);
  assert.equal(r.lead.name, 'Jeanne Martin');
});

test('refuse un besoin ou une origine inconnus et les types non textuels', () => {
  assert.equal(validateLead({ ...base, need: 'pirater' }).ok, false);
  assert.equal(validateLead({ ...base, source: 'ailleurs' }).ok, false);
  assert.equal(validateLead({ ...base, name: ['tableau'] }).ok, false);
  assert.equal(validateLead(null).ok, false);
});

test('une demande issue du diagnostic exige un identifiant valide et vaut "rapport" par defaut', () => {
  assert.equal(validateLead({ ...base, source: 'diagnostic', need: undefined }).ok, false);
  assert.equal(validateLead({ ...base, source: 'diagnostic', auditId: '../../etc/passwd' }).ok, false);
  const r = validateLead({ ...base, source: 'diagnostic', need: undefined, auditId: AUDIT_ID });
  assert.equal(r.ok, true);
  assert.equal(r.lead.need, 'rapport');
});

test('limite la longueur du message', () => {
  assert.equal(validateLead({ ...base, message: 'x'.repeat(1001) }).ok, false);
  assert.equal(validateLead({ ...base, message: 'x'.repeat(1000) }).ok, true);
});
