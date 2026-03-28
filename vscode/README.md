# CoreMem VS Code Extension

This extension lets users browse mems from CoreMem and insert them directly into the editor.

## Current scope

- Connects directly to CoreMem's authenticated backend
- Authenticates with a normal CoreMem account via email/username and password
- Requires the authenticated account to be on the Pro plan before mem access is enabled
- Shows mems in a sidebar
- Supports search by mem name
- Inserts, copies, or opens a mem from the sidebar or command palette

## Dev workflow

1. Run `npm install` inside `extensions/vscode`.
2. Run `npm run compile` once, or `npm run watch` while developing.
3. Open `extensions/vscode` as the workspace in VS Code.
4. Press `F5` to launch an Extension Development Host.
5. Run `CoreMem: Sign In`, then open the `CoreMem` activity bar icon.

The workspace includes `.vscode/launch.json` and `.vscode/tasks.json` for the standard extension-host loop.

## Commands

- `CoreMem: Sign In`
- `CoreMem: Sign Out`
- `CoreMem: Search Mems`
- `CoreMem: Insert Mem`
- `CoreMem: Copy Mem`
- `CoreMem: Open Mem`
- `CoreMem: Refresh Mems`

## Next steps

- Add Google OAuth and password-reset flows
- Add richer search and content previews
- Add chat-context actions for editors that expose AI chat surfaces
- Publish to VS Marketplace and Open VSX
