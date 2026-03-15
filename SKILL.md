---
name: wp-translate
description: WordPress plugin internationalization (i18n) automation. Scans PHP and JS files for translatable strings, generates .pot files, auto-translates into multiple languages using the current AI directly (no API key ever needed), and compiles .po and .mo files. Use when user says "translate plugin", "generate translations", "make pot file", "i18n", "localize plugin", "translate to French/German/Spanish/Arabic/Bengali/Bangla/Hindi/Urdu/Turkish/Korean/Japanese/Chinese/Russian/Italian/Portuguese/Dutch/Polish/Swedish", or mentions language codes like fr_FR, de_DE, es_ES, ar, bn_BD, it_IT, pt_BR, zh_CN, ja, ru_RU, hi_IN, ur, tr_TR, ko_KR. Works on ANY WordPress plugin path. Automatically runs the full pipeline without asking for confirmation at each step. NEVER asks for an API key — the AI does the translation directly.
argument-hint: plugin-path lang1,lang2,lang3
---

# WordPress Plugin i18n Automation — Fully Autonomous Mode

You are an expert WordPress internationalization engineer AND a professional translator. When this skill is invoked, **execute the complete pipeline automatically** — do not stop to ask for confirmation at any step.

---

## ⚠️ UNIVERSAL AI RULES — READ FIRST (applies to ALL AI models)

These rules apply whether you are **Claude, Gemini, GPT-4, Copilot, Mistral, Llama, or any other AI**:

### RULE 1 — YOU translate. Never delegate.
- **NEVER** call `generalist`, `subagent`, `agent`, `delegate`, `assistant`, or any tool that spawns another AI
- **NEVER** call `translator.js` — it is retired and deleted from the workflow
- **NEVER** call an external translation API (DeepL, Google Translate, Azure, etc.)
- **YOU** (the AI reading this) use your built-in language knowledge to translate every string

### RULE 2 — No looping without writing
- Read the POT file **once** (in sections if large), then immediately translate and write
- If you catch yourself reading the POT file 3+ times without writing any `.po` content — **STOP and write now**
- Do not re-read sections you already translated

### RULE 3 — Write files using tools, not bash echo/cat
- Use the **Write tool** to create the `.po` file (chunk 1 = header + first ~300 strings)
- Use the **Edit tool** to append subsequent chunks by targeting the last few lines as `old_string`
- On Windows: do NOT use `cat >> file << 'EOF'` heredoc — **it mangles backslash escapes**, breaking regex patterns like `\\"/g` into `/g`. This causes silent failures in patch scripts.
- Always use the **Write tool** for any `.js` patch/extract scripts too — not heredoc
- Safe alternative for appending via shell (small strings only): `node -e "require('fs').appendFileSync('FILE', 'CONTENT', 'utf8')"`

### RULE 4 — Chunked writing for large files
- **Under 400 strings** → Write everything in ONE Write call
- **400–800 strings** → Write call (header + first 400), then ONE Edit append (rest)
- **Over 800 strings** → Write call (header + first 300), then Edit appends of ~250 strings each
- **Never say "too many strings"** — always use chunking

### RULE 5 — No confirmation prompts
- Never ask "should I continue?", "are you ready?", or "shall I translate the next batch?"
- Run all chunks back-to-back without stopping

---

## STEP 0 — Resolve Parameters

1. **Plugin path** — from arguments, currently open file, or ask once
2. **Text domain** — auto-detect:
   ```bash
   node -e "const fs=require('fs'),path=require('path');const d='<PLUGIN_PATH>';const f=fs.readdirSync(d).find(f=>f.endsWith('.php'));if(f){const m=fs.readFileSync(path.join(d,f),'utf8').match(/Text Domain:\s*(.+)/i);console.log(m?m[1].trim():'not found');}else console.log('no php file');"
   ```
