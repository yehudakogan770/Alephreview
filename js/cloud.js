// Firebase: Google sign-in and the database, loaded only when a page needs it
// (the admin page, and homework on the student site).
const FIREBASE_VERSION = "12.3.0";
let cloudPromise = null;

function cloudReady() {
  return typeof FIREBASE_CONFIG !== "undefined" && !!FIREBASE_CONFIG;
}

function cloud() {
  if (!cloudPromise) {
    cloudPromise = (async () => {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
      const [appMod, authMod, fsMod] = await Promise.all([
        import(`${base}/firebase-app.js`),
        import(`${base}/firebase-auth.js`),
        import(`${base}/firebase-firestore.js`),
      ]);
      const app = appMod.initializeApp(FIREBASE_CONFIG);
      return { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
    })();
    cloudPromise.catch(() => { cloudPromise = null; });
  }
  return cloudPromise;
}

async function googleSignIn() {
  const { auth, authMod } = await cloud();
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return authMod.signInWithPopup(auth, provider);
}

// Resolves with the signed-in user (or null) once Firebase knows who it is.
async function currentUser() {
  const { auth, authMod } = await cloud();
  if (auth.currentUser) return auth.currentUser;
  return new Promise(resolve => {
    const stop = authMod.onAuthStateChanged(auth, u => { stop(); resolve(u); });
  });
}
