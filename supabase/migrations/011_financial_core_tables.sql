-- ============================================================================
-- 011_financial_core_tables.sql
-- IME CRM — Rapports & Performance — Étape 1/7
-- Tables financières manquantes uniquement.
--
-- Cette migration :
--   1. conserve public.paiements comme dossier de créance client ;
--   2. ajoute l'historique réel des encaissements ;
--   3. ajoute les factures clients nécessaires au CA facturé ;
--   4. ajoute les factures et paiements fournisseurs ;
--   5. ajoute les dépenses directes des projets.
--
-- Hors périmètre de cette étape :
--   - agrégations et conversion multidevise (étape 2) ;
--   - harmonisation définitive des permissions (étape 3) ;
--   - vues/fonctions de reporting (étape 4).
-- ============================================================================

-- ── Séquences internes ───────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS public.seq_sales_invoice_number START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_payment_transaction_number START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_supplier_invoice_number START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_supplier_payment_number START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_project_expense_number START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION public.generate_sales_invoice_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'IME-' || RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2)
    || '-INV-' || LPAD(nextval('public.seq_sales_invoice_number')::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_payment_transaction_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'IME-RCT-' || LPAD(
    nextval('public.seq_payment_transaction_number')::TEXT, 5, '0'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_supplier_invoice_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'IME-SI-' || LPAD(
    nextval('public.seq_supplier_invoice_number')::TEXT, 5, '0'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_supplier_payment_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'IME-SP-' || LPAD(
    nextval('public.seq_supplier_payment_number')::TEXT, 5, '0'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_project_expense_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'IME-EXP-' || LPAD(
    nextval('public.seq_project_expense_number')::TEXT, 5, '0'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_sales_invoice_reference() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_payment_transaction_reference() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_supplier_invoice_reference() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_supplier_payment_reference() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_project_expense_reference() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.generate_sales_invoice_reference()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_payment_transaction_reference()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_supplier_invoice_reference()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_supplier_payment_reference()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_project_expense_reference()
  TO authenticated;

-- ── Factures clients ─────────────────────────────────────────────────────────
-- Une proforma, une quotation ou la valeur d'un projet ne constitue pas à elle
-- seule un chiffre d'affaires facturé. Cette table enregistre la facture émise.

CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference         TEXT NOT NULL UNIQUE
                    DEFAULT public.generate_sales_invoice_reference(),

  client_id         UUID NOT NULL
                    REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_id        UUID
                    REFERENCES public.projets_v2(id) ON DELETE RESTRICT,
  proforma_id       UUID
                    REFERENCES public.proformas_v2(id) ON DELETE SET NULL,
  assigned_to       UUID
                    REFERENCES public.users_profiles(id) ON DELETE SET NULL,

  status            TEXT NOT NULL DEFAULT 'brouillon'
                    CHECK (status IN (
                      'brouillon', 'emise', 'partiellement_payee',
                      'payee', 'en_retard', 'annulee'
                    )),
  issue_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE,

  currency          TEXT NOT NULL DEFAULT 'USD',
  subtotal          NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),

  external_number   TEXT,
  notes             TEXT,
  internal_notes    TEXT,

  voided_at         TIMESTAMPTZ,
  voided_by         UUID
                    REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  void_reason       TEXT,

  created_by        UUID
                    REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sales_invoices_due_date_check
    CHECK (due_date IS NULL OR due_date >= issue_date),
  CONSTRAINT sales_invoices_void_check
    CHECK (
      (status <> 'annulee' AND voided_at IS NULL)
      OR
      (status = 'annulee' AND voided_at IS NOT NULL AND void_reason IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_client
  ON public.sales_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_project
  ON public.sales_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_assigned
  ON public.sales_invoices(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status
  ON public.sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_issue_date
  ON public.sales_invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_due_date
  ON public.sales_invoices(due_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoices_external_number
  ON public.sales_invoices(external_number)
  WHERE external_number IS NOT NULL;

-- ── Transactions d'encaissement client ──────────────────────────────────────
-- Chaque virement/acompte/remboursement est une ligne indépendante.
-- Le montant reste positif ; transaction_type détermine son signe au reporting.

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference           TEXT NOT NULL UNIQUE
                      DEFAULT public.generate_payment_transaction_reference(),

  payment_id          UUID
                      REFERENCES public.paiements(id) ON DELETE RESTRICT,
  sales_invoice_id    UUID
                      REFERENCES public.sales_invoices(id) ON DELETE RESTRICT,
  client_id           UUID NOT NULL
                      REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_id          UUID
                      REFERENCES public.projets_v2(id) ON DELETE RESTRICT,
  proforma_id         UUID
                      REFERENCES public.proformas_v2(id) ON DELETE SET NULL,
  assigned_to         UUID
                      REFERENCES public.users_profiles(id) ON DELETE SET NULL,

  transaction_type    TEXT NOT NULL DEFAULT 'encaissement'
                      CHECK (transaction_type IN ('encaissement', 'remboursement')),
  amount              NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency            TEXT NOT NULL DEFAULT 'USD',
  transaction_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  value_date          DATE,
  payment_method      TEXT,
  bank_reference      TEXT,
  notes               TEXT,

  is_opening_balance  BOOLEAN NOT NULL DEFAULT false,
  voided_at           TIMESTAMPTZ,
  voided_by           UUID
                      REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  void_reason         TEXT,

  created_by          UUID
                      REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT payment_transactions_parent_check
    CHECK (payment_id IS NOT NULL OR sales_invoice_id IS NOT NULL),
  CONSTRAINT payment_transactions_value_date_check
    CHECK (value_date IS NULL OR value_date >= transaction_date),
  CONSTRAINT payment_transactions_void_check
    CHECK (
      (voided_at IS NULL AND void_reason IS NULL)
      OR
      (voided_at IS NOT NULL AND void_reason IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment
  ON public.payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice
  ON public.payment_transactions(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_client
  ON public.payment_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_project
  ON public.payment_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_assigned
  ON public.payment_transactions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_date
  ON public.payment_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_active
  ON public.payment_transactions(transaction_date, currency)
  WHERE voided_at IS NULL;

-- ── Factures fournisseurs ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.supplier_invoices (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference                TEXT NOT NULL UNIQUE
                           DEFAULT public.generate_supplier_invoice_reference(),

  supplier_id              UUID NOT NULL
                           REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  project_id               UUID
                           REFERENCES public.projets_v2(id) ON DELETE RESTRICT,
  supplier_document_number TEXT,

  status                   TEXT NOT NULL DEFAULT 'recue'
                           CHECK (status IN (
                             'brouillon', 'recue', 'validee',
                             'partiellement_payee', 'payee',
                             'en_retard', 'contestee', 'annulee'
                           )),
  issue_date               DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date                 DATE,

  currency                 TEXT NOT NULL DEFAULT 'USD',
  subtotal                 NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount               NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount             NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),

  description              TEXT,
  notes                    TEXT,
  internal_notes           TEXT,

  voided_at                TIMESTAMPTZ,
  voided_by                UUID
                           REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  void_reason              TEXT,

  created_by               UUID
                           REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT supplier_invoices_due_date_check
    CHECK (due_date IS NULL OR due_date >= issue_date),
  CONSTRAINT supplier_invoices_void_check
    CHECK (
      (status <> 'annulee' AND voided_at IS NULL)
      OR
      (status = 'annulee' AND voided_at IS NOT NULL AND void_reason IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier
  ON public.supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_project
  ON public.supplier_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status
  ON public.supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_issue_date
  ON public.supplier_invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_due_date
  ON public.supplier_invoices(due_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_invoices_document_number
  ON public.supplier_invoices(supplier_id, supplier_document_number)
  WHERE supplier_document_number IS NOT NULL;

-- ── Paiements fournisseurs ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference             TEXT NOT NULL UNIQUE
                        DEFAULT public.generate_supplier_payment_reference(),

  supplier_id           UUID NOT NULL
                        REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_invoice_id   UUID
                        REFERENCES public.supplier_invoices(id) ON DELETE RESTRICT,
  project_id            UUID
                        REFERENCES public.projets_v2(id) ON DELETE RESTRICT,

  transaction_type      TEXT NOT NULL DEFAULT 'paiement'
                        CHECK (transaction_type IN ('paiement', 'remboursement')),
  amount                NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency              TEXT NOT NULL DEFAULT 'USD',
  payment_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  value_date            DATE,
  payment_method        TEXT,
  bank_reference        TEXT,
  notes                 TEXT,

  voided_at             TIMESTAMPTZ,
  voided_by             UUID
                        REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  void_reason           TEXT,

  created_by            UUID
                        REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT supplier_payments_parent_check
    CHECK (supplier_invoice_id IS NOT NULL OR project_id IS NOT NULL),
  CONSTRAINT supplier_payments_value_date_check
    CHECK (value_date IS NULL OR value_date >= payment_date),
  CONSTRAINT supplier_payments_void_check
    CHECK (
      (voided_at IS NULL AND void_reason IS NULL)
      OR
      (voided_at IS NOT NULL AND void_reason IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier
  ON public.supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_invoice
  ON public.supplier_payments(supplier_invoice_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_project
  ON public.supplier_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_date
  ON public.supplier_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_active
  ON public.supplier_payments(payment_date, currency)
  WHERE voided_at IS NULL;

-- ── Dépenses directes de projet ──────────────────────────────────────────────
-- Cette table couvre les coûts non déjà portés par une facture fournisseur :
-- transport, banque, commission, certification, déplacement, douane, etc.

CREATE TABLE IF NOT EXISTS public.project_expenses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference         TEXT NOT NULL UNIQUE
                    DEFAULT public.generate_project_expense_reference(),

  project_id        UUID NOT NULL
                    REFERENCES public.projets_v2(id) ON DELETE RESTRICT,
  supplier_id       UUID
                    REFERENCES public.suppliers(id) ON DELETE SET NULL,

  category          TEXT NOT NULL
                    CHECK (category IN (
                      'transport', 'banque', 'commission', 'certification',
                      'douane', 'deplacement', 'installation', 'sous_traitance',
                      'assurance', 'autre'
                    )),
  status            TEXT NOT NULL DEFAULT 'prevue'
                    CHECK (status IN ('prevue', 'engagee', 'payee', 'annulee')),
  description       TEXT NOT NULL,

  amount            NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency          TEXT NOT NULL DEFAULT 'USD',
  expense_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE,
  paid_date         DATE,
  external_reference TEXT,
  notes             TEXT,
  internal_notes    TEXT,

  voided_at         TIMESTAMPTZ,
  voided_by         UUID
                    REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  void_reason       TEXT,

  created_by        UUID
                    REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT project_expenses_dates_check
    CHECK (
      (due_date IS NULL OR due_date >= expense_date)
      AND
      (paid_date IS NULL OR paid_date >= expense_date)
    ),
  CONSTRAINT project_expenses_paid_check
    CHECK (status <> 'payee' OR paid_date IS NOT NULL),
  CONSTRAINT project_expenses_void_check
    CHECK (
      (status <> 'annulee' AND voided_at IS NULL)
      OR
      (status = 'annulee' AND voided_at IS NOT NULL AND void_reason IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_project_expenses_project
  ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_supplier
  ON public.project_expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_category
  ON public.project_expenses(category);
CREATE INDEX IF NOT EXISTS idx_project_expenses_status
  ON public.project_expenses(status);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date
  ON public.project_expenses(expense_date);

-- ── updated_at ────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_sales_invoices_updated ON public.sales_invoices;
CREATE TRIGGER trg_sales_invoices_updated
  BEFORE UPDATE ON public.sales_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_payment_transactions_updated
  ON public.payment_transactions;
CREATE TRIGGER trg_payment_transactions_updated
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_supplier_invoices_updated ON public.supplier_invoices;
CREATE TRIGGER trg_supplier_invoices_updated
  BEFORE UPDATE ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_supplier_payments_updated ON public.supplier_payments;
CREATE TRIGGER trg_supplier_payments_updated
  BEFORE UPDATE ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_project_expenses_updated ON public.project_expenses;
CREATE TRIGGER trg_project_expenses_updated
  BEFORE UPDATE ON public.project_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Sécurité initiale conservatrice ──────────────────────────────────────────
-- L'harmonisation complète par rôle reste volontairement réservée à l'étape 3.
-- Jusqu'à cette étape, les nouvelles données financières sont admin-only.

ALTER TABLE public.sales_invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_invoices_admin_all" ON public.sales_invoices;
CREATE POLICY "sales_invoices_admin_all"
  ON public.sales_invoices FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "payment_transactions_admin_all"
  ON public.payment_transactions;
CREATE POLICY "payment_transactions_admin_all"
  ON public.payment_transactions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "supplier_invoices_admin_all" ON public.supplier_invoices;
CREATE POLICY "supplier_invoices_admin_all"
  ON public.supplier_invoices FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "supplier_payments_admin_all" ON public.supplier_payments;
CREATE POLICY "supplier_payments_admin_all"
  ON public.supplier_payments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "project_expenses_admin_all" ON public.project_expenses;
CREATE POLICY "project_expenses_admin_all"
  ON public.project_expenses FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── Reprise non destructive des encaissements cumulés existants ──────────────
-- Un seul solde d'ouverture est créé par dossier de paiement existant.
-- Il pourra être ventilé manuellement plus tard si les relevés bancaires
-- historiques permettent de retrouver plusieurs versements.

INSERT INTO public.payment_transactions (
  reference,
  payment_id,
  client_id,
  project_id,
  proforma_id,
  assigned_to,
  transaction_type,
  amount,
  currency,
  transaction_date,
  value_date,
  bank_reference,
  notes,
  is_opening_balance,
  created_by
)
SELECT
  'IME-OPEN-' || p.reference,
  p.id,
  p.client_id,
  p.project_id,
  p.proforma_id,
  p.assigned_to,
  'encaissement',
  p.deposit_received,
  p.currency,
  COALESCE(p.received_date, p.created_at::DATE),
  COALESCE(p.received_date, p.created_at::DATE),
  p.bank_reference,
  'Solde d''ouverture créé depuis le cumul historique du dossier ' || p.reference,
  true,
  p.created_by
FROM public.paiements p
WHERE p.deposit_received > 0
ON CONFLICT (reference) DO NOTHING;

COMMENT ON TABLE public.sales_invoices IS
  'Factures clients émises — source du chiffre d''affaires facturé.';
COMMENT ON TABLE public.payment_transactions IS
  'Encaissements et remboursements clients — une ligne par transaction réelle.';
COMMENT ON TABLE public.supplier_invoices IS
  'Factures fournisseurs et dettes associées.';
COMMENT ON TABLE public.supplier_payments IS
  'Paiements et remboursements fournisseurs — une ligne par transaction réelle.';
COMMENT ON TABLE public.project_expenses IS
  'Dépenses directes de projet non déjà portées par une facture fournisseur.';
