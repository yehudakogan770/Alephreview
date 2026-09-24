// Games made on this site ("own" games). Unlike Wordwall games, the site
// knows the score, so homework can require a passing score.
//
// A game in the site data looks like:
//   { id, title, type, game: "Match up", own: { kind: "match", theme: "meadow", ...content } }
// Each kind (js/games/*.js) registers itself with registerKind() and gets a
// small API to report answers and finish. Themes are in js/games/themes.js.

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

// Split into rounds of at most `size`, kept even (7 → 4 + 3, not 6 + 1).
function chunk(list, size) {
  const n = Math.ceil(list.length / size), out = [];
  for (let i = 0, at = 0; i < n; i++) {
    const len = Math.ceil((list.length - at) / (n - i));
    out.push(list.slice(at, at + len)); at += len;
  }
  return out;
}

function ogEsc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function clock(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

// ---- sounds: short tones, no files to load --------------------------------------

let ogCtx = null;
function ogAudio() {
  ogCtx = ogCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (ogCtx.state === "suspended") ogCtx.resume();
  return ogCtx;
}

const gameSound = (() => {
  const muted = () => { try { return localStorage.getItem("og-mute") === "1"; } catch { return false; } };
  function tone(freq, start, dur, type = "sine", vol = 0.18) {
    if (muted()) return;
    try {
      const ctx = ogAudio();
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
    pop() { tone(420, 0, 0.08, "square", 0.08); },
    done() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25)); },
    muted,
    toggle() { try { localStorage.setItem("og-mute", muted() ? "0" : "1"); } catch { /* ignore */ } return muted(); },
  };
})();

// ---- background music: a soft tune for each theme, played while a game runs -------
//
// Each song is 8 bars of eighth notes. "-" holds the note before, "." is a rest.
// One chord per bar gives the bass and a quiet arpeggio.
const GAME_SONGS = {
  meadow: { bpm: 112, wave: "triangle", vol: 0.05,
    chords: "C G Am F C G F C",
    tune: `E5 - G5 - A5 G5 E5 - | D5 - . B4 D5 - G5 - | C5 - E5 - A5 - G5 E5 | F5 - E5 - D5 - C5 - |
           E5 G5 C6 - B5 - G5 - | A5 - G5 - D5 - . . | F5 - A5 - G5 F5 E5 D5 | C5 - - - . . . .` },
  desert: { bpm: 100, wave: "triangle", vol: 0.05,
    chords: "Am Am G G F F E E",
    tune: `A4 - C5 - E5 - D5 C5 | B4 - A4 - . . E4 - | G4 - B4 - D5 - C5 B4 | A4 - G4 - . . . . |
           A4 - C5 - F5 - E5 D5 | C5 - A4 - . . C5 - | B4 - G#4 - B4 - D5 - | E5 - - - . . . .` },
  ocean: { bpm: 88, wave: "sine", vol: 0.06,
    chords: "F Dm A# C F Dm A# C",
    tune: `A4 - - C5 F5 - - . | E5 - D5 - A4 - - . | D5 - - F5 A#5 - A5 G5 | G5 - - - . . . . |
           C6 - A5 - F5 - - . | F5 - E5 - D5 - A4 - | A#4 - D5 - G5 - F5 E5 | E5 - - - G5 - - -` },
  space: { bpm: 80, wave: "sine", vol: 0.06,
    chords: "Dm A# F C Dm A# Gm A",
    tune: `D5 - - - A5 - - - | F5 - - - D5 - - - | C5 - - - F5 - A5 - | G5 - - - - - . . |
           D5 - F5 - A5 - D6 - | C6 - A#5 - F5 - - - | G5 - A#5 - D6 - C6 A#5 | A5 - - - C#5 - - -` },
  classic: { bpm: 116, wave: "square", vol: 0.022,
    chords: "G Em C D G C D G",
    tune: `G4 B4 D5 B4 G5 - D5 - | E5 - G5 - B4 - . . | C5 E5 G5 E5 C6 - G5 - | F#5 - A5 - D5 - . . |
           B5 - A5 - G5 - D5 - | E5 - G5 - C6 - B5 A5 | A5 - F#5 - D5 - E5 F#5 | G5 - - - . . . .` },
};

