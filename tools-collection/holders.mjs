// Holders snapshot: which wallet holds which Nuddie right now (public on-chain data, no keys),
// cross-checked against Magic Eden's public endpoints. Writes collection/holders.json + holders-report.json.
import fs from 'node:fs';
const COLLECTION = '2n6DteH5DVoWnQe6ZDNGiQeuK9e8Wcq3jBmaTQNywypm';
const CORE = 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d';
const SYMBOL = 'nuddies_';
const RPCS = ['https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com', 'https://solana.drpc.org', 'https://rpc.ankr.com/solana', 'https://solana.api.onfinality.io/public'];
const ME = 'https://api-mainnet.magiceden.dev/v2';
const MAIN_LIST = 'https://raw.githubusercontent.com/jseandon1-droid/nuddies-atelier/main/collection/nuddies.json';
const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(buf) { let n = 0n; for (const b of buf) n = n * 256n + BigInt(b); let s = ''; while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; } for (const b of buf) { if (b === 0) s = '1' + s; else break; } return s; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function rpc(url, method, params) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(120000) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { throw new Error(`HTTP ${r.status} ${t.slice(0, 200)}`); }
  if (j.error) throw new Error(`rpc ${JSON.stringify(j.error).slice(0, 300)}`); return j.result;
}
async function getJson(url, tries = 5) {
  let last;
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
      const txt = await r.text();
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status} ${txt.slice(0, 120)}`);
      let body; try { body = JSON.parse(txt); } catch { body = txt.slice(0, 300); }
      return { status: r.status, body };
    } catch (e) { last = e; await sleep(1500 * (t + 1)); }
  }
  return { status: 0, error: String(last).slice(0, 200) };
}

const report = { started: new Date().toISOString(), rpc: [], me: {} };

// 1) On-chain owners (Core asset account: byte 0 = key, bytes 1..33 = owner)
let accounts = null; let source = null;
for (const url of RPCS) {
  try {
    const res = await rpc(url, 'getProgramAccounts', [CORE, { encoding: 'base64', dataSlice: { offset: 0, length: 33 }, filters: [{ memcmp: { offset: 0, bytes: '2' } }, { memcmp: { offset: 33, bytes: '3' } }, { memcmp: { offset: 34, bytes: COLLECTION } }] }]);
    report.rpc.push({ url, ok: true, n: res.length }); console.log(url, 'OK', res.length);
    if (res.length > 0) { accounts = res; source = url; break; }
  } catch (e) { report.rpc.push({ url, ok: false, err: String(e).slice(0, 300) }); console.log(url, 'FAIL', String(e).slice(0, 300)); }
}
if (!accounts) { fs.writeFileSync('collection/holders-report.json', JSON.stringify(report, null, 1)); console.log('::error::no RPC returned the collection'); process.exit(1); }
const chainOwner = {};
for (const a of accounts) { const d = Buffer.from(a.account.data[0], 'base64'); chainOwner[a.pubkey] = b58(d.subarray(1, 33)); }

// 2) Magic Eden cross-check (public, no key)
const stats = await getJson(`${ME}/collections/${SYMBOL}/stats`); report.me.stats = stats; await sleep(600);
let holderStats = await getJson(`${ME}/collections/${SYMBOL}/holder_stats`); report.me.holder_stats = holderStats; await sleep(600);
if (holderStats.status !== 200) { // older public endpoint used by the ME site; record either way
  const alt = await getJson(`https://api-mainnet.magiceden.io/rpc/getCollectionHolderStats/${SYMBOL}`, 2); report.me.holder_stats_alt = { status: alt.status, body: typeof alt.body === 'string' ? alt.body.slice(0, 200) : alt.body, err: alt.error };
  if (alt.status === 200 && alt.body?.results) holderStats = { status: 200, body: alt.body.results };
  await sleep(600);
}
// ME may return fewer than `limit` rows on a full page, so page until an empty page (dedupe by mint).
const listingByMint = new Map(); let pagesOk = true;
for (let offset = 0; offset < 5000; offset += 100) {
  const r = await getJson(`${ME}/collections/${SYMBOL}/listings?offset=${offset}&limit=100`);
  if (r.status !== 200 || !Array.isArray(r.body)) { pagesOk = false; report.me.listingsError = { offset, status: r.status, err: r.error || r.body }; break; }
  console.log('listings offset', offset, r.body.length);
  for (const l of r.body) if (l.tokenMint && !listingByMint.has(l.tokenMint)) listingByMint.set(l.tokenMint, l);
  if (r.body.length === 0) break; await sleep(600);
}
// Any mint still held by a known escrow wallet: ask ME per token (listings, then token owner).
const ESCROW_SEEDS = ['1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix', 'Fpi7E384wm2Sf3sQgsHynZaeLKRSQqot2556o95ypQgj'];
const escrows = new Set(ESCROW_SEEDS);
for (const l of listingByMint.values()) if (chainOwner[l.tokenMint] && chainOwner[l.tokenMint] !== l.seller) escrows.add(chainOwner[l.tokenMint]);
report.me.escrowWallets = [...escrows];
const perToken = { tried: 0, viaListings: 0, viaOwner: 0, unresolved: [] };
for (const [mint, w] of Object.entries(chainOwner)) {
  if (!escrows.has(w) || listingByMint.has(mint)) continue;
  perToken.tried++;
  const r = await getJson(`${ME}/tokens/${mint}/listings`); await sleep(550);
  const hit = Array.isArray(r.body) ? r.body.find((l) => l.seller) : null;
  if (hit) { listingByMint.set(mint, { ...hit, tokenMint: mint }); perToken.viaListings++; continue; }
  const t = await getJson(`${ME}/tokens/${mint}`); await sleep(550);
  const o = t.body && typeof t.body === 'object' ? t.body.owner : null;
  if (o && !escrows.has(o)) { listingByMint.set(mint, { tokenMint: mint, seller: o, price: t.body.price ?? null, listingSource: 'token-owner' }); perToken.viaOwner++; continue; }
  perToken.unresolved.push(mint);
}
report.me.perToken = perToken; console.log('perToken', JSON.stringify(perToken).slice(0, 300));
const listings = [...listingByMint.values()];
report.me.listingsFetched = listings.length; report.me.listingsComplete = pagesOk;

