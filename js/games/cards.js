// Card games with no score (like Wordwall's Spin the wheel, Open the box,
// Flash cards and Speaking cards). Good for reading out loud. They can't be
// homework, because there's no right or wrong.
//   spin     Spin it: spin a wheel, read what it lands on.   Content: { items: [] }
//   openbox  Open a box: tap a numbered box to open it.       Content: { items: [] }
//   flip     Flip cards: a card at a time, tap to flip it.    Content: { pairs: [{ a: front, b: back }] }
//   deal     Pick a card: deal cards from a deck, one by one. Content: { items: [] }
// And two with questions, which do have a score (like Wordwall's quiz versions):
//   spinquiz Spin and answer: the wheel picks a question.    Content: { questions: [] }
//   boxquiz  Open a box quiz: each box holds a question.      Content: { questions: [] }

function cardItems(content) {
  return [...(content.items || []), ...goodPairs(content).map(p => p.a)].filter(Boolean);
}

// The big card that shows what was picked.
function bigCard(api, text, color, buttons) {
  return `
    <div class="og-pop">
      <div class="og-bigcard og-in" style="--c:${color}"><span dir="auto">${api.esc(text)}</span></div>
      <div class="og-actions">${buttons}</div>
    </div>`;
}

// A question in the big card: tap an answer. done() runs after it shows right or wrong.
function questionPop(api, holder, q, color, done) {
  const answers = api.shuffle(q.answers.map((text, i) => ({ text, right: i < (q.right || 1) })));
  holder.innerHTML = `
    <div class="og-pop">
      <div class="og-bigcard og-qcard og-in" style="--c:${color}"><span dir="auto">${bigHebrew(api.esc(q.q))}</span></div>
      <div class="og-pop-answers">
        ${answers.map((a, i) => `<button class="og-answer${/^[\u0590-\u05FF\uFB1D-\uFB4F\s]{1,6}$/.test(a.text) ? " short" : ""}" type="button" data-n="${i}" style="--c:${QUIZ_COLORS[i % QUIZ_COLORS.length]}"><span dir="auto">${api.esc(a.text)}</span></button>`).join("")}
      </div>
    </div>`;
  api.say(q.q);
  const btns = [...holder.querySelectorAll(".og-answer")];
  btns.forEach((b, i) => b.addEventListener("click", () => {
    const ok = answers[i].right;
    api.mark(ok);
    ok ? api.sound.good() : api.sound.bad();
    btns.forEach((x, k) => { x.disabled = true; x.classList.add(answers[k].right ? "is-right" : k === i ? "is-wrong" : "is-dim"); });
    api.later(done, ok ? 900 : 1600);
  }));
}

registerKind("spin", { label: "Spin it", noScore: true, play: (body, content, api) => spinGame(body, content, api, false) });
registerKind("spinquiz", { label: "Spin and answer", play: (body, content, api) => spinGame(body, content, api, true) });

