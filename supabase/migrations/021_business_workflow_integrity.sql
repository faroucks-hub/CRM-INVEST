-- ============================================================================
-- 021_business_workflow_integrity.sql
-- IME CRM — Étape 5 : élimination du double comptage des créances.
-- Un ancien dossier public.paiements est ignoré lorsqu'une facture client
-- active couvre déjà la même proforma ou le même projet.
-- ============================================================================

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
      AND NOT EXISTS (
        SELECT 1
        FROM public.sales_invoices si
        WHERE si.status <> 'annulee'
          AND si.issue_date <= p_end_date
          AND UPPER(si.currency) = UPPER(p.currency)
          AND (
            (p.proforma_id IS NOT NULL AND si.proforma_id = p.proforma_id)
            OR
            (p.project_id IS NOT NULL AND si.project_id = p.project_id)
          )
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

