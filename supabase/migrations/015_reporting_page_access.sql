-- ============================================================================
-- 015_reporting_page_access.sql
-- IME CRM — Rapports & Performance — Étape 5/7
-- Ajustement minimal requis par la page de performance vendeurs.
-- ============================================================================

-- Lead Team doit pouvoir identifier les membres de son équipe dans les
-- rapports. Le commercial conserve uniquement l'accès à son propre profil.
DROP POLICY IF EXISTS "profiles_select" ON public.users_profiles;

CREATE POLICY "profiles_select"
  ON public.users_profiles FOR SELECT
  USING (
    is_admin_or_lead()
    OR id = auth.uid()
  );

COMMENT ON POLICY "profiles_select" ON public.users_profiles IS
  'Admin/Lead Team voient les profils équipe ; commercial voit son profil.';