3. **Languages** — from arguments or natural language:
   - "French" → `fr_FR`, "German" → `de_DE`, "Spanish" → `es_ES`
   - "Arabic" → `ar`, "Italian" → `it_IT`, "Portuguese" → `pt_BR`
   - "Chinese" → `zh_CN`, "Japanese" → `ja`, "Russian" → `ru_RU`
   - "Hebrew" → `he_IL`, "Turkish" → `tr_TR`, "Korean" → `ko_KR`
   - "Dutch" → `nl_NL`, "Polish" → `pl_PL`, "Swedish" → `sv_SE`
   - "Bengali/Bangla" → `bn_BD`, "Urdu" → `ur`, "Hindi" → `hi_IN`
   - "Thai" → `th`, "Vietnamese" → `vi`, "Indonesian" → `id_ID`
   - "Ukrainian" → `uk`, "Greek" → `el`, "Romanian" → `ro_RO`

**NEVER ask for an API key. Announce the plan and execute immediately.**

---

## STEP 0B — Detect Mode: Fresh Translation vs. Update vs. Fix-Only

**Before doing anything else**, check whether existing `.po` files already exist for this plugin:

```bash
node -e "
const fs=require('fs'), path=require('path');
const langDir='<PLUGIN_PATH>/languages';
if(!fs.existsSync(langDir)){console.log('MODE=fresh'); process.exit();}
const pos=fs.readdirSync(langDir).filter(f=>f.endsWith('.po'));
if(pos.length===0){console.log('MODE=fresh'); process.exit();}
// Check if any .po file has untranslated strings (empty msgstr OR msgstr==msgid)
let hasUntranslated=false;
pos.forEach(f=>{
  const lines=fs.readFileSync(path.join(langDir,f),'utf8').split('\n');
  for(let i=0;i<lines.length;i++){
    if(lines[i].startsWith('msgstr ') && lines[i-1] && lines[i-1].startsWith('msgid ') && lines[i-1]!='msgid \"\"'){
      const id=lines[i-1].replace(/^msgid /,'');
      const str=lines[i].replace(/^msgstr /,'');
      if(str==='\"\"' || str===id) hasUntranslated=true;
    }
  }
});
console.log('MODE=update');
console.log('EXISTING_PO='+pos.join(','));
console.log('HAS_UNTRANSLATED='+hasUntranslated);
"
```

### If MODE=fresh → run the normal pipeline (STEP 1 → 2 → 3 → 4 → 5)
All languages are translated from scratch. Continue to STEP 1.

### If MODE=update → run the UPDATE pipeline instead (STEP 1 → 2 → 2B → 3B → 4 → 5)
Existing translations are preserved. Only new/missing strings are translated. See STEP 2B and STEP 3B below.

### If user says "fix only untranslated / fix missing / fix empty strings" (FIX-ONLY mode):
**Skip STEP 1, STEP 2, and STEP 2B entirely.** Go directly to STEP 3B.
Do NOT regenerate the POT file. Do NOT run merger.js. Do NOT touch strings that already have correct translations.
The user wants ONLY the empty `msgstr ""` and `msgstr == msgid` cases fixed — all other strings must remain exactly as they are.

**Announce to the user which mode was detected before proceeding.**

---

## STEP 1 — Install Scanner/Compiler Dependencies

```bash
node "${CLAUDE_SKILL_DIR}/scripts/setup.js" --check
```
If check fails:
```bash
node "${CLAUDE_SKILL_DIR}/scripts/setup.js" --install
```

Only installs `gettext-parser` for scanning/compiling. No translation API libs needed.

---

## STEP 2 — Scan Plugin → Generate POT

```bash
node "${CLAUDE_SKILL_DIR}/scripts/scanner.js" \
  --plugin "<PLUGIN_PATH>" \
  --domain "<TEXT_DOMAIN>" \
  --output "<PLUGIN_PATH>/languages/<TEXT_DOMAIN>.pot"
```

Then read the POT file to see all strings. For large POT files (1000+ lines), read in sections:
- Read lines 1–500 first, note all `msgid` values
- Read lines 500–1000, note remaining `msgid` values
- Continue until you have seen ALL strings

**Report:** PHP strings found, JS strings found, total unique strings.

> After reading, immediately proceed to STEP 3 (fresh) or STEP 2B (update). Do NOT re-read the POT file again.

---

## STEP 2B — (UPDATE MODE ONLY) Merge New POT into Existing PO Files

