// Aleph Review — hash-routed single page.
//   #/                  all belts
//   #/red               one belt, its three stripes
//   #/red/2             the games for Red belt, Stripe 2
//   #/red/2/play/123    play one game inside the site

const BELTS = [
  { key: "white",  name: "White",  color: "#f1f1ee", ink: "#1b2437", line: "#6b7280" },
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

// Line icons (from the Lucide set, ISC license).
const ICON_PATHS = {
  match:  '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  sort:   '<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  order:  '<path d="M10 6h11"/><path d="M10 12h11"/><path d="M10 18h11"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
  arcade: '<path d="M6 11h4"/><path d="M8 9v4"/><path d="M15 12h.01"/><path d="M18 10h.01"/><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.54-.6-6.58-.69-7.26A4 4 0 0 0 17.32 5z"/>',
  quiz:   '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  cards:  '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  all:    '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  play:   '<polygon points="7 4 20 12 7 20 7 4" fill="currentColor"/>',
  check:  '<path d="M20 6 9 17l-5-5"/>',
  left:   '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  right:  '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  out:    '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  full:   '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  clock:  '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  star:   '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
};

function icon(name, cls = "icon") {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.all}</svg>`;
}

const app = document.getElementById("app");

// ---- small helpers -------------------------------------------------------

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function gamesFor(beltKey, stripe) {
  return (((GAMES[beltKey] || {})[stripe]) || []).filter(g => !g.hidden);
}

function beltGames(beltKey) {
  return STRIPES.flatMap(s => gamesFor(beltKey, s));
}

function allGames() {
  return BELTS.flatMap(b => beltGames(b.key));
}

function thumbUrl(thumb) {
  return /^https?:/.test(thumb) ? thumb : THUMB_BASE + thumb;
}

function embedUrl(g) {
  return `https://wordwall.net/embed/${g.embed}`;
}

function playHref(b, stripe, g) {
  return `#/${b.key}/${stripe}/play/${g.id}`;
}

function gameUrl(g) {
  return g.play ? `https://wordwall.net/play/${g.play}` : `https://wordwall.net/resource/${g.id}`;
}

function typeLabel(g) {
  return g.game || (GAME_TYPES[g.type] || { label: "Game" }).label;
}

function played() { return new Set(store.get("played", [])); }

function markPlayed(id) {
  const s = played(); s.add(id); store.set("played", [...s]);
}

function countPlayed(list, done) {
  return list.filter(g => done.has(g.id)).length;
}

function beltStyle(b) {
  return `--belt:${b.color};--belt-ink:${b.ink};--belt-line:${b.line || b.color}`;
}

function progressBar(done, total, label) {
  const pct = total ? Math.round(done / total * 100) : 0;
  return `<div class="progress" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><span style="width:${pct}%"></span></div>`;
}

function crumbs(parts) {
  const html = parts.map(([label, href]) => href ? `<a href="${href}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`);
  return `<nav class="crumbs" aria-label="Breadcrumb">${html.join('<span class="sep" aria-hidden="true">/</span>')}</nav>`;
}

// Where a student should pick up: the first stripe that still has games left to play.
function nextUp(done) {
  for (const b of BELTS) for (const s of STRIPES) {
    const list = gamesFor(b.key, s);
    if (list.length && countPlayed(list, done) < list.length) return { b, s };
  }
  return null;
}

// A stripe earns its star once every game in it has been played.
function stripeDone(beltKey, s, done) {
  const list = gamesFor(beltKey, s);
  return list.length > 0 && countPlayed(list, done) === list.length;
}

function starCount(done) {
  return BELTS.reduce((n, b) => n + STRIPES.filter(s => stripeDone(b.key, s, done)).length, 0);
}

function stars(beltKey, done) {
  const shown = new Set(store.get("stars-shown", []));
  const html = STRIPES.map(s => {
    const on = stripeDone(beltKey, s, done);
    // A newly earned star shines once, the first time it appears.
    const fresh = on && !shown.has(`${beltKey}/${s}`);
    if (fresh) { shown.add(`${beltKey}/${s}`); store.set("stars-shown", [...shown]); }
    return `<span class="star${on ? " on" : ""}${fresh ? " fresh" : ""}" title="Stripe ${s}${on ? ": star earned" : ""}">${icon("star")}</span>`;
  }).join("");
  return `<span class="stars" aria-label="${STRIPES.filter(s => stripeDone(beltKey, s, done)).length} of 3 stars">${html}</span>`;
}

