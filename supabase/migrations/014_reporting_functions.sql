-- ============================================================================
-- 014_reporting_functions.sql
-- IME CRM — Rapports & Performance — Étape 4/7
-- Fonctions SQL de reporting, sans interface, graphique ni export.
--
-- Principes :
--   - aucune somme entre devises différentes ;
--   - bornes de dates inclusives ;
--   - fonctions SECURITY INVOKER : les RLS de l'étape 3 restent applicables ;
--   - coûts, trésorerie et dettes fournisseurs restent réservés à l'admin ;
--   - transactions annulées et documents annulés sont exclus.
-- ============================================================================

-- ── 1. Synthèse ventes / encaissements / créances ───────────────────────────

CREATE OR REPLACE FUNCTION public.get_sales_report_summary(
  p_start_date DATE,
  p_end_date   DATE,
  p_currency   TEXT DEFAULT NULL
)
RETURNS TABLE (
  currency               TEXT,
  invoice_count          BIGINT,
  invoiced_amount        NUMERIC,
  collected_amount       NUMERIC,
  refunded_amount        NUMERIC,
  net_collected_amount   NUMERIC,
  outstanding_amount     NUMERIC,
  overdue_amount         NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH invoice_payments AS (
    SELECT
      t.sales_invoice_id,
      t.currency,
      COALESCE(SUM(
        CASE t.transaction_type
          WHEN 'encaissement' THEN t.amount
          WHEN 'remboursement' THEN -t.amount
        END
      ), 0) AS net_paid
    FROM public.payment_transactions t
    WHERE t.voided_at IS NULL
      AND t.sales_invoice_id IS NOT NULL
    GROUP BY t.sales_invoice_id, t.currency
  ),
  invoices AS (
    SELECT
      i.currency,
      COUNT(*) AS invoice_count,
      COALESCE(SUM(i.total_amount), 0) AS invoiced_amount,
      COALESCE(SUM(
        GREATEST(i.total_amount - COALESCE(ip.net_paid, 0), 0)
      ), 0) AS outstanding_amount,
      COALESCE(SUM(
        CASE
          WHEN i.due_date < CURRENT_DATE
            THEN GREATEST(i.total_amount - COALESCE(ip.net_paid, 0), 0)
          ELSE 0
        END
      ), 0) AS overdue_amount
    FROM public.sales_invoices i
    LEFT JOIN invoice_payments ip
      ON ip.sales_invoice_id = i.id
     AND UPPER(ip.currency) = UPPER(i.currency)
    WHERE i.status <> 'annulee'
      AND i.issue_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(i.currency) = UPPER(p_currency))
    GROUP BY i.currency
  ),
  legacy_payments AS (
    SELECT
      p.currency,
      COALESCE(SUM(
        GREATEST(p.total_amount - COALESCE(pt.net_paid, 0), 0)
      ), 0) AS outstanding_amount,
      COALESCE(SUM(
        CASE
          WHEN p.due_date < CURRENT_DATE
            THEN GREATEST(p.total_amount - COALESCE(pt.net_paid, 0), 0)
          ELSE 0
        END
      ), 0) AS overdue_amount
    FROM public.paiements p
    LEFT JOIN (
      SELECT
        t.payment_id,
        t.currency,
        COALESCE(SUM(
          CASE t.transaction_type
            WHEN 'encaissement' THEN t.amount
            WHEN 'remboursement' THEN -t.amount
          END
        ), 0) AS net_paid
      FROM public.payment_transactions t
      WHERE t.voided_at IS NULL
        AND t.payment_id IS NOT NULL
        AND t.sales_invoice_id IS NULL
      GROUP BY t.payment_id, t.currency
    ) pt
      ON pt.payment_id = p.id
     AND UPPER(pt.currency) = UPPER(p.currency)
    WHERE p.status <> 'annule'
      AND p.created_at::DATE <= p_end_date
      AND (p_currency IS NULL OR UPPER(p.currency) = UPPER(p_currency))
      AND NOT EXISTS (
        SELECT 1
        FROM public.payment_transactions linked
        WHERE linked.payment_id = p.id
          AND linked.sales_invoice_id IS NOT NULL
          AND linked.voided_at IS NULL
      )
    GROUP BY p.currency
  ),
  receipts AS (
    SELECT
      t.currency,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.transaction_type = 'encaissement'
      ), 0) AS collected_amount,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.transaction_type = 'remboursement'
      ), 0) AS refunded_amount
    FROM public.payment_transactions t
    WHERE t.voided_at IS NULL
      AND t.transaction_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(t.currency) = UPPER(p_currency))
    GROUP BY t.currency
  ),
  currencies AS (
    SELECT i.currency FROM invoices i
    UNION
    SELECT l.currency FROM legacy_payments l
    UNION
    SELECT r.currency FROM receipts r
  )
  SELECT
    c.currency,
    COALESCE(i.invoice_count, 0)::BIGINT,
    COALESCE(i.invoiced_amount, 0)::NUMERIC,
    COALESCE(r.collected_amount, 0)::NUMERIC,
    COALESCE(r.refunded_amount, 0)::NUMERIC,
    (
      COALESCE(r.collected_amount, 0) - COALESCE(r.refunded_amount, 0)
    )::NUMERIC,
    (
      COALESCE(i.outstanding_amount, 0)
      + COALESCE(l.outstanding_amount, 0)
    )::NUMERIC,
    (
      COALESCE(i.overdue_amount, 0)
      + COALESCE(l.overdue_amount, 0)
    )::NUMERIC
  FROM currencies c
  LEFT JOIN invoices i ON i.currency = c.currency
  LEFT JOIN legacy_payments l ON l.currency = c.currency
  LEFT JOIN receipts r ON r.currency = c.currency
  WHERE p_start_date <= p_end_date
  ORDER BY c.currency;
