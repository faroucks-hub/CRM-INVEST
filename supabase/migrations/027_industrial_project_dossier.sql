-- ============================================================================
-- 027_industrial_project_dossier.sql
-- IME CRM — Phase 4 : dossier projet industriel contrôlé.
-- Document Register / MDR, Equipment List, Nameplate List et jalons de clôture.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_document_register (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projets_v2(id) ON DELETE CASCADE,
  document_code TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  current_revision TEXT NOT NULL DEFAULT '00',
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','draft','submitted','commented','revise_resubmit','approved','final','waived')),
  required BOOLEAN NOT NULL DEFAULT true,
  planned_submission_date DATE,
  actual_submission_date DATE,
  approval_date DATE,
  responsible TEXT,
  current_document_id UUID REFERENCES public.project_documents(id) ON DELETE SET NULL,
  remarks TEXT,
  created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, document_code)
);

CREATE TABLE IF NOT EXISTS public.project_equipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projets_v2(id) ON DELETE CASCADE,
  item_no TEXT,
  tag_no TEXT,
  description TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  rating TEXT,
  input_spec TEXT,
  output_spec TEXT,
  serial_no TEXT,
  equipment_status TEXT NOT NULL DEFAULT 'planned'
    CHECK (equipment_status IN ('planned','ordered','in_production','tested','ready','shipped','delivered','cancelled')),
  remarks TEXT,
  created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_nameplate_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projets_v2(id) ON DELETE CASCADE,
  equipment_item_id UUID REFERENCES public.project_equipment_items(id) ON DELETE SET NULL,
  tag_no TEXT,
  equipment TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_no TEXT,
  rating TEXT,
  input_data TEXT,
  output_data TEXT,
  protection_ip TEXT,
  frequency TEXT,
  manufacture_year SMALLINT CHECK (manufacture_year IS NULL OR manufacture_year BETWEEN 2000 AND 2200),
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','verified','non_conforming','not_applicable')),
  remarks TEXT,
  created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_completion_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projets_v2(id) ON DELETE CASCADE,
  checklist_key TEXT NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'closing',
  required BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','available','approved','not_applicable')),
  project_document_id UUID REFERENCES public.project_documents(id) ON DELETE SET NULL,
  remarks TEXT,
  updated_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, checklist_key)
);

CREATE INDEX IF NOT EXISTS idx_project_doc_register_project ON public.project_document_register(project_id, category, document_code);
CREATE INDEX IF NOT EXISTS idx_project_equipment_project ON public.project_equipment_items(project_id, item_no);
CREATE INDEX IF NOT EXISTS idx_project_nameplates_project ON public.project_nameplate_items(project_id, tag_no);
CREATE INDEX IF NOT EXISTS idx_project_completion_project ON public.project_completion_checklist(project_id, category, checklist_key);

DROP TRIGGER IF EXISTS trg_project_document_register_updated ON public.project_document_register;
CREATE TRIGGER trg_project_document_register_updated BEFORE UPDATE ON public.project_document_register
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_project_equipment_items_updated ON public.project_equipment_items;
CREATE TRIGGER trg_project_equipment_items_updated BEFORE UPDATE ON public.project_equipment_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_project_nameplate_items_updated ON public.project_nameplate_items;
CREATE TRIGGER trg_project_nameplate_items_updated BEFORE UPDATE ON public.project_nameplate_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_project_completion_checklist_updated ON public.project_completion_checklist;
CREATE TRIGGER trg_project_completion_checklist_updated BEFORE UPDATE ON public.project_completion_checklist
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.project_document_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_nameplate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_completion_checklist ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['project_document_register','project_equipment_items','project_nameplate_items','project_completion_checklist']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_access', t);
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.projets_v2 p
        WHERE p.id = project_id
          AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.projets_v2 p
        WHERE p.id = project_id
          AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
      ))
    $p$, t || '_access', t);
  END LOOP;
END $$;

-- Dossier de clôture standard : créé une seule fois par projet existant.
INSERT INTO public.project_completion_checklist(project_id, checklist_key, label, category, required)
SELECT p.id, x.key, x.label, x.category, x.required
FROM public.projets_v2 p
CROSS JOIN (VALUES
  ('fat_report','FAT / Factory Test Report','quality',true),
  ('approved_drawings','Approved / As-built Drawings','engineering',true),
  ('equipment_list','Final Equipment List','engineering',true),
  ('nameplate_list','Verified Nameplate List','quality',true),
  ('commercial_invoice','Commercial Invoice','commercial',true),
  ('packing_list','Packing List','logistics',true),
  ('delivery_note','Delivery Note','logistics',false),
  ('shipping_document','Shipping / Transport Document','logistics',true),
  ('certificate_origin','Certificate of Origin','logistics',false),
  ('warranty_certificate','Warranty Certificate / Warranty Statement','closing',true),
  ('manuals','Operation / User Manuals','closing',true)
) AS x(key,label,category,required)
ON CONFLICT(project_id, checklist_key) DO NOTHING;

-- Initialise automatiquement le dossier de clôture pour tout nouveau projet.
CREATE OR REPLACE FUNCTION public.seed_project_completion_checklist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_completion_checklist(project_id, checklist_key, label, category, required)
  VALUES
    (NEW.id,'fat_report','FAT / Factory Test Report','quality',true),
    (NEW.id,'approved_drawings','Approved / As-built Drawings','engineering',true),
    (NEW.id,'equipment_list','Final Equipment List','engineering',true),
    (NEW.id,'nameplate_list','Verified Nameplate List','quality',true),
    (NEW.id,'commercial_invoice','Commercial Invoice','commercial',true),
    (NEW.id,'packing_list','Packing List','logistics',true),
    (NEW.id,'delivery_note','Delivery Note','logistics',false),
    (NEW.id,'shipping_document','Shipping / Transport Document','logistics',true),
    (NEW.id,'certificate_origin','Certificate of Origin','logistics',false),
    (NEW.id,'warranty_certificate','Warranty Certificate / Warranty Statement','closing',true),
    (NEW.id,'manuals','Operation / User Manuals','closing',true)
  ON CONFLICT(project_id, checklist_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_project_completion_checklist ON public.projets_v2;
CREATE TRIGGER trg_seed_project_completion_checklist
AFTER INSERT ON public.projets_v2
FOR EACH ROW EXECUTE FUNCTION public.seed_project_completion_checklist();