// Plain progress text: no more cheering than a star already gives.
function cheer(p, n) {
  if (!p) return "Not started";
  if (p === n) return "All done";
  return `${p} of ${n} played`;
}

// Game types get their own friendly color (see .t-* in style.css).
function typeClass(k) { return `t-${k}`; }

// ---- views ---------------------------------------------------------------

// Each tile opens the belt of its color.
const HERO_TILES = [
  ["א", "red"], ["ב", "orange"], ["ג", "yellow"],
  ["ד", "green"], ["ה", "blue"], ["ו", "purple"],
  ["ז", "brown"], ["ח", "gray"], ["ט", "white"],
];

function homeView() {
  const done = played();
  const every = allGames();
  const doneTotal = countPlayed(every, done);
  const up = nextUp(done);
  const cta = up
    ? `<a class="btn btn-primary btn-lg" href="#/${up.b.key}/${up.s}">${icon("play")} ${doneTotal ? "Keep going" : "Start playing"}</a>`
    : "";

  const tiles = HERO_TILES.map(([letter, key], i) => {
    const b = BELTS.find(x => x.key === key);
    return beltGames(b.key).length
      ? `<a class="tile" href="#/${b.key}" style="${beltStyle(b)};--i:${i}" title="${b.name} Belt" aria-label="${b.name} Belt">${letter}</a>`
      : `<span class="tile soon" style="${beltStyle(b)};--i:${i}" title="${b.name} Belt: coming soon" aria-label="${b.name} Belt, coming soon">${letter}</span>`;
  }).join("");

  const cards = BELTS.map((b, i) => {
    const list = beltGames(b.key);
    const n = list.length;
    const p = countPlayed(list, done);
    return `
      <li>
        ${n ? `<a class="belt-card" href="#/${b.key}" style="${beltStyle(b)}">` : `<div class="belt-card soon" style="${beltStyle(b)}" aria-disabled="true">`}
          <span class="belt-row">
            <span class="rank">${i + 1}</span>
            <span class="belt-text">
              <span class="belt-name">${b.name} Belt</span>
              <span class="belt-meta">${n ? plural(n, "game") : `Level ${i + 1}`}</span>
            </span>
          </span>
          ${n
            ? `<span class="belt-progress">${progressBar(p, n, `${b.name} Belt progress`)}<span class="belt-foot"><span class="progress-label">${cheer(p, n)}</span>${stars(b.key, done)}</span></span>`
            : `<span class="tag">${icon("clock")} Coming soon</span>`}
        ${n ? "</a>" : "</div>"}
      </li>`;
  }).join("");

  return `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Hebrew reading games</p>
        <h1>Hebrew reading, one belt at a time.</h1>
        <p class="lede">Review games for every level. Finish a stripe to earn a star, and earn all three to move up to the next belt.</p>
        <div class="hero-actions">
          ${cta}
          ${up ? `<span class="hero-next">${doneTotal ? "Next up" : "Begin with"}: <b>${up.b.name} Belt, Stripe ${up.s}</b></span>` : ""}
        </div>
        <dl class="stats">
          <div><dt>Games to play</dt><dd>${every.length}</dd></div>
          <div><dt>Games played</dt><dd>${doneTotal}</dd></div>
          <div class="stat-stars"><dt>Stars earned</dt><dd>${icon("star")} ${starCount(done)}</dd></div>
        </dl>
      </div>
      <nav class="hero-art" aria-label="Belts">${tiles}</nav>
    </section>

    <section class="section" id="belts">
      <div class="section-head">
        <h2>Choose your belt</h2>
        <p>Start at White and work your way up to Black.</p>
      </div>
      <ol class="belt-grid">${cards}</ol>
    </section>`;
}

function typeSummary(list) {
  return Object.keys(GAME_TYPES)
    .map(k => [k, list.filter(g => g.type === k).length])
    .filter(([, n]) => n)
    .map(([k, n]) => `<span class="mini-pill ${typeClass(k)}" title="${esc(GAME_TYPES[k].label)}">${icon(k)} ${n}</span>`)
    .join("");
}

