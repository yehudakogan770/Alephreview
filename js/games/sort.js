// Sorting games. Content: { groups: [{ name, items: [] }, …] }
//   sort       Sort it (like Wordwall's Group sort): drag each tile into its group.
//              A wrong drop bounces back. Right on the first drop counts as right.
//   speedsort  Fast sort (like Speed sorting): one tile at a time, 2 groups.
//              Tap a side or press the arrow keys.
//   categorize Sort the table (like Categorize): fill the columns, then Submit.

function sortItems(content) {
  const groups = (content.groups || []).filter(g => g && g.name && g.items && g.items.length);
  return { groups, items: groups.flatMap((g, gi) => g.items.filter(Boolean).map(text => ({ text, gi }))) };
}

function revealGroups(api, groups) {
  api.onReveal(el => {
    el.innerHTML = `
      <h3 class="og-answers-title">${api.t("gameAnswers")}</h3>
      <div class="og-answer-groups">
        ${groups.map((g, gi) => `
          <div class="og-answer-group" style="--c:${api.color(gi)}">
            <b dir="auto">${api.esc(g.name)}</b>
            <span>${g.items.map(x => `<i dir="auto">${api.esc(x)}</i>`).join("")}</span>
          </div>`).join("")}
      </div>`;
  });
}

registerKind("sort", {
  label: "Sort it",
  play(body, content, api) {
    const { groups, items } = sortItems(content);
    if (groups.length < 2 || !items.length) { emptyGame(body); return; }
    revealGroups(api, groups);
    const rounds = api.chunk(api.shuffle(items), 12);
    let r = 0;

    function round() {
      api.round(r + 1, rounds.length);
      const set = rounds[r];
      const tried = new Set();
      let left = set.length;
      body.innerHTML = `
        <div class="og-sort" style="--groups:${groups.length}">
          <div class="og-pile">
            ${set.map((it, i) => `
              <button class="og-tile" type="button" data-tile="${i}" style="--c:${api.color(i + 3)}">
                <span class="og-tile-face" dir="auto">${api.esc(it.text)}</span>
              </button>`).join("")}
          </div>
          <div class="og-bins">
            ${groups.map((g, gi) => `
              <div class="og-bin" data-target="${gi}" style="--c:${api.color(gi)}">
                <b class="og-bin-name" dir="auto">${api.esc(g.name)}</b>
                <span class="og-bin-in"></span>
              </div>`).join("")}
          </div>
        </div>`;
      const root = body.querySelector(".og-sort");
      dragOrTap(root, (tile, bin) => {
        const i = Number(tile.dataset.tile);
        const ok = set[i].gi === Number(bin.dataset.target);
        if (!tried.has(i)) { tried.add(i); api.mark(ok); }
        if (!ok) { api.sound.bad(); flashWrong(bin, tile); return; }
        api.sound.good();
        tile.disabled = true;
        tile.classList.remove("selected");
        bin.querySelector(".og-bin-in").append(tile);
        if (--left === 0) api.later(next, 700);
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

registerKind("speedsort", {
  label: "Fast sort",
  play(body, content, api) {
    const { groups, items } = sortItems(content);
    const two = groups.slice(0, 2);
    const list = api.shuffle(items.filter(it => it.gi < 2));
    if (two.length < 2 || !list.length) { emptyGame(body); return; }
    revealGroups(api, two);
    let at = 0;
    let busy = false;

    body.innerHTML = `
      <div class="og-speed">
        <button class="og-side" type="button" data-side="0" style="--c:${api.color(0)}"><span class="og-side-arrow">←</span><b dir="auto">${api.esc(two[0].name)}</b></button>
        <div class="og-speed-mid">
          <p class="og-ask">${api.t("gameGoesIn")}</p>
          <div class="og-tile og-speed-tile" style="--c:${api.color(2)}"><span class="og-tile-face" data-item dir="auto"></span></div>
          <span class="og-speed-left" data-left></span>
        </div>
        <button class="og-side" type="button" data-side="1" style="--c:${api.color(1)}"><b dir="auto">${api.esc(two[1].name)}</b><span class="og-side-arrow">→</span></button>
      </div>`;
    const tile = body.querySelector(".og-speed-tile");
    const face = body.querySelector("[data-item]");
    const leftEl = body.querySelector("[data-left]");

    function show() {
      face.textContent = list[at].text;
      leftEl.textContent = api.t("gameCardsLeft", { n: list.length - at }).replace(/<[^>]*>/g, "");
      tile.className = "og-tile og-speed-tile og-in";
      tile.style.setProperty("--c", api.color(at + 2));
      busy = false;
    }

    function pick(side) {
      if (busy) return;
      busy = true;
      const ok = list[at].gi === side;
      api.mark(ok);
      const btn = body.querySelector(`[data-side="${side}"]`);
      btn.classList.add(ok ? "hit" : "miss");
      ok ? api.sound.good() : api.sound.bad();
      tile.classList.add(ok ? (side ? "go-right" : "go-left") : "wrong");
      api.later(() => {
        btn.classList.remove("hit", "miss");
        at++;
        if (at < list.length) show();
        else api.finish();
      }, ok ? 350 : 800);
    }

    body.querySelectorAll("[data-side]").forEach(b => b.addEventListener("click", () => pick(Number(b.dataset.side))));
    const keys = e => {
      if (!api.alive()) { document.removeEventListener("keydown", keys); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); pick(0); }
      if (e.key === "ArrowRight") { e.preventDefault(); pick(1); }
    };
    document.addEventListener("keydown", keys);
    show();
  },
});

registerKind("categorize", {
  label: "Sort the table",
  play(body, content, api) {
    const { groups, items } = sortItems(content);
    if (groups.length < 2 || !items.length) { emptyGame(body); return; }
    revealGroups(api, groups);
    const rounds = api.chunk(api.shuffle(items), 12);
    let r = 0;

    function round() {
      api.round(r + 1, rounds.length);
      const set = rounds[r];
      body.innerHTML = `
        <div class="og-table" style="--groups:${groups.length}">
          <div class="og-bank og-table-bank" data-target="bank">
            ${set.map((it, i) => `
              <button class="og-tile" type="button" data-tile="${i}" style="--c:${api.color(i + 3)}">
                <span class="og-tile-face" dir="auto">${api.esc(it.text)}</span>
              </button>`).join("")}
          </div>
          <div class="og-cols">
            ${groups.map((g, gi) => `
              <div class="og-col" style="--c:${api.color(gi)}">
                <b class="og-col-name" dir="auto">${api.esc(g.name)}</b>
                <div class="og-col-in" data-target="${gi}"></div>
              </div>`).join("")}
          </div>
          <div class="og-submit-bar"><button class="og-btn og-go" type="button" data-submit>${api.t("gameSubmit")}</button></div>
        </div>`;
      const root = body.querySelector(".og-table");
      const bank = root.querySelector(".og-bank");
      dragOrTap(root, (tile, target) => {
        api.sound.pop();
        const col = target.closest("[data-target]");
        (col.dataset.target === "bank" ? bank : col).append(tile);
      });

      root.querySelector("[data-submit]").addEventListener("click", () => {
        if (bank.querySelector("[data-tile]") && !root.dataset.warned) {
          root.dataset.warned = "1";
          root.querySelector("[data-submit]").textContent = api.t("gameSubmitAnyway").replace(/<[^>]*>/g, "");
          return;
        }
        root.classList.add("locked");
        let good = 0;
        set.forEach((it, i) => {
          const tile = root.querySelector(`[data-tile="${i}"]`);
          const col = tile.closest(".og-col-in");
          const ok = !!col && Number(col.dataset.target) === it.gi;
          tile.classList.add(ok ? "is-right" : "is-wrong");
          tile.disabled = true;
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
