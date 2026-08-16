export type QuotationStatus = 'brouillon'|'envoyee'|'revisee'|'approuvee'|'perdue'|'annulee'
export type ProformaPaymentStatus = 'en_attente'|'acompte_recu'|'partiel'|'paye'|'annule'

export interface DocumentLine {
  id:string; sort_order:number; product_id?:string|null;
  designation:string; description?:string|null; reference?:string|null;
  quantity:number; unit:string;
  unit_price_sell:number; discount_pct:number; line_total_sell:number;
  unit_price_buy?:number|null; line_total_buy?:number|null; margin_pct?:number|null;
  specs?:Record<string,unknown>; notes?:string|null; created_at:string;
}
export interface QuotationLine extends DocumentLine { quotation_id:string }
export interface ProformaLine extends DocumentLine {
  proforma_id:string; hs_code?:string|null; country_origin?:string|null;
}

export interface ClientBasic {
  id:string; company_name:string; country:string; city?:string|null;
  contact_name?:string|null; contact_email?:string|null; address?:string|null;
}

export interface Quotation {
  id:string; number:string; status:QuotationStatus;
  client_id:string; opportunity_id?:string|null; assigned_to?:string|null;
  issued_date:string; valid_until:string; currency:string;
  incoterm?:string|null; delivery_delay?:string|null; warranty?:string|null; payment_terms?:string|null;
  commercial_role?:'facilitation'|'resale'|'distribution'|null; terms_profile_id?:string|null; terms_code?:string|null; terms_version?:string|null; terms_snapshot?:string|null;
  intro_text?:string|null; technical_notes?:string|null; notes?:string|null; internal_notes?:string|null;
  subtotal:number; discount_global:number; total_sell:number;
  total_buy?:number|null; margin_pct?:number|null;
  sent_at?:string|null; approved_at?:string|null; lost_at?:string|null; lost_reason?:string|null;
  created_by?:string|null; created_at:string; updated_at:string;
  client?:ClientBasic; assigned_user?:{id:string;full_name:string}; lines?:QuotationLine[];
}

export interface Proforma {
  id:string; number:string; payment_status:ProformaPaymentStatus;
  client_id:string; quotation_id?:string|null; opportunity_id?:string|null; assigned_to?:string|null;
  issued_date:string; valid_until:string; currency:string;
  incoterm?:string|null; port_destination?:string|null; delivery_delay?:string|null;
  warranty?:string|null; payment_terms?:string|null;
  commercial_role?:'facilitation'|'resale'|'distribution'|null; terms_profile_id?:string|null; terms_code?:string|null; terms_version?:string|null; terms_snapshot?:string|null;
  bank_name?:string|null; bank_iban?:string|null; bank_swift?:string|null;
  bank_account?:string|null; bank_address?:string|null; bank_currency?:string|null;
  intro_text?:string|null; technical_notes?:string|null; notes?:string|null; internal_notes?:string|null;
  has_signature:boolean; signature_name?:string|null;
  subtotal:number; discount_global:number; total_sell:number;
  total_buy?:number|null; margin_pct?:number|null;
  amount_received:number; balance_due:number;
  sent_at?:string|null; paid_at?:string|null;
  created_by?:string|null; created_at:string; updated_at:string;
  client?:ClientBasic; assigned_user?:{id:string;full_name:string};
  quotation?:{id:string;number:string}; lines?:ProformaLine[];
}

export const QUOTATION_STATUS_LABELS:Record<QuotationStatus,string> = {
  brouillon:'Brouillon', envoyee:'Envoyée', revisee:'En révision',
  approuvee:'Approuvée', perdue:'Perdue', annulee:'Annulée',
}
export const QUOTATION_STATUS_COLORS:Record<QuotationStatus,string> = {
  brouillon:'bg-gray-100 text-gray-600', envoyee:'bg-blue-50 text-blue-700',
  revisee:'bg-amber-50 text-amber-700', approuvee:'bg-green-50 text-green-700',
  perdue:'bg-red-50 text-red-600', annulee:'bg-gray-50 text-gray-400',
}
export const PROFORMA_STATUS_LABELS:Record<ProformaPaymentStatus,string> = {
  en_attente:'En attente', acompte_recu:'Acompte reçu',
  partiel:'Paiement partiel', paye:'Payé', annule:'Annulé',
}
export const PROFORMA_STATUS_COLORS:Record<ProformaPaymentStatus,string> = {
  en_attente:'bg-gray-100 text-gray-600', acompte_recu:'bg-blue-50 text-blue-700',
  partiel:'bg-amber-50 text-amber-700', paye:'bg-green-50 text-green-700',
  annule:'bg-red-50 text-red-600',
}
export const INCOTERMS = ['EXW','FCA','CPT','CIP','DAP','DPU','DDP','FAS','FOB','CFR','CIF']
export const DEFAULT_PAYMENT_TERMS = "Acompte 30% à la commande, solde avant expédition"
export const DEFAULT_WARRANTY = "Garantie fabricant 2 ans pièces et main d'oeuvre"
export const DEFAULT_DELIVERY = "6 à 8 semaines après réception de l'acompte"