> **CRITICAL: merger.js PRESERVES all existing translations. It does NOT reset any msgstr values.**
> If you are in FIX-ONLY mode (user asked to fix missing/empty strings only), **SKIP THIS STEP ENTIRELY** — go straight to STEP 3B.
> Never re-run the full pipeline (STEP 1 → 2 → 3) when the user only wants to fix untranslated entries in existing .po files.

Run merger.js to merge the freshly generated POT into all existing `.po` files:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/merger.js" \
  --pot "<PLUGIN_PATH>/languages/<TEXT_DOMAIN>.pot" \
  --dir "<PLUGIN_PATH>/languages" \
  --domain "<TEXT_DOMAIN>" \
  --obsolete remove
```

The merger will:
- **Keep** all existing translated `msgstr` values untouched
- **Add** new msgids (with empty `msgstr ""`) for strings not yet in the `.po`
- **Remove** msgids that no longer exist in the plugin code
- **Update** file references (`#:`) to reflect current line numbers

Read the JSON output from merger.js. It will tell you exactly which strings were added per `.po` file. Example output:
```json
{
  "pot_strings": 85,
  "files_merged": 3,
  "total_added": 4,
  "results": [
    { "file": "fr_FR.po", "added": 4, "removed": 1, "addedStrings": ["New setting label", "Reset button", ...] }
  ]
}
```

After merger runs, check for ANY empty `msgstr ""` in each `.po` file — including pre-existing ones that were never translated:

```bash
node -e "
const fs=require('fs'), path=require('path');
const dir='<PLUGIN_PATH>/languages';
fs.readdirSync(dir).filter(f=>f.endsWith('.po')).forEach(f=>{
  const content=fs.readFileSync(path.join(dir,f),'utf8');
  const empty=(content.match(/\nmsgstr \"\"\n/g)||[]).length;
  console.log(f+': '+empty+' empty msgstr');
});
"
```

**If ALL `.po` files have 0 empty msgstr AND total_added === 0** — fully up to date. Skip STEP 3B. Go to STEP 4 to recompile `.mo` files.

**If ANY `.po` file has empty msgstr (whether newly added OR pre-existing missed translations)** — proceed to STEP 3B to translate all empty strings.

---

## STEP 3B — (UPDATE MODE ONLY) Translate All Empty Strings

### Strategy: Use a Node.js patch script (REQUIRED for 10+ empty strings)

When there are 10 or more empty strings to translate — which is almost always the case in UPDATE MODE — **do NOT use Edit tool per string**. That approach is too slow, error-prone, and will fail or be inconsistent at scale.

**Instead, use this mandatory batch approach:**

**Step 1:** Write this as a script file using the **Write tool** to `C:/Users/<USER>/extract_untranslated.js`, then run it:

```javascript
const fs = require('fs'), path = require('path');
const gettextParser = require('gettext-parser');
const dir = '<PLUGIN_PATH>/languages';

const keepAsIsSet = new Set([
  'Gutenberg', 'Elementor', 'Shortcode', 'Add-ons', 'Self-Hosted',
  'Simulcast', 'APP ID', 'Documentation', 'Configurations',
]);

function isIntentionallyIdentical(s) {
  if (/^https?:\/\//.test(s)) return true;
  if (/^[\p{Emoji}\s]+$/u.test(s)) return true;
  if (/^\d+$/.test(s)) return true;
  if (/^[a-z][a-z0-9_-]*$/.test(s) && s.length <= 20) return true;
  if (keepAsIsSet.has(s)) return true;
  return false;
}

const poFiles = fs.readdirSync(dir).filter(f => f.endsWith('.po'));
poFiles.forEach(f => {
  const input = fs.readFileSync(path.join(dir, f));
  const po = gettextParser.po.parse(input);
  const missing = [];

  for (const ctx in po.translations) {
    for (const id in po.translations[ctx]) {
      if (id === '') continue;
      const entry = po.translations[ctx][id];
      const str = entry.msgstr[0] || '';
      const isEmpty = str === '';
      const isSameAsId = str === id;
      
      if ((isEmpty || isSameAsId) && !isIntentionallyIdentical(id)) {
        missing.push(id);
      }
    }
  }

  if (missing.length) {
    console.log(f + ' (' + missing.length + ' untranslated):');
    missing.forEach((s, i) => console.log('  ' + i + ': ' + s));
  } else {
    console.log(f + ': fully translated');
  }
});
```

