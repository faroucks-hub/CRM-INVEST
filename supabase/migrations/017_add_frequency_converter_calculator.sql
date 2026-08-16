-- ============================================================================
-- 017_add_frequency_converter_calculator.sql
-- IME CRM — Calculateurs techniques — Étape 5/7
-- Autorise la sauvegarde des calculs Frequency Converter et leurs statistiques.
-- ============================================================================

ALTER TYPE public.calc_type ADD VALUE IF NOT EXISTS 'frequency_converter';

DROP VIEW IF EXISTS public.calc_stats;

CREATE VIEW public.calc_stats AS
SELECT
  u.id AS user_id,
  u.full_name,
  COUNT(c.id) AS total_calcs,
  COUNT(c.id) FILTER (WHERE c.calc_type = 'ups')       AS ups_count,
  COUNT(c.id) FILTER (WHERE c.calc_type = 'battery')   AS battery_count,
  COUNT(c.id) FILTER (WHERE c.calc_type = 'rectifier') AS rectifier_count,
  COUNT(c.id) FILTER (WHERE c.calc_type::TEXT = 'inverter') AS inverter_count,
  -- Cast TEXT volontaire pour permettre l'exécution dans la même transaction
  -- que l'ajout de la nouvelle valeur ENUM.
  COUNT(c.id) FILTER (
    WHERE c.calc_type::TEXT = 'frequency_converter'
  ) AS frequency_converter_count,
  COUNT(c.id) FILTER (WHERE c.calc_type = 'bess')      AS bess_count,
  MAX(c.created_at) AS last_calc_at
FROM public.users_profiles u
LEFT JOIN public.calc_history c ON c.created_by = u.id
GROUP BY u.id, u.full_name;

COMMENT ON VIEW public.calc_stats IS
  'Statistiques des six calculateurs techniques par utilisateur.';

GRANT SELECT ON public.calc_stats TO authenticated;
