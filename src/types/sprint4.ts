// ── Sprint 4 — Projets, Paiements, Documents ──────────────────────

export type ProjectGeneralStatus =
  | 'en_attente' | 'en_cours' | 'en_retard' | 'livre' | 'cloture' | 'annule'

export type StepStatus = 'non_commence' | 'en_cours' | 'termine' | 'bloque'

export type PaymentStatusV2 =
  | 'en_attente' | 'acompte_recu' | 'partiel' | 'paye' | 'en_retard' | 'annule'

export type DocType =
  | 'quotation' | 'proforma' | 'po' | 'pi' | 'invoice' | 'packing_list'
  | 'sld' | 'design_form' | 'datasheet' | 'fat_report'
  | 'certificate' | 'photo' | 'autre'

// ── Étapes workflow (15 étapes) ───────────────────────────────────
export const WORKFLOW_STEPS: { key: string; label: string; order: number }[] = [
  { key: 'po_recu',            label: 'PO reçu',                    order: 1 },
  { key: 'docs_techniques',    label: 'Documents techniques',        order: 2 },
  { key: 'sld_envoye',         label: 'SLD envoyé',                 order: 3 },
  { key: 'design_form_envoye', label: 'Design Form envoyé',         order: 4 },
  { key: 'approbation_client', label: 'Approbation client',         order: 5 },
  { key: 'achat_materiel',     label: 'Achat matériel',             order: 6 },
  { key: 'assemblage',         label: 'Assemblage',                 order: 7 },
  { key: 'test_fat',           label: 'Test FAT',                   order: 8 },
  { key: 'emballage',          label: 'Emballage',                  order: 9 },
  { key: 'facture_commerciale',label: 'Facture commerciale',        order: 10 },
  { key: 'packing_list',       label: 'Packing List',               order: 11 },
  { key: 'expedition',         label: 'Expédition',                 order: 12 },
  { key: 'livraison',          label: 'Livraison',                  order: 13 },
  { key: 'mise_en_service',    label: 'Mise en service',            order: 14 },
  { key: 'cloture',            label: 'Clôturé',                    order: 15 },
]

// ── Interfaces ────────────────────────────────────────────────────
export interface WorkflowStep {
  id:             string
  project_id:     string
  step_key:       string
  step_label:     string
  step_order:     number
  status:         StepStatus
  deadline?:      string | null
  completed_at?:  string | null
  responsible_id?: string | null
  comment?:       string | null
  is_blocked:     boolean
  block_reason?:  string | null
  created_at:     string
  updated_at:     string
  // Relations
  responsible?:   { id: string; full_name: string } | null
}

export interface Project {
  id:               string
  reference:        string
  name:             string
  client_id:        string
  assigned_to?:     string | null
  quotation_id?:    string | null
  proforma_id?:     string | null
  status:           ProjectGeneralStatus
  progress_pct:     number
  contract_value?:  number | null
  currency:         string
  order_date?:      string | null
  expected_delivery?: string | null
  actual_delivery?: string | null
  incoterm?:        string | null
  port_destination?: string | null
  country?:         string | null
  shipper?:         string | null
  tracking_number?: string | null
  warranty_months:  number
  warranty_start?:  string | null
  warranty_end?:    string | null
  notes?:           string | null
  internal_notes?:  string | null
  created_by?:      string | null
  created_at:       string
  updated_at:       string
  // Relations
  client?:          { id: string; company_name: string; country: string }
  assigned_user?:   { id: string; full_name: string }
  quotation?:       { id: string; number: string }
  proforma?:        { id: string; number: string }
  steps?:           WorkflowStep[]
}

export interface Payment {
  id:               string
  reference:        string
  client_id:        string
  project_id?:      string | null
  proforma_id?:     string | null
  assigned_to?:     string | null
  total_amount:     number
  deposit_expected: number
  deposit_received: number
  balance_remaining: number
  currency:         string
  due_date?:        string | null
  received_date?:   string | null
  status:           PaymentStatusV2
  bank_reference?:  string | null
  notes?:           string | null
  created_by?:      string | null
  created_at:       string
  updated_at:       string
  // Relations
  client?:          { id: string; company_name: string; country: string }
  project?:         { id: string; reference: string; name: string }
  proforma?:        { id: string; number: string }
  assigned_user?:   { id: string; full_name: string }
}

