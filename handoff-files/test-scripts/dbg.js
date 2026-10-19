const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const p = await b.newPage({ viewport: { width: 1366, height: 657 } });
  p.setDefaultTimeout(4000);
  await p.route('https://firestore.googleapis.com/**', r => r.abort());
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8784/#/' + process.argv[2]); await p.waitForTimeout(1000);
  console.log('title', await p.title());
  await p.screenshot({ path: 'dbg0.png' });
  try { await p.click('[data-start]'); } catch (e) { console.log('no start', e.message.split('\n')[0]); }
  await p.waitForTimeout(500); await p.screenshot({ path: 'dbg1.png' });
  await b.close();
})();
