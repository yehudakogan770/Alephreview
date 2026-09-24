// Whack it (like Wordwall's Whack-a-mole): tiles pop up out of holes. The top
// says which tiles to hit. Hit those, and leave the others.
// Content, either:
//   { kind: "whack", pairs: [{ a: tile, b: word }, …] }
//       Up to 6 words, one after the other. The right tile pops up 3 times for each.
//   { kind: "whack", prompt: "Hit the Fay", groups: [{ name, items }, …] }
//       One round: hit the first group's items, leave the other groups' items.
// Right hit: right. Wrong hit, or a right tile that got away: wrong.

const WHACK_UP = 2.4;   // seconds a tile stays up
const WHACK_TIMES = 3;  // times the right tile comes up for each word

registerKind("whack", {
  label: "Whack it",
  play(body, content, api) {
    // Each round: what to hit, the tiles to hit (each pops up once), and the others.
    let rounds;
    if (content.groups && content.groups.length) {
      const groups = content.groups.filter(g => g && g.items && g.items.length);
      if (!groups.length) { emptyGame(body); return; }
      const others = groups.slice(1).flatMap(g => g.items);
      rounds = [{ prompt: content.prompt || groups[0].name, right: api.shuffle(groups[0].items), wrong: others.length ? others : ["?"] }];
      api.onReveal(el => {
        el.innerHTML = `<h3 class="og-answers-title">${api.t("gameAnswers")}</h3>
          <p class="og-lead" dir="auto">${api.esc(rounds[0].prompt)}</p>
          <div class="og-answer-groups"><div class="og-answer-group" style="--c:${api.color(3)}"><span>${groups[0].items.map(x => `<i dir="auto">${api.esc(x)}</i>`).join("")}</span></div></div>`;
      });
    } else {
      const pairs = goodPairs(content);
      if (pairs.length < 2) { emptyGame(body); return; }
      revealPairs(api, pairs);
      rounds = api.shuffle(pairs).slice(0, 6).map(p => ({
        prompt: p.b,
        right: Array(WHACK_TIMES).fill(p.a),
        wrong: pairs.filter(x => x !== p).map(x => x.a),
      }));
    }
    let at = 0;

    body.innerHTML = `
      <div class="og-whack">
        <div class="og-prompt">${content.groups ? "" : `<span class="og-prompt-label">${api.t("gameFind")}</span> `}<b data-prompt dir="auto"></b></div>
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
    const up = new Map(); // hole index -> { text, right, left, done }
    let queue = [];       // right tiles still to pop up this round
    let wait = 0;
    let pause = 0;        // a short break before the next round

    function show() {
      // Clear the board for the new round.
      [...up.keys()].forEach(i => down(i));
      api.round(at + 1, rounds.length, "gameQuestion");
      prompt.textContent = rounds[at].prompt;
      api.say(rounds[at].prompt);
      prompt.classList.remove("og-in"); void prompt.offsetWidth; prompt.classList.add("og-in");
      queue = rounds[at].right.slice();
      wait = 0.8;
    }

    function popUp() {
      const free = holes.map((h, i) => i).filter(i => !up.has(i));
      if (!free.length) return;
      const i = free[Math.floor(Math.random() * free.length)];
      const r = rounds[at];
      const rightUp = [...up.values()].some(m => m.right && !m.done);
      const right = !rightUp && Math.random() < 0.5;
      const text = right ? queue.shift() : r.wrong[Math.floor(Math.random() * r.wrong.length)];
      const hole = holes[i];
      hole.querySelector(".og-tile").style.setProperty("--c", api.color(i));
      hole.querySelector(".og-tile-face").textContent = text;
      hole.className = "og-hole up";
      up.set(i, { text, right, left: WHACK_UP, done: false });
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
      api.mark(m.right);
      m.right ? api.sound.good() : api.sound.bad();
      hole.classList.add(m.right ? "hit" : "miss");
      api.later(() => { if (up.get(i) === m) down(i); }, 380);
    }));

    api.frame(dt => {
      if (at >= rounds.length) return false;
      for (const [i, m] of up) {
        if (m.done) continue;
        m.left -= dt;
        if (m.left <= 0) {
          // A right tile that got away counts as wrong.
          if (m.right) { api.mark(false); api.sound.bad(); }
          m.done = true;
          down(i);
        }
      }
      const active = [...up.values()].filter(m => !m.done).length;
      const rightUp = [...up.values()].some(m => !m.done && m.right);
      if (!queue.length && !rightUp) {
        pause += dt;
        if (pause < 0.6) return;
        pause = 0;
        at++;
        if (at < rounds.length) show();
        else { api.later(() => api.finish(), 500); return false; }
        return;
      }
      wait -= dt;
      if (wait <= 0 && active < 3 && queue.length) { popUp(); wait = 0.7 + Math.random() * 0.6; }
    });
    show();
  },
});
