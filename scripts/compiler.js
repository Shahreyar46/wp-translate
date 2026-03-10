#!/usr/bin/env node
/**
 * WordPress PO → MO Compiler
 * Compiles .po files to binary .mo files using gettext-parser
 * No system msgfmt required — pure Node.js
 *
 * Usage:
 *   node compiler.js --po fr_FR.po --output fr_FR.mo
 *   node compiler.js --dir ./languages --domain my-plugin   (batch: compile all .po in folder)
 */

const fs   = require('fs');
const path = require('path');

const args      = parseArgs(process.argv.slice(2));
const poFile    = args['--po']     || args['-p'];
const outputFile = args['--output'] || args['-o'];
const dir       = args['--dir']    || args['-d'];
const domain    = args['--domain'];

// ─── Load gettext-parser ──────────────────────────────────────────────────────

function loadGettextParser() {
  const candidates = [
    () => require('gettext-parser'),
    () => require(path.join(path.dirname(__dirname), 'node_modules', 'gettext-parser')),
  ];

  for (const fn of candidates) {
    try { return fn(); } catch {}
  }

  console.error('Missing dependency: gettext-parser');
  console.error(`Run: node "${path.join(path.dirname(__dirname), 'scripts', 'setup.js')}" --install`);
  process.exit(1);
}

const gettextParser = loadGettextParser();

// ─── Compile Single PO → MO ──────────────────────────────────────────────────

function compilePo(poPath, moPath) {
  const poContent = fs.readFileSync(poPath);
  const parsed    = gettextParser.po.parse(poContent);
  const moBuffer  = gettextParser.mo.compile(parsed);

  const outDir = path.dirname(moPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(moPath, moBuffer);
  const size = (moBuffer.length / 1024).toFixed(1);
  console.log(`Compiled: ${path.basename(poPath)} → ${path.basename(moPath)} (${size} KB)`);
  return moPath;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const compiled = [];
const errors   = [];

if (dir) {
  // Batch mode: compile all .po files in a directory
  const absDir = path.resolve(dir);
  if (!fs.existsSync(absDir)) {
    console.error(`Directory not found: ${absDir}`);
    process.exit(1);
  }

  const poFiles = fs.readdirSync(absDir)
    .filter(f => {
      if (!f.endsWith('.po')) return false;
      if (domain) return f.startsWith(domain);
      return true;
    })
    .map(f => path.join(absDir, f));

  if (poFiles.length === 0) {
    console.log('No .po files found in directory.');
    process.exit(0);
  }

  console.log(`Compiling ${poFiles.length} .po files in: ${absDir}`);

  for (const po of poFiles) {
    const mo = po.replace(/\.po$/, '.mo');
    try {
      compilePo(po, mo);
      compiled.push({ po, mo });
    } catch (err) {
      console.error(`Failed: ${path.basename(po)} — ${err.message}`);
      errors.push({ po, error: err.message });
    }
  }

} else if (poFile) {
  // Single file mode
  if (!fs.existsSync(poFile)) {
    console.error(`PO file not found: ${poFile}`);
    process.exit(1);
  }

  const moOut = outputFile || poFile.replace(/\.po$/, '.mo');

  try {
    compilePo(path.resolve(poFile), path.resolve(moOut));
    compiled.push({ po: poFile, mo: moOut });
  } catch (err) {
    console.error(`Compilation failed: ${err.message}`);
    process.exit(1);
  }

} else {
  console.error('Usage:');
  console.error('  node compiler.js --po <file.po> [--output <file.mo>]');
  console.error('  node compiler.js --dir <./languages> [--domain <my-plugin>]');
  process.exit(1);
}

console.log(`\nCompiled: ${compiled.length} file(s), ${errors.length} error(s)`);
console.log(JSON.stringify({ compiled: compiled.length, errors: errors.length, files: compiled }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
