# V34 — Messagerie responsive professionnelle

## Affichage

- Écran large (à partir de 1500 px disponibles) : navigation 15 %, liste 20 %, lecture 65 %.
- Écran intermédiaire : navigation 30 %, liste ou lecture 70 %.
- Petit écran : navigation en panneau, puis liste ou lecture plein espace avec bouton Retour.
- Corps des messages normalisé pour supprimer les espacements excessifs.

## Fonctions essentielles

- Recherche et tri : récents, anciens, expéditeur, non lus.
- Répondre, répondre à tous, transférer, archiver, suivre, marquer non lu, supprimer/restaurer.
- Pièces jointes à l'envoi : 5 fichiers, 10 Mo maximum.
- Priorité normale ou haute.
- Signature et police de rédaction personnelles, synchronisées par compte dans Supabase.
- Gestion sûre des réponses serveur non JSON.

## Installation

Exécuter la migration `034_email_preferences.sql` une seule fois dans Supabase avant le déploiement.

## Validation

- TypeScript : OK
- ESLint : OK
- Tests métier : 18/18
- Migrations : 34/34
- Build Next.js : OK

Cette version ne nécessite aucune modification Google Cloud.
