#!/usr/bin/env node
/**
 * WordPress PO Merger — msgmerge in pure Node.js
 * Uses gettext-parser for robust handling of multi-line strings and escaping.
 */

const fs = require('fs');
const path = require('path');
const gettextParser = require('gettext-parser');

const args = parseArgs(process.argv.slice(2));
const potPath = args['--pot'];
const poPath = args['--po'];
const dir = args['--dir'];
const domain = args['--domain'];
const obsoleteMode = args['--obsolete'] || 'remove'; // keep | remove

if (!potPath) {
    console.error('Usage: node merger.js --pot <file.pot> --po <file.po>');
    console.error('       node merger.js --pot <file.pot> --dir <./languages> [--domain <d>]');
    process.exit(1);
}

if (!fs.existsSync(potPath)) {
    console.error(`POT file not found: ${potPath}`);
    process.exit(1);
}

const potInput = fs.readFileSync(potPath);
const pot = gettextParser.po.parse(potInput);

function mergePo(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const poInput = fs.readFileSync(filePath);
    const po = gettextParser.po.parse(poInput);
    
    let added = 0;
    let removed = 0;
    const addedStrings = [];

    // Create a new translations structure for the merged PO
    const newTranslations = {};

    // 1. Process POT entries (Add new or update existing)
    for (const ctx in pot.translations) {
        newTranslations[ctx] = newTranslations[ctx] || {};
        for (const id in pot.translations[ctx]) {
            if (id === '') {
                // Keep header from existing PO if available, otherwise from POT
                newTranslations[ctx][id] = po.translations[ctx] && po.translations[ctx][id] 
                    ? po.translations[ctx][id] 
                    : pot.translations[ctx][id];
                continue;
            }

            const potEntry = pot.translations[ctx][id];
            const poEntry = po.translations[ctx] ? po.translations[ctx][id] : null;

            if (poEntry) {
                // Update references and plural form if changed, keep msgstr
                poEntry.comments = potEntry.comments;
                poEntry.references = potEntry.references;
                if (potEntry.msgid_plural && !poEntry.msgid_plural) {
                    poEntry.msgid_plural = potEntry.msgid_plural;
                    if (poEntry.msgstr.length < 2) poEntry.msgstr.push('');
                }
                newTranslations[ctx][id] = poEntry;
            } else {
                // New string
                added++;
                addedStrings.push(id);
                newTranslations[ctx][id] = {
                    ...potEntry,
                    msgstr: potEntry.msgid_plural ? ['', ''] : ['']
                };
            }
        }
    }

    // 2. Handle obsolete strings (Optional)
    if (obsoleteMode === 'keep') {
        for (const ctx in po.translations) {
            newTranslations[ctx] = newTranslations[ctx] || {};
            for (const id in po.translations[ctx]) {
                if (!newTranslations[ctx][id]) {
                    newTranslations[ctx][id] = po.translations[ctx][id];
                }
            }
        }
    } else {
        // Count removed
        for (const ctx in po.translations) {
            for (const id in po.translations[ctx]) {
                if (!pot.translations[ctx] || !pot.translations[ctx][id]) {
                    removed++;
                }
            }
        }
    }

    po.translations = newTranslations;
    const output = gettextParser.po.compile(po);
    fs.writeFileSync(filePath, output);

    return { file: filePath, added, removed, addedStrings };
}

const results = [];
if (poPath) {
    const res = mergePo(path.resolve(poPath));
    if (res) results.push(res);
} else if (dir) {
    const absDir = path.resolve(dir);
    const files = fs.readdirSync(absDir).filter(f => {
        if (!f.endsWith('.po')) return false;
        if (domain) return f.startsWith(domain) || !f.includes('-');
        return true;
    });
    
    files.forEach(f => {
        const res = mergePo(path.join(absDir, f));
        if (res) results.push(res);
    });
}

console.log(JSON.stringify({
    pot_strings: Object.values(pot.translations).reduce((acc, ctx) => acc + Object.keys(ctx).length - (ctx[''] ? 1 : 0), 0),
    files_merged: results.length,
    total_added: results.reduce((a, b) => a + b.added, 0),
    total_removed: results.reduce((a, b) => a + b.removed, 0),
    results
}, null, 2));

function parseArgs(argv) {
    const result = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--') || argv[i].startsWith('-')) {
            result[argv[i]] = argv[i + 1] || true;
            i++;
        }
    }
    return result;
}
