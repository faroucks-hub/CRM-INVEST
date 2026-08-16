-- ═══════════════════════════════════════════════════════════════════
-- IME CRM — Données de démonstration (Seed Data)
-- Invest Mentor Énergie — Marchés Afrique
-- ═══════════════════════════════════════════════════════════════════
-- ⚠️  EXÉCUTER APRÈS TOUTES LES MIGRATIONS
-- ⚠️  Créer d'abord les 3 utilisateurs via l'interface Supabase Auth
-- ═══════════════════════════════════════════════════════════════════

-- ── ÉTAPE 1 : Créer les comptes Auth dans Supabase Dashboard ─────
-- Authentication → Users → Add user (manual)
--
-- 1. admin@investmentor-energie.com | Password: Admin2025!
--    Puis dans SQL : UPDATE users_profiles SET role='admin' WHERE email='admin@...';
--
-- 2. lead@investmentor-energie.com  | Password: Lead2025!
--    Puis : UPDATE users_profiles SET role='lead_team' WHERE email='lead@...';
--
-- 3. commercial@investmentor-energie.com | Password: Comm2025!
--    (reste 'commercial' par défaut)

-- ── ÉTAPE 2 : Variables pour les UUIDs ───────────────────────────
-- Remplacer les UUIDs ci-dessous par les vrais IDs de vos utilisateurs
-- (disponibles dans Supabase → Authentication → Users)

DO $$
DECLARE
  -- !! REMPLACER CES VALEURS par les vrais IDs de vos utilisateurs !!
  v_admin   UUID := '00000000-0000-0000-0000-000000000001';
  v_lead    UUID := '00000000-0000-0000-0000-000000000002';
  v_comm    UUID := '00000000-0000-0000-0000-000000000003';

  -- Clients
  c_bnci    UUID := uuid_generate_v4();
  c_mtn     UUID := uuid_generate_v4();
  c_sonatel UUID := uuid_generate_v4();
  c_ghacem  UUID := uuid_generate_v4();
  c_cimaf   UUID := uuid_generate_v4();

  -- Fournisseurs
  s_epc     UUID := uuid_generate_v4();
  s_isik    UUID := uuid_generate_v4();
  s_atlas   UUID := uuid_generate_v4();

  -- Opportunités
  o1 UUID := uuid_generate_v4();
  o2 UUID := uuid_generate_v4();
  o3 UUID := uuid_generate_v4();
  o4 UUID := uuid_generate_v4();
  o5 UUID := uuid_generate_v4();

BEGIN

-- ── CLIENTS ───────────────────────────────────────────────────────
INSERT INTO public.clients (
  id, reference, company_name, status, country, city, sector,
  contact_name, contact_title, contact_email, contact_phone, contact_whatsapp,
  assigned_to, lead_source, currency_pref, notes, created_by
) VALUES
(c_bnci, 'IME-CLI-0001', 'BNCI Côte d''Ivoire', 'actif',
  'Côte d''Ivoire', 'Abidjan', 'banques_finance',
  'Koné Moussa', 'Directeur Technique', 'k.moussa@bnci.ci', '+225 07 45 23 10', '+225 07 45 23 10',
  v_comm, 'recommandation', 'USD',
  'Client actif depuis 2023. UPS pour datacenter principal et agences.',
  v_admin),

(c_mtn, 'IME-CLI-0002', 'MTN Côte d''Ivoire', 'actif',
  'Côte d''Ivoire', 'Abidjan', 'telecommunications',
  'Diallo Aminata', 'Chef de Projet Infra', 'a.diallo@mtn.ci', '+225 05 67 89 12', '+225 05 67 89 12',
  v_lead, 'linkedin', 'USD',
  'Grand compte télécom. Besoins récurrents redresseurs et batteries pour BTS.',
  v_admin),

(c_sonatel, 'IME-CLI-0003', 'Sonatel Sénégal', 'prospect',
  'Sénégal', 'Dakar', 'telecommunications',
  'Ba Abdoulaye', 'Responsable Énergie', 'a.ba@sonatel.sn', '+221 77 345 67 89', '+221 77 345 67 89',
  v_comm, 'salon', 'XOF',
  'Rencontré au salon Africa Energy Forum 2024. Projet BESS + solaire en cours d''étude.',
  v_admin),

