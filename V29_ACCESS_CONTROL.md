# IM Energie CRM V29 - Acces et navigation

## Matrice appliquee

- Administrateur : acces complet, administration et suppressions definitives.
- Lead Team : donnees de l'equipe, achats, couts et marges necessaires au controle des affaires, sans administration ni suppressions definitives.
- Commercial : uniquement ses dossiers; aucun acces aux partenaires, achats, couts, marges, dettes, tresorerie, proformas ou controle d'affaires.

## Corrections principales

- Controle d'affaires retire du role Commercial au niveau route, page et menu.
- Cout d'achat et marge autorises au Lead Team.
- Projets et proformas crees ou modifies uniquement par Admin/Lead.
- Suppression de projet, devis, proforma et paiement reservee a l'Administrateur.
- Devis Commercial limites a ses propres dossiers et modifiables uniquement au statut brouillon.
- Affectation forcee au Commercial courant lors de la creation de ses clients, opportunites et devis.
- Paiements en lecture seule pour le Commercial.
- Consolidation Commercial filtree et purgee des donnees fournisseurs, achats, marges et dettes.
- Menu reorganise en sections metier repliables.

## Validation avant production

1. Executer `npm run type-check`.
2. Executer `npm run lint`.
3. Executer `npm run test:business`.
4. Executer `npm run build`.
5. Tester un compte de chaque role avant de rediger le guide definitif.
