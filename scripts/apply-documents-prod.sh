#!/usr/bin/env bash
# Apply documents migration to linked Supabase prod via Management API.
# Requires: SUPABASE_ACCESS_TOKEN (Personal Access Token from supabase.com/dashboard/account/tokens)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="${SUPABASE_PROJECT_REF:-xsdkoepwuvpuroijjain}"
SQL_FILE="${ROOT}/scripts/documents-prod-migration-full.sql"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "SUPABASE_ACCESS_TOKEN is required." >&2
  echo "Create one at https://supabase.com/dashboard/account/tokens" >&2
  exit 1
fi

query=$(python3 -c 'import json, pathlib, sys; print(json.dumps({"query": pathlib.Path(sys.argv[1]).read_text()}))' "$SQL_FILE")
http_code=$(curl -sS -o /tmp/supabase-doc-migrate.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "$query" \
  "https://api.supabase.com/v1/projects/${REF}/database/query")

echo "HTTP ${http_code}"
cat /tmp/supabase-doc-migrate.json
echo

if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
  exit 1
fi

verify='{"query":"select column_name from information_schema.columns where table_schema = '\''public'\'' and table_name = '\''profiles'\'' and column_name in ('\''invoice_iban'\'','\''invoice_bic'\'') order by 1;"}'
http_code=$(curl -sS -o /tmp/supabase-doc-verify.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "$verify" \
  "https://api.supabase.com/v1/projects/${REF}/database/query/read-only")
echo "Verify HTTP ${http_code}"
cat /tmp/supabase-doc-verify.json
echo
