let allMems = [];
let currentSort = "updated";

const views = {
  login: document.getElementById("view-login"),
  main: document.getElementById("view-main"),
};

function showView(name) {
  Object.values(views).forEach((v) => v.classList.add("hidden"));
  views[name].classList.remove("hidden");
}

function el(id) { return document.getElementById(id); }

async function init() {
  const { access_token } = await chrome.storage.local.get("access_token");
  if (!access_token) { showView("login"); return; }
  showView("main");
  loadMems();
  loadProfile();
}

async function loadProfile() {}

async function loadMems() {
  el("loading").classList.remove("hidden");
  el("mem-list").innerHTML = "";
  el("empty").classList.add("hidden");
  el("list-error").classList.add("hidden");

  try {
    allMems = await fetchMems();
    el("loading").classList.add("hidden");
    renderList(el("search-input").value.trim());
  } catch (e) {
    el("loading").classList.add("hidden");
    if (e.message === "unauthenticated") {
      await chrome.storage.local.remove(["access_token", "refresh_token", "user"]);
      showView("login");
    } else {
      el("list-error").textContent = "Failed to load mems. Please try again.";
      el("list-error").classList.remove("hidden");
    }
  }
}

const MEM_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>`;

function getPreview(content) {
  if (!content) return "";
  return content.replace(/#+\s?/g, "").replace(/\n+/g, " ").trim().slice(0, 60);
}

function sortedMems() {
  const copy = [...allMems];
  if (currentSort === "name") {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    copy.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
  return copy;
}

function renderList(query) {
  const list = el("mem-list");
  list.innerHTML = "";

  const q = query.toLowerCase();
  const filtered = sortedMems().filter((m) =>
    !q || m.name.toLowerCase().includes(q) || (m.content || "").toLowerCase().includes(q)
  );

  if (filtered.length === 0) {
    el("empty").classList.remove("hidden");
    return;
  }
  el("empty").classList.add("hidden");

  filtered.forEach((mem) => {
    const row = document.createElement("div");
    row.className = "mem-row";
    row.innerHTML = `
      <div class="mem-icon">${MEM_ICON_SVG}</div>
      <div class="mem-row-text">
        <div class="mem-row-name">${escHtml(mem.name)}</div>
        <div class="mem-row-preview">${escHtml(getPreview(mem.content))}</div>
      </div>
      <div class="mem-copy-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </div>
    `;
    row.addEventListener("click", () => copyMem(mem, row));
    list.appendChild(row);
  });
}

async function copyMem(mem, row) {
  try {
    await navigator.clipboard.writeText(mem.content || "");
  } catch (_) {
    const ta = document.createElement("textarea");
    ta.value = mem.content || "";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  row.classList.add("copied");
  setTimeout(() => row.classList.remove("copied"), 1500);
  showCopyToast();
}

function showCopyToast() {
  const toast = el("copy-toast");
  toast.classList.remove("hidden");
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 200);
  }, 1800);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

el("google-btn").addEventListener("click", async () => {
  const btn = el("google-btn");
  const errEl = el("login-error");
  errEl.classList.add("hidden");
  btn.disabled = true;
  btn.querySelector("svg + *") && (btn.lastChild.textContent = " Waiting for Google…");

  try {
    await signInWithGoogle();
    showView("main");
    loadMems();
    loadProfile();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
});

el("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = el("login-btn");
  const errEl = el("login-error");
  errEl.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Signing in…";

  try {
    await signIn(el("email").value.trim(), el("password").value);
    showView("main");
    loadMems();
    loadProfile();
  } catch (err) {
    const msg = err.message || "";
    if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials")) {
      errEl.textContent = "Wrong password, or did you sign up with Google? Try the button above.";
    } else {
      errEl.textContent = msg;
    }
    errEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign in";
  }
});

el("forgot-link").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: "https://coremem.app/reset-password" });
});

el("signout-btn").addEventListener("click", async () => {
  await signOut();
  el("username-label").textContent = "";
  showView("login");
});

el("filter-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  el("filter-dropdown").classList.toggle("hidden");
});

document.addEventListener("click", () => el("filter-dropdown").classList.add("hidden"));

el("filter-dropdown").addEventListener("click", (e) => {
  const opt = e.target.closest(".filter-option");
  if (!opt) return;
  currentSort = opt.dataset.sort;
  document.querySelectorAll(".filter-option").forEach((o) => o.classList.remove("active"));
  opt.classList.add("active");
  el("filter-btn").classList.toggle("active", currentSort !== "updated");
  el("filter-dropdown").classList.add("hidden");
  renderList(el("search-input").value.trim());
});

el("search-input").addEventListener("input", (e) => {
  const val = e.target.value;
  el("search-clear").classList.toggle("hidden", !val);
  renderList(val.trim());
});

el("search-clear").addEventListener("click", () => {
  el("search-input").value = "";
  el("search-clear").classList.add("hidden");
  el("search-input").focus();
  renderList("");
});

init();
