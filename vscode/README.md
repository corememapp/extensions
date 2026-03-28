# CoreMem for VS Code

Browse, search, and insert your [CoreMem](https://coremem.app) mems directly from a sidebar panel in VS Code. CoreMem appears as an icon in the activity bar — click it to find your mems and insert them into any file or AI chat (Copilot Chat, GitHub Copilot, etc.).

> Also works in **Cursor**. See [`../cursor/README.md`](../cursor/README.md) for Cursor-specific install instructions.

## Requirements

- VS Code 1.90 or later
- A CoreMem account ([coremem.app](https://coremem.app))
- Pro plan

## Installation

1. Download the latest `coremem-vscode-*.vsix` from the [releases page](https://github.com/corememapp/extensions/releases)
2. Open VS Code and go to **Extensions** (`⇧⌘X`)
3. Click **···** (top-right of the Extensions panel) → **Install from VSIX…**
4. Select the downloaded `.vsix` file
5. Reload VS Code when prompted
6. Click the CoreMem icon in the activity bar and sign in

## Usage

- **Browse mems** — the sidebar lists all your mems, sorted by last updated
- **Search** — use the search bar at the top of the panel to filter by name
- **Insert** — click a mem to insert its content at your cursor position
- **Copy** — use the copy button to copy a mem's content to the clipboard
- **Commands** — open the command palette (`⌘⇧P`) and type `CoreMem` to see all available commands

### Commands

| Command | Description |
|---------|-------------|
| `CoreMem: Sign In` | Sign in to your CoreMem account |
| `CoreMem: Sign Out` | Sign out |
| `CoreMem: Search Mems` | Open the mem search picker |
| `CoreMem: Insert Mem` | Insert a mem at the current cursor position |
| `CoreMem: Copy Mem` | Copy a mem's content to the clipboard |

## Development

### Setup

```bash
cd extensions/vscode
npm install
npm run watch   # or npm run compile for a one-off build
```

### Running locally

1. Open the `extensions/vscode` folder as a workspace in VS Code
2. Press `F5` to launch an Extension Development Host
3. In the host window, run `CoreMem: Sign In` and open the CoreMem activity bar icon

The workspace includes `.vscode/launch.json` and `.vscode/tasks.json` for the standard extension-host debug loop.

### Building a VSIX

```bash
npm run package
```

This compiles the TypeScript and produces a `.vsix` file in the current directory.

## Support

Open an issue in this repository or email [hello@coremem.app](mailto:hello@coremem.app).
