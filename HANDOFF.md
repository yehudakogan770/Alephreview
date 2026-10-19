# HANDOFF: Aleph Review

This file lets a brand-new Claude session continue exactly where the last one stopped.
The last chat ran from Sep 23 to Oct 19, 2026, in one long Claude Code session that was compacted several times. The owner moved to a new Claude account, and that chat did not transfer.
Read this file, then `CLAUDE.md` (rules and preferences), then `README.md` (how the admin page works).

---

## 1. What this project is

**Aleph Review** is a website of Hebrew reading review games for the kids at **Ganeinu Academy** (the owner's school, ganeinuacademy.org).

- It's organized like karate belts: 10 belts (White, Red, Orange, Yellow, Green, Blue, Purple, Brown, Gray, Black), each with 3 stripes. Students earn a star per finished stripe.
- The goal is Hebrew reading and fluency. The layout is in English.
- In each stripe, students can view all games or filter by game type (for example, only matching games).
- It started as a page of the owner's existing **Wordwall** games (115 of them). All 115 were then recreated as games built into the site, so they can score, count for homework, and look and play like Wordwall without depending on it.
- Teachers (admins) edit everything on an admin page, make classes and homework, and see who passed.
- The owner's original brief is `handoff-files/uploads/hebrew_school.pdf`.

**Owner:** GitHub user `yehudakogan770`. They write short messages with typos, want the least possible work for themselves, and want every change live right away. See CLAUDE.md for the full list.

---

## 2. What's built and how it's structured

Plain HTML/CSS/JS, no build step, hosted on GitHub Pages from `main`.

| Path | What it is |
|---|---|
| `index.html`, `js/app.js`, `css/style.css` | Student site, a hash-routed single page. Routes: `#/` home, `#/<belt>`, `#/<belt>/<stripe>`, `#/<belt>/<stripe>/play/<id>`, `#/homework`, `#/homework/<hw>/<game>`, `#/free`, `#/free/<belt>`, `#/free/<belt>/play/<id>` |
| `admin.html`, `js/admin.js`, `css/admin.css` | Admin page. Tabs: Games, Words on the site, How to play, Home page, Homework, Admins |
| `js/site-data.js` | Loads site data (Firestore `site/content`, else `data/site.json`). Holds `TEXT_DEFAULTS`, `OWN_TEMPLATES` (25 game types), `OWN_HOWTO`, `withDefaults()` |
| `js/cloud.js` | Loads Firebase (Auth + Firestore) from gstatic when needed |
| `js/firebase-config.js` | Public Firebase web config for project `aleph-review` |
| `js/games/engine.js` | Runs every game made here: start/end screens, rounds, score, pass mark, sounds, **background music** (`GAME_MUSIC`, `LIVELY_KINDS`, `MUSIC_GAIN`), read-aloud (`gameVoice`), helpers (`registerKind`, `dragOrTap`, `findRounds`, …) |
| `js/games/*.js` | One file per game family: match, pairs, find, truefalse, quiz (quiz/gameshow/winlose helpers), gameshow, winlose, sort (sort/speedsort/categorize), order (order/anagram), gaps, label, balloon, fruit, whack, plane, watch, cards (spin/spinquiz/openbox/boxquiz/flip/deal) |
| `js/games/themes.js` | SVG backgrounds: meadow, desert, ocean, space, classic |
| `js/games/thumbs.js` | Game card pictures for games made here (Hebrew placed right to left) |
| `css/games.css` | Game styles (container-query units `cqw`/`cqh`) |
| `data/site.json` | All words, settings and games. 189 games made here plus 115 hidden Wordwall originals. Only White 1–3, Red 1–3, Orange 1–2 have games; every other stripe is "coming soon" |
| `music/` | 49 MP3 recordings sent by the owner (see the table below) |
| `fonts/frank-ruhl-libre-700-hebrew.woff2` | Hebrew fallback for bold Times New Roman (SIL OFL, credit in `fonts/README.md`) |
| `img/` | `favicon.svg` (the Aleph Review "א" mark), `favicon-32.png`, `apple-touch-icon.png`, `ganeinu-academy-logo.png` (school logo in the footer) |
| `.claude/settings.json` | Allows `node`, `python3` and `curl` commands for Claude Code |
| `handoff-files/` | Everything from the chat that wasn't otherwise in the repo (see section 8) |

**Game data shapes:**
- Wordwall game: `{ id: "<wordwall id>", title, game: "<Wordwall template>", type, embed: "<guid>?themeId=N", thumb, hidden? }`
- Game made here: `{ id: "own-…", title, game: "<own type name>", type, own: { kind, theme, speak?, speech?, …content } }`
- Content shapes:
  - `pairs [{a,b}]`
  - `questions [{q, answers[], right?}]` (the first `right` answers are correct)
  - `groups [{name, items}]`
  - `items []`
  - `sentences` with `[gaps]`
  - `statements [{a,b,right}]`
  - whack `{prompt, groups}`

**Firestore collections:** `site/content` (published site data as a JSON string), `admin/check`, `admin/owner`, `editors/{email}`, `classes/{id}`, `homework/{id}` (`title`, `className`, `students[]`, `items[{game, assign?}]`, `due`, `pass`), `progress/{hw}__{email}`.

---

## 3. Important decisions and why

1. **Plain static site on GitHub Pages.** Free, no build step, and the owner can't break a build.
2. **Firebase (project `aleph-review`) for admin sign-in, published content and homework.** It's free at this size. Security rules keep editing safe, and full admins live only in the rules, not the repo.
3. **Content is data, not code.** Words, game lists and How to play text are editable on the admin page without Claude ("system for admin to edit… not going through AI").
4. **Games built on the site instead of Wordwall embeds.** Wordwall embeds never report scores (checked: they send nothing to the page), and the owner wanted homework to count only when **played and passed**. So 25 game types were built, plus 74 ready-made games.
5. **All 115 Wordwall games recreated "the same as they were before".** The owner has permission. The content was read from each Wordwall embed page's data, and missing images were remade as text/letters (Labelled diagram uses big letters on a board). The originals are hidden but kept for Free play and old homework.
6. **Our own art and code only.** Wordwall's look and flow are matched (the owner wants "exactly the way it is in Wordwall", e.g. Spin the wheel and Speaking cards), but no Wordwall images, sounds or code. This environment also blocks downloading Wordwall media and music.
7. **Kid-friendly but not childish.** The owner rejected "too childish" designs and asked to "keep some of the fun stuff". All text is short and simple.
8. **Free play mode (Oct 7):** the owner asked for two options: star tracking, and an open mode with all the Wordwall links. Free play shows the Wordwall originals and saves nothing.
9. **Music:** the computer-made tunes were rejected ("too fake and empty"). The owner then sent 51 recordings (they say they have permission). 49 are used, sorted into lively and calm by measured busyness/tempo and matched to game type ("they should match the game that it's playing by"). The two under 30 seconds were left out.
10. **Hebrew in bold Times New Roman** (owner request). Frank Ruhl Libre is self-hosted for Chromebooks that lack Times New Roman, and it's applied to Hebrew characters only.
11. **Card games can be homework** (owner: "recreate those also"). They count as done when played to the end. Spin it shows Done only after a few spins.
12. **Footer** shows "© Games created by Ganeinu Academy." and the school logo. The logo was replaced on Oct 9 with the new one the owner sent.
13. **Custom domain:** don't touch `ganeinuacademy.org`'s `@`/`www` records, which run the school's website. Use a subdomain instead (`alephreview.ganeinuacademy.org`). Not done yet.

---

## 4. How to run, test and deploy

- **Run:** `python3 -m http.server 8784` in the repo root, then open http://localhost:8784/.
- **Test:** Playwright + Chromium at `/opt/pw-browsers/chromium`. Copy `handoff-files/test-scripts/` to a scratch folder, run `npm i playwright` there, then run `node kinds.js`.
  - `kinds.js` + `players.js` play every own game and report the score. Env: `IDS=own-white-1,…`, `KINDS=match,…`, `WRONG=1`, `BASE=<url>`.
  - For the live site, add `BASE=https://yehudakogan770.github.io/Alephreview/`. This sandbox also needed a proxy and an `SPKI` list; a new environment may not.
  - `harness.js` fakes Firebase sign-in and Firestore for admin and homework tests (`browser(b, user)`, `DB`).
  - Others: `hwtest.js` (homework), `rolestest.js` (admin roles), `phone*.js` (phone layout), `free.js` (free play), `speakopt.js` (read-aloud switch), `rec2.js` (music per game).
  - The full bot run over all 189 games takes about an hour. Run a sample with `IDS`/`KINDS`.
- **Deploy:** merge to `main`. GitHub Pages updates in about 1 to 2 minutes.
  - Always raise `?v=` in both `index.html` and `admin.html` after changing JS/CSS.
  - Confirm with `curl -s https://yehudakogan770.github.io/Alephreview/ | grep -o 'app.js?v=[0-9]*'`.
- **Current version:** `?v=56`.

---

## 5. WHERE EVERYTHING LIVES

### GitHub
- **Repo:** `yehudakogan770/Alephreview`, https://github.com/yehudakogan770/Alephreview. **Public.** Default branch `main`.
  - `main`: what the live site serves. Merging to `main` updates the live site automatically.
  - `claude/new-session-s1ja1d`: the working branch used by Claude for this whole project. All PRs (#1 to #43) came from it. **The handoff files (this file, the updated CLAUDE.md and README.md, and `handoff-files/`) are on this branch and NOT merged to `main`**, as the owner asked.
- No other repos are involved.

### Hosting and URLs
- **GitHub Pages**, from `main` (repo root, `.nojekyll`).
  - Site: https://yehudakogan770.github.io/Alephreview/
  - Admin: https://yehudakogan770.github.io/Alephreview/admin.html
  - Free play: https://yehudakogan770.github.io/Alephreview/#/free
  - Student homework: https://yehudakogan770.github.io/Alephreview/#/homework
  - Preview of unpublished admin edits: `index.html?preview`

### Domain
- `ganeinuacademy.org`: the school's domain. DNS is at **GoDaddy** (the owner was in GoDaddy's DNS screen).
  - Its `www` is a CNAME to `ganeinuacademy.org.`
  - The root runs the school's WordPress website. **Don't change `@` or `www`.**
- **Planned:** `alephreview.ganeinuacademy.org` → CNAME `alephreview` → `yehudakogan770.github.io`.
  - **UNCONFIRMED** whether the owner added it in GoDaddy.
  - Not yet set in GitHub Pages (needs a `CNAME` file or Settings → Pages → Custom domain).
  - Must also be added to Firebase Auth → Authorized domains.

### Firebase (Google)
- **Project ID:** `aleph-review` (authDomain `aleph-review.firebaseapp.com`, storage bucket `aleph-review.firebasestorage.app`, messagingSenderId `129617093110`, appId `1:129617093110:web:1d152f3b7cfd03d207a7d7`).
- The **Google account that owns the project is UNCONFIRMED.** Probably the owner's Google account that is the full admin (see below).
- **Authentication:** Google sign-in. Authorized domain should include `yehudakogan770.github.io` (UNCONFIRMED that it was added; admin sign-in worked in earlier testing only with the fake harness).
- **Firestore:** collections listed in section 2.
  - **Security rules live in the Firebase console** (the template is in README.md). The full-admin list is in those rules.
  - The owner asked to make **`yehudakogan770@gmail.com`** a full admin. UNCONFIRMED that the rules were published with it.
- **`site/content` has never been published** (Firestore REST returned 404 on Oct 7, 2026). The live site therefore uses `data/site.json`. The first "Save & publish" on the admin page will create it, and from then on Firestore wins over `data/site.json`.
- Homework, classes and progress data (if any teachers used it) live only in Firestore.

### Outside services the site loads
| Service | Used for |
|---|---|
| `www.gstatic.com/firebasejs/12.3.0/` | Firebase JS SDK (Auth, Firestore), loaded by `js/cloud.js` |
| `firestore.googleapis.com` | Firestore REST read of `site/content` (`js/site-data.js`) |
| `fonts.googleapis.com` / `fonts.gstatic.com` | Rubik and Fredoka fonts |
| `wordwall.net/embed/<guid>` | Plays the Wordwall originals in Free play (and old embeds) |
| `wordwall.net/resource/<id>`, `wordwall.net/play/…` | "Open on Wordwall" links |
| `screens.cdn.wordwall.net/200/…` | Wordwall game thumbnails (Free play cards, admin rows) |
| Browser `speechSynthesis` | Read-aloud (the computer's own voice; Hebrew needs a Hebrew voice installed) |

### Accounts
- **GitHub** `yehudakogan770`: owns the repo and Pages.
- **Google/Firebase**: project `aleph-review`. Full admins are in the Firestore rules; sub-admins are `editors/{email}` docs.
- **Wordwall**: the account that owns the 115 original games (author account UNCONFIRMED). The game links came from the owner's Word documents (`handoff-files/uploads/Wordwall-game-links.zip`).
- **GoDaddy**: DNS for `ganeinuacademy.org` (account holder UNCONFIRMED; probably the school).
- **Music:** recordings sent by the owner. They named **Zalmy Chanowitz** as the source and said they have permission for all of them (UNCONFIRMED in writing).

### Environment variables and keys
- **None.** The site has no server and no env vars.
- `js/firebase-config.js` holds the public Firebase web config (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`). It comes from Firebase console → Project settings → Your apps. These values are public by design; the Firestore rules protect the data.
- Test-only env vars (not secrets): `BASE`, `IDS`, `KINDS`, `WRONG`, `SPKI`, `HTTPS_PROXY`. `SPKI` and `HTTPS_PROXY` are only for the old sandbox's network proxy.

### Things outside the repo
- **Firestore data and rules:** Firebase console, project `aleph-review`.
- **GoDaddy DNS:** GoDaddy account for `ganeinuacademy.org`.
- **GitHub Pages settings:** repo Settings → Pages.
- **The old chat's full transcript:** about 88 MB, only in the old Claude Code session (not saved; this file replaces it).
- **The owner's Wordwall account** with the original games.

### Assumptions / UNCONFIRMED
- Which Google account owns Firebase project `aleph-review`, and whether the rules with `yehudakogan770@gmail.com` as full admin were published.
- Whether `yehudakogan770.github.io` is in Firebase Auth authorized domains. Homework and admin sign-in need it.
- Whether the GoDaddy CNAME `alephreview` was added.
- Whether any teachers have created classes or homework in Firestore yet.
- Permission for the music and for recreating the Wordwall games: the owner stated it; not verified.

---

## 6. Status

### Finished (all live on `main` at `?v=56`)
- Belts and stripes site, home page with letter tiles (right to left, clickable by level), stars, played counter, "coming soon" not clickable.
- Stripe page: All games / By game type, and type filter chips.
- Big game frame, full-screen button, How to play box, phone layout.
- Admin page:
  - Google sign-in, full admins and sub-admins.
  - Games tab: drag to reorder or move, add a Wordwall game by embed code, make a game here, edit, hide, delete.
  - Words, How to play and Home page tabs, Preview, and Save & publish.
  - Read-aloud switch.
- Homework: classes, homework with pass mark and due date, student sign-in, progress tracking, results table.
  - Old Wordwall items play their copies made here, and card games count as done.
- 25 game types, 74 ready-made games, and all 115 Wordwall games recreated (all bot-tested at 100%).
- Spin the wheel and Speaking cards reworked to match Wordwall's layout and flow.
- Free play mode (Wordwall originals, nothing saved).
- Hebrew in bold Times New Roman.
- Background music: 49 owner recordings, lively/calm by game type.
- Footer: "© Games created by Ganeinu Academy." with the new school logo.
- Admin guide PDF made and given to the owner (`handoff-files/deliverables/`).

### Still left / needs the owner
1. **Custom domain.** The owner must add the GoDaddy CNAME `alephreview` → `yehudakogan770.github.io` and tell Claude. Then:
   - add a `CNAME` file (`alephreview.ganeinuacademy.org`) or set it in Settings → Pages, and turn on Enforce HTTPS
   - add the domain in Firebase Auth → Authorized domains
2. **"Some recreated games didn't fully get what the game was about."** The owner must say which games. Fix them on the admin page or in `data/site.json`.
   - `handoff-files/deliverables/Games-To-Check.pdf` lists the games most likely to need a check.
3. **"Certain answers never showed up (e.g. find a letter)."** Not reproduced: the Find it code always shows the asked letter, and the bot passed every game. Needs the game name or a screenshot from the owner.
4. **Firestore publish.** `site/content` doesn't exist yet. Until someone presses Save & publish, the site uses `data/site.json`, and Claude can edit content there directly.
   - **After** the first publish, edits to `data/site.json` won't show on the site. Tell the owner to use the admin page, or re-publish.
5. **Music sorting.** Lively/calm was sorted by measurement, not by listening, and the second album's tracks were borderline. The owner may want some moved (`GAME_MUSIC` in `js/games/engine.js`).
6. **Optional ideas the owner hasn't answered:**
   - school logo on the admin page too
   - replacing the "א" Aleph Review mark with the school logo
   - a darker page background (they asked "how will it look", saw grey options, and kept the light cream)
7. **Unmerged handoff branch.** `HANDOFF.md`, the updated `CLAUDE.md`/`README.md` and `handoff-files/` are on `claude/new-session-s1ja1d` only. Merging them to `main` is safe: they're docs and files, and nothing visible on the site changes. But the owner asked not to merge during the handoff.

### Skipped and why
- **Wordwall's own music / taking tunes from Wordwall:** refused (Wordwall licenses its music, and the environment blocks the download). Replaced by the owner's recordings.
- **Downloading Kevin MacLeod (incompetech) music:** blocked by the environment's safety check. Not needed after the owner sent recordings.
- **Kain Bakodesh (14 s) and Taamu Ureu (27 s):** left out of the game music because they're too short to loop well. The files are in `handoff-files/uploads/`.
- **Publishing the admin guide PDF on the site:** the owner said to give it to them only.

---

## 7. Music: where each recording went

All recordings were uploaded by the owner on Oct 7, 2026 (two sets). `Group` decides which games play it:
- **lively:** balloon, whack, fruit, plane, speed sort, game show, win or lose, spin-and-answer, box quiz
- **calm:** everything else

| File in `music/` | Original upload (track) | Album | Group | Size |
|---|---|---|---|---|
| `al-hasela.mp3` | 4. Al Hasela | 2nd upload set (Oct 7, tracks 1-30) | lively | 1418 KB |
| `ani-omarti.mp3` | 12. Ani Omarti | 2nd upload set (Oct 7, tracks 1-30) | calm | 1825 KB |
| `anim-zemiros.mp3` | 6. Anim Zemiros | 1st upload set (Oct 7, tracks 1-21) | lively | 3439 KB |
| `ascend.mp3` | 12. Ascend | 1st upload set (Oct 7, tracks 1-21) | lively | 4976 KB |
| `ashreinu.mp3` | 22. Ashreinu | 2nd upload set (Oct 7, tracks 1-30) | calm | 1376 KB |
| `at-a-farbrengen.mp3` | 1. At a Farbrengan | 1st upload set (Oct 7, tracks 1-21) | lively | 2661 KB |
| `atoh-hokail.mp3` | 14. Atoh Hokail | 2nd upload set (Oct 7, tracks 1-30) | calm | 909 KB |
| `avinu-malkeinu.mp3` | 3. Avinu Malkeinu | 1st upload set (Oct 7, tracks 1-21) | calm | 3253 KB |
| `bar-yochai.mp3` | 15. Bar Yochai | 1st upload set (Oct 7, tracks 1-21) | lively | 2968 KB |
| `batei-chabad.mp3` | 11. Batei Chabad | 1st upload set (Oct 7, tracks 1-21) | calm | 4191 KB |
| `bcho-hashem.mp3` | 16. B'cho Hashem | 2nd upload set (Oct 7, tracks 1-30) | calm | 2287 KB |
| `der-rebbe-iz-gezunt.mp3` | 20. Der Rebbe Iz Gezunt | 1st upload set (Oct 7, tracks 1-21) | lively | 3498 KB |
| `didon-notzach.mp3` | 21. Didon Notzach | 2nd upload set (Oct 7, tracks 1-30) | calm | 881 KB |
| `echoes-in-the-forest.mp3` | 4. Echoes in the Forest | 1st upload set (Oct 7, tracks 1-21) | calm | 3807 KB |
| `eimosai.mp3` | 3. Eimosai | 2nd upload set (Oct 7, tracks 1-30) | lively | 1730 KB |
| `ein-od-milvado.mp3` | 14. Ein Od Milvado | 1st upload set (Oct 7, tracks 1-21) | calm | 3518 KB |
| `geulah.mp3` | 17. Geulah | 1st upload set (Oct 7, tracks 1-21) | calm | 4726 KB |
| `harninu.mp3` | 27. Harninu | 2nd upload set (Oct 7, tracks 1-30) | calm | 2088 KB |
| `hevel-havolim.mp3` | 20. Hevel Havolim | 2nd upload set (Oct 7, tracks 1-30) | lively | 1135 KB |
| `hey-tzoma.mp3` | 19. Hey Tzoma | 1st upload set (Oct 7, tracks 1-21) | lively | 3903 KB |
| `hey-tzomo.mp3` | 15. Hey Tzomo | 2nd upload set (Oct 7, tracks 1-30) | lively | 1112 KB |
| `keili-atah.mp3` | 7. Keili Atah | 1st upload set (Oct 7, tracks 1-21) | calm | 3008 KB |
| `ki-hinei-kachomer.mp3` | 2. Ki Hinei Kachomer | 1st upload set (Oct 7, tracks 1-21) | lively | 3079 KB |
| `klois-hanefesh.mp3` | 5. Klois Hanefesh | 1st upload set (Oct 7, tracks 1-21) | lively | 3197 KB |
| `ksivah-vachasimo.mp3` | 30. K'sivah Vachasimo | 2nd upload set (Oct 7, tracks 1-30) | lively | 1687 KB |
| `light-of-the-soul.mp3` | 13. Light of the Soul (Chanukah 5785) | 1st upload set (Oct 7, tracks 1-21) | lively | 5421 KB |
| `listen-every-jew.mp3` | 8. Listen Every Jew | 1st upload set (Oct 7, tracks 1-21) | calm | 2595 KB |
| `niggun-simcha.mp3` | 10. Niggun Simcha | 1st upload set (Oct 7, tracks 1-21) | calm | 3941 KB |
| `nigun-hakhel.mp3` | 18. Nigun Hakhel | 1st upload set (Oct 7, tracks 1-21) | calm | 4015 KB |
| `nigun-rosh-chodesh-kislev.mp3` | 21. Nigun Rosh Chodesh Kislev | 1st upload set (Oct 7, tracks 1-21) | lively | 3762 KB |
| `nigun-simcha-2.mp3` | 10. Nigun Simcha | 2nd upload set (Oct 7, tracks 1-30) | lively | 3197 KB |
| `nigun-simcha-3.mp3` | 11. Nigun Simcha II | 2nd upload set (Oct 7, tracks 1-30) | lively | 2050 KB |
| `nigun-simcha-4.mp3` | 13. Nigun Simcha III | 2nd upload set (Oct 7, tracks 1-30) | lively | 2812 KB |
| `nodah-byihuda.mp3` | 25. Nodah B'yihuda | 2nd upload set (Oct 7, tracks 1-30) | calm | 1252 KB |
| `odor-a-maaleh.mp3` | 7. Odor a Maaleh | 2nd upload set (Oct 7, tracks 1-30) | lively | 1846 KB |
| `ohaiv-hashem.mp3` | 19. Ohaiv Hashem | 2nd upload set (Oct 7, tracks 1-30) | calm | 1949 KB |
| `rachamana.mp3` | 16. Rachamana | 1st upload set (Oct 7, tracks 1-21) | lively | 3268 KB |
| `rotziso-hashem.mp3` | 6. Rotziso Hashem | 2nd upload set (Oct 7, tracks 1-30) | calm | 2546 KB |
| `shimu-rabbotai.mp3` | 29. Shimu Rabbotai | 2nd upload set (Oct 7, tracks 1-30) | calm | 1054 KB |
| `shuva-shuva.mp3` | 24. Shuva Shuva | 2nd upload set (Oct 7, tracks 1-30) | calm | 1592 KB |
| `tatte.mp3` | 9. Tatte | 1st upload set (Oct 7, tracks 1-21) | lively | 3607 KB |
| `tzatzkes.mp3` | 26. Tzatzkes | 2nd upload set (Oct 7, tracks 1-30) | calm | 1101 KB |
| `uforatzto.mp3` | 5. Uforatzto | 2nd upload set (Oct 7, tracks 1-30) | lively | 1829 KB |
| `utzu-eitza.mp3` | 28. Utzu Eitza | 2nd upload set (Oct 7, tracks 1-30) | calm | 2106 KB |
| `vchol-karnei.mp3` | 9. V'chol Karnei | 2nd upload set (Oct 7, tracks 1-30) | calm | 1221 KB |
| `vsomachta-2.mp3` | 2. V'somachta II | 2nd upload set (Oct 7, tracks 1-30) | calm | 1092 KB |
| `vsomachta.mp3` | 1. V'somachta | 2nd upload set (Oct 7, tracks 1-30) | lively | 1377 KB |
| `wake-up-yidden.mp3` | 18. Wake Up Yidden | 2nd upload set (Oct 7, tracks 1-30) | lively | 1595 KB |
| `yifrach-byomov.mp3` | 17. Yifrach B'yomov | 2nd upload set (Oct 7, tracks 1-30) | calm | 1357 KB |

Not used: `kain-bakodesh.mp3` (set 2, track 8, 14 s) and `taamu-ureu.mp3` (set 2, track 23, 27 s), in `handoff-files/uploads/`.

---

## 8. Files in `handoff-files/`

Everything here came from the chat and wasn't already in the repo. Nothing is over 100 MB; the folder is about 49 MB. **The repo is public, so all of this is public.** Left out on purpose:
- Wordwall's own JavaScript, saved Wordwall pages, and screenshots of Wordwall's games (third-party content)
- the sandbox's proxy certificates (`ca*.pem`, `spki.txt`)
- `node_modules` and copies of the Firebase SDK
- the 47 MP3s already in `music/`

| Path | What it is |
|---|---|
| `uploads/hebrew_school.pdf` | The owner's original brief (belts, stripes, all/by-type view) |
| `uploads/Wordwall-game-links.zip` | The owner's Word docs listing the Wordwall game links for the White, Red and Orange levels (the source of the 115 games) |
| `uploads/kain-bakodesh.mp3`, `uploads/taamu-ureu.mp3` | Two recordings the owner sent that are too short for game music |
| `user-images/1.png` … `8.png` | Screenshots the owner sent: (1) the black bar under the header, (2) home page cut off, (3) Claude Code mode menu, (4) "boring" game cards, (5) GoDaddy CNAME conflict, (6) GoDaddy `www` record, (7) old wide logo still showing, (8) duplicate "Back to my homework" |
| `user-images/9.jpg` | The new Ganeinu Academy logo (Oct 9) |
| `school-logos/ganeinu-new-logo.jpg` | Same new logo (the source of `img/ganeinu-academy-logo.png`) |
| `school-logos/ganeinu-square-old.png`, `ganeinu-wide-old.png`, `ganeinu-wide-white-old.png`, `ganeinu-icon-old.png` | The old logos, from ganeinuacademy.org |
| `deliverables/Aleph-Review-Admin-Guide.pdf` | Admin guide PDF given to the owner (all admin features, with screenshots) |
| `deliverables/admin-guide-source/` | Its HTML source (`guide.html`) and screenshots; `check.html` is for Games-To-Check |
| `deliverables/Games-To-Check.pdf`, `games-to-check.md` | List of recreated games that may need a human check |
| `wordwall-conversion/` | How the 115 Wordwall games were recreated (see below) |
| `test-scripts/` | Playwright scripts and logs used to test everything (see section 4) |
| `screenshots/` | About 250 test screenshots of the site taken during development (game types, admin, homework, phone, music button, free play, etc.) |
| `screenshots/compare-spin-cards/` | Our Spin it / Pick a card before (`our-*`) and after (`new-*`) matching Wordwall |

`wordwall-conversion/` contents:
- `wwfetch.js`: read each Wordwall embed page's game data
- `wwcontent/*.json`: the 115 games' content
- `ww_convert.py`: converts the content to our game shapes
- `ww_converted.json`: the converted games
- `ww_apply.py`: inserts them into `data/site.json`
- `wwsummary.*`: a per-game summary
- `games.json`, `embed.tsv`, `embeds.txt`, `ids.txt`, `tmpl*`: game lists, ids and templates
- `ready_games.py`, `gen.py`, `parse.py`, `tip*.py/json`: the ready-made games and instruction tips
- `site.before.json`: `data/site.json` before the conversion
- `wwmedia.js`, `wwnet.js`, `wwone.js`: probes. The media download was blocked.

---

## 9. Full conversation summary

**Sep 23: the site is born.**
- The owner uploaded the brief (`hebrew_school.pdf`) and a zip of Word docs with their Wordwall game links (White, Red and Orange levels). Claude built "Aleph Review Dojo": belts, stripes, all/by-type views, and Wordwall game pictures.
- The owner asked how to let Claude look at websites (environment network settings), then said "let's launch it now". GitHub Pages went live.
- Then, in order:
  - Games play inside the site (embeds), not on Wordwall.
  - Aleph logo in the browser tab.
  - Removed a black "belt" drawing.
  - "Make the whole site look nicer and pro" → redesign.
  - The "All belts" button was useless on home → hidden there.
  - Aleph-bet tiles run right to left.
  - Coming-soon items not clickable.
  - "More fun for kids… engaging but not distracting" → more fun, then "better but too childish" → toned down, then "keep some of the fun stuff". The owner asked to be asked about what comes back.
  - Letter tiles open their level.
  - "It does not have how to use the games" → How to play boxes.
  - "Remember it's for kids and has to be simple" → simpler words.
  - "How will it look if the background is darker (grey scale)" → Claude showed grey options; the light background was kept.

**Sep 24: admin, homework, own games, recreation.**
- **Admin.** "System for admin to edit parts of the website not going through AI: text, move around stuff…" → admin page with Google sign-in on Firebase.
  - The owner set up Firebase project `aleph-review` and pasted the config.
  - "Make yehudakogan770@gmail.com an admin and let me make sub-admins that can do everything besides add more admins" → full admins in the rules, plus sub-admins.
- **Homework and games built here.** Homework came next. "It should not be considered done unless they played and passed the game" → Wordwall can't report scores, so Claude built games on the site.
  - "The games should keep their fun look and format" → Wordwall-like themes.
  - "Finish all the games" → 25 types plus 74 ready-made games.
- **Recreating the Wordwall games.**
  - The owner asked whether the app's games were "already redone", said "I have permission to recreate all these games for my school", asked how to tell which games were Claude's vs Wordwall's, and chose "whatever is less work for me".
  - "I need them to be the same as they were before" → option 1, recreate all 115. The owner had to allow `node`, `python3` and `curl` in `.claude/settings.json` so the scripts could run.
  - "You can recreate the images you are missing" → done: 115 games, ids `-ww<id>`, originals hidden.
- **Admin fixes and the guide.**
  - "When I press make a game nothing happens" → fixed (old draft).
  - "What is the how many games played based off of" → a per-browser count, now only visible games.
  - Admin guide PDF: given to the owner only, not put on the site.
  - "Finish everything."
  - The admin logo opened a new tab → fixed.
- **Look and phones.** Then, in order:
  - "The games look very boring" → fun game card pictures.
  - "Remember it's for kids."
  - "Fix glitch" (overflowing names).
  - "A lot of the letters are in the wrong order" → right-to-left fix.
  - "Why is it blank" → anagram card fixed.
  - "What are stars" → one per stripe when every game in it is played in that browser.
  - "Make it work for phones also" → phone layout.
- **GoDaddy.** "I need the codes to give to GoDaddy" → Claude gave GitHub Pages A/CNAME records.
  - The `www` CNAME conflicted and pointed to `ganeinuacademy.org`, the school's own site. Claude said to stop and use the subdomain `alephreview` instead. **Never confirmed done.**
- **Music, round 1.** In order:
  - "The games should have background music" → Web Audio tunes.
  - "Take the tunes from Wordwall" → declined.
  - The owner chose "send files", then said "I don't have the files, I got permission to take it from the website" → still declined; Claude offered Wordwall-style tunes instead.
  - "I don't hear any music" → made louder, and played on iOS with the silent switch on.
  - "Bouncier" → 10 tunes, a different tune per game ("it should not be the same music for everything").
  - "I don't like the music… too fake and empty." Claude tried to download Kevin MacLeod music; it was blocked.
- **Footer and logo.** In order:
  - "Write on the bottom that the games were created by Ganeinu Academy."
  - "And it should have the Ganeinu logo" → the wide logo from the school site.
  - "Use the logo I gave" → the square logo.
  - "Only have what I told you" → just the credit line.
  - "Have the copyright symbol" → ©.
  - "FIX THE LOGO" → it was browser cache, so the file was renamed.
  - "Logo is too big" → made smaller.
- **Homework fixes.**
  - "Why is it double" → duplicate Back to my homework button fixed, and the How to play step fixed.
  - "I thought we built the games ourselves for this reason" → old homework with Wordwall games now plays the copies made here.
  - "Recreate those also" → card games can be homework.
  - "Recreate ALL the games" → confirmed all 115 were done.

**Sep 28.** "The spin the wheel and saying ones… should be exactly the way it is in Wordwall" → Claude compared screenshots and rebuilt Spin it (arrow on the left, zoom, Keep it / Take it out, A/B answers) and Pick a card (deck and pile, Shuffle / Undo / Deal) to match.

**Oct 6–7.**
- The owner pasted the whole request list and asked "are all these in yet?" Claude listed what was done and missing, and the owner said "yes" to building the missing pieces: Free play mode, the read-aloud switch, and Hebrew in bold Times New Roman.
- **Music, round 2.** The owner said they have permission for the recordings and named "Zalmy Chanowitz has good recordings". Claude explained it can't download them, so the owner uploaded 21 tracks, then 30 more.
  - "They should match the game that it's playing by" → lively/calm by game type.
  - 49 used; 2 too short.

**Oct 9.** "This is the new logo. And everywhere else the logo is." → the footer logo was replaced. The footer is the only place the school logo appears; Claude offered to add it to the admin page or use it as the site mark (no answer).

**Oct 19.** The owner is moving to a new Claude account and asked for this handoff.
- Work saved: nothing was unsaved.
- README and CLAUDE.md updated.
- `handoff-files/` collected and this file written.
- All of it is left on branch `claude/new-session-s1ja1d` without merging.

### How Claude worked in this project (keep doing this)
- Every change: edit → raise `?v=` → test with Playwright (screenshots and the bot) → commit → push `claude/new-session-s1ja1d` → PR → merge → watch the live site until the new version shows → tell the owner in simple words.
- The owner reads replies on a phone or in the app. Keep them short, explain what changed and what to do (usually "refresh with Ctrl+Shift+R"), and don't make them do technical steps.
