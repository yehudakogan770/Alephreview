# Aleph Review

A website of Hebrew reading review games for kids, set up like karate belts.

- **10 belts, in order:** White, Red, Orange, Yellow, Green, Blue, Purple, Brown, Gray, Black
- **3 stripes on each belt.** Each stripe has its own games.
- Games play inside the site. Each game page has a short **How to play** box.
- Students earn a star for each finished stripe. Progress is saved in each computer's browser.

The site is plain HTML, CSS and JavaScript with no build step. It's hosted on GitHub Pages from `main`.

## Editing the site: the admin page

Click the small **Admin** button at the top right of the site (or go to `admin.html`) and sign in with Google. Only admin accounts can see and use the admin tools.

| Tab | What you can do |
|---|---|
| **Games** | Drag games to reorder them or move them between stripes. Drop a game on a belt to move it there. Click ✎ to rename, change the game type, add an instruction line, hide or delete a game. **+ Add game** adds a game from Wordwall's share code. |
| **Words on the site** | Change any words students see. Put `**` around a word to make it bold. |
| **How to play** | The step 2 text for each kind of Wordwall game. |
| **Home page** | Show or hide the letter tiles and the numbers row. |

Use **Preview** to see your changes before students do, then **Save & publish**. Changes go live right away; students see them the next time they load a page.

### Adding a game

1. On Wordwall, open the game and click **Share**, then **Embed**.
2. Copy the code and paste it into **+ Add game**. The game type is filled in for you.
3. For the name and picture too, also paste the **Image & link** code from the same Share box.

## One-time setup: Google sign-in (Firebase)

The admin page uses Google's Firebase for sign-in and to store published changes. It's free for a site this size.

1. Go to <https://console.firebase.google.com>, click **Create a project**, name it (like `aleph-review`), and finish. Google Analytics isn't needed.
2. **Sign-in:** Build → **Authentication** → **Get started** → **Google** → turn on **Enable**, pick a support email, **Save**. Then open **Settings** → **Authorized domains** → **Add domain** → `yehudakogan770.github.io`.
3. **Storage:** Build → **Firestore Database** → **Create database** → choose a location → **Start in production mode**.
4. **Who can edit:** in Firestore, open **Rules**, replace everything with the rules below, put in the Google accounts that should be admins, and click **Publish**.

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       function isAdmin() {
         return request.auth != null
           && request.auth.token.email_verified == true
           && request.auth.token.email in [
             'admin-one@gmail.com',
             'admin-two@gmail.com'
           ];
       }
       match /site/content {
         allow read: if true;
         allow write: if isAdmin();
       }
       match /admin/check {
         allow read: if isAdmin();
       }
     }
   }
   ```

   To add or remove an admin later, edit this list and click **Publish** again.
5. **Connect the site:** click the gear → **Project settings** → **Your apps** → the web icon **`</>`** → name it `Aleph Review` → **Register app**. Copy the `firebaseConfig` values into `js/firebase-config.js`, replacing `null`:

   ```js
   const FIREBASE_CONFIG = {
     apiKey: "…",
     authDomain: "….firebaseapp.com",
     projectId: "…",
     storageBucket: "…",
     messagingSenderId: "…",
     appId: "…",
   };
   ```

   These values are meant to be public. The rules in step 4 are what keep editing safe.

The first **Save & publish** copies everything into Firebase. After that, the site reads from Firebase.

## Where things live

| File | What it is |
|---|---|
| `index.html`, `js/app.js`, `css/style.css` | The student site |
| `admin.html`, `js/admin.js`, `css/admin.css` | The admin page |
| `js/site-data.js` | Loads the site's words and games (from Firebase, or `data/site.json` if Firebase isn't set up) |
| `js/firebase-config.js` | Firebase settings |
| `data/site.json` | The starting copy of all words, settings and games, and the backup if Firebase can't be reached |

After changing a `.js` or `.css` file by hand, raise the `?v=` number for it in `index.html` and `admin.html` so browsers load the new version. Changes made on the admin page don't need this.
