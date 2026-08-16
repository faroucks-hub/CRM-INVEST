-- ═══════════════════════════════════════════════════════════════════
-- IME CRM — Schéma PostgreSQL complet
-- Supabase Migration: 001_initial_schema.sql
-- Invest Mentor Énergie — Confidentiel
-- ═══════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Recherche full-text
CREATE EXTENSION IF NOT EXISTS "unaccent";      -- Recherche sans accents

-- ── Enums ───────────────────────────────────────────────────────────

-- Rôles utilisateurs
CREATE TYPE user_role AS ENUM ('admin', 'lead_team', 'commercial');

-- Statuts clients
CREATE TYPE client_status AS ENUM (
  'prospect',
  'qualifie',
  'actif',
  'inactif',
  'perdu'
);

-- Secteurs d'activité
CREATE TYPE client_sector AS ENUM (
  'banques_finance',
  'telecommunications',
  'mines_extraction',
  'data_centers',
  'hopitaux_sante',
  'marine_offshore',
  'industrie',
  'solaire_energie',
  'autre'
);

-- Priorité géographique
CREATE TYPE geo_priority AS ENUM ('priorite_1', 'priorite_2', 'expansion');

-- Statuts opportunités (pipeline)
CREATE TYPE opportunity_stage AS ENUM (
  'prospect',
  'contact',
  'qualification',
  'devis',
  'negociation',
  'gagne',
  'perdu',
  'abandonne'
);

-- Statuts projets
CREATE TYPE project_status AS ENUM (
  'commande',
  'fabrication',
  'logistique',
  'installation',
  'commissioning',
  'garantie',
  'cloture'
);

-- Étapes projets
CREATE TYPE project_step AS ENUM (
  'commande_recue',
  'acompte_recu',
  'production_lancee',
  'production_terminee',
  'expedition_istanbul',
  'en_transit',
  'arrivee_port',
  'dedouanement',
  'livraison_site',
  'installation',
  'commissioning',
  'reception_client',
  'garantie_active',
  'cloture'
);

-- Statuts quotations / proformas
CREATE TYPE document_status AS ENUM (
  'brouillon',
  'envoye',
  'en_revision',
  'accepte',
  'refuse',
  'expire',
  'annule'
);

-- Statuts paiements
CREATE TYPE payment_status AS ENUM (
  'en_attente',
  'partiel',
  'recu',
  'retard',
  'annule'
);

-- Type de paiement
CREATE TYPE payment_type AS ENUM (
  'acompte',
  'solde',
  'partiel',
  'remboursement'
);

-- Devises supportées
CREATE TYPE currency AS ENUM ('USD', 'EUR', 'TRY', 'XOF');

-- Catégories produits
CREATE TYPE product_category AS ENUM (
  'ups_monophase',
  'ups_triphase',
  'ups_industriel',
  'redresseur',
  'onduleur',
  'convertisseur_frequence',
  'sts',
  'batterie_vrla',
  'batterie_liion',
  'batterie_opzs',
  'batterie_nicd',
  'systeme_solaire',
  'bess',
  'tableau_distribution',
  'regulateur_tension',
  'accessoire',
  'service',
  'autre'
);

-- ── TABLE: users_profiles ────────────────────────────────────────────
-- Liée à auth.users de Supabase (1-to-1)
CREATE TABLE public.users_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'commercial',
  avatar_url      TEXT,
  phone           TEXT,
  position        TEXT,                    -- Titre du poste
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  preferences     JSONB DEFAULT '{}',      -- Préférences UI (thème, langue...)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users_profiles IS 'Profils utilisateurs IME CRM — liés à Supabase Auth';
COMMENT ON COLUMN public.users_profiles.role IS 'admin: accès complet | lead_team: accès étendu | commercial: accès limité (jamais prix achat/marges)';

