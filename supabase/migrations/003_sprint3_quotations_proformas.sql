-- IME CRM Sprint 3 — Quotations & Proformas
-- Exécuter dans Supabase SQL Editor après migration 002

-- Séquences centralisées
CREATE TABLE IF NOT EXISTS public.document_sequences (
  doc_type  TEXT NOT NULL,
  year      SMALLINT NOT NULL,
  last_seq  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (doc_type, year)
);

CREATE OR REPLACE FUNCTION get_next_doc_number(p_type TEXT, p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year_s TEXT := RIGHT(EXTRACT(YEAR FROM NOW())::TEXT, 2);
  v_year   SMALLINT := EXTRACT(YEAR FROM NOW())::SMALLINT;
  v_seq    INT;
BEGIN
  INSERT INTO public.document_sequences (doc_type, year, last_seq)
  VALUES (p_type, v_year, 1)
  ON CONFLICT (doc_type, year)
  DO UPDATE SET last_seq = document_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;
  RETURN 'IME-' || v_year_s || '-' || p_prefix || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Quotations table
CREATE TABLE IF NOT EXISTS public.quotations_v2 (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number          TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'brouillon'
                  CHECK (status IN ('brouillon','envoyee','revisee','approuvee','perdue','annulee')),
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  opportunity_id  UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until     DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  currency        TEXT NOT NULL DEFAULT 'USD',
  incoterm        TEXT DEFAULT 'DAP',
  delivery_delay  TEXT DEFAULT '6 à 8 semaines',
  warranty        TEXT DEFAULT 'Garantie fabricant 2 ans',
  payment_terms   TEXT DEFAULT 'Acompte 30% à la commande, solde avant expédition',
  intro_text      TEXT,
  technical_notes TEXT,
  notes           TEXT,
  internal_notes  TEXT,
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_global NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_sell      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_buy       NUMERIC(15,2),
  margin_pct      NUMERIC(5,2),
  sent_at         TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  lost_at         TIMESTAMPTZ,
  lost_reason     TEXT,
  created_by      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quotation lines
CREATE TABLE IF NOT EXISTS public.quotation_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id    UUID NOT NULL REFERENCES public.quotations_v2(id) ON DELETE CASCADE,
  sort_order      INT NOT NULL DEFAULT 0,
  product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  designation     TEXT NOT NULL,
  description     TEXT,
  reference       TEXT,
  quantity        NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit            TEXT NOT NULL DEFAULT 'unité',
  unit_price_sell NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total_sell NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit_price_buy  NUMERIC(15,2),
  line_total_buy  NUMERIC(15,2),
  margin_pct      NUMERIC(5,2),
  specs           JSONB DEFAULT '{}',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Proformas table
CREATE TABLE IF NOT EXISTS public.proformas_v2 (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number          TEXT NOT NULL UNIQUE,
  payment_status  TEXT NOT NULL DEFAULT 'en_attente'
                  CHECK (payment_status IN ('en_attente','acompte_recu','partiel','paye','annule')),
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  quotation_id    UUID REFERENCES public.quotations_v2(id) ON DELETE SET NULL,
  opportunity_id  UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until     DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  currency        TEXT NOT NULL DEFAULT 'USD',
  incoterm        TEXT DEFAULT 'DAP',
  port_destination TEXT,
  delivery_delay  TEXT DEFAULT '6 à 8 semaines',
  warranty        TEXT DEFAULT 'Garantie fabricant 2 ans',
  payment_terms   TEXT DEFAULT 'Acompte 30% à la commande, solde avant expédition',
  bank_name       TEXT,
  bank_iban       TEXT,
  bank_swift      TEXT,
  bank_account    TEXT,
  bank_address    TEXT,
  bank_currency   TEXT,
  intro_text      TEXT,
  technical_notes TEXT,
  notes           TEXT,
  internal_notes  TEXT,
  has_signature   BOOLEAN NOT NULL DEFAULT false,
  signature_name  TEXT,
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_global NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_sell      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_buy       NUMERIC(15,2),
  margin_pct      NUMERIC(5,2),
  amount_received NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_due     NUMERIC(15,2) NOT NULL DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Proforma lines
CREATE TABLE IF NOT EXISTS public.proforma_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proforma_id     UUID NOT NULL REFERENCES public.proformas_v2(id) ON DELETE CASCADE,
  sort_order      INT NOT NULL DEFAULT 0,
  product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  designation     TEXT NOT NULL,
  description     TEXT,
  reference       TEXT,
  hs_code         TEXT,
  country_origin  TEXT DEFAULT 'Turquie',
  quantity        NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit            TEXT NOT NULL DEFAULT 'unité',
  unit_price_sell NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total_sell NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit_price_buy  NUMERIC(15,2),
  line_total_buy  NUMERIC(15,2),
  margin_pct      NUMERIC(5,2),
  specs           JSONB DEFAULT '{}',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qv2_client   ON public.quotations_v2(client_id);
CREATE INDEX IF NOT EXISTS idx_qv2_assigned ON public.quotations_v2(assigned_to);
CREATE INDEX IF NOT EXISTS idx_qv2_status   ON public.quotations_v2(status);
CREATE INDEX IF NOT EXISTS idx_qlines       ON public.quotation_lines(quotation_id);
CREATE INDEX IF NOT EXISTS idx_pv2_client   ON public.proformas_v2(client_id);
CREATE INDEX IF NOT EXISTS idx_pv2_assigned ON public.proformas_v2(assigned_to);
CREATE INDEX IF NOT EXISTS idx_plines       ON public.proforma_lines(proforma_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_qv2_updated ON public.quotations_v2;
CREATE TRIGGER trg_qv2_updated BEFORE UPDATE ON public.quotations_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_pv2_updated ON public.proformas_v2;
CREATE TRIGGER trg_pv2_updated BEFORE UPDATE ON public.proformas_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations_v2      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_lines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proformas_v2       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proforma_lines     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_seq" ON public.document_sequences;
CREATE POLICY "doc_seq" ON public.document_sequences FOR ALL USING (true);

DROP POLICY IF EXISTS "qv2_select" ON public.quotations_v2;
CREATE POLICY "qv2_select" ON public.quotations_v2 FOR SELECT
  USING (is_admin_or_lead() OR (get_user_role() = 'commercial' AND assigned_to = auth.uid()));

DROP POLICY IF EXISTS "qv2_insert" ON public.quotations_v2;
CREATE POLICY "qv2_insert" ON public.quotations_v2 FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "qv2_update" ON public.quotations_v2;
CREATE POLICY "qv2_update" ON public.quotations_v2 FOR UPDATE
  USING (is_admin_or_lead() OR (get_user_role() = 'commercial' AND assigned_to = auth.uid()));

DROP POLICY IF EXISTS "qv2_delete" ON public.quotations_v2;
CREATE POLICY "qv2_delete" ON public.quotations_v2 FOR DELETE USING (is_admin_or_lead());

DROP POLICY IF EXISTS "qlines_all" ON public.quotation_lines;
CREATE POLICY "qlines_all" ON public.quotation_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM public.quotations_v2 q WHERE q.id = quotation_id
    AND (is_admin_or_lead() OR q.assigned_to = auth.uid())));

DROP POLICY IF EXISTS "pv2_select" ON public.proformas_v2;
CREATE POLICY "pv2_select" ON public.proformas_v2 FOR SELECT
  USING (is_admin_or_lead() OR (get_user_role() = 'commercial' AND assigned_to = auth.uid()));

DROP POLICY IF EXISTS "pv2_insert" ON public.proformas_v2;
CREATE POLICY "pv2_insert" ON public.proformas_v2 FOR INSERT WITH CHECK (is_admin_or_lead());

DROP POLICY IF EXISTS "pv2_update" ON public.proformas_v2;
CREATE POLICY "pv2_update" ON public.proformas_v2 FOR UPDATE USING (is_admin_or_lead());

DROP POLICY IF EXISTS "pv2_delete" ON public.proformas_v2;
CREATE POLICY "pv2_delete" ON public.proformas_v2 FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "plines_all" ON public.proforma_lines;
CREATE POLICY "plines_all" ON public.proforma_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM public.proformas_v2 p WHERE p.id = proforma_id
    AND (is_admin_or_lead() OR p.assigned_to = auth.uid())));

-- Stats view Sprint 3
CREATE OR REPLACE VIEW public.quotation_stats AS
SELECT
  u.id AS user_id, u.full_name, u.role,
  COUNT(DISTINCT q.id) AS total_quotations,
  COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'approuvee') AS approved_quotations,
  COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'perdue') AS lost_quotations,
  COALESCE(SUM(q.total_sell), 0) AS total_amount,
  COALESCE(SUM(q.total_sell) FILTER (WHERE q.status = 'approuvee'), 0) AS approved_amount,
  COUNT(DISTINCT p.id) AS total_proformas,
  COALESCE(SUM(p.total_sell), 0) AS proforma_amount,
  CASE WHEN COUNT(DISTINCT q.id) > 0
    THEN ROUND(COUNT(DISTINCT p.id)::NUMERIC / COUNT(DISTINCT q.id) * 100, 1)
    ELSE 0 END AS conversion_rate
FROM public.users_profiles u
LEFT JOIN public.quotations_v2 q ON q.assigned_to = u.id
LEFT JOIN public.proformas_v2 p ON p.assigned_to = u.id
GROUP BY u.id, u.full_name, u.role;
