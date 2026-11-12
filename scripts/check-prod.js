'use strict';

// Refuse la mise en ligne tant qu'une information legale reste a completer
// (marqueurs "À COMPLÉTER" des pages HTML). Utilise par `npm run check:prod`.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'frontend');
let missing = 0;

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(dir, file), 'utf-8');
  for (const match of html.matchAll(/À COMPLÉTER\s*:\s*([^<]+)/g)) {
    missing++;
    console.log(`  ✗ ${file} — ${match[1].trim()}`);
  }
}

if (missing) {
  console.error(`\n${missing} information(s) à compléter avant la mise en ligne.`);
  process.exit(1);
}
console.log('✓ Aucune information légale manquante.');
