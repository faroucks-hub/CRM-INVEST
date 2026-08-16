-- Phase 1 — Cycle Achats / Partenaires
-- RFQ -> offre partenaire -> sélection -> Purchase Order -> Proforma partenaire

CREATE TABLE IF NOT EXISTS public.supplier_rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  project_id uuid REFERENCES public.projets_v2(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  currency text NOT NULL DEFAULT 'USD',
  requested_date date NOT NULL DEFAULT CURRENT_DATE,
  response_due_date date,
  status text NOT NULL DEFAULT 'envoyee' CHECK (status IN ('brouillon','envoyee','repondue','cloturee','annulee')),
  attachment_url text,
  created_by uuid REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  rfq_id uuid REFERENCES public.supplier_rfqs(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projets_v2(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_reference text,
  amount numeric(15,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  payment_terms text,
  lead_time_days integer CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
  warranty_months integer CHECK (warranty_months IS NULL OR warranty_months >= 0),
  incoterm text,
  validity_date date,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'recue' CHECK (status IN ('recue','en_analyse','selectionnee','rejetee','expiree')),
  attachment_url text,
  notes text,
  created_by uuid REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  project_id uuid REFERENCES public.projets_v2(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_quotation_id uuid REFERENCES public.supplier_quotations(id) ON DELETE RESTRICT,
  amount numeric(15,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  payment_terms text,
  delivery_terms text,
  expected_delivery date,
  warranty_months integer CHECK (warranty_months IS NULL OR warranty_months >= 0),
  status text NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','envoye','accepte','en_production','pret','cloture','annule')),
  terms_version text,
  notes text,
  issued_date date,
  created_by uuid REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_proformas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projets_v2(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_reference text,
  amount numeric(15,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  payment_terms text,
  status text NOT NULL DEFAULT 'recue' CHECK (status IN ('recue','partiellement_payee','payee','annulee')),
  attachment_url text,
  notes text,
  created_by uuid REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_rfqs_supplier ON public.supplier_rfqs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_rfqs_project ON public.supplier_rfqs(project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotations_supplier ON public.supplier_quotations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotations_project ON public.supplier_quotations(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project ON public.purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_proformas_supplier ON public.supplier_proformas(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_proformas_project ON public.supplier_proformas(project_id);

ALTER TABLE public.supplier_rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_proformas ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['supplier_rfqs','supplier_quotations','purchase_orders','supplier_proformas'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_management', t);
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users_profiles u WHERE u.id = auth.uid() AND u.role IN ('admin','lead_team')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users_profiles u WHERE u.id = auth.uid() AND u.role IN ('admin','lead_team')))
    $p$, t || '_management', t);
  END LOOP;
END $$;
