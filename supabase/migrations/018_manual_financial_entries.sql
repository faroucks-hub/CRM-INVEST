-- ============================================================================
-- 018_manual_financial_entries.sql
-- IME CRM — Étape 2 : saisie manuelle des données financières historiques.
--
-- Une recette historique peut exister sans ancien dossier public.paiements ni
-- facture CRM. Elle reste obligatoirement rattachée à un client et est marquée
-- comme solde d'ouverture. Les devises restent stockées et agrégées séparément.
-- ============================================================================

ALTER TABLE public.payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_parent_check;

ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_parent_check
  CHECK (
    payment_id IS NOT NULL
    OR sales_invoice_id IS NOT NULL
    OR is_opening_balance = true
  );

ALTER TABLE public.project_expenses
  ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.project_expenses
  DROP CONSTRAINT IF EXISTS project_expenses_scope_check;

ALTER TABLE public.project_expenses
  ADD CONSTRAINT project_expenses_scope_check
  CHECK (
    project_id IS NOT NULL
    OR NULLIF(BTRIM(description), '') IS NOT NULL
  );

COMMENT ON COLUMN public.payment_transactions.is_opening_balance IS
  'Vrai pour une recette historique saisie manuellement sans parent CRM.';
COMMENT ON COLUMN public.project_expenses.project_id IS
  'Projet facultatif pour permettre la saisie de frais généraux historiques.';
