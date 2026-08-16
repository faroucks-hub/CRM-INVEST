-- ═══════════════════════════════════════════════════════════════════
-- IME CRM — Sprint 5 Migration
-- Calculateurs techniques
-- ═══════════════════════════════════════════════════════════════════

-- Type de calculateur
DO $$ BEGIN
  CREATE TYPE calc_type AS ENUM ('ups', 'battery', 'rectifier', 'bess');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table historique calculs (utilise la table existante technical_calculations)
-- On enrichit la structure si elle existe déjà

-- Table dédiée sprint 5 (plus propre)
CREATE TABLE IF NOT EXISTS public.calc_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calc_type       calc_type NOT NULL,
  name            TEXT,                       -- Nom donné par l'utilisateur
  inputs          JSONB NOT NULL DEFAULT '{}',
  outputs         JSONB NOT NULL DEFAULT '{}',
  -- Relations optionnelles
  client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES public.projets_v2(id) ON DELETE SET NULL,
  quotation_id    UUID REFERENCES public.quotations_v2(id) ON DELETE SET NULL,
  opportunity_id  UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  -- Réservé Lydie AI
  ai_analysis     TEXT,
  ai_generated_at TIMESTAMPTZ,
  -- Méta
  created_by      UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calc_type      ON public.calc_history(calc_type);
CREATE INDEX IF NOT EXISTS idx_calc_user      ON public.calc_history(created_by);
CREATE INDEX IF NOT EXISTS idx_calc_project   ON public.calc_history(project_id);
CREATE INDEX IF NOT EXISTS idx_calc_client    ON public.calc_history(client_id);
CREATE INDEX IF NOT EXISTS idx_calc_created   ON public.calc_history(created_at DESC);

-- RLS
ALTER TABLE public.calc_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calc_select" ON public.calc_history;
CREATE POLICY "calc_select" ON public.calc_history FOR SELECT
  USING (
    is_admin_or_lead()
    OR (get_user_role() = 'commercial' AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "calc_insert" ON public.calc_history;
CREATE POLICY "calc_insert" ON public.calc_history FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "calc_update" ON public.calc_history;
CREATE POLICY "calc_update" ON public.calc_history FOR UPDATE
  USING (is_admin_or_lead() OR created_by = auth.uid());

DROP POLICY IF EXISTS "calc_delete" ON public.calc_history;
CREATE POLICY "calc_delete" ON public.calc_history FOR DELETE
  USING (is_admin_or_lead() OR created_by = auth.uid());

-- Vue stats calculateurs pour dashboard
CREATE OR REPLACE VIEW public.calc_stats AS
SELECT
  u.id AS user_id,
  u.full_name,
  COUNT(*) AS total_calcs,
  COUNT(*) FILTER (WHERE c.calc_type = 'ups')       AS ups_count,
  COUNT(*) FILTER (WHERE c.calc_type = 'battery')   AS battery_count,
  COUNT(*) FILTER (WHERE c.calc_type = 'rectifier') AS rectifier_count,
  COUNT(*) FILTER (WHERE c.calc_type = 'bess')      AS bess_count,
  MAX(c.created_at) AS last_calc_at
FROM public.users_profiles u
LEFT JOIN public.calc_history c ON c.created_by = u.id
GROUP BY u.id, u.full_name;
