#!/usr/bin/env node
/**
 * WordPress PO Merger — msgmerge in pure Node.js
 *
 * Merges a newly generated .pot file into existing .po files:
 *   - Keeps all existing translated strings (msgstr) intact
 *   - Adds new msgids from the POT (with empty msgstr — for AI to translate)
 *   - Removes msgids no longer in the POT (marks as obsolete or removes them)
 *   - Updates file references (#:) from the new POT
 *   - Outputs a JSON report of what changed
 *
 * Usage:
 *   node merger.js --pot <file.pot> --po <file.po> [--obsolete keep|remove|comment]
 *   node merger.js --pot <file.pot> --dir <./languages> [--domain <text-domain>] [--obsolete remove]
 *
 * --obsolete:
 *   keep    → keep removed strings as normal entries (not recommended)
 *   remove  → delete them entirely (default)
 *   comment → prefix with #~ (standard gettext obsolete marker)
 */

const fs   = require('fs');
const path = require('path');

const args         = parseArgs(process.argv.slice(2));
const potFile      = args['--pot'];
const poFile       = args['--po'];
const dir          = args['--dir'];
const domain       = args['--domain'];
const obsoleteMode = args['--obsolete'] || 'remove'; // keep | remove | comment

if (!potFile) {
  console.error('Usage: node merger.js --pot <file.pot> --po <file.po>');
  console.error('       node merger.js --pot <file.pot> --dir <./languages> [--domain <d>]');
  process.exit(1);
}

if (!fs.existsSync(potFile)) {
  console.error(`POT file not found: ${potFile}`);
  process.exit(1);
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a .po or .pot file into an array of entry objects:
 * {
 *   comments: string[],   // #  translator comments
 *   flags: string[],      // #, fuzzy etc.
 *   references: string[], // #: file.php:42
 *   msgctxt: string|null,
 *   msgid: string,
 *   msgid_plural: string|null,
 *   msgstr: string[],     // array (singular = 1 item, plural = n items)
 *   isHeader: boolean,
 * }
 */
function parsePo(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines   = content.split('\n');

  const entries = [];
  let current   = newEntry();
  let mode      = null; // 'msgid' | 'msgid_plural' | 'msgstr' | 'msgctxt' | 'msgstr[n]'

  function flush() {
    if (current.msgid !== null) {
      current.isHeader = (current.msgid === '');
      entries.push(current);
    }
    current = newEntry();
    mode    = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#~')) {
      // Obsolete entry — skip entirely (we'll re-add from POT or drop)
      mode = 'obsolete';
      continue;
    }

    if (line === '' || line === '\r') {
      if (current.msgid !== null) flush();
      mode = null;
      continue;
    }

    if (line.startsWith('#:')) {
      current.references.push(line.trim());
      continue;
    }
    if (line.startsWith('#,')) {
      current.flags.push(line.trim());
      continue;
    }
    if (line.startsWith('# ') || line === '#') {
      current.comments.push(line);
      continue;
    }

    // msgctxt
    const ctxMatch = line.match(/^msgctxt\s+"((?:\\.|[^"\\])*)"$/);
    if (ctxMatch) {
      current.msgctxt = unescape(ctxMatch[1]);
      mode = 'msgctxt';
      continue;
    }

    // msgid
    const idMatch = line.match(/^msgid\s+"((?:\\.|[^"\\])*)"$/);
    if (idMatch) {
      current.msgid = unescape(idMatch[1]);
      mode = 'msgid';
      continue;
    }

    // msgid_plural
    const plMatch = line.match(/^msgid_plural\s+"((?:\\.|[^"\\])*)"$/);
    if (plMatch) {
      current.msgid_plural = unescape(plMatch[1]);
      mode = 'msgid_plural';
      continue;
    }

    // msgstr (singular)
    const strMatch = line.match(/^msgstr\s+"((?:\\.|[^"\\])*)"$/);
    if (strMatch) {
      current.msgstr = [unescape(strMatch[1])];
      mode = 'msgstr';
      continue;
    }

    // msgstr[n]
    const strNMatch = line.match(/^msgstr\[(\d+)\]\s+"((?:\\.|[^"\\])*)"$/);
    if (strNMatch) {
      const idx = parseInt(strNMatch[1], 10);
      current.msgstr[idx] = unescape(strNMatch[2]);
      mode = `msgstr[${idx}]`;
      continue;
    }

    // Continuation line "..."
    const contMatch = line.match(/^"((?:\\.|[^"\\])*)"$/);
    if (contMatch && mode) {
      const chunk = unescape(contMatch[1]);
      if (mode === 'msgid')        current.msgid         += chunk;
      else if (mode === 'msgid_plural') current.msgid_plural += chunk;
      else if (mode === 'msgctxt') current.msgctxt       += chunk;
      else if (mode === 'msgstr') current.msgstr[0]      += chunk;
      else if (mode.startsWith('msgstr[')) {
        const idx = parseInt(mode.match(/\d+/)[0], 10);
        current.msgstr[idx] = (current.msgstr[idx] || '') + chunk;
      }
      continue;
    }
  }

  // Flush last entry
  if (current.msgid !== null) flush();

  return entries;
}

