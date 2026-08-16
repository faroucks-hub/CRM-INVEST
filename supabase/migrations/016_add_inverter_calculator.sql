-- ============================================================================
-- 016_add_inverter_calculator.sql
-- IME CRM — Calculateurs techniques — Étape 4/7
-- Autorise la sauvegarde des calculs Inverter et expose leur statistique.
-- ============================================================================

ALTER TYPE public.calc_type ADD VALUE IF NOT EXISTS 'inverter';

DROP VIEW IF EXISTS public.calc_stats;

CREATE VIEW public.calc_stats AS
SELECT
  u.id AS user_id,
  u.full_name,
  COUNT(c.id) AS total_calcs,
  COUNT(c.id) FILTER (WHERE c.calc_type = 'ups')       AS ups_count,
  COUNT(c.id) FILTER (WHERE c.calc_type = 'battery')   AS battery_count,
  COUNT(c.id) FILTER (WHERE c.calc_type = 'rectifier') AS rectifier_count,
  -- Cast TEXT volontaire : une nouvelle valeur ENUM ne peut pas être utilisée
  -- directement avant le commit de la transaction qui l'ajoute.
  COUNT(c.id) FILTER (WHERE c.calc_type::TEXT = 'inverter') AS inverter_count,
  COUNT(c.id) FILTER (WHERE c.calc_type = 'bess')      AS bess_count,
  MAX(c.created_at) AS last_calc_at
FROM public.users_profiles u
LEFT JOIN public.calc_history c ON c.created_by = u.id
GROUP BY u.id, u.full_name;

COMMENT ON VIEW public.calc_stats IS
  'Statistiques des calculateurs UPS, batteries, rectifier, inverter et BESS par utilisateur.';

GRANT SELECT ON public.calc_stats TO authenticated;
