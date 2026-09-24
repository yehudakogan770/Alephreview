// Aleph Review admin page.
//
// Edits the site data (all words, settings and games) and publishes it to
// Firebase. The page stays locked until an admin signs in with Google.
// Two kinds of admin (see the security rules in README.md):
//  - full admins, listed in the Firebase rules: can do everything, including
//    adding and removing sub-admins on the Admins tab;
//  - sub-admins, stored in Firestore under editors/{email}: can do everything
//    except manage admins.

const FIREBASE_VERSION = "12.3.0";

// Same belts, in level order, as js/app.js.
const BELTS = [
  { key: "white",  name: "White",  color: "#f1f1ee", ink: "#1b2437" },
  { key: "red",    name: "Red",    color: "#d62828", ink: "#ffffff" },
  { key: "orange", name: "Orange", color: "#f07800", ink: "#ffffff" },
  { key: "yellow", name: "Yellow", color: "#f6c426", ink: "#1b2437" },
  { key: "green",  name: "Green",  color: "#2f9e44", ink: "#ffffff" },
  { key: "blue",   name: "Blue",   color: "#1c64d6", ink: "#ffffff" },
  { key: "purple", name: "Purple", color: "#7b2cbf", ink: "#ffffff" },
  { key: "brown",  name: "Brown",  color: "#7f4f24", ink: "#ffffff" },
  { key: "gray",   name: "Gray",   color: "#7d838d", ink: "#ffffff" },
  { key: "black",  name: "Black",  color: "#15171a", ink: "#ffffff" },
];
const STRIPES = [1, 2, 3];
const THUMB_BASE = "https://screens.cdn.wordwall.net/200/";

// Every piece of site text the admin can change, in the order shown.
const TEXT_FIELDS = [
  ["Home page", [
    ["eyebrow", "Small line above the headline"],
    ["headline", "Headline"],
    ["lede", "Line under the headline"],
    ["startButton", "Button for new students"],
    ["continueButton", "Button for students who already played"],
    ["startWith", "Before the first stripe to play (new students)"],
    ["nextUp", "Before the next stripe to play"],
    ["statGames", "Number label: all games"],
    ["statPlayed", "Number label: games played"],
    ["statStars", "Number label: stars"],
  ]],
  ["Belts and stripes", [
    ["beltsTitle", "Title above the belts"],
    ["beltsSubtitle", "Line under that title"],
    ["stripesTitle", "Title above the stripes on a belt page"],
    ["comingSoon", "Label for belts and stripes with no games yet"],
  ]],
  ["How to play box", [
    ["howToTitle", "Box title"],
    ["step1", "Step 1"],
    ["step2Fallback", "Step 2, when the game type has no How to play text"],
    ["step3Next", "Step 3, when there are more games"],
    ["step3Last", "Step 3, on the last game of a stripe"],
  ]],
  ["When a stripe is done", [
    ["stripeDoneTitle", "Title. {stripe} becomes the stripe number."],
    ["stripeDoneText", "Line under it. {belt} becomes the belt name."],
  ]],
  ["Bottom of every page", [
    ["footer", "Footer"],
  ]],
];

// ---- state -------------------------------------------------------------------

let draft = null;      // the site data being edited
let published = "";    // JSON of the last published version, to spot changes
let user = null;       // the signed-in Google account
let isFullAdmin = false; // full admins can add and remove sub-admins
let fb = null;         // Firebase, loaded when first needed
let tab = "games";
let beltKey = "white";

const $ = sel => document.querySelector(sel);
const main = $("#admin");

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const local = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

function isDirty() { return JSON.stringify(draft) !== published; }

// Call after every edit: remembers the draft (for Preview and in case the
// tab closes) and updates the status.
function changed() {
  local.set("admin-draft", JSON.stringify(draft));
  showStatus();
}

function toast(msg, kind = "") {
  const el = $("#toast");
  el.className = `admin-toast ${kind}`;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 4500);
}

function showStatus(text, kind) {
  const el = $("#status");
  if (text) { el.textContent = text; el.className = `status ${kind || ""}`; return; }
  if (isDirty()) { el.textContent = "Unsaved changes"; el.className = "status warn"; }
  else { el.textContent = "Everything is published"; el.className = "status ok"; }
  $("#btn-save").disabled = !isDirty();
  $("#btn-discard").disabled = !isDirty();
  $("#btn-account").textContent = user ? `Sign out (${user.email})` : "";
}

