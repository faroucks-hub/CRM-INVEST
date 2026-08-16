#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
project_name="$(basename "$project_dir")"
output_path="${1:-$project_dir/../${project_name}_release.zip}"

cd "$(dirname "$project_dir")"

zip -qr "$output_path" "$project_name" \
  -x "$project_name/node_modules/*" \
     "$project_name/.next/*" \
     "$project_name/.env" \
     "$project_name/.env.local" \
     "$project_name/.env.development.local" \
     "$project_name/.env.test.local" \
     "$project_name/.env.production.local" \
     "$project_name/.git/*" \
     "$project_name/backups/*" \
     "$project_name/tmp/*" \
     "$project_name/*.tsbuildinfo"

echo "Archive créée sans secrets ni dépendances locales : $output_path"