**Step 2:** Write the patch script using the **Write tool** to `C:/Users/<USER>/patch_translations.js`.

```javascript
const fs = require('fs'), path = require('path');
const gettextParser = require('gettext-parser');
const langDir = '<PLUGIN_PATH>/languages';

const translations = {
  'fr_FR': {
    'Settings': 'Paramètres',
    'Referral Settings': 'Paramètres de parrainage',
  },
  'de_DE': {
    'Settings': 'Einstellungen',
  },
};

function patchPoFile(langCode, dict) {
  const files = fs.readdirSync(langDir).filter(f =>
    f.endsWith('-' + langCode + '.po') || f === langCode + '.po'
  );
  if (files.length === 0) { console.log('Not found for: ' + langCode); return; }
  files.forEach(fname => {
    const filePath = path.join(langDir, fname);
    const input = fs.readFileSync(filePath);
    const po = gettextParser.po.parse(input);
    let changed = 0;

    for (const ctx in po.translations) {
      for (const id in po.translations[ctx]) {
        if (id === '') continue;
        const entry = po.translations[ctx][id];
        const currentStr = entry.msgstr[0] || '';
        const isUntranslated = currentStr === '' || currentStr === id;

        if (isUntranslated && dict[id]) {
          entry.msgstr = [dict[id]];
          changed++;
        }
      }
    }
    
    if (changed > 0) {
      const output = gettextParser.po.compile(po);
      fs.writeFileSync(filePath, output);
    }
    console.log(fname + ': ' + changed + ' strings patched');
  });
}

Object.keys(translations).forEach(lang => patchPoFile(lang, translations[lang]));
console.log('Done!');
```

**Step 3:** Write the translations dictionaries. For each language code that has empty strings:
- Read the empty msgid list from Step 1
- Translate ALL of them using your built-in language knowledge
- Add them to the `translations` object in the script

**Translations rules:**
- Keep `%s`, `%d`, `%1$s`, `%2$d` and all PHP format specifiers **exactly as-is**
- Keep HTML tags exactly as-is
- Do NOT include entries with empty values — only include strings you have translated
- For msgids with `\"` escaped quotes, the script handles unescaping automatically
- **NEVER put the same English string as the translation** — if you don't know a translation, omit the entry entirely (leave it out of the dictionary). An empty `msgstr ""` is better than `msgstr "Settings"` for a German file.
- After running the script, re-run `extract_untranslated.js` to verify no real text remains untranslated. Strings like URLs, emojis, brand names, and short tokens with `msgstr == msgid` are **intentionally identical** and are NOT a problem — do not attempt to "translate" them.

**Smart-quote apostrophe gotcha (Windows/Mac):** Some plugin source files use curly/smart apostrophes (U+2019 `'`) instead of regular apostrophes (`'`). They look identical visually but have different byte values. If a string like `We'll handle hosting` isn't matching your dictionary key, check the actual character code:
```bash
node -e "var fs=require('fs');var c=fs.readFileSync('<PO_FILE>','utf8');var idx=c.indexOf('ll handle');console.log('char code:',c.charCodeAt(idx-1),'(39=normal, 8217=smart)');"
```
If char code is 8217, the file uses smart quotes. Either use the smart quote in your dictionary key (`We\u2019ll handle hosting`) or do a direct string replacement using `content.replace()` instead of the dictionary approach.

**Loco Translate % ceiling — what to expect:** Loco counts `msgstr == msgid` as "pending" regardless of whether the identical value is correct (brand names, URLs, emojis). This creates a hard ceiling below 100%:
- Languages with non-Latin scripts (Arabic, Bengali, Hindi, Japanese, Chinese, Korean, Russian, etc.) can reach 97%+ because Gutenberg block keywords and numbers can be transliterated/converted to native script
- Latin-script languages (French, German, Spanish, Dutch, etc.) typically plateau at 92–95% because brand names (`WPPOOL`, `Jitsi Meet`, `FlexMeeting`), emojis, and URLs cannot be made different
- This is correct and expected — do not try to "fix" brand names just to raise the percentage

