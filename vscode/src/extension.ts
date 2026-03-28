import * as vscode from "vscode";
import { AuthStore } from "./authStore";
import { CoreMemClient, MemListItem } from "./corememClient";
import { CoreMemSidebarProvider } from "./sidebarProvider";

export function activate(context: vscode.ExtensionContext): void {
  const authStore = new AuthStore(context.secrets);
  const client = new CoreMemClient(authStore);
  let sidebarProvider: CoreMemSidebarProvider;

  async function signIn(): Promise<void> {
    const login = await vscode.window.showInputBox({
      title: "CoreMem Sign In",
      prompt: "Email or username",
      ignoreFocusOut: true,
    });

    if (!login) {
      return;
    }

    const password = await vscode.window.showInputBox({
      title: "CoreMem Sign In",
      prompt: "Password",
      password: true,
      ignoreFocusOut: true,
    });

    if (typeof password !== "string") {
      return;
    }

    try {
      const user = await client.signIn(login.trim(), password);
      vscode.window.showInformationMessage(`Signed in to CoreMem${user.email ? ` as ${user.email}` : ""}.`);
      await sidebarProvider.refresh(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed.";
      vscode.window.showErrorMessage(
        message === "pro_required" ? "CoreMem IDE access requires a Pro account." : message
      );
    }
  }

  async function signOut(): Promise<void> {
    await client.signOut();
    vscode.window.showInformationMessage("Signed out of CoreMem.");
    await sidebarProvider.refresh(true);
  }

  async function ensureAuthenticated(): Promise<boolean> {
    if (await client.isAuthenticated()) {
      if (await client.hasProAccess()) {
        return true;
      }
      vscode.window.showWarningMessage("CoreMem IDE access requires a Pro account.");
      return false;
    }

    const action = await vscode.window.showWarningMessage(
      "Sign in to CoreMem to access your mems.",
      "Sign In"
    );
    if (action === "Sign In") {
      await signIn();
    }
    return client.isAuthenticated();
  }

  async function pickMem(): Promise<MemListItem | null> {
    if (!(await ensureAuthenticated())) {
      return null;
    }

    let mems: MemListItem[];
    try {
      mems = await client.listMems();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load mems.";
      vscode.window.showErrorMessage(
        message === "unauthenticated"
          ? "Your CoreMem session expired. Sign in again."
          : message === "pro_required"
            ? "CoreMem IDE access requires a Pro account."
            : message
      );
      return null;
    }

    if (!mems.length) {
      vscode.window.showInformationMessage("No mems found in CoreMem.");
      return null;
    }

    const selection = await vscode.window.showQuickPick(
      mems.map((mem) => ({
        label: mem.name || "Untitled mem",
        description: mem.updated_at ? `Updated ${new Date(mem.updated_at).toLocaleString()}` : "",
        mem,
      })),
      {
        title: "CoreMem mems",
        matchOnDescription: true,
        placeHolder: "Select a mem",
      }
    );

    return selection?.mem ?? null;
  }

  async function fetchMem(id: string) {
    if (!(await ensureAuthenticated())) {
      return null;
    }

    try {
      return await client.getMem(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch mem.";
      vscode.window.showErrorMessage(
        message === "unauthenticated"
          ? "Your CoreMem session expired. Sign in again."
          : message === "pro_required"
            ? "CoreMem IDE access requires a Pro account."
            : message
      );
      return null;
    }
  }

  async function insertMem(id?: string): Promise<void> {
    const targetMem = id ? { id } : await pickMem();
    if (!targetMem) {
      return;
    }

    const mem = await fetchMem(targetMem.id);
    if (!mem) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      const document = await vscode.workspace.openTextDocument({
        content: mem.content || "",
        language: "markdown",
      });
      await vscode.window.showTextDocument(document, { preview: false });
      return;
    }

    await editor.edit((editBuilder) => {
      editBuilder.replace(editor.selection, mem.content || "");
    });
  }

  async function copyMem(id?: string): Promise<void> {
    const targetMem = id ? { id } : await pickMem();
    if (!targetMem) {
      return;
    }

    const mem = await fetchMem(targetMem.id);
    if (!mem) {
      return;
    }

    await vscode.env.clipboard.writeText(mem.content || "");
    vscode.window.showInformationMessage(`Copied "${mem.name || "mem"}" to the clipboard.`);
  }

  sidebarProvider = new CoreMemSidebarProvider(client, {
    insert: (id) => insertMem(id),
    copy: (id) => copyMem(id),
    openExternal: async (url) => {
      await vscode.env.openExternal(vscode.Uri.parse(url));
    },
    openCreateMem: async (url) => {
      await vscode.env.openExternal(vscode.Uri.parse(url));
    },
    signIn,
    signOut,
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("coremem.sidebar", sidebarProvider),
    vscode.commands.registerCommand("coremem.signIn", signIn),
    vscode.commands.registerCommand("coremem.signOut", signOut),
    vscode.commands.registerCommand("coremem.searchMems", async () => {
      const mem = await pickMem();
      if (mem) {
        await insertMem(mem.id);
      }
    }),
    vscode.commands.registerCommand("coremem.insertMem", () => insertMem()),
    vscode.commands.registerCommand("coremem.copyMem", () => copyMem()),
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("coremem")) {
        await sidebarProvider.refresh(true);
      }
    })
  );
}

export function deactivate(): void {}
