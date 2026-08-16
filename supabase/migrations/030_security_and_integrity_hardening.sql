-- ============================================================================
-- 030_security_and_integrity_hardening.sql
-- Prevent duplicate Website Lead conversions and support traceability.
-- ============================================================================

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS website_lead_id UUID
  REFERENCES public.website_leads(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_opportunities_website_lead
  ON public.opportunities(website_lead_id)
  WHERE website_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_website_lead
  ON public.opportunities(website_lead_id);

COMMENT ON COLUMN public.opportunities.website_lead_id IS
'Lead site source. Unique when present to make conversion idempotent.';