-- ── TABLE: clients ───────────────────────────────────────────────────
CREATE TABLE public.clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference       TEXT UNIQUE,             -- IME-CLI-0001
  company_name    TEXT NOT NULL,
  trade_name      TEXT,                    -- Nom commercial si différent
  sector          client_sector,
  status          client_status NOT NULL DEFAULT 'prospect',
  country         TEXT NOT NULL,
  city            TEXT,
  address         TEXT,
  website         TEXT,
  -- Contact principal
  contact_name    TEXT,
  contact_title   TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  contact_whatsapp TEXT,
  -- Contact secondaire
  contact2_name   TEXT,
  contact2_email  TEXT,
  contact2_phone  TEXT,
  -- Informations commerciales
  assigned_to     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  source          TEXT,                    -- LinkedIn, recommandation, salon...
  currency_pref   currency DEFAULT 'USD',
  payment_terms   TEXT,                    -- Conditions de paiement négociées
  credit_limit    NUMERIC(15,2),
  -- Informations techniques
  technical_notes TEXT,                    -- Notes techniques (réseau, tension, puissance...)
  -- Métadonnées
  tags            TEXT[],
  notes           TEXT,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_company ON public.clients USING gin(company_name gin_trgm_ops);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_assigned ON public.clients(assigned_to);
CREATE INDEX idx_clients_country ON public.clients(country);

COMMENT ON TABLE public.clients IS 'Clients et prospects IME CRM';
COMMENT ON COLUMN public.clients.technical_notes IS 'Visible par admin et lead_team uniquement';

-- ── TABLE: suppliers ────────────────────────────────────────────────
-- Partenaires fabricants — JAMAIS visible par les commerciaux
CREATE TABLE public.suppliers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference       TEXT UNIQUE,             -- IME-SUP-0001
  company_name    TEXT NOT NULL,
  country         TEXT NOT NULL DEFAULT 'Turquie',
  city            TEXT,
  website         TEXT,
  -- Contact
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  -- Certifications
  certifications  TEXT[],                  -- CE, ISO 9001, IEC 62040-3...
  -- Informations commerciales (SENSIBLES — admin/lead_team uniquement)
  payment_terms   TEXT,
  currency_pref   currency DEFAULT 'USD',
  lead_time_days  INT,                     -- Délai de fabrication standard
  discount_rate   NUMERIC(5,2),            -- Taux de remise négocié
  -- Gamme
  product_categories product_category[],
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_preferred    BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.suppliers IS 'Partenaires fabricants — CONFIDENTIEL — admin/lead_team uniquement';

-- ── TABLE: opportunities ─────────────────────────────────────────────
CREATE TABLE public.opportunities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference       TEXT UNIQUE,             -- IME-25-OPP-0001
  name            TEXT NOT NULL,
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  assigned_to     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  stage           opportunity_stage NOT NULL DEFAULT 'prospect',
  -- Valeurs (le commercial voit uniquement sell_value)
  estimated_sell  NUMERIC(15,2),           -- Prix de vente estimé (visible commercial)
  estimated_buy   NUMERIC(15,2),           -- Prix d'achat estimé (CONFIDENTIEL)
  estimated_margin NUMERIC(5,2),           -- Marge % estimée (CONFIDENTIEL)
  currency        currency NOT NULL DEFAULT 'USD',
  -- Informations
  sector          client_sector,
  product_type    product_category,
  description     TEXT,
  technical_specs TEXT,
  -- Suivi
  probability     INT DEFAULT 20 CHECK (probability BETWEEN 0 AND 100),
  expected_close  DATE,
  lost_reason     TEXT,
  -- Métadonnées
  source          TEXT,
  tags            TEXT[],
  notes           TEXT,
  created_by      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opps_client ON public.opportunities(client_id);
CREATE INDEX idx_opps_assigned ON public.opportunities(assigned_to);
CREATE INDEX idx_opps_stage ON public.opportunities(stage);

COMMENT ON COLUMN public.opportunities.estimated_buy IS 'CONFIDENTIEL — admin/lead_team uniquement';
COMMENT ON COLUMN public.opportunities.estimated_margin IS 'CONFIDENTIEL — admin/lead_team uniquement';