**Step 4:** Run the script:
```bash
node patch_translations.js
```

**Step 5:** Verify all files are fully translated:
```bash
node -e "
const fs=require('fs'), path=require('path');
const dir='<PLUGIN_PATH>/languages';
fs.readdirSync(dir).filter(f=>f.endsWith('.po')).forEach(f=>{
  const content=fs.readFileSync(path.join(dir,f),'utf8');
  const lines=content.split('\n');
  let empty=0;
  for(let i=0;i<lines.length;i++){
    if(lines[i]==='msgstr \"\"' && lines[i-1] && lines[i-1].startsWith('msgid ') && lines[i-1]!='msgid \"\"') empty++;
  }
  console.log(f+': '+empty+' empty msgstr '+(empty===0?'(done!)':'(needs translation)'));
});
"
```

If any file still has empty strings, add the missing entries to the patch script and re-run.

### For under 10 empty strings (small updates only):

Only use Edit tool per string when there are fewer than 10 empty msgstr entries across ALL files. In that case:

Read the `.po` file, find blocks like:
```
#: includes/settings.php:142
msgid "New setting label"
msgstr ""
```
Replace with the translation using Edit tool:
```
#: includes/settings.php:142
msgid "New setting label"
msgstr "Nouveau libellé de paramètre"
```

After translating, verify using the bash check above.

---

## STEP 3 — YOU Translate → Write PO File Directly

For each language, translate ALL strings using your built-in knowledge and write the `.po` file.

### Translation rules:
- Keep `%s`, `%d`, `%1$s`, `%2$d` and all PHP format specifiers **exactly as-is**
- Keep HTML tags exactly as-is (`<a href="%s">`, `<strong>`, `<br/>`)
- Keep WordPress shortcodes as-is
- Translate only the human-readable text
- Use natural, idiomatic phrasing — not word-for-word
- Use standard software UI vocabulary for the target language

### How to write the PO file — step by step:

**Step A:** Write chunk 1 using the Write tool:
```
# Translation of <DOMAIN> for: <LANG_CODE>
# Generated by wp-translate skill
msgid ""
msgstr ""
"PO-Revision-Date: <DATE>\n"
"MIME-Version: 1.0\n"
"Content-Type: text/plain; charset=UTF-8\n"
"Content-Transfer-Encoding: 8bit\n"
"Language: <LANG_CODE>\n"
"Plural-Forms: <PLURAL_FORM>\n"
"X-Generator: wp-translate-skill\n"

#: path/to/file.php:42
msgid "Settings"
msgstr "<translated>"

... (first ~300 strings)
```

**Step B:** Append chunk 2 using Edit tool — target the LAST 2 lines of the file as `old_string`, add them back + new content as `new_string`. Example:

old_string:
```
msgid "Last string in chunk 1"
msgstr "অনুবাদ"
```
new_string:
```
msgid "Last string in chunk 1"
msgstr "অনুবাদ"

#: path/to/file.php:123
msgid "Next string"
msgstr "পরবর্তী অনুবাদ"

... (next ~250 strings)
```

**Step C:** Repeat Step B for each remaining chunk until ALL strings are written.

**Step D:** Verify count:
```bash
node -e "const fs=require('fs');const lines=fs.readFileSync('<PO_FILE>','utf8').split('\n');const count=lines.filter(l=>l.startsWith('msgid ') && l!='msgid \"\"').length;console.log('Translated strings:',count);"
```

### PO file format reference:

```
# Translation of <domain> for: <LANG_CODE>
# Generated by wp-translate skill
msgid ""
msgstr ""
"PO-Revision-Date: YYYY-MM-DD HH:MM+0000\n"
"MIME-Version: 1.0\n"
"Content-Type: text/plain; charset=UTF-8\n"
"Content-Transfer-Encoding: 8bit\n"
"Language: <LANG_CODE>\n"
"Plural-Forms: <PLURAL_FORM>\n"
"X-Generator: wp-translate-skill\n"

#: path/to/file.php:42
msgid "Settings"
msgstr "<translated text>"

#: path/to/file.php:43
msgid "%d item"
msgid_plural "%d items"
msgstr[0] "<singular translation>"
msgstr[1] "<plural translation>"
```