(c_ghacem, 'IME-CLI-0004', 'GHACEM Ghana', 'qualifie',
  'Ghana', 'Accra', 'industrie',
  'Asante Kwame', 'Electrical Engineer', 'k.asante@ghacem.com', '+233 24 567 890', NULL,
  v_lead, 'linkedin', 'USD',
  'Cimenterie. Besoin UPS industriel triphasé 500 kVA pour ligne de production.',
  v_admin),

(c_cimaf, 'IME-CLI-0005', 'CIMAF Gabon', 'prospect',
  'Gabon', 'Libreville', 'industrie',
  'Nguema Jean-Marc', 'DT', 'jm.nguema@cimaf.ga', '+241 07 23 45 67', '+241 07 23 45 67',
  v_comm, 'recommandation', 'XOF',
  'Recommandé par CIMAF CI. Projet onduleur industriel + stockage batterie.',
  v_admin);

-- ── FOURNISSEURS ──────────────────────────────────────────────────
INSERT INTO public.suppliers (
  id, reference, company_name, country, city, supplier_type,
  contact_name, contact_email, contact_phone, contact_whatsapp,
  certifications, products_supplied, lead_time_days,
  is_active, is_preferred, created_by
) VALUES
(s_epc, 'IME-SUP-0001', 'EPC Energy', 'Turquie', 'Istanbul', 'fabricant_turc',
  'Mehmet Yılmaz', 'm.yilmaz@epcentergy.tr', '+90 532 456 78 90', '+90 532 456 78 90',
  ARRAY['CE','ISO 9001','IEC 62040-3'],
  'UPS monophasés 1-10 kVA, UPS triphasés 10-800 kVA, Onduleurs, STS',
  42, true, true, v_admin),

(s_isik, 'IME-SUP-0002', 'Işık Power Systems', 'Turquie', 'Ankara', 'fabricant_turc',
  'Ayşe Demir', 'a.demir@isikpower.com', '+90 312 345 67 89', NULL,
  ARRAY['CE','ISO 9001','Bureau Veritas'],
  'Redresseurs 24-220V DC, Chargeurs batterie industriels, Convertisseurs',
  35, true, false, v_admin),

(s_atlas, 'IME-SUP-0003', 'Atlas Battery GmbH', 'Allemagne', 'Munich', 'fabricant_hors_turquie',
  'Hans Mueller', 'h.mueller@atlasbattery.de', '+49 89 1234567', NULL,
  ARRAY['CE','IEC 60896','DIN','Bureau Veritas'],
  'Batteries VRLA 2V-12V, OPzS industrielles, Li-ion LiFePO4',
  60, true, false, v_admin);

-- ── OPPORTUNITÉS ──────────────────────────────────────────────────
INSERT INTO public.opportunities (
  id, name, client_id, assigned_to, stage, pipeline_stage,
  estimated_sell, currency, sector, product_type,
  probability, description, expected_close, lead_source,
  created_by
) VALUES
(o1, 'UPS 200 kVA — Datacenter BNCI Abidjan', c_bnci, v_comm, 'negociation', 'negociation',
  85000, 'USD', 'banques_finance', 'ups_triphase',
  75, 'Remplacement UPS existant datacenter principal. Autonomie 30 min requise.',
  CURRENT_DATE + 30, 'recommandation', v_admin),

(o2, 'Redresseurs 48V + Batteries — MTN BTS Abidjan', c_mtn, v_lead, 'qualification', 'offre_envoyee',
  42000, 'USD', 'telecommunications', 'redresseur',
  50, '12 sites BTS à équiper en redresseurs 48V 100A + batteries VRLA 200Ah.',
  CURRENT_DATE + 60, 'linkedin', v_admin),

(o3, 'BESS 500 kWh — Sonatel Dakar', c_sonatel, v_comm, 'prospect', 'etude_technique',
  320000, 'USD', 'telecommunications', 'bess',
  25, 'Système de stockage hybride solaire + BESS pour centre de switching principal.',
  CURRENT_DATE + 90, 'salon', v_admin),

(o4, 'UPS Industriel 500 kVA — GHACEM Accra', c_ghacem, v_lead, 'devis', 'offre_preparation',
  165000, 'USD', 'industrie', 'ups_industriel',
  60, 'Protection ligne de production ciment. Contraintes : poussière, vibrations, 45°C.',
  CURRENT_DATE + 45, 'linkedin', v_admin),

