-- ============================================================================
-- 013_harmonize_permissions.sql
-- IME CRM — Rapports & Performance — Étape 3/7
-- Harmonisation des droits financiers par rôle.
--
-- Matrice :
--   admin       : accès complet ;
--   lead_team   : ventes et encaissements clients, sans coûts ni dettes ;
--   commercial  : ses propres ventes et créances uniquement.
-- ============================================================================

-- ── Factures clients ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "sales_invoices_admin_all" ON public.sales_invoices;
DROP POLICY IF EXISTS "sales_invoices_select" ON public.sales_invoices;
DROP POLICY IF EXISTS "sales_invoices_insert" ON public.sales_invoices;
DROP POLICY IF EXISTS "sales_invoices_update" ON public.sales_invoices;
DROP POLICY IF EXISTS "sales_invoices_delete" ON public.sales_invoices;

CREATE POLICY "sales_invoices_select"
  ON public.sales_invoices FOR SELECT
  USING (
    is_admin_or_lead()
    OR (get_user_role() = 'commercial' AND assigned_to = auth.uid())
  );

CREATE POLICY "sales_invoices_insert"
  ON public.sales_invoices FOR INSERT
  WITH CHECK (is_admin_or_lead());

CREATE POLICY "sales_invoices_update"
  ON public.sales_invoices FOR UPDATE
  USING (is_admin_or_lead())
  WITH CHECK (is_admin_or_lead());

CREATE POLICY "sales_invoices_delete"
  ON public.sales_invoices FOR DELETE
  USING (is_admin());

-- ── Encaissements clients ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "payment_transactions_admin_all"
  ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_select"
  ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_insert"
  ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_update"
  ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_delete"
  ON public.payment_transactions;

CREATE POLICY "payment_transactions_select"
  ON public.payment_transactions FOR SELECT
  USING (
    is_admin_or_lead()
    OR (get_user_role() = 'commercial' AND assigned_to = auth.uid())
  );

CREATE POLICY "payment_transactions_insert"
  ON public.payment_transactions FOR INSERT
  WITH CHECK (is_admin_or_lead());

CREATE POLICY "payment_transactions_update"
  ON public.payment_transactions FOR UPDATE
  USING (is_admin_or_lead())
  WITH CHECK (is_admin_or_lead());

CREATE POLICY "payment_transactions_delete"
  ON public.payment_transactions FOR DELETE
  USING (is_admin());

-- ── Données de coût : administrateur uniquement ──────────────────────────────

DROP POLICY IF EXISTS "supplier_invoices_admin_all"
  ON public.supplier_invoices;
CREATE POLICY "supplier_invoices_admin_all"
  ON public.supplier_invoices FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "supplier_payments_admin_all"
  ON public.supplier_payments;
CREATE POLICY "supplier_payments_admin_all"
  ON public.supplier_payments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "project_expenses_admin_all"
  ON public.project_expenses;
CREATE POLICY "project_expenses_admin_all"
  ON public.project_expenses FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── Taux de change ───────────────────────────────────────────────────────────
-- Tous les utilisateurs authentifiés peuvent convertir des montants.
-- Seul l'administrateur peut maintenir les taux.

DROP POLICY IF EXISTS "exchange_rates_admin_all" ON public.exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_select" ON public.exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_insert" ON public.exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_update" ON public.exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_delete" ON public.exchange_rates;

CREATE POLICY "exchange_rates_select"
  ON public.exchange_rates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "exchange_rates_insert"
  ON public.exchange_rates FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "exchange_rates_update"
  ON public.exchange_rates FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "exchange_rates_delete"
  ON public.exchange_rates FOR DELETE
  USING (is_admin());

COMMENT ON TABLE public.sales_invoices IS
  'Factures clients : admin/lead_team, ou dossiers propres du commercial.';
COMMENT ON TABLE public.payment_transactions IS
  'Encaissements : admin/lead_team, ou dossiers propres du commercial.';
