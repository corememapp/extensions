import * as vscode from "vscode";
import { CoreMemClient, MemListItem } from "./corememClient";

interface SidebarCommandHandlers {
  insert: (id: string) => Promise<void>;
  copy: (id: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  openCreateMem: (url: string) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface SidebarState {
  mems: MemListItem[];
  error: string;
  loading: boolean;
  query: string;
  authenticated: boolean;
  createMemUrl: string | null;
  profileUsername: string | null;
}

export class CoreMemSidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private state: SidebarState = {
    mems: [],
    error: "",
    loading: false,
    query: "",
    authenticated: false,
    createMemUrl: null,
    profileUsername: null,
  };

  constructor(
    private readonly client: CoreMemClient,
    private readonly commandHandlers: SidebarCommandHandlers
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(async (message: { type: string; id?: string; query?: string; url?: string }) => {
      switch (message.type) {
        case "ready":
          await this.refresh();
          break;
        case "search":
          this.state.query = String(message.query || "");
          this.render();
          break;
        case "insert":
          if (message.id) await this.commandHandlers.insert(message.id);
          break;
        case "copy":
          if (message.id) await this.commandHandlers.copy(message.id);
          break;
        case "openExternal":
          if (message.url) await this.commandHandlers.openExternal(message.url);
          break;
        case "openCreateMem":
          if (message.url) await this.commandHandlers.openCreateMem(message.url);
          break;
        case "signIn":
          await this.commandHandlers.signIn();
          break;
        case "signOut":
          await this.commandHandlers.signOut();
          break;
        case "refresh":
          await this.refresh(true);
          break;
        default:
          break;
      }
    });
  }

  async refresh(force = false): Promise<void> {
    if (!this.view) {
      return;
    }

    this.state.authenticated = await this.client.isAuthenticated();
    if (!this.state.authenticated) {
      this.state = {
        ...this.state,
        mems: [],
        loading: false,
        error: "Sign in to CoreMem to browse your mems.",
        createMemUrl: null,
        profileUsername: null,
      };
      this.render();
      return;
    }

    if (this.state.loading && !force) {
      return;
    }

    this.state = { ...this.state, loading: true, error: "" };
    this.render();

    try {
      const profile = await this.client.getCurrentProfile();
      const mems = await this.client.listMems();
      this.state = {
        ...this.state,
        mems,
        loading: false,
        error: "",
        authenticated: true,
        createMemUrl: profile.username ? this.client.getCreateMemUrl(profile.username) : null,
        profileUsername: profile.username ?? null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load mems.";
      const unauthenticated = message === "unauthenticated";
      const proRequired = message === "pro_required";
      this.state = {
        ...this.state,
        mems: [],
        loading: false,
        error: unauthenticated
          ? "Your CoreMem session expired. Sign in again."
          : proRequired
            ? "CoreMem IDE access requires a Pro account."
            : message,
        authenticated: !unauthenticated && !proRequired,
        createMemUrl: null,
        profileUsername: null,
      };
    }

    this.render();
  }

  private render(): void {
    if (!this.view) {
      return;
    }

    const normalizedQuery = this.state.query.trim().toLowerCase();
    const filteredMems = this.state.mems.filter((mem) => {
      if (!normalizedQuery) {
        return true;
      }
      return String(mem.name || "").toLowerCase().includes(normalizedQuery);
    });

    this.view.webview.postMessage({
      type: "state",
      payload: {
        ...this.state,
        mems: filteredMems,
      },
    });
  }

  private getHtml(): string {
    const nonce = String(Date.now());
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <style>
      :root { color-scheme: light dark; }
      body {
        font-family: var(--vscode-font-family);
        margin: 0;
        padding: 12px;
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
      }
      .stack { display: flex; flex-direction: column; gap: 10px; }
      .stack { min-height: calc(100vh - 24px); }
      .toolbar { display: flex; gap: 8px; align-items: center; }
      .toolbar-main { display: flex; gap: 8px; align-items: center; flex: 1; }
      .search {
        width: 100%;
        flex: 1;
        box-sizing: border-box;
        border: 1px solid var(--vscode-input-border, transparent);
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border-radius: 6px;
        padding: 8px 10px;
      }
      .toolbar-icon {
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }
      .button {
        border: 1px solid var(--vscode-button-border, transparent);
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border-radius: 6px;
        padding: 7px 10px;
        cursor: pointer;
      }
      .button.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }
      .message {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }
      .error { color: var(--vscode-errorForeground); }
      .list { display: flex; flex-direction: column; gap: 8px; }
      .list-wrap { flex: 1; }
      .card {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        padding: 10px;
        background: color-mix(in srgb, var(--vscode-editor-background) 88%, transparent);
      }
      .name-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        line-height: 1.35;
        color: var(--vscode-foreground);
        text-decoration: none;
        cursor: pointer;
        background: none;
        border: 0;
        padding: 0;
        font: inherit;
      }
      .name-link:hover { color: var(--vscode-textLink-foreground); }
      .meta {
        margin-top: 6px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }
      .preview {
        margin-top: 6px;
        font-size: 12px;
        line-height: 1.45;
        color: var(--vscode-descriptionForeground);
      }
      .actions {
        display: flex;
        gap: 6px;
        margin-top: 10px;
        flex-wrap: wrap;
      }
      .empty {
        padding: 24px 10px;
        text-align: center;
        border: 1px dashed var(--vscode-panel-border);
        border-radius: 8px;
        color: var(--vscode-descriptionForeground);
      }
      .footer {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid var(--vscode-panel-border);
        display: flex;
        justify-content: flex-end;
      }
      .ghost-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 0;
        background: none;
        color: var(--vscode-descriptionForeground);
        cursor: pointer;
        padding: 6px 0;
        font: inherit;
      }
      .ghost-link:hover { color: var(--vscode-foreground); }
      .icon {
        width: 14px;
        height: 14px;
        display: inline-block;
      }
    </style>
  </head>
  <body>
    <div class="stack">
      <div class="toolbar">
        <div class="toolbar-main">
          <input id="search" class="search" type="search" placeholder="Search mems by name" />
          <button id="refresh" class="button toolbar-icon" title="Refresh" aria-label="Refresh">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15.55-6.36L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15.55 6.36L3 16"></path>
            </svg>
          </button>
        </div>
        <button id="signIn" class="button primary">Sign in</button>
      </div>
      <div id="status" class="message"></div>
      <div class="list-wrap">
        <div id="list" class="list"></div>
      </div>
      <div class="footer">
        <button id="signOut" class="ghost-link" title="Sign out">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Sign out
        </button>
      </div>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const search = document.getElementById("search");
      const list = document.getElementById("list");
      const status = document.getElementById("status");
      const signInButton = document.getElementById("signIn");
      const signOutButton = document.getElementById("signOut");

