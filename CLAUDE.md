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
- The admin page stays locked until an admin signs in with Google. The admin list lives only in the Firestore security rules (Firebase console), never in the repository.

## Rules for this site

- Hebrew runs right to left (letter tiles start with א on the right).
- Belt colors always appear in level order.
- Anything "coming soon" must not be clickable.
- After changing `js/*.js` or `css/style.css`, raise the `?v=` number in `index.html` so browsers load the new files.

## Workflow

- Test changes in a browser before merging.
- The owner wants every change merged right away: open a pull request, merge it, then confirm it is live.
