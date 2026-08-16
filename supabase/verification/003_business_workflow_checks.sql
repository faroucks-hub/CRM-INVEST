-- IME CRM — Étape 5 : scénario métier transactionnel.
-- Toutes les données de test sont annulées par ROLLBACK.

BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'e2e-admin@ime.test',
  '{"full_name":"Administrateur E2E"}'
);

UPDATE public.users_profiles
SET role = 'admin'
WHERE id = '10000000-0000-0000-0000-000000000001';

INSERT INTO public.clients (
  id, reference, company_name, country, assigned_to, created_by
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  'E2E-CLIENT', 'Client E2E', 'Türkiye',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.suppliers (
  id, reference, company_name, created_by
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  'E2E-SUPPLIER', 'Fournisseur E2E',
  '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.opportunities (
  id, reference, name, client_id, assigned_to, pipeline_stage,
  estimated_sell, currency, created_by
) VALUES (
  '40000000-0000-0000-0000-000000000001',
  'E2E-OPP', 'Projet industriel E2E',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'offre_preparation', 1500, 'USD',
  '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.quotations_v2 (
  id, number, status, client_id, opportunity_id, assigned_to,
  currency, subtotal, total_sell, created_by
) VALUES
  (
    '50000000-0000-0000-0000-000000000001', 'E2E-Q-1', 'approuvee',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'USD', 1000, 1000, '10000000-0000-0000-0000-000000000001'
  ),
  (
    '50000000-0000-0000-0000-000000000002', 'E2E-Q-2', 'envoyee',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'USD', 500, 500, '10000000-0000-0000-0000-000000000001'
  );

INSERT INTO public.quotation_lines (
  quotation_id, sort_order, designation, quantity,
  unit_price_sell, line_total_sell
) VALUES
  ('50000000-0000-0000-0000-000000000001', 0, 'UPS 10 kVA', 2, 500, 1000),
  ('50000000-0000-0000-0000-000000000002', 0, 'Rectifier', 1, 500, 500);

INSERT INTO public.proformas_v2 (
  id, number, payment_status, client_id, quotation_id, opportunity_id,
  assigned_to, currency, subtotal, total_sell, amount_received,
  balance_due, created_by
) VALUES
  (
    '60000000-0000-0000-0000-000000000001', 'E2E-F-1', 'partiel',
    '20000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'USD', 800, 800, 300, 500,
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '60000000-0000-0000-0000-000000000002', 'E2E-F-2', 'en_attente',
    '20000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'USD', 800, 800, 0, 800,
    '10000000-0000-0000-0000-000000000001'
  );

INSERT INTO public.proforma_lines (
  proforma_id, sort_order, designation, quantity,
  unit_price_sell, line_total_sell
) VALUES
  ('60000000-0000-0000-0000-000000000001', 0, 'UPS 10 kVA', 1, 800, 800),
  ('60000000-0000-0000-0000-000000000002', 0, 'Rectifier', 1, 800, 800);

INSERT INTO public.projets_v2 (
  id, reference, name, client_id, assigned_to, quotation_id, proforma_id,
  status, contract_value, currency, created_by
) VALUES (
  '70000000-0000-0000-0000-000000000001',
  'E2E-PRJ', 'Projet E2E',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'en_cours', 800, 'USD',
  '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.project_workflow_steps (
  project_id, step_key, step_label, step_order
)
SELECT
  '70000000-0000-0000-0000-000000000001',
  'e2e_' || n, 'Étape E2E ' || n, n
FROM generate_series(1, 15) AS n;

INSERT INTO public.paiements (
  id, reference, client_id, project_id, proforma_id, assigned_to,
  total_amount, deposit_expected, deposit_received, balance_remaining,
  currency, status, created_by
) VALUES (
  '80000000-0000-0000-0000-000000000001',
  'E2E-PAY', '20000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  800, 240, 300, 500, 'USD', 'partiel',
  '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.sales_invoices (
  id, reference, client_id, project_id, assigned_to, status,
  issue_date, due_date, currency, subtotal, total_amount, created_by
) VALUES (
  '90000000-0000-0000-0000-000000000001',
  'E2E-INV', '20000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'partiellement_payee', CURRENT_DATE, CURRENT_DATE + 30,
  'USD', 1000, 1000, '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.payment_transactions (
  sales_invoice_id, client_id, project_id, assigned_to,
  amount, currency, transaction_date, is_opening_balance, created_by
) VALUES (
  '90000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  300, 'USD', CURRENT_DATE, false,
  '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.supplier_invoices (
  id, reference, supplier_id, project_id, status, issue_date,
  currency, subtotal, total_amount, created_by
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'E2E-SI', '30000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  'partiellement_payee', CURRENT_DATE, 'USD', 400, 400,
  '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.supplier_payments (
  supplier_id, supplier_invoice_id, project_id, amount,
  currency, payment_date, created_by
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  100, 'USD', CURRENT_DATE,
  '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.project_expenses (
  project_id, category, status, description, amount,
  currency, expense_date, paid_date, created_by
) VALUES (
  '70000000-0000-0000-0000-000000000001',
  'transport', 'payee', 'Transport E2E', 50,
  'USD', CURRENT_DATE, CURRENT_DATE,
  '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.project_documents (
  id, project_id, uploaded_by, file_name, file_path,
  document_type, document_group, revision, document_status
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'SLD-E2E.pdf', 'projects/e2e/SLD-E2E.pdf',
  'sld', 'single-line-diagram', 1, 'approved'
);

INSERT INTO public.document_transmittals (
  id, project_id, client_id, transmittal_number, subject,
  client_name, status, generated_by
) VALUES (
  'c0000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'E2E-TR-1', 'Transmission SLD',
  'Client E2E', 'draft',
  '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.document_transmittal_items (
  transmittal_id, project_document_id, file_name,
  document_type, revision, document_status, file_path
) VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'SLD-E2E.pdf', 'sld', 1, 'approved', 'projects/e2e/SLD-E2E.pdf'
);

