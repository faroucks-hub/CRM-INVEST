# IM Énergie CRM V31.1

Correction ciblée de l’administration du catalogue :

- déplacement de **Produits du site** vers la section **Pilotage** ;
- accès inchangé : Administrateur et Lead uniquement ;
- remplacement de la grille de cartes par une liste de gestion compacte ;
- affichage en colonnes sur ordinateur et empilement adapté sur mobile ;
- aucune modification de la base Supabase ni des actions serveur.

Après extraction, exécuter :

```bash
npm run type-check
npm run lint
npm run test:business
npm run build
```
