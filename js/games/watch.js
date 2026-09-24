// Watch and remember (like Wordwall's Watch and memorize): tiles show one at
// a time. Then they're mixed in with others. Tap the ones you saw.
// Content: { kind: "watch", theme, pairs: [{ a, b }, …] } (uses the tiles, a),
//   or { items: [] }.
// Each round shows 4 (fewer when there aren't many). Each tap counts.

const WATCH_SHOW = 1.6; // seconds each tile shows

registerKind("watch", {
  label: "Watch and remember",
  play(body, content, api) {
    const pool = [...new Set([...goodPairs(content).map(p => p.a), ...(content.items || [])].filter(Boolean))];
    if (pool.length < 4) { emptyGame(body); return; }
    const per = Math.min(4, Math.floor(pool.length / 2));
    const rounds = Math.min(3, Math.floor(pool.length / per));
    const mixed = api.shuffle(pool);
    let r = 0;

    function round() {
      api.round(r + 1, rounds);
      const seen = mixed.slice(r * per, r * per + per);
      const others = api.shuffle(pool.filter(x => !seen.includes(x))).slice(0, per);
      let k = 0;
      body.innerHTML = `
        <div class="og-watch">
          <p class="og-ask">${api.t("gameWatch")}</p>
          <div class="og-watch-stage"><span class="og-tile og-watch-tile"><span class="og-tile-face" data-show dir="auto"></span></span></div>
          <div class="og-watch-count">${seen.map(() => "<i></i>").join("")}</div>
        </div>`;
      const face = body.querySelector("[data-show]");
      const tile = body.querySelector(".og-watch-tile");
      const pips = [...body.querySelectorAll(".og-watch-count i")];

      function flash() {
        if (k >= seen.length) { api.later(pick, 400); return; }
        face.textContent = seen[k];
        api.say(seen[k]);
        tile.style.setProperty("--c", api.color(k + r));
        tile.classList.remove("og-in"); void tile.offsetWidth; tile.classList.add("og-in");
        tile.style.visibility = "visible";
        pips[k].classList.add("on");
        api.sound.pop();
        k++;
        api.later(() => { tile.style.visibility = "hidden"; api.later(flash, 300); }, WATCH_SHOW * 1000);
      }

      function pick() {
        const all = api.shuffle([...seen, ...others]);
        let found = 0;
        body.innerHTML = `
          <div class="og-watch">
            <p class="og-ask">${api.t("gamePickSeen")}</p>
            <div class="og-find-grid og-watch-grid" style="--cols:${Math.ceil(all.length / 2)}">
              ${all.map((x, i) => `<button class="og-tile" type="button" data-x="${i}" style="--c:${api.color(i)}"><span class="og-tile-face" dir="auto">${api.esc(x)}</span></button>`).join("")}
            </div>
          </div>`;
        body.querySelectorAll("[data-x]").forEach(b => b.addEventListener("click", () => {
          if (b.disabled || found === seen.length) return;
          b.disabled = true;
          const ok = seen.includes(all[b.dataset.x]);
          api.mark(ok);
          b.classList.add(ok ? "is-right" : "is-wrong");
          ok ? api.sound.good() : api.sound.bad();
          if (ok && ++found === seen.length) api.later(next, 900);
        }));
      }

      flash();
    }

    function next() {
      r++;
      if (r < rounds) round();
      else api.finish();
    }
    round();
  },
});
