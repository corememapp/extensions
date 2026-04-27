let allMems = [];
let currentSort = "updated";
let currentDetailMem = null;
let currentDetailObjects = [];

const views = {
  login: document.getElementById("view-login"),
  main: document.getElementById("view-main"),
  detail: document.getElementById("view-detail"),
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

async function loadProfile() {
  try {
    const profile = await fetchProfile();
    if (profile?.username) {
      const label = el("username-label");
      label.textContent = profile.username;
      label.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: `https://coremem.app/${profile.username}` });
      });
    }
  } catch (_) {}
}

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
const MEMS_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`;
const FILE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;
const OTHER_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>`;
const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const NAV_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

function getTypeIcon(type) {
  if (type === "document") return MEM_ICON_SVG;
  if (type === "file") return FILE_ICON_SVG;
  return OTHER_ICON_SVG;
}

function getObjectLabel(obj) {
  if (obj.name) return obj.name;
  if (obj.type === "document") {
    const firstLine = (obj.content || "").split("\n")[0].replace(/^#+\s*/, "").trim();
    return firstLine || "Document";
  }
  return obj.type.charAt(0).toUpperCase() + obj.type.slice(1);
}

function getObjectText(obj) {
  if (obj.type === "document") return obj.content || "";
  if (obj.type === "file") return `[File: ${obj.name || "Untitled"}]`;
  return `[${obj.type.charAt(0).toUpperCase() + obj.type.slice(1)}: ${obj.name || "Untitled"}]`;
}

function objectsToText(objects) {
  return objects.map(getObjectText).filter(Boolean).join("\n\n");
}

async function writeToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function getPreview(mem) {
  if (mem.description) return mem.description;
  if (!mem.object_count) return "Empty mem";
  return mem.object_count === 1 ? "1 object" : `${mem.object_count} objects`;
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
  const filtered = sortedMems().filter((m) => {
    if (!q) return true;
    return m.name.toLowerCase().includes(q) ||
      (m.description || "").toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    el("empty").classList.remove("hidden");
    return;
  }
  el("empty").classList.add("hidden");

  filtered.forEach((mem) => {
    const row = document.createElement("div");
    row.className = "mem-row";

    const isMulti = mem.object_count > 1;
    const icon = isMulti ? MEMS_ICON_SVG : MEM_ICON_SVG;
    const badges = isMulti
      ? `<span class="mem-badge">${mem.object_count}</span>`
      : "";
    const actionIcon = isMulti
      ? `<div class="mem-nav-icon">${NAV_ICON_SVG}</div>`
      : "";

    row.innerHTML = `
      <div class="mem-icon">${icon}</div>
      <div class="mem-row-text">
        <div class="mem-row-name"><span class="mem-row-name-text">${escHtml(mem.name)}</span>${badges}</div>
        <div class="mem-row-preview">${escHtml(getPreview(mem))}</div>
      </div>
      ${actionIcon}
    `;

    if (isMulti) {
      row.addEventListener("click", () => showDetail(mem));
    } else {
      row.addEventListener("click", () => copyMem(mem, row));
    }
    list.appendChild(row);
  });
}

async function copyMem(mem, row) {
  const objects = await fetchMemObjects(mem.id);
  const text = objects.length > 0 ? objectsToText(objects) : mem.name;
  await writeToClipboard(text);
  row.classList.add("copied");
  setTimeout(() => row.classList.remove("copied"), 1500);
  showCopyToast();
}

async function showDetail(mem) {
  currentDetailMem = mem;
  currentDetailObjects = [];
  el("detail-mem-name").textContent = mem.name;

  const list = el("detail-object-list");
  list.innerHTML = `<div class="state-msg">Loading…</div>`;
  showView("detail");

  const objects = await fetchMemObjects(mem.id);
  currentDetailObjects = objects;
  list.innerHTML = "";

  objects.forEach((obj) => {
    const row = document.createElement("div");
    row.className = "detail-obj-row";

    const label = escHtml(getObjectLabel(obj));
    const preview = obj.type === "document" && obj.content
      ? escHtml(obj.content.replace(/#+\s?/g, "").replace(/\n+/g, " ").trim().slice(0, 80))
      : "";

    row.innerHTML = `
      <div class="detail-obj-icon">${getTypeIcon(obj.type)}</div>
      <div class="detail-obj-text">
        <div class="detail-obj-name">${label}</div>
        ${preview ? `<div class="detail-obj-preview">${preview}</div>` : ""}
      </div>
      <button class="detail-obj-copy icon-btn" title="Copy">${COPY_ICON_SVG}</button>
    `;

    row.addEventListener("click", async () => {
      await writeToClipboard(getObjectText(obj));
      row.classList.add("copied");
      setTimeout(() => row.classList.remove("copied"), 1500);
      showCopyToast();
    });

    list.appendChild(row);
  });
}

function goBack() {
  const detail = el("view-detail");
  detail.classList.add("sliding-out");
  setTimeout(() => {
    detail.classList.remove("sliding-out");
    showView("main");
  }, 230);
}

function showCopyToast() {
  const toast = el("copy-toast");
  const footer = document.querySelector(".detail-footer");
  toast.classList.remove("hidden");
  footer.classList.add("hidden");
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.classList.add("hidden");
      footer.classList.remove("hidden");
    }, 200);
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

el("refresh-btn").addEventListener("click", () => {
  loadMems();
});

el("detail-back-btn").addEventListener("click", goBack);

el("detail-copy-all-btn").addEventListener("click", async () => {
  const text = objectsToText(currentDetailObjects) || currentDetailMem.name;
  await writeToClipboard(text);
  showCopyToast();
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