function pageHead(b, title, sub, extra = "") {
  const idx = BELTS.indexOf(b);
  return `
    <section class="page-head" style="${beltStyle(b)}">
      <span class="page-head-mark" aria-hidden="true">${idx + 1}</span>
      <span class="head-stars">${stars(b.key, played())}</span>
      <p class="eyebrow">Level ${idx + 1} of ${BELTS.length}</p>
      <h1>${title}</h1>
      <p class="page-head-sub">${sub}</p>
      ${extra}
    </section>`;
}

function beltView(b) {
  const idx = BELTS.indexOf(b);
  const done = played();
  const all = beltGames(b.key);

  const stripeCards = STRIPES.map(s => {
    const list = gamesFor(b.key, s);
    const n = list.length;
    const p = countPlayed(list, done);
    return `
      <li>
        ${n ? `<a class="stripe-card" href="#/${b.key}/${s}" style="${beltStyle(b)}">` : `<div class="stripe-card soon" style="${beltStyle(b)}" aria-disabled="true">`}
          <span class="stripe-top">
            <span class="stripe-num">${stripeDone(b.key, s, done) ? icon("star") : s}</span>
            <span class="stripe-text">
              <span class="stripe-name">Stripe ${s}</span>
              <span class="stripe-meta">${n ? plural(n, "game") : "No games yet"}</span>
            </span>
          </span>
          ${n ? `
            <span class="mini-pills">${typeSummary(list)}</span>
            ${progressBar(p, n, `Stripe ${s} progress`)}
            <span class="stripe-foot">
              <span class="progress-label">${cheer(p, n)}</span>
              <span class="go">${p === n ? "Play again" : p ? "Continue" : "Start"} ${icon("right")}</span>
            </span>` : `<span class="tag">${icon("clock")} Coming soon</span>`}
        ${n ? "</a>" : "</div>"}
      </li>`;
  }).join("");

  const prev = BELTS[idx - 1], next = BELTS[idx + 1];
  const got = STRIPES.filter(s => stripeDone(b.key, s, done)).length;
  const sub = all.length ? `${plural(all.length, "game")} across 3 stripes · ${got} of 3 stars earned` : "Games for this belt are coming soon.";
  return `
    ${crumbs([["All belts", "#/"], [`${b.name} Belt`]])}
    ${pageHead(b, `${b.name} Belt`, sub)}
    <div class="section-head"><h2>Choose a stripe</h2></div>
    <ol class="stripe-grid">${stripeCards}</ol>
    <nav class="pager">
      ${prev ? `<a class="btn btn-ghost" href="#/${prev.key}">${icon("left")} ${prev.name} Belt</a>` : "<span></span>"}
      ${!next ? "<span></span>" : beltGames(next.key).length
        ? `<a class="btn btn-ghost" href="#/${next.key}">${next.name} Belt ${icon("right")}</a>`
        : `<span class="btn btn-ghost" aria-disabled="true">${icon("clock")} ${next.name} Belt coming soon</span>`}
    </nav>`;
}

function gameCard(g, done, b, stripe) {
  const inSite = !!g.embed;
  const thumb = g.thumb ? `<img src="${esc(thumbUrl(g.thumb))}" alt="" loading="lazy" onerror="this.remove()">` : "";
  return `
    <li>
      <a class="game-card${done.has(g.id) ? " played" : ""}" ${inSite ? `href="${playHref(b, stripe, g)}"` : `href="${gameUrl(g)}" target="_blank" rel="noopener"`} data-id="${esc(g.id)}">
        <span class="thumb">
          <span class="thumb-fallback">${icon(g.type, "icon icon-lg")}</span>
          ${thumb}
          <span class="play-badge">${icon(inSite ? "play" : "out")}</span>
          <span class="check" title="Played">${icon("check")}</span>
        </span>
        <span class="game-body">
          <span class="game-title" dir="auto">${esc(g.title)}</span>
          <span class="type-pill ${typeClass(g.type)}">${icon(g.type)} ${esc(typeLabel(g))}</span>
        </span>
      </a>
    </li>`;
}