-- ── TABLE: products ──────────────────────────────────────────────────
CREATE TABLE public.products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference       TEXT NOT NULL UNIQUE,    -- IME-PROD-0001 ou REF fabricant
  name            TEXT NOT NULL,
  description     TEXT,
  category        product_category NOT NULL,
  supplier_id     UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  -- Spécifications techniques
  specs           JSONB DEFAULT '{}',      -- { power_kva, voltage, phases, autonomy... }
  -- Prix (CONFIDENTIEL — commercial ne voit jamais buy_price)
  buy_price       NUMERIC(15,2),           -- Prix d'achat (CONFIDENTIEL)
  list_price      NUMERIC(15,2),           -- Prix catalogue de vente
  currency        currency NOT NULL DEFAULT 'USD',
  -- Logistique
  lead_time_days  INT,
  weight_kg       NUMERIC(8,2),
  dimensions      TEXT,                    -- LxlxH en cm
  -- Certifications
  certifications  TEXT[],
  -- Métadonnées
  datasheet_url   TEXT,
  image_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  notes           TEXT,
  created_by      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_supplier ON public.products(supplier_id);

COMMENT ON COLUMN public.products.buy_price IS 'CONFIDENTIEL — admin/lead_team uniquement';

-- ── TABLE: quotations ────────────────────────────────────────────────
CREATE TABLE public.quotations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Numérotation : IME-25-Q0001
  number          TEXT NOT NULL UNIQUE,
  year            SMALLINT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::SMALLINT,
  sequence        INT NOT NULL,
  -- Relations
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  opportunity_id  UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  -- Statut
  status          document_status NOT NULL DEFAULT 'brouillon',
  -- Validité
  issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until     DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  -- Devise
  currency        currency NOT NULL DEFAULT 'USD',
  -- Totaux (calculés depuis quotation_items)
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_sell      NUMERIC(15,2) NOT NULL DEFAULT 0,  -- Prix vente total (visible commercial)
  total_buy       NUMERIC(15,2) NOT NULL DEFAULT 0,  -- Prix achat total (CONFIDENTIEL)
  total_margin    NUMERIC(5,2) NOT NULL DEFAULT 0,   -- Marge % (CONFIDENTIEL)
  -- Contenu
  intro_text      TEXT,
  payment_terms   TEXT DEFAULT 'Acompte 30% à la commande, solde avant expédition',
  delivery_terms  TEXT DEFAULT 'DAP port africain',
  warranty_terms  TEXT DEFAULT 'Garantie fabricant 2 ans',
  notes           TEXT,
  internal_notes  TEXT,                    -- Notes internes (CONFIDENTIEL)
  -- Suivi
  sent_at         TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  -- Métadonnées
  created_by      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotations_client ON public.quotations(client_id);
CREATE INDEX idx_quotations_status ON public.quotations(status);
CREATE INDEX idx_quotations_assigned ON public.quotations(assigned_to);
CREATE INDEX idx_quotations_number ON public.quotations(number);

COMMENT ON COLUMN public.quotations.total_buy IS 'CONFIDENTIEL — admin/lead_team uniquement';
COMMENT ON COLUMN public.quotations.total_margin IS 'CONFIDENTIEL — admin/lead_team uniquement';
COMMENT ON COLUMN public.quotations.internal_notes IS 'CONFIDENTIEL — admin/lead_team uniquement';

-- ── TABLE: quotation_items ───────────────────────────────────────────
CREATE TABLE public.quotation_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id    UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  -- Position
  sort_order      INT NOT NULL DEFAULT 0,
  -- Description (peut être libre si pas de produit catalogue)
  description     TEXT NOT NULL,
  reference       TEXT,
  category        product_category,
  specs           JSONB DEFAULT '{}',
  -- Quantités
  quantity        NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit            TEXT NOT NULL DEFAULT 'unité',
  -- Prix — le commercial ne voit que unit_sell_price et line_total_sell
  unit_buy_price  NUMERIC(15,2),           -- Prix unitaire achat (CONFIDENTIEL)
  unit_sell_price NUMERIC(15,2) NOT NULL,  -- Prix unitaire vente
  margin_pct      NUMERIC(5,2),            -- Marge % (CONFIDENTIEL)
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Totaux ligne
  line_total_buy  NUMERIC(15,2),           -- Total ligne achat (CONFIDENTIEL)
  line_total_sell NUMERIC(15,2) NOT NULL,  -- Total ligne vente
  -- Notes
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qitems_quotation ON public.quotation_items(quotation_id);

