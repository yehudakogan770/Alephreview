// Ordering games. Content: { items: [] }
//   order    Put in order (like Wordwall's Rank order): the items are mixed up.
//            Drag them (or tap two) to put them in order, top to bottom, then Submit.
//            items are in the right order. Up to 8 a round, in order.
//   anagram  Build the word (like Anagram): each item is a word. Its letters are
//            mixed up. Tap them in order (or drag them into the boxes).

const isHebrew = s => /[֐-׿יִ-ﭏ]/.test(s);

// Letters with their vowel marks stay together (בָּ is one tile).
function letterTiles(word) {
  if (window.Intl && Intl.Segmenter) return [...new Intl.Segmenter("he", { granularity: "grapheme" }).segment(word)].map(x => x.segment).filter(x => x.trim());
  return (word.match(/\P{M}\p{M}*/gu) || []).filter(x => x.trim());
}

// Shuffle, but never leave it the way it started (when that's possible).
function mixUp(api, list, same) {
  if (list.length < 2) return list.slice();
  for (let k = 0; k < 20; k++) {
    const out = api.shuffle(list);
    if (!out.every((x, i) => same(x, list[i]))) return out;
  }
  return list.slice().reverse();
}

registerKind("order", {
  label: "Put in order",
  play(body, content, api) {
    const items = (content.items || []).filter(Boolean);
    if (items.length < 2) { emptyGame(body); return; }
    api.onReveal(el => {
      el.innerHTML = `<h3 class="og-answers-title">${api.t("gameAnswers")}</h3>
        <ol class="og-answer-order">${items.map((x, i) => `<li><span class="og-num">${i + 1}</span><span dir="auto">${api.esc(x)}</span></li>`).join("")}</ol>`;
    });
    const rounds = api.chunk(items.map((text, i) => ({ text, i })), 8);
    let r = 0;

    function round() {
      api.round(r + 1, rounds.length);
      const set = rounds[r];
      const mixed = mixUp(api, set, (a, b) => a.i === b.i);
      body.innerHTML = `
        <div class="og-order">
          <ol class="og-nums">${set.map((_, k) => `<li><span class="og-num">${set[0].i + k + 1}</span></li>`).join("")}</ol>
          <ol class="og-rank">
            ${mixed.map((it, k) => `
              <li class="og-rank-item" data-tile="${it.i}" data-target="${it.i}" style="--c:${api.color(k)}">
                <span class="og-grip" aria-hidden="true">⋮⋮</span>
                <span class="og-rank-text" dir="auto">${api.esc(it.text)}</span>
                <span class="og-mark" aria-hidden="true"></span>
              </li>`).join("")}
          </ol>
          <div class="og-submit-bar"><button class="og-btn og-go" type="button" data-submit>${api.t("gameSubmit")}</button></div>
        </div>`;
      const root = body.querySelector(".og-order");
      const list = root.querySelector(".og-rank");
      dragOrTap(root, (tile, target) => {
        if (tile === target) return;
        api.sound.pop();
        api.say(tile.querySelector(".og-rank-text").textContent);
        const els = [...list.children];
        if (els.indexOf(tile) < els.indexOf(target)) target.after(tile);
        else target.before(tile);
      });
      root.querySelector("[data-submit]").addEventListener("click", () => {
        root.classList.add("locked");
        let good = 0;
        [...list.children].forEach((li, k) => {
          const ok = Number(li.dataset.tile) === set[k].i;
          li.classList.add(ok ? "right" : "wrongrow");
          li.querySelector(".og-mark").textContent = ok ? "✓" : "✗";
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

registerKind("anagram", {
  label: "Build the word",
  play(body, content, api) {
    const words = api.shuffle((content.items || []).filter(w => w && letterTiles(w).length > 1));
    if (!words.length) { emptyGame(body); return; }
    api.onReveal(el => {
      el.innerHTML = `<h3 class="og-answers-title">${api.t("gameAnswers")}</h3>
        <ul class="og-answer-list">${words.map((w, i) => `<li><span class="og-answer-word" dir="auto">${api.esc(w)}</span></li>`).join("")}</ul>`;
    });
    let at = 0;

    function show() {
      api.round(at + 1, words.length, "gameQuestion");
      const word = words[at];
      const parts = letterTiles(word);
      const mixed = mixUp(api, parts.map((t, i) => ({ t, i })), (a, b) => a.t === b.t);
      const dir = isHebrew(word) ? "rtl" : "ltr";
      body.innerHTML = `
        <div class="og-anagram">
          <div class="og-slots" dir="${dir}" style="--n:${parts.length}">
            ${parts.map((_, k) => `<span class="og-slot" data-target="${k}"></span>`).join("")}
          </div>
          <div class="og-bank og-letter-bank" dir="${dir}" data-target="bank">
            ${mixed.map((m, k) => `
              <button class="og-tile" type="button" data-tile="${k}" data-letter="${api.esc(m.t)}" style="--c:${api.color(k)}">
                <span class="og-tile-face">${api.esc(m.t)}</span>
              </button>`).join("")}
          </div>
          <div class="og-submit-bar" data-bar></div>
        </div>`;
      const root = body.querySelector(".og-anagram");
      const bank = root.querySelector(".og-bank");
      const slots = [...root.querySelectorAll(".og-slot")];

      function check() {
        if (slots.some(s => !s.firstElementChild)) return;
        root.classList.add("locked");
        const built = slots.map(s => s.firstElementChild.dataset.letter).join("");
        const ok = built === parts.join("");
        api.mark(ok);
        const bar = root.querySelector("[data-bar]");
        if (ok) {
          api.sound.good();
          root.classList.add("solved");
          api.later(next, 1000);
          return;
        }
        api.sound.bad();
        flashWrong(root.querySelector(".og-slots"));
        // Show the right word, then move on.
        api.later(() => {
          slots.forEach((s, k) => { s.innerHTML = `<span class="og-tile is-right" style="--c:${api.color(k)}"><span class="og-tile-face">${api.esc(parts[k])}</span></span>`; });
          bar.innerHTML = `<button class="og-btn og-go" type="button" data-continue>${api.t(at + 1 < words.length ? "gameNext" : "gameSeeScore").replace(/<[^>]*>/g, "")} →</button>`;
          bar.querySelector("[data-continue]").addEventListener("click", next);
        }, 700);
      }

      dragOrTap(root, (tile, target) => {
        api.sound.pop();
        if (target.dataset.target === "bank") { bank.append(tile); return; }
        const current = target.firstElementChild;
        if (current === tile) return;
        if (current) (tile.parentElement.classList.contains("og-slot") ? tile.parentElement : bank).append(current);
        target.append(tile);
        check();
      }, tile => {
        api.sound.pop();
        // A tap sends a letter to the first empty box, or back from a box.
        if (tile.parentElement.classList.contains("og-slot")) { bank.append(tile); return; }
        const empty = slots.find(s => !s.firstElementChild);
        if (empty) { empty.append(tile); check(); }
      });
    }

    function next() {
      at++;
      if (at < words.length) show();
      else api.finish();
    }
    show();
  },
});
