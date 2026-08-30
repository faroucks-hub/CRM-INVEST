# V37.3 — Suivi commercial Clients et Leads

## Objectif

Donner aux commerciaux, au Team Leader et à la direction une information fiable avant chaque prise de contact, sans ouvrir les boîtes Gmail individuelles aux autres utilisateurs.

## États affichés

- **À vérifier** : aucun contrôle Gmail n'a encore été effectué ; le CRM ne prétend pas que le contact est nouveau.
- **Jamais contacté** : Gmail a été vérifié et aucun envoi n'a été trouvé.
- **À répondre** : un message entrant existe sans envoi sortant enregistré.
- **Contacté** : au moins un envoi réussi existe.
- **Réponse reçue** : un échange entrant a été identifié.
- **Ne plus contacter** : les nouveaux envois CRM sont bloqués.

## Fonctionnement

- L'historique est unifié par adresse e-mail normalisée entre Clients et Website Leads.
- Seules les métadonnées commerciales minimales sont partagées : date, direction, objet, auteur et entités liées.
- Le corps des messages reste dans Gmail et les comptes Gmail restent individuels.
- Avant la rédaction, la boîte connectée recherche les échanges antérieurs avec le destinataire.
- Un envoi n'est comptabilisé qu'après confirmation de Gmail.
- Les messages entrants provenant de Clients ou Leads connus mettent à jour le résumé lors du chargement de la boîte de réception.
- Une relance à 3 jours, 7 jours ou à une date choisie peut être créée après l'envoi dans **Tâches & Relances**.
- Les relances peuvent être liées à un Client ou à un Website Lead.
- Lors de la conversion d'un Lead, l'historique est conservé grâce à l'adresse e-mail commune.

## Migration

Appliquer une seule fois :

`supabase/migrations/039_commercial_contact_tracking.sql`

La migration crée `contact_engagements`, `contact_touchpoints`, ajoute la politique **Ne plus contacter** aux Clients et Leads et permet de lier une tâche à un Website Lead.

## Limites assumées

- La synchronisation historique est progressive, contact par contact, pour maîtriser le quota Gmail et éviter un traitement massif imprécis.
- Le nombre Gmail peut dépasser le détail conservé localement ; seuls les 20 échanges récents de chaque direction sont matérialisés lors d'une vérification.
- Les ouvertures d'e-mails ne sont pas suivies : cette mesure est techniquement peu fiable et non nécessaire au pilotage commercial.
- Les campagnes massives et séquences automatiques ne font pas partie de cette version.
