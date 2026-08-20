-- IM Energie CRM V31 — administration sécurisée du catalogue public

CREATE TABLE IF NOT EXISTS public.catalogue_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT NOT NULL,
  slug TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'catalogue_products_status_check'
      AND conrelid = 'public.catalogue_products'::regclass
  ) THEN
    ALTER TABLE public.catalogue_products
      ADD CONSTRAINT catalogue_products_status_check
      CHECK (status IN ('active','new','updated','hot','custom','on_request','legacy','discontinued'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS catalogue_products_model_unique
  ON public.catalogue_products (lower(model));
CREATE UNIQUE INDEX IF NOT EXISTS catalogue_products_slug_unique
  ON public.catalogue_products (lower(slug)) WHERE slug IS NOT NULL;

ALTER TABLE public.catalogue_products ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'catalogue_products'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.catalogue_products', policy_name);
  END LOOP;
END $$;

CREATE POLICY catalogue_products_public_select
ON public.catalogue_products FOR SELECT TO anon
USING (is_published = true);

CREATE POLICY catalogue_products_privileged_select
ON public.catalogue_products FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND public.get_user_role() IN ('admin', 'lead_team')
);

CREATE POLICY catalogue_products_privileged_update
ON public.catalogue_products FOR UPDATE TO authenticated
USING (
  public.is_active_user()
  AND public.get_user_role() IN ('admin', 'lead_team')
)
WITH CHECK (
  public.is_active_user()
  AND public.get_user_role() IN ('admin', 'lead_team')
  AND status IN ('active','new','updated','hot','custom','on_request','legacy','discontinued')
);

REVOKE ALL ON public.catalogue_products FROM anon, authenticated;
GRANT SELECT ON public.catalogue_products TO anon;
GRANT SELECT, UPDATE ON public.catalogue_products TO authenticated;

-- Le site public doit connaître l'état false pour retirer une fiche statique,
-- sans obtenir un accès général à la table ni à de futures colonnes internes.
CREATE OR REPLACE FUNCTION public.get_public_catalogue_states()
RETURNS TABLE (
  model TEXT,
  slug TEXT,
  status TEXT,
  is_published BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.model, p.slug, p.status, p.is_published
  FROM public.catalogue_products p
  ORDER BY p.model;
$$;

REVOKE ALL ON FUNCTION public.get_public_catalogue_states() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_catalogue_states() TO anon, authenticated;

COMMENT ON TABLE public.catalogue_products IS
  'Statuts et publication des produits affichés sur le catalogue public IM Energie.';
