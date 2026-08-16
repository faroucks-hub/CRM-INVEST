-- ============================================================================
-- 012_currency_and_aggregation_fixes.sql
-- IME CRM — Rapports & Performance — Étape 2/7
-- Agrégations fiables et fondation multidevise.
--
-- Principes :
--   - aucune addition entre devises différentes ;
--   - une ligne statistique par commercial ET par devise ;
--   - aucune jointure cartésienne entre quotations, proformas et projets ;
--   - USD reste la devise de consolidation configurée par défaut, mais aucune
--     conversion n'est inventée lorsqu'un taux réel n'existe pas.
-- ============================================================================

-- ── Taux de change historiques ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rate_date      DATE NOT NULL,
  from_currency  TEXT NOT NULL,
  to_currency    TEXT NOT NULL,
  rate           NUMERIC(20,10) NOT NULL CHECK (rate > 0),
  source         TEXT NOT NULL DEFAULT 'manuel',
  is_locked      BOOLEAN NOT NULL DEFAULT false,
  notes          TEXT,
  created_by     UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT exchange_rates_currency_check
    CHECK (from_currency <> '' AND to_currency <> ''),
  CONSTRAINT exchange_rates_unique_pair
    UNIQUE (rate_date, from_currency, to_currency)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup
  ON public.exchange_rates(from_currency, to_currency, rate_date DESC);

DROP TRIGGER IF EXISTS trg_exchange_rates_updated ON public.exchange_rates;
CREATE TRIGGER trg_exchange_rates_updated
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exchange_rates_admin_all" ON public.exchange_rates;
CREATE POLICY "exchange_rates_admin_all"
  ON public.exchange_rates FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Les conversions identité sont toujours exactes et ne dépendent pas du marché.
INSERT INTO public.exchange_rates (
  rate_date, from_currency, to_currency, rate, source, is_locked, notes
)
SELECT
  CURRENT_DATE, currency_code, currency_code, 1, 'systeme', true,
  'Taux identité'
FROM unnest(ARRAY['USD', 'EUR', 'TRY', 'XOF']) AS currency_code
ON CONFLICT (rate_date, from_currency, to_currency) DO NOTHING;

COMMENT ON TABLE public.exchange_rates IS
  'Taux historiques : 1 unité de from_currency vaut rate unités de to_currency.';

