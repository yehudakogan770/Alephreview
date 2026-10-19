const W = process.env.WRONG === '1';
const problems = []; const bad = m => { problems.push(m); console.log('PROBLEM:', m); };
const norm = s => (s || '').replace(/\s+/g, ' ').trim();

const players = {
  async match(p, own) {
    while (await p.$('.og-matchup')) {
      for (const box of await p.$$('.og-box')) {
        const word = norm(await box.evaluate(b => b.parentElement.querySelector('.og-word').textContent));
        const pair = own.pairs.find(x => x.b === word);
        const tiles = await p.$$('.og-bank .og-tile');
        for (const t of tiles) if (norm(await t.textContent()) === pair.a) { await t.click(); await box.click(); break; }
      }
      await p.click('[data-submit]'); await p.waitForTimeout(150); await p.click('[data-continue]'); await p.waitForTimeout(300);
    }
  },
  async pairs(p, own, shot) {
    let n = 0;
    while (await p.$('.og-memory')) {
      const cards = await p.$$eval('.og-card', l => l.map(c => c.querySelector('.og-card-front').textContent.trim()));
      const done = new Set();
      if (shot && n === 0) { await p.$$('.og-card').then(c => c[0].click()); await p.waitForTimeout(600); await p.screenshot({ path: 'k-pairs-flip.png' }); await p.$$('.og-card').then(c => c[1].click()); await p.waitForTimeout(1200); }
      for (let i = 0; i < cards.length; i++) {
        if (done.has(i)) continue;
        const pr = own.pairs.find(x => x.a === cards[i] || x.b === cards[i]);
        const j = cards.findIndex((c, k) => k !== i && (c === pr.a || c === pr.b));
        done.add(i); done.add(j);
        const els = await p.$$('.og-card');
        if (await els[i].evaluate(e => e.classList.contains('done'))) continue;
        await els[i].click(); await els[j].click(); await p.waitForTimeout(80);
      }
      n++;
      await p.waitForTimeout(1100);
    }
  },
  async find(p, own) {
    while (await p.$('.og-find')) {
      const want = norm(await p.textContent('[data-prompt]'));
      const pr = own.pairs.find(x => x.b === want);
      const tiles = await p.$$('.og-find-grid .og-tile:not(.gone)');
      for (const t of tiles) if (norm(await t.textContent()) === pr.a) { await t.click(); break; }
      await p.waitForTimeout(700);
    }
  },
  async truefalse(p, own) {
    while (await p.$('.og-tf')) {
      const a = norm(await p.textContent('[data-a]')), b = norm(await p.textContent('[data-b]'));
      const right = own.statements ? own.statements.some(x => x.a === a && x.b === b && x.right) : own.pairs.some(x => x.a === a && x.b === b);
      await p.click(`[data-say="${right !== W ? 'yes' : 'no'}"]`);
      await p.waitForTimeout(1700);
    }
  },
  async quiz(p, own, shot, kind) {
    let n = 0;
    while (await p.$('.og-quiz, .og-wl')) {
      if (await p.$('.og-wl-picks')) { await p.click('.og-wl-pick >> nth=2'); await p.waitForTimeout(200); }
      if (shot && n === 1) await p.screenshot({ path: `k-${kind}-q.png` });
      if (kind === 'gameshow' && n === 0) { await p.click('[data-half]'); await p.waitForTimeout(100); console.log('  50:50 left', await p.locator('.og-answer:not(.gone)').count(), 'answers'); }
      const q = norm(await p.textContent('.og-question'));
      const btns = await p.$$('.og-answer');
      const shown = (await Promise.all(btns.map(b => b.textContent()))).map(norm).sort().join('|');
      const Q = own.questions.find(x => norm(x.q) === q && x.answers.map(norm).sort().join('|') === shown);
      if (!Q) { bad(`no question "${q}"`); break; }
      let clicked = false;
      for (const b of btns) if ((norm(await b.textContent()) === Q.answers[0]) !== W && !(await b.evaluate(e => e.classList.contains('gone')))) { await b.click(); clicked = true; break; }
      if (!clicked) { bad('no answer clicked'); break; }
      n++;
      if (shot && n === 1) { await p.waitForTimeout(250); await p.screenshot({ path: `k-${kind}-a.png` }); }
      await p.waitForTimeout(1900);
    }
  },
};
// Tile i goes in target i, then Submit (Fill the gaps, Label it).
async function byIndex(p, root, W) {
  while (await p.$(root)) {
    for (const t of await p.$$(`${root} [data-target]:not([data-target=bank])`)) {
      const want = await t.getAttribute('data-target');
      const tile = await p.$(`${root} .og-bank [data-tile="${want}"]`);
      if (tile) { await tile.click(); await t.click(); }
    }
    await p.click('[data-submit]'); await p.waitForTimeout(150);
    await p.click('[data-continue]'); await p.waitForTimeout(400);
  }
}
players.gaps = p => byIndex(p, '.og-gaps');
players.label = p => byIndex(p, '.og-label');
const groupOf = (own, text) => own.groups.findIndex(g => g.items.includes(text));
players.sort = async (p, own) => {
  while (await p.$('.og-sort')) {
    const tiles = await p.$$('.og-pile .og-tile');
    for (const t of tiles) { const gi = groupOf(own, norm(await t.textContent())); await t.click(); await p.click(`.og-bin[data-target="${W ? (gi + 1) % own.groups.length : gi}"]`); }
    await p.waitForTimeout(900);
  }
};
players.categorize = async (p, own) => {
  while (await p.$('.og-table')) {
    for (const t of await p.$$('.og-table-bank .og-tile')) { const gi = groupOf(own, norm(await t.textContent())); await t.click(); await p.click(`.og-col-in[data-target="${W ? (gi + 1) % own.groups.length : gi}"]`); }
    await p.click('[data-submit]'); await p.waitForTimeout(150); await p.click('[data-continue]'); await p.waitForTimeout(400);
  }
};
players.speedsort = async (p, own) => {
  while (await p.$('.og-speed')) {
    const gi = groupOf(own, norm(await p.textContent('[data-item]')));
    await p.click(`[data-side="${W ? 1 - gi : gi}"]`); await p.waitForTimeout(W ? 900 : 450);
  }
};
players.order = async (p) => {
  while (await p.$('.og-order')) {
    const n = await p.locator('.og-rank-item').count();
    const want = (await p.$$eval('.og-rank-item', l => l.map(x => +x.dataset.tile))).sort((a, b) => a - b);
    for (let k = 0; k < n && !W; k++) {
      const els = await p.$$('.og-rank-item');
      const ids = await Promise.all(els.map(e => e.getAttribute('data-tile')));
      const j = ids.indexOf(String(want[k]));
      if (j !== k) { await els[j].click(); await els[k].click(); await p.waitForTimeout(60); }
    }
    await p.click('[data-submit]'); await p.waitForTimeout(150); await p.click('[data-continue]'); await p.waitForTimeout(400);
  }
};
players.anagram = async (p, own) => {
  const seg = w => [...new Intl.Segmenter('he', { granularity: 'grapheme' }).segment(w)].map(x => x.segment).filter(x => x.trim());
  while (await p.$('.og-anagram')) {
    const bankL = (await p.$$eval('.og-letter-bank [data-letter]', l => l.map(x => x.dataset.letter))).sort().join('|');
    const word = own.items.find(w => seg(w).slice().sort().join('|') === bankL);
    const parts = W ? seg(word).reverse() : seg(word);
    for (const part of parts) {
      const tiles = await p.$$('.og-letter-bank [data-letter]');
      for (const t of tiles) if ((await t.getAttribute('data-letter')) === part) { await t.click(); break; }
    }
    await p.waitForTimeout(W ? 900 : 1200);
    if (await p.$('[data-continue]')) { await p.click('[data-continue]'); await p.waitForTimeout(300); }
  }
};
// ---- arcade: the bot watches the moving things and acts at the right time ----
const pairFor = (own, b) => own.pairs.find(x => x.b === b);
// The right answers for what's asked now (pairs or questions); set in the page as window.__rightFor.
const RIGHT_FOR = `window.__rightFor = b => { const own = window.__own;
  if (own.questions) { const q = own.questions.find(x => x.q === b); return q ? q.answers.slice(0, q.right || 1) : []; }
  const p = own.pairs.find(x => x.b === b); return p ? [p.a] : []; };`;
