'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { requireAdmin } = require('../lib/auth');

function run(header, token = 'secret-token') {
  if (token === null) delete process.env.ADMIN_TOKEN; else process.env.ADMIN_TOKEN = token;
  let status = null; let nexted = false;
  const res = { status(s) { status = s; return this; }, json() { return this; } };
  requireAdmin({ headers: header === undefined ? {} : { authorization: header } }, res, () => { nexted = true; });
  return { status, nexted };
}

test('503 sans token configure', () => assert.equal(run('Bearer x', null).status, 503));
test('401 sans en-tete ou mauvais schema', () => {
  assert.equal(run(undefined).status, 401);
  assert.equal(run('Basic abc').status, 401);
});
test('403 si token faux, de longueur differente ou vide', () => {
  assert.equal(run('Bearer secret-tokeX').status, 403);
  assert.equal(run('Bearer court').status, 403);
  assert.equal(run('Bearer ').status, 403);
});
test('accepte le bon token', () => assert.equal(run('Bearer secret-token').nexted, true));
