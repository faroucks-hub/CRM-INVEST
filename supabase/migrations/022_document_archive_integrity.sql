-- ============================================================================
-- 022_document_archive_integrity.sql
-- IME CRM — Étape 6 : types documentaires d'expédition et d'archivage.
-- ============================================================================

ALTER TYPE public.doc_type ADD VALUE IF NOT EXISTS 'delivery_note';
ALTER TYPE public.doc_type ADD VALUE IF NOT EXISTS 'transmittal';

COMMENT ON COLUMN public.documents_v2.doc_type IS
  'Type documentaire CRM incluant invoice, packing_list, delivery_note et transmittal.';

