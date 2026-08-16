# Lydie AI — Configuration & Guide

## Vue d'ensemble

Lydie AI est l'assistante executive intelligente intégrée à IME CRM.
Elle est propulsée par **GPT-4o-mini** (OpenAI) avec un contexte CRM injecté dynamiquement.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (navigateur)                   │
│                                                         │
│   LydieChat.tsx          LydiePageClient.tsx            │
│   (bouton flottant)      (page /lydie)                  │
│         │                        │                      │
└─────────┼────────────────────────┼──────────────────────┘
          │ POST /api/lydie        │ Supabase Client
          ▼                        ▼
┌─────────────────────┐   ┌──────────────────────────────┐
│  /api/lydie/route.ts│   │  Table ai_conversations       │
│                     │   │  Vue lydie_usage_stats        │
│  1. Auth Supabase   │   └──────────────────────────────┘
│  2. Charge contexte │
│     CRM selon rôle  │
│  3. Injecte dans    │
│     system prompt   │
│  4. Appel OpenAI    │
│  5. Sauvegarde hist.│
└─────────┬───────────┘
          │
          ▼
┌──────────────────────┐
│  OpenAI GPT-4o-mini  │
│  Max 1200 tokens     │
│  Température 0.7     │
└──────────────────────┘
```

---

## Variables d'environnement requises

```bash
# .env.local (développement)
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Supabase (déjà configurées)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # optionnel, sécurité renforcée
```

### Sur Vercel (production)
Vercel Dashboard → Project → Settings → **Environment Variables**
- Ajouter `OPENAI_API_KEY` avec votre clé

---

## Configuration Supabase

Exécuter dans Supabase SQL Editor :

```sql
-- supabase/migrations/006_sprint6_lydie_ai.sql
```

Cela crée :
- Table `ai_conversations` avec RLS
- Vue `lydie_usage_stats` pour le dashboard
- Politiques de sécurité par rôle

---

## Sécurité & Confidentialité

### Filtrage par rôle
Le system prompt injecté varie selon le rôle :

| Rôle | Données accessibles | Données bloquées |
|------|---------------------|------------------|
| `admin` | Tout | — |
| `lead_team` | Tout | — |
| `commercial` | Ses clients / projets / quotations | Prix achat · Marges · Données autres commerciaux |

### Dans le code (`lib/lydie/context.ts`)
```typescript
const isCommercial = user.role === 'commercial'
// → prompt différent avec règles de confidentialité
// → données filtrées avec .eq('assigned_to', user.id)
```

---

## Fonctionnalités V1

### A. Assistance commerciale
```
"Rédige une relance pour le client Banque Abidjan"
"Résume mes opportunités ouvertes au Ghana"
"Prépare un email de suivi pour la quotation IME-25-Q0042"
"Quels clients n'ont pas été contactés depuis 2 semaines ?"
```

### B. Assistance technique
```
"Explique ce calcul batterie UPS 100 kVA"
"Quelle configuration batterie recommander pour 48V / 200Ah ?"
"Résume mon dernier dimensionnement BESS"
"Quelle est la différence entre VRLA et Li-ion en autonomie ?"
```
⚠️ Toujours affiché : "Les résultats doivent être validés par un responsable technique."

### C. Assistance projets
```
"Quels projets sont en retard ?"
"Donne-moi l'état du projet IME-25-PRJ-0012"
"Quels paiements sont attendus cette semaine ?"
"Quelles deadlines arrivent dans les 7 prochains jours ?"
```

### D. Analyse dashboard
```
"Résume le pipeline commercial du mois"
"Qui sont les meilleurs commerciaux cette semaine ?"
"Quelle est la valeur totale du pipeline actif ?"
"Quels sont les projets les plus urgents ?"
```

---

## Interface utilisateur

### Bouton flottant
- Position : bas-droite de l'écran
- Raccourci clavier : **⌘L** (Mac) / **Ctrl+L** (Windows)
- Dot de notification au premier chargement
- Tooltip au survol

### Panneau chat
- Suggestions prédéfinies selon le rôle (4 suggestions visibles)
- Détection automatique du contexte (commercial / technique / projet / dashboard)
- Badge de contexte sur chaque réponse
- Rendu Markdown : **gras**, *italique*, `code`, listes
- Copier le message en un clic
- Mode étendu (plein écran)
- Nouvelle conversation (reset)

### Page dédiée `/lydie`
- Statistiques personnelles (messages par contexte)
- Historique complet avec expansion des réponses
- Stats équipe (admin/lead_team uniquement)
- Guide de configuration

---

## Coûts estimés (GPT-4o-mini)

| Usage | Tokens/mois | Coût estimé |
|-------|-------------|-------------|
| 1 commercial (20 msg/j) | ~180K | ~$0.03 |
| Équipe 5 personnes | ~900K | ~$0.15 |
| Équipe 10 personnes | ~1.8M | ~$0.30 |

GPT-4o-mini : $0.15/M tokens input · $0.60/M tokens output

---

## Roadmap Lydie AI V2 (Sprint futur)

- [ ] WhatsApp AI — réponse automatique via WhatsApp Business
- [ ] Voice AI — interface vocale
- [ ] Génération automatique de quotations
- [ ] Analyse concurrentielle
- [ ] Agents autonomes (relances automatiques)
- [ ] Intégration calculateurs avancés
- [ ] PDF intelligent avec analyse Lydie

---

*Lydie AI — Invest Mentor Énergie · Confidentiel*