function stripeView(b, stripe) {
  const list = gamesFor(b.key, stripe);
  const done = played();
  const view = store.get("view", "all");
  const filter = store.get("filter", "all");

  const types = Object.keys(GAME_TYPES).filter(k => list.some(g => g.type === k));
  const active = types.includes(filter) ? filter : "all";
  const p = countPlayed(list, done);

  let body;
  if (!list.length) {
    body = `<div class="empty-note">${icon("clock", "icon icon-lg")}<p>Games for this stripe are on the way. Check back soon!</p></div>`;
  } else if (view === "type") {
    body = types.map(k => {
      const group = list.filter(g => g.type === k);
      return `
        <section class="type-group">
          <h2><span class="type-dot ${typeClass(k)}">${icon(k)}</span> ${esc(GAME_TYPES[k].label)} <span class="count">${group.length}</span></h2>
          <ul class="game-grid">${group.map(g => gameCard(g, done, b, stripe)).join("")}</ul>
        </section>`;
    }).join("");
  } else {
    const chips = ["all", ...types].map(k => {
      const label = k === "all" ? "All" : esc(GAME_TYPES[k].label);
      const n = k === "all" ? list.length : list.filter(g => g.type === k).length;
      return `<button class="chip${k === "all" ? "" : " " + typeClass(k)}" data-filter="${k}" aria-pressed="${k === active}">${icon(k)} ${label} <span class="count">${n}</span></button>`;
    }).join("");
    const shown = active === "all" ? list : list.filter(g => g.type === active);
    body = `
      <div class="chips" role="group" aria-label="Filter by game type">${chips}</div>
      <ul class="game-grid">${shown.map(g => gameCard(g, done, b, stripe)).join("")}</ul>`;
  }

  const stripeTabs = STRIPES.map(s =>
    s === stripe || gamesFor(b.key, s).length
      ? `<a class="seg" href="#/${b.key}/${s}"${s === stripe ? ' aria-current="page"' : ""}>Stripe ${s}</a>`
      : `<span class="seg" aria-disabled="true" title="Coming soon">Stripe ${s}</span>`).join("");

  const headExtra = list.length
    ? `<div class="head-progress">${progressBar(p, list.length, "Stripe progress")}<span>${p === list.length ? `${icon("star")} Star earned` : `${p} of ${list.length} played`}</span></div>`
    : "";

  return `
    ${crumbs([["All belts", "#/"], [`${b.name} Belt`, `#/${b.key}`], [`Stripe ${stripe}`]])}
    ${pageHead(b, `${b.name} Belt · Stripe ${stripe}`, list.length ? plural(list.length, "game") : "Coming soon", headExtra)}
    <div class="toolbar">
      <nav class="segmented" aria-label="Stripes">${stripeTabs}</nav>
      ${list.length ? `
      <div class="segmented" role="group" aria-label="How to show games">
        <button class="seg" data-view="all" aria-pressed="${view !== "type"}">All games</button>
        <button class="seg" data-view="type" aria-pressed="${view === "type"}">By game type</button>
      </div>` : ""}
    </div>
    ${body}`;
}

function playerView(b, stripe, id) {
  const list = gamesFor(b.key, stripe);
  const i = list.findIndex(g => g.id === id);
  const g = list[i];
  if (!g) return notFoundView();
  markPlayed(g.id);

  const prev = list[i - 1], next = list[i + 1];
  const stage = g.embed
    ? `<iframe src="${esc(embedUrl(g))}" title="${esc(g.title)}" allow="autoplay; fullscreen" allowfullscreen></iframe>`
    : `<div class="empty-note">${icon("out", "icon icon-lg")}<p>This game can't play here. <a href="${gameUrl(g)}" target="_blank" rel="noopener">Open it on Wordwall</a>.</p></div>`;

  return `
    ${crumbs([["All belts", "#/"], [`${b.name} Belt`, `#/${b.key}`], [`Stripe ${stripe}`, `#/${b.key}/${stripe}`], [g.title]])}
    <div class="player-head">
      <div class="player-title">
        <span class="type-pill ${typeClass(g.type)}">${icon(g.type)} ${esc(typeLabel(g))}</span>
        <h1 dir="auto">${esc(g.title)}</h1>
      </div>
      <a class="btn btn-belt" href="#/${b.key}/${stripe}" style="${beltStyle(b)}">${icon("all")} All Stripe ${stripe} games</a>
    </div>
    <div class="player" id="player">${stage}</div>
    <div class="player-bar">
      ${prev
        ? `<a class="btn btn-ghost" href="${playHref(b, stripe, prev)}">${icon("left")} <span>Previous</span></a>`
        : `<span class="btn btn-ghost" aria-disabled="true">${icon("left")} <span>Previous</span></span>`}
      <div class="player-mid">
        <span class="counter">Game ${i + 1} of ${list.length}</span>
        ${g.embed ? `<button class="icon-btn" data-fullscreen title="Full screen" aria-label="Full screen">${icon("full")}</button>` : ""}
        <a class="icon-btn" href="${gameUrl(g)}" target="_blank" rel="noopener" title="Open on Wordwall" aria-label="Open on Wordwall">${icon("out")}</a>
      </div>
      ${next
        ? `<a class="btn btn-primary" href="${playHref(b, stripe, next)}"><span>Next game</span> ${icon("right")}</a>`
        : `<a class="btn btn-primary" href="#/${b.key}">${icon("check")} <span>Stripe done</span></a>`}
    </div>`;
}

function notFoundView() {
  return `<div class="empty-note">${icon("quiz", "icon icon-lg")}<p>We couldn't find that page.</p><a class="btn btn-primary" href="#/">Back to all belts</a></div>`;
}

