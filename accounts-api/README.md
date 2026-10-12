# Atelier accounts API

Cloudflare Worker + D1 behind the Atelier's sign-in (FEATURES.md F-12). Free tier is plenty.

## What it stores — and nothing else
| Data | Form |
|---|---|
| username | as typed, lowercase, public |
| password | never seen; HMAC(pepper, salt, PBKDF2-600k(password)) |
| recovery words | never seen; HMAC(pepper, salt, SHA-256(words)) |
| sign-in day | `YYYY-MM-DD` |
| saved creations | trait file names per category |
| PFP | which creation / which held Nuddie |
| wallet | only if the user verifies one (public on-chain anyway) |

No email, phone, IP address, user agent, cookies, analytics or logs (Workers observability off).

## Security
- Browser stretches the password (PBKDF2-SHA256, 600 000 rounds, per-username salt); the server
  adds a random per-user salt and a secret pepper (HMAC-SHA256). Database alone is useless.
- Sessions: random 256-bit bearer tokens, only their SHA-256 stored, 60-day life.
- 10 wrong passwords → 15-minute lock; 5 wrong recovery attempts → 1-hour lock.
- Sign-up needs a one-time proof-of-work (~1 s on a phone) instead of a CAPTCHA.
- Password change signs out other devices; recovery issues new words and signs out everywhere.
- CORS: browsers may only call it from https://atelier.nuddiesnwo.xyz.
- Wallet verify = Ed25519 signature over a server-built message (no transaction, 5-min expiry).
- Holdings via Helius DAS (`searchAssets`, collection 2n6Dte…ywypm); a PFP from a Nuddie that
  leaves the wallet is cleared.

## Setup (once) — Toshi
1. **Cloudflare account** (free): dash.cloudflare.com/sign-up. Open **Workers & Pages** once and
   pick your workers.dev subdomain if asked.
2. **Account ID**: Workers & Pages overview → right sidebar "Account ID" → copy.
3. **API token**: My Profile → API Tokens → Create Token → template **Edit Cloudflare Workers** →
   *Add more* → **Account · D1 · Edit** → Account Resources: your account → Zone Resources: All
   zones → Continue → Create → copy the token (shown once).
4. **(Optional) Helius key** for "My holdings": dashboard.helius.dev → sign up free → copy API key.
5. **GitHub** → github.com/jseandon1-droid/nuddies-atelier → Settings → Secrets and variables →
   Actions → New repository secret, three times:
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, (optional) `HELIUS_API_KEY`.
6. **Actions** tab → **Deploy accounts API** → Run workflow → main → Run. ~1 minute.
   The workflow creates the database, deploys, generates the pepper (first run only), and
   commits `api-config.json` with the API address — the site turns accounts on by itself.

Adding the Helius key later: add the secret, then run the workflow again.

## Never
- Never rotate or delete the `PEPPER` secret — every password would stop working.
- Never overwrite the site repo's `api-config.json` from the bundle (it holds the live address).

## Local testing
```
npm i -g wrangler@4.149.0      # or any local install
WRANGLER_BIN=$(which wrangler) npm run test:deep          # API end-to-end (AC-1201…1210)
WRANGLER_BIN=$(which wrangler) NODE_PATH=$(npm root -g) npm run audit:accounts   # browser UI, phone + desktop
```