// 3) Resolve real holder: on-chain owner, except a listed mint held by someone other than the ME seller (escrow) -> seller
const listed = {}; const mismatches = []; const listedNotInCollection = [];
const sources = {};
for (const l of listings) {
  const mint = l.tokenMint; if (!mint) continue;
  const price = typeof l.price === 'number' ? l.price : null;
  listed[mint] = { seller: l.seller, price };
  if (l.listingSource) { listed[mint].source = l.listingSource; sources[l.listingSource] = (sources[l.listingSource] || 0) + 1; }
  if (!(mint in chainOwner)) { listedNotInCollection.push(mint); continue; }
  if (chainOwner[mint] !== l.seller) mismatches.push({ mint, chainOwner: chainOwner[mint], meSeller: l.seller });
}
const holder = { ...chainOwner };
for (const m of mismatches) holder[m.mint] = m.meSeller;

const owners = {};
for (const [mint, w] of Object.entries(holder)) (owners[w] ||= []).push(mint);
for (const w in owners) owners[w].sort();
const sortedOwners = Object.fromEntries(Object.entries(owners).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])));

// 4) Coverage vs the site's master list on main
let mainList = null; const lm = await getJson(MAIN_LIST);
if (lm.status === 200 && Array.isArray(lm.body)) mainList = lm.body.map((r) => r[r.length - 1]);
const coverage = mainList ? { mainListCount: mainList.length, missingOwner: mainList.filter((m) => !(m in holder)), notInMainList: Object.keys(holder).filter((m) => !mainList.includes(m)) } : { error: lm.error || lm.status };

const now = new Date().toISOString();
const count = Object.keys(holder).length; const uniq = Object.keys(owners).length;
fs.writeFileSync('collection/holders.json', JSON.stringify({ updated: now, source: `on-chain getProgramAccounts (Metaplex Core, ${source}); listed mints from Magic Eden public listings (${SYMBOL})`, count, holders: uniq, owners: sortedOwners, listed }));

const meStats = stats.body && typeof stats.body === 'object' ? stats.body : null;
const meHolders = holderStats.status === 200 && holderStats.body && typeof holderStats.body === 'object' ? holderStats.body : null;
Object.assign(report, {
  finished: now, rpcSource: source, count, uniqueHolders: uniq,
  top10: Object.entries(sortedOwners).slice(0, 10).map(([w, ms]) => ({ wallet: w, n: ms.length })),
  crossCheck: {
    supply: { ours: count, meHolderStatsSupply: meHolders?.totalSupply ?? null },
    uniqueHolders: { ours: uniq, meHolderStats: meHolders?.uniqueHolders ?? null },
    listed: { meStatsListedCount: meStats?.listedCount ?? null, listingsFetched: listings.length, listingSources: sources },
    floorSol: meStats?.floorPrice != null ? meStats.floorPrice / 1e9 : null,
    ownerSellerMismatches: mismatches, listedNotInCollection,
  },
  coverage,
});
fs.writeFileSync('collection/holders-report.json', JSON.stringify(report, null, 1));
console.log('DONE', { count, uniq, listed: listings.length, mismatches: mismatches.length, missing: coverage.missingOwner?.length, meHolders: meHolders?.uniqueHolders, meSupply: meHolders?.totalSupply });
