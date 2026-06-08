#!/usr/bin/env bash
# One-shot provisioning + deploy for ManjuStudio on Cloudflare.
# Creates D1 / R2 / KV / Queues, patches wrangler.toml with the generated IDs,
# applies migrations, deploys the Worker, then seeds the demo workspace.
#
# Prereqs: `npm i` done, and `npx wrangler login` (or CLOUDFLARE_API_TOKEN set).
set -euo pipefail
cd "$(dirname "$0")"

WR="npx wrangler"
TOML="wrangler.toml"

say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$1"; }
# portable in-place sed (macOS/BSD vs GNU)
sedi() { if sed --version >/dev/null 2>&1; then sed -i "$@"; else sed -i '' "$@"; fi; }

say "1/6 Create D1 database (manju-db)"
D1_OUT=$($WR d1 create manju-db 2>&1 || true)
echo "$D1_OUT"
D1_ID=$(echo "$D1_OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1 || true)
if [ -n "${D1_ID:-}" ]; then sedi "s/REPLACE_WITH_D1_ID/$D1_ID/" "$TOML"; echo "  → database_id = $D1_ID"; else echo "  (D1 may already exist — set database_id in wrangler.toml manually if needed)"; fi

say "2/6 Create R2 bucket (manju-assets)"
$WR r2 bucket create manju-assets || echo "  (bucket may already exist)"

say "3/6 Create KV namespace (SESSIONS)"
KV_OUT=$($WR kv namespace create SESSIONS 2>&1 || true)
echo "$KV_OUT"
KV_ID=$(echo "$KV_OUT" | grep -oE '"?id"?\s*[:=]\s*"?[0-9a-f]{32}' | grep -oE '[0-9a-f]{32}' | head -1 || true)
if [ -n "${KV_ID:-}" ]; then sedi "s/REPLACE_WITH_KV_ID/$KV_ID/" "$TOML"; echo "  → kv id = $KV_ID"; else echo "  (set the KV id in wrangler.toml manually if not patched)"; fi

say "4/6 Create Queue (manju-tasks)"
$WR queues create manju-tasks || echo "  (queue may already exist)"

say "5/6 Secrets — set encryption key (and optionally the 火山 Ark key)"
if ! $WR secret list 2>/dev/null | grep -q CREDENTIAL_ENC_KEY; then
  openssl rand -base64 32 | $WR secret put CREDENTIAL_ENC_KEY || true
fi
echo "  (optional) echo -n 'YOUR_ARK_KEY' | npx wrangler secret put VOLC_ARK_API_KEY"

say "6/6 Build, migrate, deploy, seed"
npm run build
$WR d1 migrations apply manju-db --remote
$WR deploy
URL=$($WR deployments list 2>/dev/null | grep -oE 'https://[a-zA-Z0-9.-]+workers.dev' | head -1 || true)
SEED_KEY=$(grep -oE 'SEED_KEY = "[^"]*"' "$TOML" | sed -E 's/.*"([^"]*)".*/\1/' || echo dev)
if [ -n "${URL:-}" ]; then
  echo "  seeding demo workspace at $URL"
  curl -s -X POST "$URL/api/_seed" -H "x-seed-key: $SEED_KEY" || true
fi

say "Done. App: ${URL:-https://manju-studio.<your-subdomain>.workers.dev}"
echo "If seeding didn't run, POST /api/_seed with header x-seed-key=$SEED_KEY once."
