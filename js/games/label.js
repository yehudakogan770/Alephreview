// Label it (like Wordwall's Labelled diagram): big parts sit on a board, each
// with an empty label box. Drag each label to its part, then Submit.
// Content: { kind: "label", theme, pairs: [{ a: big part, b: label }, …] }.
// Up to 6 a round. Hebrew parts run right to left.

registerKind("label", {
  label: "Label it",
  play(body, content, api) {
    const pairs = goodPairs(content);
    if (!pairs.length) { emptyGame(body); return; }
    revealPairs(api, pairs);
    // Keep the order the teacher typed (a word's letters, the alef-bet…).
    const rounds = api.chunk(pairs, 6);
    let r = 0;

    function round() {
      api.round(r + 1, rounds.length);
      const set = rounds[r];
      const dir = set.some(p => isHebrew(p.a)) ? "rtl" : "ltr";
      body.innerHTML = `
        <div class="og-label">
          <div class="og-board" dir="${dir}" style="--n:${set.length}">
            ${set.map((p, i) => `
              <div class="og-part">
                <span class="og-part-big" dir="auto">${api.esc(p.a)}</span>
                <span class="og-pin" aria-hidden="true"></span>
                <span class="og-label-box" data-target="${i}"></span>
              </div>`).join("")}
          </div>
          <div class="og-bank" data-target="bank">
            ${api.shuffle(set.map((p, i) => ({ p, i }))).map(({ p, i }, k) => `
              <button class="og-tile og-label-tile" type="button" data-tile="${i}" style="--c:${api.color(k)}">
                <span class="og-tile-face" dir="auto">${api.esc(p.b)}</span>
              </button>`).join("")}
          </div>
          <div class="og-submit-bar"><button class="og-btn og-go" type="button" data-submit>${api.t("gameSubmit")}</button></div>
        </div>`;
      const root = body.querySelector(".og-label");
      const bank = root.querySelector(".og-bank");

      dragOrTap(root, (tile, target) => {
        api.sound.pop();
        if (target.dataset.target === "bank") { bank.append(tile); return; }
        const current = target.querySelector("[data-tile]");
        if (current === tile) return;
        const from = tile.parentElement;
        if (current) (from.classList.contains("og-label-box") ? from : bank).append(current);
        target.append(tile);
      });

      root.querySelector("[data-submit]").addEventListener("click", () => {
        if (root.querySelector(".og-label-box:empty") && !root.dataset.warned) {
          root.dataset.warned = "1";
          root.querySelector("[data-submit]").textContent = api.t("gameSubmitAnyway").replace(/<[^>]*>/g, "");
          return;
        }
        root.classList.add("locked");
        let good = 0;
        root.querySelectorAll(".og-label-box").forEach(box => {
          const tile = box.querySelector("[data-tile]");
          const ok = !!tile && set[tile.dataset.tile].b === set[box.dataset.target].b;
          box.parentElement.classList.add(ok ? "right" : "wrongrow");
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
    round();
  },
});
