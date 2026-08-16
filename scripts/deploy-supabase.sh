#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "SUPABASE_PROJECT_REF est requis."
  echo "Exemple : SUPABASE_PROJECT_REF=xxxxxxxxxxxx ./scripts/deploy-supabase.sh"
  exit 1
fi

echo "1/5 — Liaison au projet Supabase"
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "2/5 — Historique local/distant"
npx supabase migration list --linked

echo "3/5 — Simulation des migrations"
npx supabase db push --linked --include-all --dry-run

echo "4/5 — Déploiement des migrations"
npx supabase db push --linked --include-all

echo "5/5 — Nouvel état de l'historique"
npx supabase migration list --linked

echo
echo "Déploiement terminé."
echo "Exécutez ensuite supabase/verification/001_post_deployment_checks.sql"
echo "dans le SQL Editor Supabase."
