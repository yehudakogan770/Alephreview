// Match up (like Wordwall's): drag each colorful tile into the box next to
// its match, then press Submit to see what's right.
// Content: { kind: "match", theme, pairs: [{ a: "א", b: "Aleph" }, …] }
//   a: the tile you drag   b: the word it goes next to
// Up to 6 pairs a round. Each pair counts once, when the round is submitted.

registerKind("match", {
  label: "Match up",
  play(body, content, api) {
    const pairs = api.shuffle(goodPairs(content));
    const rounds = api.chunk(pairs, 6);
    let r = 0;

    revealPairs(api, pairs);

    function round() {
      api.round(r + 1, rounds.length);
      const set = rounds[r];
      body.innerHTML = `
        <div class="og-matchup">
          <div class="og-bank" data-target="bank">
            ${api.shuffle(set.map((p, i) => ({ p, i }))).map(({ p, i }, k) => `
              <button class="og-tile" type="button" data-tile="${i}" style="--c:${api.color(k)}">
                <span class="og-tile-face" dir="auto">${api.esc(p.a)}</span>
              </button>`).join("")}
          </div>
          <ol class="og-rows">
            ${set.map((p, i) => `
              <li class="og-row">
                <span class="og-box" data-target="${i}"></span>
                <span class="og-word" dir="auto">${api.esc(p.b)}</span>
                <span class="og-mark" aria-hidden="true"></span>
              </li>`).join("")}
          </ol>
          <div class="og-submit-bar">
            <button class="og-btn og-go" type="button" data-submit>${api.t("gameSubmit")}</button>
          </div>
        </div>`;
      const root = body.querySelector(".og-matchup");
      const bank = root.querySelector(".og-bank");

      dragOrTap(root, (tile, target) => {
        api.sound.pop();
        api.say(set[tile.dataset.tile].a);
        if (target.dataset.target === "bank") { bank.append(tile); return; }
        const current = target.querySelector("[data-tile]");
        if (current === tile) return;
        const from = tile.parentElement;
        if (current) {
          // Swap: the tile already there goes where the new one came from.
          if (from.classList.contains("og-box")) from.append(current); else bank.append(current);
        }
        target.append(tile);
      });

      root.querySelector("[data-submit]").addEventListener("click", () => {
        const empty = root.querySelectorAll(".og-box:empty").length;
        if (empty && !root.dataset.warned) {
          root.dataset.warned = "1";
          root.querySelector("[data-submit]").textContent = api.t("gameSubmitAnyway").replace(/<[^>]*>/g, "");
          return;
        }
        root.classList.add("locked");
        let good = 0;
        root.querySelectorAll(".og-row").forEach(row => {
          const box = row.querySelector(".og-box");
          const tile = box.querySelector("[data-tile]");
          const ok = !!tile && tile.dataset.tile === box.dataset.target;
          row.classList.add(ok ? "right" : "wrongrow");
          row.querySelector(".og-mark").textContent = ok ? "✓" : "✗";
          if (ok) good++;
          api.mark(ok);
        });
        good === set.length ? api.sound.good() : api.sound.bad();
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

    if (!rounds.length) { emptyGame(body); return; }
    round();
  },
});
