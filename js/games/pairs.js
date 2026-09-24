// Flip and match (like Wordwall's Matching pairs): cards lie face down.
// Flip two at a time to find each tile and its match.
// Content: { kind: "pairs", theme, pairs: [{ a, b }, …] }. Up to 6 pairs a round.
// Each pair counts once. It counts as right unless a miss was one the student
// could have avoided (flipping a card already seen, or missing a partner already seen).

registerKind("pairs", {
  label: "Flip and match",
  play(body, content, api) {
    const pairs = api.shuffle(goodPairs(content));
    const rounds = api.chunk(pairs, 6);
    let r = 0;
    revealPairs(api, pairs);

    function round() {
      api.round(r + 1, rounds.length);
      const set = rounds[r];
      const cards = api.shuffle(set.flatMap((p, i) => [{ i, text: p.a, side: "a" }, { i, text: p.b, side: "b" }]));
      const cols = cards.length <= 6 ? 3 : cards.length <= 8 ? 4 : cards.length <= 10 ? 5 : 4;
      body.innerHTML = `
        <div class="og-memory" style="--cols:${cols}">
          ${cards.map((c, k) => `
            <button class="og-card" type="button" data-k="${k}" aria-label="Card ${k + 1}">
              <span class="og-card-in">
                <span class="og-card-back" style="--c:${api.color(k)}"></span>
                <span class="og-card-front${c.side === "a" ? " is-a" : ""}" dir="auto">${api.esc(c.text)}</span>
              </span>
            </button>`).join("")}
        </div>`;
      const els = [...body.querySelectorAll(".og-card")];
      const seen = new Set();
      let open = [];
      let slip = false;
      let found = 0;
      let busy = false;

      els.forEach((el, k) => el.addEventListener("click", () => {
        if (busy || el.classList.contains("up")) return;
        api.sound.pop();
        api.say(cards[k].text);
        el.classList.add("up");
        open.push(k);
        if (open.length < 2) return;
        const [x, y] = open;
        open = [];
        if (cards[x].i === cards[y].i) {
          els[x].classList.add("done");
          els[y].classList.add("done");
          api.mark(!slip);
          slip = false;
          found++;
          api.sound.good();
          if (found === set.length) api.later(next, 800);
        } else {
          const partner = k2 => cards.findIndex((c, j) => j !== k2 && c.i === cards[k2].i);
          if (seen.has(partner(x)) || seen.has(y)) slip = true;
          busy = true;
          api.sound.bad();
          flashWrong(els[x], els[y]);
          api.later(() => {
            els[x].classList.remove("up");
            els[y].classList.remove("up");
            busy = false;
          }, 950);
        }
        seen.add(x);
        seen.add(y);
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
