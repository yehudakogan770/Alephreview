// Pop the balloons (like Wordwall's Balloon pop): a balloon carries a tile
// back and forth above a row of carts. Pop it (click, tap or Space) when the
// tile is over its match. The tile drops into the cart below.
// Content: { kind: "balloon", theme, pairs: [{ a: tile, b: cart word }, …] }.
// Up to 4 carts a round. Each balloon counts once.

const BALLOON_SPEED = 22; // % of the width per second

registerKind("balloon", {
  label: "Pop the balloons",
  play(body, content, api) {
    const pairs = api.shuffle(goodPairs(content));
    if (pairs.length < 2) { emptyGame(body); return; }
    revealPairs(api, pairs);
    const rounds = api.chunk(pairs, 4);
    let r = 0;

    function round() {
      api.round(r + 1, rounds.length);
      const set = rounds[r];
      const carts = api.shuffle(set.map((p, i) => i));
      const queue = api.shuffle(set.map((p, i) => i));
      body.innerHTML = `
        <div class="og-sky" data-sky>
          <div class="og-balloon" data-balloon>
            <svg class="og-balloon-shape" viewBox="0 0 60 84" aria-hidden="true">
              <path d="M30 2C14 2 4 15 4 30c0 18 15 32 26 36 11-4 26-18 26-36C56 15 46 2 30 2z" fill="currentColor"/>
              <path d="M18 14c-4 4-6 9-6 14" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round" fill="none"/>
              <path d="M26 66h8l-4 6z" fill="currentColor"/>
              <path d="M30 72c-3 4 3 8 0 12" stroke="#6b7280" stroke-width="1.5" fill="none"/>
            </svg>
            <span class="og-tile og-balloon-tile"><span class="og-tile-face" data-carry dir="auto"></span></span>
          </div>
          <div class="og-carts" style="--n:${carts.length}">
            ${carts.map(i => `<div class="og-cart" data-cart="${i}"><span class="og-cart-in"></span><b dir="auto">${api.esc(set[i].b)}</b></div>`).join("")}
          </div>
        </div>`;
      const sky = body.querySelector("[data-sky]");
      const balloon = body.querySelector("[data-balloon]");
      const carry = body.querySelector("[data-carry]");
      const cartEls = [...body.querySelectorAll("[data-cart]")];
      let x = 8, dir = 1, flying = false, current = -1, shown = 0;

      function launch() {
        if (!queue.length) { api.later(next, 500); return; }
        current = queue.shift();
        carry.textContent = set[current].a;
        balloon.style.color = api.color(shown++);
        balloon.querySelector(".og-balloon-tile").style.setProperty("--c", balloon.style.color);
        balloon.className = "og-balloon";
        x = Math.random() < 0.5 ? 6 : 94;
        dir = x < 50 ? 1 : -1;
        balloon.style.left = `${x}%`;
        balloon.style.top = "";
        flying = true;
      }

      function pop() {
        if (!flying) return;
        flying = false;
        api.sound.pop();
        // The cart under the balloon's middle.
        const at = Math.min(cartEls.length - 1, Math.max(0, Math.floor((x / 100) * cartEls.length)));
        const cart = cartEls[at];
        balloon.classList.add("popped");
        balloon.style.left = `${((at + 0.5) / cartEls.length) * 100}%`;
        api.later(() => {
          const ok = Number(cart.dataset.cart) === current;
          api.mark(ok);
          if (ok) {
            api.sound.good();
            cart.classList.add("filled");
            cart.querySelector(".og-cart-in").innerHTML = `<span class="og-tile" style="--c:${balloon.style.color}"><span class="og-tile-face" dir="auto">${api.esc(set[current].a)}</span></span>`;
            balloon.className = "og-balloon gone";
          } else {
            api.sound.bad();
            flashWrong(cart);
            balloon.className = "og-balloon gone";
            // Show where it belonged.
            const home = cartEls.find(c => Number(c.dataset.cart) === current);
            home.classList.add("filled", "shown");
            home.querySelector(".og-cart-in").innerHTML = `<span class="og-tile" style="--c:${balloon.style.color}"><span class="og-tile-face" dir="auto">${api.esc(set[current].a)}</span></span>`;
          }
          api.later(launch, ok ? 500 : 1100);
        }, 550);
      }

      sky.addEventListener("pointerdown", e => { if (e.button > 0) return; e.preventDefault(); pop(); });
      const keys = e => {
        if (!api.alive() || !sky.isConnected) { document.removeEventListener("keydown", keys); return; }
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); pop(); }
      };
      document.addEventListener("keydown", keys);

      api.frame(dt => {
        if (!sky.isConnected) return false;
        if (!flying) return;
        x += dir * BALLOON_SPEED * dt;
        if (x > 94) { x = 94; dir = -1; }
        if (x < 6) { x = 6; dir = 1; }
        balloon.style.left = `${x}%`;
      });
      launch();
    }

    function next() {
      r++;
      if (r < rounds.length) round();
      else api.finish();
    }
    round();
  },
});