function newEntry() {
  return {
    comments:    [],
    flags:       [],
    references:  [],
    msgctxt:     null,
    msgid:       null,
    msgid_plural: null,
    msgstr:      [],
    isHeader:    false,
  };
}

// ─── Key ──────────────────────────────────────────────────────────────────────

function entryKey(entry) {
  return `${entry.msgctxt || ''}|||${entry.msgid}`;
}

// ─── Merger ───────────────────────────────────────────────────────────────────

/**
 * Merge potEntries into existing poEntries.
 * Returns { merged: entry[], added: string[], removed: string[], updated_refs: string[] }
 */
function merge(poEntries, potEntries) {
  // Build lookup from existing PO (skip header)
  const poMap = new Map();
  let   header = null;
  for (const e of poEntries) {
    if (e.isHeader) { header = e; continue; }
    poMap.set(entryKey(e), e);
  }

  // Build lookup from POT (skip header)
  const potMap = new Map();
  for (const e of potEntries) {
    if (e.isHeader) continue;
    potMap.set(entryKey(e), e);
  }

  const merged       = [];
  const added        = [];
  const removed      = [];
  const updatedRefs  = [];

  // Start with header
  if (header) merged.push(header);

  // Walk POT entries in order (preserves POT ordering)
  for (const [key, potEntry] of potMap) {
    if (poMap.has(key)) {
      // Keep existing translation
      const existing = poMap.get(key);
      // Update references from the new POT
      if (existing.references.join() !== potEntry.references.join()) {
        updatedRefs.push(potEntry.msgid);
      }
      existing.references = potEntry.references;
      // Preserve plural form if POT now has it but PO doesn't
      if (potEntry.msgid_plural && !existing.msgid_plural) {
        existing.msgid_plural = potEntry.msgid_plural;
        if (existing.msgstr.length < 2) existing.msgstr = ['', ''];
      }
      merged.push(existing);
    } else {
      // New string — add with empty msgstr
      added.push(potEntry.msgid);
      merged.push({
        comments:    [],
        flags:       [],
        references:  potEntry.references,
        msgctxt:     potEntry.msgctxt,
        msgid:       potEntry.msgid,
        msgid_plural: potEntry.msgid_plural,
        msgstr:      potEntry.msgid_plural ? ['', ''] : [''],
        isHeader:    false,
      });
    }
  }

  // Find removed strings (in PO but not in POT)
  for (const [key, poEntry] of poMap) {
    if (!potMap.has(key)) {
      removed.push(poEntry.msgid);
      if (obsoleteMode === 'keep') {
        merged.push(poEntry);
      }
      // obsoleteMode === 'remove' → just drop it (default)
      // obsoleteMode === 'comment' → handled in serializer
    }
  }

  // Store removed for comment mode
  const removedEntries = [];
  if (obsoleteMode === 'comment') {
    for (const [key, poEntry] of poMap) {
      if (!potMap.has(key)) removedEntries.push(poEntry);
    }
  }

  return { merged, added, removed, updatedRefs, removedEntries };
}

// ─── Serializer ───────────────────────────────────────────────────────────────