$$;

-- ── 2. Courbe des ventes et encaissements ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_sales_report_trend(
  p_start_date DATE,
  p_end_date   DATE,
  p_period     TEXT DEFAULT 'month',
  p_currency   TEXT DEFAULT NULL
)
RETURNS TABLE (
  period_start          DATE,
  currency              TEXT,
  invoice_count         BIGINT,
  invoiced_amount       NUMERIC,
  collected_amount      NUMERIC,
  refunded_amount       NUMERIC,
  net_collected_amount  NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH invoices AS (
    SELECT
      DATE_TRUNC(
        CASE
          WHEN LOWER(p_period) IN ('day', 'week', 'month', 'quarter', 'year')
            THEN LOWER(p_period)
          ELSE 'month'
        END,
        i.issue_date
      )::DATE AS period_start,
      i.currency,
      COUNT(*) AS invoice_count,
      COALESCE(SUM(i.total_amount), 0) AS invoiced_amount
    FROM public.sales_invoices i
    WHERE i.status <> 'annulee'
      AND i.issue_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(i.currency) = UPPER(p_currency))
    GROUP BY 1, i.currency
  ),
  receipts AS (
    SELECT
      DATE_TRUNC(
        CASE
          WHEN LOWER(p_period) IN ('day', 'week', 'month', 'quarter', 'year')
            THEN LOWER(p_period)
          ELSE 'month'
        END,
        t.transaction_date
      )::DATE AS period_start,
      t.currency,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.transaction_type = 'encaissement'
      ), 0) AS collected_amount,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.transaction_type = 'remboursement'
      ), 0) AS refunded_amount
    FROM public.payment_transactions t
    WHERE t.voided_at IS NULL
      AND t.transaction_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(t.currency) = UPPER(p_currency))
    GROUP BY 1, t.currency
  ),
  keys AS (
    SELECT i.period_start, i.currency FROM invoices i
    UNION
    SELECT r.period_start, r.currency FROM receipts r
  )
  SELECT
    k.period_start,
    k.currency,
    COALESCE(i.invoice_count, 0)::BIGINT,
    COALESCE(i.invoiced_amount, 0)::NUMERIC,
    COALESCE(r.collected_amount, 0)::NUMERIC,
    COALESCE(r.refunded_amount, 0)::NUMERIC,
    (
      COALESCE(r.collected_amount, 0) - COALESCE(r.refunded_amount, 0)
    )::NUMERIC
  FROM keys k
  LEFT JOIN invoices i
    ON i.period_start = k.period_start AND i.currency = k.currency
  LEFT JOIN receipts r
    ON r.period_start = k.period_start AND r.currency = k.currency
  WHERE p_start_date <= p_end_date
  ORDER BY k.period_start, k.currency;
