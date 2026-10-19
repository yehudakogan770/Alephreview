# Aleph Review

**Read HANDOFF.md first for the full history, current status, and where everything lives.**

A website of Hebrew reading review games for kids at Ganeinu Academy, organized like karate belts:
10 belts in this order: White, Red, Orange, Yellow, Green, Blue, Purple, Brown, Gray, Black. Each belt has 3 stripes.
The goal is Hebrew reading and fluency. The layout and all instructions are in English.
It's plain HTML/CSS/JS with no build step, hosted on GitHub Pages from `main` of `yehudakogan770/Alephreview`.
Live: https://yehudakogan770.github.io/Alephreview/ (admin: `admin.html`).

## Who it's for

- **Kids.** Every word a student reads must be short and simple, with short sentences and easy words.
- Fun and engaging, but not distracting: nothing moves or pops up on a game page outside the game itself.
- Not childish either: no cartoon faces, no bubble fonts for headings, and no gushing praise ("better but too childish").
- Encouraging messages are few and plain, like "4 of 10 played" or "All done".
- Built for computers, but it also works on phones (portrait shows a "turn your phone sideways" hint).

## How the owner likes things done

- **Less work for the owner.** They said "whatever is less work for me" and "I don't want to have to do anything." Do things yourself instead of giving them steps, and only ask when you truly need a decision, a file, or a password.
- **Every change goes live right away:** commit, push, open a PR, merge it, then confirm the live site shows it (watch for the new `?v=` in `index.html`).
  - **Exception:** don't merge if the owner says not to. During the account handoff (Oct 2026) they asked to leave work on the branch.
- Talk to the owner in short, simple, non-technical sentences. They write quickly with typos, so read for intent.
- **Before asking**, check the code or the live site yourself. When something "doesn't work", reproduce it in a browser first.
- **When they say something looks wrong** (logo, music, layout), take it literally. Use exactly the asset they gave, check the live site, and remember browser caching. Give changed images a new file name.
- They wanted the games to look and play **exactly like the Wordwall versions** (same formats and flow). Our own code and art only.
- They have permission to use and recreate their school's Wordwall games and the music recordings they sent.
- Don't publish the admin guide PDF on the site. They wanted it given to them directly.

## Rules for this site

- Hebrew runs right to left. Letter tiles and rows start with א on the right.
- Belt colors always appear in level order.
- Anything "coming soon" must not be clickable.
- **After changing `js/*.js` or `css/*.css`, raise the `?v=` number in BOTH `index.html` and `admin.html`** so browsers load the new files.
- **Changed images get a new file name**, because browsers cache old images (the footer logo bit us twice).
- Hebrew letters use bold Times New Roman via the `"Hebrew Bold"` font-face, with Frank Ruhl Libre in `fonts/` as the fallback. Only Hebrew uses it (`unicode-range`); English stays Rubik/Fredoka.
- Footer: "© Games created by Ganeinu Academy." plus the school logo `img/ganeinu-academy-logo.png` (72px wide). This text is the `footer` site text.

## Content and the admin page

- All words, settings and games are site data, not code. `data/site.json` is the starting copy. Once something is published from `admin.html`, the Firestore document `site/content` becomes the live copy and wins over `data/site.json`.
  - As of Oct 2026, `site/content` did NOT exist yet (Firestore returned 404), so the live site uses `data/site.json`.
- New text students see goes in `TEXT_DEFAULTS` in `js/site-data.js`, plus a row in `TEXT_FIELDS` in `js/admin.js` so it can be edited. Never hard-code it in `js/app.js`.
- When content needs changing, prefer doing it in `data/site.json` while Firestore has no `site/content`. Otherwise tell the owner how to do it on the admin page.
- The admin page stays locked until an admin signs in with Google.
  - Full admins are listed only in the Firestore security rules (Firebase console), never in the repo.
  - Sub-admins are `editors/{email}` documents, managed on the Admins tab. They can do everything except manage admins.

## Homework

