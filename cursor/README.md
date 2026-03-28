# CoreMem for Cursor

Browse, search, and insert your [CoreMem](https://coremem.app) mems directly from a sidebar panel in [Cursor](https://cursor.com). CoreMem appears as an icon in the activity bar — click it to find your mems and insert them into any file or AI chat.

## Requirements

- Cursor (any recent version)
- A CoreMem account ([coremem.app](https://coremem.app))
- Pro plan

## Installation

### Option 1 — Cursor chat (recommended)

Type the following in any Cursor chat session:

```
/add-plugin coremem
```

Cursor will open the plugin picker. Select CoreMem and follow the prompts to sign in.

### Option 2 — Extensions UI

1. Open **View → Extensions** or press `⌘⇧X` (Mac) / `Ctrl+Shift+X` (Windows/Linux)
2. Search for **CoreMem**
3. Click **Install**

### Option 3 — Install from VSIX

1. Download the latest `coremem-vscode-*.vsix` from the [releases page](https://github.com/corememapp/extensions/releases)
2. Open **View → Extensions**
3. Click **···** (top-right of the Extensions panel) → **Install from VSIX…**
4. Select the downloaded `.vsix` file and sign in when prompted

### Option 4 — Command line

```bash
cursor --install-extension coremem.coremem
```

## Usage

- **Browse mems** — the sidebar lists all your mems, sorted by last updated
- **Search** — use the search bar at the top of the panel to filter by name
- **Insert** — click a mem to insert its content at your cursor position
- **Copy** — use the copy button to copy a mem's content to the clipboard
- **Commands** — open the command palette (`⌘⇧P`) and type `CoreMem` to see all available commands

## Notes

The VSIX package is shared with the VS Code extension in [`../vscode`](../vscode). If you are developing or building the extension, work from that folder.

## Support

Open an issue in this repository or email [hello@coremem.app](mailto:hello@coremem.app).
