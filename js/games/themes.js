// Themes for games made on this site: an illustrated scene behind the game
// and a set of tile colors. All art is drawn here as SVG (no image files).

const TILE_COLORS = ["#1e9be9", "#e5383b", "#ff8c1a", "#1fa45c", "#c250d8", "#2f47d6", "#f2b705", "#0fa3a3"];

function svgScene(inner, bg) {
  return `<svg class="og-scene" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${bg || ""}${inner}</svg>`;
}

// Soft puffy cloud made of circles.
function sceneCloud(x, y, s, o = 0.95) {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity="${o}">
    <ellipse cx="0" cy="10" rx="60" ry="22"/><circle cx="-25" cy="0" r="24"/><circle cx="8" cy="-10" r="32"/><circle cx="38" cy="4" r="22"/></g>`;
}

const THEMES = {
  classic: {
    name: "Classic",
    scene: () => svgScene(`
      <defs><linearGradient id="cl-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef2fb"/></linearGradient></defs>
      <rect width="800" height="600" fill="url(#cl-bg)"/>
      <g opacity=".5">${[...Array(14)].map((_, i) => `<circle cx="${(i * 131) % 800}" cy="${(i * 97) % 600}" r="${6 + (i % 4) * 3}" fill="${TILE_COLORS[i % TILE_COLORS.length]}" opacity=".12"/>`).join("")}</g>`),
  },

  meadow: {
    name: "Meadow",
    scene: () => svgScene(`
      <defs>
        <linearGradient id="md-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5bb8f5"/><stop offset=".7" stop-color="#bfe6ff"/><stop offset="1" stop-color="#e9f8ff"/></linearGradient>
        <radialGradient id="md-sun"><stop offset="0" stop-color="#fff7c2"/><stop offset=".5" stop-color="#ffe066" stop-opacity=".9"/><stop offset="1" stop-color="#ffe066" stop-opacity="0"/></radialGradient>
        <linearGradient id="md-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ed98a"/><stop offset="1" stop-color="#7cc46a"/></linearGradient>
        <linearGradient id="md-near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6cc24a"/><stop offset="1" stop-color="#3f9a36"/></linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#md-sky)"/>
      <circle cx="660" cy="95" r="120" fill="url(#md-sun)"/>
      <circle cx="660" cy="95" r="42" fill="#fff3a0"/>
      ${sceneCloud(150, 90, 1)}${sceneCloud(420, 60, .7, .85)}${sceneCloud(740, 190, .6, .8)}
      <path d="M0 380 C120 320 220 330 330 365 C450 400 560 330 680 340 C740 345 780 360 800 370 V600 H0Z" fill="url(#md-far)"/>
      <path d="M0 450 C140 400 260 430 380 455 C520 485 640 420 800 440 V600 H0Z" fill="url(#md-near)"/>
      <g transform="translate(95 330)">
        <rect x="-9" y="40" width="18" height="90" rx="6" fill="#8a5a33"/>
        <circle cx="0" cy="20" r="52" fill="#3f9a36"/><circle cx="-38" cy="45" r="36" fill="#4aa83f"/><circle cx="36" cy="46" r="38" fill="#4aa83f"/>
      </g>
      ${[[180, 540, "#ff6b8a"], [260, 560, "#ffd23f"], [520, 545, "#fff"], [610, 570, "#ff6b8a"], [700, 535, "#ffd23f"], [380, 575, "#c77dff"]]
        .map(([x, y, c]) => `<g transform="translate(${x} ${y})"><rect x="-1.5" y="0" width="3" height="18" fill="#2f7d2a"/>${[0, 72, 144, 216, 288].map(a => `<circle cx="${Math.cos(a * Math.PI / 180) * 7}" cy="${Math.sin(a * Math.PI / 180) * 7}" r="6" fill="${c}"/>`).join("")}<circle r="4.5" fill="#ffb703"/></g>`).join("")}`),
  },

  desert: {
    name: "Desert",
    scene: () => svgScene(`
      <defs>
        <linearGradient id="ds-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7a76c"/><stop offset=".55" stop-color="#ffd8a6"/><stop offset="1" stop-color="#fff0d9"/></linearGradient>
        <linearGradient id="ds-mesa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9824e"/><stop offset="1" stop-color="#b8643a"/></linearGradient>
        <linearGradient id="ds-sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5c98a"/><stop offset="1" stop-color="#e3a95e"/></linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#ds-sky)"/>
      <circle cx="170" cy="130" r="58" fill="#ffe7a8" opacity=".95"/>
      <path d="M430 400 V250 L455 240 H560 L585 250 V400Z" fill="url(#ds-mesa)" opacity=".75"/>
      <path d="M600 400 V300 L620 290 H700 L715 300 V400Z" fill="url(#ds-mesa)" opacity=".6"/>
      <path d="M40 400 V285 L70 270 H150 L170 285 V400Z" fill="url(#ds-mesa)" opacity=".55"/>
      <path d="M0 420 C160 380 300 430 460 410 C600 392 700 420 800 400 V600 H0Z" fill="url(#ds-sand)"/>
      <path d="M0 500 C200 470 380 520 560 495 C680 480 760 500 800 490 V600 H0Z" fill="#e8b46f"/>
      ${[[120, 430, 1], [690, 455, .8]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#3f9a4a">
        <rect x="-13" y="-90" width="26" height="110" rx="13"/><rect x="-45" y="-55" width="18" height="45" rx="9"/><rect x="-45" y="-22" width="40" height="16" rx="8"/>
        <rect x="27" y="-70" width="18" height="40" rx="9"/><rect x="8" y="-40" width="37" height="16" rx="8"/></g>`).join("")}`),
  },

  ocean: {
    name: "Ocean",
    scene: () => svgScene(`
      <defs>
        <linearGradient id="oc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ec6ff"/><stop offset="1" stop-color="#d7f0ff"/></linearGradient>
        <linearGradient id="oc-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2aa6e0"/><stop offset="1" stop-color="#136fb3"/></linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#oc-sky)"/>
      ${sceneCloud(200, 100, .9)}${sceneCloud(600, 70, .7, .9)}
      <circle cx="700" cy="120" r="40" fill="#fff3a0"/>
      <rect y="330" width="800" height="270" fill="url(#oc-sea)"/>
      ${[360, 410, 460].map((y, i) => `<path d="M0 ${y} ${[...Array(9)].map((_, k) => `q 50 ${i % 2 ? 12 : -12} 100 0`).join(" ")}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4"/>`).join("")}
      <g transform="translate(560 300)"><path d="M-70 30 H70 L50 55 H-50Z" fill="#e5383b"/><rect x="-3" y="-80" width="6" height="112" fill="#6b4a2b"/><path d="M5 -75 L65 20 H5Z" fill="#fff"/><path d="M-5 -60 L-55 20 H-5Z" fill="#ffe8a3"/></g>
      <path d="M0 540 C200 520 400 560 800 530 V600 H0Z" fill="#f5d9a0"/>
      <g transform="translate(90 548)"><path d="M0 0 l8 -20 l8 20 l18 -8 l-12 16 l20 6 h-20 l6 18 l-20 -12 l-20 12 l6 -18 h-20 l20 -6 l-12 -16Z" fill="#ff8c5a"/></g>`),
  },

  space: {
    name: "Space",
    scene: () => svgScene(`
      <defs>
        <linearGradient id="sp-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a1f5c"/><stop offset="1" stop-color="#4a2a7a"/></linearGradient>
        <radialGradient id="sp-planet" cx=".35" cy=".35"><stop offset="0" stop-color="#ffb86b"/><stop offset="1" stop-color="#e5663b"/></radialGradient>
      </defs>
      <rect width="800" height="600" fill="url(#sp-bg)"/>
      ${[...Array(60)].map((_, i) => `<circle cx="${(i * 137) % 800}" cy="${(i * 211) % 600}" r="${(i % 3) + 1}" fill="#fff" opacity="${0.4 + (i % 5) / 10}"/>`).join("")}
      <g transform="translate(640 150)"><circle r="70" fill="url(#sp-planet)"/><ellipse rx="120" ry="24" fill="none" stroke="#ffd8a8" stroke-width="10" opacity=".85" transform="rotate(-18)"/></g>
      <circle cx="120" cy="480" r="46" fill="#dfe3f0"/><circle cx="105" cy="470" r="9" fill="#c3c8da"/><circle cx="135" cy="495" r="6" fill="#c3c8da"/>
      <g transform="translate(260 120) rotate(35)"><path d="M0 -40 C18 -20 18 20 10 40 H-10 C-18 20 -18 -20 0 -40Z" fill="#fff"/><circle cy="-6" r="8" fill="#1e9be9"/><path d="M-10 30 L-24 48 L-10 42Z M10 30 L24 48 L10 42Z" fill="#e5383b"/><path d="M-6 42 L0 62 L6 42Z" fill="#ffb703"/></g>`),
  },
};

function themeOf(own) {
  return THEMES[(own && own.theme) || "meadow"] || THEMES.meadow;
}
