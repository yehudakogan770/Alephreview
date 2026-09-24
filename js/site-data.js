// Loads the site's words, settings and games.
// Published changes live in Firebase (see js/firebase-config.js). If Firebase
// isn't set up or can't be reached, data/site.json is used instead.
async function fetchSiteData() {
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
