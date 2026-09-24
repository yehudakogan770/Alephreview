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
};

function withDefaults(data) {
  data.text = { ...TEXT_DEFAULTS, ...(data.text || {}) };
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
