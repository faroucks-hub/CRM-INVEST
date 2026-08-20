# V31 — Produits du site

Cette version restaure le pilotage des statuts du catalogue public depuis le CRM.

## Accès

- Administrateur : lecture et modification.
- Lead : lecture et modification.
- Commercial : aucun accès à la page ni aux actions.

## Réglages

- `active` : aucun badge.
- `new` : Nouveau.
- `updated` : Mis à jour.
- `hot` : Produit phare.
- `custom` : Sur mesure.
- `on_request` : Sur demande.
- `legacy` : Ancienne génération.
- `discontinued` : Plus disponible.
- `is_published = false` : produit entièrement masqué du site.

`discontinued` et `is_published` restent indépendants : un produit arrêté peut rester publié avec son badge.

## Base de données

Exécuter `supabase/migrations/031_catalogue_products_admin.sql` avant le déploiement du CRM et avant l'application du correctif du site V585.

La migration :

- conserve les données existantes ;
- limite les écritures aux administrateurs et leads actifs ;
- maintient la lecture publique nécessaire aux badges ;
- expose une fonction publique limitée aux quatre champs nécessaires au site ;
- refuse les statuts non validés.