COMMENT ON COLUMN public.quotation_items.unit_buy_price IS 'CONFIDENTIEL — admin/lead_team uniquement';
COMMENT ON COLUMN public.quotation_items.margin_pct IS 'CONFIDENTIEL — admin/lead_team uniquement';
COMMENT ON COLUMN public.quotation_items.line_total_buy IS 'CONFIDENTIEL — admin/lead_team uniquement';

-- ── TABLE: proformas ────────────────────────────────────────────────
CREATE TABLE public.proformas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Numérotation : IME-25-F0001
  number          TEXT NOT NULL UNIQUE,
  year            SMALLINT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::SMALLINT,
  sequence        INT NOT NULL,
  -- Relations
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  quotation_id    UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  opportunity_id  UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  -- Statut
  status          document_status NOT NULL DEFAULT 'brouillon',
  -- Dates
  issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until     DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  -- Devise
  currency        currency NOT NULL DEFAULT 'USD',
  -- Totaux
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_sell      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_buy       NUMERIC(15,2) NOT NULL DEFAULT 0,  -- CONFIDENTIEL
  total_margin    NUMERIC(5,2) NOT NULL DEFAULT 0,   -- CONFIDENTIEL
  -- Contenu
  intro_text      TEXT,
  payment_terms   TEXT DEFAULT 'Acompte 30% à la commande, solde avant expédition',
  incoterm        TEXT DEFAULT 'DAP',
  port_destination TEXT,
  warranty_terms  TEXT DEFAULT 'Garantie fabricant 2 ans',
  notes           TEXT,
  internal_notes  TEXT,                    -- CONFIDENTIEL
  -- Suivi
  sent_at         TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  -- Métadonnées
  created_by      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proformas_client ON public.proformas(client_id);
CREATE INDEX idx_proformas_status ON public.proformas(status);

