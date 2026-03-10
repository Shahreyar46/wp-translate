#!/usr/bin/env node
/**
 * WordPress Plugin PO Translator
 * Translates a .pot file into a .po file using multiple provider options:
 *   --provider deepl     → DeepL API (deepl-node)
 *   --provider google    → Google Cloud Translate
 *   --provider azure     → Azure Translator REST API
 *   --provider openai    → OpenAI GPT
 *   --provider claude    → Anthropic Claude
 *   --provider libre     → LibreTranslate (self-hosted or public)
 *
 * Usage:
 *   node translator.js --pot plugin.pot --lang fr_FR --provider deepl --api-key KEY --output fr_FR.po
 */

const fs = require('fs');
const path = require('path');

const args = parseArgs(process.argv.slice(2));
const potFile   = args['--pot']      || args['-p'];
const langCode  = args['--lang']     || args['-l'];

// Auto-detect provider: prefer whatever key is available, default to claude
function detectProvider() {
  if (args['--provider']) return args['--provider'].toLowerCase();
  if (process.env.DEEPL_API_KEY) return 'deepl';
  if (process.env.GOOGLE_TRANSLATE_KEY) return 'google';
  if (process.env.AZURE_TRANSLATOR_KEY) return 'azure';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'claude'; // default — Claude Code session auth handles this
}

function detectApiKey(prov) {
  if (args['--api-key'] || args['-k']) return args['--api-key'] || args['-k'];
  if (prov === 'deepl')  return process.env.DEEPL_API_KEY || '';
  if (prov === 'google') return process.env.GOOGLE_TRANSLATE_KEY || '';
  if (prov === 'azure')  return process.env.AZURE_TRANSLATOR_KEY || '';
  if (prov === 'openai') return process.env.OPENAI_API_KEY || '';
  if (prov === 'claude') return process.env.ANTHROPIC_API_KEY || ''; // SDK auto-detects Claude Code session
  return '';
}

const provider  = detectProvider();
const apiKey    = detectApiKey(provider);
const outputFile = args['--output'] || args['-o'];
const libreUrl   = args['--libre-url'] || 'https://libretranslate.com';
const azureRegion = args['--azure-region'] || 'global';

if (!potFile || !langCode) {
  console.error('Usage: node translator.js --pot <file.pot> --lang <fr_FR> --provider <deepl|google|azure|openai|claude|libre> --api-key <KEY> --output <fr_FR.po>');
  process.exit(1);
}

if (!fs.existsSync(potFile)) {
  console.error(`POT file not found: ${potFile}`);
  process.exit(1);
}

// ─── POT Parser ───────────────────────────────────────────────────────────────

function parsePot(content) {
  const entries = [];
  const blocks = content.split(/\n\n+/);

  for (const block of blocks) {
    if (!block.includes('msgid')) continue;

    const entry = { comments: [], reference: '', msgctxt: '', msgid: '', msgid_plural: '', msgstr: [] };

    const lines = block.split('\n');
    let currentKey = null;

    for (const line of lines) {
      if (line.startsWith('#:')) {
        entry.reference = line.replace('#:', '').trim();
      } else if (line.startsWith('#')) {
        entry.comments.push(line);
      } else if (line.startsWith('msgctxt ')) {
        entry.msgctxt = extractString(line);
        currentKey = 'msgctxt';
      } else if (line.startsWith('msgid_plural ')) {
        entry.msgid_plural = extractString(line);
        currentKey = 'msgid_plural';
      } else if (line.startsWith('msgid ')) {
        entry.msgid = extractString(line);
        currentKey = 'msgid';
      } else if (line.startsWith('msgstr[')) {
        entry.msgstr.push(extractString(line));
        currentKey = 'msgstr';
      } else if (line.startsWith('msgstr ')) {
        entry.msgstr = [extractString(line)];
        currentKey = 'msgstr';
      } else if (line.startsWith('"') && currentKey) {
        // continuation line
        const cont = extractString(line);
        if (currentKey === 'msgid') entry.msgid += cont;
        else if (currentKey === 'msgid_plural') entry.msgid_plural += cont;
        else if (currentKey === 'msgctxt') entry.msgctxt += cont;
      }
    }

    if (entry.msgid && entry.msgid !== '') {
      entries.push(entry);
    }
  }

  return entries;
}

