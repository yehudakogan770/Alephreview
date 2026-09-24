// Whack it (like Wordwall's Whack-a-mole): tiles pop up out of holes. The word
// at the top says which tile to hit. Hit it, and leave the others.
// Content: { kind: "whack", theme, pairs: [{ a: tile, b: word }, …] }.
// Up to 6 words, and the right tile pops up 3 times for each.
// Right hit: right. Wrong hit, or a right tile that got away: wrong.

const WHACK_UP = 2.4;   // seconds a tile stays up
const WHACK_TIMES = 3;  // times the right tile comes up for each word

registerKind("whack", {
  label: "Whack it",
  play(body, content, api) {
    const pairs = goodPairs(content);
    if (pairs.length < 2) { emptyGame(body); return; }
    revealPairs(api, pairs);
    const order = api.shuffle(pairs).slice(0, 6);
    let at = 0;

    body.innerHTML = `
      <div class="og-whack">
        <div class="og-prompt"><span class="og-prompt-label">${api.t("gameFind")}</span> <b data-prompt dir="auto"></b></div>
        <div class="og-holes">
          ${[...Array(9)].map((_, i) => `
            <div class="og-hole" data-hole="${i}">
              <span class="og-mound"></span>
              <span class="og-pit"><button class="og-mole" type="button" tabindex="-1"><span class="og-tile"><span class="og-tile-face" dir="auto"></span></span></button></span>
              <span class="og-lip"></span>
            </div>`).join("")}
        </div>
      </div>`;
    const prompt = body.querySelector("[data-prompt]");
    const holes = [...body.querySelectorAll("[data-hole]")];
    const up = new Map(); // hole index -> { p, left }
    let rightLeft = 0;    // right tiles still to show for this word
    let wait = 0;
    let pause = 0;        // a short break before the next word

    function show() {
      // Clear the board for the new word.
      [...up.keys()].forEach(i => down(i));
      api.round(at + 1, order.length, "gameQuestion");
      prompt.textContent = order[at].b;
      prompt.classList.remove("og-in"); void prompt.offsetWidth; prompt.classList.add("og-in");
      rightLeft = WHACK_TIMES;
      wait = 0.8;
    }

    function popUp() {
      const free = holes.map((h, i) => i).filter(i => !up.has(i));
      if (!free.length) return;
      const i = free[Math.floor(Math.random() * free.length)];
      const want = order[at];
      const rightUp = [...up.values()].some(m => m.p === want && !m.done);
      const p = rightLeft > 0 && !rightUp && Math.random() < 0.5 ? want : api.shuffle(pairs.filter(x => x !== want))[0];
      if (p === want) rightLeft--;
      const hole = holes[i];
      const tile = hole.querySelector(".og-tile");
      tile.style.setProperty("--c", api.color(i));
      hole.querySelector(".og-tile-face").textContent = p.a;
      hole.className = "og-hole up";
      up.set(i, { p, left: WHACK_UP, done: false });
    }

    function down(i, how) {
      holes[i].className = `og-hole${how ? " " + how : ""}`;
      up.delete(i);
    }

    holes.forEach((hole, i) => hole.querySelector(".og-mole").addEventListener("pointerdown", e => {
      e.preventDefault();
      const m = up.get(i);
      if (!m || m.done) return;
      m.done = true;
      const ok = m.p === order[at];
      api.mark(ok);
      ok ? api.sound.good() : api.sound.bad();
      hole.classList.add(ok ? "hit" : "miss");
      api.later(() => { if (up.get(i) === m) down(i); }, 380);
    }));

    api.frame(dt => {
      if (at >= order.length) return false;
      for (const [i, m] of up) {
        if (m.done) continue;
        m.left -= dt;
        if (m.left <= 0) {
          // A right tile that got away counts as wrong.
          if (m.p === order[at]) { api.mark(false); api.sound.bad(); }
          m.done = true;
          down(i);
        }
      }
      const active = [...up.values()].filter(m => !m.done).length;
      const rightUp = [...up.values()].some(m => !m.done && m.p === order[at]);
      if (rightLeft === 0 && !rightUp) {
        pause += dt;
        if (pause < 0.6) return;
        pause = 0;
        at++;
        if (at < order.length) show();
        else { api.later(() => api.finish(), 500); return false; }
        return;
      }
      wait -= dt;
      if (wait <= 0 && active < 3 && rightLeft > 0) { popUp(); wait = 0.7 + Math.random() * 0.6; }
    });
    show();
  },
});
