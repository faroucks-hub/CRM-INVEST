# V28 — Sécurité et intégrité

Cette version repart de la V27 avec la page projet en deux colonnes et son scroll limité.

## Corrections appliquées

- routes Dashboard refusées par défaut et matrice de rôles complétée ;
- validation stricte et limitation de fréquence de Lydie AI ;
- minimisation des données CRM transmises au fournisseur IA ;
- messages d’erreur IA internes non exposés aux utilisateurs ;
- positionnement de Lydie limité à l’assistance technico-commerciale ;
- rollback des transmittals dont les lignes ne peuvent pas être créées ;
- page détail Transmittal replacée dans le layout Dashboard ;
- nettoyage des fichiers Storage lorsque la création documentaire échoue ;
- authentification explicite des actions documentaires sensibles ;
- conversion des leads rendue idempotente via la migration 030 ;
- suppression des anciens fichiers `roject-notes.ts` et `page.tsx.before-layout-fix` ;
- ajout d’un modèle `.env.example` sans secret ;
- ajout d’un script de création d’archive excluant secrets, caches et dépendances locales.

## Déploiement obligatoire

1. Révoquer et régénérer `SUPABASE_SERVICE_ROLE_KEY` et `OPENAI_API_KEY`.
2. Appliquer `supabase/migrations/030_security_and_integrity_hardening.sql`.
3. Configurer les variables depuis `.env.example` dans l’environnement de déploiement.
4. Installer les dépendances avec `npm ci` sur la machine cible.
5. Exécuter `npm run validate:final` avant déploiement.