$$;

-- ── 3. Vieillissement des créances clients ──────────────────────────────────
-- Les dossiers historiques de public.paiements restent inclus tant qu'ils ne
-- sont pas explicitement reliés à une facture client par une transaction.

CREATE OR REPLACE FUNCTION public.get_receivables_aging(
  p_as_of_date DATE DEFAULT CURRENT_DATE,
  p_currency   TEXT DEFAULT NULL
)
RETURNS TABLE (
  source_type       TEXT,
  source_id         UUID,
  reference         TEXT,
  client_id         UUID,
  client_name       TEXT,
  assigned_to       UUID,
  salesperson_name  TEXT,
  currency          TEXT,
  due_date          DATE,
  original_amount   NUMERIC,
  paid_amount       NUMERIC,
  outstanding       NUMERIC,
  days_overdue      INTEGER,
  aging_bucket      TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH invoice_transaction_totals AS (
    SELECT
      t.sales_invoice_id,
      t.currency,
      COALESCE(SUM(
        CASE t.transaction_type
          WHEN 'encaissement' THEN t.amount
          WHEN 'remboursement' THEN -t.amount
        END
      ), 0) AS paid_amount
    FROM public.payment_transactions t
    WHERE t.voided_at IS NULL
      AND t.transaction_date <= p_as_of_date
      AND t.sales_invoice_id IS NOT NULL
    GROUP BY t.sales_invoice_id, t.currency
  ),
  legacy_transaction_totals AS (
    SELECT
      t.payment_id,
      t.currency,
      COALESCE(SUM(
        CASE t.transaction_type
          WHEN 'encaissement' THEN t.amount
          WHEN 'remboursement' THEN -t.amount
        END
      ), 0) AS paid_amount
    FROM public.payment_transactions t
    WHERE t.voided_at IS NULL
      AND t.transaction_date <= p_as_of_date
      AND t.payment_id IS NOT NULL
      AND t.sales_invoice_id IS NULL
    GROUP BY t.payment_id, t.currency
  ),
  invoice_rows AS (
    SELECT
      'sales_invoice'::TEXT AS source_type,
      i.id AS source_id,
      i.reference,
      i.client_id,
      c.company_name AS client_name,
      i.assigned_to,
      u.full_name AS salesperson_name,
      i.currency,
      i.due_date,
      i.total_amount AS original_amount,
      COALESCE(tt.paid_amount, 0) AS paid_amount
    FROM public.sales_invoices i
    JOIN public.clients c ON c.id = i.client_id
    LEFT JOIN public.users_profiles u ON u.id = i.assigned_to
    LEFT JOIN invoice_transaction_totals tt
      ON tt.sales_invoice_id = i.id
     AND UPPER(tt.currency) = UPPER(i.currency)
    WHERE i.status <> 'annulee'
      AND i.issue_date <= p_as_of_date
      AND (p_currency IS NULL OR UPPER(i.currency) = UPPER(p_currency))
  ),
  legacy_rows AS (
    SELECT
      'legacy_payment'::TEXT AS source_type,
      p.id AS source_id,
      p.reference,
      p.client_id,
      c.company_name AS client_name,
      p.assigned_to,
      u.full_name AS salesperson_name,
      p.currency,
      p.due_date,
      p.total_amount AS original_amount,
      COALESCE(tt.paid_amount, 0) AS paid_amount
    FROM public.paiements p
    JOIN public.clients c ON c.id = p.client_id
    LEFT JOIN public.users_profiles u ON u.id = p.assigned_to
    LEFT JOIN legacy_transaction_totals tt
      ON tt.payment_id = p.id
     AND UPPER(tt.currency) = UPPER(p.currency)
    WHERE p.status <> 'annule'
      AND p.created_at::DATE <= p_as_of_date
      AND (p_currency IS NULL OR UPPER(p.currency) = UPPER(p_currency))
      AND NOT EXISTS (
        SELECT 1
        FROM public.payment_transactions linked
        WHERE linked.payment_id = p.id
          AND linked.sales_invoice_id IS NOT NULL
          AND linked.voided_at IS NULL
      )
  ),
  receivables AS (
    SELECT * FROM invoice_rows
    UNION ALL
    SELECT * FROM legacy_rows
  )
  SELECT
    r.source_type,
    r.source_id,
    r.reference,
    r.client_id,
    r.client_name,
    r.assigned_to,
    r.salesperson_name,
    r.currency,
    r.due_date,
    r.original_amount::NUMERIC,
    r.paid_amount::NUMERIC,
    GREATEST(r.original_amount - r.paid_amount, 0)::NUMERIC AS outstanding,
    CASE
      WHEN r.due_date IS NULL OR r.due_date >= p_as_of_date THEN 0
      ELSE (p_as_of_date - r.due_date)::INTEGER
    END AS days_overdue,
    CASE
      WHEN r.due_date IS NULL OR r.due_date >= p_as_of_date THEN 'non_echue'
      WHEN p_as_of_date - r.due_date <= 30 THEN '1_30'
      WHEN p_as_of_date - r.due_date <= 60 THEN '31_60'
      WHEN p_as_of_date - r.due_date <= 90 THEN '61_90'
      ELSE 'plus_90'
    END AS aging_bucket
  FROM receivables r
  WHERE GREATEST(r.original_amount - r.paid_amount, 0) > 0
  ORDER BY r.due_date NULLS LAST, r.client_name, r.reference;
$$;

-- ── 4. Performance des vendeurs ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_salesperson_performance(
  p_start_date DATE,
  p_end_date   DATE,
  p_currency   TEXT DEFAULT NULL
)
RETURNS TABLE (
  salesperson_id          UUID,
  salesperson_name        TEXT,
  currency                TEXT,
  quotation_count         BIGINT,
  approved_quotation_count BIGINT,
  quotation_conversion_pct NUMERIC,
  approved_quotation_amount NUMERIC,
  project_count           BIGINT,
  contract_amount         NUMERIC,
  invoice_count           BIGINT,
  invoiced_amount         NUMERIC,
  net_collected_amount    NUMERIC,
  outstanding_amount      NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH quotations AS (
    SELECT
      q.assigned_to AS user_id,
      q.currency,
      COUNT(*) AS quotation_count,
      COUNT(*) FILTER (WHERE q.status = 'approuvee') AS approved_count,
      COALESCE(SUM(q.total_sell) FILTER (
        WHERE q.status = 'approuvee'
      ), 0) AS approved_amount
    FROM public.quotations_v2 q
    WHERE q.assigned_to IS NOT NULL
      AND q.issued_date BETWEEN p_start_date AND p_end_date
      AND q.status <> 'annulee'
      AND (p_currency IS NULL OR UPPER(q.currency) = UPPER(p_currency))
    GROUP BY q.assigned_to, q.currency
  ),
  projects AS (
    SELECT
      p.assigned_to AS user_id,
      p.currency,
      COUNT(*) FILTER (WHERE p.status <> 'annule') AS project_count,
      COALESCE(SUM(p.contract_value) FILTER (
        WHERE p.status <> 'annule'
      ), 0) AS contract_amount
    FROM public.projets_v2 p
    WHERE p.assigned_to IS NOT NULL
      AND p.order_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(p.currency) = UPPER(p_currency))
    GROUP BY p.assigned_to, p.currency
  ),
  invoice_payments AS (
    SELECT
      t.sales_invoice_id,
      t.currency,
      COALESCE(SUM(
        CASE t.transaction_type
          WHEN 'encaissement' THEN t.amount
          WHEN 'remboursement' THEN -t.amount
        END
      ), 0) AS net_paid
    FROM public.payment_transactions t
    WHERE t.voided_at IS NULL
      AND t.sales_invoice_id IS NOT NULL
      AND t.transaction_date <= p_end_date
    GROUP BY t.sales_invoice_id, t.currency
  ),
  invoices AS (
    SELECT
      i.assigned_to AS user_id,
      i.currency,
      COUNT(*) AS invoice_count,
      COALESCE(SUM(i.total_amount), 0) AS invoiced_amount,
      COALESCE(SUM(
        GREATEST(i.total_amount - COALESCE(ip.net_paid, 0), 0)
      ), 0) AS outstanding_amount
    FROM public.sales_invoices i
    LEFT JOIN invoice_payments ip
      ON ip.sales_invoice_id = i.id
     AND UPPER(ip.currency) = UPPER(i.currency)
    WHERE i.assigned_to IS NOT NULL
      AND i.status <> 'annulee'
      AND i.issue_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(i.currency) = UPPER(p_currency))
    GROUP BY i.assigned_to, i.currency
  ),
  receipts AS (
    SELECT
      t.assigned_to AS user_id,
      t.currency,
      COALESCE(SUM(
        CASE t.transaction_type
          WHEN 'encaissement' THEN t.amount
          WHEN 'remboursement' THEN -t.amount
        END
      ), 0) AS net_collected
    FROM public.payment_transactions t
    WHERE t.assigned_to IS NOT NULL
      AND t.voided_at IS NULL
      AND t.transaction_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(t.currency) = UPPER(p_currency))
    GROUP BY t.assigned_to, t.currency
  ),
  keys AS (
    SELECT q.user_id, q.currency FROM quotations q
    UNION
    SELECT p.user_id, p.currency FROM projects p
    UNION
    SELECT i.user_id, i.currency FROM invoices i
    UNION
    SELECT r.user_id, r.currency FROM receipts r
  )
  SELECT
    k.user_id,
    u.full_name,
    k.currency,
    COALESCE(q.quotation_count, 0)::BIGINT,
    COALESCE(q.approved_count, 0)::BIGINT,
    CASE
      WHEN COALESCE(q.quotation_count, 0) > 0
        THEN ROUND(q.approved_count::NUMERIC / q.quotation_count * 100, 1)
      ELSE 0
    END::NUMERIC,
    COALESCE(q.approved_amount, 0)::NUMERIC,
    COALESCE(p.project_count, 0)::BIGINT,
    COALESCE(p.contract_amount, 0)::NUMERIC,
    COALESCE(i.invoice_count, 0)::BIGINT,
    COALESCE(i.invoiced_amount, 0)::NUMERIC,
    COALESCE(r.net_collected, 0)::NUMERIC,
    COALESCE(i.outstanding_amount, 0)::NUMERIC
  FROM keys k
  JOIN public.users_profiles u ON u.id = k.user_id
  LEFT JOIN quotations q
    ON q.user_id = k.user_id AND q.currency = k.currency
  LEFT JOIN projects p
    ON p.user_id = k.user_id AND p.currency = k.currency
  LEFT JOIN invoices i
    ON i.user_id = k.user_id AND i.currency = k.currency
  LEFT JOIN receipts r
    ON r.user_id = k.user_id AND r.currency = k.currency
  WHERE p_start_date <= p_end_date
  ORDER BY u.full_name, k.currency;
