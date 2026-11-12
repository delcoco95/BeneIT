'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractJson } = require('../lib/ai');

test('JSON simple', () => assert.deepEqual(extractJson('{"a":1}'), { a: 1 }));
test('retire les blocs <think> (multi-lignes, avec accolades)', () => {
  assert.deepEqual(extractJson('<think>je pense {x}\n et }{ </think>\n{"a":2}'), { a: 2 });
});
test('retire les code fences', () => assert.deepEqual(extractJson('```json\n{"a":3}\n```'), { a: 3 }));
test('premier objet equilibre, pas de la premiere a la derniere accolade', () => {
  assert.deepEqual(extractJson('Voici {"a":4} puis {"b":5} fin'), { a: 4 });
});
test('accolades dans les chaines et echappements', () => {
  assert.deepEqual(extractJson('x {"a":"} { \\" }","b":{"c":1}} y'), { a: '} { " }', b: { c: 1 } });
});
test('erreur si aucun objet, objet non ferme ou vide', () => {
  assert.throws(() => extractJson('pas de json'));
  assert.throws(() => extractJson('{"a":1'));
  assert.throws(() => extractJson(''));
  assert.throws(() => extractJson(null));
});