// ---- celebration ---------------------------------------------------------

// The first time a student comes back to a finished stripe: a short confetti
// burst and a note. It never runs on a game page, so it can't get in the way.
function maybeCelebrate(b, stripe) {
  const key = `${b.key}/${stripe}`;
  const seen = new Set(store.get("celebrated", []));
  if (!stripeDone(b.key, stripe, played()) || seen.has(key)) return;
  seen.add(key); store.set("celebrated", [...seen]);

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.innerHTML = `<span class="toast-star">${icon("star")}</span><span><b>Stripe ${stripe} complete</b><br>You earned a ${b.name} Belt star.</span>`;
  document.body.append(toast);
  setTimeout(() => toast.classList.add("out"), 4200);
  setTimeout(() => toast.remove(), 4800);

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = BELTS.slice(1, 7).map(x => x.color);
  const box = document.createElement("div");
  box.className = "confetti";
  box.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 40; i++) {
    const c = document.createElement("i");
    c.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};` +
      `animation-delay:${Math.random() * .5}s;animation-duration:${1.8 + Math.random() * 1.2}s;` +
      `--drift:${(Math.random() - .5) * 160}px;--spin:${(Math.random() - .5) * 1080}deg`;
    box.append(c);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3600);
}

// ---- router --------------------------------------------------------------

function render() {
  const [beltKey, stripeStr, action, gameId] = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const belt = BELTS.find(b => b.key === beltKey);
  const stripe = Number(stripeStr);

  // Coming-soon belts and stripes have nothing to show: go to the nearest page that does.
  if (belt && !beltGames(belt.key).length) { location.replace("#/"); return; }
  if (belt && STRIPES.includes(stripe) && !gamesFor(belt.key, stripe).length) { location.replace(`#/${belt.key}`); return; }

  if (!beltKey) app.innerHTML = homeView();
  else if (belt && !stripeStr) app.innerHTML = beltView(belt);
  else if (belt && STRIPES.includes(stripe) && action === "play") app.innerHTML = playerView(belt, stripe, gameId);
  else if (belt && STRIPES.includes(stripe) && !action) { app.innerHTML = stripeView(belt, stripe); maybeCelebrate(belt, stripe); }
  else app.innerHTML = notFoundView();

  document.title = belt ? `${belt.name} Belt${STRIPES.includes(stripe) ? ` · Stripe ${stripe}` : ""} — Aleph Review` : "Aleph Review — Hebrew reading games";
  const playing = action === "play" && belt && gamesFor(belt.key, stripe).find(g => g.id === gameId);
  if (playing) document.title = `${playing.title} — Aleph Review`;

  // The "All belts" link only makes sense away from the home page.
  document.querySelector(".header-link").hidden = !beltKey;

  const n = played().size;
  const badge = document.getElementById("played-count");
  badge.hidden = !n;
  badge.querySelector("span").textContent = `${n} played`;
}

app.addEventListener("click", e => {
  const viewBtn = e.target.closest("[data-view]");
  if (viewBtn) { store.set("view", viewBtn.dataset.view); render(); return; }

  const chip = e.target.closest("[data-filter]");
  if (chip) { store.set("filter", chip.dataset.filter); render(); return; }

  if (e.target.closest("[data-fullscreen]")) {
    const el = document.getElementById("player");
    const go = el.requestFullscreen || el.webkitRequestFullscreen;
    if (go) go.call(el);
    return;
  }

  const game = e.target.closest(".game-card");
  if (game) { markPlayed(game.dataset.id); game.classList.add("played"); }
});

window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
render();
