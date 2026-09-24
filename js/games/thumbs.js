// Card pictures for games made on this site: the game's scene with a small
// drawing of that kind of game on top, using the game's own letters.
// gameThumb(g) returns HTML for the picture box on a game card.

function thumbSamples(o) {
  const all = [
    ...(o.pairs || []).map(p => p.a),
    ...(o.questions || []).flatMap(q => q.answers.slice(0, 3)),
    ...(o.groups || []).flatMap(g => g.items),
    ...(o.items || []),
    ...(o.statements || []).map(x => x.a),
    ...(o.sentences || []).flatMap(x => (x.match(/\[([^\]]+)\]/g) || []).map(m => m.slice(1, -1))),
  ].filter(x => x && [...x].length <= 5);
  const heb = [...new Set(all.filter(x => /[֐-׿]/.test(x)))];
  const out = heb.length ? heb : [...new Set(all)];
  while (out.length && out.length < 6) out.push(...out.slice(0, 6 - out.length));
  return out.length ? out : ["א", "ב", "ג", "ד", "ה", "ו"];
}

const THUMB_INK = "#1b2437";
const tEsc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// A colorful framed tile with a letter, like the tiles in the games.
function tTile(x, y, w, h, color, text, size) {
  // Longer text gets smaller so it fits (vowel marks don't take room).
  const len = String(text || "").replace(/[\u0591-\u05C7]/g, "").length || 1;
  const s = Math.min(size || Math.min(w, h) * 0.58, (w * 0.78) / (len * 0.62));
  return `<g>
    <rect x="${x}" y="${y + 5}" width="${w}" height="${h}" rx="${w * 0.16}" fill="${color}" opacity=".45"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.16}" fill="${color}"/>
    <rect x="${x + w * 0.09}" y="${y + h * 0.09}" width="${w * 0.82}" height="${h * 0.82}" rx="${w * 0.1}" fill="#fff"/>
    ${text ? `<text x="${x + w / 2}" y="${y + h / 2}" font-size="${s}" class="tt">${tEsc(text)}</text>` : ""}
  </g>`;
}

