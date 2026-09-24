// Fill the gaps (like Wordwall's Complete the sentence): lines with missing
// parts. Drag the tiles into the gaps, then Submit.
// Content: { kind: "gaps", theme, sentences: ["א ב [ג] ד", …] }  [ ] marks a gap.
// Up to 4 lines (and 8 gaps) a round. Each gap counts once.

function gapLines(content) {
  return (content.sentences || []).map(s => String(s || "").split(/\[([^\]]+)\]/))
    .filter(parts => parts.length > 1);
}

registerKind("gaps", {
  label: "Fill the gaps",
  play(body, content, api) {
    const lines = api.shuffle(gapLines(content));
    if (!lines.length) { emptyGame(body); return; }
    api.onReveal(el => {
      el.innerHTML = `<h3 class="og-answers-title">${api.t("gameAnswers")}</h3>
        <ul class="og-answer-lines">${lines.map(parts => `<li dir="auto">${parts.map((p, k) => k % 2 ? `<b>${api.esc(p)}</b>` : api.esc(p)).join("")}</li>`).join("")}</ul>`;
    });
    // Rounds: up to 4 lines and 8 gaps.
    const rounds = [];
    let cur = [], gaps = 0;
    for (const parts of lines) {
      const n = (parts.length - 1) / 2;
      if (cur.length && (cur.length === 4 || gaps + n > 8)) { rounds.push(cur); cur = []; gaps = 0; }
      cur.push(parts); gaps += n;
    }
    rounds.push(cur);
    let r = 0;

    function round() {
      api.round(r + 1, rounds.length);
      const set = rounds[r];
      const answers = [];
      const html = set.map(parts => `<li class="og-gap-line" dir="auto">${parts.map((p, k) => {
        if (k % 2 === 0) return api.esc(p);
        answers.push(p);
        return `<span class="og-gap" data-target="${answers.length - 1}"></span>`;
      }).join("")}<span class="og-mark" aria-hidden="true"></span></li>`).join("");
      body.innerHTML = `
        <div class="og-gaps">
          <div class="og-bank" data-target="bank">
            ${api.shuffle(answers.map((a, i) => ({ a, i }))).map(({ a, i }, k) => `
              <button class="og-tile" type="button" data-tile="${i}" style="--c:${api.color(k)}">
                <span class="og-tile-face" dir="auto">${api.esc(a)}</span>
              </button>`).join("")}
          </div>
          <ol class="og-gap-lines">${html}</ol>
          <div class="og-submit-bar"><button class="og-btn og-go" type="button" data-submit>${api.t("gameSubmit")}</button></div>
        </div>`;
      const root = body.querySelector(".og-gaps");
      const bank = root.querySelector(".og-bank");

      dragOrTap(root, (tile, target) => {
        api.sound.pop();
        if (target.dataset.target === "bank") { bank.append(tile); return; }
        const current = target.querySelector("[data-tile]");
        if (current === tile) return;
        const from = tile.parentElement;
        if (current) (from.classList.contains("og-gap") ? from : bank).append(current);
        target.append(tile);
      });

      root.querySelector("[data-submit]").addEventListener("click", () => {
        if (root.querySelector(".og-gap:empty") && !root.dataset.warned) {
          root.dataset.warned = "1";
          root.querySelector("[data-submit]").textContent = api.t("gameSubmitAnyway").replace(/<[^>]*>/g, "");
          return;
        }
        root.classList.add("locked");
        let good = 0;
        root.querySelectorAll(".og-gap").forEach(gap => {
          const tile = gap.querySelector("[data-tile]");
          // Same words are fine in either gap.
          const ok = !!tile && answers[tile.dataset.tile] === answers[gap.dataset.target];
          gap.classList.add(ok ? "right" : "wrongrow");
          if (!ok) gap.dataset.answer = answers[gap.dataset.target];
          if (ok) good++;
          api.mark(ok);
        });
        good === answers.length ? api.sound.good() : api.sound.bad();
        const bar = root.querySelector(".og-submit-bar");
        bar.innerHTML = `<button class="og-btn og-go" type="button" data-continue>${api.t(r + 1 < rounds.length ? "gameNextRound" : "gameSeeScore")} →</button>`;
        bar.querySelector("[data-continue]").addEventListener("click", next);
      });
    }

    function next() {
      r++;
      if (r < rounds.length) round();
      else api.finish();
    }
    round();
  },
});
