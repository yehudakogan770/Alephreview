// Win or lose (like Wordwall's Win or lose quiz): before each question, pick
// how many points to play for. Right wins them, wrong loses them.
// Content: same as Quiz. Points never go below 0.

const WL_POINTS = [100, 200, 300, 500];

registerKind("winlose", {
  label: "Win or lose",
  play(body, content, api) {
    const questions = goodQuestions(content);
    if (!questions.length) { emptyGame(body); return; }
    revealQuestions(api, questions);
    const order = api.shuffle(questions);
    let at = 0;
    let points = 0;
    const pts = n => api.t("gamePoints", { points: n });

    function pick() {
      api.round(at + 1, order.length, "gameQuestion");
      body.innerHTML = `
        <div class="og-wl">
          <div class="og-wl-total">${pts(points)}</div>
          <div class="og-question og-in" dir="auto">${bigHebrew(api.esc(order[at].q))}</div>
          <p class="og-ask">${api.t("gamePickPoints")}</p>
          <div class="og-wl-picks">
            ${WL_POINTS.map((p, i) => `<button class="og-wl-pick" type="button" data-p="${p}" style="--c:${QUIZ_COLORS[i]}">${p}</button>`).join("")}
          </div>
        </div>`;
      body.querySelectorAll("[data-p]").forEach(b => b.addEventListener("click", () => {
        api.sound.pop();
        ask(Number(b.dataset.p));
      }));
    }

    function ask(bet) {
      const extra = `<div class="og-wl-bar"><span class="og-wl-total">${pts(points)}</span><span class="og-wl-bet">${pts(bet)}</span></div>`;
      quizBoard(body, api, order[at], {
        extra,
        onPick(i, ok) {
          points = Math.max(0, points + (ok ? bet : -bet));
          const bar = body.querySelector(".og-wl-bar");
          bar.innerHTML = `<span class="og-wl-total">${pts(points)}</span><span class="og-wl-change ${ok ? "up" : "down"}">${ok ? "+" : "−"}${bet}</span>`;
          api.mark(ok);
          api.note(pts(points));
          api.later(() => {
            at++;
            if (at < order.length) pick();
            else api.finish();
          }, ok ? 1100 : 1800);
        },
      });
    }
    pick();
  },
});