DO $$
DECLARE
  v_stats RECORD;
  v_sales RECORD;
  v_finance RECORD;
BEGIN
  IF (SELECT COUNT(*) FROM public.project_workflow_steps
      WHERE project_id = '70000000-0000-0000-0000-000000000001') <> 15 THEN
    RAISE EXCEPTION 'Le projet ne contient pas les 15 étapes attendues';
  END IF;

  IF (SELECT balance_remaining FROM public.paiements
      WHERE id = '80000000-0000-0000-0000-000000000001') <> 500 THEN
    RAISE EXCEPTION 'Solde du dossier de paiement incorrect';
  END IF;

  IF (SELECT COUNT(*) FROM public.document_transmittal_items
      WHERE transmittal_id = 'c0000000-0000-0000-0000-000000000001'
        AND project_document_id = 'b0000000-0000-0000-0000-000000000001') <> 1 THEN
    RAISE EXCEPTION 'Le document projet n’est pas rattaché au transmittal';
  END IF;

  SELECT * INTO v_stats
  FROM public.quotation_stats
  WHERE user_id = '10000000-0000-0000-0000-000000000001'
    AND currency = 'USD';
  IF v_stats.total_quotations <> 2
     OR v_stats.total_amount <> 1500
     OR v_stats.total_proformas <> 2
     OR v_stats.proforma_amount <> 1600 THEN
    RAISE EXCEPTION 'Agrégation commerciale incorrecte : %', ROW_TO_JSON(v_stats);
  END IF;

  SELECT * INTO v_sales
  FROM public.get_sales_report_summary(CURRENT_DATE, CURRENT_DATE, 'USD');
  IF v_sales.invoiced_amount <> 1000
     OR v_sales.collected_amount <> 300
     OR v_sales.outstanding_amount <> 700 THEN
    RAISE EXCEPTION 'Synthèse des ventes incorrecte : %', ROW_TO_JSON(v_sales);
  END IF;

  SELECT * INTO v_finance
  FROM public.get_financial_report_summary(CURRENT_DATE, CURRENT_DATE, 'USD');
  IF v_finance.invoiced_sales <> 1000
     OR v_finance.customer_cash_in <> 300
     OR v_finance.supplier_invoices <> 400
     OR v_finance.supplier_cash_out <> 100
     OR v_finance.project_expenses_paid <> 50
     OR v_finance.net_cash_flow <> 150 THEN
    RAISE EXCEPTION 'Bilan financier incorrect : %', ROW_TO_JSON(v_finance);
  END IF;

  IF public.get_exchange_rate('USD', 'USD', CURRENT_DATE) <> 1 THEN
    RAISE EXCEPTION 'Taux identité USD incorrect';
  END IF;

  IF public.get_exchange_rate('EUR', 'USD', CURRENT_DATE) IS NOT NULL THEN
    RAISE EXCEPTION 'Une conversion EUR/USD ne doit jamais être inventée';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'doc_type'
      AND e.enumlabel IN ('delivery_note', 'transmittal')
    GROUP BY t.oid
    HAVING COUNT(*) = 2
  ) THEN
    RAISE EXCEPTION 'Types documentaires d’archivage incomplets';
  END IF;

  RAISE NOTICE 'Étape 5 validée : parcours commercial, projet et financier.';
END;
$$;

ROLLBACK;
