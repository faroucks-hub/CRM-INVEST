// ═══════════════════════════════════════════════════════════════════
// IME CRM — Types TypeScript Sprint 1 + Sprint 2
// ═══════════════════════════════════════════════════════════════════

export type UserRole = 'admin' | 'lead_team' | 'commercial'

export type ClientStatus =
  | 'prospect' | 'qualifie' | 'actif' | 'inactif' | 'perdu'
  | 'distributeur' | 'partenaire'

export type ClientSector =
  | 'banques_finance' | 'telecommunications' | 'mines_extraction'
  | 'data_centers' | 'hopitaux_sante' | 'marine_offshore'
  | 'industrie' | 'solaire_energie' | 'autre'

export type LeadSource =
  | 'linkedin' | 'whatsapp' | 'salon' | 'recommandation'
  | 'email' | 'site_web' | 'appel_entrant' | 'autre'

export type SupplierType =
  | 'fabricant_turc' | 'fabricant_hors_turquie' | 'partenaire_technique'
  | 'sous_traitant' | 'distributeur'

export type OppPipeline =
  | 'nouveau_lead' | 'besoin_identifie' | 'etude_technique'
  | 'offre_preparation' | 'offre_envoyee' | 'negociation'
  | 'commande_recue' | 'projet_en_cours' | 'projet_livre' | 'perdu_annule'

export type OpportunityStage = OppPipeline

export type ProjectStatus =
  | 'commande' | 'fabrication' | 'logistique' | 'installation'
  | 'commissioning' | 'garantie' | 'cloture'

export type DocumentStatus =
  | 'brouillon' | 'envoye' | 'en_revision'
  | 'accepte' | 'refuse' | 'expire' | 'annule'

export type PaymentStatus = 'en_attente' | 'partiel' | 'recu' | 'retard' | 'annule'
export type PaymentType   = 'acompte' | 'solde' | 'partiel' | 'remboursement'
export type Currency      = 'USD' | 'EUR' | 'TRY' | 'XOF'

export type ProductCategory =
  | 'ups_monophase' | 'ups_triphase' | 'ups_industriel'
  | 'redresseur' | 'onduleur' | 'convertisseur_frequence' | 'sts'
  | 'batterie_vrla' | 'batterie_liion' | 'batterie_opzs' | 'batterie_nicd'
  | 'systeme_solaire' | 'bess' | 'tableau_distribution'
  | 'regulateur_tension' | 'accessoire' | 'service' | 'autre'

// ── Interfaces ───────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string | null
  phone?: string | null
  position?: string | null
  is_active: boolean
  last_login_at?: string | null
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  reference?: string | null
  company_name: string
  trade_name?: string | null
  sector?: ClientSector | null
  status: ClientStatus
  country: string
  city?: string | null
  address?: string | null
  website?: string | null
  linkedin_url?: string | null
  contact_name?: string | null
  contact_title?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  contact_whatsapp?: string | null
  communication_language?: 'fr' | 'en' | 'unknown' | null
  communication_market?: 'africa' | 'international' | 'unknown' | null
  whatsapp?: string | null
  contact2_name?: string | null
  contact2_email?: string | null
  contact2_phone?: string | null
  assigned_to?: string | null
  lead_source?: LeadSource | null
  source?: string | null
  currency_pref?: Currency | null
  payment_terms?: string | null
  credit_limit?: number | null
  technical_notes?: string | null
  employee_count?: string | null
  tags?: string[] | null
  notes?: string | null
  is_archived: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
  assigned_user?: Pick<UserProfile, 'id' | 'full_name' | 'role'>
}

export interface Supplier {
  id: string
  reference?: string | null
  company_name: string
  supplier_type?: SupplierType | null
  country: string
  city?: string | null
  website?: string | null
  linkedin_url?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  whatsapp?: string | null
  certifications?: string[] | null
  payment_terms?: string | null
  currency_pref?: Currency | null
  lead_time_days?: number | null
  discount_rate?: number | null
  product_categories?: ProductCategory[] | null
  products_desc?: string | null
  notes?: string | null
  is_active: boolean
  is_preferred: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface Opportunity {
  id: string
  reference?: string | null
  name: string
  client_id: string
  assigned_to?: string | null
  stage: OppPipeline
  estimated_sell?: number | null
  estimated_buy?: number | null
  estimated_margin?: number | null
  currency: Currency
  sector?: ClientSector | null
  product_type?: ProductCategory | null
  description?: string | null
  technical_specs?: string | null
  probability: number
  expected_close?: string | null
  next_followup?: string | null
  lost_reason?: string | null
  source?: LeadSource | null
  tags?: string[] | null
  notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  client?: Pick<Client, 'id' | 'company_name' | 'country' | 'sector'>
  assigned_user?: Pick<UserProfile, 'id' | 'full_name'>
}

// ── Labels ───────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur', lead_team: 'Lead Team', commercial: 'Commercial',
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: 'Prospect', qualifie: 'Qualifié', actif: 'Client actif',
  inactif: 'Inactif', perdu: 'Perdu', distributeur: 'Distributeur', partenaire: 'Partenaire',
}

