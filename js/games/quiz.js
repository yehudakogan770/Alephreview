// Quiz (like Wordwall's Quiz): a question and up to 6 answers. Tap one.
// Content: { kind: "quiz", theme, questions: [{ q, answers: [right, wrong, …] }] }
// quizBoard() is shared with Game show and Win or lose.

const QUIZ_SHAPES = [
  '<polygon points="12 3 22 20 2 20"/>',
  '<circle cx="12" cy="12" r="9"/>',
  '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/>',
  '<polygon points="12 2 22 12 12 22 2 12"/>',
  '<polygon points="12 2 14.9 8.6 22 9.3 16.6 14 18.2 21 12 17.3 5.8 21 7.4 14 2 9.3 9.1 8.6"/>',
  '<polygon points="12 2 21.5 8.9 17.9 20 6.1 20 2.5 8.9"/>',
];
const QUIZ_COLORS = ["#e5383b", "#1e9be9", "#f2b705", "#1fa45c", "#c250d8", "#ff8c1a"];

// Hebrew inside a question shows bigger, so a letter like ג is easy to see.
const bigHebrew = html => html.replace(/[\u0590-\u05FF\uFB1D-\uFB4F]+(?:\s+[\u0590-\u05FF\uFB1D-\uFB4F]+)*/g, m => `<span class="og-heb">${m}</span>`);

// Draws one question. onPick(index, ok) is called when an answer is tapped;
// it returns true to lock the board (false lets the student try again).
function quizBoard(el, api, q, { onPick, extra = "" }) {
  const answers = api.shuffle(q.answers.map((text, i) => ({ text, right: i < (q.right || 1) })));
  el.innerHTML = `
    <div class="og-quiz">
      <div class="og-question og-in" dir="auto">${bigHebrew(api.esc(q.q))}</div>
      ${extra}
      <div class="og-answers-grid${answers.length > 4 ? " six" : ""}">
        ${answers.map((a, i) => `
          <button class="og-answer${/^[\u0590-\u05FF\uFB1D-\uFB4F\s]{1,6}$/.test(a.text) ? " short" : ""}" type="button" data-n="${i}" style="--c:${QUIZ_COLORS[i]}">
            <svg class="og-shape" viewBox="0 0 24 24" aria-hidden="true">${QUIZ_SHAPES[i]}</svg>
            <span dir="auto">${api.esc(a.text)}</span>
          </button>`).join("")}
      </div>
    </div>`;
  const btns = [...el.querySelectorAll(".og-answer")];
  api.say(q.q);
  let locked = false;
  const board = {
    answers,
    buttons: btns,
    // Show the right answer and fade the rest.
    lock() {
      locked = true;
      btns.forEach((b, i) => { b.disabled = true; b.classList.add(answers[i].right ? "is-right" : "is-dim"); });
    },
    // Take away wrong answers (for 50 : 50).
    hideWrong(n) {
      api.shuffle(btns.filter((b, i) => !answers[i].right && !b.classList.contains("gone"))).slice(0, n)
        .forEach(b => { b.classList.add("gone"); b.disabled = true; });
    },
  };
  btns.forEach((b, i) => b.addEventListener("click", () => {
    if (locked || b.disabled) return;
    const ok = answers[i].right;
    ok ? api.sound.good() : api.sound.bad();
    b.classList.add(ok ? "is-right" : "is-wrong");
    if (onPick(i, ok) !== false) board.lock();
    else { b.disabled = true; flashWrong(b); }
  }));
  return board;
}

registerKind("quiz", {
  label: "Quiz",
  play(body, content, api) {
    const questions = goodQuestions(content);
    if (!questions.length) { emptyGame(body); return; }
    revealQuestions(api, questions);
    const order = api.shuffle(questions);
    let at = 0;

    function show() {
      api.round(at + 1, order.length, "gameQuestion");
      quizBoard(body, api, order[at], {
        onPick(i, ok) {
          api.mark(ok);
          api.later(() => {
            at++;
            if (at < order.length) show();
            else api.finish();
          }, ok ? 900 : 1700);
        },
      });
    }
    show();
  },
});
