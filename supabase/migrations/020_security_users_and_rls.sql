-- ============================================================================
-- 020_security_users_and_rls.sql
-- IME CRM — Étape 4 : comptes, utilisateurs, sessions, audit et RLS.
-- ============================================================================

ALTER TABLE public.users_profiles
  ADD COLUMN IF NOT EXISTS invited_by UUID
    REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_profiles_active_role
  ON public.users_profiles(is_active, role);

-- Le rôle transmis dans user_metadata n'est jamais fiable lors d'une
-- inscription publique. Tout nouveau profil commence Commercial ; seule une
-- action serveur administrateur peut ensuite élever son rôle.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users_profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    'commercial',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users_profiles p
    WHERE p.id = auth.uid() AND p.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.users_profiles p
  WHERE p.id = auth.uid() AND p.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_user_role() = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_lead()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.get_user_role() IN ('admin', 'lead_team'),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_lead() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_lead() TO authenticated;

-- Profils : lecture équipe pour Admin/Lead, profil propre pour Commercial.
DROP POLICY IF EXISTS "profiles_select" ON public.users_profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.users_profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.users_profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.users_profiles;

CREATE POLICY "profiles_select"
  ON public.users_profiles FOR SELECT
  USING (
    public.is_active_user()
    AND (public.is_admin_or_lead() OR id = auth.uid())
  );

CREATE POLICY "profiles_update_own"
  ON public.users_profiles FOR UPDATE
  USING (public.is_active_user() AND id = auth.uid())
  WITH CHECK (public.is_active_user() AND id = auth.uid());

-- Le client authentifié ne peut jamais modifier directement rôle, statut ou
-- données d'invitation. Les actions Admin utilisent exclusivement service_role.
REVOKE INSERT, DELETE ON public.users_profiles FROM authenticated;
REVOKE UPDATE ON public.users_profiles FROM authenticated;
GRANT UPDATE (
  full_name, avatar_url, phone, position, preferences, last_login_at
) ON public.users_profiles TO authenticated;

-- Un compte inactif doit être refusé même s'il possède encore un JWT valide.
-- Les politiques restrictives s'ajoutent aux règles métier existantes.
DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'users_profiles',
    'clients', 'suppliers', 'opportunities', 'products',
    'quotations', 'quotation_items', 'proformas', 'proforma_items',
    'projects', 'project_steps', 'payments', 'documents',
    'technical_calculations',
    'document_sequences', 'quotations_v2', 'quotation_lines',
    'proformas_v2', 'proforma_lines',
    'projets_v2', 'project_workflow_steps', 'paiements', 'documents_v2',
    'calc_history', 'ai_conversations', 'taches', 'notifications',
    'company_settings', 'commercial_settings', 'activity_logs',
    'website_leads',
    'sales_invoices', 'payment_transactions', 'supplier_invoices',
    'supplier_payments', 'project_expenses', 'exchange_rates',
    'project_documents', 'project_notes', 'project_activity_logs',
    'document_transmittals', 'document_transmittal_items',
    'quotation_templates'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE FORMAT('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE FORMAT(
      'DROP POLICY IF EXISTS "active_user_gate" ON public.%I',
      v_table
    );
    EXECUTE FORMAT(
      'CREATE POLICY "active_user_gate" ON public.%I AS RESTRICTIVE FOR ALL ' ||
      'USING (public.is_active_user()) ' ||
      'WITH CHECK (public.is_active_user())',
      v_table
    );
  END LOOP;
END;
$$;

-- Le pipeline public Lancinet continue de fonctionner via sa fonction
-- SECURITY DEFINER ; l'accès direct anonyme reste interdit.

-- Le bucket CRM est également fermé aux comptes désactivés.
DROP POLICY IF EXISTS "project_documents_active_gate" ON storage.objects;
CREATE POLICY "project_documents_active_gate"
  ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    bucket_id <> 'project-documents'
    OR public.is_active_user()
  )
  WITH CHECK (
    bucket_id <> 'project-documents'
    OR public.is_active_user()
  );

-- Journal d'audit : aucune insertion directe, aucune modification, aucune
-- suppression. La fonction impose l'identité réelle issue du JWT.
DROP POLICY IF EXISTS "logs_insert" ON public.activity_logs;
REVOKE INSERT, UPDATE, DELETE ON public.activity_logs FROM authenticated;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id    UUID,
  p_action     TEXT,
  p_entity     TEXT,
  p_entity_id  UUID DEFAULT NULL,
  p_label      TEXT DEFAULT NULL,
  p_old        JSONB DEFAULT NULL,
  p_new        JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Utilisateur non autorisé';
  END IF;

  IF p_action IS NULL OR p_entity IS NULL THEN
    RAISE EXCEPTION 'Action et entité obligatoires';
  END IF;

  INSERT INTO public.activity_logs (
    user_id, action, entity_type, entity_id,
    entity_label, old_value, new_value
  )
  VALUES (
    v_actor, LEFT(p_action, 80), LEFT(p_entity, 80), p_entity_id,
    p_label, p_old, p_new
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_activity(
  UUID, TEXT, TEXT, UUID, TEXT, JSONB, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity(
  UUID, TEXT, TEXT, UUID, TEXT, JSONB, JSONB
) TO authenticated;

-- Les vues exposées appliquent les RLS du rôle appelant et ne s'exécutent pas
-- avec les privilèges du propriétaire.
DO $$
DECLARE
  v_view TEXT;
  v_views TEXT[] := ARRAY[
    'quotations_commercial', 'quotation_items_commercial',
    'products_commercial', 'commercial_performance', 'quotation_stats',
    'dashboard_alerts', 'calc_stats', 'lydie_usage_stats', 'overdue_tasks'
  ];
BEGIN
  FOREACH v_view IN ARRAY v_views LOOP
    IF TO_REGCLASS('public.' || v_view) IS NOT NULL THEN
      EXECUTE FORMAT(
        'ALTER VIEW public.%I SET (security_invoker = true)',
        v_view
      );
    END IF;
  END LOOP;
END;
$$;