### Plural forms by language:

| Language | Plural-Forms value |
|---|---|
| `bn_BD`, `de_DE`, `nl_NL`, `sv_SE`, `da_DK`, `fi`, `nb_NO`, `hu_HU`, `tr_TR` | `nplurals=2; plural=(n != 1)` |
| `fr_FR`, `pt_BR` | `nplurals=2; plural=(n > 1)` |
| `ar` | `nplurals=6; plural=(n==0?0:n==1?1:n==2?2:n%100>=3&&n%100<=10?3:n%100>=11?4:5)` |
| `ja`, `zh_CN`, `zh_TW`, `ko_KR`, `id_ID`, `ms_MY`, `th`, `vi` | `nplurals=1; plural=0` |
| `ru_RU`, `uk`, `bg_BG` | `nplurals=4; plural=(n%10==1&&n%100!=11?0:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?1:n%10==0||n%10>=5&&n%10<=9||(n%100>=11&&n%100<=14)?2:3)` |
| `pl_PL` | `nplurals=4; plural=(n==1?0:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?1:n!=1&&(n%10>=0&&n%10<=1)||(n%10>=5&&n%10<=9)||(n%100>=12&&n%100<=14)?2:3)` |
| `cs_CZ`, `sk_SK` | `nplurals=4; plural=(n==1)?0:(n>=2&&n<=4)?1:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?2:3` |
| `ro_RO` | `nplurals=3; plural=(n==1?0:(((n%100>19)||((n%100==0)&&(n!=0)))?2:1))` |
| `hr` | `nplurals=3; plural=(n%10==1&&n%100!=11?0:n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?1:2)` |
| `he_IL` | `nplurals=4; plural=(n==1)?0:(n==2)?1:(n<0||n>10)&&(n%10==0)?2:3` |
| `hi_IN`, `ur`, `fa_IR` | `nplurals=2; plural=(n != 1)` |

---

## STEP 4 — Compile PO → MO

```bash
node "${CLAUDE_SKILL_DIR}/scripts/compiler.js" \
  --dir "<PLUGIN_PATH>/languages" \
  --domain "<TEXT_DOMAIN>"
```

This compiles all `.po` files in one pass. If `gettext-parser` is missing, the script auto-installs it.

---

## STEP 5 — Show Results Summary

**For FRESH mode:**
```
✅  wp-translate Complete (Fresh Translation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plugin:     <plugin-name>
Domain:     <text-domain>
Strings:    XX PHP + XX JS = XX unique
Translator: AI (built-in — no API key used)
Output:     <PLUGIN_PATH>/languages/

Language    │ .pot │ .po │ .mo │ Strings
────────────┼──────┼─────┼─────┼────────
bn_BD       │  ✓   │  ✓  │  ✓  │  XX
fr_FR       │  ✓   │  ✓  │  ✓  │  XX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WordPress is now ready to serve translations!
```

**For UPDATE mode:**
```
✅  wp-translate Complete (Update — Existing Translations Preserved)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plugin:     <plugin-name>
Domain:     <text-domain>
Total strings in POT:  XX
New strings added:     XX  (translated by AI)
Obsolete removed:      XX
Existing preserved:    XX  (untouched)
Output:     <PLUGIN_PATH>/languages/

Language    │ .po │ .mo │ Total │ New │ Removed
────────────┼─────┼─────┼───────┼─────┼────────
bn_BD       │  ✓  │  ✓  │  XX   │  +X │   -X
fr_FR       │  ✓  │  ✓  │  XX   │  +X │   -X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WordPress is now ready to serve translations!
```

Remind user to add to main plugin PHP file if not already present:
```php
add_action( 'init', function() {
    load_plugin_textdomain( 'YOUR-DOMAIN', false,
        dirname( plugin_basename( __FILE__ ) ) . '/languages/' );
});
```

---

## AI-Specific Behavior Notes

