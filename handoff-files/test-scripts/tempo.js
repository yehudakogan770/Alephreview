// Measures each recording: loudness, how busy it is (onsets/sec) and a tempo guess.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.goto('http://localhost:8784/img/favicon.svg');
  const files = (process.env.ONLY ? process.env.ONLY.split(',') : fs.readdirSync('/home/user/Alephreview/music').filter(f => f.endsWith('.mp3')));
  for (const f of files) {
    const r = await p.evaluate(async f => {
      const buf = await (await fetch('/music/' + f)).arrayBuffer();
      const ctx = new OfflineAudioContext(1, 44100, 44100);
      const audio = await ctx.decodeAudioData(buf);
      const d = audio.getChannelData(0), sr = audio.sampleRate;
      const start = Math.floor(Math.min(sr * 20, d.length * 0.15)), len = Math.min(d.length - start, sr * 90);
      const hop = 512, frames = Math.floor(len / hop);
      const env = new Float32Array(frames);
      let sum = 0;
      for (let i = 0; i < frames; i++) { let e = 0; for (let k = 0; k < hop; k++) { const v = d[start + i * hop + k]; e += v * v; } env[i] = Math.sqrt(e / hop); sum += env[i]; }
      const rms = sum / frames;
      // onset strength: positive change in energy
      const on = new Float32Array(frames);
      for (let i = 1; i < frames; i++) on[i] = Math.max(0, env[i] - env[i - 1]);
      const mean = on.reduce((a, x) => a + x, 0) / frames;
      let onsets = 0; for (let i = 1; i < frames - 1; i++) if (on[i] > mean * 3 && on[i] >= on[i - 1] && on[i] >= on[i + 1]) onsets++;
      // tempo: autocorrelation of onset strength between 60 and 180 bpm
      const fps = sr / hop; let best = 0, bpm = 0;
      for (let t = 60; t <= 180; t++) {
        const lag = Math.round(fps * 60 / t); let c = 0;
        for (let i = 0; i + lag < frames; i++) c += on[i] * on[i + lag];
        if (c > best) { best = c; bpm = t; }
      }
      return { dur: Math.round(audio.duration), rms: +rms.toFixed(3), onsetsPerSec: +(onsets / (len / sr)).toFixed(2), bpm };
    }, f);
    console.log(f.padEnd(32), JSON.stringify(r));
  }
  await b.close();
})();
