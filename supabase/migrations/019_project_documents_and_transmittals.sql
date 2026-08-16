-- ============================================================================
-- 019_project_documents_and_transmittals.sql
-- IME CRM — Étape 3 : complétude du schéma réellement utilisé par le CRM.
--
-- Ajoute les objets référencés par les pages Projets, Documents, Transmittals
-- et modèles de devis mais absents des migrations 001–018.
-- ============================================================================

-- Réconciliation d'une base existante où 009/010 ont été exécutées depuis le
-- Dashboard avant que le registre local ne soit complété.
ALTER TABLE public.website_leads
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID
    REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_opportunity_id UUID
    REFERENCES public.opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID
    REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_assigned
  ON public.website_leads(assigned_to)
  WHERE deleted_at IS NULL;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('a_faire','en_cours','termine','en_retard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('faible','normale','haute','urgente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.projets_v2
  ADD COLUMN IF NOT EXISTS workflow_stage TEXT NOT NULL DEFAULT 'engineering';

CREATE TABLE IF NOT EXISTS public.project_documents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       UUID NOT NULL REFERENCES public.projets_v2(id) ON DELETE CASCADE,
  uploaded_by      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  file_name        TEXT NOT NULL,
  file_path        TEXT NOT NULL,
  file_size        BIGINT,
  mime_type        TEXT,
  document_type    TEXT NOT NULL DEFAULT 'general',
  document_group   TEXT NOT NULL DEFAULT 'general',
  revision         INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  document_status  TEXT NOT NULL DEFAULT 'draft'
                   CHECK (document_status IN ('draft', 'approved', 'obsolete')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, document_group, revision)
);

CREATE TABLE IF NOT EXISTS public.project_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projets_v2(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  content     TEXT NOT NULL CHECK (NULLIF(BTRIM(content), '') IS NOT NULL),
  note_type   TEXT NOT NULL DEFAULT 'internal',
  is_pinned   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_activity_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES public.projets_v2(id) ON DELETE CASCADE,
  activity_type  TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  old_value      TEXT,
  new_value      TEXT,
  created_by     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_transmittals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id          UUID NOT NULL REFERENCES public.projets_v2(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  transmittal_number  TEXT NOT NULL UNIQUE,
  subject             TEXT NOT NULL,
  client_name         TEXT,
  client_email        TEXT,
  comments            TEXT,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN (
                        'draft', 'sent', 'acknowledged', 'rejected', 'cancelled'
                      )),
  generated_by        UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_transmittal_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transmittal_id        UUID NOT NULL
                        REFERENCES public.document_transmittals(id) ON DELETE CASCADE,
  project_document_id   UUID
                        REFERENCES public.project_documents(id) ON DELETE SET NULL,
  file_name             TEXT NOT NULL,
  document_type         TEXT,
  revision              INTEGER,
  document_status       TEXT,
  file_path             TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotation_templates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL UNIQUE,
  description       TEXT,
  quotation_type    TEXT NOT NULL DEFAULT 'industrial',
  intro_text        TEXT,
  technical_notes   TEXT,
  payment_terms     TEXT,
  delivery_delay    TEXT,
  warranty          TEXT,
  incoterm          TEXT,
  default_lines     JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by        UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_documents_project
  ON public.project_documents(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_documents_group
  ON public.project_documents(project_id, document_group, revision DESC);
CREATE INDEX IF NOT EXISTS idx_project_notes_project
  ON public.project_notes(project_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_activity_project
  ON public.project_activity_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_transmittals_project
  ON public.document_transmittals(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_transmittal_items_parent
  ON public.document_transmittal_items(transmittal_id);

DROP TRIGGER IF EXISTS trg_project_documents_updated ON public.project_documents;
CREATE TRIGGER trg_project_documents_updated
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_project_notes_updated ON public.project_notes;
CREATE TRIGGER trg_project_notes_updated
  BEFORE UPDATE ON public.project_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_document_transmittals_updated
  ON public.document_transmittals;
CREATE TRIGGER trg_document_transmittals_updated
  BEFORE UPDATE ON public.document_transmittals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_quotation_templates_updated
  ON public.quotation_templates;
CREATE TRIGGER trg_quotation_templates_updated
  BEFORE UPDATE ON public.quotation_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.generate_transmittal_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year SMALLINT := EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT;
  v_seq INTEGER;
BEGIN
  INSERT INTO public.document_sequences (doc_type, year, last_seq)
  VALUES ('transmittal', v_year, 1)
  ON CONFLICT (doc_type, year)
  DO UPDATE SET last_seq = public.document_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN 'TR-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_transmittal_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_transmittal_number()
  TO authenticated;

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_transmittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_transmittal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_documents_access" ON public.project_documents;
CREATE POLICY "project_documents_access"
  ON public.project_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projets_v2 p
      WHERE p.id = project_id
        AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projets_v2 p
      WHERE p.id = project_id
        AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "project_notes_access" ON public.project_notes;
CREATE POLICY "project_notes_access"
  ON public.project_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projets_v2 p
      WHERE p.id = project_id
        AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projets_v2 p
      WHERE p.id = project_id
        AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "project_activity_access"
  ON public.project_activity_logs;
CREATE POLICY "project_activity_access"
  ON public.project_activity_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projets_v2 p
      WHERE p.id = project_id
        AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projets_v2 p
      WHERE p.id = project_id
        AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "document_transmittals_access"
  ON public.document_transmittals;
CREATE POLICY "document_transmittals_access"
  ON public.document_transmittals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projets_v2 p
      WHERE p.id = project_id
        AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projets_v2 p
      WHERE p.id = project_id
        AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "document_transmittal_items_access"
  ON public.document_transmittal_items;
CREATE POLICY "document_transmittal_items_access"
  ON public.document_transmittal_items FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.document_transmittals t
      JOIN public.projets_v2 p ON p.id = t.project_id
      WHERE t.id = transmittal_id
        AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.document_transmittals t
      JOIN public.projets_v2 p ON p.id = t.project_id
      WHERE t.id = transmittal_id
        AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "quotation_templates_select"
  ON public.quotation_templates;
CREATE POLICY "quotation_templates_select"
  ON public.quotation_templates FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

DROP POLICY IF EXISTS "quotation_templates_manage"
  ON public.quotation_templates;
CREATE POLICY "quotation_templates_manage"
  ON public.quotation_templates FOR ALL
  USING (public.is_admin_or_lead())
  WITH CHECK (public.is_admin_or_lead());

-- Bucket privé commun aux documents globaux et documents de projet.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('project-documents', 'project-documents', false, 52428800)
ON CONFLICT (id) DO UPDATE
SET public = false, file_size_limit = 52428800;

DROP POLICY IF EXISTS "project_documents_storage_select" ON storage.objects;
CREATE POLICY "project_documents_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "project_documents_storage_insert" ON storage.objects;
CREATE POLICY "project_documents_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "project_documents_storage_update" ON storage.objects;
CREATE POLICY "project_documents_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'project-documents')
  WITH CHECK (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "project_documents_storage_delete" ON storage.objects;
CREATE POLICY "project_documents_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-documents');
