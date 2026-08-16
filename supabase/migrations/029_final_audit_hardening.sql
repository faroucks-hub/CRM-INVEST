-- ============================================================================
-- 029_final_audit_hardening.sql
-- IME CRM — Phase 7 : audit final, cohérence d'accès et garde-fous.
-- ============================================================================

-- Les commerciaux autorisés à consulter le contrôle d'affaires doivent pouvoir
-- lire les données achats des projets qui leur sont affectés, sans obtenir les
-- droits de création/modification réservés aux administrateurs et leads.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['supplier_rfqs','supplier_quotations','purchase_orders','supplier_proformas']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_commercial_project_read', t);
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users_profiles u
          WHERE u.id = auth.uid() AND u.role IN ('admin','lead_team')
        )
        OR EXISTS (
          SELECT 1 FROM public.users_profiles u
          JOIN public.projets_v2 p ON p.id = project_id
          WHERE u.id = auth.uid()
            AND u.role = 'commercial'
            AND p.assigned_to = auth.uid()
        )
        OR created_by = auth.uid()
      )
    $p$, t || '_commercial_project_read', t);
  END LOOP;
END $$;

-- Une seule version par défaut par rôle/audience/langue. Cela évite qu'une
-- Quotation récupère de manière non déterministe plusieurs profils concurrents.
CREATE UNIQUE INDEX IF NOT EXISTS uq_terms_default_per_role_language
ON public.commercial_terms_profiles(audience, commercial_role, language)
WHERE is_default = true;

-- Index des relations fortement sollicitées par les écrans de consolidation.
CREATE INDEX IF NOT EXISTS idx_supplier_quotations_rfq ON public.supplier_quotations(rfq_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_quote ON public.purchase_orders(supplier_quotation_id);
CREATE INDEX IF NOT EXISTS idx_supplier_proformas_po ON public.supplier_proformas(purchase_order_id);

COMMENT ON INDEX public.uq_terms_default_per_role_language IS
'Garantit un unique profil de conditions par défaut pour chaque audience, rôle commercial et langue.';
