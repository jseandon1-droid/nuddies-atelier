#!/usr/bin/env bash
# Deploys the accounts API to Cloudflare. Run by .github/workflows/accounts-api.yml.
# Needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID in the environment; HELIUS_API_KEY optional.
# Idempotent: finds or creates the D1 database, applies the schema (CREATE ... IF NOT EXISTS),
# deploys, sets the PEPPER secret ONLY if it doesn't exist yet (rotating it would break every
# password), and writes the live API address to $API_URL_FILE.
set -euo pipefail
cd "$(dirname "$0")"
WR="${WRANGLER:-npx --yes wrangler@4.149.0}"
DB=nuddies-accounts

find_db() { $WR d1 list --json 2>/dev/null | node -e '
  let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
    let a=[];try{a=JSON.parse(s.slice(s.indexOf("[")))}catch(e){}
    const d=a.find(x=>x.name===process.argv[1]);process.stdout.write(d?(d.uuid||d.id||""):"")})' "$DB"; }

id="$(find_db)"
if [ -z "$id" ]; then
  echo "Creating D1 database $DB…"
  $WR d1 create "$DB" >/dev/null
  id="$(find_db)"
fi
[ -n "$id" ] || { echo "::error::Could not find or create the D1 database. Check the API token has the D1 Edit permission."; exit 1; }
sed -i "s/^database_id = .*/database_id = \"$id\"/" wrangler.toml
echo "D1 database: $DB ($id)"

$WR d1 execute "$DB" --remote --file=schema.sql --yes >/dev/null
echo "Schema applied."

out="$($WR deploy 2>&1)" || { echo "$out"; echo "::error::wrangler deploy failed (see above). If it mentions a workers.dev subdomain, open Cloudflare → Workers & Pages once to pick one, then re-run."; exit 1; }
echo "$out" | grep -v -i 'api-key\|token' || true
url="$(echo "$out" | grep -o 'https://[A-Za-z0-9.-]*\.workers\.dev' | head -1 || true)"
[ -n "$url" ] || { echo "::error::Deployed, but no workers.dev address was printed. Open Cloudflare → Workers & Pages → nuddies-accounts → Settings → Domains & Routes and enable workers.dev, then re-run."; exit 1; }

secrets="$($WR secret list --format json 2>/dev/null || echo '[]')"
if ! echo "$secrets" | grep -q '"PEPPER"'; then
  echo "Setting PEPPER (first deploy only)…"
  node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))' | $WR secret put PEPPER >/dev/null
fi
if [ -n "${HELIUS_API_KEY:-}" ]; then
  printf '%s' "$HELIUS_API_KEY" | $WR secret put HELIUS_API_KEY >/dev/null
  echo "Holdings enabled (Helius key set)."
else
  echo "No HELIUS_API_KEY secret — 'My holdings' stays hidden until one is added."
fi

# Health check: the API must answer and report itself configured.
for i in 1 2 3 4 5 6; do
  if curl -fsS "$url/v1/health" | grep -q '"configured":true'; then ok=1; break; fi
  sleep 5
done
[ "${ok:-}" = 1 ] || { echo "::error::$url/v1/health did not report configured:true"; exit 1; }
echo "Live: $url"
[ -n "${API_URL_FILE:-}" ] && printf '%s' "$url" > "$API_URL_FILE"
exit 0