      function post(type, extra = {}) {
        vscode.postMessage({ type, ...extra });
      }

      function formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
      }

      function getPreview(content) {
        if (!content) return "";
        return String(content)
          .replace(/#+\\s?/g, "")
          .replace(/\\n+/g, " ")
          .trim()
          .slice(0, 90);
      }

      function render(state) {
        status.textContent = "";
        status.className = "message";
        list.innerHTML = "";
        search.value = state.query || "";
        signInButton.style.display = "none";
        signOutButton.style.display = state.authenticated ? "" : "none";
        search.style.display = state.authenticated ? "" : "none";
        document.getElementById("refresh").style.display = state.authenticated ? "inline-flex" : "none";

        if (state.loading) {
          status.textContent = "Loading mems...";
        } else if (state.error) {
          if (state.authenticated) {
            status.textContent = state.error;
            status.className = "message error";
          }
        } else {
          status.textContent = state.mems.length ? state.mems.length + " mems loaded" : "";
        }

        if (!state.mems.length) {
          const empty = document.createElement("div");
          empty.className = "empty";
          if (state.loading) {
            empty.textContent = "Fetching mems...";
          } else if (!state.authenticated) {
            const text = document.createElement("div");
            text.textContent = "Sign in to CoreMem";
            empty.appendChild(text);

            const action = document.createElement("button");
            action.className = "button primary";
            action.style.marginTop = "12px";
            action.textContent = "Sign in";
            action.addEventListener("click", () => post("signIn"));
            empty.appendChild(action);
          } else {
            const text = document.createElement("div");
            text.textContent = "No mems found.";
            empty.appendChild(text);

            if (state.createMemUrl) {
              const action = document.createElement("button");
              action.className = "button primary";
              action.style.marginTop = "12px";
              action.textContent = "Create your first mem";
              action.addEventListener("click", () => post("openCreateMem", { url: state.createMemUrl }));
              empty.appendChild(action);
            }
          }
          list.appendChild(empty);
          return;
        }

        for (const mem of state.mems) {
          const card = document.createElement("div");
          card.className = "card";
          const linkedUrl = state.profileUsername
            ? "https://coremem.app/" + encodeURIComponent(state.profileUsername) + "/mem/" + encodeURIComponent(mem.id)
            : "";
          card.innerHTML = \`
            <button class="name-link" data-action="openExternal" data-url="\${linkedUrl}">
              \${mem.name || "Untitled mem"}
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 17L17 7"></path>
                <path d="M7 7h10v10"></path>
              </svg>
            </button>
            <div class="meta">Updated \${formatDate(mem.updated_at)}</div>
            <div class="preview">\${getPreview(mem.content)}</div>
            <div class="actions">
              <button class="button primary" data-action="insert" data-id="\${mem.id}">Insert into editor</button>
              <button class="button" data-action="copy" data-id="\${mem.id}">Copy content</button>
            </div>
          \`;
          list.appendChild(card);
        }
      }

      window.addEventListener("message", (event) => {
        if (event.data.type === "state") {
          render(event.data.payload);
        }
      });

      search.addEventListener("input", (event) => post("search", { query: event.target.value }));
      document.getElementById("refresh").addEventListener("click", () => post("refresh"));
      signInButton.addEventListener("click", () => post("signIn"));
      signOutButton.addEventListener("click", () => post("signOut"));
      list.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        post(button.dataset.action, { id: button.dataset.id, url: button.dataset.url });
      });

      post("ready");
    </script>
  </body>
</html>`;
  }
}
