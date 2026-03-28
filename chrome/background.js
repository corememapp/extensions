const SUPABASE_URL = "https://ncleqoagkltbdhtdnvdi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jbGVxb2Fna2x0YmRodGRudmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODU0MzYsImV4cCI6MjA4OTE2MTQzNn0.nwACAHq_9GrwA8kRmsO5b009U2n9Gli_v-6D9mkXKtc";

let pendingAuth = null;

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!pendingAuth || tabId !== pendingAuth.tabId) return;
  if (!changeInfo.url) return;

  let url;
  try { url = new URL(changeInfo.url); } catch (_) { return; }

  if (!url.hostname.endsWith("coremem.app")) return;

  const code = url.searchParams.get("code");
  if (!code) return;

  const codeVerifier = pendingAuth.codeVerifier;
  pendingAuth = null;

  chrome.tabs.remove(tabId).catch(() => {});

  try {
    const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      chrome.runtime.sendMessage({ type: "AUTH_ERROR", message: err.error_description || err.msg || "Token exchange failed" }).catch(() => {});
      return;
    }

    const data = await tokenRes.json();
    await chrome.storage.local.set({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
    });
    chrome.runtime.sendMessage({ type: "AUTH_COMPLETE" }).catch(() => {});
  } catch (e) {
    chrome.runtime.sendMessage({ type: "AUTH_ERROR", message: e.message }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "START_GOOGLE_AUTH") {
    chrome.tabs.create({ url: msg.authUrl }, (tab) => {
      pendingAuth = { tabId: tab.id, codeVerifier: msg.codeVerifier };
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "REFRESH_SESSION") {
    refreshSession().then((token) => sendResponse({ token }));
    return true;
  }
});

async function refreshSession() {
  const { refresh_token } = await chrome.storage.local.get("refresh_token");
  if (!refresh_token) return null;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token }),
  });

  if (!res.ok) {
    await chrome.storage.local.remove(["access_token", "refresh_token", "user"]);
    return null;
  }

  const data = await res.json();
  await chrome.storage.local.set({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: data.user,
  });
  return data.access_token;
}
