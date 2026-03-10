#!/usr/bin/env node
/**
 * WordPress Plugin POT Scanner
 * Scans PHP and JS files for translatable strings
 * No system dependencies required — pure Node.js
 */

const fs = require('fs');
const path = require('path');

const args = parseArgs(process.argv.slice(2));
const pluginPath = args['--plugin'] || args['-p'];
const domain = args['--domain'] || args['-d'] || 'plugin';
const outputFile = args['--output'] || args['-o'];

if (!pluginPath) {
  console.error('Usage: node scanner.js --plugin <path> --domain <domain> --output <file.pot>');
  process.exit(1);
}

const absPluginPath = path.resolve(pluginPath);
if (!fs.existsSync(absPluginPath)) {
  console.error(`Plugin path not found: ${absPluginPath}`);
  process.exit(1);
}

// Auto-detect domain from plugin header if not provided
function detectDomain(pluginDir) {
  const phpFiles = getFilesRecursive(pluginDir, '.php').slice(0, 5);
  for (const file of phpFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const match = content.match(/Text Domain:\s*(.+)/i);
    if (match) return match[1].trim();
  }
  return path.basename(pluginDir);
}

const textDomain = domain === 'plugin' ? detectDomain(absPluginPath) : domain;

// ─── PHP Scanner ──────────────────────────────────────────────────────────────

const PHP_FUNCTIONS = [
  '__', '_e', '_x', '_ex',
  '_n', '_nx',
  'esc_html__', 'esc_html_e', 'esc_html_x',
  'esc_attr__', 'esc_attr_e', 'esc_attr_x',
  'esc_url__',
  '_n_noop', '_nx_noop',
];

