#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is required" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required (brew install libpq)" >&2
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${IME_BACKUP_DIR:-$(pwd)/backups/database}"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
output="$backup_dir/ime-crm-$timestamp.dump"

pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$output"

chmod 600 "$output"
echo "DATABASE_BACKUP_OK $output"
