const { chromium } = require('playwright');
const SHADES = {
  light:  { bg: '#e6e7ea', dot: 'rgba(0,0,0,.06)', text: null },
  medium: { bg: '#c9ccd2', dot: 'rgba(0,0,0,.07)', text: null },
  dark:   { bg: '#3b3f47', dot: 'rgba(255,255,255,.06)', text: '#f1f2f5', muted: '#c3c7cf', line: '#4b5059' },
};
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  for (const [name, s] of Object.entries(SHADES)) {
    const p = await b.newPage({viewport:{width:1600,height:900}});
    await p.goto('http://localhost:8776/');
    // Only the page background (and the text that sits directly on it) changes; cards stay white.
    let css = `:root{--bg:${s.bg};--dot:${s.dot};}`;
    if (s.text) css += `
      .site-header,.site-footer{border-color:${s.line}}
      .brand-text,.section-head h2,.header-link,.crumbs [aria-current],.footer-brand,.player-title h1{color:${s.text}}
      .section-head p,.crumbs,.crumbs a,.footer-inner{color:${s.muted}}
      .header-link:hover{background:${s.line}}`;
    await p.addStyleTag({content: css});
    await p.waitForTimeout(2500);
    await p.screenshot({path:`gray-${name}-home.png`});
    await p.goto('http://localhost:8776/#/red/1'); await p.addStyleTag({content: css}); await p.waitForTimeout(2500);
    await p.screenshot({path:`gray-${name}-stripe.png`});
    await p.close();
  }
  await b.close();
})();
