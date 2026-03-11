#!/usr/bin/env node
/**
 * wp-auto-i18n CLI
 * Universal WordPress plugin translation tool
 *
 * Usage:
 *   wp-auto-i18n --plugin ./my-plugin --lang fr_FR,de_DE --provider deepl --api-key KEY
 *   wp-auto-i18n  (interactive mode)
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const SCRIPTS = path.join(__dirname, '..', 'scripts');

function run(script, args) {
  const result = spawnSync('node', [path.join(SCRIPTS, script), ...args], {
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

// Parse CLI arguments
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`
wp-auto-i18n — WordPress Plugin i18n Automation

Usage:
  wp-auto-i18n [options]

Options:
  --plugin   <path>       Plugin directory path (required)
  --domain   <domain>     WordPress text domain (auto-detected if omitted)
  --lang     <codes>      Comma-separated language codes: fr_FR,de_DE,es_ES
  --provider <name>       Translation provider: deepl|google|azure|openai|claude|libre
  --api-key  <key>        API key for provider (or set env var)
  --output   <dir>        Output directory (default: <plugin>/languages)
  --scan-only             Only generate .pot file, skip translation
  --compile-only          Only compile existing .po files to .mo
  --help                  Show this help

Examples:
  wp-auto-i18n --plugin ./wp-content/plugins/my-plugin --lang fr_FR,de_DE --provider deepl --api-key xxxx
  wp-auto-i18n --plugin . --lang ar,he_IL --provider azure --api-key xxxx
  wp-auto-i18n --plugin . --scan-only
  wp-auto-i18n --plugin . --compile-only

Providers:
  deepl    — 500K free chars/month  — deepl.com/pro
  google   — 500K free chars/month  — console.cloud.google.com
  azure    — 2M   free chars/month  — portal.azure.com
  openai   — pay per use            — platform.openai.com
  claude   — pay per use            — console.anthropic.com
  libre    — self-hosted, free      — libretranslate.com
`);
  process.exit(0);
}

function getArg(flag) {
  const i = argv.indexOf(flag);
  return i !== -1 ? argv[i + 1] : undefined;
}

function hasFlag(flag) {
  return argv.includes(flag);
}

const pluginPath = getArg('--plugin');
const domain     = getArg('--domain');
const langs      = getArg('--lang');
const provider   = getArg('--provider') || 'deepl';
const apiKey     = getArg('--api-key');
const outputDir  = getArg('--output');
const scanOnly   = hasFlag('--scan-only');
const compileOnly = hasFlag('--compile-only');

if (!pluginPath) {
  console.error('Error: --plugin <path> is required');
  console.error('Run wp-auto-i18n --help for usage');
  process.exit(1);
}

const absPlugin = path.resolve(pluginPath);
if (!fs.existsSync(absPlugin)) {
  console.error(`Plugin path not found: ${absPlugin}`);
  process.exit(1);
}

// Auto-detect domain
function detectDomain(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.php'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = content.match(/Text Domain:\s*(.+)/i);
    if (m) return m[1].trim();
  }
  return path.basename(dir);
}

const textDomain = domain || detectDomain(absPlugin);
const langDir = outputDir || path.join(absPlugin, 'languages');
const potFile = path.join(langDir, `${textDomain}.pot`);

console.log(`\nwp-auto-i18n`);
console.log(`Plugin:  ${absPlugin}`);
console.log(`Domain:  ${textDomain}`);

// ── Step 1: Scan ──────────────────────────────────────────────────────────────

if (!compileOnly) {
  console.log(`\n[1/3] Scanning for translatable strings...`);
  const scanArgs = ['--plugin', absPlugin, '--domain', textDomain, '--output', potFile];
  run('scanner.js', scanArgs);
}

if (scanOnly) process.exit(0);

// ── Step 2: Translate ──────────────────────────────────────────────────────────

const langList = langs ? langs.split(',').map(l => l.trim()).filter(Boolean) : [];

if (langList.length === 0 && !compileOnly) {
  console.log('\nNo --lang specified. POT file generated only.');
  console.log(`POT: ${potFile}`);
  process.exit(0);
}

if (!compileOnly && langList.length > 0) {
  // translator.js is retired — the AI translates directly using built-in knowledge.
  // When invoked via the wp-translate skill, the AI (Claude/GPT/Gemini/etc.) reads
  // the POT file and writes the .po files directly. No external API needed.
  console.log(`\n[2/3] Translation step:`);
  console.log(`  The AI will translate all strings and write .po files directly.`);
  console.log(`  Languages: ${langList.join(', ')}`);
  console.log(`  POT source: ${potFile}`);
  console.log(`  Output dir: ${langDir}`);
  console.log(`\n  If running via wp-translate skill: the AI handles this step.`);
  console.log(`  If running manually: write .po files to ${langDir}/ then run --compile-only.`);
}

// ── Step 3: Compile ───────────────────────────────────────────────────────────

console.log(`\n[3/3] Compiling .po → .mo files...`);
const compileArgs = ['--dir', langDir, '--domain', textDomain];
run('compiler.js', compileArgs);

console.log(`\nDone! Output: ${langDir}`);
