// ═══════════════════════════════════════════════════════════════════
// Lydie AI — Constructeur de contexte système
// Assistante CRM intelligente pour Invest Mentor Énergie
// ═══════════════════════════════════════════════════════════════════

export type ContextType =
  | 'commercial'
  | 'technique'
  | 'projet'
  | 'dashboard'
  | 'general'

export interface LydieContext {
  user: {
    id: string
    full_name: string
    role: string
  }

  crm: {
    clients?: Record<string, unknown>[]
    opportunities?: Record<string, unknown>[]
    projects?: Record<string, unknown>[]
    payments?: Record<string, unknown>[]
    quotations?: Record<string, unknown>[]
    proformas?: Record<string, unknown>[]
    documents?: Record<string, unknown>[]
    projectDocuments?: Record<string, unknown>[]
    transmittals?: Record<string, unknown>[]
    calculations?: Record<string, unknown>[]
    stats?: Record<string, unknown>
    searchResults?: Record<string, unknown>
  }
}

export function buildSystemPrompt(
  ctx: LydieContext,
  contextType: ContextType
): string {
  const { user, crm } = ctx
  const isCommercial = user.role === 'commercial'

  const identity = `
Tu es **Lydie AI**, l’assistante technico-commerciale interne d’**Invest Mentor Énergie (IM Energie)**.

Tu n’es pas un chatbot générique.
Tu es une assistante CRM professionnelle, capable d’aider l’équipe IM Energie dans le suivi commercial, la qualification technique, les projets et les documents.

POSITIONNEMENT IMPÉRATIF :
- IM Energie est une structure de facilitation B2B et de sourcing, pas un fabricant.
- Tu ne présentes jamais IM Energie comme fabricant, bureau de certification ou autorité technique finale.
- Tu ne sélectionnes jamais seule une référence, une architecture ou un fabricant.
- Tu ne garantis jamais un prix, un délai, une disponibilité, une conformité ou une performance non validés.
- Toute validation technique finale appartient à un ingénieur ou à un fabricant qualifié.

Tu maîtrises :
- le développement commercial B2B industriel
- les clients, projets, opportunités et quotations
- la qualification des besoins liés aux UPS, batteries, rectifiers, BESS et inverters
- le suivi de projet, les documents, transmittals et proformas
- la communication professionnelle avec les clients

Ton comportement :
- tu réponds avec courtoisie et professionnalisme
- tu prends le temps d’analyser la demande
- tu évites les réponses robotiques ou trop brusques
- tu réponds avec des données concrètes quand elles sont disponibles
- tu ne devines jamais une information CRM absente
- tu distingues clairement les faits, les absences de données et les recommandations
- tu réponds en français impeccable

Ton style selon le contexte :
- Commercial : élégant, clair, persuasif
- Projet : factuel, structuré, orienté action
- Technique : pédagogique, simple et fiable
- Direction : synthétique, stratégique, priorisé

Utilisateur actuel : ${user.full_name} (${roleLabel(user.role)})
Date : ${new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}
`

  const confidentiality = isCommercial
    ? `
RÈGLES DE CONFIDENTIALITÉ — PROFIL COMMERCIAL :
- Tu ne dois jamais mentionner les prix d’achat.
- Tu ne dois jamais mentionner les marges internes.
- Tu ne dois jamais déduire ou calculer des coûts fournisseurs.
- Tu ne dois afficher que les informations accessibles à ce commercial.
- Si l’utilisateur demande une marge ou un prix achat, réponds :
  "Ces informations sont confidentielles."
`
    : `
RÈGLES DE CONFIDENTIALITÉ — PROFIL ADMIN / LEAD TEAM :
- Tu peux analyser les données globales du CRM.
- Tu peux mentionner les performances, le pipeline et les paiements.
- Tu dois rester discret avec les données sensibles.
- Tu ne dois jamais inventer une information financière absente.
`

  let crmContext = `
DONNÉES CRM DISPONIBLES :
`

  if (crm.searchResults && Object.keys(crm.searchResults).length > 0) {
    crmContext += `

RÉSULTATS DE RECHERCHE CRM PRIORITAIRES :

${JSON.stringify(crm.searchResults, null, 2)}

RÈGLE ABSOLUE :
- Si les résultats de recherche contiennent des données, utilise-les en priorité.
- Réponds uniquement à partir de ces résultats lorsqu’ils correspondent à la question.
- Ne complète pas avec une invention.
- Si aucun résultat pertinent n’est trouvé, dis-le clairement.
- Si plusieurs résultats existent, présente-les proprement en liste ou tableau.
`
  }

  if (crm.clients?.length) {
    crmContext += `

Clients disponibles (${crm.clients.length}) :
${crm.clients
  .slice(0, 20)
  .map(
    (c) =>
      `- ${c.company_name ?? 'Client'} | ${c.country ?? '—'} | ${
        c.status ?? '—'
      } | Secteur : ${c.sector ?? '—'}`
  )
  .join('\n')}`
  }

  if (crm.opportunities?.length) {
    crmContext += `

Opportunités actives (${crm.opportunities.length}) :
${crm.opportunities
  .slice(0, 15)
  .map(
    (o) =>
      `- ${o.name ?? 'Opportunité'} | Client : ${
        (o.clients as { company_name?: string } | null)?.company_name ?? '?'
      } | Étape : ${o.pipeline_stage ?? '—'} | Valeur : ${
        o.estimated_sell ? `${o.estimated_sell} ${o.currency ?? ''}` : 'non définie'
      }`
  )
  .join('\n')}`
  }

  if (crm.projects?.length) {
    crmContext += `

Projets actifs (${crm.projects.length}) :
${crm.projects
  .slice(0, 15)
  .map((p) => {
    const late =
      p.expected_delivery &&
      new Date(String(p.expected_delivery)) < new Date() &&
      !['livre', 'cloture', 'annule'].includes(String(p.status))

    return `- ${p.reference ?? '—'} | ${p.name ?? 'Projet'} | Client : ${
      (p.clients as { company_name?: string } | null)?.company_name ?? '?'
    } | Statut : ${p.status ?? '—'} | Avancement : ${
      p.progress_pct ?? 0
    }%${late ? ' | EN RETARD' : ''}`
  })
  .join('\n')}`
  }

  if (crm.payments?.length) {
    const latePayments = crm.payments.filter(
      (p) =>
        p.due_date &&
        new Date(String(p.due_date)) < new Date() &&
        !['paye', 'annule'].includes(String(p.status))
    )

    crmContext += `

Paiements suivis :
- Total : ${crm.payments.length}
- En retard : ${latePayments.length}
${latePayments
  .slice(0, 5)
  .map(
    (p) =>
      `- ${p.reference ?? 'Paiement'} | Client : ${
        (p.clients as { company_name?: string } | null)?.company_name ?? '?'
      } | Montant : ${p.total_amount ?? '—'} ${p.currency ?? ''} | Échéance : ${
        p.due_date ?? '—'
      }`
  )
  .join('\n')}`
  }

  if (crm.quotations?.length) {
    const activeQuotations = crm.quotations.filter(
      (q) => !['approuvee', 'perdue', 'annulee'].includes(String(q.status))
    )

    const total = activeQuotations.reduce(
      (sum, q) => sum + (Number(q.total_sell) || 0),
      0
    )

    crmContext += `

Quotations :
- En cours : ${activeQuotations.length}
- Valeur totale estimée : ${total.toLocaleString()} USD`
  }

  if (crm.proformas?.length) {
    crmContext += `

Proformas récentes (${crm.proformas.length}) :
${crm.proformas
  .slice(0, 10)
  .map(
    (p) =>
      `- ${p.number ?? 'Proforma'} | Statut : ${
        p.payment_status ?? p.status ?? '—'
      } | Montant : ${p.total_sell ?? p.total_amount ?? '—'} ${
        p.currency ?? ''
      }`
  )
  .join('\n')}`
  }

  if (crm.documents?.length) {
    crmContext += `

Documents globaux récents (${crm.documents.length}) :
${crm.documents
  .slice(0, 15)
  .map(
    (d) =>
      `- ${d.title ?? d.file_name ?? d.name ?? 'Document'} | Type : ${
        d.document_type ?? d.type ?? '—'
      } | Statut : ${d.status ?? '—'} | Rev : ${d.revision ?? '0'}`
  )
  .join('\n')}`
  }

  if (crm.projectDocuments?.length) {
    crmContext += `

Documents projet récents (${crm.projectDocuments.length}) :
${crm.projectDocuments
  .slice(0, 15)
  .map(
    (d) =>
      `- ${d.file_name ?? d.title ?? 'Document'} | Projet : ${
        d.project_id ?? '—'
      } | Type : ${d.document_type ?? '—'} | Rev : ${
        d.revision ?? '0'
      } | Statut : ${d.status ?? '—'}`
  )
  .join('\n')}`
  }

  if (crm.transmittals?.length) {
    crmContext += `

Transmittals récents (${crm.transmittals.length}) :
${crm.transmittals
  .slice(0, 10)
  .map(
    (t) =>
      `- ${t.transmittal_number ?? t.number ?? 'TR'} | Client : ${
        t.client_name ?? '—'
      } | Sujet : ${t.subject ?? '—'} | Date : ${t.created_at ?? '—'}`
  )
  .join('\n')}`
  }

  if (crm.calculations?.length) {
    crmContext += `

Calculs techniques récents (${crm.calculations.length}) :
${crm.calculations
  .slice(0, 5)
  .map(
    (c) =>
      `- ${String(c.calc_type ?? '').toUpperCase()} | ${
        c.name ?? 'Sans nom'
      } | ${new Date(String(c.created_at)).toLocaleDateString('fr-FR')}`
  )
  .join('\n')}`
  }

  const contextInstructions: Record<ContextType, string> = {
    commercial: `
MODE : ASSISTANCE COMMERCIALE
- Aide à rédiger des emails, relances, messages WhatsApp et propositions.
- Personnalise les réponses avec les données CRM disponibles.
- Reste professionnel, diplomatique et orienté client.
- Quand une opportunité ou quotation est mentionnée, vérifie les données avant de répondre.
`,

    technique: `
MODE : ASSISTANCE TECHNIQUE
- Explique simplement les sujets UPS, batteries, rectifiers, BESS et inverters.
- Reformule le besoin et identifie les données manquantes utiles.
- Utilise uniquement un calcul déjà enregistré dans le CRM ; ne dimensionne pas une solution depuis la conversation.
- Ne choisis pas de référence, de fabricant ou d’architecture à la place de l’équipe technique.
- Présente toute donnée indicative comme non contractuelle et soumise à validation.
- Termine toute réponse technique impliquant une configuration par :
  "Cette configuration doit être validée par l’équipe technique et le fabricant concerné."
`,

    projet: `
MODE : SUIVI PROJET
- Analyse les statuts, retards, documents, livraisons et transmittals.
- Mets en avant les urgences.
- Propose des actions concrètes.
- Si un projet précis est trouvé, commence par sa référence, son client, son statut et son avancement.
`,

    dashboard: `
MODE : ANALYSE DASHBOARD
- Analyse le pipeline, les performances, les tendances et les priorités.
- Classe les informations par impact commercial.
- Présente les chiffres importants clairement.
- Ne crée jamais de statistiques qui ne sont pas dans les données.
`,

    general: `
MODE : ASSISTANCE GÉNÉRALE
- Réponds aux questions liées à IME, au CRM et aux activités de l’entreprise.
- Si la question sort du périmètre CRM/IME, réponds poliment et recentre si nécessaire.
`,
  }

  const globalRules = `
RÈGLES GÉNÉRALES DE RÉPONSE :
- Ne jamais inventer un client, projet, devis, proforma, document ou transmittal.
- Ne jamais inventer un statut ou une date.
- Si une donnée est absente, écrire clairement : "Je ne trouve pas cette information dans les données disponibles."
- Si plusieurs résultats sont possibles, demander ou proposer une clarification.
- Répondre avec une structure claire.
- Être courtoise, professionnelle et naturelle.
- Éviter les réponses trop longues sauf si l’utilisateur demande une analyse détaillée.
`

  return [
    identity,
    confidentiality,
    crmContext,
    contextInstructions[contextType],
    globalRules,
  ].join('\n')
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrateur',
    lead_team: 'Lead Team',
    commercial: 'Commercial',
  }

  return labels[role] ?? role
}

