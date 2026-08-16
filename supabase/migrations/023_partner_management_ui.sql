-- IME CRM — Partner Management foundation
-- Enrichit la table suppliers pour l'interface Partenaires 360°.

ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'logistique';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'agent_representant';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'prestataire_service';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'bureau_etudes';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'partenaire_strategique';

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS contact_role TEXT,
  ADD COLUMN IF NOT EXISTS relationship_start DATE,
  ADD COLUMN IF NOT EXISTS contract_name TEXT,
  ADD COLUMN IF NOT EXISTS contract_document_url TEXT,
  ADD COLUMN IF NOT EXISTS contract_expiry DATE;

COMMENT ON COLUMN public.suppliers.contact_role IS 'Fonction du contact principal chez le partenaire';
COMMENT ON COLUMN public.suppliers.relationship_start IS 'Date de début de la relation avec le partenaire';
COMMENT ON COLUMN public.suppliers.contract_name IS 'Nom ou référence du contrat / accord principal';
COMMENT ON COLUMN public.suppliers.contract_document_url IS 'URL ou chemin du document de contrat principal';
COMMENT ON COLUMN public.suppliers.contract_expiry IS 'Date d''expiration du contrat principal';
