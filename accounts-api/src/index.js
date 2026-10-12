/* Nuddies Atelier — accounts API (Cloudflare Worker + D1).
 *
 * Zero personal data: accounts are a username + password. No email, phone, real name, IP
 * address, user agent, cookies or analytics are collected or stored, and Workers logging is
 * off (wrangler.toml). Cloudflare's edge necessarily sees connection metadata in transit; this
 * code never reads, records or forwards it.
 *
 * Secrets never arrive in readable form. The browser turns the password into
 *   authKey = PBKDF2-SHA256(password, "nuddies-atelier/v1/auth/<username>", 600 000 rounds)
 * and the 12 recovery words into
 *   recoveryKey = SHA-256("nuddies-atelier/v1/recovery/<username>/<words>")
 * and the server stores only HMAC-SHA256(PEPPER, kind | random salt | key). The PEPPER is a
 * Worker secret that never touches the database, so a stolen database alone cannot even be
 * brute-forced, and with the pepper every guess still costs 600k PBKDF2 rounds.
 *
 * Sessions are random 256-bit bearer tokens; only their SHA-256 is stored. 60-day lifetime.
 * Brute force: 10 wrong passwords lock that username for 15 minutes; 5 wrong recovery attempts
 * lock recovery for 1 hour. Sign-ups need a small proof-of-work (no CAPTCHA, no tracking).
 */

const enc = new TextEncoder();
const dec = new TextDecoder();
const now = () => Math.floor(Date.now() / 1000);

const SESSION_TTL = 60 * 24 * 3600;
const MAX_FAILS = 10, LOCK_SECS = 15 * 60;
const MAX_REC_FAILS = 5, REC_LOCK_SECS = 60 * 60;
const POW_BITS = 17, POW_TTL = 10 * 60;
const MAX_CREATIONS = 300;
const MAX_BODY = 8192;
const RESERVED = new Set(['admin', 'administrator', 'mod', 'moderator', 'nuddies', 'nuddiesnwo', 'atelier',
  'official', 'support', 'staff', 'team', 'root', 'system', 'null', 'undefined', 'anonymous']);

class HttpError extends Error {
  constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra || {}; }
}

