#!/usr/bin/env node
const fs = require('fs');
const potFile = process.argv[2];
const content = fs.readFileSync(potFile, 'utf8');
const blocks = content.split(/\n\n+/);
const strings = [];
for (const block of blocks) {
  if (!block.includes('msgid')) continue;
  const match = block.match(/^msgid "((?:\\.|[^"\\])*)"$/m);
  if (match && match[1] && match[1] !== '') strings.push(match[1]);
}
console.log(JSON.stringify(strings, null, 0));