$$;

-- ── 5. Bilan financier — administrateur uniquement ──────────────────────────

CREATE OR REPLACE FUNCTION public.get_financial_report_summary(
  p_start_date DATE,
  p_end_date   DATE,
  p_currency   TEXT DEFAULT NULL
)
RETURNS TABLE (
  currency                   TEXT,
  invoiced_sales             NUMERIC,
  customer_cash_in           NUMERIC,
  supplier_invoices          NUMERIC,
  supplier_cash_out          NUMERIC,
  project_expenses_committed NUMERIC,
  project_expenses_paid      NUMERIC,
  estimated_operating_result NUMERIC,
  net_cash_flow              NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH sales AS (
    SELECT i.currency, COALESCE(SUM(i.total_amount), 0) AS amount
    FROM public.sales_invoices i
    WHERE public.is_admin()
      AND i.status <> 'annulee'
      AND i.issue_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(i.currency) = UPPER(p_currency))
    GROUP BY i.currency
  ),
  customer_cash AS (
    SELECT
      t.currency,
      COALESCE(SUM(
        CASE t.transaction_type
          WHEN 'encaissement' THEN t.amount
          WHEN 'remboursement' THEN -t.amount
        END
      ), 0) AS amount
    FROM public.payment_transactions t
    WHERE public.is_admin()
      AND t.voided_at IS NULL
      AND t.transaction_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(t.currency) = UPPER(p_currency))
    GROUP BY t.currency
  ),
  purchases AS (
    SELECT i.currency, COALESCE(SUM(i.total_amount), 0) AS amount
    FROM public.supplier_invoices i
    WHERE public.is_admin()
      AND i.status <> 'annulee'
      AND i.issue_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(i.currency) = UPPER(p_currency))
    GROUP BY i.currency
  ),
  supplier_cash AS (
    SELECT
      p.currency,
      COALESCE(SUM(
        CASE p.transaction_type
          WHEN 'paiement' THEN p.amount
          WHEN 'remboursement' THEN -p.amount
        END
      ), 0) AS amount
    FROM public.supplier_payments p
    WHERE public.is_admin()
      AND p.voided_at IS NULL
      AND p.payment_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(p.currency) = UPPER(p_currency))
    GROUP BY p.currency
  ),
  expenses_committed AS (
    SELECT
      e.currency,
      COALESCE(SUM(e.amount) FILTER (
        WHERE e.status IN ('engagee', 'payee')
      ), 0) AS amount
    FROM public.project_expenses e
    WHERE public.is_admin()
      AND e.status <> 'annulee'
      AND e.expense_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(e.currency) = UPPER(p_currency))
    GROUP BY e.currency
  ),
  expense_cash AS (
    SELECT e.currency, COALESCE(SUM(e.amount), 0) AS amount
    FROM public.project_expenses e
    WHERE public.is_admin()
      AND e.status = 'payee'
      AND e.paid_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(e.currency) = UPPER(p_currency))
    GROUP BY e.currency
  ),
  currencies AS (
    SELECT s.currency FROM sales s
    UNION SELECT c.currency FROM customer_cash c
    UNION SELECT p.currency FROM purchases p
    UNION SELECT sc.currency FROM supplier_cash sc
    UNION SELECT e.currency FROM expenses_committed e
    UNION SELECT ec.currency FROM expense_cash ec
  )
  SELECT
    k.currency,
    COALESCE(s.amount, 0)::NUMERIC,
    COALESCE(c.amount, 0)::NUMERIC,
    COALESCE(p.amount, 0)::NUMERIC,
    COALESCE(sc.amount, 0)::NUMERIC,
    COALESCE(e.amount, 0)::NUMERIC,
    COALESCE(ec.amount, 0)::NUMERIC,
    (
      COALESCE(s.amount, 0)
      - COALESCE(p.amount, 0)
      - COALESCE(e.amount, 0)
    )::NUMERIC,
    (
      COALESCE(c.amount, 0)
      - COALESCE(sc.amount, 0)
      - COALESCE(ec.amount, 0)
    )::NUMERIC
  FROM currencies k
  LEFT JOIN sales s ON s.currency = k.currency
  LEFT JOIN customer_cash c ON c.currency = k.currency
  LEFT JOIN purchases p ON p.currency = k.currency
  LEFT JOIN supplier_cash sc ON sc.currency = k.currency
  LEFT JOIN expenses_committed e ON e.currency = k.currency
  LEFT JOIN expense_cash ec ON ec.currency = k.currency
  WHERE public.is_admin()
    AND p_start_date <= p_end_date
  ORDER BY k.currency;