const gameMusic = (() => {
  const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = name => { const m = /^([A-G])(#?)(\d)$/.exec(name); return 12 * (+m[3] + 1) + NAMES[m[1]] + (m[2] ? 1 : 0); };
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const songs = {};
  // Turn a song into notes: { step, note, len, wave, vol }.
  function build(name) {
    if (songs[name]) return songs[name];
    const s = GAME_SONGS[name] || GAME_SONGS.meadow;
    const notes = [];
    const tokens = s.tune.replace(/\|/g, " ").trim().split(/\s+/);
    tokens.forEach((tok, i) => {
      if (tok === "-" || tok === ".") return;
      let len = 1;
      while (tokens[i + len] === "-") len++;
      notes.push({ step: i, note: midi(tok), len, wave: s.wave, vol: s.vol });
    });
    s.chords.split(/\s+/).forEach((c, bar) => {
      const m = /^([A-G]#?)(m?)$/.exec(c);
      const root = midi(m[1].length > 1 ? m[1][0] + "#3" : m[1] + "3");
      const third = root + (m[2] ? 3 : 4);
      const at = bar * 8;
      notes.push({ step: at, note: root - 12, len: 3, wave: "triangle", vol: 0.07 });
      notes.push({ step: at + 4, note: root - 12, len: 2, wave: "triangle", vol: 0.06 });
      notes.push({ step: at + 6, note: root - 5, len: 2, wave: "triangle", vol: 0.05 });
      [root + 12, third + 12, root + 19, third + 12].forEach((n, k) =>
        notes.push({ step: at + 1 + k * 2, note: n, len: 1, wave: "sine", vol: 0.022 }));
    });
    return (songs[name] = { bpm: s.bpm, steps: tokens.length, notes });
  }

  const off = () => { try { return localStorage.getItem("og-music") === "0"; } catch { return false; } };
  let song = null, theme = "meadow", alive = null, timer = null, out = null, step = 0, next = 0;

  function play(ctx, n, t, eighth) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const end = t + n.len * eighth * 0.92;
    osc.type = n.wave;
    osc.frequency.setValueAtTime(hz(n.note), t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(n.vol, t + 0.02);
    gain.gain.setValueAtTime(n.vol, Math.max(t + 0.02, end - 0.08));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(end + 0.05);
  }
  function tick() {
    if (!alive || !alive()) { stop(); return; }
    const ctx = ogAudio();
    const eighth = 30 / song.bpm;
    // Quieter while a word is read aloud; silent while the page is hidden.
    const talking = window.speechSynthesis && speechSynthesis.speaking;
    out.gain.setTargetAtTime(document.hidden ? 0 : talking ? 0.25 : 1, ctx.currentTime, 0.08);
    if (document.hidden) { next = ctx.currentTime + 0.1; return; }
    if (next < ctx.currentTime) next = ctx.currentTime + 0.05;
    while (next < ctx.currentTime + 0.3) {
      for (const n of song.notes) if (n.step === step) play(ctx, n, next, eighth);
      step = (step + 1) % song.steps;
      next += eighth;
    }
  }
  function stop() {
    clearInterval(timer);
    timer = null;
    if (out) {
      const o = out, ctx = ogAudio();
      o.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      setTimeout(() => o.disconnect(), 800);
      out = null;
    }
  }
  function begin() {
    stop();
    if (off() || gameSound.muted() || !alive || !alive()) return;
    try {
      const ctx = ogAudio();
      song = build(theme);
      const soft = ctx.createBiquadFilter();
      soft.type = "lowpass";
      soft.frequency.value = 2400;
      out = ctx.createGain();
      out.gain.value = 1;
      out.connect(soft).connect(ctx.destination);
      step = 0;
      next = ctx.currentTime + 0.1;
      tick();
      timer = setInterval(tick, 80);
    } catch { /* no sound available */ }
  }
  return {
    // Plays until isAlive() turns false (the game ends, restarts or is left).
    start(name, isAlive) { theme = name || "meadow"; alive = isAlive; begin(); },
    // After a sound or music button: start or stop to match.
    refresh() { if (off() || gameSound.muted()) stop(); else if (!timer) begin(); },
    off,
    toggle() { try { localStorage.setItem("og-music", off() ? "1" : "0"); } catch { /* ignore */ } this.refresh(); return off(); },
  };
})();

// ---- reading aloud: the computer's own voice (no sound files) --------------------
//
// A game with own.speak reads things out: api.say(text). own.speech can give what
// to say for a text (like "Bet" for בּ). Hebrew is read with a Hebrew voice
// when the computer has one.
const gameVoice = (() => {
  function say(text, lang) {
    try {
      if (!text || !window.speechSynthesis || gameSound.muted()) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = lang || (/[\u0590-\u05FF]/.test(text) ? "he-IL" : "en-US");
      u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch { /* no voice available */ }
  }
  return { say };
})();

const OG_ICONS = {
  sound: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  mute: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6"/><path d="m17 9 6 6"/>',
  play: '<polygon points="7 4 20 12 7 20 7 4" fill="currentColor"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  musicoff: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="m2 2 20 20"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
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
  const own = g.own || {};
  const kind = OWN_KINDS[own.kind];
  const theme = themeOf(own);
  const strip = html => String(html).replace(/<[^>]*>/g, "");
  let timer = null;
  let seconds = 0;
  let reveal = null;
  let note = "";

  stage.innerHTML = `
    <div class="og" data-kind="${ogEsc(own.kind)}" data-theme="${ogEsc(own.theme || "meadow")}">
      ${theme.scene()}
      <div class="og-top">
        <span class="og-timer" data-timer hidden>${ogIcon("clock")} <span>0:00</span></span>
        <span class="og-round" data-round></span>
        <span class="og-dots" data-dots></span>
        <button class="og-mute og-music" type="button" data-music title="${ogEsc(strip(opts.t("gameMusicButton")))}">${ogIcon(gameMusic.off() ? "musicoff" : "music")}</button>
        <button class="og-mute" type="button" data-mute title="${ogEsc(strip(opts.t("gameSoundButton")))}">${ogIcon(gameSound.muted() ? "mute" : "sound")}</button>
      </div>
      <div class="og-body" data-body></div>
    </div>`;
  const body = stage.querySelector("[data-body]");
  const roundEl = stage.querySelector("[data-round]");
  const dotsEl = stage.querySelector("[data-dots]");
  const timerEl = stage.querySelector("[data-timer]");
  stage.querySelector("[data-mute]").addEventListener("click", e => {
    e.currentTarget.innerHTML = ogIcon(gameSound.toggle() ? "mute" : "sound");
    gameMusic.refresh();
  });
  stage.querySelector("[data-music]").addEventListener("click", e => {
    e.currentTarget.innerHTML = ogIcon(gameMusic.toggle() ? "musicoff" : "music");
  });

  const stopTimer = () => { clearInterval(timer); timer = null; };
  const startTimer = () => {
    stopTimer();
    seconds = 0;
    timerEl.hidden = false;
    timerEl.querySelector("span").textContent = clock(0);
    timer = setInterval(() => {
      if (!stage.isConnected) { stopTimer(); return; }
      seconds++;
      timerEl.querySelector("span").textContent = clock(seconds);
    }, 1000);
  };

  if (!kind) {
    body.innerHTML = `<div class="og-screen"><div class="og-panel"><p class="og-lead">This game can't open.</p></div></div>`;
    return;
  }

  function startScreen() {
    roundEl.textContent = "";
    dotsEl.innerHTML = "";
    timerEl.hidden = true;
    body.innerHTML = `
      <div class="og-screen">
        <div class="og-panel og-start">
          <span class="og-kind">${ogEsc(g.game || kind.label)}</span>
          <h2 class="og-title" dir="auto">${ogEsc(g.title)}</h2>
          ${opts.howTo ? `<p class="og-lead">${ogEsc(opts.howTo)}</p>` : ""}
          ${opts.pass ? `<p class="og-passmark">${opts.t("gamePassMark", { pass: opts.pass })}</p>` : ""}
          <button class="og-btn og-go og-big" type="button" data-start>${ogIcon("play")} ${opts.t("gameStart")}</button>
        </div>
      </div>`;
    body.querySelector("[data-start]").addEventListener("click", begin);
  }

  let run = 0;

  function begin() {
    let marks = [];
    const me = ++run;
    const alive = () => me === run && stage.isConnected;
    reveal = null;
    note = "";
    dotsEl.innerHTML = "";
    const api = {
      // Called for each question: true if it was right.
      mark(ok) {
        marks.push(ok);
        dotsEl.insertAdjacentHTML("beforeend", `<i class="${ok ? "ok" : "no"}"></i>`);
      },
      round(n, total, key = "gameRound") { roundEl.textContent = total > 1 ? strip(opts.t(key, { n, total })) : ""; },
      // Read a text out loud, when this game reads aloud.
      say(text) { if (own.speak && text) gameVoice.say((own.speech || {})[text] || text); },
      // A line shown on the end screen, like points won.
      note(html) { note = html; },
      t: opts.t,
      sound: gameSound,
      shuffle,
      chunk,
      esc: ogEsc,
      color: i => TILE_COLORS[i % TILE_COLORS.length],
      // Lets the end screen offer "Show answers".
      onReveal(fn) { reveal = fn; },
      finish() { if (!alive()) return; run++; stopTimer(); kind.noScore ? doneScreen() : endScreen(marks); },
      // Timers and animation that stop by themselves when the game is left or restarted.
      alive,
      later(fn, ms) { setTimeout(() => { if (alive()) fn(); }, ms); },
      frame(fn) {
        let last = performance.now();
        const step = now => {
          if (!alive()) return;
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (fn(dt) !== false) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      // How many answers were right so far, and how many in all.
      tally() { return { right: marks.filter(Boolean).length, total: marks.length }; },
    };
    body.innerHTML = "";
    startTimer();
    // On a phone, bring the whole game into view.
    if (window.innerWidth <= 700 || window.innerHeight <= 520) {
      const box = stage.getBoundingClientRect();
      if (box.top < 0 || box.bottom > window.innerHeight) stage.scrollIntoView({ behavior: "smooth", block: box.height > window.innerHeight ? "start" : "center" });
    }
    gameMusic.start(own.theme, alive);
    kind.play(body, own, api);
  }

  // Games with no score (cards, wheels): just "All done".
  function doneScreen() {
    gameSound.done();
    roundEl.textContent = "";
    body.innerHTML = `
      <div class="og-screen">
        <div class="og-panel og-end">
          <p class="og-title">${opts.t("gameAllDone")}</p>
          <p class="og-time">${ogIcon("clock")} ${clock(seconds)}</p>
          <div class="og-actions">
            <button class="og-btn${opts.next ? "" : " og-go"}" type="button" data-again>${opts.t("gamePlayAgain")}</button>
            ${opts.next ? `<a class="og-btn og-go" href="${ogEsc(opts.next.href)}">${ogEsc(opts.next.label)} →</a>` : ""}
          </div>
        </div>
      </div>`;
    body.querySelector("[data-again]").addEventListener("click", begin);
  }

  function endScreen(marks) {
    const total = marks.length;
    const right = marks.filter(Boolean).length;
    const percent = total ? Math.round((right / total) * 100) : 0;
    const passed = opts.pass ? percent >= opts.pass : true;
    gameSound.done();
    roundEl.textContent = "";
    body.innerHTML = `
      <div class="og-screen">
        <div class="og-panel og-end">
          <div class="og-score${passed ? " pass" : " fail"}">
            <span class="og-percent">${percent}%</span>
            <span>${opts.t("gameScore", { right, total })}</span>
          </div>
          <p class="og-time">${ogIcon("clock")} ${clock(seconds)}</p>
          ${note ? `<p class="og-note">${note}</p>` : ""}
          ${opts.pass ? (passed
            ? `<p class="og-result pass">✓ ${opts.t("gamePassed")}</p>`
            : `<p class="og-result fail">${opts.t("gameNotPassed", { pass: opts.pass })}</p>`) : ""}
          <div class="og-actions">
            ${reveal ? `<button class="og-btn" type="button" data-reveal>${opts.t("gameShowAnswers")}</button>` : ""}
            <button class="og-btn${passed && opts.next ? "" : " og-go"}" type="button" data-again>${opts.t("gameTryAgain")}</button>
            ${opts.next ? `<a class="og-btn${passed ? " og-go" : ""}" href="${ogEsc(opts.next.href)}">${ogEsc(opts.next.label)} →</a>` : ""}
          </div>
        </div>
      </div>`;
    body.querySelector("[data-again]").addEventListener("click", begin);
    body.querySelector("[data-reveal]")?.addEventListener("click", () => {
      const fn = reveal;
      body.innerHTML = `<div class="og-screen"><div class="og-panel og-answers" data-answers></div></div>`;
      fn(body.querySelector("[data-answers]"));
      body.querySelector("[data-answers]").insertAdjacentHTML("beforeend",
        `<div class="og-actions"><button class="og-btn og-go" type="button" data-again>${opts.t("gameTryAgain")}</button></div>`);
      body.querySelector("[data-again]").addEventListener("click", begin);
    });
    if (opts.onFinish) opts.onFinish({ right, total, percent, passed, seconds });
  }

  startScreen();
}

// ---- drag or tap: shared by kinds where you move a tile onto a target ------------
//
// Tiles: elements with [data-tile]; targets: elements with [data-target].
// Tap a tile then a target, or drag the tile onto a target.
// onDrop(tile, target) is called when a tile lands on a target.
// With onTap(tile), a tap calls it instead of picking the tile up.
function dragOrTap(root, onDrop, onTap) {
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
    if (tile && onTap) { if (!tile.disabled && !root.classList.contains("locked")) onTap(tile); return; }
    if (tile && !tile.disabled && !root.classList.contains("locked")) {
      // Tapping a tile while another is picked, inside a target: drop onto that target.
      const holder = tile.closest("[data-target]");
      if (selected && selected !== tile && holder) { const t = selected; select(null); onDrop(t, holder); return; }
      select(selected === tile ? null : tile);
      return;
    }
    const target = e.target.closest("[data-target]");
    if (target && selected) { const t = selected; select(null); onDrop(t, target); }
  });

  root.addEventListener("pointerdown", e => {
    const tile = e.target.closest("[data-tile]");
    if (!tile || tile.disabled || e.button > 0 || root.classList.contains("locked")) return;
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
      // The ghost lives inside the game frame, so it keeps the game's sizes.
      drag.frame = root.closest(".og") || document.body;
      drag.ghost = drag.tile.cloneNode(true);
      drag.ghost.classList.add("og-ghost");
      Object.assign(drag.ghost.style, { width: `${box.width}px`, height: `${box.height}px` });
      drag.frame.append(drag.ghost);
      drag.tile.classList.add("dragging");
      drag.ox = e.clientX - box.left;
      drag.oy = e.clientY - box.top;
    }
    const f = drag.frame.getBoundingClientRect();
    drag.ghost.style.left = `${e.clientX - drag.ox - f.left}px`;
    drag.ghost.style.top = `${e.clientY - drag.oy - f.top}px`;
    root.querySelectorAll("[data-target].over").forEach(x => x.classList.remove("over"));
    const target = targetAt(e.clientX, e.clientY);
    if (target) target.classList.add("over");
  });

  function targetAt(x, y) {
    const under = document.elementsFromPoint(x, y).find(el => !el.classList.contains("og-ghost") && el.closest("[data-target]"));
    const target = under && under.closest("[data-target]");
    return target && root.contains(target) ? target : null;
  }

  const end = e => {
    if (!drag) return;
    const d = drag;
    if (d.moved) {
      d.ghost.remove();
      d.tile.classList.remove("dragging");
      root.querySelectorAll("[data-target].over").forEach(x => x.classList.remove("over"));
      const target = targetAt(e.clientX, e.clientY);
      if (target) onDrop(d.tile, target);
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

// "Show answers" for games built on pairs: every tile next to its match.
function revealPairs(api, pairs) {
  api.onReveal(el => {
    el.innerHTML = `
      <h3 class="og-answers-title">${api.t("gameAnswers")}</h3>
      <ul class="og-answer-list">
        ${pairs.map((p, i) => `
          <li><span class="og-tile-face small" style="--c:${api.color(i)}" dir="auto">${api.esc(p.a)}</span>
          <span class="og-answer-word" dir="auto">${api.esc(p.b)}</span></li>`).join("")}
      </ul>`;
  });
}

// "Show answers" for quiz games: each question and its right answer.
function revealQuestions(api, questions) {
  api.onReveal(el => {
    el.innerHTML = `
      <h3 class="og-answers-title">${api.t("gameAnswers")}</h3>
      <ul class="og-answer-list one">
        ${questions.map((q, i) => `
          <li><span class="og-answer-q" dir="auto">${api.esc(q.q)}</span>
          <span class="og-tile-face small" style="--c:${api.color(i)}" dir="auto">${api.esc(q.answers[0])}</span></li>`).join("")}
      </ul>`;
  });
}

// Rounds for "find the right one" games (Fruit catch, Fly the plane): what to
// find, the right answers, and all the answers. From pairs (find a by its b) or
// from questions. A question's first `right` answers are right (default 1).
function findRounds(content, api) {
  const qs = goodQuestions(content);
  if (qs.length) {
    revealQuestions(api, qs);
    return api.shuffle(qs).map(q => ({ prompt: q.q, right: q.answers.slice(0, q.right || 1), options: q.answers }));
  }
  const pairs = goodPairs(content);
  if (pairs.length < 2) return [];
  revealPairs(api, pairs);
  return api.shuffle(pairs).map(p => ({ prompt: p.b, right: [p.a], options: pairs.map(x => x.a) }));
}

// Pairs with both sides filled in.
function goodPairs(content) {
  return (content.pairs || []).filter(p => p && p.a && p.b);
}

// Questions with a right answer and at least one wrong one.
function goodQuestions(content) {
  return (content.questions || []).filter(q => q && q.q && q.answers && q.answers.length > 1 && q.answers[0]);
}

// Shown when a game has nothing in it yet.
function emptyGame(body) {
  body.innerHTML = `<div class="og-screen"><div class="og-panel"><p class="og-lead">This game is empty.</p></div></div>`;
}
