# V37.2 — Catalogues Afrique et International

## Segmentation

La sélection documentaire repose sur deux critères indépendants enregistrés dans chaque fiche client :

- langue : français, anglais ou à déterminer ;
- orientation : Afrique, International ou à déterminer.

Le CRM propose quatre associations :

| Orientation | Français | Anglais |
| --- | --- | --- |
| Afrique | Catalogue Afrique 2027 FR | Africa Catalogue 2027 EN |
| International | Catalogue international 2027 FR | International Catalogue 2027 EN |

Les clients existants restent volontairement sur `unknown` pour l'orientation. Aucun segment n'est imposé à partir du pays.

## Compositeur

- Lorsque langue et orientation sont renseignées, le modèle correspondant est préparé automatiquement depuis la fiche client.
- Lorsqu'une donnée manque, l'utilisateur la choisit dans deux sélecteurs compacts puis clique sur `Appliquer`.
- Changer de combinaison remplace le catalogue précédent sans supprimer les pièces jointes manuelles.
- Un seul catalogue officiel peut être joint automatiquement.
- Le texte, l'objet, la priorité, la signature et les pièces jointes restent modifiables avant l'envoi.

## Transport des fichiers

Le navigateur transmet uniquement une clé documentaire. Le serveur récupère le PDF officiel, vérifie sa signature `%PDF-`, contrôle la taille totale puis l'ajoute au message. Cette architecture évite l'erreur Vercel `413`.

## Migration

Exécuter `supabase/migrations/038_client_communication_market.sql` avant le déploiement du code.
