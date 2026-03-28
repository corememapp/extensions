# CoreMem Extensions

This repository contains browser and editor extensions for [CoreMem](https://coremem.app) — a context management platform that lets you write, version, and share context with AI tools and agents.

## Extensions

| Folder | Platform | Status | Plan |
|--------|----------|--------|------|
| [`vscode/`](./vscode) | VS Code | Beta | Pro |
| [`cursor/`](./cursor) | Cursor | Beta | Pro |
| [`chrome/`](./chrome) | Chrome | Beta | Free + Pro |

---

### VS Code (`vscode/`)

A native VS Code extension that adds a CoreMem sidebar panel to your editor. Browse, search, and insert mems directly into any file or AI chat (Copilot Chat, GitHub Copilot, etc.).

**Install:** See [`vscode/README.md`](./vscode/README.md)

---

### Cursor (`cursor/`)

CoreMem for Cursor. Uses the same VS Code extension package — Cursor supports the VS Code extension API natively, so the `.vsix` installs and runs identically.

**Install:** See [`cursor/README.md`](./cursor/README.md)

---

### Chrome (`chrome/`)

A Chrome extension that lets you browse and paste your mems directly into any AI chat interface (ChatGPT, Claude, Gemini, etc.) without leaving the browser.

**Install:** See [`chrome/README.md`](./chrome/README.md) or install from the Chrome Web Store.

---

## Contributing

Each extension lives in its own folder with its own dependencies and build process. See the individual README files for setup instructions.

To report a bug or request a feature, open an issue in this repository or email [hello@coremem.app](mailto:hello@coremem.app).

## License

See individual extension folders for license details.
