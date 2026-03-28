const SUPABASE_URL = "https://ncleqoagkltbdhtdnvdi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jbGVxb2Fna2x0YmRodGRudmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODU0MzYsImV4cCI6MjA4OTE2MTQzNn0.nwACAHq_9GrwA8kRmsO5b009U2n9Gli_v-6D9mkXKtc";

async function getToken() {
  const { access_token } = await chrome.storage.local.get("access_token");
  if (!access_token) return null;
  return access_token;
}

async function apiFetch(path, opts = {}) {
  let token = await getToken();
  if (!token) throw new Error("unauthenticated");

  const makeRequest = async (t) =>
    fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${t}`,
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
    });

  let res = await makeRequest(token);

  if (res.status === 401) {
    const { token: refreshed } = await chrome.runtime.sendMessage({ type: "REFRESH_SESSION" });
    if (!refreshed) throw new Error("unauthenticated");
    res = await makeRequest(refreshed);
  }

  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.msg || "Sign in failed");
  }

  const data = await res.json();
  await chrome.storage.local.set({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: data.user,
  });
  return data;
}

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function signInWithGoogle() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google` +
    `&redirect_to=${encodeURIComponent("https://coremem.app/")}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;

  await chrome.runtime.sendMessage({ type: "START_GOOGLE_AUTH", authUrl, codeVerifier });

  return new Promise((resolve, reject) => {
    const listener = (msg) => {
      if (msg.type === "AUTH_COMPLETE") {
        chrome.runtime.onMessage.removeListener(listener);
        resolve();
      } else if (msg.type === "AUTH_ERROR") {
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error(msg.message));
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  });
}

async function signOut() {
  const token = await getToken();
  if (token) {
    fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` },
    }).catch(() => {});
  }
  await chrome.storage.local.remove(["access_token", "refresh_token", "user"]);
}

async function fetchMems() {
  return apiFetch("mems?select=id,name,content,slug,is_public,updated_at&order=name.asc");
}

async function fetchProfile() {
  const { user } = await chrome.storage.local.get("user");
  if (!user) return null;
  const rows = await apiFetch(`profiles?id=eq.${user.id}&select=username,avatar_url,plan`);
  return rows[0] || null;
}