// ---------- encoding helpers ----------
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
function fromHex(s) { const a = new Uint8Array(s.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(s.substr(i * 2, 2), 16); return a; }
function b64url(bytes) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64urlDecode(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
function b64Decode(s) { const bin = atob(s); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58decode(s) {
  if (typeof s !== 'string' || !s.length || s.length > 64) return null;
  const bytes = [0];
  for (const ch of s) {
    const v = B58.indexOf(ch); if (v < 0) return null;
    let carry = v;
    for (let i = 0; i < bytes.length; i++) { carry += bytes[i] * 58; bytes[i] = carry & 0xff; carry >>= 8; }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (const ch of s) { if (ch === '1') bytes.push(0); else break; }
  return new Uint8Array(bytes.reverse());
}
function safeEq(a, b) { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
function randBytes(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
async function sha256hex(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(s))); }

// ---------- pepper / MAC ----------
let keyCache = null;
async function pepperKey(env) {
  const p = env.PEPPER;
  if (typeof p !== 'string' || !/^[0-9a-f]{64}$/.test(p)) throw new HttpError(503, 'not_configured');
  if (keyCache && keyCache.p === p) return keyCache.k;
  const k = await crypto.subtle.importKey('raw', fromHex(p), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  keyCache = { p, k }; return k;
}
async function mac(env, ...parts) { return hex(await crypto.subtle.sign('HMAC', await pepperKey(env), enc.encode(parts.join('|')))); }
async function signTok(env, kind, payload) { const body = b64url(enc.encode(JSON.stringify(payload))); return body + '.' + await mac(env, 'tok', kind, body); }
async function openTok(env, kind, tok) {
  if (typeof tok !== 'string' || tok.length > 800) return null;
  const i = tok.indexOf('.'); if (i < 1) return null;
  const body = tok.slice(0, i), sig = tok.slice(i + 1);
  if (!safeEq(await mac(env, 'tok', kind, body), sig)) return null;
  try { const p = JSON.parse(dec.decode(b64urlDecode(body))); return (p && p.e >= now()) ? p : null; } catch { return null; }
}

// ---------- validation ----------
function normUser(u) {
  if (typeof u !== 'string') throw new HttpError(400, 'bad_username');
  u = u.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(u)) throw new HttpError(400, 'bad_username');
  return u;
}
function checkKey(k) { if (typeof k !== 'string' || !/^[0-9a-f]{64}$/.test(k)) throw new HttpError(400, 'bad_key'); return k; }
const CAT_RE = /^[A-Za-z][A-Za-z0-9 &'-]{0,39}$/;
const FILE_RE = /^[A-Za-z0-9][A-Za-z0-9 ._'&()+,-]{0,118}\.png$/;
function canonCombo(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw new HttpError(400, 'bad_combo');
  const keys = Object.keys(c);
  if (!keys.length || keys.length > 16) throw new HttpError(400, 'bad_combo');
  const out = {};
  for (const k of keys.sort()) {
    const v = c[k];
    if (!CAT_RE.test(k) || !(v === null || (typeof v === 'string' && FILE_RE.test(v)))) throw new HttpError(400, 'bad_combo');
    out[k] = v;
  }
  return JSON.stringify(out);
}
function solAddr(a) { const b = b58decode(a); if (!b || b.length !== 32) throw new HttpError(400, 'bad_address'); return b; }
function httpsUrl(u) { return (typeof u === 'string' && /^https:\/\/[^\s"'<>]{1,500}$/.test(u)) ? u : null; }

// ---------- sessions ----------
async function newSession(env, userId) {
  const token = 'nat_' + b64url(randBytes(32));
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)')
    .bind(await sha256hex(token), userId, now() + SESSION_TTL).run();
  return token;
}
async function authed(req, env) {
  const m = /^Bearer (nat_[A-Za-z0-9_-]{43})$/.exec(req.headers.get('authorization') || '');
  if (!m) throw new HttpError(401, 'signed_out');
  const th = await sha256hex(m[1]);
  const row = await env.DB.prepare(
    'SELECT s.user_id AS id, s.expires, u.username, u.salt, u.auth_hash, u.fails, u.locked_until, u.wallet, u.pfp ' +
    'FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?').bind(th).first();
  if (!row || row.expires < now()) {
    if (row) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(th).run();
    throw new HttpError(401, 'signed_out');
  }
  row.token_hash = th; return row;
}
// Checks a password-derived key against a user row, with lockout. Throws on failure.
async function checkPassword(env, row, authKey) {
  const t = now();
  if (row.locked_until > t) throw new HttpError(429, 'locked', { retryAfter: row.locked_until - t });
  const h = await mac(env, 'auth', row.salt, authKey);
  if (!safeEq(h, row.auth_hash)) {
    const r = await env.DB.prepare('UPDATE users SET fails = fails + 1 WHERE id = ? RETURNING fails').bind(row.id).first();
    if (r && r.fails >= MAX_FAILS) {
      await env.DB.prepare('UPDATE users SET fails = 0, locked_until = ? WHERE id = ?').bind(t + LOCK_SECS, row.id).run();
      throw new HttpError(429, 'locked', { retryAfter: LOCK_SECS });
    }
    throw new HttpError(401, 'bad_credentials', { attemptsLeft: MAX_FAILS - (r ? r.fails : 0) });
  }
  if (row.fails) await env.DB.prepare('UPDATE users SET fails = 0 WHERE id = ?').bind(row.id).run();
}
function parsePfp(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }
async function me(env, userId) {
  const u = await env.DB.prepare('SELECT username, wallet, pfp, created_day FROM users WHERE id = ?').bind(userId).first();
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM creations WHERE user_id = ?').bind(userId).first();
  return { username: u.username, wallet: u.wallet || null, pfp: parsePfp(u.pfp), creations: n ? n.n : 0,
    since: u.created_day, holdings: !!env.HELIUS_API_KEY };
}

// ---------- proof of work ----------
function leadingZeroBits(h) { let n = 0; for (const ch of h) { const v = parseInt(ch, 16); if (v === 0) { n += 4; continue; } n += Math.clz32(v) - 28; break; } return n; }
async function spendPow(env, pow) {
  if (!pow || typeof pow.counter !== 'string' || !/^\d{1,12}$/.test(pow.counter)) throw new HttpError(400, 'pow_required');
  const p = await openTok(env, 'pow', pow.challenge);
  if (!p) throw new HttpError(400, 'pow_expired');
  if (leadingZeroBits(await sha256hex(pow.challenge + ':' + pow.counter)) < p.b) throw new HttpError(400, 'pow_invalid');
  const r = await env.DB.prepare('INSERT OR IGNORE INTO pow_used (nonce, expires) VALUES (?, ?)').bind(p.n, p.e).run();
  if (!r.meta || r.meta.changes !== 1) throw new HttpError(400, 'pow_expired');
}

// ---------- Solana ----------
async function edVerify(pub, sig, msg) {
  let last;
  for (const alg of [{ name: 'Ed25519' }, { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' }]) {
    let key;
    try { key = await crypto.subtle.importKey('raw', pub, alg, false, ['verify']); } catch (e) { last = e; continue; }
    return crypto.subtle.verify(alg, key, sig, msg);
  }
  throw last;
}
function walletMessage(env, username, p) {
  return `${env.SITE_HOST || 'atelier.nuddiesnwo.xyz'} wants you to verify a Solana wallet for your Nuddies Atelier account.\n\n` +
    `Account: ${username}\nNonce: ${p.n}\nExpires: ${new Date(p.e * 1000).toISOString()}\n\n` +
    'This is not a transaction. It costs nothing and gives no access to your funds.';
}
async function helius(env, method, params) {
  if (!env.HELIUS_API_KEY) throw new HttpError(503, 'holdings_unavailable');
  let r;
  try {
    // HELIUS_URL is only overridden by the test suite (a local mock); production uses Helius mainnet.
    r = await fetch((env.HELIUS_URL || 'https://mainnet.helius-rpc.com/') + '?api-key=' + encodeURIComponent(env.HELIUS_API_KEY), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'atelier', method, params }) });
  } catch { throw new HttpError(502, 'holdings_upstream'); }
  if (!r.ok) throw new HttpError(502, 'holdings_upstream');
  const j = await r.json().catch(() => null);
  if (!j || j.error) throw new HttpError(502, 'holdings_upstream');
  return j.result;
}
function inCollection(env, a) { return Array.isArray(a.grouping) && a.grouping.some((g) => g.group_key === 'collection' && g.group_value === env.COLLECTION); }
function assetView(a) {
  const c = a.content || {}, files = Array.isArray(c.files) ? c.files : [];
  const image = httpsUrl(c.links && c.links.image) || httpsUrl(files[0] && files[0].uri);
  return { mint: a.id, name: String((c.metadata && c.metadata.name) || 'Nuddie').slice(0, 80), image,
    thumb: httpsUrl(files[0] && files[0].cdn_uri) || image };
}

// ---------- request plumbing ----------
async function readJson(req) {
  const len = +(req.headers.get('content-length') || 0);
  if (len > MAX_BODY) throw new HttpError(413, 'too_large');
  const t = await req.text();
  if (t.length > MAX_BODY) throw new HttpError(413, 'too_large');
  try { const j = JSON.parse(t || '{}'); if (j && typeof j === 'object') return j; } catch {}
  throw new HttpError(400, 'bad_json');
}
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

async function route(req, env, ctx) {
  const url = new URL(req.url), p = url.pathname, m = req.method;

  if (m === 'GET' && p === '/v1/health') return json({ ok: true, configured: /^[0-9a-f]{64}$/.test(env.PEPPER || ''), holdings: !!env.HELIUS_API_KEY });

  if (m === 'GET' && p === '/v1/pow') {
    const pl = { n: hex(randBytes(16)), e: now() + POW_TTL, b: POW_BITS };
    return json({ challenge: await signTok(env, 'pow', pl), bits: POW_BITS });
  }

  if (m === 'POST' && p === '/v1/signup') {
    const b = await readJson(req);
    const username = normUser(b.username); checkKey(b.authKey); checkKey(b.recoveryKey);
    if (RESERVED.has(username)) throw new HttpError(409, 'username_taken');
    if (await env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first()) throw new HttpError(409, 'username_taken');
    await spendPow(env, b.pow);
    const salt = hex(randBytes(16));
    const day = new Date().toISOString().slice(0, 10);
    let row;
    try {
      row = await env.DB.prepare('INSERT INTO users (username, salt, auth_hash, rec_hash, created_day) VALUES (?, ?, ?, ?, ?) RETURNING id')
        .bind(username, salt, await mac(env, 'auth', salt, b.authKey), await mac(env, 'rec', salt, b.recoveryKey), day).first();
    } catch (e) {
      if (/UNIQUE/i.test(String(e && e.message))) throw new HttpError(409, 'username_taken');
      throw e;
    }
    return json({ token: await newSession(env, row.id), me: await me(env, row.id) }, 201);
  }

  if (m === 'POST' && p === '/v1/login') {
    const b = await readJson(req);
    const username = normUser(b.username); checkKey(b.authKey);
    const row = await env.DB.prepare('SELECT id, salt, auth_hash, fails, locked_until FROM users WHERE username = ?').bind(username).first();
    if (!row) { await mac(env, 'auth', '00000000000000000000000000000000', b.authKey); throw new HttpError(401, 'bad_credentials'); }
    await checkPassword(env, row, b.authKey);
    return json({ token: await newSession(env, row.id), me: await me(env, row.id) });
  }

  if (m === 'POST' && p === '/v1/recover') {
    const b = await readJson(req);
    const username = normUser(b.username); checkKey(b.recoveryKey); checkKey(b.newAuthKey); checkKey(b.newRecoveryKey);
    const row = await env.DB.prepare('SELECT id, salt, rec_hash, rec_fails, rec_locked_until FROM users WHERE username = ?').bind(username).first();
    const t = now();
    if (!row) { await mac(env, 'rec', '00000000000000000000000000000000', b.recoveryKey); throw new HttpError(401, 'bad_recovery'); }
    if (row.rec_locked_until > t) throw new HttpError(429, 'locked', { retryAfter: row.rec_locked_until - t });
    if (!safeEq(await mac(env, 'rec', row.salt, b.recoveryKey), row.rec_hash)) {
      const r = await env.DB.prepare('UPDATE users SET rec_fails = rec_fails + 1 WHERE id = ? RETURNING rec_fails').bind(row.id).first();
      if (r && r.rec_fails >= MAX_REC_FAILS) {
        await env.DB.prepare('UPDATE users SET rec_fails = 0, rec_locked_until = ? WHERE id = ?').bind(t + REC_LOCK_SECS, row.id).run();
        throw new HttpError(429, 'locked', { retryAfter: REC_LOCK_SECS });
      }
      throw new HttpError(401, 'bad_recovery', { attemptsLeft: MAX_REC_FAILS - (r ? r.rec_fails : 0) });
    }
    // Fresh salt + both secrets replaced; the old recovery words stop working and every device is signed out.
    const salt = hex(randBytes(16));
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET salt = ?, auth_hash = ?, rec_hash = ?, fails = 0, locked_until = 0, rec_fails = 0, rec_locked_until = 0 WHERE id = ?')
        .bind(salt, await mac(env, 'auth', salt, b.newAuthKey), await mac(env, 'rec', salt, b.newRecoveryKey), row.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.id),
    ]);
    return json({ token: await newSession(env, row.id), me: await me(env, row.id) });
  }

  // ----- everything below needs a session -----
  const user = await authed(req, env);

  if (m === 'GET' && p === '/v1/me') return json(await me(env, user.id));

  if (m === 'POST' && p === '/v1/logout') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(user.token_hash).run();
    return json({ ok: true });
  }

  if (m === 'POST' && p === '/v1/password') {
    const b = await readJson(req); checkKey(b.authKey); checkKey(b.newAuthKey);
    await checkPassword(env, user, b.authKey);
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET auth_hash = ? WHERE id = ?').bind(await mac(env, 'auth', user.salt, b.newAuthKey), user.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(user.id, user.token_hash),
    ]);
    return json({ ok: true });
  }

  if (m === 'POST' && p === '/v1/account/delete') {
    const b = await readJson(req); checkKey(b.authKey);
    await checkPassword(env, user, b.authKey);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM creations WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ]);
    return json({ ok: true, deleted: true });
  }

  if (m === 'GET' && p === '/v1/creations') {
    const r = await env.DB.prepare('SELECT id, combo, created FROM creations WHERE user_id = ? ORDER BY id DESC LIMIT ?').bind(user.id, MAX_CREATIONS).all();
    return json({ items: (r.results || []).map((x) => ({ id: x.id, combo: JSON.parse(x.combo), created: x.created })), max: MAX_CREATIONS });
  }

  if (m === 'POST' && p === '/v1/creations') {
    const b = await readJson(req); const combo = canonCombo(b.combo);
    const dup = await env.DB.prepare('SELECT id FROM creations WHERE user_id = ? AND combo = ?').bind(user.id, combo).first();
    if (dup) return json({ id: dup.id, existed: true });
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM creations WHERE user_id = ?').bind(user.id).first();
    if (n && n.n >= MAX_CREATIONS) throw new HttpError(409, 'creations_full', { max: MAX_CREATIONS });
    const r = await env.DB.prepare('INSERT INTO creations (user_id, combo, created) VALUES (?, ?, ?) RETURNING id').bind(user.id, combo, now()).first();
    return json({ id: r.id }, 201);
  }

  let mm;
  if (m === 'DELETE' && (mm = /^\/v1\/creations\/(\d{1,15})$/.exec(p))) {
    const id = +mm[1];
    const r = await env.DB.prepare('DELETE FROM creations WHERE id = ? AND user_id = ?').bind(id, user.id).run();
    if (!r.meta || !r.meta.changes) throw new HttpError(404, 'not_found');
    const pfp = parsePfp(user.pfp);
    if (pfp && pfp.kind === 'creation' && pfp.id === id) await env.DB.prepare('UPDATE users SET pfp = NULL WHERE id = ?').bind(user.id).run();
    return json({ ok: true });
  }

  if (m === 'PUT' && p === '/v1/pfp') {
    const b = await readJson(req);
    let pfp = null;
    if (b.kind === 'creation') {
      const c = await env.DB.prepare('SELECT id, combo FROM creations WHERE id = ? AND user_id = ?').bind(+b.id || 0, user.id).first();
      if (!c) throw new HttpError(404, 'not_found');
      pfp = { kind: 'creation', id: c.id, combo: JSON.parse(c.combo) };
    } else if (b.kind === 'held') {
      if (!user.wallet) throw new HttpError(400, 'no_wallet');
      solAddr(b.mint);
      const a = await helius(env, 'getAsset', { id: b.mint });
      if (!a || a.burnt || !a.ownership || a.ownership.owner !== user.wallet || !inCollection(env, a)) throw new HttpError(403, 'not_held');
      const v = assetView(a);
      pfp = { kind: 'held', mint: v.mint, name: v.name, image: v.image, thumb: v.thumb };
    } else if (b.kind !== null) throw new HttpError(400, 'bad_pfp');
    await env.DB.prepare('UPDATE users SET pfp = ? WHERE id = ?').bind(pfp ? JSON.stringify(pfp) : null, user.id).run();
    return json({ pfp });
  }

  if (m === 'GET' && p === '/v1/wallet/challenge') {
    const pl = { u: user.id, n: hex(randBytes(16)), e: now() + 300 };
    return json({ challenge: await signTok(env, 'wallet', pl), message: walletMessage(env, user.username, pl) });
  }

  if (m === 'POST' && p === '/v1/wallet') {
    const b = await readJson(req);
    const pl = await openTok(env, 'wallet', b.challenge);
    if (!pl || pl.u !== user.id) throw new HttpError(400, 'challenge_expired');
    const pub = solAddr(b.address);
    let sig; try { sig = b64Decode(String(b.signature || '')); } catch { sig = null; }
    if (!sig || sig.length !== 64) throw new HttpError(400, 'bad_signature');
    if (!await edVerify(pub, sig, enc.encode(walletMessage(env, user.username, pl)))) throw new HttpError(400, 'bad_signature');
    const pfp = parsePfp(user.pfp);
    const clear = pfp && pfp.kind === 'held' && user.wallet !== b.address;
    await env.DB.prepare('UPDATE users SET wallet = ?' + (clear ? ', pfp = NULL' : '') + ' WHERE id = ?').bind(b.address, user.id).run();
    return json(await me(env, user.id));
  }

  if (m === 'DELETE' && p === '/v1/wallet') {
    const pfp = parsePfp(user.pfp);
    await env.DB.prepare('UPDATE users SET wallet = NULL' + (pfp && pfp.kind === 'held' ? ', pfp = NULL' : '') + ' WHERE id = ?').bind(user.id).run();
    return json(await me(env, user.id));
  }

  if (m === 'GET' && p === '/v1/holdings') {
    if (!user.wallet) throw new HttpError(400, 'no_wallet');
    const r = await helius(env, 'searchAssets', { ownerAddress: user.wallet, grouping: ['collection', env.COLLECTION], page: 1, limit: 1000 });
    const items = ((r && r.items) || []).filter((a) => !a.burnt && inCollection(env, a)).map(assetView);
    // A PFP set from a Nuddie that has since left the wallet is cleared.
    const pfp = parsePfp(user.pfp);
    let cleared = false;
    if (pfp && pfp.kind === 'held' && !items.some((x) => x.mint === pfp.mint)) {
      await env.DB.prepare('UPDATE users SET pfp = NULL WHERE id = ?').bind(user.id).run(); cleared = true;
    }
    return json({ wallet: user.wallet, items, pfpCleared: cleared });
  }

  throw new HttpError(404, 'not_found');
}

