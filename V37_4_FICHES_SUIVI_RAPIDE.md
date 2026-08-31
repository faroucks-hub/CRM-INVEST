# V37.4 — Fiches de suivi commercial rapide

## Objectif

Séparer strictement la consultation de la modification dans les listes Clients et Website Leads.

## Comportement

- Clic sur une ligne ou un nom : panneau latéral de suivi en lecture seule.
- Bouton œil : même panneau de consultation.
- Bouton crayon Client : seul accès direct au formulaire de modification.
- Bouton « Fiche complète » : accès à la page détaillée existante.
- Bouton « Écrire » : messagerie interne du CRM, avec destinataire prérempli.

## Informations présentées

- statut métier et état du contact ;
- coordonnées, localisation, source et responsable ;
- résumé commercial existant ;
- dernier contact, dernière réponse et compteurs d'échanges ;
- dernier objet d'e-mail ;
- prochaine relance active, son échéance et son responsable ;
- alerte explicite lorsqu'aucune prochaine action n'est planifiée.

La prochaine action est également visible directement dans les deux listes.

## Données et sécurité

- aucune nouvelle table ou migration ;
- aucun corps d'e-mail copié depuis Gmail ;
- réutilisation des engagements et tâches V37.3 soumis aux politiques RLS existantes ;
- aucune modification de l'authentification Gmail ou des permissions commerciales.
