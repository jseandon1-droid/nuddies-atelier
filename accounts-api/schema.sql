-- Nuddies Atelier accounts — D1 schema. Idempotent: safe to run on every deploy.
-- Privacy by design: no email, phone, name, IP address, user agent or analytics column exists.
-- Passwords and recovery words never reach the server in readable form: the browser stretches
-- them first (PBKDF2-SHA256, 600k rounds) and the server stores only a peppered HMAC of that.

CREATE TABLE IF NOT EXISTS users (
  id               INTEGER PRIMARY KEY,
  username         TEXT    NOT NULL UNIQUE,         -- public handle, [a-z0-9_]{3,20}
  salt             TEXT    NOT NULL,                -- 16 random bytes, hex
  auth_hash        TEXT    NOT NULL,                -- HMAC(pepper, "auth" | salt | clientAuthKey)
  rec_hash         TEXT    NOT NULL,                -- HMAC(pepper, "rec"  | salt | clientRecoveryKey)
  created_day      TEXT    NOT NULL,                -- YYYY-MM-DD only (no time of day)
  fails            INTEGER NOT NULL DEFAULT 0,      -- consecutive wrong passwords
  locked_until     INTEGER NOT NULL DEFAULT 0,      -- unix seconds
  rec_fails        INTEGER NOT NULL DEFAULT 0,      -- consecutive wrong recovery attempts
  rec_locked_until INTEGER NOT NULL DEFAULT 0,
  wallet           TEXT,                            -- optional, verified Solana address (public data)
  pfp              TEXT                             -- JSON: {"kind":"creation","id":n} | {"kind":"held",...}
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT    PRIMARY KEY,                   -- SHA-256 of the bearer token; the token itself is never stored
  user_id    INTEGER NOT NULL,
  expires    INTEGER NOT NULL                       -- unix seconds
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- One wallet, one account (enforced by the database too, not only the API).
CREATE UNIQUE INDEX IF NOT EXISTS users_wallet ON users(wallet) WHERE wallet IS NOT NULL;

CREATE TABLE IF NOT EXISTS creations (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  combo   TEXT    NOT NULL,                         -- JSON {category: trait file | null}
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS creations_user ON creations(user_id, id);

-- One-time proof-of-work challenges already spent (stops one solved challenge creating many accounts).
CREATE TABLE IF NOT EXISTS pow_used (
  nonce   TEXT    PRIMARY KEY,
  expires INTEGER NOT NULL
);
