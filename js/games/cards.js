// Card games with no score (like Wordwall's Spin the wheel, Open the box,
// Flash cards and Speaking cards). Good for reading out loud. There's no right
// or wrong, so as homework they're done when played to the end.
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
  const questions = quiz ? api.shuffle(goodQuestions(content)).slice(0, 16) : null;
  let items = quiz ? questions.map(q => q.q) : api.shuffle(cardItems(content)).slice(0, 16);
  if (items.length < (quiz ? 1 : 2)) { emptyGame(body); return; }
  if (quiz) revealQuestions(api, questions);
  let turn = 0;
  let spinning = false;
  // Done shows up after a few spins, so the wheel is really played.
  let spins = 0;
  const need = Math.min(5, items.length);
  const plain = html => html.replace(/<[^>]*>/g, "");

  body.innerHTML = `
    <div class="og-spin">
      <div class="og-spin-stage">
        <div class="og-wheel-wrap" data-wrap>
          <svg class="og-wheel" data-wheel viewBox="0 0 100 100"></svg>
          <svg class="og-pointer" viewBox="0 0 26 22" aria-hidden="true"><path d="M1 7h13V1l11 10-11 10v-6H1z" fill="#f3f4f6" stroke="#8d949e" stroke-width="1.2" stroke-linejoin="round"/></svg>
        </div>
      </div>
      <div class="og-spin-bar" data-bar></div>
      <div data-result></div>
    </div>`;
  const wrap = body.querySelector("[data-wrap]");
  const wheel = body.querySelector("[data-wheel]");
  const bar = body.querySelector("[data-bar]");
  const res = body.querySelector("[data-result]");

  // The wheel: one slice for each thing on it. The arrow on the left picks.
  function drawWheel() {
    const n = items.length;
    const slice = 360 / n;
    const pt = (deg, r) => [50 + r * Math.sin(deg * Math.PI / 180), 50 - r * Math.cos(deg * Math.PI / 180)];
    wheel.innerHTML = `<circle cx="50" cy="50" r="49.6" fill="#fff"/>` + items.map((text, i) => {
      const [x1, y1] = pt(i * slice, 48), [x2, y2] = pt((i + 1) * slice, 48);
      const [tx, ty] = pt((i + 0.5) * slice, 33);
      const len = [...text.replace(/[֑-ׇ]/g, "")].length;
      const size = Math.max(2.6, Math.min(8, 40 / Math.max(3, n) + 3 - len * 0.45));
      const path = n === 1 ? `<circle cx="50" cy="50" r="48" fill="${api.color(i)}"/>` :
        `<path d="M50 50 L${x1} ${y1} A48 48 0 ${slice > 180 ? 1 : 0} 1 ${x2} ${y2} Z" fill="${api.color(i)}" stroke="#fff" stroke-width=".7"/>`;
      return `${path}<text x="${tx}" y="${ty}" font-size="${size}" transform="rotate(${(i + 0.5) * slice} ${tx} ${ty})">${api.esc(text)}</text>`;
    }).join("") + `<circle cx="50" cy="50" r="12" fill="#fff" stroke="#d5d9df" stroke-width="1"/>`;
  }

  function showBar(html) {
    bar.innerHTML = html;
    bar.querySelector("[data-spin]")?.addEventListener("click", spin);
    bar.querySelector("[data-done]")?.addEventListener("click", () => api.finish());
  }
  const spinBar = () => showBar(`
    <button class="og-btn og-go og-big" type="button" data-spin>${api.t("gameSpin")}</button>
    ${!quiz && spins >= need ? `<button class="og-btn" type="button" data-done>${api.t("gameDone")}</button>` : ""}`);

  function spin() {
    if (spinning) return;
    spinning = true;
    showBar("");
    const n = items.length;
    const slice = 360 / n;
    const pick = Math.floor(Math.random() * n);
    // Land in the middle part of the picked slice, at the arrow on the left (270°).
    const inSlice = (0.2 + Math.random() * 0.6) * slice;
    const target = 270 - (pick * slice + inSlice);
    turn += 360 * 5 + ((target - turn) % 360 + 360) % 360;
    wheel.style.transition = "rotate 5s cubic-bezier(.12, .75, .2, 1)";
    wheel.style.rotate = `${turn}deg`;
    // A click each time a slice passes the arrow.
    let last = null;
    api.frame(() => {
      const now = parseFloat(getComputedStyle(wheel).rotate) || 0;
      const at = Math.floor((now + 90) / slice);
      if (last !== null && at !== last) api.sound.tick();
      last = at;
      return spinning;
    });
    api.later(() => { spinning = false; landed(pick); }, 5150);
  }

  // Zoom in on the slice the arrow points at.
  function landed(pick) {
    wrap.classList.add("zoom");
    if (quiz) { api.later(() => ask(pick), 900); return; }
    spins++;
    api.sound.good();
    api.say(items[pick]);
    showBar(`
      <button class="og-btn og-go og-big" type="button" data-keep>${api.t("gameKeep")}</button>
      <button class="og-btn og-big" type="button" data-out>${api.t("gameRemove")}</button>`);
    bar.querySelector("[data-keep]").addEventListener("click", () => { wrap.classList.remove("zoom"); spinBar(); });
    bar.querySelector("[data-out]").addEventListener("click", () => {
      items.splice(pick, 1);
      wrap.classList.remove("zoom");
      if (items.length < 2) { api.finish(); return; }
      drawWheel();
      spinBar();
    });
  }

  // The picked question, big, with its answers A, B, … on the right.
  function ask(pick) {
    const q = questions[pick];
    const answers = q.answers.map((text, i) => ({ text, right: i < (q.right || 1) }));
    res.innerHTML = `
      <div class="og-spinq og-in">
        <div class="og-spinq-card" dir="auto">${bigHebrew(api.esc(q.q))}</div>
        <div class="og-spinq-answers">
          ${answers.map((a, i) => `<button class="og-answer" type="button" style="--c:${QUIZ_COLORS[i % QUIZ_COLORS.length]}"><b>${"ABCDEF"[i]}</b><span dir="auto">${api.esc(a.text)}</span></button>`).join("")}
        </div>
      </div>`;
    api.say(q.q);
    const btns = [...res.querySelectorAll(".og-answer")];
    btns.forEach((btn, i) => btn.addEventListener("click", () => {
      const ok = answers[i].right;
      api.mark(ok);
      ok ? api.sound.good() : api.sound.bad();
      btns.forEach((x, k) => { x.disabled = true; x.classList.add(answers[k].right ? "is-right" : k === i ? "is-wrong" : "is-dim"); });
      api.later(() => {
        res.innerHTML = "";
        items.splice(pick, 1);
        questions.splice(pick, 1);
        wrap.classList.remove("zoom");
        if (!items.length) { api.finish(); return; }
        drawWheel();
        spinBar();
      }, ok ? 900 : 1600);
    }));
  }

  drawWheel();
  spinBar();
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
    let deck = api.shuffle(cardItems(content));
    if (!deck.length) { emptyGame(body); return; }
    const total = deck.length;
    let pile = [];
    const plain = html => html.replace(/<[^>]*>/g, "");
    body.innerHTML = `
      <div class="og-deal">
        <div class="og-deal-table">
          <button class="og-cardpile" type="button" data-deck aria-label="${plain(api.t("gameDeal"))}"></button>
          <div class="og-cardpile" data-face></div>
        </div>
        <div class="og-spin-bar">
          <button class="og-btn" type="button" data-shuffle>${api.t("gameShuffle")}</button>
          <button class="og-btn" type="button" data-undo>${api.t("gameUndo")}</button>
          <button class="og-btn og-go og-big" type="button" data-deal>${api.t("gameDeal")}</button>
        </div>
      </div>`;
    const deckEl = body.querySelector("[data-deck]");
    const faceEl = body.querySelector("[data-face]");
    const dealBtn = body.querySelector("[data-deal]");
    // How thick a pile looks: up to 5cqh for the whole deck.
    const thick = n => `${(n / total) * 5}cqh`;
    const size = text => {
      const n = [...text.replace(/[֑-ׇ]/g, "")].length;
      return n <= 2 ? 14 : n <= 4 ? 10 : n <= 8 ? 7 : n <= 14 ? 5 : 3.6;
    };

    function draw(animate) {
      deckEl.style.setProperty("--t", thick(deck.length));
      deckEl.innerHTML = deck.length ? `<span class="og-deckback"><i>א</i></span>` : "";
      deckEl.disabled = !deck.length;
      faceEl.style.setProperty("--t", thick(Math.max(0, pile.length - 1)));
      const top = pile[pile.length - 1];
      faceEl.innerHTML = top === undefined ? `<span class="og-deckspot"></span>`
        : `<span class="og-deckface${animate ? " og-dealt" : ""}" style="--c:${api.color(pile.length - 1)};font-size:${size(top)}cqw" dir="auto">${api.esc(top)}</span>`;
      body.querySelector("[data-undo]").disabled = !pile.length;
      body.querySelector("[data-shuffle]").disabled = !pile.length;
      dealBtn.innerHTML = deck.length ? api.t("gameDeal") : api.t("gameDone");
    }
    function deal() {
      if (!deck.length) { api.finish(); return; }
      pile.push(deck.shift());
      api.sound.pop();
      api.say(pile[pile.length - 1]);
      draw(true);
    }
    dealBtn.addEventListener("click", deal);
    deckEl.addEventListener("click", deal);
    body.querySelector("[data-undo]").addEventListener("click", () => { if (pile.length) { deck.unshift(pile.pop()); draw(false); } });
    body.querySelector("[data-shuffle]").addEventListener("click", () => { deck = api.shuffle([...pile, ...deck]); pile = []; api.sound.pop(); draw(false); });
    draw(false);
  },
});

