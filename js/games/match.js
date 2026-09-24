// Matching: put each answer next to its match.
// Content: { kind: "match", pairs: [{ a: "א", b: "Aleph" }, …] }
// Up to 6 pairs per round. A pair counts as right if its answer was placed
// correctly on the first try.

registerKind("match", {
  label: "Match it",
  howTo: "Drag each answer to its match.",
  play(body, content, api) {
    const pairs = api.shuffle((content.pairs || []).filter(p => p.a && p.b));
    const rounds = api.chunk(pairs, 6);
    let r = 0;

    function round() {
      api.round(r + 1, rounds.length);
      const set = rounds[r];
      const missed = new Set();
      let placed = 0;
      body.innerHTML = `
        <div class="og-match">
          <ol class="og-prompts">
            ${set.map((p, i) => `
              <li class="og-pair">
                <span class="og-card og-prompt" dir="auto">${api.esc(p.a)}</span>
                <button class="og-slot" type="button" data-target="${i}" aria-label="Put the match here"></button>
              </li>`).join("")}
          </ol>
          <div class="og-bank">
            ${api.shuffle(set.map((p, i) => ({ p, i }))).map(({ p, i }) => `
              <button class="og-card og-tile" type="button" data-tile="${i}" dir="auto">${api.esc(p.b)}</button>`).join("")}
          </div>
        </div>`;
      const root = body.querySelector(".og-match");

      dragOrTap(root, (tile, slot) => {
        if (slot.classList.contains("filled")) return false;
        const i = tile.dataset.tile;
        if (slot.dataset.target === i) {
          api.sound.good();
          slot.append(tile);
          tile.disabled = true;
          tile.classList.add("placed");
          slot.classList.add("filled");
          slot.closest(".og-pair").classList.add("done");
          api.mark(!missed.has(i));
          placed++;
          if (placed === set.length) setTimeout(next, 700);
          return true;
        }
        api.sound.bad();
        missed.add(i);
        flashWrong(tile, slot);
        return false;
      });
    }

    function next() {
      r++;
      if (r < rounds.length) round();
      else api.finish();
    }

    if (!rounds.length) { body.innerHTML = `<div class="og-screen"><p class="og-lead">No pairs yet.</p></div>`; return; }
    round();
  },
});