export function detectContextType(message: string): ContextType {
  const msg = message.toLowerCase()

  const techKeywords = [
    'calcul',
    'ups',
    'batterie',
    'battery',
    'rectifier',
    'bess',
    'kwh',
    'kva',
    'ampère',
    'dimensionne',
    'tension',
    'chargeur',
    'inverter',
  ]

  const projectKeywords = [
    'projet',
    'project',
    'retard',
    'deadline',
    'livraison',
    'étape',
    'workflow',
    'paiement',
    'en retard',
    'transmittal',
    'document',
  ]

  const dashboardKeywords = [
    'pipeline',
    'performance',
    'statistique',
    'meilleur',
    'commercial',
    'résumé',
    'analyse',
    'top',
    'classement',
  ]

  const commercialKeywords = [
    'email',
    'relance',
    'rédige',
    'prépare',
    'écris',
    'client',
    'opportunité',
    'quotation',
    'devis',
    'offre',
    'proforma',
  ]

  if (techKeywords.some((k) => msg.includes(k))) return 'technique'
  if (projectKeywords.some((k) => msg.includes(k))) return 'projet'
  if (dashboardKeywords.some((k) => msg.includes(k))) return 'dashboard'
  if (commercialKeywords.some((k) => msg.includes(k))) return 'commercial'

  return 'general'
}

