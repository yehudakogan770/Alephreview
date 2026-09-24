// Aleph Review admin page.
//
// Edits the site data (all words, settings and games) and publishes it to
// Firebase. The page stays locked until an admin signs in with Google.
// Two kinds of admin (see the security rules in README.md):
//  - full admins, listed in the Firebase rules: can do everything, including
//    adding and removing sub-admins on the Admins tab;
//  - sub-admins, stored in Firestore under editors/{email}: can do everything
//    except manage admins.

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
  ["Homework (what students see)", [
    ["homeworkButton", "Button at the top of the site"],
    ["homeworkTitle", "Homework page title"],
    ["homeworkSignIn", "Asks students to sign in"],
    ["signInButton", "Sign-in button"],
    ["homeworkNone", "When there's no homework"],
    ["homeworkDue", "Due date. {date} becomes the date."],
    ["homeworkDone", "Label for a finished game"],
    ["homeworkTypeName", "Reminder above a scored game. {name} becomes the student's first name."],
    ["homeworkBack", "Back button on a homework game"],
  ]],
  ["Games made here (what students see)", [
    ["gameStart", "Start button"],
    ["gameSoundButton", "Tip on the sound button"],
    ["gameMusicButton", "Tip on the music button"],
    ["gameRound", "Round number. {n} and {total} become numbers."],
    ["gameQuestion", "Question number. {n} and {total} become numbers."],
    ["gameScore", "Score. {right} and {total} become numbers."],
    ["gamePassMark", "Pass mark on the start screen. {pass} becomes the percent."],
    ["gamePassed", "When the pass mark is reached"],
    ["gameNotPassed", "When it isn't. {pass} becomes the percent."],
    ["gameTryAgain", "Try again button"],
    ["gameNext", "Next game button"],
    ["gameSubmit", "Submit button"],
    ["gameSubmitAnyway", "When boxes are still empty"],
    ["gameCheck", "Check button"],
    ["gameDone", "Done button"],
    ["gameNextRound", "Next round button"],
    ["gameSeeScore", "Button after the last round"],
    ["gameShowAnswers", "Show answers button"],
    ["gameAnswers", "Title over the answers"],
    ["gameAllDone", "End of a game with no score (cards, wheels)"],
    ["gamePlayAgain", "Play again button"],
    ["gameFind", "Before the thing to find"],
    ["gameIsIt", "Question in Right or wrong"],
    ["gameTrue", "Yes button"],
    ["gameFalse", "No button"],
    ["gameTimeUp", "When the clock runs out"],
    ["gamePoints", "Points. {points} becomes a number."],
    ["gamePickPoints", "Win or lose: before picking points"],
    ["gameHalf", "Game show help: take away 2 wrong answers"],
    ["gameSecondTry", "Game show help: another try"],
    ["gameGoesIn", "Sorting: question over each item"],
    ["gameWatch", "Watch and remember: first step"],
    ["gamePickSeen", "Watch and remember: second step"],
    ["gameSpin", "Spin button"],
    ["gameOpen", "Open a box: what to do"],
    ["gameFlip", "Flip cards: what to do"],
    ["gameDeal", "Pick a card: next card button"],
    ["gameShuffle", "Shuffle button"],
    ["gameRemove", "Take a card or slice out"],
    ["gameCardsLeft", "Cards left. {n} becomes a number."],
  ]],
  ["Phones", [
    ["turnPhone", "Tip on game pages when a phone is held upright"],
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

function firebaseReady() { return cloudReady(); }

// Firebase (js/cloud.js), watching who is signed in.
async function firebase() {
  if (fb) return fb;
  const c = await cloud();
  if (!fb) { fb = c; c.authMod.onAuthStateChanged(c.auth, onAuth); }
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
    await firebase();
    await googleSignIn();
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

function templateNames() { return Object.keys(draft.templates).filter(n => !draft.templates[n].own).sort((a, b) => a.localeCompare(b)); }

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
        <span class="row-thumb${g.own ? " own" : ""}">${g.thumb ? `<img src="${esc(thumbUrl(g.thumb))}" alt="" loading="lazy" onerror="this.remove()">` : g.own ? `<b dir="auto">${esc(ownSample(g.own))}</b>` : ""}</span>
        <span class="row-text">
          <span class="row-title" dir="auto">${esc(g.title)}</span>
          <span class="row-meta">${g.own ? `Made here · ${esc(g.game)} · ${ownCount(g)}` : `${esc(g.game || "No game type")}${g.tip ? " · has instruction" : ""}${g.embed ? "" : " · opens on Wordwall"}`}</span>
        </span>
        ${g.hidden ? `<span class="badge">Hidden</span>` : ""}
        <button class="icon-btn small" data-edit="${esc(g.id)}" title="Edit" aria-label="Edit ${esc(g.title)}">✎</button>
      </li>`).join("");
    return `
      <section class="stripe-col">
        <header>
          <h3>Stripe ${s} <span class="n">${games.length}</span></h3>
          <span class="col-actions">
            <button class="btn btn-primary small" data-make="${s}" title="Make a game on this site. It can check passing for homework.">+ Make a game</button>
            <button class="btn btn-ghost small" data-add="${s}" title="Add a game from Wordwall">+ Add game</button>
          </span>
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
  if (g.own) { openMake(where.stripe, where); return; }
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

// ---- games made on this site -------------------------------------------------------
//
// Each kind has a content editor. The game itself is in js/games/<kind>.js.

// Scenes behind games made here (drawn in js/games/themes.js).
const GAME_THEMES = [["meadow", "Meadow"], ["desert", "Desert"], ["ocean", "Ocean"], ["space", "Space"], ["classic", "Classic"]];

function ownKinds() {
  return Object.entries(draft.templates).filter(([, t]) => t.own).map(([name, t]) => ({ name, kind: t.own }));
}

// A short bit of a game made here, shown as its picture in the list.
function ownSample(o) {
  const all = [...(o.pairs || []).map(p => p.a), ...(o.questions || []).map(q => q.answers[0]),
    ...(o.groups || []).flatMap(g => g.items), ...(o.items || [])];
  return all.find(x => x && x.length <= 4 && /[\u0590-\u05FF]/.test(x)) || all.find(x => x && x.length <= 4) || (o.kind || "").slice(0, 1).toUpperCase();
}

function ownCount(g) {
  const o = g.own || {};
  const n = (x, one, many) => `${x} ${x === 1 ? one : many}`;
  if (o.pairs) return n(o.pairs.length, "pair", "pairs");
  if (o.questions) return n(o.questions.length, "question", "questions");
  if (o.groups) return n(o.groups.length, "group", "groups");
  if (o.sentences) return n(o.sentences.length, "line", "lines");
  if (o.items) return n(o.items.length, "item", "items");
  return "";
}

// Content comes in a few shapes. Each shape is edited as rows with a few
// columns, and can be pasted in many at once (one row per line).
const split = v => String(v || "").split(",").map(x => x.trim()).filter(Boolean);
const SHAPES = {
  // { pairs: [{ a, b }] }
  pairs: {
    toRows: c => (c.pairs || []).map(p => [p.a, p.b]),
    fromRows(rows, ed) {
      if (rows.some(r => !r[0] || !r[1])) return { error: "Every row needs both sides filled in." };
      // In games where students look for a word, each word must be different.
      const seen = new Set();
      if (ed.unique) for (const [a, b] of rows) {
        if (seen.has(b)) return { error: `"${b}" is used twice. Each one must be different.` };
        seen.add(b);
      }
      return { content: { pairs: rows.map(([a, b]) => ({ a, b })) } };
    },
  },
  // { questions: [{ q, answers: [right, wrong, …] }] }
  quiz: {
    toRows: c => (c.questions || []).map(q => [q.q, q.answers.slice(0, q.right || 1).join(", "), q.answers.slice(q.right || 1).join(", ")]),
    fromRows(rows) {
      for (const [q, right, wrong] of rows) {
        if (!q || !split(right).length) return { error: "Every question needs the question and the right answer." };
        if (!split(wrong).length) return { error: `"${q}" needs at least one wrong answer.` };
      }
      // Several right answers can go in, with commas.
      return { content: { questions: rows.map(([q, right, wrong]) => {
        const r = split(right).slice(0, 3);
        return { q, answers: [...r, ...split(wrong).slice(0, 6 - r.length)], ...(r.length > 1 ? { right: r.length } : {}) };
      }) } };
    },
  },
  // { statements: [{ a, b, right }] }  (Right or wrong with fixed answers)
  statements: {
    toRows: c => (c.statements || []).map(x => [x.a, x.b, x.right ? "yes" : "no"]),
    fromRows(rows) {
      const bad = rows.find(r => !r[0] || !r[1] || !/^(yes|no)$/i.test(r[2] || ""));
      if (bad) return { error: "Every row needs both sides, and yes or no." };
      return { content: { statements: rows.map(([a, b, r]) => ({ a, b, right: /^yes$/i.test(r) })) } };
    },
  },
  // { groups: [{ name, items: [] }] }
  groups: {
    toRows: c => (c.groups || []).map(g => [g.name, g.items.join(", ")]),
    fromRows(rows) {
      if (rows.some(r => !r[0] || !split(r[1]).length)) return { error: "Every group needs a name and at least one item." };
      return { content: { groups: rows.map(([name, items]) => ({ name, items: split(items) })) } };
    },
  },
  // { items: [] }
  list: {
    toRows: c => (c.items || []).map(x => [x]),
    fromRows: rows => ({ content: { items: rows.map(r => r[0]) } }),
  },
  // { sentences: ["א ב [ג] ד"] }  [ ] marks the missing parts
  sentences: {
    toRows: c => (c.sentences || []).map(x => [x]),
    fromRows(rows) {
      const bad = rows.find(r => !/\[[^\]]+\]/.test(r[0]));
      if (bad) return { error: `Put [ ] around the missing part in: ${bad[0]}` };
      return { content: { sentences: rows.map(r => r[0]) } };
    },
  },
};

// One editor per kind: which shape, the column names, and how many rows.
const pairsEd = (help, a, b, min = 3) => ({ shape: "pairs", help, cols: [[a, "א"], [b, "Alef"]], min, pasteHint: "א = Alef" });
const uniqueEd = (...a) => ({ ...pairsEd(...a), unique: true });
const quizEd = help => ({ shape: "quiz", help, cols: [["Question", "Which one is Beis?"], ["Right answer", "בּ"], ["Wrong answers, with commas", "ב, כ, פ"]], min: 2, pasteHint: "Which one is Beis? | בּ | ב, כ, פ" });
const groupsEd = (help, max) => ({ shape: "groups", help, cols: [["Group", "Beis"], ["What goes in it, with commas", "בּ, בָּ, בַּ"]], min: 2, max, pasteHint: "Beis | בּ, בָּ, בַּ\nVeis | ב, בָ, בַ" });
const CONTENT_EDITORS = {
  match: pairsEd("Each pair: a colorful tile the student drags, and the word it goes next to. Like א and Alef. More than 6 are split into rounds.", "Tile (dragged)", "Goes next to"),
  pairs: pairsEd("Each pair becomes two cards, face down. Students flip two at a time to find the pairs. More than 6 are split into rounds.", "Card", "Its match"),
  find: uniqueEd("Students see the right side and tap the tile with the left side. More than 8 are split into rounds.", "Tile to find", "What students see"),
  truefalse: pairsEd("Students see a pair and say if it's right. Sometimes the site mixes up a pair on purpose. The right side can repeat, like Kamatz and Patach.", "Tile", "Its match"),
  quiz: quizEd("Each question has a right answer (or a few, with commas) and wrong ones: up to 6 answers in all. The answers are mixed up for students."),
  gameshow: quizEd("Like a quiz, with a clock for each question and 2 helps: 50 : 50 and Second try."),
  winlose: quizEd("Like a quiz, but students pick how many points to play for before each question."),
  sort: groupsEd("2 to 4 groups. Students drag each tile into its group. A wrong drop bounces back.", 4),
  speedsort: groupsEd("2 groups. Tiles come one at a time and students pick a side, fast.", 2),
  categorize: groupsEd("2 to 4 groups, shown as columns. Students fill them, then press Submit.", 4),
  order: { shape: "list", help: "Type them in the right order, first to last. Students see them mixed up. More than 8 are split into rounds.", cols: [["In order, first to last", "א"]], min: 3 },
  anagram: { shape: "list", help: "One word on each row. Students see its letters mixed up and put them in order. Letters keep their vowels.", cols: [["Word", "שָׁלוֹם"]], min: 1 },
  gaps: { shape: "sentences", help: "Put [ ] around each missing part, like: א ב [ג] ד. Students drag the missing parts into the gaps.", cols: [["Line, with [ ] around the missing parts", "א בּ [ג] ד [ה]"]], min: 1 },
  balloon: pairsEd("Each pair: the tile on the balloon, and the word on its cart. Up to 4 carts a round.", "On the balloon", "On the cart", 2),
  fruit: uniqueEd("Each pair: what's on the fruit, and the word students look for.", "On the fruit", "Word to find", 2),
  whack: uniqueEd("Each pair: the tile that pops up, and the word students look for. Up to 6 words.", "Pops up", "Word to find", 2),
  plane: uniqueEd("Each pair: what's in the cloud, and the word students look for.", "In the cloud", "Word to find", 2),
  watch: { shape: "list", help: "Tiles to remember. Students see 4, then find them among others. Use at least 8.", cols: [["Tile", "א"]], min: 4 },
  spin: { shape: "list", help: "What's on the wheel (up to 16). No score, so it can't be homework.", cols: [["On the wheel", "בָּ"]], min: 2 },
  openbox: { shape: "list", help: "What's in the boxes (up to 24). No score, so it can't be homework.", cols: [["In a box", "בָּ"]], min: 2 },
  flip: pairsEd("Each card: the front, and the back (shown when it's flipped). No score, so it can't be homework.", "Front", "Back", 1),
  spinquiz: quizEd("Each question goes on the wheel (up to 16). Students spin, then answer it."),
  boxquiz: quizEd("Each question goes in a box (up to 24). Students open a box, then answer it."),
  deal: { shape: "list", help: "The cards in the deck. No score, so it can't be homework.", cols: [["Card", "שָׁם"]], min: 2 },
  label: pairsEd("Each row: a big part on the board (like a letter) and its label. Keep them in order: they show right to left. Up to 6 a round.", "Big part", "Label", 2),
};

// Some games use a different kind of content than their type's usual editor
// (games copied from Wordwall): fixed statements, or "hit these" groups.
const VARIANT_EDITORS = {
  truefalse: { when: c => c && c.statements, ed: { shape: "statements", help: "Each row: a tile, a word, and if they match (yes or no).", cols: [["Tile", "בּ"], ["Word", "Bet"], ["Right? yes or no", "yes"]], min: 2, pasteHint: "בּ | Bet | yes" } },
  fruit: { when: c => c && c.questions, ed: quizEd("Each question: what students look for, the right answer (or a few, with commas), and wrong answers.") },
  plane: { when: c => c && c.questions, ed: quizEd("Each question: what students fly to, the right answer (or a few, with commas), and wrong answers.") },
  whack: { when: c => c && c.groups, ed: { shape: "groups", help: "The first group is the tiles to hit. The other groups pop up too, but shouldn't be hit.", cols: [["Group", "Fay"], ["Tiles, with commas", "פ, פ, פ"]], min: 2, pasteHint: "Fay | פ, פ, פ\nPay | פּ, פּ" } },
};
let editingContent = null; // the content of the game open in the maker
function editorOf(kind) {
  const v = VARIANT_EDITORS[kind];
  return v && v.when(editingContent) ? v.ed : CONTENT_EDITORS[kind];
}

function contentEditorHtml(kind, content) {
  const ed = editorOf(kind);
  const rows = content && SHAPES[ed.shape].toRows(content);
  const list = rows && rows.length ? rows : [...Array(ed.min || 1)].map(() => ed.cols.map(() => ""));
  return `
    <div class="rows-editor" data-rows style="--cols:${ed.cols.length}">
      <div class="rows-head">${ed.cols.map(([label]) => `<span>${esc(label)}</span>`).join("")}<span></span></div>
      ${list.map(r => contentRow(ed, r)).join("")}
    </div>
    <div class="pairs-tools">
      <button class="btn btn-ghost small" type="button" data-add-row>+ Add a row</button>
      <details class="paste-many">
        <summary>Paste many at once</summary>
        <textarea rows="5" data-paste dir="auto" placeholder="${esc(ed.pasteHint || ed.cols.map(c => c[1]).join(" | "))}"></textarea>
        <button class="btn btn-ghost small" type="button" data-apply-paste>Add these</button>
      </details>
    </div>`;
}

function contentRow(ed, r = []) {
  return `
    <div class="content-row">
      ${ed.cols.map(([, ph], i) => `<input data-col="${i}" value="${esc(r[i] || "")}" dir="auto" placeholder="${esc(ph)}">`).join("")}
      <button class="icon-btn small" type="button" data-del-row title="Remove">✕</button>
    </div>`;
}

// Pasted lines: columns split by | or a tab (two columns can also use =).
function parseRows(text, ed) {
  const n = ed.cols.length;
  return String(text).split(/\n+/).map(line => line.trim()).filter(Boolean).map(line => {
    if (n === 1) return [line];
    let parts = line.split(/\s*(?:\||\t)\s*/);
    if (parts.length < 2 && n === 2) parts = line.split(/\s*(?:=| - |→|,)\s*/);
    if (parts.length < 2) return null;
    return [...parts.slice(0, n - 1), parts.slice(n - 1).join(n === 2 ? " " : ", ")].map(x => x.trim());
  }).filter(Boolean);
}

function readContent(form, kind) {
  const ed = editorOf(kind);
  const rows = [...form.querySelectorAll(".content-row")]
    .map(r => [...r.querySelectorAll("[data-col]")].map(i => i.value.trim()))
    .filter(r => r.some(Boolean));
  const min = ed.min || 1;
  if (rows.length < min) return { error: `Add at least ${min} ${min === 1 ? "row" : "rows"}.` };
  if (ed.max && rows.length > ed.max) return { error: `Use at most ${ed.max} rows.` };
  const res = SHAPES[ed.shape].fromRows(rows, ed);
  if (res.content) res.content.kind = kind;
  return res;
}

// Wire up the buttons inside a content editor.
function bindContentEditor(form, getKind) {
  form.addEventListener("click", e => {
    const ed = editorOf(getKind());
    if (e.target.closest("[data-add-row]")) {
      form.querySelector("[data-rows]").insertAdjacentHTML("beforeend", contentRow(ed));
      form.querySelector(".content-row:last-child [data-col]").focus();
    }
    const del = e.target.closest("[data-del-row]");
    if (del) del.closest(".content-row").remove();
    if (e.target.closest("[data-apply-paste]")) {
      const box = form.querySelector("[data-paste]");
      const found = parseRows(box.value, ed);
      if (!found.length) { toast(ed.cols.length > 1 ? "Nothing found. Put | between the parts, one row per line." : "Nothing found. Put one on each line.", "bad"); return; }
      form.querySelectorAll(".content-row").forEach(r => {
        if (![...r.querySelectorAll("[data-col]")].some(i => i.value.trim())) r.remove();
      });
      form.querySelector("[data-rows]").insertAdjacentHTML("beforeend", found.map(r => contentRow(ed, r)).join(""));
      box.value = "";
      toast(`Added ${found.length}.`);
    }
  });
}

// Make a new game, or edit one made here. `where` is set when editing.
function openMake(stripe, where) {
  const g = where ? where.game : null;
  const kinds = ownKinds().filter(k => CONTENT_EDITORS[k.kind]);
  if (!kinds.length) { toast("Game types didn't load. Please reload the page.", "bad"); return; }
  const kindName = g ? g.game : kinds[0].name;
  let kind = (draft.templates[kindName] || {}).own || kinds[0].kind;
  editingContent = g ? g.own : null;
  const dlg = $("#dlg-game");
  dlg.innerHTML = `
    <form method="dialog" class="dlg-body">
      <h2>${g ? "Edit game" : "Make a game"}</h2>
      <div class="field-row">
        <label class="field grow"><span>Name</span><input name="title" value="${esc(g ? g.title : "")}" dir="auto" placeholder="Letters א to ו" required></label>
        <label class="field"><span>Game type</span><select name="kind"${g ? " disabled" : ""}>${kinds.map(k => `<option value="${esc(k.name)}"${k.name === kindName ? " selected" : ""}>${esc(k.name)}</option>`).join("")}</select></label>
      </div>
      <p class="hint" data-kind-help>${esc(editorOf(kind).help)}</p>
      <div class="field"><span>Theme</span>
        <div class="theme-pick">${GAME_THEMES.map(([k, name]) => `
          <label class="theme-opt theme-${k}"><input type="radio" name="theme" value="${k}"${k === ((g && g.own && g.own.theme) || "meadow") ? " checked" : ""}><span>${name}</span></label>`).join("")}
        </div></div>
      <div data-content>${contentEditorHtml(kind, g && g.own)}</div>
      <label class="field"><span>Instruction for this game (optional)</span>
        <textarea name="tip" rows="2" dir="auto" placeholder="Like: Match each letter to its name.">${esc(g && g.tip || "")}</textarea></label>
      <div class="field-row">
        <label class="field"><span>Belt</span><select name="belt">${beltOptions(where ? where.belt : beltKey)}</select></label>
        <label class="field"><span>Stripe</span><select name="stripe">${stripeOptions(where ? where.stripe : stripe)}</select></label>
      </div>
      ${g ? `<label class="opt"><input type="checkbox" name="hidden"${g.hidden ? " checked" : ""}> Hide this game from students</label>` : ""}
      <p class="form-error" hidden></p>
      <div class="dlg-actions">
        ${g ? `<button class="btn btn-danger" data-act="delete" type="button">Delete game</button>` : ""}
        <span class="spacer"></span>
        <button class="btn btn-ghost" value="cancel" formnovalidate>Cancel</button>
        <button class="btn btn-ghost" data-act="try" type="button">Save and try it</button>
        <button class="btn btn-primary" data-act="save" type="button">${g ? "Save" : "Add game"}</button>
      </div>
    </form>`;
  const f = dlg.querySelector("form");
  bindContentEditor(f, () => kind);
  f.elements.kind.addEventListener("change", () => {
    const next = draft.templates[f.elements.kind.value].own;
    // Keep what was typed when the new type uses the same kind of content.
    const same = CONTENT_EDITORS[next].shape === editorOf(kind).shape;
    const kept = same ? readContent(f, kind).content : null;
    kind = next;
    editingContent = null;
    f.querySelector("[data-kind-help]").textContent = editorOf(kind).help;
    f.querySelector("[data-content]").innerHTML = contentEditorHtml(kind, kept);
  });
  const fail = msg => { const el = f.querySelector(".form-error"); el.textContent = msg; el.hidden = false; };

  function save() {
    const title = f.elements.title.value.trim();
    if (!title) { fail("Give the game a name."); return null; }
    const res = readContent(f, kind);
    if (res.error) { fail(res.error); return null; }
    const tip = f.elements.tip.value.trim();
    const belt = f.elements.belt.value, s = Number(f.elements.stripe.value);
    let game = g;
    if (!game) {
      game = { id: `own-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title };
      setTemplate(game, f.elements.kind.value);
      list(belt, s).push(game);
    }
    game.title = title;
    // Keep settings the editor doesn't show (reading aloud, the whack instruction).
    const keep = {};
    for (const k of ["speak", "speech", "prompt"]) if (g && g.own && g.own[k] !== undefined && g.own.kind === res.content.kind) keep[k] = g.own[k];
    game.own = { ...keep, ...res.content, theme: (f.querySelector("input[name=theme]:checked") || {}).value || "meadow" };
    if (tip) game.tip = tip; else delete game.tip;
    if (g) {
      if (f.elements.hidden.checked) game.hidden = true; else delete game.hidden;
      if (belt !== where.belt || s !== where.stripe) moveGame(where, { belt, stripe: s }, list(belt, s).length);
    }
    changed();
    beltKey = belt;
    dlg.close();
    render();
    return { game, belt, stripe: s };
  }

  f.querySelector('[data-act="save"]').addEventListener("click", () => {
    const r = save();
    if (r) toast(g ? `Saved "${r.game.title}".` : `Made "${r.game.title}". Press Save & publish when you're ready.`, "good");
  });
  f.querySelector('[data-act="try"]').addEventListener("click", () => {
    const r = save();
    if (!r) return;
    local.set("admin-draft", JSON.stringify(draft));
    window.open(`./?preview#/${r.belt}/${r.stripe}/play/${encodeURIComponent(r.game.id)}`, "aleph-preview");
  });
  f.querySelector('[data-act="delete"]')?.addEventListener("click", () => {
    if (!confirm(`Delete "${g.title}"? To keep it but not show it, use "Hide this game" instead.`)) return;
    list(where.belt, where.stripe).splice(where.index, 1);
    changed();
    dlg.close();
    render();
    toast(`Deleted "${g.title}".`);
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
      <h3>Add sub-admins</h3>
      <form id="add-admin">
        <label class="field"><span>Google emails of teachers</span>
          <textarea name="emails" rows="4" placeholder="one@school.org&#10;two@gmail.com" autocomplete="off"></textarea>
          <small>Paste one or many. Any list works: one per line, or with commas.</small></label>
        <div class="import-row">
          <button class="btn btn-primary" type="submit">Add</button>
          <label class="btn btn-ghost file-btn">Import a file…<input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" data-import="admins" hidden></label>
          <small class="muted">A CSV or text file, like a Google Workspace user export. Every email in it is added.</small>
        </div>
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

// Every email address found in pasted text or a file, lowercased, no repeats.
function findEmails(text) {
  return [...new Set((String(text).match(/[^\s,;<>"'()\[\]]+@[^\s,;<>"'()\[\]]+\.[a-z]{2,}/gi) || []).map(e => e.toLowerCase()))];
}

async function addSubAdmins(text) {
  const errEl = $("#admin-error");
  errEl.hidden = true;
  const me = user.email.toLowerCase();
  const emails = findEmails(text).filter(e => e !== me);
  if (!emails.length) { errEl.textContent = "No email addresses found."; errEl.hidden = false; return false; }
  try {
    const { db, fsMod } = await firebase();
    // Firestore writes up to 500 changes at once.
    for (let i = 0; i < emails.length; i += 400) {
      const batch = fsMod.writeBatch(db);
      for (const e of emails.slice(i, i + 400)) batch.set(fsMod.doc(db, "editors", e), { addedBy: user.email, addedAt: fsMod.serverTimestamp() });
      await batch.commit();
    }
  } catch (err) {
    errEl.textContent = err.code === "permission-denied" ? "Only full admins can add sub-admins." : "Couldn't add them. Try again.";
    errEl.hidden = false;
    return false;
  }
  toast(emails.length === 1 ? `${emails[0]} is now a sub-admin.` : `Added ${emails.length} sub-admins.`, "good");
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
  if (await addSubAdmins(e.target.elements.emails.value)) e.target.reset();
});

// ---- Homework tab (all admins) --------------------------------------------------------------
//
// classes/{id}:  { name, students: [emails] }
// homework/{id}: { title, classId, className, students, due: "YYYY-MM-DD",
//                  items: [{ game, assign }] }   (assign: Wordwall assignment link)
// progress/{hw}__{email}: written by students' browsers while they play.

let hwData = { classes: [], homework: [] };

function allGamesFlat() {
  const out = [];
  for (const b of BELTS) for (const s of STRIPES) for (const g of list(b.key, s)) out.push({ g, b, s });
  return out;
}

function gameById(id) { return allGamesFlat().find(x => x.g.id === id); }

async function loadHomeworkData() {
  const { db, fsMod } = await firebase();
  const [c, h] = await Promise.all([
    fsMod.getDocs(fsMod.collection(db, "classes")),
    fsMod.getDocs(fsMod.collection(db, "homework")),
  ]);
  hwData.classes = c.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  hwData.homework = h.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.due || "").localeCompare(String(a.due || "")));
}

function homeworkTab() {
  refreshHomework();
  return `
    <p class="tab-help">Give a class homework: pick games made on this site, a passing score and a due date. Students sign in with Google and see only their homework. A game counts as done when the student passes it.</p>
    <section class="panel wide-panel">
      <div class="panel-head"><h3>Homework</h3><button class="btn btn-primary small" data-hw-new>+ New homework</button></div>
      <div id="hw-list"><p class="muted">Loading…</p></div>
    </section>
    <section class="panel wide-panel">
      <div class="panel-head"><h3>Classes</h3><button class="btn btn-ghost small" data-class-new>+ New class</button></div>
      <div id="class-list"><p class="muted">Loading…</p></div>
    </section>`;
}

async function refreshHomework() {
  try { await loadHomeworkData(); } catch {
    const el = $("#hw-list");
    if (el) el.innerHTML = `<p class="muted">Couldn't load homework. Reload the page to try again.</p>`;
    return;
  }
  const hwEl = $("#hw-list"), clEl = $("#class-list");
  if (!hwEl || !clEl) return;
  hwEl.innerHTML = hwData.homework.length ? `
    <table class="hw-table">
      <thead><tr><th>Homework</th><th>Class</th><th>Due</th><th>Games</th><th></th></tr></thead>
      <tbody>${hwData.homework.map(h => `
        <tr>
          <td><b dir="auto">${esc(h.title)}</b></td>
          <td>${esc(h.className || "")}</td>
          <td>${esc(h.due || "")}</td>
          <td>${(h.items || []).length}</td>
          <td class="actions">
            <button class="btn btn-primary small" data-hw-results="${esc(h.id)}">Who did it</button>
            <button class="btn btn-ghost small" data-hw-edit="${esc(h.id)}">Edit</button>
          </td>
        </tr>`).join("")}</tbody>
    </table>` : `<p class="muted">No homework yet.${hwData.classes.length ? "" : " Start by making a class."}</p>`;
  clEl.innerHTML = hwData.classes.length ? `
    <ul class="admin-list">${hwData.classes.map(c => `
      <li>
        <span class="admin-email">${esc(c.name)}</span>
        <span class="muted">${(c.students || []).length} students</span>
        <button class="btn btn-ghost small" data-class-edit="${esc(c.id)}">Edit</button>
      </li>`).join("")}</ul>` : `<p class="muted">No classes yet.</p>`;
}

function hwDialog(html) {
  const dlg = $("#dlg-hw");
  dlg.innerHTML = `<form method="dialog" class="dlg-body">${html}</form>`;
  dlg.showModal();
  return dlg.querySelector("form");
}

function formError(f, msg) {
  const el = f.querySelector(".form-error");
  el.textContent = msg;
  el.hidden = false;
}

// -- classes --

function openClass(id) {
  const c = hwData.classes.find(x => x.id === id) || { name: "", students: [] };
  const f = hwDialog(`
    <h2>${id ? "Edit class" : "New class"}</h2>
    <label class="field"><span>Class name</span><input name="name" value="${esc(c.name)}" placeholder="Grade 2 — Morning" required></label>
    <label class="field"><span>Students' Google emails</span>
      <textarea name="students" rows="8" placeholder="one per line, or paste a list">${esc((c.students || []).join("\n"))}</textarea>
      <small class="muted" data-count></small></label>
    <label class="btn btn-ghost small file-btn">Import a file…<input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" data-import="class" hidden></label>
    <p class="form-error" hidden></p>
    <div class="dlg-actions">
      ${id ? `<button class="btn btn-danger" type="button" data-act="delete">Delete class</button>` : ""}
      <span class="spacer"></span>
      <button class="btn btn-ghost" value="cancel" formnovalidate>Cancel</button>
      <button class="btn btn-primary" type="button" data-act="save">Save</button>
    </div>`);
  const count = () => { f.querySelector("[data-count]").textContent = `${findEmails(f.elements.students.value).length} emails found`; };
  f.elements.students.addEventListener("input", count);
  count();

  f.querySelector('[data-act="save"]').addEventListener("click", async () => {
    const name = f.elements.name.value.trim();
    const students = findEmails(f.elements.students.value);
    if (!name) return formError(f, "Give the class a name.");
    if (!students.length) return formError(f, "Add at least one student email.");
    try {
      const { db, fsMod } = await firebase();
      const ref = id ? fsMod.doc(db, "classes", id) : fsMod.doc(fsMod.collection(db, "classes"));
      const batch = fsMod.writeBatch(db);
      batch.set(ref, { name, students, updatedBy: user.email, updatedAt: fsMod.serverTimestamp() });
      // Homework for this class keeps its own copy of the students.
      for (const h of hwData.homework.filter(x => x.classId === ref.id)) {
        batch.update(fsMod.doc(db, "homework", h.id), { students, className: name });
      }
      await batch.commit();
    } catch { return formError(f, "Couldn't save. Try again."); }
    $("#dlg-hw").close();
    toast(`Saved ${name}.`, "good");
    refreshHomework();
  });

  f.querySelector('[data-act="delete"]')?.addEventListener("click", async () => {
    const used = hwData.homework.filter(x => x.classId === id).length;
    if (used) return formError(f, `This class has ${used} homework. Delete the homework first.`);
    if (!confirm(`Delete the class "${c.name}"?`)) return;
    try { const { db, fsMod } = await firebase(); await fsMod.deleteDoc(fsMod.doc(db, "classes", id)); } catch { return formError(f, "Couldn't delete. Try again."); }
    $("#dlg-hw").close();
    toast(`Deleted ${c.name}.`);
    refreshHomework();
  });
}

// -- homework --

function openHomework(id) {
  if (!hwData.classes.length) { toast("Make a class first.", "bad"); return; }
  const h = hwData.homework.find(x => x.id === id) || { title: "", classId: hwData.classes[0].id, due: "", pass: 80, items: [] };
  let items = (h.items || []).map(x => ({ ...x }));

  const f = hwDialog(`
    <h2>${id ? "Edit homework" : "New homework"}</h2>
    <label class="field"><span>Title</span><input name="title" value="${esc(h.title)}" placeholder="Kamatz practice" required dir="auto"></label>
    <div class="field-row">
      <label class="field"><span>Class</span><select name="classId">${hwData.classes.map(c => `<option value="${esc(c.id)}"${c.id === h.classId ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
      <label class="field"><span>Due</span><input type="date" name="due" value="${esc(h.due || "")}"></label>
      <label class="field"><span>Passing score</span><span class="pct"><input type="number" name="pass" min="1" max="100" value="${esc(h.pass || 80)}"> %</span></label>
    </div>
    <div class="field"><span>Games</span>
      <small>Only games made on this site can check the score. A game is done when the student passes it.</small>
      <ol class="hw-picked" data-picked></ol>
      <div class="hw-pick-row">
        <input type="search" data-search placeholder="Find a game to add…" autocomplete="off">
      </div>
      <ul class="hw-results" data-results></ul>
    </div>
    <p class="form-error" hidden></p>
    <div class="dlg-actions">
      ${id ? `<button class="btn btn-danger" type="button" data-act="delete">Delete homework</button>` : ""}
      <span class="spacer"></span>
      <button class="btn btn-ghost" value="cancel" formnovalidate>Cancel</button>
      <button class="btn btn-primary" type="button" data-act="save">Save</button>
    </div>`);

  const pickedEl = f.querySelector("[data-picked]");
  const resultsEl = f.querySelector("[data-results]");
  const search = f.querySelector("[data-search]");

  const drawPicked = () => {
    pickedEl.innerHTML = items.length ? items.map((it, i) => {
      const found = gameById(it.game);
      return `
        <li>
          <div class="hw-picked-top">
            <b dir="auto">${esc(found ? found.g.title : "(game was removed)")}</b>
            <span class="muted">${found ? `${found.b.name} ${found.s}` : ""}</span>
            <button class="icon-btn small" type="button" data-up="${i}" title="Move up"${i ? "" : " disabled"}>↑</button>
            <button class="icon-btn small" type="button" data-remove="${i}" title="Remove">✕</button>
          </div>
          ${found && !found.g.own ? `<small class="warn">This Wordwall game can't check passing. Swap it for a game made here.</small>` : ""}
        </li>`;
    }).join("") : `<li class="muted">No games yet. Find one below.${allGamesFlat().some(x => x.g.own) ? "" : " First make one on the Games tab: + Make a game."}</li>`;
  };

  const drawResults = () => {
    const q = search.value.trim().toLowerCase();
    const chosen = new Set(items.map(x => x.game));
    const all = allGamesFlat().filter(x => x.g.own && !x.g.hidden && !chosen.has(x.g.id) && !(draft.templates[x.g.game] || {}).noScore);
    const hits = q ? all.filter(x => x.g.title.toLowerCase().includes(q) || `${x.b.name} ${x.s}`.toLowerCase().includes(q) || (x.g.game || "").toLowerCase().includes(q)) : all;
    resultsEl.innerHTML = hits.slice(0, 12).map(x => `
      <li><button type="button" data-pick="${esc(x.g.id)}">
        <span dir="auto">${esc(x.g.title)}</span><span class="muted">${x.b.name} Belt, Stripe ${x.s} · ${esc(x.g.game || "")}</span>
      </button></li>`).join("") || (q ? `<li class="muted">No games found.</li>` : "");
  };

  drawPicked();
  drawResults();
  search.addEventListener("input", drawResults);
  f.addEventListener("click", e => {
    const pick = e.target.closest("[data-pick]");
    if (pick) { items.push({ game: pick.dataset.pick }); drawPicked(); drawResults(); search.focus(); return; }
    const rm = e.target.closest("[data-remove]");
    if (rm) { items.splice(Number(rm.dataset.remove), 1); drawPicked(); drawResults(); return; }
    const up = e.target.closest("[data-up]");
    if (up) { const i = Number(up.dataset.up); [items[i - 1], items[i]] = [items[i], items[i - 1]]; drawPicked(); }
  });

  f.querySelector('[data-act="save"]').addEventListener("click", async () => {
    const title = f.elements.title.value.trim();
    const cls = hwData.classes.find(c => c.id === f.elements.classId.value);
    if (!title) return formError(f, "Give the homework a title.");
    if (!items.length) return formError(f, "Add at least one game.");
    const pass = Math.round(Number(f.elements.pass.value));
    if (!(pass >= 1 && pass <= 100)) return formError(f, "Passing score must be from 1 to 100.");
    const data = {
      title, classId: cls.id, className: cls.name, students: cls.students || [],
      due: f.elements.due.value || "",
      pass,
      items: items.map(it => ({ game: it.game })),
      updatedBy: user.email,
    };
    try {
      const { db, fsMod } = await firebase();
      const ref = id ? fsMod.doc(db, "homework", id) : fsMod.doc(fsMod.collection(db, "homework"));
      await fsMod.setDoc(ref, { ...data, updatedAt: fsMod.serverTimestamp() });
    } catch { return formError(f, "Couldn't save. Try again."); }
    $("#dlg-hw").close();
    toast(`Saved "${title}". ${cls.name} can see it now.`, "good");
    refreshHomework();
  });

  f.querySelector('[data-act="delete"]')?.addEventListener("click", async () => {
    if (!confirm(`Delete the homework "${h.title}"?`)) return;
    try { const { db, fsMod } = await firebase(); await fsMod.deleteDoc(fsMod.doc(db, "homework", id)); } catch { return formError(f, "Couldn't delete. Try again."); }
    $("#dlg-hw").close();
    toast(`Deleted "${h.title}".`);
    refreshHomework();
  });
}

// -- results --

function minutes(sec) {
  if (!sec) return "under 1 min";
  const m = Math.round(sec / 60);
  return m < 1 ? "under 1 min" : `${m} min`;
}

async function openResults(id) {
  const h = hwData.homework.find(x => x.id === id);
  if (!h) return;
  const f = hwDialog(`<h2 dir="auto">${esc(h.title)}</h2><p class="muted">Loading…</p>`);
  let rows;
  try {
    const { db, fsMod } = await firebase();
    const snap = await fsMod.getDocs(fsMod.query(fsMod.collection(db, "progress"), fsMod.where("hw", "==", id)));
    rows = Object.fromEntries(snap.docs.map(d => [d.data().email, d.data()]));
  } catch { f.querySelector("p").textContent = "Couldn't load results. Try again."; return; }

  const items = h.items || [];
  const students = h.students || [];
  const pass = Number(h.pass) || 80;
  const prog = (st, it) => rows[st] && rows[st].items && rows[st].items[it.game];
  const doneCount = st => items.filter(it => { const p = prog(st, it); return p && p.passed; }).length;
  const cell = (st, it) => {
    const p = prog(st, it);
    if (!p) return `<td class="no">—</td>`;
    const tries = p.tries ? ` · ${p.tries} ${p.tries === 1 ? "try" : "tries"}` : "";
    if (p.passed) return `<td class="yes">✓ ${p.best}%<small>${tries} · ${minutes(p.seconds)}</small></td>`;
    if (p.best !== undefined) return `<td class="fail">✗ ${p.best}%<small>${tries} · ${minutes(p.seconds)}</small></td>`;
    return `<td class="opened">Opened<small> · ${minutes(p.seconds)}</small></td>`;
  };
  const finished = students.filter(st => doneCount(st) === items.length).length;
  f.innerHTML = `
    <h2 dir="auto">${esc(h.title)}</h2>
    <p class="muted">${esc(h.className || "")}${h.due ? ` · Due ${esc(h.due)}` : ""} · Pass: ${pass}% · ${finished} of ${students.length} students passed every game</p>
    <div class="results-wrap">
      <table class="hw-table results">
        <thead><tr><th>Student</th>${items.map(it => { const x = gameById(it.game); return `<th dir="auto">${esc(x ? x.g.title : "?")}</th>`; }).join("")}<th>Passed</th></tr></thead>
        <tbody>${students.map(st => `
          <tr><td><b>${esc((rows[st] && rows[st].name) || st)}</b>${rows[st] && rows[st].name ? `<br><small class="muted">${esc(st)}</small>` : ""}</td>
          ${items.map(it => cell(st, it)).join("")}
          <td><b>${doneCount(st)}/${items.length}</b></td></tr>`).join("")}</tbody>
      </table>
    </div>
    <p class="hint">✓ passed, with their best score. ✗ played but not passed yet. A game counts as done only when it's passed.</p>
    <div class="dlg-actions">
      <span class="spacer"></span>
      <button class="btn btn-primary" value="ok">Close</button>
    </div>`;
}

// Import a file of emails into the Admins tab or a class.
main.addEventListener("change", e => {
  const input = e.target.closest("[data-import]");
  if (!input || !input.files[0]) return;
  input.files[0].text().then(text => {
    const found = findEmails(text);
    if (input.dataset.import === "admins") {
      const box = $("#add-admin textarea");
      box.value = [box.value.trim(), ...found].filter(Boolean).join("\n");
      toast(`Found ${found.length} emails. Check the list, then press Add.`);
    }
    input.value = "";
  });
});

$("#dlg-hw").addEventListener("change", e => {
  const input = e.target.closest('[data-import="class"]');
  if (!input || !input.files[0]) return;
  input.files[0].text().then(text => {
    const box = $("#dlg-hw textarea[name=students]");
    const all = findEmails(`${box.value}\n${text}`);
    box.value = all.join("\n");
    box.dispatchEvent(new Event("input"));
    input.value = "";
  });
});

// ---- page -------------------------------------------------------------------------------

function render() {
  document.querySelectorAll(".admin-tabs [data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  if (tab === "admins" && !isFullAdmin) tab = "games";
  main.innerHTML = { games: gamesTab, words: wordsTab, howto: howToTab, home: homeTab, homework: homeworkTab, admins: adminsTab }[tab]();
  if (tab === "words") TEXT_FIELDS.forEach(([, f]) => f.forEach(([k]) => updateCount(k)));
  showStatus();
}

main.addEventListener("click", e => {
  const chip = e.target.closest(".belt-chip");
  if (chip) { beltKey = chip.dataset.belt; render(); return; }
  const edit = e.target.closest("[data-edit]");
  if (edit) { openEdit(edit.dataset.edit); return; }
  const make = e.target.closest("[data-make]");
  if (make) { openMake(Number(make.dataset.make)); return; }
  const add = e.target.closest("[data-add]");
  if (add) { openAdd(Number(add.dataset.add)); return; }
  if (e.target.closest("[data-hw-new]")) { openHomework(); return; }
  if (e.target.closest("[data-class-new]")) { openClass(); return; }
  const hwEdit = e.target.closest("[data-hw-edit]");
  if (hwEdit) { openHomework(hwEdit.dataset.hwEdit); return; }
  const hwRes = e.target.closest("[data-hw-results]");
  if (hwRes) { openResults(hwRes.dataset.hwResults); return; }
  const clEdit = e.target.closest("[data-class-edit]");
  if (clEdit) { openClass(clEdit.dataset.classEdit); return; }
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

// A draft saved before some ready-made games existed (ids like own-red-2-sort)
// gets them added, in the same place as on the live site, so publishing it
// doesn't remove them.
function addNewReadyMade(d, live) {
  const have = new Set();
  for (const b of Object.values(d.games || {})) for (const l of Object.values(b)) for (const g of l) have.add(g.id);
  for (const [belt, stripes] of Object.entries(live.games || {})) {
    for (const [s, list] of Object.entries(stripes)) {
      d.games[belt] = d.games[belt] || {};
      const into = d.games[belt][s] = d.games[belt][s] || [];
      list.forEach((g, i) => {
        if (!have.has(g.id) && g.id.startsWith(`own-${belt}-${s}`)) into.splice(Math.min(i, into.length), 0, g);
      });
    }
  }
  return d;
}

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
      if (confirm("You have changes that weren't published yet. Keep working on them?\n\nOK keeps them. Cancel starts from the live site.")) draft = addNewReadyMade(withDefaults(old), live);
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