-- ── TABLE: proforma_items ────────────────────────────────────────────
CREATE TABLE public.proforma_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proforma_id     UUID NOT NULL REFERENCES public.proformas(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  description     TEXT NOT NULL,
  reference       TEXT,
  category        product_category,
  specs           JSONB DEFAULT '{}',
  quantity        NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit            TEXT NOT NULL DEFAULT 'unité',
  unit_buy_price  NUMERIC(15,2),           -- CONFIDENTIEL
  unit_sell_price NUMERIC(15,2) NOT NULL,
  margin_pct      NUMERIC(5,2),            -- CONFIDENTIEL
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total_buy  NUMERIC(15,2),           -- CONFIDENTIEL
  line_total_sell NUMERIC(15,2) NOT NULL,
  hs_code         TEXT,                    -- Code douanier
  country_origin  TEXT DEFAULT 'Turquie',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pfitems_proforma ON public.proforma_items(proforma_id);

-- ── TABLE: projects ──────────────────────────────────────────────────
CREATE TABLE public.projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference       TEXT NOT NULL UNIQUE,    -- IME-25-PRJ-0001
  name            TEXT NOT NULL,
  -- Relations
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  opportunity_id  UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  quotation_id    UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  proforma_id     UUID REFERENCES public.proformas(id) ON DELETE SET NULL,
  supplier_id     UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  -- Statut
  status          project_status NOT NULL DEFAULT 'commande',
  current_step    project_step NOT NULL DEFAULT 'commande_recue',
  progress_pct    INT NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  -- Dates
  order_date      DATE,
  expected_delivery DATE,
  actual_delivery   DATE,
  -- Valeurs financières
  contract_value  NUMERIC(15,2),           -- Valeur vente signée (visible commercial)
  total_cost      NUMERIC(15,2),           -- Coût total projet (CONFIDENTIEL)
  actual_margin   NUMERIC(5,2),            -- Marge réelle (CONFIDENTIEL)
  currency        currency NOT NULL DEFAULT 'USD',
  -- Informations techniques
  product_description TEXT,
  specs           JSONB DEFAULT '{}',
  -- Informations logistiques
  incoterm        TEXT DEFAULT 'DAP',
  port_destination TEXT,
  shipper         TEXT,
  tracking_number TEXT,
  -- Garantie
  warranty_start  DATE,
  warranty_end    DATE,
  warranty_months INT NOT NULL DEFAULT 24,
  -- Notes
  notes           TEXT,
  internal_notes  TEXT,                    -- CONFIDENTIEL
  -- Métadonnées
  created_by      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_client ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_assigned ON public.projects(assigned_to);

COMMENT ON COLUMN public.projects.total_cost IS 'CONFIDENTIEL — admin/lead_team uniquement';
COMMENT ON COLUMN public.projects.actual_margin IS 'CONFIDENTIEL — admin/lead_team uniquement';

-- ── TABLE: project_steps ─────────────────────────────────────────────
CREATE TABLE public.project_steps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  step            project_step NOT NULL,
  label           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','skipped')),
  planned_date    DATE,
  actual_date     DATE,
  notes           TEXT,
  attachments     TEXT[],
  completed_by    UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_psteps_project ON public.project_steps(project_id);

-- ── TABLE: payments ──────────────────────────────────────────────────
CREATE TABLE public.payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Relations
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  proforma_id     UUID REFERENCES public.proformas(id) ON DELETE SET NULL,
  -- Paiement
  payment_type    payment_type NOT NULL,
  status          payment_status NOT NULL DEFAULT 'en_attente',
  amount          NUMERIC(15,2) NOT NULL,
  currency        currency NOT NULL DEFAULT 'USD',
  exchange_rate   NUMERIC(10,6) DEFAULT 1,  -- Taux de change si conversion
  amount_usd      NUMERIC(15,2),            -- Montant en USD (référence)
  -- Dates
  expected_date   DATE,
  received_date   DATE,
  -- Références
  bank_reference  TEXT,
  swift_code      TEXT,
  notes           TEXT,
  -- Métadonnées
  recorded_by     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_client ON public.payments(client_id);
CREATE INDEX idx_payments_project ON public.payments(project_id);

-- ── TABLE: documents ─────────────────────────────────────────────────
CREATE TABLE public.documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  file_path       TEXT NOT NULL,           -- Chemin dans Supabase Storage
  file_size       INT,
  mime_type       TEXT,
  -- Relations (polymorphique)
  client_id       UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  quotation_id    UUID REFERENCES public.quotations(id) ON DELETE CASCADE,
  proforma_id     UUID REFERENCES public.proformas(id) ON DELETE CASCADE,
  -- Catégorie
  category        TEXT,                    -- 'contrat', 'facture', 'BL', 'certificat', 'autre'
  description     TEXT,
  is_confidential BOOLEAN NOT NULL DEFAULT false,  -- Si true: admin/lead_team uniquement
  -- Métadonnées
  uploaded_by     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_project ON public.documents(project_id);
CREATE INDEX idx_documents_client ON public.documents(client_id);

-- ── TABLE: technical_calculations ────────────────────────────────────
-- Prépare l'architecture pour les calculateurs UPS/batteries/rectifiers
CREATE TABLE public.technical_calculations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,           -- 'ups', 'battery', 'rectifier', 'solar'
  -- Relations
  client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  opportunity_id  UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  -- Données de calcul (schéma flexible pour futurs calculateurs)
  inputs          JSONB NOT NULL DEFAULT '{}',
  results         JSONB NOT NULL DEFAULT '{}',
  recommendations JSONB DEFAULT '{}',
  -- Voltia AI (futur assistant IA)
  ai_analysis     TEXT,                    -- Analyse générée par Voltia AI
  ai_model        TEXT,                    -- Modèle IA utilisé
  ai_generated_at TIMESTAMPTZ,
  -- Métadonnées
  version         INT NOT NULL DEFAULT 1,
  notes           TEXT,
  created_by      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calc_type ON public.technical_calculations(type);
CREATE INDEX idx_calc_client ON public.technical_calculations(client_id);

COMMENT ON TABLE public.technical_calculations IS 'Prépare les calculateurs UPS/batteries et Voltia AI — Sprint futur';
COMMENT ON COLUMN public.technical_calculations.ai_analysis IS 'Réservé Voltia AI — Sprint futur';

-- ── SÉQUENCES pour numérotation ──────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS seq_quotation_number START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS seq_proforma_number START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS seq_project_number START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS seq_client_number START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS seq_supplier_number START 1 INCREMENT 1;

-- ── FONCTIONS UTILITAIRES ─────────────────────────────────────────────

-- Génère la référence client
CREATE OR REPLACE FUNCTION generate_client_reference()
RETURNS TEXT AS $$
BEGIN
  RETURN 'IME-CLI-' || LPAD(nextval('seq_client_number')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Génère le numéro de quotation : IME-25-Q0001
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TEXT AS $$
DECLARE
  year_short TEXT;
  seq_num INT;
BEGIN
  year_short := EXTRACT(YEAR FROM NOW())::TEXT;
  year_short := RIGHT(year_short, 2);
  seq_num := nextval('seq_quotation_number');
  RETURN 'IME-' || year_short || '-Q' || LPAD(seq_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Génère le numéro de proforma : IME-25-F0001
CREATE OR REPLACE FUNCTION generate_proforma_number()
RETURNS TEXT AS $$
DECLARE
  year_short TEXT;
  seq_num INT;
BEGIN
  year_short := RIGHT(EXTRACT(YEAR FROM NOW())::TEXT, 2);
  seq_num := nextval('seq_proforma_number');
  RETURN 'IME-' || year_short || '-F' || LPAD(seq_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Génère la référence projet : IME-25-PRJ-0001
CREATE OR REPLACE FUNCTION generate_project_reference()
RETURNS TEXT AS $$
DECLARE
  year_short TEXT;
  seq_num INT;
BEGIN
  year_short := RIGHT(EXTRACT(YEAR FROM NOW())::TEXT, 2);
  seq_num := nextval('seq_project_number');
  RETURN 'IME-' || year_short || '-PRJ-' || LPAD(seq_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Met à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── TRIGGERS updated_at ───────────────────────────────────────────────
CREATE TRIGGER trg_users_profiles_updated BEFORE UPDATE ON public.users_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated        BEFORE UPDATE ON public.clients         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_suppliers_updated      BEFORE UPDATE ON public.suppliers        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_opportunities_updated  BEFORE UPDATE ON public.opportunities    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated       BEFORE UPDATE ON public.products         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_quotations_updated     BEFORE UPDATE ON public.quotations       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_proformas_updated      BEFORE UPDATE ON public.proformas        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated       BEFORE UPDATE ON public.projects         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_project_steps_updated  BEFORE UPDATE ON public.project_steps   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated       BEFORE UPDATE ON public.payments         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tech_calc_updated      BEFORE UPDATE ON public.technical_calculations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger auto-création profil après signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'commercial')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════

-- Activer RLS sur toutes les tables
ALTER TABLE public.users_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proformas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proforma_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_steps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_calculations ENABLE ROW LEVEL SECURITY;

-- ── Fonction helper : récupère le rôle de l'utilisateur courant ────
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_lead()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('admin', 'lead_team');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── POLICIES: users_profiles ─────────────────────────────────────────
-- Chaque user voit son propre profil ; admin voit tous
CREATE POLICY "profiles_select" ON public.users_profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_update_own" ON public.users_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Le user ne peut pas changer son propre rôle
    role = (SELECT role FROM public.users_profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles_update_admin" ON public.users_profiles FOR UPDATE
  USING (is_admin());

CREATE POLICY "profiles_insert_admin" ON public.users_profiles FOR INSERT
  WITH CHECK (is_admin());

-- ── POLICIES: clients ─────────────────────────────────────────────────
-- Tous les utilisateurs authentifiés voient les clients
-- Mais les notes techniques sont filtrées côté application pour les commerciaux
CREATE POLICY "clients_select" ON public.clients FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "clients_insert" ON public.clients FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "clients_update" ON public.clients FOR UPDATE
  USING (
    -- Admin/lead_team peuvent tout modifier
    is_admin_or_lead()
    OR
    -- Commercial peut modifier uniquement ses propres clients
    (get_user_role() = 'commercial' AND assigned_to = auth.uid())
  );

CREATE POLICY "clients_delete" ON public.clients FOR DELETE
  USING (is_admin());

-- ── POLICIES: suppliers ───────────────────────────────────────────────
-- JAMAIS accessible aux commerciaux
CREATE POLICY "suppliers_all" ON public.suppliers FOR ALL
  USING (is_admin_or_lead())
  WITH CHECK (is_admin_or_lead());

-- ── POLICIES: opportunities ───────────────────────────────────────────
CREATE POLICY "opps_select" ON public.opportunities FOR SELECT
  USING (
    is_admin_or_lead()
    OR
    -- Commercial voit ses propres opportunités
    (get_user_role() = 'commercial' AND assigned_to = auth.uid())
  );

CREATE POLICY "opps_insert" ON public.opportunities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "opps_update" ON public.opportunities FOR UPDATE
  USING (
    is_admin_or_lead()
    OR
    (get_user_role() = 'commercial' AND assigned_to = auth.uid())
  );

CREATE POLICY "opps_delete" ON public.opportunities FOR DELETE
  USING (is_admin());

-- ── POLICIES: products ────────────────────────────────────────────────
-- Tous voient les produits SAUF buy_price → géré côté app
CREATE POLICY "products_select" ON public.products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "products_insert_update" ON public.products FOR INSERT
  WITH CHECK (is_admin_or_lead());

CREATE POLICY "products_update_p" ON public.products FOR UPDATE
  USING (is_admin_or_lead());

CREATE POLICY "products_delete" ON public.products FOR DELETE
  USING (is_admin());

-- ── POLICIES: quotations ──────────────────────────────────────────────
CREATE POLICY "quot_select" ON public.quotations FOR SELECT
  USING (
    is_admin_or_lead()
    OR
    (get_user_role() = 'commercial' AND assigned_to = auth.uid())
  );

CREATE POLICY "quot_insert" ON public.quotations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "quot_update" ON public.quotations FOR UPDATE
  USING (
    is_admin_or_lead()
    OR
    (get_user_role() = 'commercial' AND assigned_to = auth.uid())
  );

CREATE POLICY "quot_delete" ON public.quotations FOR DELETE
  USING (is_admin_or_lead());

-- ── POLICIES: quotation_items ─────────────────────────────────────────
CREATE POLICY "qitems_select" ON public.quotation_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (is_admin_or_lead() OR q.assigned_to = auth.uid())
    )
  );

CREATE POLICY "qitems_insert_update_delete" ON public.quotation_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (is_admin_or_lead() OR q.assigned_to = auth.uid())
    )
  );

-- ── POLICIES: proformas ───────────────────────────────────────────────
CREATE POLICY "proforma_select" ON public.proformas FOR SELECT
  USING (
    is_admin_or_lead()
    OR
    (get_user_role() = 'commercial' AND assigned_to = auth.uid())
  );

CREATE POLICY "proforma_insert" ON public.proformas FOR INSERT
  WITH CHECK (is_admin_or_lead());

CREATE POLICY "proforma_update" ON public.proformas FOR UPDATE
  USING (is_admin_or_lead());

CREATE POLICY "proforma_delete" ON public.proformas FOR DELETE
  USING (is_admin());

-- ── POLICIES: proforma_items ──────────────────────────────────────────
CREATE POLICY "pfitems_all" ON public.proforma_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.proformas p
      WHERE p.id = proforma_id AND is_admin_or_lead()
    )
  );

