// Game show (like Wordwall's Gameshow quiz): a quiz with a clock on each
// question, points for fast answers, and two helps you can use once each:
// 50 : 50 (takes away wrong answers) and Second try (one more go).
// Content: same as Quiz.

const SHOW_SECONDS = 20;

registerKind("gameshow", {
  label: "Game show",
  play(body, content, api) {
    const questions = goodQuestions(content);
    if (!questions.length) { emptyGame(body); return; }
    revealQuestions(api, questions);
    const order = api.shuffle(questions);
    const helps = { half: true, second: true };
    let at = 0;
    let points = 0;

    function show() {
      api.round(at + 1, order.length, "gameQuestion");
      const q = order[at];
      let left = SHOW_SECONDS;
      let over = false;
      let secondOn = false;
      const wrongs = q.answers.length - 1;
      const ring = 2 * Math.PI * 20;
      const extra = `
        <div class="og-show-bar">
          <span class="og-show-clock"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" class="track"/><circle cx="24" cy="24" r="20" class="left" data-ring style="stroke-dasharray:${ring};stroke-dashoffset:0"/></svg><b data-left>${SHOW_SECONDS}</b></span>
          <span class="og-show-points" data-points>${api.t("gamePoints", { points })}</span>
          <span class="og-show-helps">
            <button class="og-help" type="button" data-half${helps.half && wrongs > 1 ? "" : " disabled"}>${api.t("gameHalf")}</button>
            <button class="og-help" type="button" data-second${helps.second ? "" : " disabled"}>${api.t("gameSecondTry")}</button>
          </span>
        </div>`;

      const board = quizBoard(body, api, q, {
        extra,
        onPick(i, ok) {
          if (!ok && secondOn) {
            secondOn = false;
            body.querySelector("[data-second]").classList.remove("on");
            return false;
          }
          end(ok);
        },
      });
      body.querySelector(".og-quiz").classList.add("og-show");
      const leftEl = body.querySelector("[data-left]");
      const ringEl = body.querySelector("[data-ring]");

      body.querySelector("[data-half]").addEventListener("click", e => {
        if (over || !helps.half) return;
        helps.half = false;
        e.currentTarget.disabled = true;
        board.hideWrong(Math.min(2, wrongs - 1));
        api.sound.pop();
      });
      body.querySelector("[data-second]").addEventListener("click", e => {
        if (over || !helps.second) return;
        helps.second = false;
        secondOn = true;
        e.currentTarget.disabled = true;
        e.currentTarget.classList.add("on");
        api.sound.pop();
      });

      api.frame(dt => {
        if (over) return false;
        left = Math.max(0, left - dt);
        leftEl.textContent = Math.ceil(left);
        ringEl.style.strokeDashoffset = ring * (1 - left / SHOW_SECONDS);
        if (left <= 5) leftEl.parentElement.classList.add("low");
        if (left <= 0) {
          board.lock();
          api.sound.bad();
          body.querySelector(".og-question").insertAdjacentHTML("afterend", `<p class="og-timeup">${api.t("gameTimeUp")}</p>`);
          end(false);
          return false;
        }
      });

      function end(ok) {
        over = true;
        if (ok) points += 100 + Math.round(left) * 10;
        body.querySelector("[data-points]").textContent = api.t("gamePoints", { points }).replace(/<[^>]*>/g, "");
        api.mark(ok);
        api.note(api.t("gamePoints", { points }));
        api.later(() => {
          at++;
          if (at < order.length) show();
          else api.finish();
        }, ok ? 1000 : 1800);
      }
    }
    show();
  },
});