function tPill(x, y, w, h, fill, text, color, size) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>
    ${text ? `<text x="${x + w / 2}" y="${y + h / 2}" font-size="${size || h * 0.55}" class="tt" fill="${color || THUMB_INK}">${tEsc(text)}</text>` : ""}`;
}

const C = () => TILE_COLORS;

// One small drawing per kind of game (400 x 300). Rows of letters start on the
// right, like Hebrew.
const THUMB_ART = {
  match(s) {
    const c = C();
    return [0, 1, 2].map(i => `
      <rect x="150" y="${58 + i * 72}" width="200" height="58" rx="14" fill="#fff" opacity=".92"/>
      <rect x="160" y="${66 + i * 72}" width="44" height="42" rx="9" fill="none" stroke="#9aa6bb" stroke-width="3" stroke-dasharray="7 5"/>
      <rect x="216" y="${80 + i * 72}" width="${110 - i * 18}" height="14" rx="7" fill="#c9d1de"/>`).join("") +
      tTile(52, 70, 70, 70, c[1], s[0]) + tTile(64, 160, 70, 70, c[3], s[1]);
  },
  pairs(s) {
    const c = C();
    let out = "";
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
      const x = 58 + k * 74, y = 62 + r * 96, i = r * 4 + k;
      if (i === 1 || i === 6) out += tTile(x, y, 62, 84, c[5], s[0]);
      else out += `<rect x="${x}" y="${y + 5}" width="62" height="84" rx="10" fill="${c[i % 8]}" opacity=".4"/><rect x="${x}" y="${y}" width="62" height="84" rx="10" fill="${c[i % 8]}" stroke="#fff" stroke-width="4"/><circle cx="${x + 31}" cy="${y + 42}" r="13" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="4"/>`;
    }
    return out;
  },
  find(s) {
    const c = C();
    return tPill(120, 36, 160, 42, "#fff", "?", THUMB_INK, 26) +
      [0, 1, 2, 3, 4, 5].map(i => tTile(70 + (2 - i % 3) * 92, 104 + Math.floor(i / 3) * 86, 72, 72, c[i], s[i])).join("");
  },
  truefalse(s) {
    const c = C();
    return `<rect x="80" y="54" width="240" height="110" rx="22" fill="#fff"/>` + tTile(100, 72, 72, 72, c[0], s[0]) +
      `<text x="200" y="110" font-size="40" class="tt" fill="#8a93a3">=</text><rect x="228" y="100" width="72" height="16" rx="8" fill="#c9d1de"/>` +
      tPill(78, 190, 110, 50, "#1f9d55", "✓", "#fff", 30) + tPill(212, 190, 110, 50, "#e5383b", "✗", "#fff", 30);
  },
  quiz(s, dark) {
    const col = ["#e5383b", "#1e9be9", "#f2b705", "#1fa45c"];
    return `<rect x="50" y="36" width="300" height="60" rx="16" fill="${dark ? "#1d2766" : "#fff"}" ${dark ? 'stroke="#ffd23f" stroke-width="5"' : ""}/>
      <rect x="120" y="58" width="160" height="16" rx="8" fill="${dark ? "#fff" : "#c9d1de"}" opacity="${dark ? ".8" : "1"}"/>` +
      col.map((k, i) => `<rect x="${50 + (1 - i % 2) * 156}" y="${116 + Math.floor(i / 2) * 76}" width="144" height="62" rx="14" fill="${k}"/>
        <rect x="${50 + (1 - i % 2) * 156}" y="${172 + Math.floor(i / 2) * 76}" width="144" height="6" rx="3" fill="#000" opacity=".15"/>
        <text x="${122 + (1 - i % 2) * 156}" y="${147 + Math.floor(i / 2) * 76}" font-size="34" class="tt" fill="#fff">${tEsc(s[i])}</text>`).join("");
  },
  gameshow(s) {
    return `<rect x="30" y="20" width="340" height="266" rx="20" fill="#151c4f" opacity=".85"/>` + THUMB_ART.quiz(s, true) +
      `<circle cx="336" cy="40" r="22" fill="#151c4f" stroke="#ffd23f" stroke-width="5"/><text x="336" y="41" font-size="18" class="tt" fill="#fff">20</text>`;
  },
  winlose(s) {
    const col = ["#e5383b", "#1e9be9", "#f2b705", "#1fa45c"];
    return `<rect x="60" y="40" width="280" height="70" rx="18" fill="#fff"/><text x="200" y="76" font-size="40" class="tt">${tEsc(s[0])}</text>` +
      [100, 200, 300, 500].map((p, i) => `<circle cx="${80 + i * 80}" cy="195" r="36" fill="${col[i]}" stroke="#fff" stroke-width="6"/><text x="${80 + i * 80}" y="196" font-size="22" class="tt" fill="#fff">${p}</text>`).join("");
  },
  sort(s) {
    const c = C();
    return [0, 1, 2].map(i => tTile(96 + (2 - i) * 76, 34, 62, 62, c[i + 3], s[i])).join("") +
      [0, 1].map(k => `<rect x="${52 + k * 156}" y="124" width="140" height="150" rx="18" fill="#fff" opacity=".92" stroke="${c[k]}" stroke-width="6"/>
        <rect x="${52 + k * 156}" y="124" width="140" height="36" rx="16" fill="${c[k]}"/>
        <rect x="${92 + k * 156}" y="137" width="60" height="10" rx="5" fill="#fff" opacity=".8"/>`).join("") +
      tTile(70, 178, 50, 50, c[5], s[3], 28) + tTile(226, 178, 50, 50, c[6], s[4], 28);
  },
  speedsort(s) {
    const c = C();
    return `<rect x="30" y="40" width="92" height="230" rx="18" fill="${c[0]}" stroke="#fff" stroke-width="6"/><text x="76" y="155" font-size="40" class="tt" fill="#fff">←</text>
      <rect x="278" y="40" width="92" height="230" rx="18" fill="${c[1]}" stroke="#fff" stroke-width="6"/><text x="324" y="155" font-size="40" class="tt" fill="#fff">→</text>` +
      tTile(144, 92, 112, 120, c[2], s[0], 70);
  },
  categorize(s) { return THUMB_ART.sort(s); },
  order(s) {
    const c = C();
    return [0, 1, 2, 3].map(i => `<circle cx="96" cy="${62 + i * 58}" r="18" fill="#25307a"/><text x="96" y="${63 + i * 58}" font-size="18" class="tt" fill="#fff">${i + 1}</text>
      <rect x="128" y="${40 + i * 58}" width="190" height="46" rx="12" fill="#fff"/><rect x="128" y="${40 + i * 58}" width="12" height="46" rx="6" fill="${c[i]}"/>
      <text x="228" y="${64 + i * 58}" font-size="28" class="tt">${tEsc(s[[2, 0, 3, 1][i]])}</text>`).join("");
  },
  anagram(s) {
    const c = C();
    return `<rect x="56" y="48" width="288" height="96" rx="18" fill="#fff" opacity=".9"/>` +
      [0, 1, 2, 3].map(i => `<rect x="${72 + i * 66}" y="62" width="56" height="68" rx="10" fill="#eef3fc" stroke="#9aa6bb" stroke-width="3" stroke-dasharray="7 5"/>`).join("") +
      [0, 1, 2, 3].map(i => tTile(72 + (3 - i) * 66, 176, 56, 68, c[i], s.word[i], 34)).join("");
  },
  gaps(s) {
    const c = C();
    return [0, 1, 2].map(i => `<rect x="40" y="${50 + i * 74}" width="320" height="58" rx="14" fill="#fff" opacity=".94"/>
      <rect x="${240 - i * 40}" y="${60 + i * 74}" width="70" height="38" rx="9" fill="#eef3fc" stroke="#9aa6bb" stroke-width="3" stroke-dasharray="7 5"/>
      <rect x="60" y="${72 + i * 74}" width="${150 - i * 30}" height="14" rx="7" fill="#c9d1de"/>`).join("") +
      tTile(290, 208, 58, 58, c[1], s[0], 32);
  },
  label(s) {
    return `<rect x="26" y="30" width="348" height="240" rx="16" fill="#b07a45"/><rect x="40" y="44" width="320" height="212" rx="10" fill="#2f6a58"/>` +
      [0, 1, 2].map(i => `<text x="${290 - i * 90}" y="115" font-size="54" class="tt" fill="#f7f3e8">${tEsc(s[i])}</text>
        <rect x="${288 - i * 90}" y="148" width="4" height="22" rx="2" fill="#f7f3e8" opacity=".7"/>
        <rect x="${254 - i * 90}" y="176" width="72" height="42" rx="9" fill="none" stroke="#f7f3e8" stroke-opacity=".75" stroke-width="3" stroke-dasharray="7 5"/>`).join("");
  },
  balloon(s) {
    const c = C();
    return `<path d="M200 36c-26 0-42 20-42 44 0 28 24 50 42 56 18-6 42-28 42-56 0-24-16-44-42-44z" fill="${c[1]}"/>
      <path d="M184 52c-6 6-9 14-9 22" stroke="#fff" stroke-opacity=".6" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M200 136c-4 8 4 14 0 22" stroke="#6b7280" stroke-width="2.5" fill="none"/>` + tTile(172, 156, 56, 56, c[1], s[0], 32) +
      [0, 1, 2].map(i => `<rect x="${40 + i * 112}" y="222" width="96" height="54" rx="10" fill="#d9a066" stroke="#9a6431" stroke-width="4"/>
        <circle cx="${62 + i * 112}" cy="280" r="10" fill="#3b3b46" stroke="#9aa0ad" stroke-width="4"/><circle cx="${114 + i * 112}" cy="280" r="10" fill="#3b3b46" stroke="#9aa0ad" stroke-width="4"/>
        <rect x="${56 + i * 112}" y="238" width="64" height="18" rx="9" fill="#fff"/>`).join("");
  },
  fruit(s) {
    const f = [["#e5383b", 100, 150], ["#ff8c1a", 210, 90], ["#8e44ad", 300, 190], ["#7cc43a", 250, 250]];
    return tPill(130, 22, 140, 38, "#fff", "?", THUMB_INK, 24) + f.map(([col, x, y], i) => `
      <path d="M${x} ${y - 40}c-3-7-8-10-15-10 2 7 8 10 15 10z" fill="#2f9e44"/>
      <circle cx="${x}" cy="${y}" r="38" fill="${col}"/><ellipse cx="${x - 13}" cy="${y - 14}" rx="9" ry="6" fill="#fff" opacity=".35" transform="rotate(-30 ${x - 13} ${y - 14})"/>
      <rect x="${x - 20}" y="${y - 16}" width="40" height="36" rx="8" fill="#fff"/><text x="${x}" y="${y + 2}" font-size="26" class="tt">${tEsc(s[i])}</text>`).join("");
  },
  whack(s) {
    const c = C();
    let out = tPill(130, 18, 140, 38, "#fff", "?", THUMB_INK, 24);
    [[90, 160], [200, 160], [310, 160], [145, 250], [255, 250]].forEach(([x, y], i) => {
      if (i === 1 || i === 3) out += tTile(x - 36, y - 78, 72, 72, c[i], s[i], 40);
      out += `<ellipse cx="${x}" cy="${y}" rx="52" ry="17" fill="#2b1d12"/><path d="M${x - 52} ${y}a52 17 0 0 0 104 0z" fill="#8a6a45"/>`;
    });
    return out;
  },
  plane(s) {
    return `<g transform="translate(40 130)"><path d="M8 36c0-6 6-10 14-10h62c12 0 26 6 30 10-4 4-18 10-30 10H22c-8 0-14-4-14-10z" fill="#fff" stroke="#25307a" stroke-width="3"/>
      <path d="M50 30 36 6h12l26 24z" fill="#e5383b" stroke="#25307a" stroke-width="3"/><path d="M50 42 38 64h12l24-22z" fill="#e5383b" stroke="#25307a" stroke-width="3"/>
      <path d="M10 30 4 14h10l12 14z" fill="#1e9be9" stroke="#25307a" stroke-width="3"/></g>` +
      [[270, 80], [300, 160], [260, 240]].map(([x, y], i) => `<g><ellipse cx="${x}" cy="${y}" rx="62" ry="32" fill="#fff"/><circle cx="${x - 18}" cy="${y - 24}" r="24" fill="#fff"/><circle cx="${x + 20}" cy="${y - 18}" r="18" fill="#fff"/>
        <text x="${x}" y="${y + 2}" font-size="34" class="tt">${tEsc(s[i])}</text></g>`).join("");
  },
  watch(s) {
    const c = C();
    return tTile(130, 44, 140, 170, c[4], s[0], 96) + [0, 1, 2, 3].map(i => `<circle cx="${164 + i * 24}" cy="250" r="8" fill="${i === 0 ? "#ffd23f" : "#fff"}" opacity="${i === 0 ? 1 : 0.7}"/>`).join("");
  },
  spin(s) {
    const n = 8, c = C();
    let out = "";
    for (let i = 0; i < n; i++) {
      const a1 = (i / n) * Math.PI * 2 - Math.PI / 2, a2 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2, am = (a1 + a2) / 2;
      out += `<path d="M200 160 L${200 + 118 * Math.cos(a1)} ${160 + 118 * Math.sin(a1)} A118 118 0 0 1 ${200 + 118 * Math.cos(a2)} ${160 + 118 * Math.sin(a2)}Z" fill="${c[i]}" stroke="#fff" stroke-width="3"/>
        <text x="${200 + 80 * Math.cos(am)}" y="${160 + 80 * Math.sin(am)}" font-size="26" class="tt" fill="#fff">${tEsc(s[i % s.length])}</text>`;
    }
    return `<circle cx="200" cy="160" r="124" fill="#fff"/>${out}<circle cx="200" cy="160" r="16" fill="#fff" stroke="#25307a" stroke-width="5"/>
      <path d="M200 58 186 26a14 14 0 0 1 28 0z" fill="#25307a"/>`;
  },
  openbox(s) {
    const c = C();
    let out = "";
    for (let i = 0; i < 8; i++) {
      const x = 44 + (i % 4) * 82, y = 60 + Math.floor(i / 4) * 104;
      out += i === 5 ? tTile(x, y, 68, 84, c[i], s[0], 40)
        : `<rect x="${x}" y="${y + 5}" width="68" height="84" rx="10" fill="${c[i]}" opacity=".45"/><rect x="${x}" y="${y}" width="68" height="84" rx="10" fill="${c[i]}"/>
          <rect x="${x}" y="${y}" width="68" height="20" rx="10" fill="#fff" opacity=".3"/><rect x="${x + 30}" y="${y + 18}" width="8" height="66" fill="#fff" opacity=".35"/>
          <text x="${x + 34}" y="${y + 50}" font-size="26" class="tt" fill="#fff">${i + 1}</text>`;
    }
    return out;
  },
  flip(s) {
    const c = C();
    return `<rect x="160" y="52" width="150" height="200" rx="18" fill="${c[5]}" transform="rotate(8 235 152)"/>` + tTile(110, 50, 150, 200, c[0], s[0], 96);
  },
  deal(s) {
    const c = C();
    return [2, 1, 0].map(k => `<rect x="${50 - k * 6}" y="${70 - k * 7}" width="110" height="160" rx="14" fill="#25307a" stroke="#fff" stroke-width="5"/>`).join("") + tTile(200, 60, 150, 190, c[1], s[0], 90);
  },
};
THUMB_ART.spinquiz = THUMB_ART.spin;
THUMB_ART.boxquiz = THUMB_ART.openbox;

function gameThumb(g) {
  const o = g.own || {};
  const art = THUMB_ART[o.kind] || THUMB_ART.match;
  const theme = themeOf(o);
  const s = thumbSamples(o);
  // Build the word: the first word's letters, mixed up (vowels stay with their letter).
  const word = typeof letterTiles === "function" && o.items && o.items[0] ? letterTiles(o.items[0]) : [];
  s.word = [...word.slice(1), word[0], "א", "ב", "ג", "ד"].filter(Boolean);
  return `<span class="game-art">${theme.scene()}<svg class="game-art-top" viewBox="0 0 400 300" aria-hidden="true">${art(s)}</svg></span>`;
}
