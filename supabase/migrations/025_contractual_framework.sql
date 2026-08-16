-- Phase 2 — Cadre contractuel versionné
-- Customer Terms: Facilitation / Revente / Distribution
-- Partner Terms: Purchase Terms pour les Purchase Orders

CREATE TABLE IF NOT EXISTS public.commercial_terms_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('customer','partner')),
  commercial_role text NOT NULL CHECK (commercial_role IN ('facilitation','resale','distribution','purchase')),
  version text NOT NULL,
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','fr')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  role_summary text,
  terms_text text NOT NULL,
  effective_from date,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code, version, language)
);

CREATE INDEX IF NOT EXISTS idx_terms_profiles_lookup
  ON public.commercial_terms_profiles(audience, commercial_role, status, language);

-- Les documents conservent un snapshot : une nouvelle version des conditions
-- ne modifie jamais rétroactivement une transaction historique.
ALTER TABLE public.quotations_v2
  ADD COLUMN IF NOT EXISTS commercial_role text,
  ADD COLUMN IF NOT EXISTS terms_profile_id uuid REFERENCES public.commercial_terms_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS terms_code text,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_snapshot text;

ALTER TABLE public.proformas_v2
  ADD COLUMN IF NOT EXISTS commercial_role text,
  ADD COLUMN IF NOT EXISTS terms_profile_id uuid REFERENCES public.commercial_terms_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS terms_code text,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_snapshot text;

ALTER TABLE public.projets_v2
  ADD COLUMN IF NOT EXISTS commercial_role text,
  ADD COLUMN IF NOT EXISTS terms_profile_id uuid REFERENCES public.commercial_terms_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS terms_code text,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_snapshot text;

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS purchase_terms_profile_id uuid REFERENCES public.commercial_terms_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purchase_terms_code text,
  ADD COLUMN IF NOT EXISTS purchase_terms_version text,
  ADD COLUMN IF NOT EXISTS purchase_terms_snapshot text;

-- Contrôles souples : NULL reste autorisé pour les anciens documents.
DO $$ BEGIN
  ALTER TABLE public.quotations_v2 ADD CONSTRAINT quotations_commercial_role_chk
    CHECK (commercial_role IS NULL OR commercial_role IN ('facilitation','resale','distribution'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.proformas_v2 ADD CONSTRAINT proformas_commercial_role_chk
    CHECK (commercial_role IS NULL OR commercial_role IN ('facilitation','resale','distribution'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.projets_v2 ADD CONSTRAINT projects_commercial_role_chk
    CHECK (commercial_role IS NULL OR commercial_role IN ('facilitation','resale','distribution'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.commercial_terms_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commercial_terms_profiles_read ON public.commercial_terms_profiles;
CREATE POLICY commercial_terms_profiles_read ON public.commercial_terms_profiles
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS commercial_terms_profiles_admin ON public.commercial_terms_profiles;
CREATE POLICY commercial_terms_profiles_admin ON public.commercial_terms_profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users_profiles u WHERE u.id = auth.uid() AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users_profiles u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Brouillons initiaux. Ils structurent le CRM mais doivent être validés juridiquement
-- avant activation et utilisation contractuelle externe.
INSERT INTO public.commercial_terms_profiles
(code,name,audience,commercial_role,version,language,status,role_summary,terms_text,is_default)
VALUES
('IME-TC-FAC','Customer Terms — Facilitation','customer','facilitation','V1.0','en','draft',
 'IM Energie acts as a commercial and technical facilitator between the customer and selected industrial manufacturers/partners.',
 'DRAFT — LEGAL REVIEW REQUIRED. IM Energie facilitates commercial and technical coordination. Unless expressly stated otherwise, IM Energie is not the manufacturer of the equipment. Product design, manufacturing, factory testing and manufacturer warranty remain subject to the relevant manufacturer documentation and conditions. Scope, price, payment, delivery, Incoterm, inspection/FAT, warranty coordination, claims, cancellation, force majeure and limitation of liability shall be governed by the final approved version of these terms.',true),
('IME-TC-RES','Customer Terms — Resale','customer','resale','V1.0','en','draft',
 'IM Energie acts as contractual reseller of equipment manufactured by third-party industrial manufacturers.',
 'DRAFT — LEGAL REVIEW REQUIRED. IM Energie may act as contractual seller/reseller for the transaction while remaining distinct from the manufacturer. Product design and intrinsic manufacturing obligations remain with the relevant manufacturer, subject to applicable law and the final contract. Scope, payment, technical approval, changes, delivery, transfer of risk, inspection/FAT, manufacturer warranty coordination, claims, cancellation, force majeure and limitation of liability shall be governed by the final approved version of these terms.',true),
('IME-TC-DIST','Customer Terms — Distribution','customer','distribution','V1.0','en','draft',
 'IM Energie acts as distributor only where a valid distribution authorization/agreement applies to the relevant products.',
 'DRAFT — LEGAL REVIEW REQUIRED. Distribution status applies only to products and territories covered by a valid distribution agreement. No representation of authorization shall be made outside that scope. Product warranty, technical obligations, delivery, claims and other commercial conditions remain subject to the final approved customer terms and the applicable manufacturer/distribution agreement.',true),
('IME-PTC','Partner Purchase Terms','partner','purchase','V1.0','en','draft',
 'Purchase terms issued by IM Energie to the selected manufacturer/supplier with the Purchase Order.',
 'DRAFT — LEGAL REVIEW REQUIRED. The supplier shall comply with the Purchase Order, approved technical specifications, documentation requirements, agreed delivery schedule, inspection/FAT requirements, packaging, notification of delay, warranty obligations and authorized change-control process. The final approved Purchase Terms shall govern acceptance, non-conformity, claims, replacement/repair, cancellation, force majeure and applicable liability.',true)
ON CONFLICT (code,version,language) DO NOTHING;