export function calcLineTotal(qty:number, price:number, discount:number):number {
  return Math.round(qty * price * (1 - discount/100) * 100) / 100
}
export function calcDocTotals(lines:{line_total_sell:number}[], discountGlobal:number) {
  const subtotal = lines.reduce((s,l) => s + l.line_total_sell, 0)
  const total = subtotal * (1 - discountGlobal/100)
  return { subtotal: Math.round(subtotal*100)/100, total: Math.round(total*100)/100 }
}
export interface QuotationStats {
  user_id:string; full_name:string; role:string;
  currency:string;
  total_quotations:number; approved_quotations:number; lost_quotations:number;
  total_amount:number; approved_amount:number;
  total_proformas:number; proforma_amount:number; conversion_rate:number;
}

// Types utilisés par l'éditeur de documents V3.
export interface LineItem {
  id?: string
  sort_order: number
  description: string
  detail?: string | null
  reference?: string | null
  quantity: number
  unit: string
  unit_sell_price: number
  unit_buy_price?: number | null
  discount_pct: number
  line_total_sell: number
  line_total_buy?: number | null
  margin_pct?: number | null
  notes?: string | null
}

export interface QuotationFull {
  id: string
  number: string
  client_id: string
  opportunity_id?: string | null
  assigned_to?: string | null
  status_v3: QuotationStatus
  issued_date: string
  valid_until: string
  currency: string
  incoterm?: string | null
  delivery_delay?: string | null
  warranty_terms?: string | null
  payment_terms?: string | null
  intro_text?: string | null
  technical_notes?: string | null
  notes?: string | null
  internal_notes?: string | null
  subtotal: number
  discount_pct?: number | null
  discount_amount?: number | null
  total_sell: number
  client?: ClientBasic | null
  items?: LineItem[]
}

export interface ProformaFull {
  id: string
  number: string
  client_id: string
  quotation_id?: string | null
  assigned_to?: string | null
  status_v3: ProformaPaymentStatus
  issued_date: string
  valid_until: string
  currency: string
  incoterm?: string | null
  delivery_delay?: string | null
  port_destination?: string | null
  warranty_terms?: string | null
  payment_terms?: string | null
  intro_text?: string | null
  technical_notes?: string | null
  notes?: string | null
  internal_notes?: string | null
  subtotal: number
  discount_pct?: number | null
  discount_amount?: number | null
  total_sell: number
  acompte_pct?: number | null
  bank_name?: string | null
  bank_account?: string | null
  bank_swift?: string | null
  bank_iban?: string | null
  bank_address?: string | null
  has_signature?: boolean | null
  has_stamp?: boolean | null
  client?: ClientBasic | null
  quotation?: { id: string; number: string } | null
  items?: LineItem[]
}

export const QUOT_STATUS_CONFIG: Record<
  QuotationStatus,
  { label: string; color: string }
> = Object.fromEntries(
  (Object.keys(QUOTATION_STATUS_LABELS) as QuotationStatus[]).map((status) => [
    status,
    {
      label: QUOTATION_STATUS_LABELS[status],
      color: QUOTATION_STATUS_COLORS[status],
    },
  ])
) as Record<QuotationStatus, { label: string; color: string }>

export const PROF_PAYMENT_CONFIG: Record<
  ProformaPaymentStatus,
  { label: string; color: string }
> = Object.fromEntries(
  (Object.keys(PROFORMA_STATUS_LABELS) as ProformaPaymentStatus[]).map((status) => [
    status,
    {
      label: PROFORMA_STATUS_LABELS[status],
      color: PROFORMA_STATUS_COLORS[status],
    },
  ])
) as Record<ProformaPaymentStatus, { label: string; color: string }>

export const INCOTERM_OPTIONS = INCOTERMS.map((value) => ({ value, label: value }))
export const CURRENCY_OPTIONS = [
  { value: 'USD', symbol: '$' },
  { value: 'EUR', symbol: '€' },
  { value: 'TRY', symbol: '₺' },
  { value: 'XOF', symbol: 'FCFA' },
]
export const UNIT_OPTIONS = ['unité', 'lot', 'set', 'pièce', 'service', 'jour', 'heure']

export function calcTotals(items: LineItem[], discountPct = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.line_total_sell, 0)
  const discountAmount = subtotal * discountPct / 100
  return {
    subtotal,
    discountAmount,
    totalSell: subtotal - discountAmount,
  }
}
