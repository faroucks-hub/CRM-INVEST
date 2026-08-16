-- ═══════════════════════════════════════════════════════════════════
-- IME CRM — Sprint 2 Migration
-- Fichier: 002_sprint2_clients_suppliers_opportunities.sql
-- ═══════════════════════════════════════════════════════════════════

-- ── Nouveaux types ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE supplier_type AS ENUM (
    'fabricant_turc',
    'fabricant_hors_turquie',
    'partenaire_technique',
    'sous_traitant',
    'distributeur'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_source AS ENUM (
    'linkedin', 'whatsapp', 'salon', 'recommandation',
    'email', 'site_web', 'autre'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE opp_pipeline_stage AS ENUM (
    'nouveau_lead',
    'besoin_identifie',
    'etude_technique',
    'offre_preparation',
    'offre_envoyee',
    'negociation',
    'commande_recue',
    'projet_en_cours',
    'projet_livre',
    'perdu_annule'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Colonnes supplémentaires clients ──────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS lead_source     lead_source,
  ADD COLUMN IF NOT EXISTS whatsapp        TEXT,
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS supplier_type   supplier_type;

-- ── Colonnes supplémentaires fournisseurs ─────────────────────────
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS supplier_type   supplier_type NOT NULL DEFAULT 'fabricant_turc',
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp        TEXT,
  ADD COLUMN IF NOT EXISTS products_supplied TEXT;

-- ── Colonne pipeline_stage sur opportunities ───────────────────────
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS pipeline_stage  opp_pipeline_stage NOT NULL DEFAULT 'nouveau_lead',
  ADD COLUMN IF NOT EXISTS next_followup   DATE,
  ADD COLUMN IF NOT EXISTS lead_source     lead_source;

-- ── Index supplémentaires ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_lead_source  ON public.clients(lead_source);
CREATE INDEX IF NOT EXISTS idx_opps_pipeline        ON public.opportunities(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_opps_followup        ON public.opportunities(next_followup);
CREATE INDEX IF NOT EXISTS idx_suppliers_type       ON public.suppliers(supplier_type);

-- Génère la référence fournisseur
CREATE OR REPLACE FUNCTION generate_supplier_reference()
RETURNS TEXT AS $$
BEGIN
  RETURN 'IME-SUP-' || LPAD(nextval('seq_supplier_number')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
