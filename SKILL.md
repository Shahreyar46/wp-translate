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
- On Windows: do NOT use `cat >> file << 'EOF'` heredoc — it breaks
- Safe alternative for appending via shell: `node -e "require('fs').appendFileSync('FILE', 'CONTENT', 'utf8')"`

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

> After reading, immediately proceed to STEP 3. Do NOT re-read the POT file again.

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

```
✅  wp-translate Complete
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
- `extract-strings.js` — outputs msgid list as JSON for the AI to read
- `compiler.js` — compiles `.po` → `.mo` binary (no msgfmt needed, auto-installs deps)

`translator.js` — retired. The AI translates directly.

GitHub: https://github.com/Shahreyar46/wp-translate.git