export const LYDIE_SUGGESTIONS: Record<string, string[][]> = {
  admin: [
    ['📊 Pipeline', 'Résume le pipeline commercial du mois'],
    ['⚠️ Retards', 'Quels projets et paiements sont en retard ?'],
    ['🏆 Performance', 'Qui sont les meilleurs commerciaux ce mois ?'],
    ['💰 Paiements', 'Quels paiements sont attendus cette semaine ?'],
  ],

  lead_team: [
    ['📊 Pipeline', 'Résume le pipeline commercial actuel'],
    ['⚠️ Retards', 'Quels projets sont en retard ?'],
    ['📋 Projets', 'Donne-moi un résumé des projets en cours'],
    ['💬 Email', 'Rédige une relance client professionnelle'],
  ],

  commercial: [
    ['📋 Mes clients', 'Résume mes clients actifs et opportunités'],
    ['💬 Relance', 'Rédige une relance pour mon opportunité principale'],
    ['🔋 Calcul', 'Explique comment dimensionner un UPS'],
    ['📧 Email', 'Aide-moi à rédiger un email de suivi quotation'],
  ],
}

export const LYDIE_STARTERS = [
  'Bonjour ! Je suis **Lydie**, votre assistante IA chez Invest Mentor Énergie.',
  'Je peux vous aider avec :',
  '• **Commercial** — emails, relances, résumés d’opportunités',
  '• **Technique** — interprétation des calculs UPS / batteries',
  '• **Projets** — suivi, retards, deadlines',
  '• **Analyse** — performances, pipeline, insights',
  '',
  'Que puis-je faire pour vous ?',
]
