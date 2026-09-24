// Games made on this site ("own" games). Unlike Wordwall games, the site
// knows the score, so homework can require a passing score.
//
// A game in the site data looks like:
//   { id, title, type, game: "Match it", own: { kind: "match", ...content } }
// Each kind (js/games/*.js) registers itself with registerKind() and gets a
// small API to report answers and finish.

const OWN_KINDS = {};

function registerKind(kind, def) {
  OWN_KINDS[kind] = def;
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// ---- sounds: short tones, no files to load --------------------------------------

const gameSound = (() => {
  let ctx = null;
  const muted = () => { try { return localStorage.getItem("og-mute") === "1"; } catch { return false; } };
  function tone(freq, start, dur, type = "sine", vol = 0.18) {
    if (muted()) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime + start;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch { /* no sound available */ }
  }
  return {
    good() { tone(660, 0, 0.12); tone(990, 0.09, 0.18); },
    bad() { tone(200, 0, 0.22, "triangle", 0.2); },
    done() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25)); },
    muted,
    toggle() { try { localStorage.setItem("og-mute", muted() ? "0" : "1"); } catch { /* ignore */ } return muted(); },
  };
})();

const OG_ICONS = {
  sound: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  mute: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6"/><path d="m17 9 6 6"/>',
};
function ogIcon(name) {
  return `<svg class="og-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${OG_ICONS[name]}</svg>`;
}

// ---- one game, from start screen to score --------------------------------------
//
// opts: {
//   t(key, vars)  site text as HTML
//   howTo         what to do, shown on the start screen
//   pass          passing percent, or null when there's no pass mark
//   onFinish(result)  { right, total, percent, passed, seconds }
//   next          { label, href } for the button after the game, or null
// }
function playOwnGame(stage, g, opts) {
  const kind = OWN_KINDS[g.own && g.own.kind];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  stage.innerHTML = `
    <div class="og" data-kind="${esc(g.own && g.own.kind)}">
      <div class="og-top">
        <span class="og-round" data-round></span>
        <span class="og-dots" data-dots></span>
        <button class="og-mute" type="button" data-mute title="Sound on or off">${ogIcon(gameSound.muted() ? "mute" : "sound")}</button>
      </div>
      <div class="og-body" data-body></div>
    </div>`;
  const body = stage.querySelector("[data-body]");
  const roundEl = stage.querySelector("[data-round]");
  const dotsEl = stage.querySelector("[data-dots]");
  stage.querySelector("[data-mute]").addEventListener("click", e => {
    e.currentTarget.innerHTML = ogIcon(gameSound.toggle() ? "mute" : "sound");
  });

  if (!kind) {
    body.innerHTML = `<div class="og-screen"><p class="og-lead">This game can't open.</p></div>`;
    return;
  }

  function startScreen() {
    roundEl.textContent = "";
    dotsEl.innerHTML = "";
    body.innerHTML = `
      <div class="og-screen">
        <h2 class="og-title" dir="auto">${esc(g.title)}</h2>
        ${opts.howTo ? `<p class="og-lead">${esc(opts.howTo)}</p>` : ""}
        ${opts.pass ? `<p class="og-passmark">${opts.t("gamePassMark", { pass: opts.pass })}</p>` : ""}
        <button class="og-btn og-primary og-big" type="button" data-start>${opts.t("gameStart")}</button>
      </div>`;
    body.querySelector("[data-start]").addEventListener("click", begin);
  }

  function begin() {
    const started = Date.now();
    let marks = [];
    const api = {
      // Called for each question: true if it was right the first time.
      mark(ok) {
        marks.push(ok);
        dotsEl.insertAdjacentHTML("beforeend", `<i class="${ok ? "ok" : "no"}"></i>`);
      },
      round(n, total) { roundEl.textContent = total > 1 ? stripTags(opts.t("gameRound", { n, total })) : ""; },
      sound: gameSound,
      shuffle,
      chunk,
      esc,
      finish() { endScreen(marks, Math.round((Date.now() - started) / 1000)); },
    };
    body.innerHTML = "";
    kind.play(body, g.own, api);
  }

  function endScreen(marks, seconds) {
    const total = marks.length;
    const right = marks.filter(Boolean).length;
    const percent = total ? Math.round((right / total) * 100) : 0;
    const passed = opts.pass ? percent >= opts.pass : true;
    gameSound.done();
    roundEl.textContent = "";
    body.innerHTML = `
      <div class="og-screen og-end">
        <div class="og-score${passed ? " pass" : " fail"}">
          <span class="og-percent">${percent}%</span>
          <span>${opts.t("gameScore", { right, total })}</span>
        </div>
        ${opts.pass ? (passed
          ? `<p class="og-result pass">✓ ${opts.t("gamePassed")}</p>`
          : `<p class="og-result fail">${opts.t("gameNotPassed", { pass: opts.pass })}</p>`) : ""}
        <div class="og-actions">
          <button class="og-btn${passed && opts.next ? "" : " og-primary"}" type="button" data-again>${opts.t("gameTryAgain")}</button>
          ${opts.next ? `<a class="og-btn${passed ? " og-primary" : ""}" href="${esc(opts.next.href)}">${esc(opts.next.label)} →</a>` : ""}
        </div>
      </div>`;
    body.querySelector("[data-again]").addEventListener("click", () => { dotsEl.innerHTML = ""; begin(); });
    if (opts.onFinish) opts.onFinish({ right, total, percent, passed, seconds });
  }

  function stripTags(html) { return String(html).replace(/<[^>]*>/g, ""); }

  startScreen();
}

