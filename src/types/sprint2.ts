// ── Sprint 2 — Types supplémentaires ─────────────────────────────

export type SupplierType =
  | 'fabricant_turc'
  | 'fabricant_hors_turquie'
  | 'partenaire_technique'
  | 'sous_traitant'
  | 'distributeur'
  | 'logistique'
  | 'agent_representant'
  | 'prestataire_service'
  | 'bureau_etudes'
  | 'partenaire_strategique'

export type LeadSource =
  | 'linkedin' | 'whatsapp' | 'salon' | 'recommandation'
  | 'email' | 'site_web' | 'autre'

export type OppPipelineStage =
  | 'nouveau_lead'
  | 'besoin_identifie'
  | 'etude_technique'
  | 'offre_preparation'
  | 'offre_envoyee'
  | 'negociation'
  | 'commande_recue'
  | 'projet_en_cours'
  | 'projet_livre'
  | 'perdu_annule'

// ── Labels ────────────────────────────────────────────────────────

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  fabricant_turc:           'Fabricant turc',
  fabricant_hors_turquie:   'Fabricant hors Turquie',
  partenaire_technique:     'Partenaire technique',
  sous_traitant:            'Sous-traitant',
  distributeur:             'Distributeur',
  logistique:               'Logistique / Transitaire',
  agent_representant:       'Agent / Représentant',
  prestataire_service:      'Prestataire de services',
  bureau_etudes:            'Bureau d’études / Ingénierie',
  partenaire_strategique:   'Partenaire stratégique',
}

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  linkedin:         'LinkedIn',
  whatsapp:         'WhatsApp',
  salon:            'Salon / Événement',
  recommandation:   'Recommandation',
  email:            'Email entrant',
  site_web:         'Site web',
  autre:            'Autre',
}

export const PIPELINE_STAGE_LABELS: Record<OppPipelineStage, string> = {
  nouveau_lead:       'Nouveau lead',
  besoin_identifie:   'Besoin identifié',
  etude_technique:    'Étude technique',
  offre_preparation:  'Offre en préparation',
  offre_envoyee:      'Offre envoyée',
  negociation:        'Négociation',
  commande_recue:     'Commande reçue',
  projet_en_cours:    'Projet en cours',
  projet_livre:       'Projet livré',
  perdu_annule:       'Perdu / Annulé',
}

export const PIPELINE_STAGE_COLORS: Record<OppPipelineStage, string> = {
  nouveau_lead:       'bg-gray-100 text-gray-600',
  besoin_identifie:   'bg-blue-50 text-blue-700',
  etude_technique:    'bg-indigo-50 text-indigo-700',
  offre_preparation:  'bg-amber-50 text-amber-700',
  offre_envoyee:      'bg-orange-50 text-orange-700',
  negociation:        'bg-purple-50 text-purple-700',
  commande_recue:     'bg-teal-50 text-teal-700',
  projet_en_cours:    'bg-emerald-50 text-emerald-700',
  projet_livre:       'bg-green-50 text-green-700',
  perdu_annule:       'bg-red-50 text-red-600',
}

// Colonnes Kanban — séparé de "perdu/annulé" qui est en bas
export const KANBAN_COLUMNS: OppPipelineStage[] = [
  'nouveau_lead',
  'besoin_identifie',
  'etude_technique',
  'offre_preparation',
  'offre_envoyee',
  'negociation',
  'commande_recue',
  'projet_en_cours',
  'projet_livre',
]

export const CLIENT_STATUS_EXTENDED = {
  prospect:     { label: 'Prospect',      color: 'bg-gray-100 text-gray-600' },
  qualifie:     { label: 'Qualifié',      color: 'bg-blue-50 text-blue-700' },
  actif:        { label: 'Client actif',  color: 'bg-green-50 text-green-700' },
  distributeur: { label: 'Distributeur',  color: 'bg-purple-50 text-purple-700' },
  partenaire:   { label: 'Partenaire',    color: 'bg-amber-50 text-amber-700' },
  inactif:      { label: 'Inactif',       color: 'bg-gray-50 text-gray-400' },
  perdu:        { label: 'Perdu',         color: 'bg-red-50 text-red-600' },
} as const
