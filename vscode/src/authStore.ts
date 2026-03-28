import * as vscode from "vscode";

const ACCESS_TOKEN_KEY = "coremem.accessToken";
const REFRESH_TOKEN_KEY = "coremem.refreshToken";
const USER_KEY = "coremem.user";

export interface CoreMemUser {
  id: string;
  email?: string;
}

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  user: CoreMemUser;
}

export class AuthStore {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async getSession(): Promise<SessionData | null> {
    const [accessToken, refreshToken, userRaw] = await Promise.all([
      this.secrets.get(ACCESS_TOKEN_KEY),
      this.secrets.get(REFRESH_TOKEN_KEY),
      this.secrets.get(USER_KEY),
    ]);

    if (!accessToken || !refreshToken || !userRaw) {
      return null;
    }

    try {
      const user = JSON.parse(userRaw) as CoreMemUser;
      return { accessToken, refreshToken, user };
    } catch {
      await this.clearSession();
      return null;
    }
  }

  async saveSession(session: SessionData): Promise<void> {
    await Promise.all([
      this.secrets.store(ACCESS_TOKEN_KEY, session.accessToken),
      this.secrets.store(REFRESH_TOKEN_KEY, session.refreshToken),
      this.secrets.store(USER_KEY, JSON.stringify(session.user)),
    ]);
  }

  async clearSession(): Promise<void> {
    await Promise.all([
      this.secrets.delete(ACCESS_TOKEN_KEY),
      this.secrets.delete(REFRESH_TOKEN_KEY),
      this.secrets.delete(USER_KEY),
    ]);
  }
}