players.balloon = async (p, own) => {
  for (let guard = 0; guard < 4000 && await p.$('.og-sky'); guard++) {
    const act = await p.evaluate(W => {
      const bal = document.querySelector('[data-balloon]');
      if (!bal || bal.classList.contains('popped') || bal.classList.contains('gone')) return 'wait';
      const a = bal.querySelector('[data-carry]').textContent.trim();
      const own = window.__own;
      const pr = own.pairs.find(x => x.a === a);
      const carts = [...document.querySelectorAll('.og-cart')];
      let k = carts.findIndex(c => c.querySelector('b').textContent.trim() === pr.b);
      if (W) k = (k + 1) % carts.length;
      const x = parseFloat(bal.style.left);
      const w = 100 / carts.length;
      if (x > k * w + w * 0.3 && x < k * w + w * 0.7) { document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); return 'pop'; }
      return 'wait';
    }, W);
    await p.waitForTimeout(act === 'pop' ? 1300 : 25);
  }
};
players.fruit = async (p, own) => {
  for (let guard = 0; guard < 6000 && await p.$('.og-arena [data-prompt]') && !(await p.$('.og-end')); guard++) {
    const act = await p.evaluate(W => {
      const own = window.__own;
      const pe = document.querySelector('[data-prompt]'); if (!pe) return 'wait';
      const b = pe.textContent.trim();
      const good = window.__rightFor(b);
      const f = [...document.querySelectorAll('.og-fruit:not(.caught):not(.splat)')].find(el => {
        const x = parseFloat(el.style.left); const t = el.querySelector('.og-fruit-text').textContent.trim();
        return x > 10 && x < 90 && (W ? !good.includes(t) : good.includes(t));
      });
      if (!f) return 'wait';
      f.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'tap';
    }, W);
    await p.waitForTimeout(act === 'tap' ? (W ? 150 : 500) : 40);
    if (W && act === 'tap') {
      // after a wrong tap, find the right one so the game moves on
      for (let g = 0; g < 400; g++) {
        const ok = await p.evaluate(() => { const b = document.querySelector('[data-prompt]')?.textContent.trim(); if (!b) return true; const good = window.__rightFor(b);
          const f = [...document.querySelectorAll('.og-fruit:not(.caught):not(.splat)')].find(el => { const x = parseFloat(el.style.left); return x > 5 && x < 95 && good.includes(el.querySelector('.og-fruit-text').textContent.trim()); });
          if (!f) return false; f.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; });
        if (ok) break; await p.waitForTimeout(40);
      }
      await p.waitForTimeout(500);
    }
  }
};
players.whack = async (p, own) => {
  for (let guard = 0; guard < 8000 && await p.$('.og-whack'); guard++) {
    await p.evaluate(W => {
      const own = window.__own;
      const pe = document.querySelector('[data-prompt]'); if (!pe) return;
      const b = pe.textContent.trim();
      const good = own.groups ? own.groups[0].items : [own.pairs.find(x => x.b === b).a];
      for (const h of document.querySelectorAll('.og-hole.up:not(.hit):not(.miss)')) {
        const t = h.querySelector('.og-tile-face').textContent.trim();
        if (W ? !good.includes(t) : good.includes(t)) h.querySelector('.og-mole').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      }
    }, W);
    await p.waitForTimeout(60);
  }
};
players.plane = async (p, own) => {
  for (let guard = 0; guard < 8000 && await p.$('.og-sky-run'); guard++) {
    const y = await p.evaluate(W => {
      const own = window.__own;
      const pe = document.querySelector('[data-prompt]'); if (!pe) return null;
      const b = pe.textContent.trim();
      const good = window.__rightFor(b);
      const clouds = [...document.querySelectorAll('.og-cloud:not(.right):not(.wrong)')];
      const c = clouds.find(el => good.includes(el.textContent.trim()) !== W);
      if (!c) return null;
      const r = c.getBoundingClientRect(); return r.top + r.height / 2;
    }, W);
    if (y !== null) { const box = await (await p.$('.og-sky-run')).boundingBox(); await p.mouse.move(box.x + box.width * 0.5, y); }
    await p.waitForTimeout(80);
  }
};
players.watch = async (p, own) => {
  while (await p.$('.og-watch')) {
    const seen = new Set();
    while (await p.$('[data-show]')) {
      const t = await p.evaluate(() => { const el = document.querySelector('[data-show]'); return el && el.closest('.og-tile').style.visibility === 'visible' ? el.textContent.trim() : ''; });
      if (t) seen.add(t);
      await p.waitForTimeout(100);
    }
    await p.waitForTimeout(200);
    const tiles = await p.$$('.og-watch-grid [data-x]');
    let wrongDone = false;
    if (W) { for (const t of tiles) if (!seen.has(norm(await t.textContent()))) { await t.click(); wrongDone = true; } }
    for (const t of tiles) if (seen.has(norm(await t.textContent()))) { await t.click(); await p.waitForTimeout(60); }
    await p.waitForTimeout(1200);
  }
};
// ---- cards (no score) ----
players.spin = async p => {
  // Spin, take out what it picks, until the wheel ends the game or Done shows up.
  for (let k = 0; k < 20; k++) {
    if (await p.$('.og-end')) return;
    if (await p.$('[data-done]')) { await p.click('[data-done]'); return; }
    await p.click('[data-spin]'); await p.waitForTimeout(5500);
    await p.click(k % 2 ? '[data-keep]' : '[data-out]'); await p.waitForTimeout(900);
  }
};
players.openbox = async p => {
  for (const b of await p.$$('.og-box-btn')) { await b.click(); await p.waitForTimeout(80); await p.click('[data-close]'); }
};
players.flip = async p => {
  for (let k = 0; k < 60 && await p.$('.og-flipcard'); k++) { await p.click('.og-flipcard'); await p.waitForTimeout(80); await p.click('[data-next]'); }
};
players.deal = async p => {
  for (let k = 0; k < 60 && await p.$('[data-deal]'); k++) { await p.click('[data-deal]'); await p.waitForTimeout(40); }
};
async function answerPop(p, own) {
  const spinq = !!(await p.$('.og-spinq'));
  const q = norm(await p.textContent(spinq ? '.og-spinq-card' : '.og-qcard'));
  const btns = await p.$$(spinq ? '.og-spinq-answers .og-answer' : '.og-pop-answers .og-answer');
  const texts = (await Promise.all(btns.map(b => b.$eval('span', e => e.textContent)))).map(norm);
  const Q = own.questions.find(x => norm(x.q) === q && x.answers.map(norm).sort().join('|') === texts.slice().sort().join('|'));
  if (!Q) { bad('no question ' + q); return false; }
  const want = Q.answers.slice(0, Q.right || 1).map(norm);
  const k = texts.findIndex(t => want.includes(t) !== W);
  await btns[k].click(); await p.waitForTimeout(1800);
  return true;
}
players.spinquiz = async (p, own) => {
  for (let i = 0; i < 20 && await p.$('[data-spin]'); i++) {
    await p.click('[data-spin]'); await p.waitForTimeout(6400);
    if (!(await answerPop(p, own))) break;
    await p.waitForTimeout(300);
  }
};
players.boxquiz = async (p, own) => {
  const n = await p.locator('.og-box-btn').count();
  for (let i = 0; i < n; i++) {
    await p.click(`.og-box-btn >> nth=${i}`); await p.waitForTimeout(300);
    if (!(await answerPop(p, own))) break;
  }
};
players.gameshow = players.quiz; players.winlose = players.quiz;


module.exports = { players, problems, bad, norm, RIGHT_FOR };
