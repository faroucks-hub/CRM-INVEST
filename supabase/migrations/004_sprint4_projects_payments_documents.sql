-- ═══════════════════════════════════════════════════════════════════
-- IME CRM — Sprint 4 Migration
-- Projets, Paiements, Documents
-- ═══════════════════════════════════════════════════════════════════

-- ── Statuts projet ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE project_general_status AS ENUM (
    'en_attente', 'en_cours', 'en_retard', 'livre', 'cloture', 'annule'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE step_status AS ENUM (
    'non_commence', 'en_cours', 'termine', 'bloque'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_v2 AS ENUM (
    'en_attente', 'acompte_recu', 'partiel', 'paye', 'en_retard', 'annule'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE doc_type AS ENUM (
    'quotation','proforma','po','pi','invoice','packing_list',
    'sld','design_form','datasheet','fat_report',
    'certificate','photo','autre'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Table projets_v2 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projets_v2 (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference         TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,

  -- Relations
  client_id         UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  assigned_to       UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  quotation_id      UUID REFERENCES public.quotations_v2(id) ON DELETE SET NULL,
  proforma_id       UUID REFERENCES public.proformas_v2(id) ON DELETE SET NULL,

  -- Statut
  status            project_general_status NOT NULL DEFAULT 'en_attente',
  progress_pct      INT NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),

  -- Financier
  contract_value    NUMERIC(15,2),
  currency          TEXT NOT NULL DEFAULT 'USD',

  -- Dates
  order_date        DATE,
  expected_delivery DATE,
  actual_delivery   DATE,

  -- Logistique
  incoterm          TEXT DEFAULT 'DAP',
  port_destination  TEXT,
  country           TEXT,
  shipper           TEXT,
  tracking_number   TEXT,

  -- Garantie
  warranty_months   INT NOT NULL DEFAULT 24,
  warranty_start    DATE,
  warranty_end      DATE,

  -- Notes
  notes             TEXT,
  internal_notes    TEXT,

  created_by        UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Étapes workflow ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_workflow_steps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES public.projets_v2(id) ON DELETE CASCADE,
  step_key        TEXT NOT NULL,
  step_label      TEXT NOT NULL,
  step_order      INT NOT NULL,
  status          step_status NOT NULL DEFAULT 'non_commence',
  deadline        DATE,
  completed_at    DATE,
  responsible_id  UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  comment         TEXT,
  is_blocked      BOOLEAN NOT NULL DEFAULT false,
  block_reason    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, step_key)
);

-- ── Paiements ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.paiements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference       TEXT NOT NULL UNIQUE,

  -- Relations
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_id      UUID REFERENCES public.projets_v2(id) ON DELETE SET NULL,
  proforma_id     UUID REFERENCES public.proformas_v2(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,

  -- Montants
  total_amount    NUMERIC(15,2) NOT NULL,
  deposit_expected NUMERIC(15,2) NOT NULL DEFAULT 0,
  deposit_received NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_remaining NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USD',

  -- Dates
  due_date        DATE,
  received_date   DATE,

  -- Statut
  status          payment_status_v2 NOT NULL DEFAULT 'en_attente',

  -- Références bancaires
  bank_reference  TEXT,
  notes           TEXT,

  created_by      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Documents ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents_v2 (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Métadonnées
  name            TEXT NOT NULL,
  doc_type        doc_type NOT NULL DEFAULT 'autre',
  description     TEXT,

  -- Source (upload ou lien externe)
  source_type     TEXT NOT NULL DEFAULT 'upload' CHECK (source_type IN ('upload','external_link')),
  file_path       TEXT,           -- Chemin Supabase Storage (si upload)
  external_url    TEXT,           -- URL Google Drive / OneDrive (si lien externe)
  file_size       BIGINT,
  mime_type       TEXT,
  original_name   TEXT,

  -- Relations (multi-liens)
  client_id       UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES public.projets_v2(id) ON DELETE CASCADE,
  quotation_id    UUID REFERENCES public.quotations_v2(id) ON DELETE CASCADE,
  proforma_id     UUID REFERENCES public.proformas_v2(id) ON DELETE CASCADE,
  step_id         UUID REFERENCES public.project_workflow_steps(id) ON DELETE SET NULL,

  -- Accès
  is_confidential BOOLEAN NOT NULL DEFAULT false,

  -- Métadonnées
  uploaded_by     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Index ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projets_client    ON public.projets_v2(client_id);
CREATE INDEX IF NOT EXISTS idx_projets_assigned  ON public.projets_v2(assigned_to);
CREATE INDEX IF NOT EXISTS idx_projets_status    ON public.projets_v2(status);
CREATE INDEX IF NOT EXISTS idx_projets_delivery  ON public.projets_v2(expected_delivery);
CREATE INDEX IF NOT EXISTS idx_steps_project     ON public.project_workflow_steps(project_id);
CREATE INDEX IF NOT EXISTS idx_steps_status      ON public.project_workflow_steps(status);
CREATE INDEX IF NOT EXISTS idx_paiements_client  ON public.paiements(client_id);
CREATE INDEX IF NOT EXISTS idx_paiements_project ON public.paiements(project_id);
CREATE INDEX IF NOT EXISTS idx_paiements_status  ON public.paiements(status);
CREATE INDEX IF NOT EXISTS idx_paiements_due     ON public.paiements(due_date);
CREATE INDEX IF NOT EXISTS idx_docs_client       ON public.documents_v2(client_id);
CREATE INDEX IF NOT EXISTS idx_docs_project      ON public.documents_v2(project_id);
CREATE INDEX IF NOT EXISTS idx_docs_type         ON public.documents_v2(doc_type);

-- ── Triggers ──────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_projets_updated ON public.projets_v2;
CREATE TRIGGER trg_projets_updated
  BEFORE UPDATE ON public.projets_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_steps_updated ON public.project_workflow_steps;
CREATE TRIGGER trg_steps_updated
  BEFORE UPDATE ON public.project_workflow_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_paiements_updated ON public.paiements;
CREATE TRIGGER trg_paiements_updated
  BEFORE UPDATE ON public.paiements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Séquence référence paiement ───────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS seq_paiement_number START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION generate_payment_reference()
RETURNS TEXT AS $$
BEGIN
  RETURN 'IME-PAY-' || LPAD(nextval('seq_paiement_number')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ── Séquence référence projet ─────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_project_reference_v2()
RETURNS TEXT AS $$
DECLARE
  v_year_s TEXT := RIGHT(EXTRACT(YEAR FROM NOW())::TEXT, 2);
  v_seq INT;
BEGIN
  INSERT INTO public.document_sequences (doc_type, year, last_seq)
  VALUES ('project', EXTRACT(YEAR FROM NOW())::SMALLINT, 1)
  ON CONFLICT (doc_type, year)
  DO UPDATE SET last_seq = document_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;
  RETURN 'IME-' || v_year_s || '-PRJ-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.projets_v2               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_workflow_steps    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_v2              ENABLE ROW LEVEL SECURITY;

-- Projets
DROP POLICY IF EXISTS "projets_select" ON public.projets_v2;
CREATE POLICY "projets_select" ON public.projets_v2 FOR SELECT
  USING (is_admin_or_lead() OR (get_user_role() = 'commercial' AND assigned_to = auth.uid()));

DROP POLICY IF EXISTS "projets_insert" ON public.projets_v2;
CREATE POLICY "projets_insert" ON public.projets_v2 FOR INSERT
  WITH CHECK (is_admin_or_lead());

DROP POLICY IF EXISTS "projets_update" ON public.projets_v2;
CREATE POLICY "projets_update" ON public.projets_v2 FOR UPDATE
  USING (is_admin_or_lead() OR (get_user_role() = 'commercial' AND assigned_to = auth.uid()));

DROP POLICY IF EXISTS "projets_delete" ON public.projets_v2;
CREATE POLICY "projets_delete" ON public.projets_v2 FOR DELETE USING (is_admin());

-- Steps
DROP POLICY IF EXISTS "steps_all" ON public.project_workflow_steps;
CREATE POLICY "steps_all" ON public.project_workflow_steps FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.projets_v2 p WHERE p.id = project_id
      AND (is_admin_or_lead() OR p.assigned_to = auth.uid())
  ));

-- Paiements : admin/lead_team seulement
DROP POLICY IF EXISTS "paiements_select" ON public.paiements;
CREATE POLICY "paiements_select" ON public.paiements FOR SELECT
  USING (is_admin_or_lead() OR (get_user_role() = 'commercial' AND assigned_to = auth.uid()));

DROP POLICY IF EXISTS "paiements_insert" ON public.paiements;
CREATE POLICY "paiements_insert" ON public.paiements FOR INSERT
  WITH CHECK (is_admin_or_lead());

DROP POLICY IF EXISTS "paiements_update" ON public.paiements;
CREATE POLICY "paiements_update" ON public.paiements FOR UPDATE
  USING (is_admin_or_lead());

DROP POLICY IF EXISTS "paiements_delete" ON public.paiements;
CREATE POLICY "paiements_delete" ON public.paiements FOR DELETE USING (is_admin());

-- Documents
DROP POLICY IF EXISTS "docs_v2_select" ON public.documents_v2;
CREATE POLICY "docs_v2_select" ON public.documents_v2 FOR SELECT
  USING (
    (NOT is_confidential AND auth.uid() IS NOT NULL)
    OR is_admin_or_lead()
  );

DROP POLICY IF EXISTS "docs_v2_insert" ON public.documents_v2;
CREATE POLICY "docs_v2_insert" ON public.documents_v2 FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "docs_v2_delete" ON public.documents_v2;
CREATE POLICY "docs_v2_delete" ON public.documents_v2 FOR DELETE USING (is_admin_or_lead());

-- ── Supabase Storage Bucket ───────────────────────────────────────
-- À créer manuellement dans Supabase Dashboard > Storage
-- Bucket name: ime-documents
-- Public: false (privé)
-- File size limit: 50MB
-- Allowed MIME types: tous

-- ── Vue alertes dashboard ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.dashboard_alerts AS
SELECT
  'projet_retard' AS alert_type,
  p.id AS entity_id,
  p.reference AS entity_ref,
  p.name AS entity_name,
  c.company_name AS client_name,
  p.expected_delivery AS alert_date,
  p.assigned_to AS assigned_to,
  'Projet en retard : livraison prévue le ' || TO_CHAR(p.expected_delivery, 'DD/MM/YYYY') AS message
FROM public.projets_v2 p
JOIN public.clients c ON c.id = p.client_id
WHERE p.status NOT IN ('livre','cloture','annule')
  AND p.expected_delivery < CURRENT_DATE

UNION ALL

SELECT
  'etape_bloquee',
  s.id, p.reference, p.name || ' — ' || s.step_label,
  c.company_name, s.deadline, p.assigned_to,
  'Étape bloquée : ' || s.step_label
FROM public.project_workflow_steps s
JOIN public.projets_v2 p ON p.id = s.project_id
JOIN public.clients c ON c.id = p.client_id
WHERE s.status = 'bloque'

UNION ALL

SELECT
  'paiement_retard',
  pay.id, pay.reference, 'Paiement ' || pay.reference,
  c.company_name, pay.due_date, pay.assigned_to,
  'Paiement en retard : ' || TO_CHAR(pay.total_amount, 'FM999,999,990.00') || ' ' || pay.currency
FROM public.paiements pay
JOIN public.clients c ON c.id = pay.client_id
WHERE pay.status NOT IN ('paye','annule')
  AND pay.due_date < CURRENT_DATE

UNION ALL

SELECT
  'deadline_proche',
  s.id, p.reference, p.name || ' — ' || s.step_label,
  c.company_name, s.deadline, p.assigned_to,
  'Deadline dans 3 jours : ' || s.step_label
FROM public.project_workflow_steps s
JOIN public.projets_v2 p ON p.id = s.project_id
JOIN public.clients c ON c.id = p.client_id
WHERE s.status NOT IN ('termine')
  AND s.deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days';
