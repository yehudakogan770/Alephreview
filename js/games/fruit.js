// Fruit catch (like Wordwall's Flying fruit): fruit fly across the screen,
// each carrying a tile. The word to find is at the top. Tap its fruit.
// Content: { kind: "fruit", theme, pairs: [{ a: on the fruit, b: to find }, …] },
//   or questions (see findRounds in engine.js).
// The first tap for each word counts. After a wrong tap, keep looking.

const FRUITS = [
  { c: "#e5383b", leaf: "#2f9e44" }, // apple
  { c: "#ff8c1a", leaf: "#2f9e44" }, // orange
  { c: "#f2c230", leaf: "#6aa84f" }, // lemon
  { c: "#8e44ad", leaf: "#2f9e44" }, // plum
  { c: "#7cc43a", leaf: "#2f7d2a" }, // lime
  { c: "#ff6b8a", leaf: "#2f9e44" }, // peach
];

function fruitSvg(f) {
  return `<svg class="og-fruit-shape" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 22c-4-8-10-12-18-12 3 8 9 12 18 12z" fill="${f.leaf}"/>
    <path d="M50 24c3-8 2-14 0-18" stroke="#6b4a2b" stroke-width="4" stroke-linecap="round" fill="none"/>
    <circle cx="50" cy="58" r="38" fill="${f.c}"/>
    <ellipse cx="36" cy="44" rx="10" ry="7" fill="#fff" opacity=".35" transform="rotate(-30 36 44)"/>
  </svg>`;
}

registerKind("fruit", {
  label: "Fruit catch",
  play(body, content, api) {
    const order = findRounds(content, api);
    if (!order.length) { emptyGame(body); return; }
    let at = 0;
    let first = true;

    body.innerHTML = `
      <div class="og-arena" data-arena>
        <div class="og-prompt og-arena-prompt"><span class="og-prompt-label">${api.t("gameFind")}</span> <b data-prompt dir="auto"></b></div>
      </div>`;
    const arena = body.querySelector("[data-arena]");
    const prompt = body.querySelector("[data-prompt]");
    let flying = [];
    let wait = 0;
    let lane = 0;

    function show() {
      api.round(at + 1, order.length, "gameQuestion");
      prompt.textContent = order[at].prompt;
      api.say(order[at].prompt);
      prompt.classList.remove("og-in"); void prompt.offsetWidth; prompt.classList.add("og-in");
      first = true;
      wait = 0.2;
    }

    function spawn() {
      const r = order[at];
      // Often the right one, when it isn't flying now.
      const rightFlying = flying.some(f => r.right.includes(f.text) && !f.hit);
      const wrong = r.options.filter(x => !r.right.includes(x));
      const text = (!rightFlying && Math.random() < 0.6) || !wrong.length
        ? r.right[Math.floor(Math.random() * r.right.length)]
        : wrong[Math.floor(Math.random() * wrong.length)];
      const f = FRUITS[Math.floor(Math.random() * FRUITS.length)];
      const el = document.createElement("button");
      el.type = "button";
      el.className = "og-fruit";
      el.innerHTML = `${fruitSvg(f)}<span class="og-fruit-text" dir="auto">${api.esc(text)}</span>`;
      lane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
      const item = { el, shape: el.querySelector(".og-fruit-shape"), text, x: 108, y: 30 + lane * 22 + Math.random() * 6, speed: 14 + Math.random() * 6, spin: Math.random() * 20 - 10, hit: false };
      el.style.top = `${item.y}%`;
      el.addEventListener("pointerdown", e => { e.preventDefault(); tap(item); });
      arena.append(el);
      flying.push(item);
    }

    function tap(item) {
      if (item.hit || at >= order.length) return;
      const ok = order[at].right.includes(item.text);
      if (first) api.mark(ok);
      first = false;
      if (!ok) {
        api.sound.bad();
        item.el.classList.add("splat");
        item.hit = true;
        return;
      }
      api.sound.good();
      item.hit = true;
      item.el.classList.add("caught");
      at++;
      if (at < order.length) api.later(show, 350);
      else api.later(() => api.finish(), 700);
    }

    api.frame(dt => {
      if (at >= order.length) return false;
      wait -= dt;
      if (wait <= 0 && flying.filter(f => !f.hit).length < 4) { spawn(); wait = 1.1 + Math.random() * 0.5; }
      flying = flying.filter(f => {
        // A tapped fruit stays put while it shows right or wrong, then goes.
        if (f.hit) {
          f.fade = (f.fade || 0) + dt;
          if (f.fade > 0.5) { f.el.remove(); return false; }
          return true;
        }
        f.x -= f.speed * dt;
        f.el.style.left = `${f.x}%`;
        f.shape.style.rotate = `${(108 - f.x) * f.spin * 0.05}deg`;
        if (f.x < -10) { f.el.remove(); return false; }
        return true;
      });
    });
    show();
  },
});