$$;

-- ── 6. Courbe des flux de trésorerie — administrateur uniquement ─────────────

CREATE OR REPLACE FUNCTION public.get_cash_flow_report(
  p_start_date DATE,
  p_end_date   DATE,
  p_period     TEXT DEFAULT 'month',
  p_currency   TEXT DEFAULT NULL
)
RETURNS TABLE (
  period_start  DATE,
  currency      TEXT,
  cash_in       NUMERIC,
  supplier_out  NUMERIC,
  expense_out   NUMERIC,
  net_cash_flow NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH customer_cash AS (
    SELECT
      DATE_TRUNC(
        CASE
          WHEN LOWER(p_period) IN ('day', 'week', 'month', 'quarter', 'year')
            THEN LOWER(p_period)
          ELSE 'month'
        END,
        t.transaction_date
      )::DATE AS period_start,
      t.currency,
      COALESCE(SUM(
        CASE t.transaction_type
          WHEN 'encaissement' THEN t.amount
          WHEN 'remboursement' THEN -t.amount
        END
      ), 0) AS amount
    FROM public.payment_transactions t
    WHERE public.is_admin()
      AND t.voided_at IS NULL
      AND t.transaction_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(t.currency) = UPPER(p_currency))
    GROUP BY 1, t.currency
  ),
  supplier_cash AS (
    SELECT
      DATE_TRUNC(
        CASE
          WHEN LOWER(p_period) IN ('day', 'week', 'month', 'quarter', 'year')
            THEN LOWER(p_period)
          ELSE 'month'
        END,
        p.payment_date
      )::DATE AS period_start,
      p.currency,
      COALESCE(SUM(
        CASE p.transaction_type
          WHEN 'paiement' THEN p.amount
          WHEN 'remboursement' THEN -p.amount
        END
      ), 0) AS amount
    FROM public.supplier_payments p
    WHERE public.is_admin()
      AND p.voided_at IS NULL
      AND p.payment_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(p.currency) = UPPER(p_currency))
    GROUP BY 1, p.currency
  ),
  expense_cash AS (
    SELECT
      DATE_TRUNC(
        CASE
          WHEN LOWER(p_period) IN ('day', 'week', 'month', 'quarter', 'year')
            THEN LOWER(p_period)
          ELSE 'month'
        END,
        e.paid_date
      )::DATE AS period_start,
      e.currency,
      COALESCE(SUM(e.amount), 0) AS amount
    FROM public.project_expenses e
    WHERE public.is_admin()
      AND e.status = 'payee'
      AND e.paid_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR UPPER(e.currency) = UPPER(p_currency))
    GROUP BY 1, e.currency
  ),
  keys AS (
    SELECT c.period_start, c.currency FROM customer_cash c
    UNION SELECT s.period_start, s.currency FROM supplier_cash s
    UNION SELECT e.period_start, e.currency FROM expense_cash e
  )
  SELECT
    k.period_start,
    k.currency,
    COALESCE(c.amount, 0)::NUMERIC,
    COALESCE(s.amount, 0)::NUMERIC,
    COALESCE(e.amount, 0)::NUMERIC,
    (
      COALESCE(c.amount, 0)
      - COALESCE(s.amount, 0)
      - COALESCE(e.amount, 0)
    )::NUMERIC
  FROM keys k
  LEFT JOIN customer_cash c
    ON c.period_start = k.period_start AND c.currency = k.currency
  LEFT JOIN supplier_cash s
    ON s.period_start = k.period_start AND s.currency = k.currency
  LEFT JOIN expense_cash e
    ON e.period_start = k.period_start AND e.currency = k.currency
  WHERE public.is_admin()
    AND p_start_date <= p_end_date
  ORDER BY k.period_start, k.currency;