export const CLIENT_STATUS_COLORS: Record<ClientStatus, string> = {
  prospect:     'bg-blue-50 text-blue-700 border-blue-200',
  qualifie:     'bg-purple-50 text-purple-700 border-purple-200',
  actif:        'bg-green-50 text-green-700 border-green-200',
  inactif:      'bg-gray-50 text-gray-500 border-gray-200',
  perdu:        'bg-red-50 text-red-600 border-red-200',
  distributeur: 'bg-amber-50 text-amber-700 border-amber-200',
  partenaire:   'bg-teal-50 text-teal-700 border-teal-200',
}

export const SECTOR_LABELS: Record<ClientSector, string> = {
  banques_finance: 'Banques & Finance', telecommunications: 'Télécommunications',
  mines_extraction: 'Mines & Extraction', data_centers: 'Data Centers',
  hopitaux_sante: 'Hôpitaux & Santé', marine_offshore: 'Marine & Offshore',
  industrie: 'Industrie', solaire_energie: 'Solaire & Énergie', autre: 'Autre',
}

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  linkedin: 'LinkedIn', whatsapp: 'WhatsApp', salon: 'Salon / Événement',
  recommandation: 'Recommandation', email: 'Email entrant', site_web: 'Site web',
  appel_entrant: 'Appel entrant', autre: 'Autre',
}

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  fabricant_turc: 'Fabricant turc', fabricant_hors_turquie: 'Fabricant hors Turquie',
  partenaire_technique: 'Partenaire technique', sous_traitant: 'Sous-traitant',
  distributeur: 'Distributeur',
}

export const PIPELINE_LABELS: Record<OppPipeline, string> = {
  nouveau_lead: 'Nouveau lead', besoin_identifie: 'Besoin identifié',
  etude_technique: 'Étude technique', offre_preparation: 'Offre en préparation',
  offre_envoyee: 'Offre envoyée', negociation: 'Négociation',
  commande_recue: 'Commande reçue', projet_en_cours: 'Projet en cours',
  projet_livre: 'Projet livré', perdu_annule: 'Perdu / Annulé',
}

export const PIPELINE_COLORS: Record<OppPipeline, { bg: string; text: string; border: string; dot: string; header: string }> = {
  nouveau_lead:      { bg: 'bg-slate-50',   text: 'text-slate-600',  border: 'border-slate-200', dot: 'bg-slate-400',   header: 'bg-slate-100' },
  besoin_identifie:  { bg: 'bg-sky-50',     text: 'text-sky-700',    border: 'border-sky-200',   dot: 'bg-sky-500',     header: 'bg-sky-100' },
  etude_technique:   { bg: 'bg-indigo-50',  text: 'text-indigo-700', border: 'border-indigo-200',dot: 'bg-indigo-500',  header: 'bg-indigo-100' },
  offre_preparation: { bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200',dot: 'bg-violet-500',  header: 'bg-violet-100' },
  offre_envoyee:     { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200',dot: 'bg-purple-500',  header: 'bg-purple-100' },
  negociation:       { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200', dot: 'bg-amber-500',   header: 'bg-amber-100' },
  commande_recue:    { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200',dot: 'bg-orange-500',  header: 'bg-orange-100' },
  projet_en_cours:   { bg: 'bg-teal-50',    text: 'text-teal-700',   border: 'border-teal-200',  dot: 'bg-teal-500',    header: 'bg-teal-100' },
  projet_livre:      { bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200', dot: 'bg-green-500',   header: 'bg-green-100' },
  perdu_annule:      { bg: 'bg-red-50',     text: 'text-red-600',    border: 'border-red-200',   dot: 'bg-red-400',     header: 'bg-red-100' },
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$', EUR: '€', TRY: '₺', XOF: 'CFA',
}

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  ups_monophase: 'UPS Monophasé', ups_triphase: 'UPS Triphasé',
  ups_industriel: 'UPS Industriel', redresseur: 'Redresseur',
  onduleur: 'Onduleur', convertisseur_frequence: 'Convertisseur fréquence',
  sts: 'STS', batterie_vrla: 'Batterie VRLA', batterie_liion: 'Batterie Li-ion',
  batterie_opzs: 'Batterie OPzS', batterie_nicd: 'Batterie Ni-Cd',
  systeme_solaire: 'Système solaire', bess: 'BESS',
  tableau_distribution: 'Tableau distribution', regulateur_tension: 'Régulateur tension',
  accessoire: 'Accessoire', service: 'Service', autre: 'Autre',
}

export const ACTIVE_STAGES: OppPipeline[] = [
  'nouveau_lead', 'besoin_identifie', 'etude_technique',
  'offre_preparation', 'offre_envoyee', 'negociation',
  'commande_recue', 'projet_en_cours',
]

export const canSeePrices    = (r?: UserRole | null): boolean => r === 'admin' || r === 'lead_team'
export const canSeeMargins   = (r?: UserRole | null): boolean => r === 'admin' || r === 'lead_team'
export const canSeeSuppliers = (r?: UserRole | null): boolean => r === 'admin' || r === 'lead_team'
export const canDeleteRecord = (r?: UserRole | null): boolean => r === 'admin'

export const IME_COUNTRIES = [
  "Côte d'Ivoire", 'Sénégal', 'Ghana', 'Nigeria', 'Cameroun',
  'Kenya', 'Togo', 'Bénin', 'Mali', 'Burkina Faso',
  'Guinée', 'Congo', 'RDC', 'Gabon', 'Angola',
  'Éthiopie', 'Tanzanie', 'Mozambique', 'Turquie', 'France', 'Autre',
]