-- ── POLICIES: projects ────────────────────────────────────────────────
CREATE POLICY "projects_select" ON public.projects FOR SELECT
  USING (
    is_admin_or_lead()
    OR
    (get_user_role() = 'commercial' AND assigned_to = auth.uid())
  );

CREATE POLICY "projects_insert" ON public.projects FOR INSERT
  WITH CHECK (is_admin_or_lead());

CREATE POLICY "projects_update" ON public.projects FOR UPDATE
  USING (
    is_admin_or_lead()
    OR
    (get_user_role() = 'commercial' AND assigned_to = auth.uid())
  );

CREATE POLICY "projects_delete" ON public.projects FOR DELETE
  USING (is_admin());

-- ── POLICIES: project_steps ───────────────────────────────────────────
CREATE POLICY "psteps_all" ON public.project_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (is_admin_or_lead() OR p.assigned_to = auth.uid())
    )
  );

-- ── POLICIES: payments ────────────────────────────────────────────────
-- Les commerciaux ne voient pas les paiements
CREATE POLICY "payments_all" ON public.payments FOR ALL
  USING (is_admin_or_lead())
  WITH CHECK (is_admin_or_lead());

-- ── POLICIES: documents ───────────────────────────────────────────────
CREATE POLICY "docs_select" ON public.documents FOR SELECT
  USING (
    -- Documents confidentiels : admin/lead_team uniquement
    (is_confidential = false AND auth.uid() IS NOT NULL)
    OR
    is_admin_or_lead()
  );