// ---- drag or tap: shared by kinds where you move a tile onto a target ------------
//
// Tiles: elements with [data-tile]; targets: elements with [data-target].
// Tap a tile then a target, or drag the tile onto a target.
// onDrop(tile, target) returns true if the tile was accepted.
function dragOrTap(root, onDrop) {
  let selected = null;
  let drag = null;

  const select = t => {
    if (selected) selected.classList.remove("selected");
    selected = t;
    if (t) t.classList.add("selected");
  };

  root.addEventListener("click", e => {
    if (drag && drag.moved) return;
    const tile = e.target.closest("[data-tile]");
    if (tile && !tile.disabled) { select(selected === tile ? null : tile); return; }
    const target = e.target.closest("[data-target]");
    if (target && selected) { const t = selected; select(null); onDrop(t, target); }
  });

  root.addEventListener("pointerdown", e => {
    const tile = e.target.closest("[data-tile]");
    if (!tile || tile.disabled || e.button > 0) return;
    drag = { tile, x: e.clientX, y: e.clientY, moved: false, ghost: null };
    tile.setPointerCapture(e.pointerId);
  });

  root.addEventListener("pointermove", e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      select(null);
      const box = drag.tile.getBoundingClientRect();
      drag.ghost = drag.tile.cloneNode(true);
      drag.ghost.classList.add("og-ghost");
      Object.assign(drag.ghost.style, { width: `${box.width}px`, height: `${box.height}px`, left: `${box.left}px`, top: `${box.top}px` });
      document.body.append(drag.ghost);
      drag.tile.classList.add("dragging");
      drag.ox = e.clientX - box.left;
      drag.oy = e.clientY - box.top;
    }
    drag.ghost.style.left = `${e.clientX - drag.ox}px`;
    drag.ghost.style.top = `${e.clientY - drag.oy}px`;
    root.querySelectorAll("[data-target].over").forEach(x => x.classList.remove("over"));
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const target = under && under.closest("[data-target]");
    if (target && root.contains(target)) target.classList.add("over");
  });

  const end = e => {
    if (!drag) return;
    const d = drag;
    if (d.moved) {
      d.ghost.remove();
      d.tile.classList.remove("dragging");
      root.querySelectorAll("[data-target].over").forEach(x => x.classList.remove("over"));
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const target = under && under.closest("[data-target]");
      if (target && root.contains(target)) onDrop(d.tile, target);
      // Let the click that follows a drag be ignored.
      setTimeout(() => { if (drag === d) drag = null; }, 0);
    } else {
      drag = null;
    }
  };
  root.addEventListener("pointerup", end);
  root.addEventListener("pointercancel", end);
}

// Wrong answer: shake and flash red.
function flashWrong(...els) {
  els.forEach(el => {
    if (!el) return;
    el.classList.remove("wrong");
    void el.offsetWidth;
    el.classList.add("wrong");
    setTimeout(() => el.classList.remove("wrong"), 600);
  });
}
