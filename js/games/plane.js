// Fly the plane (like Wordwall's Airplane): clouds with tiles fly toward the
// plane. The word at the top says which one to fly into. Move the plane up and
// down with the mouse, a finger, or the arrow keys.
// Content: { kind: "plane", theme, pairs: [{ a: in the cloud, b: to find }, …] },
//   or questions (see findRounds in engine.js).
// Each word counts once: right if the first cloud hit is the right one.

const PLANE_X = 16;              // where the plane flies, % from the left
const PLANE_LANES = [34, 58, 82]; // cloud heights, % from the top
const CLOUD_SPEED = 15;          // % of the width per second

registerKind("plane", {
  label: "Fly the plane",
  play(body, content, api) {
    const order = findRounds(content, api);
    if (!order.length) { emptyGame(body); return; }
    let at = 0;

    body.innerHTML = `
      <div class="og-arena og-sky-run" data-arena>
        <div class="og-prompt og-arena-prompt"><span class="og-prompt-label">${api.t("gameFind")}</span> <b data-prompt dir="auto"></b></div>
        <svg class="og-plane" data-plane viewBox="0 0 120 70" aria-hidden="true">
          <path d="M8 36c0-6 6-10 14-10h62c12 0 26 6 30 10-4 4-18 10-30 10H22c-8 0-14-4-14-10z" fill="#fff" stroke="#25307a" stroke-width="3"/>
          <path d="M50 30 36 6h12l26 24z" fill="#e5383b" stroke="#25307a" stroke-width="3" stroke-linejoin="round"/>
          <path d="M50 42 38 64h12l24-22z" fill="#e5383b" stroke="#25307a" stroke-width="3" stroke-linejoin="round"/>
          <path d="M10 30 4 14h10l12 14z" fill="#1e9be9" stroke="#25307a" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="92" cy="34" r="4" fill="#1e9be9"/><circle cx="80" cy="34" r="4" fill="#1e9be9"/><circle cx="68" cy="34" r="4" fill="#1e9be9"/>
        </svg>
      </div>`;
    const arena = body.querySelector("[data-arena]");
    const prompt = body.querySelector("[data-prompt]");
    const plane = body.querySelector("[data-plane]");
    let y = PLANE_LANES[1], goal = y;
    let clouds = [];
    let marked = false;
    let resolved = false;
    let gap = 0;

    function show() {
      api.round(at + 1, order.length, "gameQuestion");
      prompt.textContent = order[at].prompt;
      api.say(order[at].prompt);
      prompt.classList.remove("og-in"); void prompt.offsetWidth; prompt.classList.add("og-in");
      marked = false;
      resolved = false;
      // One wave: the right cloud and two others, in mixed-up lanes.
      const r = order[at];
      const right = r.right[Math.floor(Math.random() * r.right.length)];
      const others = api.shuffle(r.options.filter(x => !r.right.includes(x))).slice(0, 2);
      const wave = api.shuffle([right, ...others]);
      clouds.forEach(c => c.el.remove());
      clouds = wave.map((text, k) => {
        const el = document.createElement("div");
        el.className = "og-cloud";
        el.innerHTML = `<span class="og-cloud-text" dir="auto">${api.esc(text)}</span>`;
        el.style.top = `${PLANE_LANES[k]}%`;
        arena.append(el);
        return { el, text, x: 112 + k * 4, y: PLANE_LANES[k], hit: false };
      });
    }

    function mark(ok) {
      if (!marked) api.mark(ok);
      marked = true;
    }

    const steer = e => {
      const box = arena.getBoundingClientRect();
      goal = Math.min(90, Math.max(28, ((e.clientY - box.top) / box.height) * 100));
    };
    arena.addEventListener("pointermove", steer);
    arena.addEventListener("pointerdown", e => { e.preventDefault(); steer(e); });
    const keys = e => {
      if (!api.alive()) { document.removeEventListener("keydown", keys); return; }
      const lane = PLANE_LANES.reduce((best, l, k) => Math.abs(l - goal) < Math.abs(PLANE_LANES[best] - goal) ? k : best, 0);
      if (e.key === "ArrowUp") { e.preventDefault(); goal = PLANE_LANES[Math.max(0, lane - 1)]; }
      if (e.key === "ArrowDown") { e.preventDefault(); goal = PLANE_LANES[Math.min(2, lane + 1)]; }
    };
    document.addEventListener("keydown", keys);

    api.frame(dt => {
      if (at >= order.length) return false;
      y += (goal - y) * Math.min(1, dt * 8);
      plane.style.top = `${y}%`;
      plane.style.rotate = `${Math.max(-12, Math.min(12, (goal - y) * 1.2))}deg`;
      if (resolved) {
        gap -= dt;
        if (gap <= 0) {
          at++;
          if (at < order.length) show();
          else { clouds.forEach(c => c.el.remove()); api.later(() => api.finish(), 300); return false; }
        }
      }
      for (const c of clouds) {
        if (c.hit) continue;
        c.x -= CLOUD_SPEED * dt;
        c.el.style.left = `${c.x}%`;
        if (!resolved && Math.abs(c.x - PLANE_X - 4) < 6 && Math.abs(c.y - y) < 10) {
          c.hit = true;
          const ok = order[at].right.includes(c.text);
          mark(ok);
          c.el.classList.add(ok ? "right" : "wrong");
          ok ? api.sound.good() : api.sound.bad();
          if (ok) { resolved = true; gap = 0.8; }
        }
      }
      // The wave went by without the right cloud: that's wrong, next word.
      if (!resolved && clouds.every(c => c.hit || c.x < -12)) {
        mark(false);
        resolved = true;
        gap = 0.2;
      }
    });
    show();
  },
});
