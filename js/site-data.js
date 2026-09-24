// Loads the site's words, settings and games.
// Published changes live in Firebase (see js/firebase-config.js). If Firebase
// isn't set up or can't be reached, data/site.json is used instead.
// Text added after the site data was first published. Filled in when missing,
// so older published copies still show these words.
const TEXT_DEFAULTS = {
  homeworkButton: "My homework",
  homeworkTitle: "My homework",
  homeworkSignIn: "Sign in with Google to see your homework.",
  signInButton: "Sign in with Google",
  homeworkNone: "No homework right now.",
  homeworkDue: "Due {date}",
  homeworkDone: "Done",
  homeworkTypeName: "Type your name: **{name}**",
  homeworkBack: "Back to my homework",
  homeworkPlayed: "Played",
  gameStart: "Start",
  gameRound: "Round {n} of {total}",
  gameScore: "{right} of {total} right",
  gamePassMark: "Get {pass}% to pass.",
  gamePassed: "Passed",
  gameNotPassed: "You need {pass}% to pass. Try again.",
  gameTryAgain: "Try again",
  gameNext: "Next game",
  gameSubmit: "Submit answers",
  gameSubmitAnyway: "Some boxes are empty. Submit anyway?",
  gameNextRound: "Next round",
  gameSeeScore: "See my score",
  gameShowAnswers: "Show answers",
  gameAnswers: "Answers",
  gameQuestion: "Question {n} of {total}",
  gameAllDone: "All done",
  gamePlayAgain: "Play again",
  gameFind: "Find:",
  gameTrue: "Yes",
  gameFalse: "No",
  gameIsIt: "Is this right?",
  gameTimeUp: "Time's up",
  gameCheck: "Check",
  gameDone: "Done",
  gamePoints: "{points} points",
  gamePickPoints: "Pick your points",
  gameHalf: "50 : 50",
  gameSecondTry: "Second try",
  gameGoesIn: "Where does it go?",
  gameWatch: "Watch and remember.",
  gamePickSeen: "Tap the ones you saw.",
  gameSpin: "Spin",
  gameOpen: "Tap a box to open it.",
  gameFlip: "Tap the card to flip it.",
  gameDeal: "Next card",
  gameShuffle: "Shuffle",
  gameRemove: "Take it out",
  gameCardsLeft: "{n} left",
};

// Game types made on this site (js/games/*.js).
// noScore: games with no right or wrong (cards, wheels). They can't be homework.
const OWN_TEMPLATES = {
  "Match it": { group: "match", own: "match" },
  "Flip and match": { group: "match", own: "pairs" },
  "Find it": { group: "match", own: "find" },
  "Right or wrong": { group: "quiz", own: "truefalse" },
  "Pick the answer": { group: "quiz", own: "quiz" },
  "Game show": { group: "quiz", own: "gameshow" },
  "Win or lose": { group: "quiz", own: "winlose" },
  "Sort it": { group: "sort", own: "sort" },
  "Fast sort": { group: "sort", own: "speedsort" },
  "Sort the table": { group: "sort", own: "categorize" },
  "Put in order": { group: "order", own: "order" },
  "Build the word": { group: "order", own: "anagram" },
  "Fill the gaps": { group: "quiz", own: "gaps" },
  "Label it": { group: "match", own: "label" },
  "Pop the balloons": { group: "arcade", own: "balloon" },
  "Fruit catch": { group: "arcade", own: "fruit" },
  "Whack it": { group: "arcade", own: "whack" },
  "Fly the plane": { group: "arcade", own: "plane" },
  "Watch and remember": { group: "match", own: "watch" },
  "Spin it": { group: "cards", own: "spin", noScore: true },
  "Open a box": { group: "cards", own: "openbox", noScore: true },
  "Flip cards": { group: "cards", own: "flip", noScore: true },
  "Pick a card": { group: "cards", own: "deal", noScore: true },
  "Spin and answer": { group: "cards", own: "spinquiz" },
  "Open a box quiz": { group: "cards", own: "boxquiz" },
};
const OWN_HOWTO = {
  "Match it": "Drag each tile to its match. Then press Submit.",
  "Flip and match": "Flip two cards. Find each pair.",
  "Find it": "Read the word at the top. Tap its tile.",
  "Right or wrong": "Is it a match? Press Yes or No.",
  "Pick the answer": "Read the question. Tap the right answer.",
  "Game show": "Tap the right answer before time runs out. Each help works once.",
  "Win or lose": "Pick your points. Then tap the answer. Right wins the points. Wrong loses them.",
  "Sort it": "Drag each tile into its group.",
  "Fast sort": "Tap the side each tile goes to. You can use the arrow keys too.",
  "Sort the table": "Drag each tile into its column. Then press Submit.",
  "Put in order": "Drag them into order, from the top. Then press Submit.",
  "Build the word": "Tap the letters in order.",
  "Fill the gaps": "Drag each tile into its gap. Then press Submit.",
  "Label it": "Drag each label to its place. Then press Submit.",
  "Pop the balloons": "Pop the balloon when its tile is over the right cart. Click, tap or press Space.",
  "Fruit catch": "Read the word at the top. Tap the fruit with its tile.",
  "Whack it": "Read the word at the top. Hit its tile when it pops up. Leave the others.",
  "Fly the plane": "Read the word at the top. Move the plane up or down into its cloud.",
  "Watch and remember": "Watch the tiles. Then tap the ones you saw.",
  "Spin it": "Press Spin. Read what it lands on.",
  "Open a box": "Tap a box. Read what's inside.",
  "Flip cards": "Read the card. Tap it to flip it.",
  "Pick a card": "Press Next card. Read it out loud.",
  "Spin and answer": "Press Spin. Then tap the right answer.",
  "Open a box quiz": "Tap a box. Then tap the right answer.",
};

function withDefaults(data) {
  data.text = { ...TEXT_DEFAULTS, ...(data.text || {}) };
  // Game types made here always use the settings in this file.
  data.templates = { ...(data.templates || {}), ...OWN_TEMPLATES };
  data.howTo = { ...OWN_HOWTO, ...(data.howTo || {}) };
  return data;
}

async function fetchSiteData() {
  return withDefaults(await fetchSiteDataRaw());
}

async function fetchSiteDataRaw() {
  if (typeof FIREBASE_CONFIG !== "undefined" && FIREBASE_CONFIG) {
    try {
      const { projectId, apiKey } = FIREBASE_CONFIG;
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/site/content?key=${apiKey}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const doc = await res.json();
        const text = doc.fields && doc.fields.data && doc.fields.data.stringValue;
        if (text) return JSON.parse(text);
      }
    } catch (err) {
      console.warn("Using data/site.json:", err);
    }
  }
  // no-cache: always check for the newest copy.
  const res = await fetch("data/site.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`data/site.json: ${res.status}`);
  return res.json();
}