CREATE POLICY "docs_insert" ON public.documents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "docs_delete" ON public.documents FOR DELETE
  USING (is_admin_or_lead());

-- ── POLICIES: technical_calculations ─────────────────────────────────
CREATE POLICY "calc_select" ON public.technical_calculations FOR SELECT
  USING (
    is_admin_or_lead()
    OR
    (get_user_role() = 'commercial' AND created_by = auth.uid())
  );

CREATE POLICY "calc_insert_update" ON public.technical_calculations FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════════
-- VUES SÉCURISÉES
-- ═══════════════════════════════════════════════════════════════════

-- Vue quotations pour commerciaux (sans prix achat ni marges)
CREATE OR REPLACE VIEW public.quotations_commercial AS
SELECT
  id, number, year, sequence,
  client_id, opportunity_id, assigned_to,
  status, issued_date, valid_until, currency,
  subtotal, discount_amount, discount_pct,
  total_sell,           -- ✓ Prix vente
  -- total_buy exclu       -- ✗ Caché
  -- total_margin exclu    -- ✗ Caché
  intro_text, payment_terms, delivery_terms, warranty_terms, notes,
  -- internal_notes exclu  -- ✗ Caché
  sent_at, accepted_at, rejected_at,
  created_by, created_at, updated_at
FROM public.quotations;