export interface Document {
  id:           string
  name:         string
  doc_type:     DocType
  description?: string | null
  source_type:  'upload' | 'external_link'
  file_path?:   string | null
  external_url?: string | null
  file_size?:   number | null
  mime_type?:   string | null
  original_name?: string | null
  client_id?:   string | null
  project_id?:  string | null
  quotation_id?: string | null
  proforma_id?: string | null
  step_id?:     string | null
  is_confidential: boolean
  uploaded_by?: string | null
  created_at:   string
  // Relations
  client?:      { id: string; company_name: string }
  project?:     { id: string; reference: string; name: string }
  uploader?:    { id: string; full_name: string }
}

export interface DashboardAlert {
  alert_type:   string
  entity_id:    string
  entity_ref:   string
  entity_name:  string
  client_name:  string
  alert_date:   string
  assigned_to:  string
  message:      string
}

// ── Labels & couleurs ─────────────────────────────────────────────
export const PROJECT_STATUS_LABELS: Record<ProjectGeneralStatus, string> = {
  en_attente: 'En attente',
  en_cours:   'En cours',
  en_retard:  'En retard',
  livre:      'Livré',
  cloture:    'Clôturé',
  annule:     'Annulé',
}
export const PROJECT_STATUS_COLORS: Record<ProjectGeneralStatus, string> = {
  en_attente: 'bg-gray-100 text-gray-600',
  en_cours:   'bg-blue-50 text-blue-700',
  en_retard:  'bg-red-50 text-red-600',
  livre:      'bg-green-50 text-green-700',
  cloture:    'bg-emerald-50 text-emerald-700',
  annule:     'bg-gray-50 text-gray-400',
}

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  non_commence: 'Non commencé',
  en_cours:     'En cours',
  termine:      'Terminé',
  bloque:       'Bloqué',
}
export const STEP_STATUS_COLORS: Record<StepStatus, string> = {
  non_commence: 'bg-gray-100 text-gray-500',
  en_cours:     'bg-blue-50 text-blue-700',
  termine:      'bg-green-50 text-green-700',
  bloque:       'bg-red-50 text-red-600',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusV2, string> = {
  en_attente:   'En attente',
  acompte_recu: 'Acompte reçu',
  partiel:      'Paiement partiel',
  paye:         'Payé',
  en_retard:    'En retard',
  annule:       'Annulé',
}
export const PAYMENT_STATUS_COLORS: Record<PaymentStatusV2, string> = {
  en_attente:   'bg-gray-100 text-gray-600',
  acompte_recu: 'bg-blue-50 text-blue-700',
  partiel:      'bg-amber-50 text-amber-700',
  paye:         'bg-green-50 text-green-700',
  en_retard:    'bg-red-50 text-red-600',
  annule:       'bg-gray-50 text-gray-400',
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  quotation:    'Quotation',
  proforma:     'Proforma',
  po:           'Purchase Order (PO)',
  pi:           'Proforma Invoice (PI)',
  invoice:      'Facture commerciale',
  packing_list: 'Packing List',
  sld:          'Single Line Diagram (SLD)',
  design_form:  'Design Form',
  datasheet:    'Fiche technique',
  fat_report:   'Rapport FAT',
  certificate:  'Certificat',
  photo:        'Photo',
  autre:        'Autre',
}

export const DOC_TYPE_ICONS: Record<DocType, string> = {
  quotation:'📄', proforma:'📄', po:'🛒', pi:'🧾',
  invoice:'🧾', packing_list:'📦', sld:'⚡', design_form:'🎨',
  datasheet:'📋', fat_report:'🔬', certificate:'🏅', photo:'📷', autre:'📁',
}

// ── Helpers ───────────────────────────────────────────────────────
export function calcProgress(steps: WorkflowStep[]): number {
  if (!steps.length) return 0
  const done = steps.filter(s => s.status === 'termine').length
  return Math.round((done / steps.length) * 100)
}

export function isProjectLate(project: Project): boolean {
  if (!project.expected_delivery) return false
  if (['livre','cloture','annule'].includes(project.status)) return false
  return new Date(project.expected_delivery) < new Date()
}

export function isPaymentLate(payment: Payment): boolean {
  if (!payment.due_date) return false
  if (['paye','annule'].includes(payment.status)) return false
  return new Date(payment.due_date) < new Date()
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
