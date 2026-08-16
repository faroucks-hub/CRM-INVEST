-- ═══════════════════════════════════════════════════════════════════
-- IME CRM — Sprint 7 : Paramètres entreprise & Audit Log
-- ═══════════════════════════════════════════════════════════════════

-- ── Table paramètres entreprise ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_settings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Identité
  company_name         TEXT NOT NULL DEFAULT 'Invest Mentor Énergie',
  company_tagline      TEXT DEFAULT 'Hub Énergétique Turquie — Afrique',
  logo_url             TEXT,
  -- Coordonnées
  address              TEXT DEFAULT 'Istanbul, Turquie',
  website              TEXT DEFAULT 'www.investmentor-energie.com',
  email_principal      TEXT DEFAULT 'contact@investmentor-energie.com',
  email_commercial     TEXT,
  phone_principal      TEXT,
  phone_whatsapp       TEXT,
  -- Informations bancaires (pour proformas)
  bank_name            TEXT,
  bank_iban            TEXT,
  bank_swift           TEXT,
  bank_account         TEXT,
  bank_address         TEXT,
  bank_currency        TEXT DEFAULT 'USD',
  -- Conditions commerciales par défaut
  default_currency     TEXT DEFAULT 'USD',
  default_incoterm     TEXT DEFAULT 'DAP',
  default_payment_terms TEXT DEFAULT 'Acompte 30% à la commande, solde avant expédition',
  default_warranty     TEXT DEFAULT 'Garantie fabricant 2 ans pièces et main-d''œuvre',
  default_delivery     TEXT DEFAULT '6 à 8 semaines après réception de l''acompte',
  default_validity_days INT  DEFAULT 30,
  -- Texte pied de page PDF
  pdf_footer_text      TEXT DEFAULT 'Invest Mentor Énergie · Istanbul, Turquie · Ingénierie. Innovation. Performance.',
  pdf_intro_text       TEXT,
  -- Méta
  updated_by           UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insérer les paramètres par défaut (1 seule ligne)
INSERT INTO public.company_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select" ON public.company_settings;
CREATE POLICY "settings_select" ON public.company_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "settings_update" ON public.company_settings;
CREATE POLICY "settings_update" ON public.company_settings FOR UPDATE
  USING (is_admin());

-- ── Table paramètres commerciaux ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_settings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Devises supportées (JSON array)
  currencies           JSONB DEFAULT '["USD","EUR","TRY","XOF"]',
  -- Incoterms disponibles
  incoterms            JSONB DEFAULT '["DAP","DDP","FOB","CIF","CFR","EXW","FCA","CPT","CIP","DPU","FAS"]',
  -- Conditions de paiement prédéfinies
  payment_terms_list   JSONB DEFAULT '["Acompte 30% à la commande, solde avant expédition","50% à la commande, 50% avant expédition","100% à l''avance","30 jours net","60 jours net"]',
  -- Sources de leads
  lead_sources         JSONB DEFAULT '["linkedin","whatsapp","salon","recommandation","email","site_web","autre"]',
  -- Catégories produits actives
  active_categories    JSONB,
  -- Méta
  updated_by           UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.commercial_settings (id)
VALUES ('00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.commercial_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comm_settings_select" ON public.commercial_settings;
CREATE POLICY "comm_settings_select" ON public.commercial_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "comm_settings_update" ON public.commercial_settings;
CREATE POLICY "comm_settings_update" ON public.commercial_settings FOR UPDATE
  USING (is_admin());

-- ── Table audit log (activity_logs) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,          -- 'create' | 'update' | 'delete' | 'status_change' | 'login'
  entity_type  TEXT NOT NULL,          -- 'client' | 'quotation' | 'project' | 'user'...
  entity_id    UUID,
  entity_label TEXT,                   -- Libellé lisible (ex: "BNCI Abidjan", "IME-25-Q0001")
  old_value    JSONB,
  new_value    JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_user    ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_entity  ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_logs_action  ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created ON public.activity_logs(created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs_select" ON public.activity_logs;
CREATE POLICY "logs_select" ON public.activity_logs FOR SELECT
  USING (is_admin());
DROP POLICY IF EXISTS "logs_insert" ON public.activity_logs;
CREATE POLICY "logs_insert" ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── Fonction de log ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id    UUID,
  p_action     TEXT,
  p_entity     TEXT,
  p_entity_id  UUID DEFAULT NULL,
  p_label      TEXT DEFAULT NULL,
  p_old        JSONB DEFAULT NULL,
  p_new        JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, entity_label, old_value, new_value)
  VALUES (p_user_id, p_action, p_entity, p_entity_id, p_label, p_old, p_new);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RLS audit final sur toutes les tables sensibles ───────────────

-- Renforcer RLS produits (prix achat jamais pour commercial)
DROP POLICY IF EXISTS "products_insert_update" ON public.products;
CREATE POLICY "products_insert" ON public.products FOR INSERT
  WITH CHECK (is_admin_or_lead());
DROP POLICY IF EXISTS "products_update_p" ON public.products;
CREATE POLICY "products_update_policy" ON public.products FOR UPDATE
  USING (is_admin_or_lead());

-- Trigger mis à jour company_settings
DROP TRIGGER IF EXISTS trg_company_settings_updated ON public.company_settings;
CREATE TRIGGER trg_company_settings_updated
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger mis à jour commercial_settings
DROP TRIGGER IF EXISTS trg_comm_settings_updated ON public.commercial_settings;
CREATE TRIGGER trg_comm_settings_updated
  BEFORE UPDATE ON public.commercial_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
