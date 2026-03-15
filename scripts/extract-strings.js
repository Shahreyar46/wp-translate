#!/usr/bin/env node
const fs = require('fs');
const gettextParser = require('gettext-parser');
const file = process.argv[2];

if (!file || !fs.existsSync(file)) {
    console.error('Usage: node extract-strings.js <file.po|file.pot>');
    process.exit(1);
}

const input = fs.readFileSync(file);
const po = gettextParser.po.parse(input);
const ids = [];

for (const ctx in po.translations) {
    for (const id in po.translations[ctx]) {
        if (id !== '') ids.push(id);
    }
}

console.log(JSON.stringify(ids, null, 2));
