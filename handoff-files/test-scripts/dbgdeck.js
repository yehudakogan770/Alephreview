const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  await p.route('https://firestore.googleapis.com/**', r => r.abort());
  await p.goto('http://localhost:8784/#/orange/2/play/own-orange-2-ww94349304'); await p.waitForTimeout(900);
  await p.click('[data-start]'); await p.waitForTimeout(500);
  console.log(await p.$eval('[data-deck]', e => e.outerHTML));
  console.log(await p.$eval('[data-deck] i', e => { const c = getComputedStyle(e); return [c.display, c.width, c.height, c.position]; }));
  console.log(await p.$eval('[data-deck] i', e => [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } }).filter(r => r.selectorText && e.matches(r.selectorText)).map(r => r.cssText.slice(0, 160))));
  console.log(await p.$eval('[data-deck]', e => { const out = []; for (const el of [e, ...e.querySelectorAll('*')]) for (const ps of ['::before', '::after']) { const c = getComputedStyle(el, ps); if (c.content !== 'none') out.push(el.className + ps + ' ' + c.content + ' ' + c.width + 'x' + c.height + ' ' + c.backgroundColor + ' ' + c.borderRadius); } return out; }));
  console.log(await p.$eval('.og-deckback', e => { const c = getComputedStyle(e); return [c.display, c.gridTemplateRows, c.height]; }));
  await b.close();
})();