function spinGame(body, content, api, quiz) {
  {
    const questions = quiz ? api.shuffle(goodQuestions(content)).slice(0, 16) : null;
    let items = quiz ? questions.map(q => q.q) : api.shuffle(cardItems(content)).slice(0, 16);
    if (items.length < (quiz ? 1 : 2)) { emptyGame(body); return; }
    if (quiz) revealQuestions(api, questions);
    let turn = 0;
    let spinning = false;
    // Done shows up after a few spins, so the wheel is really played.
    let spins = 0;
    const need = Math.min(5, items.length);
    const doneBtn = () => spins >= need ? `<button class="og-btn" type="button" data-done>${api.t("gameDone")}</button>` : "";
    const bindDone = () => body.querySelector("[data-done]")?.addEventListener("click", () => api.finish());

    function draw() {
      const n = items.length;
      const slice = 360 / n;
      const pt = (deg, r) => [50 + r * Math.sin(deg * Math.PI / 180), 50 - r * Math.cos(deg * Math.PI / 180)];
      const slices = items.map((text, i) => {
        const [x1, y1] = pt(i * slice, 48), [x2, y2] = pt((i + 1) * slice, 48);
        const [tx, ty] = pt((i + 0.5) * slice, 32);
        const size = Math.max(3, Math.min(7, 34 / Math.max(3, n) + 2.6 - text.length * 0.3));
        return `<path d="M50 50 L${x1} ${y1} A48 48 0 ${slice > 180 ? 1 : 0} 1 ${x2} ${y2} Z" fill="${api.color(i)}" stroke="#fff" stroke-width=".6"/>
          <text x="${tx}" y="${ty}" font-size="${size}" transform="rotate(${(i + 0.5) * slice} ${tx} ${ty})">${api.esc(text)}</text>`;
      }).join("");
      body.innerHTML = `
        <div class="og-spin">
          <div class="og-wheel-wrap">
            <svg class="og-pointer" viewBox="0 0 20 24" aria-hidden="true"><path d="M10 24 0 4a10 10 0 0 1 20 0z" fill="#25307a"/></svg>
            <svg class="og-wheel" data-wheel viewBox="0 0 100 100" style="rotate:${turn}deg">
              <circle cx="50" cy="50" r="49.5" fill="#fff"/>
              ${slices}
              <circle cx="50" cy="50" r="6" fill="#fff" stroke="#25307a" stroke-width="1.5"/>
            </svg>
          </div>
          <div class="og-spin-side">
            <button class="og-btn og-go og-big" type="button" data-spin>${api.t("gameSpin")}</button>
            <span class="og-speed-left">${api.t("gameCardsLeft", { n: items.length })}</span>
            ${quiz ? "" : doneBtn()}
          </div>
          <div data-result></div>
        </div>`;
      body.querySelector("[data-spin]").addEventListener("click", spin);
      bindDone();
    }

    function spin() {
      if (spinning) return;
      spinning = true;
      const n = items.length;
      const pick = Math.floor(Math.random() * n);
      // Land in the middle part of the picked slice, under the pointer at the top.
      const inSlice = (0.2 + Math.random() * 0.6) * (360 / n);
      const target = 360 - (pick * (360 / n) + inSlice);
      turn += 360 * 5 + ((target - turn) % 360 + 360) % 360;
      const wheel = body.querySelector("[data-wheel]");
      wheel.style.transition = "rotate 4s cubic-bezier(.15, .85, .25, 1)";
      wheel.style.rotate = `${turn}deg`;
      api.sound.pop();
      api.later(() => {
        spinning = false;
        const res = body.querySelector("[data-result]");
        if (quiz) {
          // Answer it, then it comes off the wheel.
          questionPop(api, res, questions[pick], api.color(pick), () => {
            items.splice(pick, 1);
            questions.splice(pick, 1);
            if (!items.length) { api.finish(); return; }
            draw();
          });
          return;
        }
        api.sound.good();
        api.say(items[pick]);
        spins++;
        if (!body.querySelector("[data-done]") && doneBtn()) {
          body.querySelector(".og-spin-side").insertAdjacentHTML("beforeend", doneBtn());
          bindDone();
        }
        res.innerHTML = bigCard(api, items[pick], api.color(pick),
          `<button class="og-btn og-go" type="button" data-again>${api.t("gameSpin")}</button>
           <button class="og-btn" type="button" data-out>${api.t("gameRemove")}</button>`);
        res.querySelector("[data-again]").addEventListener("click", () => { res.innerHTML = ""; spin(); });
        res.querySelector("[data-out]").addEventListener("click", () => {
          items.splice(pick, 1);
          if (items.length < 2) { api.finish(); return; }
          draw();
        });
      }, 4100);
    }
    draw();
  }
}

registerKind("openbox", { label: "Open a box", noScore: true, play: (body, content, api) => boxGame(body, content, api, false) });
registerKind("boxquiz", { label: "Open a box quiz", play: (body, content, api) => boxGame(body, content, api, true) });

function boxGame(body, content, api, quiz) {
  {
    const questions = quiz ? api.shuffle(goodQuestions(content)).slice(0, 24) : null;
    const items = quiz ? questions.map(q => q.q) : api.shuffle(cardItems(content)).slice(0, 24);
    if (!items.length) { emptyGame(body); return; }
    if (quiz) revealQuestions(api, questions);
    const open = new Set();
    const cols = items.length <= 6 ? 3 : items.length <= 12 ? 4 : items.length <= 20 ? 5 : 6;
    body.innerHTML = `
      <div class="og-boxes-wrap">
        <p class="og-ask">${api.t("gameOpen")}</p>
        <div class="og-boxes" style="--cols:${cols}">
          ${items.map((x, i) => `
            <button class="og-box-btn" type="button" data-i="${i}" style="--c:${api.color(i)}">
              <span class="og-box-lid">${i + 1}</span>
              <span class="og-box-inside" dir="auto">${api.esc(x)}</span>
            </button>`).join("")}
        </div>
        <div data-result></div>
      </div>`;
    const res = body.querySelector("[data-result]");
    body.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => {
      const i = Number(b.dataset.i);
      b.classList.add("opened");
      if (quiz && open.has(i)) return;
      open.add(i);
      api.sound.pop();
      const last = open.size === items.length;
      if (quiz) {
        questionPop(api, res, questions[i], api.color(i), () => { res.innerHTML = ""; if (last) api.finish(); });
        return;
      }
      api.say(items[i]);
      res.innerHTML = bigCard(api, items[i], api.color(i),
        `<button class="og-btn og-go" type="button" data-close>${api.t(last ? "gameDone" : "gameNext").replace(/<[^>]*>/g, "")}</button>`);
      res.querySelector("[data-close]").addEventListener("click", () => {
        res.innerHTML = "";
        if (last) api.finish();
      });
    }));
  }
}

