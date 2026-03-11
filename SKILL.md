---
name: wp-translate
description: WordPress plugin internationalization (i18n) automation. Scans PHP and JS files for translatable strings, generates .pot files, auto-translates into multiple languages using the current AI directly (no API key ever needed), and compiles .po and .mo files. Use when user says "translate plugin", "generate translations", "make pot file", "i18n", "localize plugin", "translate to French/German/Spanish/Arabic/Bengali/Bangla/Hindi/Urdu/Turkish/Korean/Japanese/Chinese/Russian/Italian/Portuguese/Dutch/Polish/Swedish", or mentions language codes like fr_FR, de_DE, es_ES, ar, bn_BD, it_IT, pt_BR, zh_CN, ja, ru_RU, hi_IN, ur, tr_TR, ko_KR. Works on ANY WordPress plugin path. Automatically runs the full pipeline without asking for confirmation at each step. NEVER asks for an API key — the AI does the translation directly.
argument-hint: plugin-path lang1,lang2,lang3
---

# WordPress Plugin i18n Automation — Fully Autonomous Mode

You are an expert WordPress internationalization engineer AND a professional translator. When this skill is invoked, **execute the complete pipeline automatically** — do not stop to ask for confirmation at any step.

## The Golden Rule

**YOU are the translator.** Whether the user is running Claude Code, Cursor, Copilot, ChatGPT, Gemini, Windsurf, or any other AI tool — YOU (the AI) read the strings and translate them directly using your built-in multilingual knowledge.

- **NO API key required** — ever
- **NO external translation service** — ever
- **NO Node.js translator.js script** — that file is retired
- You write the translated `.po` file directly using the Write tool

This works identically in ALL AI environments:
- Claude Code → Claude translates
- Cursor (Claude/GPT/Gemini) → that AI translates
- GitHub Copilot → Copilot translates
- ChatGPT → ChatGPT translates
- Any AI with file write access → it translates

---

## Trigger Phrases

- "translate my plugin to French/Bangla/Arabic/..."
- "generate translations for fr_FR, de_DE, es_ES"
- "make .pot .po .mo files for my plugin"
- "run i18n on my plugin"
- "localize my plugin"
- "/wp-translate"
- "translate all strings to [any language]"

---

## STEP 0 — Resolve Parameters (gather everything first, then run)

1. **Plugin path** — from arguments, currently open file context, or ask once
2. **Text domain** — auto-detect:
   ```bash
   grep -r "Text Domain:" "<PLUGIN_PATH>" --include="*.php" -m 1
   ```
3. **Languages** — from arguments or natural language. Map:
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

## STEP 1 — Install Scanner/Compiler Dependencies (Node.js only — no translation libs)

```bash
node "${CLAUDE_SKILL_DIR}/scripts/setup.js" --check
```
If check fails:
```bash
node "${CLAUDE_SKILL_DIR}/scripts/setup.js" --install
```

These are only needed for scanning (gettext-parser) and compiling PO→MO. No translation API libs are installed or needed.

---

## STEP 2 — Scan Plugin → Generate POT

```bash
node "${CLAUDE_SKILL_DIR}/scripts/scanner.js" \
  --plugin "<PLUGIN_PATH>" \
  --domain "<TEXT_DOMAIN>" \
  --output "<PLUGIN_PATH>/languages/<TEXT_DOMAIN>.pot"
```

Then extract all strings as JSON so you can see them clearly:
```bash
node "${CLAUDE_SKILL_DIR}/scripts/extract-strings.js" "<PLUGIN_PATH>/languages/<TEXT_DOMAIN>.pot"
```

Report: PHP strings found, JS strings found, total unique strings.

---

## STEP 3 — YOU Translate → Write PO File Directly

For each language, YOU (the AI currently running) translate ALL strings and write the `.po` file using the Write tool.

### Translation rules:
- Keep `%s`, `%d`, `%1$s`, `%2$d` and all PHP format specifiers **exactly as-is**
- Keep HTML tags exactly as-is (e.g. `<a href="%s">`, `<strong>`, `<br/>`)
- Keep WordPress shortcodes as-is
- Translate only the human-readable text
- Use natural, idiomatic phrasing for the target language — not word-for-word
- For UI strings: use the standard vocabulary of that language's software ecosystem

### Strategy based on string count:

#### Under 400 strings → Write in ONE call
Read the POT, translate everything, write the complete `.po` file in a single Write tool call.

#### 400–800 strings → Write in TWO calls
1. **First call (Write):** Write the PO header + strings 1 to ~400
2. **Second call (Edit/append):** Append remaining strings to the file using Edit

#### Over 800 strings → Write in CHUNKS of ~300 strings
1. **Chunk 1 (Write):** Write PO header + first 300 translations
2. **Chunk 2 (Edit append):** Append next 300 translations
3. **Chunk N (Edit append):** Continue until ALL strings are written
4. After final chunk, verify total count matches POT string count

**IMPORTANT:** Use the Bash tool to append chunks:
```bash
cat >> "<PLUGIN_PATH>/languages/<TEXT_DOMAIN>-<LANG_CODE>.po" << 'APPEND_EOF'
#: path/to/file.php:123
msgid "Example String"
msgstr "অনুবাদিত স্ট্রিং"

APPEND_EOF
```

Or use the Edit tool to append by targeting the last line of the existing file.

### PO file format:

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
msgid "Save Changes"
msgstr "<translated text>"
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

**Process ALL strings. Do not skip any. Use chunked writing for large files.**

---

## STEP 4 — Compile PO → MO

```bash
node "${CLAUDE_SKILL_DIR}/scripts/compiler.js" \
  --dir "<PLUGIN_PATH>/languages" \
  --domain "<TEXT_DOMAIN>"
```

This compiles all `.po` files in one pass.

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

## Execution Rules

1. **NEVER ask for an API key** — the AI is the translator
2. **NEVER call translator.js** — that script is retired
3. **Never stop mid-pipeline** to ask "should I continue?"
4. **Translate ALL strings** — do not skip, truncate, or say "too many strings"
5. **For large files (800+ strings): use chunked writing** — Write first chunk, then append remaining chunks with Edit or Bash cat >>
6. **Always compile .mo** after all chunks are written for a language
7. **Never say "too many strings" or "file too large"** — use chunked strategy instead
8. If a Write tool call would exceed output limits, split into smaller chunks and append
9. Do all languages sequentially without pausing between them
10. After writing all chunks, verify the string count: `grep -c "^msgid " <file.po>` should match POT count

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
- `compiler.js` — compiles `.po` → `.mo` binary (no msgfmt needed)

`translator.js` — retired. The AI translates directly.

GitHub: https://github.com/Shahreyar46/wp-translate.git
