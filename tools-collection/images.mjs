// Final site art for the Collection lookup: every Nuddie once, from its original.
//   <OUT>/thumbs/<mint>.webp  400px  (grid)      <OUT>/art/<mint>.webp  960px  (detail)
import fs from 'node:fs';
import sharp from 'sharp';
const OUT = process.env.OUT || 'collection';
const list = JSON.parse(fs.readFileSync(process.env.LIST || 'collection/collection.json', 'utf8'));
fs.mkdirSync(`${OUT}/thumbs`, { recursive: true }); fs.mkdirSync(`${OUT}/art`, { recursive: true });
let i = 0, fail = 0, done = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function one(a) {
  for (let t = 0; t < 6; t++) {
    try {
      const r = await fetch(a.image, { signal: AbortSignal.timeout(120000) }); if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      const base = () => sharp(buf, { animated: false }).flatten({ background: '#0B0A0F' });
      await base().resize(960, 960, { fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' }).webp({ quality: 82, effort: 5, smartSubsample: true }).toFile(`${OUT}/art/${a.mint}.webp`);
      await base().resize(400, 400, { fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' }).webp({ quality: 82, effort: 5, smartSubsample: true }).toFile(`${OUT}/thumbs/${a.mint}.webp`);
      return;
    } catch (e) { if (t === 5) { fail++; console.log('FAIL', a.name, a.image, String(e).slice(0, 160)); } else await sleep(1500 * (t + 1)); }
  }
}
async function worker() { while (i < list.length) { await one(list[i++]); if (++done % 200 === 0) console.log('img', done, '/', list.length, 'fail', fail); } }
await Promise.all(Array.from({ length: 10 }, worker));
console.log('DONE', done, 'fail', fail);
if (fail) process.exit(1);
