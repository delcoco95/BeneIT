'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMailQuota } = require('../lib/mailQuota');

test('autorise 3 envois par adresse (insensible a la casse) puis refuse', () => {
  const q = createMailQuota({ max: 3, windowMs: 1000 });
  assert.equal(q.tryConsume('A@x.fr', 0), true);
  assert.equal(q.tryConsume('a@x.fr', 1), true);
  assert.equal(q.tryConsume('a@x.fr', 2), true);
  assert.equal(q.tryConsume('a@x.fr', 3), false);
  assert.equal(q.tryConsume('b@x.fr', 3), true);
});

test('la fenetre glisse : de nouveau autorise apres expiration', () => {
  const q = createMailQuota({ max: 1, windowMs: 1000 });
  assert.equal(q.tryConsume('a@x.fr', 0), true);
  assert.equal(q.tryConsume('a@x.fr', 999), false);
  assert.equal(q.tryConsume('a@x.fr', 1001), true);
});
