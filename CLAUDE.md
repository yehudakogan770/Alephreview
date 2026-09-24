# Aleph Review

A website of Hebrew reading review games (from Wordwall) for kids, organized like karate belts:
10 belts (White, Red, Orange, Yellow, Green, Blue, Purple, Brown, Gray, Black), 3 stripes each.
Plain HTML/CSS/JS, no build step, hosted on GitHub Pages from `main`.

## Who it's for

- **Kids.** Every word a student reads must be short and simple: short sentences, easy words.
- Fun but not distracting: nothing moves or pops up on a game page.
- Not childish either: no cartoon faces, no bubble fonts for headings, no gushing praise.
- Encouraging messages: few and plain (e.g. "4 of 10 played", "All done").
- Built for computers. Phones don't need to be supported, but shouldn't break.

## Content and the admin page

- All words, settings and games are site data, not code: `data/site.json` is the starting copy; once Firebase is set up, the live copy is the Firestore document `site/content`, edited on `admin.html`.
- To change content, prefer telling the owner how to do it on the admin page. If you change `data/site.json` after Firebase is live, the site won't show it (the Firestore copy wins) unless it's published from the admin page.
- Any new text students see goes in `text` in the site data (editable on the admin page), not hard-coded in `js/app.js`.
- The admin page stays locked until an admin signs in with Google. Full admins are listed only in the Firestore security rules (Firebase console), never in the repository. Sub-admins are Firestore documents `editors/{email}`, managed by full admins on the Admins tab; they can do everything except manage admins.

## Homework

- Teachers (admins) make classes and homework on the admin page's Homework tab. Students sign in with Google on `#/homework` and see only homework whose `students` list has their email.
- Playing games never needs sign-in. Only homework does.
- While a homework game is open, students' browsers save `progress/{homework}__{email}`: opened, seconds, and for games made here `best`, `last`, `tries`, `passed`.
- A homework game is done only when it's passed (score ≥ the homework's `pass`, set by the teacher). Wordwall games can't report scores (checked: their embeds send nothing to the page), so homework uses only games made on this site.

## Games made on this site

- `js/games/engine.js` runs every game (start screen, rounds, score dots, end screen, pass mark, sounds). Each type is its own file calling `registerKind()`; the admin editor for it is in `CONTENT_EDITORS` in `js/admin.js`, and its name and How to play default are in `OWN_TEMPLATES` / `OWN_HOWTO` in `js/site-data.js`.
- In the site data a game made here has `own: { kind, ...content }` and no `embed`.
- Each game has a theme (`own.theme`: meadow, desert, ocean, space, classic), drawn as SVG in `js/games/themes.js`. Keep the fun Wordwall-like look and formats, but all art, code and content are our own: never copy Wordwall's images, sounds, code or other people's games.
- Types are built one at a time, each at least as good as the Wordwall version, and each ships with ready-made games (`own-<belt>-<stripe>` in `data/site.json`) so the owner has nothing to do. All Wordwall types in the site data are built (see the table in README.md); Labelled diagram uses big letters on a board instead of a picture. Card types (`noScore`) can't be homework.
- Own game type names must differ from Wordwall template names in the site data. `OWN_TEMPLATES` always wins over the stored copy.
- Game pages keep everything above the game in one slim row, so the game fills the screen height.

## Rules for this site

- Hebrew runs right to left (letter tiles start with א on the right).
- Belt colors always appear in level order.
- Anything "coming soon" must not be clickable.
- After changing `js/*.js` or `css/style.css`, raise the `?v=` number in `index.html` so browsers load the new files.

## Workflow

- Test changes in a browser before merging.
- The owner wants every change merged right away: open a pull request, merge it, then confirm it is live.
