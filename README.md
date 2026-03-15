# wp-translate

> **Automatic WordPress plugin translation — works with Claude Code, Cursor, Copilot, ChatGPT, Gemini, Windsurf, and any AI. No API key needed when using AI.**

Scan your WordPress plugin for all translatable strings and generate production-ready `.pot`, `.po`, and `.mo` files — fully automated, in any language.

---

## Table of Contents

- [How It Works](#how-it-works)
- [No API Key Needed](#no-api-key-needed)
- [Quick Start](#quick-start)
- [Updating Existing Translations](#updating-existing-translations-new-strings)
- [Installation](#installation)
- [Usage](#usage)
  - [Claude Code](#claude-code-slash-command)
  - [Cursor / Windsurf](#cursor--windsurf)
  - [GitHub Copilot](#github-copilot)
  - [ChatGPT / Gemini (web)](#chatgpt--gemini-web)
  - [Gemini CLI](#gemini-cli)
  - [OpenAI Codex CLI](#openai-codex-cli)
  - [Kiro](#kiro)
  - [Antigravity AI](#antigravity-ai)
  - [Any Other AI CLI](#any-other-ai-cli)
  - [Standalone CLI (no AI)](#standalone-cli-no-ai-needed)
- [Supported Languages](#supported-languages)
- [Output Files](#output-files)
- [FAQ](#faq)

---

## How It Works

Given any WordPress plugin folder, this tool:

1. **Scans** all `.php` and `.js` files for WordPress translation functions:
   - PHP: `__()`, `_e()`, `_n()`, `_x()`, `_nx()`, `esc_html__()`, `esc_attr__()`, `esc_html_e()`, `esc_attr_e()`
   - JS: `__()`, `_n()`, `_x()`, `wp.i18n.__()`
2. **Generates** a `.pot` master template file
3. **Translates** all strings — using the AI you're already chatting with (no extra API key), or optionally via DeepL/Google/Azure if you prefer
4. **Writes** `.po` files (human-readable translation files)
5. **Compiles** `.mo` files (binary files WordPress reads at runtime)

> No PHP required. No system `msgfmt` required. Pure Node.js — works on Windows, macOS, Linux.

---

## No API Key Needed

**When you use this skill through any AI assistant, the AI itself is the translator.**

| You are using | Who translates | API key needed? |
|---|---|---|
| Claude Code | Claude | ❌ No |
| Cursor (with Claude) | Claude | ❌ No |
| Cursor (with GPT-4) | GPT-4 | ❌ No |
| GitHub Copilot | Copilot | ❌ No |
| ChatGPT | ChatGPT | ❌ No |
| Gemini | Gemini | ❌ No |
| Windsurf | Windsurf AI | ❌ No |
| Kiro | Kiro AI | ❌ No |
| Antigravity AI | Antigravity AI | ❌ No |
| Any other AI | That AI | ❌ No |
| **Standalone CLI (no AI)** | DeepL / Google / Azure / OpenAI | ✅ Yes (one key) |

The AI reads the `.pot` file, translates every string using its built-in multilingual knowledge, and writes the `.po` file directly. No external translation service is called. No API key is passed. No extra billing.

---

## Quick Start

### Using any AI assistant (recommended — no API key)

**Claude Code:**
```
/wp-translate ./wp-content/plugins/my-plugin fr_FR,de_DE,bn_BD
```

**Cursor / Copilot / ChatGPT / any AI — just say:**
```
Translate my WordPress plugin at ./wp-content/plugins/my-plugin to French, German, and Bangla.
Generate .pot, .po, and .mo files.
```

That's it. The AI runs the scanner, translates all strings itself, and compiles the files.

### Standalone CLI (no AI — requires one API key)

```bash
# 1. Scan → POT
node scripts/scanner.js --plugin ./my-plugin --domain my-plugin

# 2. Translate → PO  (requires one provider API key)
node scripts/translator.js --pot ./my-plugin/languages/my-plugin.pot --lang fr_FR --provider deepl --api-key YOUR_KEY

# 3. Compile → MO
node scripts/compiler.js --dir ./my-plugin/languages --domain my-plugin
```

---

## Updating Existing Translations (New Strings)

When you **add new strings** to your plugin code after you've already translated it, you don't need to re-translate everything from scratch. The skill automatically detects existing `.po` files and runs in **update mode** — preserving all existing translations and only translating the new ones.

### How it works automatically

Just run `/wp-translate` again on the same plugin. The skill will:

1. **Detect** that `.po` files already exist → switch to **update mode**
2. **Re-scan** your plugin code → generate a fresh `.pot` with all current strings
3. **Merge** the new `.pot` into each existing `.po` file using `merger.js`:
   - ✅ All existing `msgstr` translations are kept **untouched**
   - ✅ New strings are added with **empty `msgstr`** (ready to translate)
   - ✅ Strings removed from code are **dropped** from the `.po`
   - ✅ File references (`#:`) are **updated** to current line numbers
4. **Translate only the new/empty strings** — not the whole file
5. **Recompile** all `.po` → `.mo`

### Claude Code (automatic)

```
/wp-translate ./wp-content/plugins/my-plugin
```

Claude detects update mode, merges, translates only new strings. Done.

### Cursor / Copilot / any AI (natural language)

```
I added some new strings to my plugin. Update my existing translations without
losing any existing work. Plugin is at ./wp-content/plugins/my-plugin
```

### Standalone CLI (no AI)

```bash
# Step 1: Re-scan plugin → fresh .pot
node scripts/scanner.js --plugin ./my-plugin --domain my-plugin

# Step 2: Merge new .pot into all existing .po files (preserves existing translations)
node scripts/merger.js \
  --pot ./my-plugin/languages/my-plugin.pot \
  --dir ./my-plugin/languages \
  --domain my-plugin \
  --obsolete remove

# The merger prints a JSON report showing exactly which strings were added per .po file.
# Now manually translate the new empty strings in each .po file, then:

# Step 3: Recompile .mo files
node scripts/compiler.js --dir ./my-plugin/languages --domain my-plugin
```

### merger.js options

| Option | Values | Default | Description |
|---|---|---|---|
| `--pot` | path | required | The new `.pot` file to merge from |
| `--po` | path | — | Merge into a single `.po` file |
| `--dir` | path | — | Merge into all `.po` files in a directory |
| `--domain` | string | — | Only process files starting with this domain |
| `--obsolete` | `remove` / `comment` / `keep` | `remove` | What to do with strings no longer in code |

**`--obsolete` modes:**
- `remove` — deleted from `.po` entirely (recommended — keeps files clean)
- `comment` — prefixed with `#~` (standard gettext obsolete marker — recoverable)
- `keep` — kept as normal entries (not recommended)

### What the merger report looks like

After running `merger.js`, the JSON output tells you exactly what changed:

```json
{
  "pot_strings": 85,
  "files_merged": 3,
  "total_added": 4,
  "total_removed": 1,
  "results": [
    {
      "file": "my-plugin-fr_FR.po",
      "added": 4,
      "removed": 1,
      "updatedRefs": 2,
      "addedStrings": ["New setting label", "Reset button", "Save changes", "Cancel"]
    },
    {
      "file": "my-plugin-de_DE.po",
      "added": 4,
      "removed": 1,
      "updatedRefs": 2,
      "addedStrings": ["New setting label", "Reset button", "Save changes", "Cancel"]
    }
  ]
}
```

`total_added: 0` means all `.po` files are already up to date — only recompile `.mo`.

---

## Installation

### For Claude Code users

**One-liner (macOS / Linux):**
```bash
curl -fsSL https://raw.githubusercontent.com/Shahreyar46/wp-translate/main/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/Shahreyar46/wp-translate/main/install.bat -OutFile install.bat; .\install.bat
```

**Manual:**
```bash
# macOS / Linux
git clone https://github.com/Shahreyar46/wp-translate.git ~/.claude/skills/wp-translate
node ~/.claude/skills/wp-translate/scripts/setup.js --install

# Windows
git clone https://github.com/Shahreyar46/wp-translate.git "%USERPROFILE%\.claude\skills\wp-translate"
node "%USERPROFILE%\.claude\skills\wp-translate\scripts\setup.js" --install
```

Restart Claude Code → type `/wp-translate` in any project.

### Update to latest

```bash
curl -fsSL https://raw.githubusercontent.com/Shahreyar46/wp-translate/main/install.sh | bash
```
The installer detects an existing install and runs `git pull` automatically.

> **Auto-deploy:** The installer automatically detects other AI tools on your system (Gemini CLI, Codex CLI, Cursor, Antigravity AI, Cagent, Kiro) and deploys the skill to each one — no manual steps needed.

### Universal Manual Install for All AI Editors

If you are using an AI assistant (Cursor, Windsurf, Copilot, Gemini CLI, Claude Code, etc.) and want to set it up manually without using the installer, follow these universal steps:

1. **Find your AI tool's data/configuration directory** (usually in your user home folder):
   - **Gemini CLI / Antigravity**: `~/.gemini/antigravity/`
   - **Claude Code / Kiro**: `~/.claude/`
   - **Codex CLI**: `~/.codex/`
   - **Other tools**: Check your tool's documentation for where it stores "skills" or "instructions".

2. **Create a `skills` folder** inside that directory if it doesn't already exist.
   
3. **Git clone** this repository inside that `skills` folder:
   ```bash
   # Example for Gemini / Antigravity
   cd ~/.gemini/antigravity/skills
   git clone https://github.com/Shahreyar46/wp-translate.git
   
   # Example for Claude Code
   cd ~/.claude/skills
   git clone https://github.com/Shahreyar46/wp-translate.git
   ```

4. **Install dependencies**:
   ```bash
   cd wp-translate
   node scripts/setup.js --install
   ```

The AI will now detect `SKILL.md` inside that folder and automatically gain the ability to use the `/wp-translate` command or follow the translation pipeline in natural language.

---

### For Cursor / Windsurf / Copilot / ChatGPT (Project-Specific)

If you prefer to keep the tool within your specific project instead of globally:

Copy the `scripts/` folder into your project (or tell your AI to clone the repo):

```bash
git clone https://github.com/Shahreyar46/wp-translate.git
cp -r wp-translate/scripts ./scripts
node scripts/setup.js --install
```

Then just tell your AI what you want (see usage below).

---

## Usage

### Claude Code (slash command)

**Shortest possible — Claude detects the open plugin automatically:**
```
/wp-translate
```

**With plugin path + one language:**
```
/wp-translate ./wp-content/plugins/my-plugin bn_BD
```

**With plugin path + multiple languages:**
```
/wp-translate ./wp-content/plugins/my-plugin fr_FR,de_DE,bn_BD,ar
```

**Natural language — all of these work too:**
```
Translate my plugin to Bangla
```
```
Translate the plugin at ./wp-content/plugins/my-plugin to French and German
```
```
Localize my plugin for Arabic, Hindi, and Turkish
```
```
Make translation files for my-plugin in Bangla, Urdu, and Hindi
```
```
Generate .pot .po .mo files for my plugin in 5 languages: French, German, Spanish, Arabic, Bangla
```
```
translate to bangla
```
*(Claude sees the currently open file, detects the plugin path automatically)*

No API key prompt. Claude scans, translates all strings itself, and compiles — fully automatic.

---

### Cursor / Windsurf

After cloning `scripts/` into your project, use natural language in the AI chat:

```
Use the scripts in ./scripts/ to translate my plugin at ./wp-content/plugins/my-plugin
into French, German, and Spanish. Generate .pot, .po, and .mo files.
```

The AI will:
1. Run `node scripts/scanner.js` to extract strings → `.pot`
2. Read the `.pot` file and translate all strings itself → write `.po` files
3. Run `node scripts/compiler.js` to compile `.mo` files

No API key needed — Cursor's AI (Claude or GPT) does the translation.

---

### GitHub Copilot

In Copilot Chat (VSCode or JetBrains), say:

```
@workspace Translate my WordPress plugin at ./wp-content/plugins/my-plugin
to French and German. Use the scripts in ./scripts/ to scan and compile,
then translate the strings yourself and write the .po files.
```

---

### ChatGPT / Gemini (web)

If your AI has file system access or terminal access:

```
Clone https://github.com/Shahreyar46/wp-translate into ./wp-translate-tool
Run: node ./wp-translate-tool/scripts/setup.js --install
Then:
1. node ./wp-translate-tool/scripts/scanner.js --plugin ./my-plugin --domain my-plugin
2. Read the .pot file, translate all strings to French and German yourself, write the .po files
3. node ./wp-translate-tool/scripts/compiler.js --dir ./my-plugin/languages --domain my-plugin
```

---

### Gemini CLI

Install Gemini CLI first: [Google Gemini CLI](https://github.com/google-gemini/gemini-cli)

The installer auto-deploys the full skill folder (SKILL.md + scripts/) to `~/.gemini/antigravity/skills/wp-translate/`. No manual setup needed after running the installer.

**Manual install:**
```bash
# macOS / Linux
cp -r ~/.claude/skills/wp-translate ~/.gemini/antigravity/skills/wp-translate

# Windows (PowerShell)
xcopy /e /i "$env:USERPROFILE\.claude\skills\wp-translate" `
            "$env:USERPROFILE\.gemini\antigravity\skills\wp-translate"
```

**Then just type in terminal:**
```bash
cd ./wp-content/plugins/my-plugin
gemini "translate to bangla"
gemini "Translate this plugin to French, German, Arabic"
gemini "Translate my plugin to French, German, Bangla"
```

No API key — Gemini uses your Google account.

---

### OpenAI Codex CLI

Install Codex CLI first: [OpenAI Codex CLI](https://github.com/openai/codex)

The installer auto-deploys the full skill folder to `~/.codex/skills/wp-translate/`. No manual setup needed after running the installer.

**Manual install:**
```bash
# macOS / Linux
cp -r ~/.claude/skills/wp-translate ~/.codex/skills/wp-translate

# Windows (PowerShell)
xcopy /e /i "$env:USERPROFILE\.claude\skills\wp-translate" `
            "$env:USERPROFILE\.codex\skills\wp-translate"
```

**Then just type:**
```bash
cd ./wp-content/plugins/my-plugin
codex "translate to bangla"
codex "Translate this plugin to French, German, Arabic"
```

No API key — Codex uses your OpenAI account.

---

### Kiro

Kiro uses the same `skills/` folder as Claude Code. The installer auto-deploys the full skill folder there. Manual install:

```bash
# macOS / Linux
cp -r ~/.claude/skills/wp-translate ~/.kiro/skills/wp-translate

# Windows (PowerShell)
xcopy /e /i "$env:USERPROFILE\.claude\skills\wp-translate" `
            "$env:USERPROFILE\.kiro\skills\wp-translate"
```

Then just say in Kiro chat:
```
translate to bangla
Translate my plugin at ./wp-content/plugins/my-plugin to French, German, Arabic
```

No API key — Kiro's AI translates directly.

---

### Antigravity AI

Antigravity AI uses the same `skills/` folder pattern. The installer auto-deploys the full skill folder there. Manual install:

```bash
# macOS / Linux
cp -r ~/.claude/skills/wp-translate ~/.antigravity/skills/wp-translate

# Windows (PowerShell)
xcopy /e /i "$env:USERPROFILE\.claude\skills\wp-translate" `
            "$env:USERPROFILE\.antigravity\skills\wp-translate"
```

Then just say in Antigravity chat:
```
translate to bangla
Translate my plugin at ./wp-content/plugins/my-plugin to French, German, Arabic
```

No API key — Antigravity's AI translates directly.

---

### Any Other AI CLI

The pattern is the same for any AI CLI tool that supports a system prompt or instructions file:

1. Find where your AI CLI stores its system prompt / instructions
2. Copy the contents of `~/.claude/skills/wp-translate/SKILL.md` there
3. Then just ask in plain English — the AI does everything automatically

---

### Standalone CLI (no AI needed)

Requires one API key from a translation provider of your choice.

```bash
# 1. Scan
node scripts/scanner.js --plugin ./my-plugin --domain my-plugin --output ./my-plugin/languages/my-plugin.pot

# 2. Translate (choose one provider)
node scripts/translator.js \
  --pot ./my-plugin/languages/my-plugin.pot \
  --lang fr_FR \
  --provider deepl \          # or: google, azure, openai, claude, libre
  --api-key YOUR_KEY \
  --output ./my-plugin/languages/my-plugin-fr_FR.po

# 3. Compile
node scripts/compiler.js --dir ./my-plugin/languages --domain my-plugin
```

**Available providers for standalone CLI:**

| Provider | Free Tier | Get Key |
|---|---|---|
| DeepL | 500K chars/month | [deepl.com/pro-api](https://www.deepl.com/pro-api) |
| Azure Translator | 2M chars/month | [Azure Portal](https://portal.azure.com) |
| Google Translate | 500K chars/month | [Google Cloud Console](https://console.cloud.google.com) |
| OpenAI | No free tier | [platform.openai.com](https://platform.openai.com) |
| Claude (Anthropic) | No free tier | [console.anthropic.com](https://console.anthropic.com) |
| LibreTranslate | Self-hosted = free | [libretranslate.com](https://libretranslate.com) |

**Set as environment variable to avoid passing on command line:**
```bash
export DEEPL_API_KEY=your_key
export GOOGLE_TRANSLATE_KEY=your_key
export AZURE_TRANSLATOR_KEY=your_key
export OPENAI_API_KEY=your_key
export ANTHROPIC_API_KEY=your_key
```

---

## Supported Languages

All standard WordPress locale codes are supported. Common examples:

| Code | Language | Code | Language |
|------|----------|------|----------|
| `fr_FR` | French | `ar` | Arabic |
| `de_DE` | German | `he_IL` | Hebrew |
| `es_ES` | Spanish | `fa_IR` | Farsi/Persian |
| `it_IT` | Italian | `hi_IN` | Hindi |
| `pt_BR` | Portuguese (Brazil) | `ja` | Japanese |
| `pt_PT` | Portuguese (Portugal) | `zh_CN` | Chinese (Simplified) |
| `nl_NL` | Dutch | `zh_TW` | Chinese (Traditional) |
| `pl_PL` | Polish | `ko_KR` | Korean |
| `ru_RU` | Russian | `tr_TR` | Turkish |
| `sv_SE` | Swedish | `th` | Thai |
| `da_DK` | Danish | `vi` | Vietnamese |
| `fi` | Finnish | `id_ID` | Indonesian |
| `nb_NO` | Norwegian | `ms_MY` | Malay |
| `cs_CZ` | Czech | `uk` | Ukrainian |
| `sk_SK` | Slovak | `ro_RO` | Romanian |
| `hu_HU` | Hungarian | `bg_BG` | Bulgarian |
| `el` | Greek | `hr` | Croatian |
| `bn_BD` | Bengali/Bangla | `ur` | Urdu |

Full list: [WordPress locale codes](https://make.wordpress.org/polyglots/teams/)

---

## Output Files

After running the full pipeline, your plugin's `languages/` folder will contain:

```
my-plugin/
└── languages/
    ├── my-plugin.pot              ← Master template (source of truth)
    ├── my-plugin-fr_FR.po         ← French (human-readable)
    ├── my-plugin-fr_FR.mo         ← French (binary — WordPress reads this)
    ├── my-plugin-de_DE.po
    ├── my-plugin-de_DE.mo
    ├── my-plugin-bn_BD.po
    ├── my-plugin-bn_BD.mo
    └── ...
```

**Load translations in your plugin (add once to main PHP file):**
```php
add_action( 'init', function() {
    load_plugin_textdomain(
        'my-plugin',
        false,
        dirname( plugin_basename( __FILE__ ) ) . '/languages/'
    );
});
```

---

## How It Works (pipeline)

```
┌─────────────────────────────────────────────────────────┐
│                  Your WordPress Plugin                   │
│  *.php: __('Hello'), _e('Save'), esc_html__('Error')    │
│  *.js:  __('Submit'), wp.i18n.__('Cancel')              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
              [ scanner.js ]
         Extracts all strings → .pot
                     │
                     ▼
              [ .pot file ]
           (master template)
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   [ AI reads POT and translates directly ]
    fr_FR          de_DE        bn_BD
   (no API)       (no API)     (no API)
        │            │            │
        ▼            ▼            ▼
    fr_FR.po    de_DE.po    bn_BD.po
        │            │            │
        └────────────┼────────────┘
                     ▼
              [ compiler.js ]
           Compiles all .po → .mo
                     │
                     ▼
    fr_FR.mo    de_DE.mo    bn_BD.mo
   (WordPress reads these at runtime)
```

### Placeholder Protection

The AI is instructed to preserve all WordPress format specifiers:

| Before translation | After translation | Safe? |
|---|---|---|
| `Hello %s!` | `হ্যালো %s!` | ✓ |
| `%d items found` | `%d টি আইটেম পাওয়া গেছে` | ✓ |
| `Hello <strong>%1$s</strong>` | `হ্যালো <strong>%1$s</strong>` | ✓ |
| `<a href="%s">Click here</a>` | `<a href="%s">এখানে ক্লিক করুন</a>` | ✓ |

---

## FAQ

**Q: Do I need an API key to use this?**
A: Not when using any AI assistant (Claude Code, Cursor, Copilot, ChatGPT, Gemini, etc.). The AI translates directly. An API key is only needed for the standalone CLI mode (no AI).

**Q: Does this require PHP or WP-CLI?**
A: No. Pure Node.js — no PHP, no WP-CLI, no system gettext needed.

**Q: Does it require a running WordPress site?**
A: No. It scans your plugin source files directly.

**Q: Can I use it on multiple plugins?**
A: Yes — run it once per plugin, pointing to each plugin's folder.

**Q: What if a string fails to translate?**
A: It's left blank and the rest continue. You can fill it in manually in the `.po` file.

**Q: Do I need to re-run when I add new strings?**
A: Yes — just run `/wp-translate` again (or run `scanner.js` + `merger.js` manually). The skill automatically detects existing `.po` files and runs in update mode — only the new strings are translated. Existing translations are preserved.

**Q: Will it overwrite my existing translations?**
A: No — when `.po` files already exist, the skill runs in **update mode**. It merges the new `.pot` into your existing `.po` files using `merger.js`, keeping all existing `msgstr` values untouched and only adding empty entries for new strings.

**Q: Does it handle RTL languages (Arabic, Hebrew, Urdu, Farsi)?**
A: Yes — the translated text is correct. WordPress handles RTL direction automatically via the locale setting.

**Q: Which AI gives the best translation quality?**
A: All modern AI assistants (Claude, GPT-4, Gemini) give excellent quality for UI strings. They handle context, placeholders, and idiomatic phrasing better than traditional translation APIs for short strings.

---

## Author

**MD. AL-Shahreyar**
GitHub: [github.com/Shahreyar46](https://github.com/Shahreyar46)

---

## License

MIT — free for personal and commercial use.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add improvements, report issues, or integrate with new AI platforms.
