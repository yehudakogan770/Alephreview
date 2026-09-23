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

## Rules for this site

- Hebrew runs right to left (letter tiles start with א on the right).
- Belt colors always appear in level order.
- Anything "coming soon" must not be clickable.
- After changing `js/*.js` or `css/style.css`, raise the `?v=` number in `index.html` so browsers load the new files.

## Workflow

- Test changes in a browser before merging.
- The owner wants every change merged right away: open a pull request, merge it, then confirm it is live.