function extractString(line) {
  const match = line.match(/^[^"]*"((?:\\.|[^"\\])*)"$/);
  return match ? match[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/, '"') : '';
}

// ─── Placeholder Protection ───────────────────────────────────────────────────

function protectPlaceholders(text) {
  // WordPress/PHP format specifiers: %s, %d, %f, %1$s, %2$d, etc.
  // Also HTML tags and shortcodes
  const tokens = [];
  let protected_text = text;
  let idx = 0;

  // Replace placeholders with tokens
  protected_text = protected_text.replace(/%(\d+\$)?[sdfe]/g, (m) => {
    const token = `PLACEHOLDER${idx++}`;
    tokens.push({ token, original: m });
    return token;
  });

  // Replace HTML tags
  protected_text = protected_text.replace(/<[^>]+>/g, (m) => {
    const token = `HTMLTAG${idx++}`;
    tokens.push({ token, original: m });
    return token;
  });

  return { text: protected_text, tokens };
}

function restorePlaceholders(text, tokens) {
  let result = text;
  for (const { token, original } of tokens) {
    result = result.replace(new RegExp(token, 'g'), original);
  }
  return result;
}

// ─── Language Code Mapping ────────────────────────────────────────────────────

// WordPress locale → API language codes
const LANG_MAP = {
  deepl: {
    'fr_FR': 'FR', 'de_DE': 'DE', 'es_ES': 'ES', 'it_IT': 'IT', 'pt_BR': 'PT-BR',
    'pt_PT': 'PT-PT', 'nl_NL': 'NL', 'pl_PL': 'PL', 'ru_RU': 'RU', 'ja': 'JA',
    'zh_CN': 'ZH-HANS', 'zh_TW': 'ZH-HANT', 'ko_KR': 'KO', 'ar': 'AR',
    'sv_SE': 'SV', 'da_DK': 'DA', 'fi': 'FI', 'nb_NO': 'NB', 'cs_CZ': 'CS',
    'sk_SK': 'SK', 'hu_HU': 'HU', 'ro_RO': 'RO', 'bg_BG': 'BG', 'el': 'EL',
    'tr_TR': 'TR', 'uk': 'UK', 'id_ID': 'ID', 'lv': 'LV', 'lt_LT': 'LT',
    'et': 'ET', 'sl_SI': 'SL',
  },
  google: {
    'fr_FR': 'fr', 'de_DE': 'de', 'es_ES': 'es', 'it_IT': 'it', 'pt_BR': 'pt',
    'pt_PT': 'pt', 'nl_NL': 'nl', 'pl_PL': 'pl', 'ru_RU': 'ru', 'ja': 'ja',
    'zh_CN': 'zh-CN', 'zh_TW': 'zh-TW', 'ko_KR': 'ko', 'ar': 'ar',
    'sv_SE': 'sv', 'da_DK': 'da', 'fi': 'fi', 'nb_NO': 'no', 'cs_CZ': 'cs',
    'sk_SK': 'sk', 'hu_HU': 'hu', 'ro_RO': 'ro', 'bg_BG': 'bg', 'el': 'el',
    'tr_TR': 'tr', 'uk': 'uk', 'id_ID': 'id', 'lv': 'lv', 'lt_LT': 'lt',
    'he_IL': 'he', 'hi_IN': 'hi', 'fa_IR': 'fa', 'th': 'th', 'vi': 'vi',
    'ms_MY': 'ms', 'af': 'af', 'sq': 'sq', 'hy': 'hy', 'az': 'az',
    'eu': 'eu', 'ca': 'ca', 'hr': 'hr', 'is_IS': 'is', 'mk_MK': 'mk',
    'mn': 'mn', 'sr_RS': 'sr', 'sw': 'sw', 'ta_IN': 'ta',
  },
};

function getTargetLang(wpLocale, prov) {
  const map = LANG_MAP[prov] || LANG_MAP.google;
  return map[wpLocale] || wpLocale.split('_')[0].toLowerCase();
}

// ─── Translation Providers ────────────────────────────────────────────────────

async function translateBatch(texts, targetLang) {
  switch (provider) {
    case 'deepl':   return translateDeepL(texts, targetLang);
    case 'google':  return translateGoogle(texts, targetLang);
    case 'azure':   return translateAzure(texts, targetLang);
    case 'openai':  return translateOpenAI(texts, targetLang);
    case 'claude':  return translateClaude(texts, targetLang);
    case 'libre':   return translateLibre(texts, targetLang);
    default:
      throw new Error(`Unknown provider: ${provider}. Use: deepl, google, azure, openai, claude, libre`);
  }
}

// DeepL -----------------------------------------------------------------------
async function translateDeepL(texts, targetLang) {
  const deepl = requireModule('deepl-node');
  const client = new deepl.DeepLClient(apiKey);
  const results = await client.translateText(texts, null, targetLang);
  return Array.isArray(results) ? results.map(r => r.text) : [results.text];
}

// Google Cloud ----------------------------------------------------------------
async function translateGoogle(texts, targetLang) {
  const { Translate } = requireModule('@google-cloud/translate').v2;
  const client = new Translate({ key: apiKey });
  const [translations] = await client.translate(texts, targetLang);
  return Array.isArray(translations) ? translations : [translations];
}

// Azure -----------------------------------------------------------------------
async function translateAzure(texts, targetLang) {
  const fetch = getFetch();
  const body = texts.map(t => ({ Text: t }));
  const res = await fetch(
    `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${targetLang}`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Subscription-Region': azureRegion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`Azure error: ${JSON.stringify(data)}`);
  return data.map(d => d.translations[0].text);
}

// OpenAI ----------------------------------------------------------------------
async function translateOpenAI(texts, targetLang) {
  const OpenAI = requireModule('openai');
  const client = new OpenAI({ apiKey });

  const prompt = `You are a professional WordPress plugin translator. Translate the following UI strings to language code "${targetLang}".
Rules:
- Keep %s, %d, %1$s, %2$d and similar PHP format specifiers EXACTLY as-is
- Keep HTML tags exactly as-is
- Return ONLY the translations, one per line, in the same order
- Do not add quotes or numbering
- Preserve line breaks within strings

Strings to translate:
${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  });

  const raw = response.choices[0].message.content.trim();
  return raw.split('\n').map((l, i) => l.replace(/^\d+\.\s*/, '').trim() || texts[i]);
}

// Claude ----------------------------------------------------------------------
async function translateClaude(texts, targetLang) {
  const Anthropic = requireModule('@anthropic-ai/sdk');
  // If no apiKey, let the SDK auto-detect from ANTHROPIC_API_KEY env or Claude Code session
  const clientOpts = apiKey ? { apiKey } : {};
  const client = new Anthropic(clientOpts);

  const prompt = `You are a professional WordPress plugin translator. Translate the following UI strings to language code "${targetLang}".
Rules:
- Keep %s, %d, %1$s, %2$d and similar PHP format specifiers EXACTLY as-is
- Keep HTML tags exactly as-is
- Return ONLY the translations, one per line, in the same order
- Do not add quotes or numbering

Strings:
${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].text.trim();
  return raw.split('\n').map((l, i) => l.replace(/^\d+\.\s*/, '').trim() || texts[i]);
}

// LibreTranslate --------------------------------------------------------------
async function translateLibre(texts, targetLang) {
  const fetch = getFetch();
  const results = [];

  for (const text of texts) {
    const res = await fetch(`${libreUrl}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: targetLang.split('_')[0].toLowerCase(),
        api_key: apiKey || '',
      }),
    });
    const data = await res.json();
    results.push(data.translatedText || text);
  }

  return results;
}

// ─── PO Writer ────────────────────────────────────────────────────────────────

function writePo(entries, targetLang, outputPath) {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 16) + '+0000';
  const pluralForms = getPluralForms(targetLang);

  let po = `# Translation for language: ${targetLang}
# Generated by wp-auto-i18n
msgid ""
msgstr ""
"PO-Revision-Date: ${now}\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Language: ${targetLang}\\n"
"Plural-Forms: ${pluralForms}\\n"
"X-Generator: wp-auto-i18n\\n"

`;

  for (const entry of entries) {
    if (entry.reference) po += `#: ${entry.reference}\n`;
    if (entry.msgctxt)   po += `msgctxt "${escape(entry.msgctxt)}"\n`;
    po += `msgid "${escape(entry.msgid)}"\n`;

    if (entry.msgid_plural) {
      po += `msgid_plural "${escape(entry.msgid_plural)}"\n`;
      const pluralCount = parseInt(pluralForms.match(/nplurals=(\d+)/)?.[1] || '2');
      for (let i = 0; i < pluralCount; i++) {
        po += `msgstr[${i}] "${escape(entry.msgstr[i] || '')}"\n`;
      }
    } else {
      po += `msgstr "${escape(entry.msgstr[0] || '')}"\n`;
    }
    po += '\n';
  }

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, po, 'utf8');
}

function escape(str) {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Plural forms for common languages
function getPluralForms(lang) {
  const l = lang.split('_')[0].toLowerCase();
  const forms = {
    ar:  'nplurals=6; plural=(n==0?0:n==1?1:n==2?2:n%100>=3&&n%100<=10?3:n%100>=11?4:5)',
    cs:  'nplurals=4; plural=(n==1)?0:(n>=2&&n<=4)?1:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?2:3',
    de:  'nplurals=2; plural=(n != 1)',
    fr:  'nplurals=2; plural=(n > 1)',
    he:  'nplurals=4; plural=(n==1)?0:(n==2)?1:(n<0||n>10)&&(n%10==0)?2:3',
    hr:  'nplurals=3; plural=(n%10==1&&n%100!=11?0:n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?1:2)',
    hu:  'nplurals=2; plural=(n != 1)',
    id:  'nplurals=1; plural=0',
    ja:  'nplurals=1; plural=0',
    ko:  'nplurals=1; plural=0',
    lt:  'nplurals=3; plural=(n%10==1&&n%100!=11?0:n%10>=2&&(n%100<10||n%100>=20)?1:2)',
    lv:  'nplurals=3; plural=(n%10==1&&n%100!=11?0:n%10!=0?1:2)',
    mk:  'nplurals=2; plural=n==1||n%10==1?0:1',
    ms:  'nplurals=1; plural=0',
    nl:  'nplurals=2; plural=(n != 1)',
    pl:  'nplurals=4; plural=(n==1?0:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?1:n!=1&&(n%10>=0&&n%10<=1)||(n%10>=5&&n%10<=9)||(n%100>=12&&n%100<=14)?2:3)',
    pt:  'nplurals=2; plural=(n != 1)',
    ro:  'nplurals=3; plural=(n==1?0:(((n%100>19)||((n%100==0)&&(n!=0)))?2:1))',
    ru:  'nplurals=4; plural=(n%10==1&&n%100!=11?0:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?1:n%10==0||n%10>=5&&n%10<=9||(n%100>=11&&n%100<=14)?2:3)',
    sk:  'nplurals=4; plural=(n==1)?0:(n>=2&&n<=4)?1:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?2:3',
    sl:  'nplurals=4; plural=(n%100==1?1:n%100==2?2:n%100==3||n%100==4?3:0)',
    sr:  'nplurals=3; plural=(n%10==1&&n%100!=11?0:n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?1:2)',
    th:  'nplurals=1; plural=0',
    tr:  'nplurals=2; plural=(n > 1)',
    uk:  'nplurals=4; plural=(n%10==1&&n%100!=11?0:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?1:n%10==0||n%10>=5&&n%10<=9||(n%100>=11&&n%100<=14)?2:3)',
    vi:  'nplurals=1; plural=0',
    zh:  'nplurals=1; plural=0',
    default: 'nplurals=2; plural=(n != 1)',
  };
  return forms[l] || forms.default;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const potContent = fs.readFileSync(potFile, 'utf8');
  const entries = parsePot(potContent);

  console.log(`Loaded ${entries.length} strings from ${potFile}`);
  console.log(`Translating to: ${langCode} using ${provider}`);

  const targetLang = getTargetLang(langCode, provider);
  console.log(`Provider language code: ${targetLang}`);

  // Batch translate (50 strings per request to respect rate limits)
  const BATCH_SIZE = 50;
  let translated = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.msgid || entry.msgid === '') continue;

    // Protect placeholders
    const { text: protectedText, tokens } = protectPlaceholders(entry.msgid);

    try {
      const results = await translateBatch([protectedText], targetLang);
      const raw = results[0] || entry.msgid;
      entry.msgstr = [restorePlaceholders(raw, tokens)];

      if (entry.msgid_plural) {
        const { text: pp, tokens: pt } = protectPlaceholders(entry.msgid_plural);
        const pr = await translateBatch([pp], targetLang);
        const pluralForms = getPluralForms(langCode);
        const pluralCount = parseInt(pluralForms.match(/nplurals=(\d+)/)?.[1] || '2');
        entry.msgstr = Array(pluralCount).fill(restorePlaceholders(pr[0] || entry.msgid_plural, pt));
      }

      translated++;
      process.stdout.write(`\rTranslated: ${translated}/${entries.length}`);
    } catch (err) {
      console.warn(`\nFailed to translate: "${entry.msgid.substring(0, 40)}..." — ${err.message}`);
      entry.msgstr = [''];
    }

    // Small delay to respect rate limits
    if (i > 0 && i % BATCH_SIZE === 0) await sleep(500);
  }

  console.log(`\nDone. ${translated} strings translated.`);

  const outFile = outputFile || potFile.replace('.pot', `-${langCode}.po`);
  writePo(entries, langCode, outFile);
  console.log(`PO file written: ${outFile}`);
  console.log(JSON.stringify({ po: outFile, lang: langCode, count: translated }));
}

main().catch(err => {
  console.error('Translation failed:', err.message);
  process.exit(1);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireModule(name) {
  try {
    return require(name);
  } catch {
    // Try from skill's node_modules
    const skillDir = path.dirname(__dirname);
    try {
      return require(path.join(skillDir, 'node_modules', name));
    } catch {
      console.error(`Missing dependency: ${name}`);
      console.error(`Run: node "${path.join(skillDir, 'scripts', 'setup.js')}" --install`);
      process.exit(1);
    }
  }
}

function getFetch() {
  if (typeof fetch !== 'undefined') return fetch;
  try { return require('node-fetch'); } catch { return requireModule('node-fetch'); }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
