import * as vscode from "vscode";
import { AuthStore, CoreMemUser, SessionData } from "./authStore";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jbGVxb2Fna2x0YmRodGRudmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODU0MzYsImV4cCI6MjA4OTE2MTQzNn0.nwACAHq_9GrwA8kRmsO5b009U2n9Gli_v-6D9mkXKtc";
const INVALID_LOGIN_MESSAGE = "Invalid login or password";
const COREMEM_APP_BASE_URL = "https://coremem.app";

export interface MemListItem {
  id: string;
  name: string | null;
  content?: string | null;
  updated_at: string | null;
  is_public?: boolean;
  slug?: string | null;
}

export interface MemDetails extends MemListItem {
  content: string | null;
}

interface ProfileResponse {
  username?: string | null;
  avatar_url?: string | null;
  plan?: "free" | "pro" | null;
}

export interface CoreMemProfile extends ProfileResponse {}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: CoreMemUser;
}

interface AuthErrorResponse {
  error_description?: string;
  msg?: string;
}

export class CoreMemClient {
  private verifiedProUserId: string | null = null;

  constructor(private readonly authStore: AuthStore) {}

  getConfig() {
    const config = vscode.workspace.getConfiguration("coremem");
    return {
      apiBaseUrl: config.get<string>("apiBaseUrl", "https://ncleqoagkltbdhtdnvdi.supabase.co"),
      defaultListLimit: config.get<number>("defaultListLimit", 50),
    };
  }

  async isAuthenticated(): Promise<boolean> {
    return Boolean(await this.authStore.getSession());
  }

  async hasProAccess(): Promise<boolean> {
    const session = await this.authStore.getSession();
    if (!session) {
      return false;
    }

    try {
      await this.ensureProAccess(session);
      return true;
    } catch {
      return false;
    }
  }

  async signIn(email: string, password: string): Promise<CoreMemUser> {
    const loginEmail = await this.resolveLoginEmail(email);
    const response = await fetch(`${this.getConfig().apiBaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: loginEmail, password }),
    });

    const payload = (await response.json().catch(() => ({}))) as AuthResponse | AuthErrorResponse;
    if (!response.ok) {
      const errorPayload = payload as AuthErrorResponse;
      const authMessage = errorPayload.error_description || errorPayload.msg || "Sign in failed";
      if (authMessage.toLowerCase().includes("invalid login credentials")) {
        throw new Error(INVALID_LOGIN_MESSAGE);
      }
      throw new Error(authMessage);
    }

    const authData = payload as AuthResponse;
    const sessionData: SessionData = {
      accessToken: authData.access_token,
      refreshToken: authData.refresh_token,
      user: authData.user,
    };
    await this.authStore.saveSession(sessionData);

    try {
      await this.ensureProAccess(sessionData);
    } catch (error) {
      await this.authStore.clearSession();
      this.verifiedProUserId = null;
      throw error;
    }

    return authData.user;
  }

  async signOut(): Promise<void> {
    const session = await this.authStore.getSession();
    if (session?.accessToken) {
      fetch(`${this.getConfig().apiBaseUrl}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
        },
      }).catch(() => undefined);
    }

    await this.authStore.clearSession();
    this.verifiedProUserId = null;
  }

  async listMems(limit?: number): Promise<MemListItem[]> {
    const requestedLimit = Number(limit ?? this.getConfig().defaultListLimit) || 50;
    const normalizedLimit = Math.max(1, Math.min(50, requestedLimit));
    const path =
      `mems?select=id,name,content,slug,is_public,updated_at&order=updated_at.desc&limit=${normalizedLimit}`;

    return this.apiFetch<MemListItem[]>(path);
  }

  async getMem(id: string): Promise<MemDetails> {
    const path = `mems?id=eq.${encodeURIComponent(id)}&select=id,name,content,slug,is_public,updated_at`;
    const rows = await this.apiFetch<MemDetails[]>(path);
    if (!rows[0]) {
      throw new Error("Mem not found.");
    }
    return rows[0];
  }

  async getCurrentProfile(): Promise<CoreMemProfile> {
    const session = await this.authStore.getSession();
    if (!session) {
      throw new Error("unauthenticated");
    }

    const rows = await this.apiFetch<ProfileResponse[]>(
      `profiles?id=eq.${encodeURIComponent(session.user.id)}&select=username,plan`
    );

    return rows[0] ?? {};
  }

  getCreateMemUrl(username: string): string {
    return `${COREMEM_APP_BASE_URL}/${encodeURIComponent(username)}/mem/new`;
  }

  getMemUrl(username: string, memId: string): string {
    return `${COREMEM_APP_BASE_URL}/${encodeURIComponent(username)}/mem/${encodeURIComponent(memId)}`;
  }

  private async apiFetch<T>(path: string): Promise<T> {
    const session = await this.authStore.getSession();
    if (!session) {
      throw new Error("unauthenticated");
    }

    await this.ensureProAccess(session);

    const makeRequest = async (accessToken: string) =>
      fetch(`${this.getConfig().apiBaseUrl}/rest/v1/${path}`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

    let response = await makeRequest(session.accessToken);
    if (response.status === 401) {
      const refreshed = await this.refreshSession(session);
      if (!refreshed) {
        throw new Error("unauthenticated");
      }
      await this.ensureProAccess(refreshed);
      response = await makeRequest(refreshed.accessToken);
    }

    if (!response.ok) {
      throw new Error(`CoreMem request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private async refreshSession(session: SessionData): Promise<SessionData | null> {
    const response = await fetch(`${this.getConfig().apiBaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });

    if (!response.ok) {
      await this.authStore.clearSession();
      return null;
    }

    const payload = (await response.json()) as AuthResponse;
    const refreshedSession: SessionData = {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      user: payload.user,
    };
    await this.authStore.saveSession(refreshedSession);
    this.verifiedProUserId = null;
    return refreshedSession;
  }

  private async ensureProAccess(session: SessionData): Promise<void> {
    if (this.verifiedProUserId === session.user.id) {
      return;
    }

    const path = `profiles?id=eq.${encodeURIComponent(session.user.id)}&select=plan`;
    const rows = await this.authenticatedGet<ProfileResponse[]>(path, session.accessToken);
    const plan = rows[0]?.plan ?? "free";

    if (plan !== "pro") {
      throw new Error("pro_required");
    }

    this.verifiedProUserId = session.user.id;
  }

  private async authenticatedGet<T>(path: string, accessToken: string): Promise<T> {
    const response = await fetch(`${this.getConfig().apiBaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`CoreMem request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private async resolveLoginEmail(identifier: string): Promise<string> {
    const normalized = identifier.trim();
    if (normalized.includes("@")) {
      return normalized;
    }

    const response = await fetch(`${this.getConfig().apiBaseUrl}/rest/v1/rpc/get_email_by_username`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ p_username: normalized.toLowerCase() }),
    });

    if (!response.ok) {
      throw new Error(INVALID_LOGIN_MESSAGE);
    }

    const payload = (await response.json().catch(() => null)) as string | null;
    if (!payload) {
      throw new Error(INVALID_LOGIN_MESSAGE);
    }

    return payload;
  }
}
