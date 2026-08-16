-- ============================================================================
-- 028_execution_and_closure.sql
-- IME CRM — Phase 5 : exécution, FAT, readiness, expédition, livraison, clôture.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_execution_control (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projets_v2(id) ON DELETE CASCADE,
  production_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (production_status IN ('not_started','engineering','in_production','completed','blocked')),
  production_start_date DATE,
  production_expected_end DATE,
  production_actual_end DATE,
  fat_status TEXT NOT NULL DEFAULT 'not_planned'
    CHECK (fat_status IN ('not_planned','planned','ready','passed','passed_with_reservations','failed','waived')),
  fat_planned_date DATE,
  fat_actual_date DATE,
  fat_reservations TEXT,
  readiness_status TEXT NOT NULL DEFAULT 'not_ready'
    CHECK (readiness_status IN ('not_ready','partial','ready_for_shipment','blocked')),
  readiness_date DATE,
  shipment_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (shipment_status IN ('not_started','booking','packed','dispatched','in_transit','arrived','delivered','blocked')),
  shipment_method TEXT,
  shipment_reference TEXT,
  shipment_date DATE,
  eta_date DATE,
  actual_arrival_date DATE,
  delivery_status TEXT NOT NULL DEFAULT 'not_delivered'
    CHECK (delivery_status IN ('not_delivered','partial','delivered','accepted','with_reservations')),
  delivery_date DATE,
  delivery_reservations TEXT,
  financial_closure_status TEXT NOT NULL DEFAULT 'open'
    CHECK (financial_closure_status IN ('open','pending_client','pending_supplier','balanced','closed')),
  project_closure_status TEXT NOT NULL DEFAULT 'open'
    CHECK (project_closure_status IN ('open','ready_for_closure','closed_with_reservations','closed')),
  closure_date DATE,
  closure_notes TEXT,
  updated_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_execution_status ON public.project_execution_control(project_closure_status, shipment_status);

DROP TRIGGER IF EXISTS trg_project_execution_control_updated ON public.project_execution_control;
CREATE TRIGGER trg_project_execution_control_updated BEFORE UPDATE ON public.project_execution_control
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.project_execution_control ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_execution_control_access ON public.project_execution_control;
CREATE POLICY project_execution_control_access ON public.project_execution_control FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.projets_v2 p WHERE p.id = project_id
    AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projets_v2 p WHERE p.id = project_id
    AND (public.is_admin_or_lead() OR p.assigned_to = auth.uid())
));

INSERT INTO public.project_execution_control(project_id)
SELECT id FROM public.projets_v2
ON CONFLICT(project_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.seed_project_execution_control()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_execution_control(project_id) VALUES (NEW.id)
  ON CONFLICT(project_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_project_execution_control ON public.projets_v2;
CREATE TRIGGER trg_seed_project_execution_control
AFTER INSERT ON public.projets_v2
FOR EACH ROW EXECUTE FUNCTION public.seed_project_execution_control();
