#!/usr/bin/env bash
set -euo pipefail

backup_file="${1:-}"
target_url="${2:-${SUPABASE_DB_URL:-}}"

if [[ "${CONFIRM_RESTORE:-}" != "RESTORE_IME_CRM" ]]; then
  echo "Set CONFIRM_RESTORE=RESTORE_IME_CRM to authorize restoration" >&2
  exit 1
fi
if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
  echo "A valid backup file is required as the first argument" >&2
  exit 1
fi
if [[ -z "$target_url" ]]; then
  echo "Target database URL is required" >&2
  exit 1
fi
if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required (brew install libpq)" >&2
  exit 1
fi

pg_restore \
  --dbname="$target_url" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "$backup_file"

echo "DATABASE_RESTORE_OK"