$$;

-- ── 7. Vieillissement des dettes fournisseurs — admin uniquement ────────────

CREATE OR REPLACE FUNCTION public.get_supplier_debts_aging(
  p_as_of_date DATE DEFAULT CURRENT_DATE,
  p_currency   TEXT DEFAULT NULL
)
RETURNS TABLE (
  invoice_id       UUID,
  reference        TEXT,
  supplier_id      UUID,
  supplier_name    TEXT,
  project_id       UUID,
  currency         TEXT,
  due_date         DATE,
  original_amount  NUMERIC,
  paid_amount      NUMERIC,
  outstanding      NUMERIC,
  days_overdue     INTEGER,
  aging_bucket     TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH paid AS (
    SELECT
      p.supplier_invoice_id,
      p.currency,
      COALESCE(SUM(
        CASE p.transaction_type
          WHEN 'paiement' THEN p.amount
          WHEN 'remboursement' THEN -p.amount
        END
      ), 0) AS paid_amount
    FROM public.supplier_payments p
    WHERE public.is_admin()
      AND p.voided_at IS NULL
      AND p.payment_date <= p_as_of_date
      AND p.supplier_invoice_id IS NOT NULL
    GROUP BY p.supplier_invoice_id, p.currency
  ),
  debts AS (
    SELECT
      i.id,
      i.reference,
      i.supplier_id,
      s.company_name AS supplier_name,
      i.project_id,
      i.currency,
      i.due_date,
      i.total_amount AS original_amount,
      COALESCE(p.paid_amount, 0) AS paid_amount
    FROM public.supplier_invoices i
    JOIN public.suppliers s ON s.id = i.supplier_id
    LEFT JOIN paid p
      ON p.supplier_invoice_id = i.id
     AND UPPER(p.currency) = UPPER(i.currency)
    WHERE public.is_admin()
      AND i.status <> 'annulee'
      AND i.issue_date <= p_as_of_date
      AND (p_currency IS NULL OR UPPER(i.currency) = UPPER(p_currency))
  )
  SELECT
    d.id,
    d.reference,
    d.supplier_id,
    d.supplier_name,
    d.project_id,
    d.currency,
    d.due_date,
    d.original_amount::NUMERIC,
    d.paid_amount::NUMERIC,
    GREATEST(d.original_amount - d.paid_amount, 0)::NUMERIC,
    CASE
      WHEN d.due_date IS NULL OR d.due_date >= p_as_of_date THEN 0
      ELSE (p_as_of_date - d.due_date)::INTEGER
    END,
    CASE
      WHEN d.due_date IS NULL OR d.due_date >= p_as_of_date THEN 'non_echue'
      WHEN p_as_of_date - d.due_date <= 30 THEN '1_30'
      WHEN p_as_of_date - d.due_date <= 60 THEN '31_60'
      WHEN p_as_of_date - d.due_date <= 90 THEN '61_90'
      ELSE 'plus_90'
    END
  FROM debts d
  WHERE public.is_admin()
    AND GREATEST(d.original_amount - d.paid_amount, 0) > 0
  ORDER BY d.due_date NULLS LAST, d.supplier_name, d.reference;
$$;

-- ── Droits d'exécution ───────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.get_sales_report_summary(DATE, DATE, TEXT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sales_report_trend(DATE, DATE, TEXT, TEXT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_receivables_aging(DATE, TEXT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_salesperson_performance(DATE, DATE, TEXT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_financial_report_summary(DATE, DATE, TEXT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_cash_flow_report(DATE, DATE, TEXT, TEXT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_supplier_debts_aging(DATE, TEXT)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_sales_report_summary(DATE, DATE, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_report_trend(DATE, DATE, TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_receivables_aging(DATE, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_salesperson_performance(DATE, DATE, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_report_summary(DATE, DATE, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_flow_report(DATE, DATE, TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_debts_aging(DATE, TEXT)
  TO authenticated;

COMMENT ON FUNCTION public.get_sales_report_summary(DATE, DATE, TEXT) IS
  'Synthèse facturation, encaissements et créances par devise.';
COMMENT ON FUNCTION public.get_sales_report_trend(DATE, DATE, TEXT, TEXT) IS
  'Évolution des ventes et encaissements par période et devise.';
COMMENT ON FUNCTION public.get_receivables_aging(DATE, TEXT) IS
  'Créances clients échues et non échues, soumises aux RLS utilisateur.';
COMMENT ON FUNCTION public.get_salesperson_performance(DATE, DATE, TEXT) IS
  'Performance vendeurs sans multiplication des agrégats.';
COMMENT ON FUNCTION public.get_financial_report_summary(DATE, DATE, TEXT) IS
  'Bilan par devise, résultat opérationnel estimé et flux net, admin uniquement.';
COMMENT ON FUNCTION public.get_cash_flow_report(DATE, DATE, TEXT, TEXT) IS
  'Évolution des entrées et sorties de trésorerie, admin uniquement.';
COMMENT ON FUNCTION public.get_supplier_debts_aging(DATE, TEXT) IS
  'Vieillissement des dettes fournisseurs, admin uniquement.';
