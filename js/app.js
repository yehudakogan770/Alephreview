// Aleph Review — hash-routed single page.
//   #/            all belts
//   #/red         one belt, its three stripes
//   #/red/2       the games for Red belt, Stripe 2
//   #/red/2/play/123   play one game inside the site

const BELTS = [
  { key: "white",  name: "White",  color: "#f4f4f2", ink: "#1f2937" },
  { key: "red",    name: "Red",    color: "#d62828", ink: "#ffffff" },
  { key: "orange", name: "Orange", color: "#f77f00", ink: "#ffffff" },
  { key: "yellow", name: "Yellow", color: "#f6c426", ink: "#1f2937" },
  { key: "green",  name: "Green",  color: "#2f9e44", ink: "#ffffff" },
  { key: "blue",   name: "Blue",   color: "#1c64d6", ink: "#ffffff" },
  { key: "purple", name: "Purple", color: "#7b2cbf", ink: "#ffffff" },
  { key: "brown",  name: "Brown",  color: "#7f4f24", ink: "#ffffff" },
  { key: "gray",   name: "Gray",   color: "#8a8f98", ink: "#ffffff" },
  { key: "black",  name: "Black",  color: "#15171a", ink: "#ffffff" },
];
const STRIPES = [1, 2, 3];
const THUMB_BASE = "https://screens.cdn.wordwall.net/200/";

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

function gamesFor(beltKey, stripe) {
  return (((GAMES[beltKey] || {})[stripe]) || []).filter(g => !g.hidden);
}