### Gemini (antigravity / Cursor / AI Studio)
- The `generalist` tool is NOT available — do not call it
- Do NOT spawn subagents — translate directly
- Use Write tool for chunk 1, Edit tool for all subsequent chunks
- If output is cut short mid-chunk, continue with the next Edit immediately
- Chunk size: 200 strings max per call if you have output limits
- **UPDATE MODE**: Always use the `patch_translations.js` Node.js script approach (STEP 3B) — never use custom one-off scripts or external APIs. The patch script approach handles all languages in one run and is reliable.
- **NEVER write custom translation scripts that differ from the patch_translations.js format** — they have proven to fail with special characters, escaping issues, and missing strings

### Claude (Claude Code / Cursor / API)
- Use Write tool for chunk 1, Edit tool for appending
- Agent tool is available but do NOT use it for translation — translate directly
- Chunk size: 300–400 strings per call

### GPT-4 / ChatGPT (Cursor / API / Copilot)
- Do not use function_call to delegate to external tools
- Write file contents directly using the file write capability
- If context window is limited, process 150–200 strings per chunk

### Copilot (VSCode)
- Use the built-in file edit commands to write `.po` content
- Do not open browser or call external services
- Chunk size: 200 strings per call

### Windsurf / Codeium
- Use the built-in write/edit file tools
- Do not spawn terminal processes for translation
- Chunk size: 200–300 strings per call

### Any other AI
- Use whatever file-write tool you have available (Write, EditFile, create_file, etc.)
- Never call an external translation API — use your built-in multilingual knowledge
- Translate in chunks if needed — never give up due to "too many strings"

---

## Execution Rules (Universal)

1. **NEVER ask for an API key** — the AI is the translator
2. **NEVER call translator.js** — that script is retired
3. **NEVER delegate** to a sub-agent, generalist, or external tool
4. **NEVER stop mid-pipeline** to ask "should I continue?"
5. **NEVER say "too many strings"** — use chunked writing instead
6. **Translate ALL strings** — do not skip any
7. **Always compile .mo** after writing all `.po` chunks
8. **Verify string count** after writing — count should match POT total
9. **Do all languages sequentially** without pausing between them
10. **On Windows** — do not use `cat >> file << 'EOF'` — use Edit tool or Node.js append

---

## Language Code Reference

| Natural Language | WordPress Code | | Natural Language | WordPress Code |
|---|---|---|---|---|
| French | `fr_FR` | | Arabic | `ar` |
| German | `de_DE` | | Hebrew | `he_IL` |
| Spanish | `es_ES` | | Farsi/Persian | `fa_IR` |
| Italian | `it_IT` | | Hindi | `hi_IN` |
| Portuguese (Brazil) | `pt_BR` | | Japanese | `ja` |
| Portuguese (Portugal) | `pt_PT` | | Chinese (Simplified) | `zh_CN` |
| Dutch | `nl_NL` | | Chinese (Traditional) | `zh_TW` |
| Polish | `pl_PL` | | Korean | `ko_KR` |
| Russian | `ru_RU` | | Turkish | `tr_TR` |
| Swedish | `sv_SE` | | Thai | `th` |
| Danish | `da_DK` | | Vietnamese | `vi` |
| Finnish | `fi` | | Indonesian | `id_ID` |
| Norwegian | `nb_NO` | | Malay | `ms_MY` |
| Czech | `cs_CZ` | | Ukrainian | `uk` |
| Slovak | `sk_SK` | | Bulgarian | `bg_BG` |
| Hungarian | `hu_HU` | | Greek | `el` |
| Romanian | `ro_RO` | | Croatian | `hr` |
| Bengali/Bangla | `bn_BD` | | Urdu | `ur` |

---

## Script Locations

All scripts at `${CLAUDE_SKILL_DIR}/scripts/`:
- `setup.js` — installs gettext-parser + compiler deps (no translation APIs)
- `scanner.js` — extracts PHP + JS translatable strings → `.pot`
- `merger.js` — merges new `.pot` into existing `.po` files (UPDATE MODE — preserves existing translations, adds new empty strings, removes obsolete ones)
- `extract-strings.js` — outputs msgid list as JSON for the AI to read
- `compiler.js` — compiles `.po` → `.mo` binary (no msgfmt needed, auto-installs deps)

`translator.js` — retired. The AI translates directly.

GitHub: https://github.com/Shahreyar46/wp-translate.git
