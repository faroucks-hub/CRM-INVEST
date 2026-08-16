-- ═══════════════════════════════════════════════════════════════════
-- IME CRM — Sprint 8 : Tâches & Notifications
-- ═══════════════════════════════════════════════════════════════════

-- ── Enums Tâches ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('a_faire','en_cours','termine','en_retard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('faible','normale','haute','urgente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Table tâches ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.taches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  description   TEXT,
  status        task_status   NOT NULL DEFAULT 'a_faire',
  priority      task_priority NOT NULL DEFAULT 'normale',
  due_date      DATE,
  -- Relations
  assigned_to   UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_by    UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  client_id     UUID REFERENCES public.clients(id)        ON DELETE SET NULL,
  project_id    UUID REFERENCES public.projets_v2(id)     ON DELETE SET NULL,
  quotation_id  UUID REFERENCES public.quotations_v2(id)  ON DELETE SET NULL,
  -- Rappel
  remind_at     TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taches_assigned  ON public.taches(assigned_to);
CREATE INDEX IF NOT EXISTS idx_taches_status    ON public.taches(status);
CREATE INDEX IF NOT EXISTS idx_taches_due       ON public.taches(due_date);
CREATE INDEX IF NOT EXISTS idx_taches_priority  ON public.taches(priority);

DROP TRIGGER IF EXISTS trg_taches_updated ON public.taches;
CREATE TRIGGER trg_taches_updated
  BEFORE UPDATE ON public.taches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Tâches
ALTER TABLE public.taches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "taches_select" ON public.taches;
CREATE POLICY "taches_select" ON public.taches FOR SELECT
  USING (
    is_admin_or_lead()
    OR assigned_to = auth.uid()
    OR created_by  = auth.uid()
  );

DROP POLICY IF EXISTS "taches_insert" ON public.taches;
CREATE POLICY "taches_insert" ON public.taches FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "taches_update" ON public.taches;
CREATE POLICY "taches_update" ON public.taches FOR UPDATE
  USING (
    is_admin_or_lead()
    OR assigned_to = auth.uid()
    OR created_by  = auth.uid()
  );

DROP POLICY IF EXISTS "taches_delete" ON public.taches;
CREATE POLICY "taches_delete" ON public.taches FOR DELETE
  USING (is_admin_or_lead() OR created_by = auth.uid());

-- ── Table notifications ───────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE notif_type AS ENUM (
    'quotation_created', 'proforma_created', 'payment_late',
    'project_late', 'document_added', 'calc_saved',
    'task_due', 'task_assigned', 'opportunity_won', 'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  type        notif_type NOT NULL DEFAULT 'general',
  title       TEXT NOT NULL,
  message     TEXT,
  link        TEXT,               -- URL interne vers l'entité liée
  is_read     BOOLEAN NOT NULL DEFAULT false,
  entity_id   UUID,               -- ID de l'entité liée
  entity_type TEXT,               -- 'quotation' | 'project' | 'payment'...
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifs_user   ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifs_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifs_date   ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifs_all" ON public.notifications;
CREATE POLICY "notifs_all" ON public.notifications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Vue tâches en retard (pour alertes dashboard) ─────────────────
CREATE OR REPLACE VIEW public.overdue_tasks AS
SELECT
  t.id, t.title, t.priority, t.due_date,
  t.assigned_to, t.client_id, t.project_id,
  u.full_name AS assignee_name,
  c.company_name AS client_name
FROM public.taches t
LEFT JOIN public.users_profiles u ON u.id = t.assigned_to
LEFT JOIN public.clients c        ON c.id = t.client_id
WHERE t.status NOT IN ('termine')
  AND t.due_date < CURRENT_DATE;

-- ── Fonction : crée une notification ─────────────────────────────
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id    UUID,
  p_type       TEXT,
  p_title      TEXT,
  p_message    TEXT DEFAULT NULL,
  p_link       TEXT DEFAULT NULL,
  p_entity_id  UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, entity_id, entity_type)
  VALUES (p_user_id, p_type::notif_type, p_title, p_message, p_link, p_entity_id, p_entity_type)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