function escapeStr(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function serializeEntry(e, obsolete = false) {
  const prefix = obsolete ? '#~ ' : '';
  let out = '';

  for (const c of e.comments)   out += `${c}\n`;
  for (const r of e.references) out += `${r}\n`;
  for (const f of e.flags)      out += `${f}\n`;

  if (e.msgctxt !== null) out += `${prefix}msgctxt "${escapeStr(e.msgctxt)}"\n`;

  out += `${prefix}msgid "${escapeStr(e.msgid)}"\n`;

  if (e.msgid_plural) {
    out += `${prefix}msgid_plural "${escapeStr(e.msgid_plural)}"\n`;
    const forms = e.msgstr.length >= 2 ? e.msgstr : ['', ''];
    forms.forEach((s, i) => { out += `${prefix}msgstr[${i}] "${escapeStr(s || '')}"\n`; });
  } else {
    out += `${prefix}msgstr "${escapeStr(e.msgstr[0] || '')}"\n`;
  }

  return out;
}

function serializeHeader(e) {
  // Header: msgid "" msgstr "...\n..."
  let out = '';
  for (const c of e.comments)   out += `${c}\n`;
  for (const r of e.references) out += `${r}\n`;
  out += `msgid ""\n`;
  out += `msgstr ""\n`;
  // msgstr[0] is the full header value — after unescape() it has real \n characters
  const raw = e.msgstr[0] || '';
  // Split on real newlines, filter empty
  const headerLines = raw.split('\n').filter(Boolean);
  for (const hl of headerLines) {
    // Re-escape each line (in case it has quotes) and append \n sequence
    out += `"${escapeStr(hl)}\\n"\n`;
  }
  return out;
}

function serializePo(entries, removedEntries = []) {
  let out = '';
  for (const e of entries) {
    if (e.isHeader) {
      out += serializeHeader(e) + '\n';
    } else {
      out += serializeEntry(e) + '\n';
    }
  }
  // Append obsolete entries at the end
  if (removedEntries.length > 0) {
    out += '\n';
    for (const e of removedEntries) {
      out += serializeEntry(e, true) + '\n';
    }
  }
  return out;
}

// ─── Unescape helper ─────────────────────────────────────────────────────────

function unescape(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

// ─── Process a single PO file ─────────────────────────────────────────────────

function processPo(poPath, potEntries) {
  const poEntries = parsePo(poPath);
  const { merged, added, removed, updatedRefs, removedEntries } = merge(poEntries, potEntries);
  const serialized = serializePo(merged, removedEntries);
  fs.writeFileSync(poPath, serialized, 'utf8');

  return { file: poPath, added: added.length, removed: removed.length,
           updatedRefs: updatedRefs.length, addedStrings: added };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const potEntries = parsePo(potFile);
const potCount   = potEntries.filter(e => !e.isHeader).length;
console.log(`POT loaded: ${potCount} strings from ${path.basename(potFile)}`);

const results = [];

if (poFile) {
  if (!fs.existsSync(poFile)) {
    console.error(`PO file not found: ${poFile}`);
    process.exit(1);
  }
  const r = processPo(path.resolve(poFile), potEntries);
  results.push(r);

} else if (dir) {
  const absDir = path.resolve(dir);
  if (!fs.existsSync(absDir)) {
    console.error(`Directory not found: ${absDir}`);
    process.exit(1);
  }

  const poFiles = fs.readdirSync(absDir)
    .filter(f => {
      if (!f.endsWith('.po')) return false;
      if (domain) {
        // Match files like: domain-fr_FR.po OR fr_FR.po (without domain prefix)
        return f.startsWith(domain) || !f.includes('-');
      }
      return true;
    })
    .map(f => path.join(absDir, f));

  if (poFiles.length === 0) {
    console.log('No .po files found in directory.');
    process.exit(0);
  }

  console.log(`Merging into ${poFiles.length} .po file(s) in: ${absDir}`);

  for (const po of poFiles) {
    try {
      const r = processPo(po, potEntries);
      results.push(r);
      const label = path.basename(po);
      if (r.added > 0) {
        console.log(`  ${label}: +${r.added} new string(s) added — NEED TRANSLATION`);
      } else {
        console.log(`  ${label}: no new strings — all up to date`);
      }
      if (r.removed > 0) console.log(`    (${r.removed} obsolete string(s) removed)`);
    } catch (err) {
      console.error(`  Failed: ${path.basename(po)} — ${err.message}`);
    }
  }
} else {
  console.error('Provide --po <file> or --dir <directory>');
  process.exit(1);
}

// Summary JSON (consumed by the skill AI)
const totalAdded   = results.reduce((s, r) => s + r.added,   0);
const totalRemoved = results.reduce((s, r) => s + r.removed, 0);

console.log('\nMerge complete.');
console.log(JSON.stringify({
  pot_strings:    potCount,
  files_merged:   results.length,
  total_added:    totalAdded,
  total_removed:  totalRemoved,
  results,
}, null, 2));

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
