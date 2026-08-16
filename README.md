# IM Energie CRM — V28

CRM interne d’Invest Mentor Énergie pour la gestion commerciale, les projets,
les achats, les documents et le suivi financier.

## Installation

Prérequis : Node.js 20 ou version LTS plus récente.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Renseigner les variables de `.env.local` sans jamais transmettre ni versionner
ce fichier. Les secrets `SUPABASE_SERVICE_ROLE_KEY` et `OPENAI_API_KEY` doivent
rester exclusivement côté serveur.

## Base de données

Appliquer dans l’ordre toutes les migrations présentes dans :

```text
supabase/migrations/001_...sql
...
supabase/migrations/030_security_and_integrity_hardening.sql
```

Le bucket privé utilisé pour les documents est :

```text
project-documents
```

## Validation

```bash
npm run type-check
npm run lint
npm run test:business
npm run test:migrations
npm run test:pdf
npm run build
```

La validation complète est disponible avec :

```bash
npm run validate:final
```

## Livraison propre

```bash
scripts/create-release-archive.sh
```

Ce script exclut les secrets, `node_modules`, `.next`, les sauvegardes locales
et les caches TypeScript.

## Stack

- Next.js 16 et React 19
- TypeScript et Tailwind CSS
- Supabase PostgreSQL, Auth, Storage et Realtime
- React PDF, ExcelJS et jsPDF
- OpenAI pour Lydie AI

## Modules

- Dashboard et rapports
- Clients et opportunités
- Quotations et proformas
- Projets, exécution et clôture
- Partenaires, achats et commandes
- Paiements et saisie financière
- Documents et transmittals
- Calculateurs techniques
- Website Leads
- Tâches, notifications et Lydie AI
- Administration et journal d’activité

Les corrections propres à cette version sont détaillées dans
`V28_SECURITY_HARDENING.md`.