- Teachers make classes and homework on the admin page's Homework tab. Students sign in with Google at `#/homework` and see only homework whose `students` list has their email.
- Playing games never needs sign-in. Only homework does.
- While a homework game is open, the student's browser saves `progress/{homework}__{email}`: opened, seconds, and for games made here `best`, `last`, `tries`, `passed`. Card games save `done: true, passed: true` when played to the end.
- A homework game is done only when passed (score ≥ the homework's `pass`). Card games (no score) are done when played to the end.
- Wordwall embeds can't report scores. Old homework that lists a Wordwall game id plays its copy made here (`findAnyGame` in `js/app.js`, `gameById` in `js/admin.js`).

## Games made on this site

- `js/games/engine.js` runs every game: start screen, rounds, score dots, end screen, pass mark, sounds, background music and read-aloud.
  - Each game type is its own file calling `registerKind()`.
  - Its admin editor is in `CONTENT_EDITORS` / `VARIANT_EDITORS` in `js/admin.js`.
  - Its name and How to play default are in `OWN_TEMPLATES` / `OWN_HOWTO` in `js/site-data.js`. `OWN_TEMPLATES` always wins over the stored copy.
- In the site data, a game made here has `own: { kind, theme, ...content }` and no `embed`. Optional `own.speak` (read aloud) and `own.speech` (what to say for a text).
- 25 types: match, pairs, find, truefalse, quiz, gameshow, winlose, sort, speedsort, categorize, order, anagram, gaps, label, balloon, fruit, whack, plane, watch, spin, openbox, flip, deal, spinquiz, boxquiz. Card types (`noScore`) are spin, openbox, flip and deal.
- Themes (`own.theme`: meadow, desert, ocean, space, classic) are drawn as SVG in `js/games/themes.js`. Card pictures come from `js/games/thumbs.js`.
- Keep the fun, Wordwall-like look and formats, but all art and code are our own. **Never copy Wordwall's code, images or sounds.** (Downloading Wordwall media and music is also blocked by this environment's safety checks; don't try to work around that.)
- Own game type names must differ from the Wordwall template names in the site data.
- Game pages keep everything above the game in one slim row, so the game fills the screen height.
- Background music: the owner's recordings in `music/`, listed in `GAME_MUSIC` (lively/calm) in `engine.js`.
  - Lively songs play in `LIVELY_KINDS` (fast games). Each game picks by its place in the stripe, so neighboring games differ.
  - Volume is 0.25, ducked while reading aloud. `MUSIC_GAIN` boosts quiet tracks.
  - Tracks under 30 seconds are left out.
- Recreated Wordwall games have ids `own-<belt>-<stripe>-ww<wordwall id>` and sit where the original was. The originals have `hidden: true`, still play in Free play (`#/free`), and are needed for the old-homework mapping. Don't delete them.

## Commands

- Run locally: `python3 -m http.server 8784` in the repo root, then open http://localhost:8784/. (There's no build. In this environment the background server dies between commands, so start it in the same command as the test.)
- Browser tests: Playwright with Chromium at `/opt/pw-browsers/chromium` (don't run `playwright install`). The test scripts are in `handoff-files/test-scripts/`:
  - `kinds.js` + `players.js`: a bot plays every game made here and checks the score. Env: `KINDS=`, `IDS=`, `WRONG=1`, `BASE=`.
  - `harness.js`: a fake Firebase (sign-in + Firestore in memory) for admin and homework tests.
  - Run from a folder with `playwright` installed (`npm i playwright`).
- Check JS syntax: `node --check js/app.js` (and each file you changed).
- Deploy: merge to `main`. GitHub Pages publishes in about 1 to 2 minutes.
- `.claude/settings.json` allows `node`, `python3` and `curl` commands.

## Always / never

- Always test in a browser (Playwright) before merging, including phone sizes for layout changes.
- Always check for page errors and run the game bot on a few games after engine changes.
- Never commit secrets. The Firebase web config in `js/firebase-config.js` is public by design; the security rules protect the data.
- Never write test screenshots into the repo. Use the scratchpad, and use `__dirname` paths in scripts.
- Never put Wordwall's code, pages or screenshots of their games in this public repo.
