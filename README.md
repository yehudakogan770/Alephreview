# Aleph Review Dojo

A website of Hebrew reading and fluency review games, set up like karate belts.

- **10 belts, in order:** White, Red, Orange, Yellow, Green, Blue, Purple, Brown, Gray, Black
- **3 stripes on each belt.** Each stripe has its own set of games.
- **Two ways to see a stripe's games:** *All games* (you can filter by game type), or *By game type* (games grouped under headings like Matching and Put in Order).
- Games open on Wordwall in a new tab. A green ✓ marks games a student has already opened on that device.

The site is plain HTML, CSS and JavaScript. It doesn't need a build step.

## View it

Open `index.html` in a browser. To put it online for free, turn on **GitHub Pages**: in the repo, go to Settings → Pages, choose "Deploy from a branch", then pick the branch and `/ (root)`.

## Add or change games

All the games are listed in [`js/games.js`](js/games.js), grouped by belt and then by stripe. Each game takes one line:

```js
{"id": "94309859", "title": "Match the Word to its Sound", "type": "match", "play": "94309/859/562"},
```

| Field   | What it is |
|---------|------------|
| `id`    | The number in the Wordwall link: `wordwall.net/resource/`**`94309859`** |
| `title` | The name students will see |
| `type`  | The game type, which is one of: `match`, `order`, `arcade`, `quiz`, `reading`, `flash`, `review` |
| `play`  | *(optional)* The student play link: `wordwall.net/play/`**`94309/859/562`**. Without it, the game opens its Wordwall resource page instead. |
| `thumb` | *(optional)* The picture ID from Wordwall's embed code |

To start a new belt (for example Yellow), add a block to `js/games.js` shaped like the `orange` block:

```js
  yellow: {
    1: [ ...games... ],
    2: [ ...games... ],
    3: [ ...games... ],
  },
```

Belts and stripes that have no games yet say "Coming soon". To rename a game type or add a new one, edit `GAME_TYPES` at the top of `js/games.js`.