-- Renvoie le dernier taux connu à la date demandée.
-- NULL est volontaire lorsqu'aucun taux réel n'existe : le CRM ne doit jamais
-- supposer qu'une devise étrangère vaut 1 USD.
CREATE OR REPLACE FUNCTION public.get_exchange_rate(
  p_from_currency TEXT,
  p_to_currency   TEXT,
  p_rate_date     DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT CASE
    WHEN UPPER(p_from_currency) = UPPER(p_to_currency) THEN 1::NUMERIC
    ELSE (
      SELECT er.rate
      FROM public.exchange_rates er
      WHERE UPPER(er.from_currency) = UPPER(p_from_currency)
        AND UPPER(er.to_currency) = UPPER(p_to_currency)
        AND er.rate_date <= p_rate_date
      ORDER BY er.rate_date DESC
      LIMIT 1
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.get_exchange_rate(TEXT, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_exchange_rate(TEXT, TEXT, DATE)
  TO authenticated;

-- ── Statistiques quotations/proformas sans multiplication ────────────────────
-- L'ancienne vue joignait directement toutes les quotations et toutes les
-- proformas d'un commercial. Par exemple, 3 quotations × 2 proformas formaient
-- 6 lignes et gonflaient les sommes. Les agrégations sont maintenant séparées.

DROP VIEW IF EXISTS public.quotation_stats;

CREATE VIEW public.quotation_stats AS
WITH quotation_agg AS (
  SELECT
    q.assigned_to AS user_id,
    q.currency,
    COUNT(*) AS total_quotations,
    COUNT(*) FILTER (WHERE q.status = 'approuvee') AS approved_quotations,
    COUNT(*) FILTER (WHERE q.status = 'perdue') AS lost_quotations,
    COALESCE(SUM(q.total_sell), 0) AS total_amount,
    COALESCE(
      SUM(q.total_sell) FILTER (WHERE q.status = 'approuvee'),
      0
    ) AS approved_amount
  FROM public.quotations_v2 q
  WHERE q.assigned_to IS NOT NULL
  GROUP BY q.assigned_to, q.currency
),
proforma_agg AS (
  SELECT
    p.assigned_to AS user_id,
    p.currency,
    COUNT(*) AS total_proformas,
    COALESCE(SUM(p.total_sell), 0) AS proforma_amount
  FROM public.proformas_v2 p
  WHERE p.assigned_to IS NOT NULL
  GROUP BY p.assigned_to, p.currency
),
combined AS (
  SELECT
    COALESCE(q.user_id, p.user_id) AS user_id,
    COALESCE(q.currency, p.currency) AS currency,
    COALESCE(q.total_quotations, 0) AS total_quotations,
    COALESCE(q.approved_quotations, 0) AS approved_quotations,
    COALESCE(q.lost_quotations, 0) AS lost_quotations,
    COALESCE(q.total_amount, 0) AS total_amount,
    COALESCE(q.approved_amount, 0) AS approved_amount,
    COALESCE(p.total_proformas, 0) AS total_proformas,
    COALESCE(p.proforma_amount, 0) AS proforma_amount
  FROM quotation_agg q
  FULL OUTER JOIN proforma_agg p
    ON p.user_id = q.user_id
   AND p.currency = q.currency
)
SELECT
  u.id AS user_id,
  u.full_name,
  u.role,
  c.currency,
  c.total_quotations,
  c.approved_quotations,
  c.lost_quotations,
  c.total_amount,
  c.approved_amount,
  c.total_proformas,
  c.proforma_amount,
  CASE
    WHEN c.total_quotations > 0
      THEN ROUND(c.total_proformas::NUMERIC / c.total_quotations * 100, 1)
    ELSE 0
  END AS conversion_rate
FROM combined c
JOIN public.users_profiles u ON u.id = c.user_id;

COMMENT ON VIEW public.quotation_stats IS
  'Statistiques quotations/proformas par commercial et par devise, sans double comptage.';

-- ── Performance commerciale courante, également séparée par devise ──────────
-- Cette vue remplace la vue historique fondée sur les anciennes tables
-- quotations/projects et supprime le même risque de produit cartésien.

DROP VIEW IF EXISTS public.commercial_performance;

CREATE VIEW public.commercial_performance AS
WITH opportunity_agg AS (
  SELECT
    o.assigned_to AS user_id,
    o.currency::TEXT AS currency,
    COUNT(*) FILTER (
      WHERE o.pipeline_stage NOT IN ('perdu_annule', 'projet_livre')
    ) AS active_opportunities,
    COUNT(*) FILTER (
      WHERE o.pipeline_stage IN ('commande_recue', 'projet_en_cours', 'projet_livre')
    ) AS won_opportunities,
    COALESCE(SUM(o.estimated_sell) FILTER (
      WHERE o.pipeline_stage NOT IN ('perdu_annule', 'projet_livre')
    ), 0) AS active_pipeline
  FROM public.opportunities o
  WHERE o.assigned_to IS NOT NULL
  GROUP BY o.assigned_to, o.currency::TEXT
),
quotation_agg AS (
  SELECT
    q.assigned_to AS user_id,
    q.currency::TEXT AS currency,
    COUNT(*) AS total_quotations,
    COUNT(*) FILTER (WHERE q.status = 'approuvee') AS accepted_quotations,
    COALESCE(SUM(q.total_sell) FILTER (
      WHERE q.status = 'approuvee'
    ), 0) AS approved_quotation_amount
  FROM public.quotations_v2 q
  WHERE q.assigned_to IS NOT NULL
  GROUP BY q.assigned_to, q.currency::TEXT
),
project_agg AS (
  SELECT
    p.assigned_to AS user_id,
    p.currency::TEXT AS currency,
    COUNT(*) FILTER (WHERE p.status <> 'annule') AS total_projects,
    COUNT(*) FILTER (
      WHERE p.status NOT IN ('cloture', 'annule')
    ) AS active_projects,
    COALESCE(SUM(p.contract_value) FILTER (
      WHERE p.status <> 'annule'
    ), 0) AS contract_value
  FROM public.projets_v2 p
  WHERE p.assigned_to IS NOT NULL
  GROUP BY p.assigned_to, p.currency::TEXT
),
keys AS (
  SELECT user_id, currency FROM opportunity_agg
  UNION
  SELECT user_id, currency FROM quotation_agg
  UNION
  SELECT user_id, currency FROM project_agg
)
SELECT
  u.id AS user_id,
  u.full_name,
  u.role,
  k.currency,
  COALESCE(o.active_opportunities, 0) AS active_opportunities,
  COALESCE(o.won_opportunities, 0) AS won_opportunities,
  COALESCE(o.active_pipeline, 0) AS active_pipeline,
  COALESCE(q.total_quotations, 0) AS total_quotations,
  COALESCE(q.accepted_quotations, 0) AS accepted_quotations,
  COALESCE(q.approved_quotation_amount, 0) AS approved_quotation_amount,
  COALESCE(p.total_projects, 0) AS total_projects,
  COALESCE(p.active_projects, 0) AS active_projects,
  COALESCE(p.contract_value, 0) AS contract_value
FROM keys k
JOIN public.users_profiles u ON u.id = k.user_id
LEFT JOIN opportunity_agg o
  ON o.user_id = k.user_id AND o.currency = k.currency
LEFT JOIN quotation_agg q
  ON q.user_id = k.user_id AND q.currency = k.currency
LEFT JOIN project_agg p
  ON p.user_id = k.user_id AND p.currency = k.currency;

COMMENT ON VIEW public.commercial_performance IS
  'Performance par commercial et par devise sur les tables V2, sans double comptage.';
