# V37 — Catalogues 2027 et prospection depuis le CRM

## Fonctions

- Les enveloppes des clients ouvrent le compositeur interne du CRM.
- Chaque client possède une langue de communication : français, anglais ou à déterminer.
- Deux modèles sobres de présentation commerciale sont proposés en français et en anglais.
- Le catalogue international correspondant est ajouté automatiquement lorsque la langue du client est connue.
- Lorsque la langue est inconnue, l'utilisateur choisit explicitement le modèle FR ou EN.
- Un seul catalogue est joint à la fois. Le changement de langue remplace le catalogue précédent.
- Le message, l'objet et la pièce jointe restent modifiables avant l'envoi.
- La limite de cinq fichiers et 10 Mo est contrôlée dans le navigateur et sur le serveur.
- L'envoi est lié à la fiche client dans l'historique CRM.

## Déploiement

Exécuter `supabase/migrations/037_client_communication_language.sql` avant le déploiement du code.

Les fichiers placés dans `public/catalogues/` sont les éditions optimisées pour l'e-mail. Les originaux haute définition ne doivent pas être ajoutés au dépôt.

## Règle commerciale

La langue ne doit jamais être déduite automatiquement du pays. Cette donnée doit être enregistrée dans la fiche client ou choisie manuellement avant l'envoi.
