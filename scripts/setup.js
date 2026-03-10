#!/usr/bin/env node
/**
 * wp-i18n Skill Dependency Setup
 * Installs required npm packages into the skill's local node_modules
 *
 * Usage:
 *   node setup.js --check     → check if all deps are installed
 *   node setup.js --install   → install missing deps
 */

const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const skillDir = path.dirname(__dirname);
const nmDir    = path.join(skillDir, 'node_modules');
const args     = process.argv.slice(2);
const doCheck   = args.includes('--check');
const doInstall = args.includes('--install');

// Required packages and their check module path
const DEPS = [
  { name: 'gettext-parser',          check: 'gettext-parser' },
  { name: 'node-fetch',              check: 'node-fetch' },
  // Optional providers — only needed if user selects them
  // deepl-node, @google-cloud/translate, openai, @anthropic-ai/sdk
];

// Optional provider packages — installed on demand
const OPTIONAL_DEPS = [
  'deepl-node',
  '@google-cloud/translate',
  'openai',
  '@anthropic-ai/sdk',
];

function isInstalled(pkgName) {
  // Check global node_modules
  try { require.resolve(pkgName); return true; } catch {}
  // Check skill-local node_modules
  try { require.resolve(path.join(nmDir, pkgName)); return true; } catch {}
  // Check by folder existence
  const localPath = path.join(nmDir, pkgName);
  return fs.existsSync(localPath);
}

function installPkg(pkgName) {
  console.log(`Installing ${pkgName}...`);
  const result = spawnSync('npm', ['install', '--prefix', skillDir, pkgName, '--save'], {
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    // Try without --prefix (global fallback)
    const r2 = spawnSync('npm', ['install', '-g', pkgName], { stdio: 'inherit', shell: true });
    if (r2.status !== 0) {
      console.warn(`Could not install ${pkgName}. You may need to install it manually.`);
    }
  }
}

if (doCheck) {
  console.log('Checking wp-i18n skill dependencies...\n');
  let allOk = true;

  for (const dep of DEPS) {
    const ok = isInstalled(dep.check);
    console.log(`  ${ok ? '✓' : '✗'} ${dep.name}`);
    if (!ok) allOk = false;
  }

  console.log('\nOptional providers (install only if you use them):');
  for (const dep of OPTIONAL_DEPS) {
    const ok = isInstalled(dep);
    console.log(`  ${ok ? '✓' : '○'} ${dep}`);
  }

  if (allOk) {
    console.log('\nAll required dependencies are installed.');
    process.exit(0);
  } else {
    console.log('\nSome dependencies are missing. Run: node setup.js --install');
    process.exit(1);
  }
}

if (doInstall) {
  console.log('Installing wp-i18n skill dependencies...\n');

  // Create package.json in skill dir if missing
  const pkgJson = path.join(skillDir, 'package.json');
  if (!fs.existsSync(pkgJson)) {
    fs.writeFileSync(pkgJson, JSON.stringify({
      name: 'wp-i18n-skill',
      version: '1.0.0',
      private: true,
      description: 'WordPress i18n automation skill dependencies',
    }, null, 2));
  }

  // Install required deps
  for (const dep of DEPS) {
    if (!isInstalled(dep.check)) {
      installPkg(dep.name);
    } else {
      console.log(`✓ ${dep.name} (already installed)`);
    }
  }

  // Ask about optional deps
  console.log('\nInstalling recommended provider: deepl-node');
  if (!isInstalled('deepl-node')) {
    installPkg('deepl-node');
  } else {
    console.log('✓ deepl-node (already installed)');
  }

  console.log('\nTo install other providers, run:');
  console.log('  npm install --prefix "' + skillDir + '" @google-cloud/translate');
  console.log('  npm install --prefix "' + skillDir + '" openai');
  console.log('  npm install --prefix "' + skillDir + '" @anthropic-ai/sdk');

  console.log('\nSetup complete!');
  process.exit(0);
}

console.log('Usage:');
console.log('  node setup.js --check     Check if dependencies are installed');
console.log('  node setup.js --install   Install required dependencies');
