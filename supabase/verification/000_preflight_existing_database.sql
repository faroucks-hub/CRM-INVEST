-- IME CRM — Précontrôle d'une base existante avant réparation de l'historique.
-- Si ce script affiche une erreur, ne marquez pas 001–011 comme appliquées.

DO $$
DECLARE
  v_missing TEXT;
BEGIN
  SELECT STRING_AGG(required.name, ', ' ORDER BY required.name)
  INTO v_missing
  FROM (
    VALUES
      ('users_profiles'), ('clients'), ('suppliers'), ('opportunities'),
      ('products'), ('quotations_v2'), ('quotation_lines'),
      ('proformas_v2'), ('proforma_lines'), ('projets_v2'),
      ('project_workflow_steps'), ('paiements'), ('documents_v2'),
      ('calc_history'), ('ai_conversations'), ('taches'), ('notifications'),
      ('company_settings'), ('commercial_settings'), ('activity_logs'),
      ('website_leads'), ('sales_invoices'), ('payment_transactions'),
      ('supplier_invoices'), ('supplier_payments'), ('project_expenses')
  ) AS required(name)
  WHERE TO_REGCLASS('public.' || required.name) IS NULL;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION
      'Précontrôle refusé. Objets 001–011 absents : %', v_missing;
  END IF;
END;
$$;

SELECT
  'Précontrôle 001–011 réussi' AS result,
  CURRENT_TIMESTAMP AS checked_at;
