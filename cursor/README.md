# CoreMem for Cursor

Browse, search, and insert your CoreMem mems directly from a sidebar panel in [Cursor](https://cursor.com). CoreMem appears as an icon in the activity bar — click it to search your mems and insert them into any file or AI chat.

## Requirements

- Cursor (any recent version)
- A CoreMem account ([coremem.app](https://coremem.app))
- Pro plan

## Installation

CoreMem uses the VS Code extension format (`.vsix`), which Cursor supports natively.

1. Download the latest `coremem-vscode-*.vsix` from the [`vscode/`](../vscode) folder or from the [releases page](https://github.com/corememapp/extensions/releases)
2. Open Cursor and go to **Extensions** (`⇧⌘X`)
3. Click **···** (top-right of the Extensions panel) → **Install from VSIX…**
4. Select the downloaded `.vsix` file
5. Reload Cursor when prompted
6. Click the CoreMem icon in the activity bar and sign in

## Usage

- **Browse mems** — the sidebar lists all your mems, sorted by last updated
- **Search** — use the search bar at the top of the panel to filter by name or content
- **Insert** — click a mem to copy its content to the clipboard, or use the inline insert button to paste it at your cursor position
- **Commands** — open the command palette (`⌘⇧P`) and type `CoreMem` to see all available commands

## Notes

This extension shares its codebase with the VS Code extension in [`../vscode`](../vscode). If you are developing or building the extension, work from that folder — the compiled `.vsix` works for both editors.

## Support

Open an issue in this repository or email [hello@coremem.app](mailto:hello@coremem.app).