(o5, 'Onduleur + Stockage — CIMAF Libreville', c_cimaf, v_comm, 'contact', 'besoin_identifie',
  98000, 'XOF', 'industrie', 'ups_industriel',
  20, 'Projet préliminaire. Visite site prévue en Q1 2026.',
  CURRENT_DATE + 120, 'recommandation', v_admin);

-- ── HISTORIQUE CALCULS ────────────────────────────────────────────
INSERT INTO public.calc_history (calc_type, name, inputs, outputs, client_id, created_by)
VALUES
('ups', 'UPS 200 kVA BNCI Abidjan — Dimensionnement', '{
  "kva": 200, "power_factor": 0.9, "efficiency": 95,
  "autonomy_min": 30, "vdc_bus": 384, "safety_margin": 20, "load_type": "server"
}', '{
  "kw": 180, "kw_with_margin": 216, "dc_power_kw": 189.5,
  "battery_energy_kwh": 94.7, "battery_capacity_ah": 246.6,
  "recommended_ah": 295.9, "batteries_12v": 128,
  "batteries_per_string": 32, "strings_parallel": 4,
  "sizing_category": "large", "ok": true
}', c_bnci, v_lead),

('battery', 'Batteries MTN BTS — 48V 200Ah VRLA', '{
  "vdc": 48, "load_kw": 2.4, "autonomy_min": 240,
  "efficiency": 95, "dod": 80, "battery_type": "vrla",
  "cell_voltage": 12, "cell_capacity": 100, "safety_margin": 20
}', '{
  "energy_needed_kwh": 9.6, "energy_nominal_kwh": 12.6,
  "capacity_ah": 262.5, "cells_in_series": 4,
  "strings_parallel": 3, "total_cells": 12,
  "total_capacity_ah": 300, "estimated_autonomy_min": 283,
  "ok": true
}', c_mtn, v_comm),

('bess', 'BESS Sonatel 500 kWh — Estimation préliminaire', '{
  "load_kw": 500, "autonomy_h": 1.0, "efficiency": 90,
  "dod": 90, "safety_margin": 20, "application": "solar_storage", "cycle_life": 4000
}', '{
  "useful_energy_kwh": 500, "nominal_capacity_kwh": 617.3,
  "recommended_kwh": 740.7, "pcs_kw": 600,
  "estimated_cycles_year": 547.5, "estimated_lifetime_y": 7.3,
  "cost_indicator": "high", "ok": true
}', c_sonatel, v_lead);

-- ── TÂCHES ────────────────────────────────────────────────────────
INSERT INTO public.taches (title, description, status, priority, due_date, assigned_to, client_id, created_by)
VALUES
('Relancer BNCI Abidjan — Quotation en attente de décision',
  'Appel de suivi + email de relance professionnelle',
  'a_faire', 'haute', CURRENT_DATE + 3, v_comm, c_bnci, v_admin),

('Préparer dossier technique GHACEM — Visite site',
  'Préparer les fiches techniques UPS industriel + certificats CE',
  'en_cours', 'normale', CURRENT_DATE + 7, v_lead, c_ghacem, v_admin),

('Envoyer offre révisée MTN — Après négociation',
  'Intégrer les conditions révisées et renvoyer la quotation',
  'a_faire', 'urgente', CURRENT_DATE + 1, v_comm, c_mtn, v_admin),

('Planifier visite CIMAF Libreville',
  'Coordonner avec le DT pour une visite technique sur site',
  'a_faire', 'faible', CURRENT_DATE + 21, v_comm, c_cimaf, v_admin),

('Préparer rapport mensuel pipeline — Janvier 2026',
  'Résumé pipeline pour réunion direction',
  'a_faire', 'normale', CURRENT_DATE + 14, v_lead, NULL, v_admin);

RAISE NOTICE '✓ Seed data IME CRM chargé avec succès';
RAISE NOTICE '  → 5 clients | 3 fournisseurs | 5 opportunités';
RAISE NOTICE '  → 3 calculs techniques | 5 tâches';
RAISE NOTICE '';
RAISE NOTICE '⚠️  ÉTAPE SUIVANTE :';
RAISE NOTICE '   Remplacer les UUIDs v_admin/v_lead/v_comm';
RAISE NOTICE '   par les vrais IDs de vos utilisateurs';

END $$;