const BASE_HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cross-origin-resource-policy': 'cross-origin',
};

export default {
  async fetch(req, env, ctx) {
    const origin = req.headers.get('origin');
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = {};
    if (origin) {
      if (!allowed.includes(origin)) return new Response(JSON.stringify({ error: 'origin_not_allowed' }), { status: 403, headers: { ...BASE_HEADERS, 'content-type': 'application/json' } });
      Object.assign(cors, { 'access-control-allow-origin': origin, vary: 'Origin',
        'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type', 'access-control-max-age': '86400' });
    }
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...BASE_HEADERS, ...cors } });
    let res;
    try { res = await route(req, env, ctx); }
    catch (e) {
      res = e instanceof HttpError ? json({ error: e.code, ...e.extra }, e.status) : json({ error: 'server_error' }, 500);
      if (e instanceof HttpError && e.extra.retryAfter) res.headers.set('retry-after', String(e.extra.retryAfter));
    }
    for (const [k, v] of Object.entries({ ...BASE_HEADERS, ...cors })) res.headers.set(k, v);
    // Housekeeping on a small share of requests: expired sessions and spent challenges are deleted.
    if (env.DB && Math.random() < 0.03) {
      const t = now();
      ctx.waitUntil(env.DB.batch([
        env.DB.prepare('DELETE FROM sessions WHERE expires < ?').bind(t),
        env.DB.prepare('DELETE FROM pow_used WHERE expires < ?').bind(t),
      ]).catch(() => {}));
    }
    return res;
  },
};
