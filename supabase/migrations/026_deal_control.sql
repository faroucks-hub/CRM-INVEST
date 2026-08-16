-- Phase 3 — Contrôle d'affaire Vente ↔ Achat
-- Une ligne par projet pour les budgets de coûts et la revue des engagements.

CREATE TABLE IF NOT EXISTS public.project_deal_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projets_v2(id) ON DELETE CASCADE,
  logistics_budget numeric(15,2) NOT NULL DEFAULT 0 CHECK (logistics_budget >= 0),
  bank_fees_budget numeric(15,2) NOT NULL DEFAULT 0 CHECK (bank_fees_budget >= 0),
  inspection_budget numeric(15,2) NOT NULL DEFAULT 0 CHECK (inspection_budget >= 0),
  other_cost_budget numeric(15,2) NOT NULL DEFAULT 0 CHECK (other_cost_budget >= 0),
  budget_currency text,
  review_status text NOT NULL DEFAULT 'a_revoir'
    CHECK (review_status IN ('a_revoir','revue','validee_avec_reserves','validee')),
  reviewer_notes text,
  risk_override_reason text,
  reviewed_by uuid REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_by uuid REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_deal_controls_status
  ON public.project_deal_controls(review_status);

DROP TRIGGER IF EXISTS trg_project_deal_controls_updated ON public.project_deal_controls;
CREATE TRIGGER trg_project_deal_controls_updated
  BEFORE UPDATE ON public.project_deal_controls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.project_deal_controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_deal_controls_read ON public.project_deal_controls;
CREATE POLICY project_deal_controls_read ON public.project_deal_controls
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users_profiles u
    WHERE u.id = auth.uid() AND u.role IN ('admin','lead_team','commercial')
  ));
DROP POLICY IF EXISTS project_deal_controls_manage ON public.project_deal_controls;
CREATE POLICY project_deal_controls_manage ON public.project_deal_controls
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users_profiles u
    WHERE u.id = auth.uid() AND u.role IN ('admin','lead_team')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users_profiles u
    WHERE u.id = auth.uid() AND u.role IN ('admin','lead_team')
  ));