-- Vue items pour commerciaux (sans prix achat ni marges)
CREATE OR REPLACE VIEW public.quotation_items_commercial AS
SELECT
  id, quotation_id, product_id, sort_order,
  description, reference, category, specs,
  quantity, unit,
  -- unit_buy_price exclu  -- ✗ Caché
  unit_sell_price,      -- ✓
  -- margin_pct exclu      -- ✗ Caché
  discount_pct,
  -- line_total_buy exclu  -- ✗ Caché
  line_total_sell,      -- ✓
  notes, created_at
FROM public.quotation_items;

-- Vue produits pour commerciaux (sans prix achat)
CREATE OR REPLACE VIEW public.products_commercial AS
SELECT
  id, reference, name, description, category,
  supplier_id,
  specs, list_price, currency,
  -- buy_price exclu        -- ✗ Caché
  lead_time_days, weight_kg, dimensions,
  certifications, datasheet_url, image_url,
  is_active, is_featured, notes,
  created_at, updated_at
FROM public.products;

-- Vue dashboard performance commerciale
CREATE OR REPLACE VIEW public.commercial_performance AS
SELECT
  u.id,
  u.full_name,
  u.role,
  COUNT(DISTINCT o.id) FILTER (WHERE o.stage NOT IN ('perdu','abandonne')) AS active_opportunities,
  COUNT(DISTINCT o.id) FILTER (WHERE o.stage = 'gagne') AS won_opportunities,
  COUNT(DISTINCT q.id) AS total_quotations,
  COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'accepte') AS accepted_quotations,
  COUNT(DISTINCT p.id) AS active_projects,
  COALESCE(SUM(q.total_sell) FILTER (WHERE q.status = 'accepte'), 0) AS total_revenue_sell,
  COALESCE(SUM(q.total_buy) FILTER (WHERE q.status = 'accepte'), 0) AS total_revenue_buy  -- Admin seulement
FROM public.users_profiles u
LEFT JOIN public.opportunities o ON o.assigned_to = u.id
LEFT JOIN public.quotations q ON q.assigned_to = u.id
LEFT JOIN public.projects p ON p.assigned_to = u.id AND p.status NOT IN ('cloture')
GROUP BY u.id, u.full_name, u.role;

COMMENT ON VIEW public.commercial_performance IS 'Statistiques de performance par commercial — total_revenue_buy filtré côté app pour commerciaux';

-- ═══════════════════════════════════════════════════════════════════
-- DONNÉES INITIALES (seed minimal)
-- ═══════════════════════════════════════════════════════════════════

-- Note : Le premier admin est créé via Supabase Dashboard ou script
-- Les rôles sont assignés manuellement par l'admin dans users_profiles
