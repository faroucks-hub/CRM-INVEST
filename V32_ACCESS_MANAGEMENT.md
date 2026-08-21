# IM Énergie CRM V32 — Gestion des accès

## Principe

L’administrateur peut retirer l’accès à un module pour les rôles Lead et Commercial depuis **Paramètres → Accès et permissions**.

Les autorisations dynamiques sont plafonnées par les rôles de sécurité existants : un Commercial ne peut jamais recevoir un module réservé aux Administrateurs et Leads. L’Administrateur conserve toujours tous les accès.

## Contrôles appliqués

- menu latéral et outils globaux ;
- ouverture des routes dans le layout serveur ;
- actions serveur principales : clients, opportunités, quotations, proformas, projets, paiements, catalogue, Website Leads, tâches et calculateurs ;
- journal d’activité lors des modifications ;
- politiques RLS existantes conservées comme plafond de sécurité.

## Installation

1. Exécuter `supabase/migrations/032_role_module_permissions.sql` dans Supabase.
2. Vérifier que 34 lignes sont présentes dans `role_module_permissions`.
3. Lancer `npm run type-check`, `npm run lint`, `npm run test:business` et `npm run build`.
