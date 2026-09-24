// Find it (like Wordwall's Find the match): the word to find is shown at the
// top. Tap its tile. Right tiles drop out, so the board gets smaller.
// Content: { kind: "find", theme, pairs: [{ a: tile, b: shown word }, …] }.
// Up to 8 a round. Right on the first tap counts as right.

registerKind("find", {
  label: "Find it",
  play(body, content, api) {
    const pairs = api.shuffle(goodPairs(content));
    const rounds = api.chunk(pairs, 8);
    let r = 0;
    revealPairs(api, pairs);

    function round() {
      api.round(r + 1, rounds.length);
      const set = rounds[r];
      const order = api.shuffle(set.map((p, i) => i));
      let at = 0;
      let first = true;
      body.innerHTML = `
        <div class="og-find">
          <div class="og-prompt"><span class="og-prompt-label">${api.t("gameFind")}</span> <b data-prompt dir="auto"></b></div>
          <div class="og-find-grid" style="--cols:${set.length <= 4 ? set.length : Math.ceil(set.length / 2)}">
            ${api.shuffle(set.map((p, i) => i)).map((i, k) => `
              <button class="og-tile" type="button" data-i="${i}" style="--c:${api.color(k)}">
                <span class="og-tile-face" dir="auto">${api.esc(set[i].a)}</span>
              </button>`).join("")}
          </div>
        </div>`;
      const prompt = body.querySelector("[data-prompt]");
      const show = () => { prompt.textContent = set[order[at]].b; api.say(set[order[at]].b); prompt.classList.remove("og-in"); void prompt.offsetWidth; prompt.classList.add("og-in"); };
      show();

      body.querySelectorAll("[data-i]").forEach(tile => tile.addEventListener("click", () => {
        if (tile.classList.contains("gone") || at >= order.length) return;
        if (Number(tile.dataset.i) === order[at]) {
          api.mark(first);
          api.sound.good();
          tile.classList.add("gone");
          tile.disabled = true;
          first = true;
          at++;
          if (at < order.length) show();
          else api.later(next, 600);
        } else {
          if (first) api.sound.bad();
          first = false;
          flashWrong(tile);
        }
      }));
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
