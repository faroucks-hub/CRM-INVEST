-- IME CRM — Contrôle post-déploiement Supabase
-- Lecture seule : aucune donnée métier n'est modifiée.

DO $$
DECLARE
  v_missing TEXT;
BEGIN
  SELECT STRING_AGG(required.name, ', ' ORDER BY required.name)
  INTO v_missing
  FROM (
    VALUES
      ('users_profiles'), ('clients'), ('suppliers'), ('opportunities'),
      ('quotations_v2'), ('proformas_v2'), ('projets_v2'), ('paiements'),
      ('website_leads'), ('sales_invoices'), ('payment_transactions'),
      ('supplier_invoices'), ('supplier_payments'), ('project_expenses'),
      ('exchange_rates'), ('project_documents'), ('project_notes'),
      ('project_activity_logs'), ('document_transmittals'),
      ('document_transmittal_items'), ('quotation_templates')
  ) AS required(name)
  WHERE TO_REGCLASS('public.' || required.name) IS NULL;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Tables ou vues absentes : %', v_missing;
  END IF;
END;
$$;

DO $$
DECLARE
  v_missing TEXT;
BEGIN
  SELECT STRING_AGG(required.name, ', ' ORDER BY required.name)
  INTO v_missing
  FROM (
    VALUES
      ('get_sales_report_summary'),
      ('get_sales_report_trend'),
      ('get_receivables_aging'),
      ('get_salesperson_performance'),
      ('get_financial_report_summary'),
      ('get_cash_flow_report'),
      ('get_supplier_debts_aging'),
      ('generate_transmittal_number'),
      ('submit_lead'),
      ('purge_lead')
  ) AS required(name)
  WHERE TO_REGPROCEDURE('public.' || required.name) IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = required.name
    );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Fonctions absentes : %', v_missing;
  END IF;
END;
$$;

DO $$
DECLARE
  v_missing TEXT;
BEGIN
  SELECT STRING_AGG(required.column_name, ', ' ORDER BY required.column_name)
  INTO v_missing
  FROM (
    VALUES
      ('internal_notes'), ('assigned_to'), ('converted_at'),
      ('converted_opportunity_id'), ('deleted_at'), ('deleted_by'),
      ('deleted_reason')
  ) AS required(column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'website_leads'
      AND c.column_name = required.column_name
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Colonnes website_leads absentes : %', v_missing;
  END IF;
END;
$$;

DO $$
DECLARE
  v_missing TEXT;
BEGIN
  SELECT STRING_AGG(required.label, ', ' ORDER BY required.label)
  INTO v_missing
  FROM (
    VALUES ('ups'), ('battery'), ('rectifier'), ('bess'),
           ('inverter'), ('frequency_converter')
  ) AS required(label)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'calc_type'
      AND e.enumlabel = required.label
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Valeurs calc_type absentes : %', v_missing;
  END IF;
END;
$$;

DO $$
DECLARE
  v_without_rls TEXT;
BEGIN
  SELECT STRING_AGG(c.relname, ', ' ORDER BY c.relname)
  INTO v_without_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'users_profiles', 'clients', 'suppliers', 'opportunities',
      'quotations_v2', 'proformas_v2', 'projets_v2', 'paiements',
      'website_leads', 'sales_invoices', 'payment_transactions',
      'supplier_invoices', 'supplier_payments', 'project_expenses',
      'project_documents', 'project_notes', 'project_activity_logs',
      'document_transmittals', 'document_transmittal_items'
    )
    AND c.relkind = 'r'
    AND c.relrowsecurity = false;

  IF v_without_rls IS NOT NULL THEN
    RAISE EXCEPTION 'RLS désactivée sur : %', v_without_rls;
  END IF;
END;
$$;

-- Compilation/exécution des fonctions de reporting avec une période vide.
SELECT * FROM public.get_sales_report_summary(
  CURRENT_DATE, CURRENT_DATE, NULL
) LIMIT 1;
SELECT * FROM public.get_sales_report_trend(
  CURRENT_DATE, CURRENT_DATE, 'month', NULL
) LIMIT 1;
SELECT * FROM public.get_receivables_aging(CURRENT_DATE, NULL) LIMIT 1;
SELECT * FROM public.get_salesperson_performance(
  CURRENT_DATE, CURRENT_DATE, NULL
) LIMIT 1;

SELECT
  'IME CRM migrations validées' AS result,
  COUNT(*) AS public_tables
FROM information_schema.tables
WHERE table_schema = 'public';