function extractPhpStrings(content, filePath) {
  const strings = [];
  // Match: function( 'string', ..., 'domain' )  or  function( "string", ..., "domain" )
  const fnPattern = new RegExp(
    `(${PHP_FUNCTIONS.join('|')})\\s*\\(\\s*(['"])((?:\\\\.|(?!\\2).)*?)\\2`,
    'g'
  );

  let match;
  const lines = content.split('\n');
  while ((match = fnPattern.exec(content)) !== null) {
    const fn = match[1];
    const str = match[3].replace(/\\'/g, "'").replace(/\\"/g, '"');
    if (!str.trim()) continue;

    // Get line number
    const lineNum = content.substring(0, match.index).split('\n').length;
    const relPath = path.relative(absPluginPath, filePath).replace(/\\/g, '/');

    // Check if domain matches (look for the domain param after the string)
    const afterMatch = content.substring(match.index + match[0].length);
    const domainCheck = afterMatch.match(/^\s*,\s*['"]([^'"]+)['"]/);
    if (domainCheck && domainCheck[1] !== textDomain) continue;

    // Handle plural forms (_n, _nx, _n_noop, _nx_noop)
    if (fn.startsWith('_n')) {
      const pluralMatch = afterMatch.match(/^\s*,\s*(['"])((?:\\.|(?!\1).)*?)\1/);
      strings.push({
        msgid: str,
        msgid_plural: pluralMatch ? pluralMatch[2] : '',
        msgstr: ['', ''],
        reference: `${relPath}:${lineNum}`,
        fn,
      });
    } else if (fn.includes('_x') || fn === 'esc_html_x' || fn === 'esc_attr_x') {
      const ctxMatch = afterMatch.match(/^\s*,\s*(['"])((?:\\.|(?!\1).)*?)\1/);
      strings.push({
        msgid: str,
        msgctxt: ctxMatch ? ctxMatch[2] : '',
        msgstr: [''],
        reference: `${relPath}:${lineNum}`,
        fn,
      });
    } else {
      strings.push({
        msgid: str,
        msgstr: [''],
        reference: `${relPath}:${lineNum}`,
        fn,
      });
    }
  }
  return strings;
}

// ─── JS Scanner ───────────────────────────────────────────────────────────────

const JS_FUNCTIONS = ['__', '_n', '_x', '_nx', 'wp.i18n.__'];

function extractJsStrings(content, filePath) {
  const strings = [];
  // Match: __( 'string' ) or __( 'string', 'domain' )
  const fnPattern = /(?:wp\.i18n\.)?(__|\b_n\b|\b_x\b|\b_nx\b)\s*\(\s*(['"`])((?:\\.|(?!\2).)*?)\2/g;

  let match;
  while ((match = fnPattern.exec(content)) !== null) {
    const fn = match[1];
    const str = match[3];
    if (!str.trim()) continue;

    const lineNum = content.substring(0, match.index).split('\n').length;
    const relPath = path.relative(absPluginPath, filePath).replace(/\\/g, '/');

    strings.push({
      msgid: str,
      msgstr: [''],
      reference: `${relPath}:${lineNum}`,
      fn,
    });
  }
  return strings;
}

// ─── File Discovery ───────────────────────────────────────────────────────────

function getFilesRecursive(dir, ext) {
  const results = [];
  const skip = ['node_modules', '.git', 'vendor', 'languages', 'dist', 'build'];

  function walk(current) {
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      if (skip.includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        // Skip minified JS
        if (ext === '.js' && entry.name.endsWith('.min.js')) continue;
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

// ─── POT Writer ───────────────────────────────────────────────────────────────

function deduplicateStrings(strings) {
  const map = new Map();
  for (const s of strings) {
    const key = `${s.msgctxt || ''}|||${s.msgid}`;
    if (map.has(key)) {
      // Merge references
      const existing = map.get(key);
      existing.reference += `, ${s.reference}`;
    } else {
      map.set(key, { ...s });
    }
  }
  return Array.from(map.values());
}

function writePot(strings, outputPath) {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 16) + '+0000';
  const pluginName = path.basename(absPluginPath);

  let pot = `# Translation file for ${pluginName}
# Copyright (C) ${new Date().getFullYear()} ${pluginName}
# This file is distributed under the same license as the ${pluginName} package.
msgid ""
msgstr ""
"Project-Id-Version: ${pluginName}\\n"
"Report-Msgid-Bugs-To: \\n"
"POT-Creation-Date: ${now}\\n"
"PO-Revision-Date: YEAR-MO-DA HO:MI+ZONE\\n"
"Last-Translator: FULL NAME <EMAIL@ADDRESS>\\n"
"Language-Team: LANGUAGE <LL@li.org>\\n"
"Language: \\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"
"X-Generator: wp-auto-i18n\\n"
"X-Domain: ${textDomain}\\n"

`;

  for (const s of strings) {
    pot += `#: ${s.reference}\n`;
    if (s.msgctxt) pot += `msgctxt "${escape(s.msgctxt)}"\n`;
    pot += `msgid "${escape(s.msgid)}"\n`;
    if (s.msgid_plural) {
      pot += `msgid_plural "${escape(s.msgid_plural)}"\n`;
      pot += `msgstr[0] ""\n`;
      pot += `msgstr[1] ""\n`;
    } else {
      pot += `msgstr ""\n`;
    }
    pot += '\n';
  }

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, pot, 'utf8');
}

function escape(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`Scanning plugin: ${absPluginPath}`);
console.log(`Text domain: ${textDomain}`);

const phpFiles = getFilesRecursive(absPluginPath, '.php');
const jsFiles = getFilesRecursive(absPluginPath, '.js');

console.log(`Found ${phpFiles.length} PHP files, ${jsFiles.length} JS files`);

let allStrings = [];

// Scan PHP
let phpCount = 0;
for (const file of phpFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const found = extractPhpStrings(content, file);
    allStrings.push(...found);
    phpCount += found.length;
  } catch (e) {
    // skip unreadable files
  }
}
console.log(`PHP strings found: ${phpCount}`);

// Scan JS
let jsCount = 0;
for (const file of jsFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const found = extractJsStrings(content, file);
    allStrings.push(...found);
    jsCount += found.length;
  } catch (e) {
    // skip
  }
}
console.log(`JS strings found: ${jsCount}`);

// Deduplicate
allStrings = deduplicateStrings(allStrings);
console.log(`Unique strings: ${allStrings.length}`);

// Write POT
const outFile = outputFile || path.join(absPluginPath, 'languages', `${textDomain}.pot`);
writePot(allStrings, outFile);
console.log(`POT file written: ${outFile}`);

// Output JSON for other scripts to consume
console.log(JSON.stringify({ pot: outFile, domain: textDomain, count: allStrings.length }));

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