registerKind("flip", {
  label: "Flip cards",
  noScore: true,
  play(body, content, api) {
    let cards = goodPairs(content).map(p => ({ a: p.a, b: p.b }));
    if (!cards.length) cards = (content.items || []).filter(Boolean).map(a => ({ a, b: "" }));
    if (!cards.length) { emptyGame(body); return; }
    let at = 0;

    function show() {
      const c = cards[at];
      body.innerHTML = `
        <div class="og-flip">
          <p class="og-ask">${api.t("gameFlip")}</p>
          <button class="og-flipcard" type="button" data-card style="--c:${api.color(at)}">
            <span class="og-flipcard-in">
              <span class="og-flipcard-front" dir="auto">${api.esc(c.a)}</span>
              <span class="og-flipcard-back" dir="auto">${api.esc(c.b || c.a)}</span>
            </span>
          </button>
          <div class="og-flip-bar">
            <button class="og-btn" type="button" data-prev${at ? "" : " disabled"}>←</button>
            <span class="og-speed-left">${at + 1} / ${cards.length}</span>
            <button class="og-btn" type="button" data-shuffle>${api.t("gameShuffle")}</button>
            <button class="og-btn og-go" type="button" data-next>${at + 1 < cards.length ? "→" : api.t("gameDone")}</button>
          </div>
        </div>`;
      api.say(c.a);
      body.querySelector("[data-card]").addEventListener("click", e => { e.currentTarget.classList.toggle("up"); api.sound.pop(); api.say(e.currentTarget.classList.contains("up") ? (c.b || c.a) : c.a); });
      body.querySelector("[data-prev]").addEventListener("click", () => { if (at) { at--; show(); } });
      body.querySelector("[data-next]").addEventListener("click", () => { if (at + 1 < cards.length) { at++; show(); } else api.finish(); });
      body.querySelector("[data-shuffle]").addEventListener("click", () => { cards = api.shuffle(cards); at = 0; show(); });
    }
    show();
  },
});

registerKind("deal", {
  label: "Pick a card",
  noScore: true,
  play(body, content, api) {
    const deck = api.shuffle(cardItems(content));
    if (!deck.length) { emptyGame(body); return; }
    let dealt = 0;
    body.innerHTML = `
      <div class="og-deal">
        <div class="og-deck" data-deck>${[0, 1, 2].map(k => `<span class="og-deck-card" style="--k:${k}"></span>`).join("")}</div>
        <div class="og-table-spot" data-spot></div>
        <div class="og-flip-bar">
          <span class="og-speed-left" data-left>${api.t("gameCardsLeft", { n: deck.length })}</span>
          <button class="og-btn og-go og-big" type="button" data-deal>${api.t("gameDeal")}</button>
        </div>
      </div>`;
    const spot = body.querySelector("[data-spot]");
    const btn = body.querySelector("[data-deal]");
    function deal() {
      if (dealt >= deck.length) { api.finish(); return; }
      const text = deck[dealt];
      spot.innerHTML = `<div class="og-bigcard og-dealt" style="--c:${api.color(dealt)}"><span dir="auto">${api.esc(text)}</span></div>`;
      dealt++;
      api.sound.pop();
      api.say(text);
      body.querySelector("[data-left]").textContent = api.t("gameCardsLeft", { n: deck.length - dealt }).replace(/<[^>]*>/g, "");
      if (dealt >= deck.length) { btn.textContent = api.t("gameDone").replace(/<[^>]*>/g, ""); body.querySelector("[data-deck]").classList.add("empty"); }
    }
    btn.addEventListener("click", deal);
    body.querySelector("[data-deck]").addEventListener("click", deal);
  },
});
