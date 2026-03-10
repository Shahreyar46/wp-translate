# Contributing to wp-auto-i18n

Thank you for your interest in improving this tool! This guide covers how to integrate with different AI platforms and how to extend the toolkit.

---

## Using with Different AI Platforms

### Claude Code (Native)
This repo ships as a Claude Code skill. Install per the README, then use `/wp-translate` anywhere.

### Cursor IDE
1. Copy the `scripts/` folder to your project root
2. Open Cursor and describe what you want:
   > "Translate the plugin at ./wp-content/plugins/my-plugin into French and German using scripts/translator.js with my DeepL key: xxxx"
3. Cursor will execute the Node.js scripts via its terminal tool

### GitHub Copilot (VS Code)
1. Copy `scripts/` to your project
2. Open the Copilot Chat panel (`Ctrl+Shift+I`)
3. Switch to **Agent mode** (click the agent icon)
4. Type:
   > "@workspace run the wp-auto-i18n scanner on my plugin, translate to French with DeepL, and compile MO files"
5. Approve the terminal commands when prompted

### Windsurf (Codeium)
Same as Cursor — copy `scripts/` to project, use Cascade chat to instruct it.

### ChatGPT (with Code Interpreter / computer use)
Upload the `scripts/` folder or paste the script content, then:
> "Run scanner.js on my plugin folder (attached), translate the output to French using the DeepL API, write the .po file, then compile the .mo."

### Gemini (Google AI Studio with extensions)
1. Use Google AI Studio with the Code Execution extension
2. Upload your scripts
3. Prompt: "Use scanner.js to extract strings from this plugin code, translate to Spanish"

### Devin / SWE-agent / OpenHands
These autonomous agents can run shell commands. Just give the full instruction:
```
Clone https://github.com/Shahreyar46/wp-auto-i18n,
run node scripts/setup.js --install,
then translate ./my-plugin to fr_FR,de_DE using deepl with key=xxxx
```

### Any MCP-compatible AI (Model Context Protocol)
This tool can be wrapped as an MCP server. See `mcp/` folder (coming soon) for a ready-made MCP server that exposes these tools as MCP actions.

---

## Adding a New Translation Provider

1. Open `scripts/translator.js`
2. Add your provider to the `translateBatch` switch:
```js
case 'myprovider': return translateMyProvider(texts, targetLang);
```
3. Implement the function:
```js
async function translateMyProvider(texts, targetLang) {
  // texts: string[] — array of strings to translate
  // targetLang: string — target language code (provider-specific format)
  // return: string[] — translated strings in same order

  const results = [];
  for (const text of texts) {
    const translated = await callMyProviderAPI(text, targetLang, apiKey);
    results.push(translated);
  }
  return results;
}
```
4. Add your language code mapping in the `LANG_MAP` object
5. Update `README.md` provider table
6. Submit a PR

### Provider function contract
- Input: `texts: string[]`, `targetLang: string`
- Output: `Promise<string[]>` — same length as input, same order
- On failure: throw an Error with a descriptive message
- Placeholders (`%s`, `%d`, HTML tags) are already protected before your function is called

---

## Adding New PHP/JS Function Detection

To add support for additional translation functions:

**PHP** — edit `scripts/scanner.js`, `PHP_FUNCTIONS` array:
```js
const PHP_FUNCTIONS = [
  '__', '_e', '_x', ...
  'my_custom_translate_fn',  // add here
];
```

**JS** — edit the `fnPattern` regex in `extractJsStrings()`:
```js
const fnPattern = /(?:wp\.i18n\.)?(__|\b_n\b|\b_x\b|\b_nx\b|\bmyJsFn\b)\s*\(/g;
```

---

## Project Structure

```
wp-auto-i18n/
├── SKILL.md              Claude Code skill definition
├── README.md             Public documentation (this is what GitHub shows)
├── CONTRIBUTING.md       This file
├── .env.example          Example environment variables
├── package.json          npm package definition
├── .gitignore
├── scripts/
│   ├── setup.js          Dependency installer
│   ├── scanner.js        PHP + JS string extractor → .pot
│   ├── translator.js     Multi-provider auto-translator → .po
│   └── compiler.js       PO → MO compiler (no msgfmt needed)
└── .github/
    └── workflows/
        └── test.yml      CI: basic smoke test
```

---

## Roadmap

- [ ] `--merge` flag: merge new strings into existing `.po` without overwriting manual translations
- [ ] Glossary support (DeepL Pro, Google v3)
- [ ] MCP server wrapper for universal AI tool use
- [ ] `--watch` mode: auto-regenerate when plugin files change
- [ ] Web UI dashboard
- [ ] WordPress plugin that runs this from the admin panel

PRs welcome for any of these!