// ---- Firebase: Google sign-in and publishing --------------------------------------

function firebaseReady() {
  return typeof FIREBASE_CONFIG !== "undefined" && !!FIREBASE_CONFIG;
}

async function firebase() {
  if (fb) return fb;
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(FIREBASE_CONFIG);
  fb = { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
  authMod.onAuthStateChanged(fb.auth, onAuth);
  return fb;
}

// ---- the sign-in gate ---------------------------------------------------------------

function gate(msg, { signIn = false, signOut = false } = {}) {
  document.body.classList.add("locked");
  $("#gate-msg").textContent = msg;
  $("#gate-signin").hidden = !signIn;
  $("#gate-signout").hidden = !signOut;
}

async function signIn() {
  try {
    const { auth, authMod } = await firebase();
    const provider = new authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await authMod.signInWithPopup(auth, provider);
    // onAuthStateChanged takes it from here.
  } catch (err) {
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
    if (err.code === "auth/unauthorized-domain") gate("Google sign-in isn't allowed on this web address yet. In Firebase, add it under Authentication > Settings > Authorized domains.", { signIn: true });
    else if (err.code === "auth/popup-blocked") gate("The browser blocked the sign-in window. Allow pop-ups for this site, then try again.", { signIn: true });
    else gate("Couldn't sign in. Please try again.", { signIn: true });
  }
}

async function signOutNow() {
  if (draft && isDirty() && !confirm("You have changes that aren't published. Sign out anyway? They stay saved in this browser.")) return;
  const { auth, authMod } = await firebase();
  await authMod.signOut(auth);
}

// Only admins may read admin/check (Firebase security rules), so reading it
// tells us whether this account is an admin.
async function isAdmin() {
  const { db, fsMod } = await firebase();
  try {
    await fsMod.getDoc(fsMod.doc(db, "admin", "check"));
    return true;
  } catch (err) {
    if (err.code === "permission-denied") return false;
    throw err;
  }
}

// Only full admins may read admin/owner.
async function checkFullAdmin() {
  const { db, fsMod } = await firebase();
  try {
    await fsMod.getDoc(fsMod.doc(db, "admin", "owner"));
    return true;
  } catch (err) {
    if (err.code === "permission-denied") return false;
    throw err;
  }
}

async function onAuth(u) {
  user = u;
  if (!u) {
    draft = null;
    main.innerHTML = "";
    gate("Sign in with your Google account to edit the site.", { signIn: true });
    return;
  }
  gate(`Checking ${u.email}…`);
  let ok;
  try { ok = await isAdmin(); } catch {
    gate("Couldn't reach the server. Check the internet connection and reload.", { signOut: true });
    return;
  }
  if (!ok) { gate(`${u.email} isn't an admin for this site.`, { signOut: true }); return; }
  isFullAdmin = await checkFullAdmin().catch(() => false);
  document.querySelector('.admin-tabs [data-tab="admins"]').hidden = !isFullAdmin;
  if (!isFullAdmin && tab === "admins") tab = "games";
  await openEditor();
}

async function publish() {
  if (!isDirty()) return;
  const problem = checkDraft();
  if (problem) { toast(problem, "bad"); return; }
  if (!user) return;

  showStatus("Publishing…");
  $("#btn-save").disabled = true;
  try {
    const { db, fsMod } = await firebase();
    await fsMod.setDoc(fsMod.doc(db, "site", "content"), {
      data: JSON.stringify(draft),
      updatedAt: fsMod.serverTimestamp(),
      updatedBy: user.email,
    });
    published = JSON.stringify(draft);
    changed();
    toast("Published! Reload the site to see it.", "good");
  } catch (err) {
    showStatus();
    if (err.code === "permission-denied") toast(`${user.email} isn't allowed to publish.`, "bad");
    else toast("Couldn't publish. Check the internet connection and try again.", "bad");
  }
}

// Catch mistakes that would break the site before publishing.
function checkDraft() {
  for (const b of BELTS) for (const s of STRIPES) for (const g of draft.games[b.key][s]) {
    if (!g.title || !g.title.trim()) return `A game in ${b.name} Belt, Stripe ${s} has no name.`;
    if (!g.id) return `"${g.title}" is missing its Wordwall number.`;
  }
  if (!draft.text.headline || !draft.text.headline.trim()) return "The headline is empty.";
  return "";
}

// ---- helpers for games -----------------------------------------------------------

function list(belt, stripe) { return draft.games[belt][stripe]; }

function findGame(id) {
  for (const b of BELTS) for (const s of STRIPES) {
    const i = list(b.key, s).findIndex(g => g.id === id);
    if (i >= 0) return { belt: b.key, stripe: s, index: i, game: list(b.key, s)[i] };
  }
  return null;
}

function thumbUrl(thumb) { return /^https?:/.test(thumb) ? thumb : THUMB_BASE + thumb; }

function templateNames() { return Object.keys(draft.templates).sort((a, b) => a.localeCompare(b)); }

function setTemplate(g, name) {
  g.game = name;
  const t = draft.templates[name];
  if (t && t.group) g.type = t.group;
}

function moveGame(from, to, index) {
  const [g] = list(from.belt, from.stripe).splice(from.index, 1);
  if (from.belt === to.belt && from.stripe === to.stripe && from.index < index) index--;
  list(to.belt, to.stripe).splice(index, 0, g);
  changed();
}

function beltName(key) { return BELTS.find(b => b.key === key).name; }

function beltStyle(b) { return `--belt:${b.color};--belt-ink:${b.ink}`; }

// ---- Games tab ------------------------------------------------------------------

function gamesTab() {
  const chips = BELTS.map(b => {
    const all = STRIPES.flatMap(s => list(b.key, s));
    return `
      <button class="belt-chip${b.key === beltKey ? " on" : ""}" data-belt="${b.key}" style="${beltStyle(b)}" title="Drop a game here to move it to this belt">
        <span class="swatch"></span>${b.name}<span class="n">${all.length}</span>
      </button>`;
  }).join("");

  const cols = STRIPES.map(s => {
    const games = list(beltKey, s);
    const rows = games.map((g, i) => `
      <li class="row${g.hidden ? " is-hidden" : ""}" draggable="true" data-stripe="${s}" data-index="${i}">
        <span class="handle" title="Drag to move" aria-hidden="true">⋮⋮</span>
        <span class="row-thumb">${g.thumb ? `<img src="${esc(thumbUrl(g.thumb))}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>
        <span class="row-text">
          <span class="row-title" dir="auto">${esc(g.title)}</span>
          <span class="row-meta">${esc(g.game || "No game type")}${g.tip ? " · has instruction" : ""}${g.embed ? "" : " · opens on Wordwall"}</span>
        </span>
        ${g.hidden ? `<span class="badge">Hidden</span>` : ""}
        <button class="icon-btn small" data-edit="${esc(g.id)}" title="Edit" aria-label="Edit ${esc(g.title)}">✎</button>
      </li>`).join("");
    return `
      <section class="stripe-col">
        <header>
          <h3>Stripe ${s} <span class="n">${games.length}</span></h3>
          <button class="btn btn-ghost small" data-add="${s}">+ Add game</button>
        </header>
        <ul class="rows" data-stripe="${s}">
          ${rows || `<li class="empty">No games yet. Drag a game here or add one.</li>`}
        </ul>
      </section>`;
  }).join("");

  return `
    <p class="tab-help">Pick a belt. Drag games to change their order or move them to another stripe. Drop a game on a belt above to move it there. Click ✎ to edit a game.</p>
    <div class="belt-chips">${chips}</div>
    <div class="stripe-cols" style="${beltStyle(BELTS.find(b => b.key === beltKey))}">${cols}</div>`;
}

// Drag and drop between and within stripes, and onto belt chips.
let dragFrom = null;

function dropIndex(ul, y) {
  const rows = [...ul.querySelectorAll(".row:not(.dragging)")];
  const i = rows.findIndex(r => { const box = r.getBoundingClientRect(); return y < box.top + box.height / 2; });
  const target = i < 0 ? null : rows[i];
  return target ? Number(target.dataset.index) : list(beltKey, Number(ul.dataset.stripe)).length;
}

function clearDropMarks() {
  document.querySelectorAll(".drop-line").forEach(el => el.remove());
  document.querySelectorAll(".drop-on").forEach(el => el.classList.remove("drop-on"));
}

main.addEventListener("dragstart", e => {
  const row = e.target.closest(".row");
  if (!row) return;
  dragFrom = { belt: beltKey, stripe: Number(row.dataset.stripe), index: Number(row.dataset.index) };
  row.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", "game");
});

main.addEventListener("dragend", () => {
  dragFrom = null;
  document.querySelectorAll(".dragging").forEach(el => el.classList.remove("dragging"));
  clearDropMarks();
});

main.addEventListener("dragover", e => {
  if (!dragFrom) return;
  const chip = e.target.closest(".belt-chip");
  const ul = e.target.closest(".rows");
  if (!chip && !ul) return;
  e.preventDefault();
  clearDropMarks();
  if (chip) { chip.classList.add("drop-on"); return; }
  const line = document.createElement("li");
  line.className = "drop-line";
  const idx = dropIndex(ul, e.clientY);
  const before = [...ul.querySelectorAll(".row")].find(r => Number(r.dataset.index) === idx && !r.classList.contains("dragging"));
  ul.querySelector(".empty")?.remove();
  before ? ul.insertBefore(line, before) : ul.append(line);
});

main.addEventListener("drop", e => {
  if (!dragFrom) return;
  const chip = e.target.closest(".belt-chip");
  const ul = e.target.closest(".rows");
  e.preventDefault();
  const from = dragFrom;
  if (chip) {
    const to = { belt: chip.dataset.belt, stripe: from.stripe };
    if (to.belt === from.belt) { clearDropMarks(); return; }
    const title = list(from.belt, from.stripe)[from.index].title;
    moveGame(from, to, list(to.belt, to.stripe).length);
    toast(`Moved "${title}" to ${beltName(to.belt)} Belt, Stripe ${to.stripe}.`);
  } else if (ul) {
    const to = { belt: beltKey, stripe: Number(ul.dataset.stripe) };
    moveGame(from, to, dropIndex(ul, e.clientY));
  }
  dragFrom = null;
  render();
});

// ---- edit one game ----------------------------------------------------------------

function beltOptions(sel) {
  return BELTS.map(b => `<option value="${b.key}"${b.key === sel ? " selected" : ""}>${b.name} Belt</option>`).join("");
}

function stripeOptions(sel) {
  return STRIPES.map(s => `<option value="${s}"${s === sel ? " selected" : ""}>Stripe ${s}</option>`).join("");
}

function typeOptions(sel) {
  return `<option value="">Choose…</option>` + templateNames()
    .map(n => `<option${n === sel ? " selected" : ""}>${esc(n)}</option>`).join("");
}

function wordwallLink(g) {
  return g.play ? `https://wordwall.net/play/${g.play}` : /^\d+$/.test(g.id) ? `https://wordwall.net/resource/${g.id}` : g.embed ? `https://wordwall.net/embed/${g.embed}` : "";
}

function openEdit(id) {
  const where = findGame(id);
  if (!where) return;
  const g = where.game;
  const dlg = $("#dlg-game");
  dlg.innerHTML = `
    <form method="dialog" class="dlg-body">
      <h2>Edit game</h2>
      <div class="edit-top">
        ${g.thumb ? `<img class="edit-thumb" src="${esc(thumbUrl(g.thumb))}" alt="" onerror="this.remove()">` : ""}
        <label class="field grow"><span>Name</span><input name="title" value="${esc(g.title)}" dir="auto" required></label>
      </div>
      <label class="field"><span>Game type</span><select name="game">${typeOptions(g.game)}</select>
        <small>This picks the How to play text.</small></label>
      <label class="field"><span>Instruction for this game (optional)</span>
        <textarea name="tip" rows="2" dir="auto" placeholder="Like: Tap the letters with a Patach.">${esc(g.tip || "")}</textarea>
        <small>Shows under How to play. Keep it short and simple.</small></label>
      <div class="field-row">
        <label class="field"><span>Belt</span><select name="belt">${beltOptions(where.belt)}</select></label>
        <label class="field"><span>Stripe</span><select name="stripe">${stripeOptions(where.stripe)}</select></label>
      </div>
      <label class="opt"><input type="checkbox" name="hidden"${g.hidden ? " checked" : ""}> Hide this game from students</label>
      <details class="advanced">
        <summary>Wordwall details</summary>
        <label class="field"><span>Wordwall number</span><input name="id" value="${esc(g.id)}"></label>
        <label class="field"><span>Embed code (plays the game inside the site)</span><input name="embed" value="${esc(g.embed || "")}"></label>
        <label class="field"><span>Play link</span><input name="play" value="${esc(g.play || "")}"></label>
        <label class="field"><span>Picture</span><input name="thumb" value="${esc(g.thumb || "")}"></label>
      </details>
      <p class="form-error" hidden></p>
      <div class="dlg-actions">
        <button class="btn btn-danger" data-act="delete" type="button">Delete game</button>
        ${wordwallLink(g) ? `<a class="btn btn-ghost" href="${esc(wordwallLink(g))}" target="_blank" rel="noopener">Open on Wordwall</a>` : ""}
        <span class="spacer"></span>
        <button class="btn btn-ghost" value="cancel" formnovalidate>Cancel</button>
        <button class="btn btn-primary" data-act="save" type="button">Save</button>
      </div>
    </form>`;

  dlg.querySelector('[data-act="delete"]').addEventListener("click", () => {
    if (!confirm(`Delete "${g.title}"? To keep it but not show it, use "Hide this game" instead.`)) return;
    list(where.belt, where.stripe).splice(where.index, 1);
    changed();
    dlg.close();
    render();
    toast(`Deleted "${g.title}".`);
  });

  dlg.querySelector('[data-act="save"]').addEventListener("click", () => {
    const f = dlg.querySelector("form");
    const val = n => f.elements[n].value.trim();
    const errEl = f.querySelector(".form-error");
    const newId = val("id");
    const clash = newId !== g.id && findGame(newId);
    if (!val("title")) { errEl.textContent = "Give the game a name."; errEl.hidden = false; return; }
    if (!newId) { errEl.textContent = "The Wordwall number can't be empty."; errEl.hidden = false; return; }
    if (clash) { errEl.textContent = `That Wordwall number is already used by "${clash.game.title}".`; errEl.hidden = false; return; }

    g.title = val("title");
    if (val("game")) setTemplate(g, val("game"));
    if (val("tip")) g.tip = val("tip"); else delete g.tip;
    if (f.elements.hidden.checked) g.hidden = true; else delete g.hidden;
    g.id = newId;
    for (const k of ["embed", "play", "thumb"]) { if (val(k)) g[k] = val(k); else delete g[k]; }

    const belt = val("belt"), stripe = Number(val("stripe"));
    if (belt !== where.belt || stripe !== where.stripe) {
      moveGame(where, { belt, stripe }, list(belt, stripe).length);
      toast(`Moved "${g.title}" to ${beltName(belt)} Belt, Stripe ${stripe}.`);
    } else {
      changed();
    }
    dlg.close();
    render();
  });
  dlg.showModal();
}

// ---- add a game ----------------------------------------------------------------------

function decodeHtml(s) {
  const t = document.createElement("textarea");
  t.innerHTML = s;
  return t.value;
}

// Read what we can from anything copied off Wordwall: the Embed code, the
// "Image & link" code, or a plain link.
function parseWordwall(text) {
  const out = {};
  const embed = text.match(/wordwall\.net\/embed\/([0-9a-f]{32})(\?[^"'\s<>]*)?/i);
  const img = text.match(/screens\.cdn\.wordwall\.net\/\d+\/([0-9a-f]{32})_(\d+)/i);
  const res = text.match(/wordwall\.net\/resource\/(\d+)/i);
  const play = text.match(/wordwall\.net\/play\/(\d+\/\d+\/\d+)/i);
  const span = text.match(/<span>([^<]+)<\/span>/i);

  let themeId = "", templateId = "";
  if (embed) {
    const q = new URLSearchParams(decodeHtml(embed[2] || "").replace(/^\?/, ""));
    themeId = q.get("themeId") || "";
    templateId = q.get("templateId") || "";
    out.embed = embed[1] + (themeId ? `?themeId=${themeId}` : "");
  } else if (img) {
    out.embed = img[1];
  }
  if (img) out.thumb = `${img[1]}_${img[2]}`;
  else if (embed) out.thumb = `${embed[1]}_${themeId || 0}`;
  if (res) out.id = res[1];
  else if (embed || img) out.id = (embed || img)[1];
  if (play) out.play = play[1];
  if (span) out.title = decodeHtml(span[1]).replace(/\s*Copy of\b.*$/, "").trim();
  if (templateId) {
    const name = Object.keys(draft.templates).find(n => String(draft.templates[n].wordwallId) === templateId);
    if (name) out.game = name;
  }
  return out;
}

function openAdd(stripe) {
  const dlg = $("#dlg-add");
  dlg.innerHTML = `
    <form method="dialog" class="dlg-body">
      <h2>Add a game</h2>
      <ol class="steps">
        <li>On Wordwall, open the game and click <b>Share</b>, then <b>Embed</b>.</li>
        <li>Copy the code and paste it below. For the name and picture too, also paste the <b>Image &amp; link</b> code.</li>
      </ol>
      <label class="field"><span>Paste from Wordwall</span>
        <textarea name="paste" rows="4" placeholder="&lt;iframe src=&quot;https://wordwall.net/embed/…&quot;&gt;&lt;/iframe&gt;"></textarea></label>
      <div class="found" hidden></div>
      <div class="edit-top">
        <span class="edit-thumb-slot"></span>
        <label class="field grow"><span>Name</span><input name="title" dir="auto"></label>
      </div>
      <label class="field"><span>Game type</span><select name="game">${typeOptions("")}</select></label>
      <label class="field"><span>Instruction for this game (optional)</span>
        <textarea name="tip" rows="2" dir="auto" placeholder="Like: Tap the letters with a Patach."></textarea></label>
      <div class="field-row">
        <label class="field"><span>Belt</span><select name="belt">${beltOptions(beltKey)}</select></label>
        <label class="field"><span>Stripe</span><select name="stripe">${stripeOptions(stripe)}</select></label>
      </div>
      <p class="form-error" hidden></p>
      <div class="dlg-actions">
        <span class="spacer"></span>
        <button class="btn btn-ghost" value="cancel" formnovalidate>Cancel</button>
        <button class="btn btn-primary" data-act="add" type="button">Add game</button>
      </div>
    </form>`;

  const f = dlg.querySelector("form");
  let parsed = {};
  f.elements.paste.addEventListener("input", () => {
    parsed = parseWordwall(f.elements.paste.value);
    const found = f.querySelector(".found");
    const notes = [];
    if (parsed.embed) notes.push(`<li class="yes">Found the game. It will play inside the site.</li>`);
    else if (parsed.id) notes.push(`<li class="no">No Embed code yet. Without it, the game opens on Wordwall.</li>`);
    else notes.push(`<li class="no">No Wordwall game found in what you pasted.</li>`);
    if (parsed.game) notes.push(`<li class="yes">Game type: ${esc(parsed.game)}</li>`);
    const dupe = parsed.id && findGame(parsed.id);
    if (dupe) notes.push(`<li class="no">This game is already on the site: ${beltName(dupe.belt)} Belt, Stripe ${dupe.stripe}.</li>`);
    found.innerHTML = `<ul>${notes.join("")}</ul>`;
    found.hidden = !f.elements.paste.value.trim();
    if (parsed.title && !f.elements.title.value) f.elements.title.value = parsed.title;
    if (parsed.game) f.elements.game.value = parsed.game;
    f.querySelector(".edit-thumb-slot").innerHTML = parsed.thumb ? `<img class="edit-thumb" src="${esc(thumbUrl(parsed.thumb))}" alt="" onerror="this.remove()">` : "";
  });

  f.querySelector('[data-act="add"]').addEventListener("click", () => {
    const val = n => f.elements[n].value.trim();
    const errEl = f.querySelector(".form-error");
    const fail = msg => { errEl.textContent = msg; errEl.hidden = false; };
    if (!parsed.id) return fail("Paste the game's code from Wordwall first.");
    const dupe = findGame(parsed.id);
    if (dupe) return fail(`This game is already on the site: ${beltName(dupe.belt)} Belt, Stripe ${dupe.stripe}.`);
    if (!val("title")) return fail("Give the game a name.");
    if (!val("game")) return fail("Choose the game type.");

    const g = { id: parsed.id, title: val("title") };
    setTemplate(g, val("game"));
    for (const k of ["embed", "play", "thumb"]) if (parsed[k]) g[k] = parsed[k];
    if (val("tip")) g.tip = val("tip");
    const belt = val("belt"), s = Number(val("stripe"));
    list(belt, s).push(g);
    changed();
    beltKey = belt;
    dlg.close();
    render();
    toast(`Added "${g.title}" to ${beltName(belt)} Belt, Stripe ${s}.`, "good");
  });
  dlg.showModal();
}

// ---- Words tab --------------------------------------------------------------------

function wordsTab() {
  const groups = TEXT_FIELDS.map(([title, fields]) => `
    <section class="panel">
      <h3>${esc(title)}</h3>
      ${fields.map(([key, label]) => `
        <label class="field">
          <span>${esc(label)}</span>
          <input data-text="${key}" value="${esc(draft.text[key] || "")}" dir="auto">
          <small class="count" data-count="${key}"></small>
        </label>`).join("")}
    </section>`).join("");
  return `
    <p class="tab-help">Change any words students see. Keep them short and simple. To make a word bold, put two stars on each side, like <code>**Start**</code>.</p>
    ${groups}`;
}

function updateCount(key) {
  const el = main.querySelector(`[data-count="${key}"]`);
  if (!el) return;
  const words = (draft.text[key] || "").trim().split(/\s+/).filter(Boolean).length;
  el.textContent = words > 14 ? `${words} words. Can it be shorter?` : "";
}

// ---- How to play tab ----------------------------------------------------------------

function howToTab() {
  const counts = {};
  for (const b of BELTS) for (const s of STRIPES) for (const g of list(b.key, s)) counts[g.game] = (counts[g.game] || 0) + 1;
  const rows = templateNames().map(name => `
    <label class="field howto-row">
      <span>${esc(name)} <small>${counts[name] ? `${counts[name]} game${counts[name] === 1 ? "" : "s"}` : "not used yet"}</small></span>
      <input data-howto="${esc(name)}" value="${esc(draft.howTo[name] || "")}">
    </label>`).join("");
  return `
    <p class="tab-help">This is step 2 of How to play for each kind of Wordwall game. Keep it to one or two short sentences.</p>
    <section class="panel">${rows}</section>`;
}

// ---- Home page tab --------------------------------------------------------------------

function homeTab() {
  const h = draft.home || (draft.home = {});
  return `
    <p class="tab-help">Choose what shows on the home page. To change its words, use <b>Words on the site</b>.</p>
    <section class="panel">
      <label class="opt big"><input type="checkbox" data-home="showTiles"${h.showTiles !== false ? " checked" : ""}>
        <span><b>Letter tiles</b><br><small>The colored א–ט tiles. Each one opens its belt.</small></span></label>
      <label class="opt big"><input type="checkbox" data-home="showStats"${h.showStats !== false ? " checked" : ""}>
        <span><b>Numbers row</b><br><small>Games to play, games played and stars earned.</small></span></label>
    </section>`;
}

// ---- Admins tab (full admins only) --------------------------------------------------------

function adminsTab() {
  loadSubAdmins();
  return `
    <p class="tab-help">Sub-admins can do everything on this page: edit games and words, and publish. They can't add or remove admins.</p>
    <section class="panel">
      <h3>Add a sub-admin</h3>
      <form class="add-admin" id="add-admin">
        <label class="field grow"><span>Their Google email</span>
          <input type="email" name="email" placeholder="name@gmail.com" required autocomplete="off"></label>
        <button class="btn btn-primary" type="submit">Add</button>
      </form>
      <p class="form-error" id="admin-error" hidden></p>
    </section>
    <section class="panel">
      <h3>Sub-admins</h3>
      <ul class="admin-list" id="sub-admins"><li class="muted">Loading…</li></ul>
    </section>
    <section class="panel">
      <h3>Full admins</h3>
      <p class="muted">Full admins can also add and remove sub-admins. You're one of them. The list of full admins is kept in the Firebase security rules, so changing it is done there.</p>
    </section>`;
}

async function loadSubAdmins() {
  const { db, fsMod } = await firebase();
  let items;
  try {
    const snap = await fsMod.getDocs(fsMod.collection(db, "editors"));
    items = snap.docs.map(d => ({ email: d.id, ...d.data() })).sort((a, b) => a.email.localeCompare(b.email));
  } catch {
    const el = $("#sub-admins");
    if (el) el.innerHTML = `<li class="muted">Couldn't load the list. Reload the page to try again.</li>`;
    return;
  }
  const el = $("#sub-admins");
  if (!el) return;
  el.innerHTML = items.length ? items.map(a => `
    <li>
      <span class="admin-email">${esc(a.email)}</span>
      <span class="muted">${a.addedBy ? `Added by ${esc(a.addedBy)}` : ""}</span>
      <button class="btn btn-danger small" data-remove-admin="${esc(a.email)}" type="button">Remove</button>
    </li>`).join("") : `<li class="muted">No sub-admins yet.</li>`;
}

async function addSubAdmin(email) {
  const errEl = $("#admin-error");
  errEl.hidden = true;
  email = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { errEl.textContent = "That doesn't look like an email address."; errEl.hidden = false; return false; }
  if (email === user.email.toLowerCase()) { errEl.textContent = "You're already a full admin."; errEl.hidden = false; return false; }
  try {
    const { db, fsMod } = await firebase();
    await fsMod.setDoc(fsMod.doc(db, "editors", email), { addedBy: user.email, addedAt: fsMod.serverTimestamp() });
  } catch (err) {
    errEl.textContent = err.code === "permission-denied" ? "Only full admins can add sub-admins." : "Couldn't add them. Try again.";
    errEl.hidden = false;
    return false;
  }
  toast(`${email} is now a sub-admin. They can sign in with Google.`, "good");
  loadSubAdmins();
  return true;
}

async function removeSubAdmin(email) {
  if (!confirm(`Remove ${email} as a sub-admin? They won't be able to edit the site anymore.`)) return;
  try {
    const { db, fsMod } = await firebase();
    await fsMod.deleteDoc(fsMod.doc(db, "editors", email));
  } catch {
    toast("Couldn't remove them. Try again.", "bad");
    return;
  }
  toast(`Removed ${email}.`);
  loadSubAdmins();
}

main.addEventListener("submit", async e => {
  if (e.target.id !== "add-admin") return;
  e.preventDefault();
  if (await addSubAdmin(e.target.elements.email.value)) e.target.reset();
});

// ---- page -------------------------------------------------------------------------------

function render() {
  document.querySelectorAll(".admin-tabs [data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  if (tab === "admins" && !isFullAdmin) tab = "games";
  main.innerHTML = { games: gamesTab, words: wordsTab, howto: howToTab, home: homeTab, admins: adminsTab }[tab]();
  if (tab === "words") TEXT_FIELDS.forEach(([, f]) => f.forEach(([k]) => updateCount(k)));
  showStatus();
}

main.addEventListener("click", e => {
  const chip = e.target.closest(".belt-chip");
  if (chip) { beltKey = chip.dataset.belt; render(); return; }
  const edit = e.target.closest("[data-edit]");
  if (edit) { openEdit(edit.dataset.edit); return; }
  const add = e.target.closest("[data-add]");
  if (add) { openAdd(Number(add.dataset.add)); return; }
  const remove = e.target.closest("[data-remove-admin]");
  if (remove) { removeSubAdmin(remove.dataset.removeAdmin); return; }
  const row = e.target.closest(".row");
  if (row && !e.target.closest("button")) openEdit(list(beltKey, Number(row.dataset.stripe))[Number(row.dataset.index)].id);
});

main.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.text) { draft.text[t.dataset.text] = t.value; updateCount(t.dataset.text); changed(); }
  else if (t.dataset.howto) { draft.howTo[t.dataset.howto] = t.value; changed(); }
});

main.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.home) { draft.home[t.dataset.home] = t.checked; changed(); }
});

document.querySelector(".admin-tabs").addEventListener("click", e => {
  const b = e.target.closest("[data-tab]");
  if (b) { tab = b.dataset.tab; render(); window.scrollTo(0, 0); }
});

$("#btn-save").addEventListener("click", publish);
$("#btn-account").addEventListener("click", signOutNow);
$("#gate-signin").addEventListener("click", signIn);
$("#gate-signout").addEventListener("click", signOutNow);
$("#btn-preview").addEventListener("click", () => {
  local.set("admin-draft", JSON.stringify(draft));
  window.open("./?preview#/", "aleph-preview");
});
$("#btn-discard").addEventListener("click", () => {
  if (!confirm("Undo all changes since the last publish?")) return;
  draft = JSON.parse(published);
  changed();
  render();
  toast("Changes undone.");
});

window.addEventListener("beforeunload", e => {
  if (draft && isDirty()) { e.preventDefault(); e.returnValue = ""; }
});

// ---- start ----------------------------------------------------------------------------------

async function openEditor() {
  gate("Loading…");
  let live;
  try {
    live = await fetchSiteData();
  } catch {
    gate("Couldn't load the site. Check the internet connection and reload.", { signOut: true });
    return;
  }
  published = JSON.stringify(live);
  draft = live;

  const saved = local.get("admin-draft");
  if (saved && saved !== published) {
    try {
      const old = JSON.parse(saved);
      if (confirm("You have changes that weren't published yet. Keep working on them?\n\nOK keeps them. Cancel starts from the live site.")) draft = old;
    } catch { /* ignore a broken draft */ }
  }
  document.body.classList.remove("locked");
  changed();
  render();
}

if (firebaseReady()) {
  firebase().catch(() => gate("Couldn't load Google sign-in. Check the internet connection and reload."));
} else {
  gate("Admin sign-in isn't set up yet. See the setup steps in README.md.");
}