function beltCount(beltKey) {
  return STRIPES.reduce((n, s) => n + gamesFor(beltKey, s).length, 0);
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

function played() { return new Set(store.get("played", [])); }

function markPlayed(id) {
  const s = played(); s.add(id); store.set("played", [...s]);
}

function beltStyle(b) {
  return `--belt:${b.color};--belt-ink:${b.ink}`;
}

function crumbs(parts) {
  const html = parts.map(([label, href]) => href ? `<a href="${href}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`);
  return `<nav class="crumbs" aria-label="Breadcrumb">${html.join('<span class="sep">›</span>')}</nav>`;
}

// ---- views ---------------------------------------------------------------

function homeView() {
  const cards = BELTS.map((b, i) => {
    const n = beltCount(b.key);
    const status = n ? `${n} game${n === 1 ? "" : "s"}` : "Coming soon";
    return `
      <li>
        <a class="belt-card${n ? "" : " empty"}" href="#/${b.key}" style="${beltStyle(b)}">
          <span class="rank">${i + 1}</span>
          <span class="belt-card-body">
            <span class="belt-name">${b.name} Belt</span>
            <span class="belt-meta">${status}</span>
          </span>
        </a>
      </li>`;
  }).join("");

  return `
    <section class="hero">
      <h1>Choose your belt</h1>
      <p>Practice Hebrew reading one level at a time. Each belt has three stripes — master all three to move up to the next color.</p>
    </section>
    <ol class="belt-grid">${cards}</ol>`;
}

function beltView(b) {
  const idx = BELTS.indexOf(b);
  const done = played();
  const stripeCards = STRIPES.map(s => {
    const list = gamesFor(b.key, s);
    const n = list.length;
    const p = list.filter(g => done.has(g.id)).length;
    return `
      <li>
        <a class="stripe-card${n ? "" : " empty"}" href="#/${b.key}/${s}" style="${beltStyle(b)}">
          <span class="stripe-name">Stripe ${s}</span>
          <span class="stripe-meta">${n ? `${n} games${p ? ` · ${p} played` : ""}` : "Coming soon"}</span>
        </a>
      </li>`;
  }).join("");

  const prev = BELTS[idx - 1], next = BELTS[idx + 1];
  return `
    ${crumbs([["All belts", "#/"], [`${b.name} Belt`]])}
    <section class="level-head" style="${beltStyle(b)}">
      <h1>${b.name} Belt</h1>
      <p>Level ${idx + 1} of ${BELTS.length}. Pick a stripe to see its games.</p>
    </section>
    <ol class="stripe-grid">${stripeCards}</ol>
    <nav class="pager">
      ${prev ? `<a href="#/${prev.key}">← ${prev.name} Belt</a>` : "<span></span>"}
      ${next ? `<a href="#/${next.key}">${next.name} Belt →</a>` : "<span></span>"}
    </nav>`;
}

function gameCard(g, done, b, stripe) {
  const t = GAME_TYPES[g.type] || { label: "Game", icon: "⭐" };
  const thumb = g.thumb
    ? `<img src="${esc(thumbUrl(g.thumb))}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'thumb-fallback',textContent:'${t.icon}'}))">`
    : `<span class="thumb-fallback">${t.icon}</span>`;
  return `
    <li>
      <a class="game-card${done.has(g.id) ? " played" : ""}" ${g.embed ? `href="${playHref(b, stripe, g)}"` : `href="${gameUrl(g)}" target="_blank" rel="noopener"`} data-id="${esc(g.id)}">
        <span class="thumb">${thumb}</span>
        <span class="game-body">
          <span class="game-title" dir="auto">${esc(g.title)}</span>
          <span class="game-type">${t.icon} ${esc(g.game || t.label)}</span>
        </span>
        <span class="check" aria-label="Played">✓</span>
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

  let body;
  if (!list.length) {
    body = `<p class="empty-note">Games for this stripe are on the way. Check back soon!</p>`;
  } else if (view === "type") {
    body = types.map(k => {
      const t = GAME_TYPES[k];
      const group = list.filter(g => g.type === k);
      return `
        <section class="type-group">
          <h2>${t.icon} ${t.label} <span class="count">${group.length}</span></h2>
          <ul class="game-grid">${group.map(g => gameCard(g, done, b, stripe)).join("")}</ul>
        </section>`;
    }).join("");
  } else {
    const chips = ["all", ...types].map(k => {
      const label = k === "all" ? "All types" : `${GAME_TYPES[k].icon} ${GAME_TYPES[k].label}`;
      const n = k === "all" ? list.length : list.filter(g => g.type === k).length;
      return `<button class="chip" data-filter="${k}" aria-pressed="${k === active}">${label} <span class="count">${n}</span></button>`;
    }).join("");
    const shown = active === "all" ? list : list.filter(g => g.type === active);
    body = `
      <div class="chips" role="group" aria-label="Filter by game type">${chips}</div>
      <ul class="game-grid">${shown.map(g => gameCard(g, done, b, stripe)).join("")}</ul>`;
  }

  const stripeTabs = STRIPES.map(s =>
    `<a class="tab" href="#/${b.key}/${s}"${s === stripe ? ' aria-current="page"' : ""}>Stripe ${s}</a>`).join("");
  const p = list.filter(g => done.has(g.id)).length;

  return `
    ${crumbs([["All belts", "#/"], [`${b.name} Belt`, `#/${b.key}`], [`Stripe ${stripe}`]])}
    <section class="level-head" style="${beltStyle(b)}">
      <div class="level-head-row">
        <div>
          <h1>${b.name} Belt · Stripe ${stripe}</h1>
          <p>${list.length} games${list.length ? ` · ${p} played` : ""}</p>
        </div>
      </div>
    </section>
    <div class="toolbar">
      <nav class="tabs" aria-label="Stripes">${stripeTabs}</nav>
      ${list.length ? `
      <div class="view-toggle" role="group" aria-label="How to show games">
        <button data-view="all" aria-pressed="${view !== "type"}">All games</button>
        <button data-view="type" aria-pressed="${view === "type"}">By game type</button>
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

  const t = GAME_TYPES[g.type] || { label: "Game", icon: "⭐" };
  const prev = list[i - 1], next = list[i + 1];
  const stage = g.embed
    ? `<iframe src="${esc(embedUrl(g))}" title="${esc(g.title)}" allow="autoplay; fullscreen" allowfullscreen></iframe>`
    : `<p class="empty-note">This game can't play here. <a href="${gameUrl(g)}" target="_blank" rel="noopener">Open it on Wordwall</a>.</p>`;

  return `
    ${crumbs([["All belts", "#/"], [`${b.name} Belt`, `#/${b.key}`], [`Stripe ${stripe}`, `#/${b.key}/${stripe}`], [g.title]])}
    <div class="player-head">
      <div>
        <h1 dir="auto">${esc(g.title)}</h1>
        <p class="game-type">${t.icon} ${esc(g.game || t.label)} · Game ${i + 1} of ${list.length}</p>
      </div>
      <a class="back-btn" href="#/${b.key}/${stripe}" style="${beltStyle(b)}">← All ${b.name} Stripe ${stripe} games</a>
    </div>
    <div class="player">${stage}</div>
    <nav class="pager">
      ${prev ? `<a href="${playHref(b, stripe, prev)}">← Previous game</a>` : "<span></span>"}
      <a class="subtle" href="${gameUrl(g)}" target="_blank" rel="noopener">Open on Wordwall ↗</a>
      ${next ? `<a href="${playHref(b, stripe, next)}">Next game →</a>` : "<span></span>"}
    </nav>`;
}

function notFoundView() {
  return `<section class="hero"><h1>Page not found</h1><p><a href="#/">Back to all belts</a></p></section>`;
}

// ---- router --------------------------------------------------------------

function render() {
  const [beltKey, stripeStr, action, gameId] = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const belt = BELTS.find(b => b.key === beltKey);
  const stripe = Number(stripeStr);

  if (!beltKey) app.innerHTML = homeView();
  else if (belt && !stripeStr) app.innerHTML = beltView(belt);
  else if (belt && STRIPES.includes(stripe) && action === "play") app.innerHTML = playerView(belt, stripe, gameId);
  else if (belt && STRIPES.includes(stripe) && !action) app.innerHTML = stripeView(belt, stripe);
  else app.innerHTML = notFoundView();

  document.title = belt ? `${belt.name} Belt${STRIPES.includes(stripe) ? ` · Stripe ${stripe}` : ""} — Aleph Review` : "Aleph Review";
  const playing = action === "play" && belt && gamesFor(belt.key, stripe).find(g => g.id === gameId);
  if (playing) document.title = `${playing.title} — Aleph Review`;
}

app.addEventListener("click", e => {
  const viewBtn = e.target.closest("[data-view]");
  if (viewBtn) { store.set("view", viewBtn.dataset.view); render(); return; }

  const chip = e.target.closest("[data-filter]");
  if (chip) { store.set("filter", chip.dataset.filter); render(); return; }

  const game = e.target.closest(".game-card");
  if (game) { markPlayed(game.dataset.id); game.classList.add("played"); }
});

window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
render();
