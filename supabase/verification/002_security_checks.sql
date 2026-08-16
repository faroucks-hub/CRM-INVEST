-- IME CRM — Vérification non destructive de l'étape 4.
-- À exécuter après 020_security_users_and_rls.sql dans le SQL Editor Supabase.

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname = 'active_user_gate'
    AND permissive = 'RESTRICTIVE';

  IF v_count < 40 THEN
    RAISE EXCEPTION 'RLS incomplet : seulement % politiques active_user_gate', v_count;
  END IF;

  IF HAS_TABLE_PRIVILEGE('authenticated', 'public.activity_logs', 'INSERT')
     OR HAS_TABLE_PRIVILEGE('authenticated', 'public.activity_logs', 'UPDATE')
     OR HAS_TABLE_PRIVILEGE('authenticated', 'public.activity_logs', 'DELETE') THEN
    RAISE EXCEPTION 'Le journal d''activité reste modifiable directement';
  END IF;

  IF HAS_COLUMN_PRIVILEGE(
    'authenticated', 'public.users_profiles', 'role', 'UPDATE'
  ) OR HAS_COLUMN_PRIVILEGE(
    'authenticated', 'public.users_profiles', 'is_active', 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'Les colonnes rôle/statut sont encore modifiables côté client';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'log_activity'
      AND p.prosecdef
      AND 'search_path=public' = ANY(p.proconfig)
  ) THEN
    RAISE EXCEPTION 'log_activity n''est pas durcie correctement';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND c.relname IN (
        'quotations_commercial', 'quotation_items_commercial',
        'products_commercial', 'commercial_performance', 'quotation_stats',
        'dashboard_alerts', 'calc_stats', 'lydie_usage_stats', 'overdue_tasks'
      )
      AND NOT ('security_invoker=true' = ANY(COALESCE(c.reloptions, ARRAY[]::TEXT[])))
  ) THEN
    RAISE EXCEPTION 'Une vue métier n''utilise pas security_invoker';
  END IF;

  RAISE NOTICE 'Étape 4 validée : RLS, profils, audit et vues sécurisés.';
END;
$$;

