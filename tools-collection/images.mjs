// Downloads every Nuddie image once and writes sharp 480px WebP thumbs + original-size facts.
import fs from 'node:fs';
import sharp from 'sharp';
const list = JSON.parse(fs.readFileSync('collection/collection.json', 'utf8'));
fs.mkdirSync('collection/thumbs', { recursive: true });
const facts = {}; let i = 0, fail = 0, done = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function one(a) {
  const out = `collection/thumbs/${a.mint}.webp`;
  for (let t = 0; t < 6; t++) {
    try {
      const r = await fetch(a.image, { signal: AbortSignal.timeout(90000) }); if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer()); const img = sharp(buf, { animated: false }); const m = await img.metadata();
      await img.resize(480, 480, { fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' }).webp({ quality: 86, effort: 5 }).toFile(out);
      facts[a.mint] = { w: m.width, h: m.height, fmt: m.format, bytes: buf.length, pages: m.pages || 1, type: r.headers.get('content-type') }; return;
    } catch (e) { if (t === 5) { fail++; facts[a.mint] = { error: String(e).slice(0, 160) }; console.log('FAIL', a.name, a.image, String(e).slice(0, 160)); } else await sleep(1500 * (t + 1)); }
  }
}
async function worker() { while (i < list.length) { await one(list[i++]); if (++done % 200 === 0) console.log('img', done, '/', list.length, 'fail', fail); } }
await Promise.all(Array.from({ length: 10 }, worker));
fs.writeFileSync('collection/images.json', JSON.stringify(facts));
console.log('DONE', done, 'fail', fail);
