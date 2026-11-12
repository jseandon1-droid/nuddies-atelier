// One-time pull of every Nuddie (Metaplex Core) into collection/collection.json. No keys.
import fs from 'node:fs';
const COLLECTION = '2n6DteH5DVoWnQe6ZDNGiQeuK9e8Wcq3jBmaTQNywypm';
const CORE = 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d';
const RPCS = ['https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com', 'https://solana.drpc.org', 'https://rpc.ankr.com/solana', 'https://solana.api.onfinality.io/public'];
const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(buf) { let n = 0n; for (const b of buf) n = n * 256n + BigInt(b); let s = ''; while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; } for (const b of buf) { if (b === 0) s = '1' + s; else break; } return s; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function rpc(url, method, params) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(120000) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { throw new Error(`HTTP ${r.status} ${t.slice(0, 200)}`); }
  if (j.error) throw new Error(`rpc ${JSON.stringify(j.error).slice(0, 300)}`); return j.result;
}
function parse(pubkey, b64) {
  const d = Buffer.from(b64, 'base64'); let o = 0;
  const key = d[o++]; const owner = b58(d.subarray(o, o + 32)); o += 32;
  const ua = d[o++]; let uaAddr = null; if (ua !== 0) { uaAddr = b58(d.subarray(o, o + 32)); o += 32; }
  const nl = d.readUInt32LE(o); o += 4; const name = d.subarray(o, o + nl).toString('utf8'); o += nl;
  const ul = d.readUInt32LE(o); o += 4; const uri = d.subarray(o, o + ul).toString('utf8');
  return { mint: pubkey, key, ua, uaAddr, name, uri };
}
const report = { started: new Date().toISOString(), attempts: [] };
let assets = null;
for (const url of RPCS) {
  try {
    const res = await rpc(url, 'getProgramAccounts', [CORE, { encoding: 'base64', filters: [{ memcmp: { offset: 0, bytes: '2' } }, { memcmp: { offset: 33, bytes: '3' } }, { memcmp: { offset: 34, bytes: COLLECTION } }] }]);
    report.attempts.push({ url, ok: true, n: res.length }); console.log(url, 'OK', res.length);
    if (res.length > 0) { assets = res.map((a) => parse(a.pubkey, a.account.data[0])); break; }
  } catch (e) { report.attempts.push({ url, ok: false, err: String(e).slice(0, 300) }); console.log(url, 'FAIL', String(e).slice(0, 300)); }
}
// Diagnostics on marketplace endpoints either way
for (const u of ['https://api-mainnet.magiceden.dev/v2/collections/nuddies_/stats', 'https://api-mainnet.magiceden.dev/v2/collections/nuddies_/listings?offset=0&limit=2', 'https://api-mainnet.magiceden.dev/v2/collections/nuddies_/holder_stats', 'https://api-mainnet.magiceden.io/idxv2/getAllNftsByCollectionSymbol?collectionSymbol=nuddies_&limit=2&offset=0']) {
  try { const r = await fetch(u, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) }); const t = await r.text(); report.attempts.push({ url: u, status: r.status, body: t.slice(0, 600) }); console.log(u, r.status, t.slice(0, 300)); }
  catch (e) { report.attempts.push({ url: u, err: String(e).slice(0, 200) }); }
}
fs.mkdirSync('collection', { recursive: true });
if (!assets) { report.result = 'no-source'; fs.writeFileSync('collection/report.json', JSON.stringify(report, null, 1)); console.log('::error::no source returned the collection'); process.exit(0); }
// Off-chain JSON per asset
const out = []; let fail = 0; let i = 0;
async function one(a) {
  for (let t = 0; t < 5; t++) {
    try { const r = await fetch(a.uri, { signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json();
      return { mint: a.mint, name: j.name || a.name, chainName: a.name, uri: a.uri, image: j.image || null, attributes: j.attributes || [], description: j.description || '' }; }
    catch (e) { if (t === 4) { fail++; return { mint: a.mint, name: a.name, chainName: a.name, uri: a.uri, image: null, attributes: [], error: String(e).slice(0, 120) }; } await sleep(800 * (t + 1)); }
  }
}
async function worker() { while (i < assets.length) { const a = assets[i++]; out.push(await one(a)); if (out.length % 200 === 0) console.log('meta', out.length, '/', assets.length, 'fail', fail); } }
await Promise.all(Array.from({ length: 12 }, worker));
out.sort((x, y) => x.name.localeCompare(y.name, 'en', { numeric: true }));
const hosts = {}; for (const o of out) { try { const h = new URL(o.image).host; hosts[h] = (hosts[h] || 0) + 1; } catch { hosts.none = (hosts.none || 0) + 1; } }
report.result = 'ok'; report.count = out.length; report.metaFailures = fail; report.imageHosts = hosts; report.sample = out.slice(0, 3); report.finished = new Date().toISOString();
fs.writeFileSync('collection/collection.json', JSON.stringify(out));
fs.writeFileSync('collection/report.json', JSON.stringify(report, null, 1));
console.log('DONE', out.length, 'fail', fail, hosts);
