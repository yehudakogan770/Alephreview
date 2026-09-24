// Right or wrong (like Wordwall's True or false): a tile and a word are shown
// together. Is that the right match? Press Yes or No (or the arrow keys).
// Content: { kind: "truefalse", theme, pairs: [{ a, b }, …] }.
// About half the time the word is swapped for another pair's word.
// Or fixed statements: { statements: [{ a, b, right: true/false }, …] }.

registerKind("truefalse", {
  label: "Right or wrong",
  play(body, content, api) {
    // Fixed statements (content.statements: [{ a, b, right }]) or pairs the site mixes up.
    const fixed = (content.statements || []).filter(x => x && x.a && x.b);
    const pairs = fixed.length ? fixed.filter(x => x.right) : goodPairs(content);
    if (!fixed.length && pairs.length < 2) { emptyGame(body); return; }
    revealPairs(api, pairs);
    // Words can repeat (like "Kamatz"), so a mixed-up pair must show a different word.
    const items = fixed.length
      ? api.shuffle(fixed).map(x => ({ p: x, shown: x.b, right: !!x.right }))
      : api.shuffle(pairs).map(p => {
        const others = [...new Set(pairs.map(x => x.b))].filter(b => b !== p.b);
        if (!others.length || Math.random() < 0.5) return { p, shown: p.b, right: true };
        return { p, shown: api.shuffle(others)[0], right: false };
      });
    let at = 0;
    let busy = false;

    body.innerHTML = `
      <div class="og-tf">
        <p class="og-ask">${api.t("gameIsIt")}</p>
        <div class="og-tf-card" data-card>
          <span class="og-tile"><span class="og-tile-face" data-a dir="auto"></span></span>
          <span class="og-tf-eq">=</span>
          <span class="og-tf-word" data-b dir="auto"></span>
        </div>
        <p class="og-tf-fix" data-fix dir="auto"></p>
        <div class="og-tf-buttons">
          <button class="og-btn og-yes og-big" type="button" data-say="yes">✓ ${api.t("gameTrue")}</button>
          <button class="og-btn og-no og-big" type="button" data-say="no">✗ ${api.t("gameFalse")}</button>
        </div>
      </div>`;
    const card = body.querySelector("[data-card]");
    const fix = body.querySelector("[data-fix]");

    function show() {
      api.round(at + 1, items.length, "gameQuestion");
      const it = items[at];
      card.className = "og-tf-card og-in";
      card.querySelector(".og-tile").style.setProperty("--c", api.color(at));
      card.querySelector("[data-a]").textContent = it.p.a;
      card.querySelector("[data-b]").textContent = it.shown;
      fix.textContent = "";
      api.say(it.p.a);
      busy = false;
    }

    function answer(sayYes) {
      if (busy) return;
      busy = true;
      const it = items[at];
      const ok = sayYes === it.right;
      api.mark(ok);
      ok ? api.sound.good() : api.sound.bad();
      card.classList.add(ok ? "right" : "wrongrow");
      // When the pair shown was mixed up, show the real match.
      if (!it.right && !content.statements) fix.textContent = `${it.p.a} = ${it.p.b}`;
      api.later(() => {
        at++;
        if (at < items.length) show();
        else api.finish();
      }, it.right ? 900 : 1600);
    }

    body.querySelectorAll("[data-say]").forEach(b => b.addEventListener("click", () => answer(b.dataset.say === "yes")));
    const keys = e => {
      if (!api.alive()) { document.removeEventListener("keydown", keys); return; }
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "y") answer(true);
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "n") answer(false);
    };
    document.addEventListener("keydown", keys);
    show();
  },
});
