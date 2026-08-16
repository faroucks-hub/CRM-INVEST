export const FINANCIAL_CURRENCIES = ['USD', 'EUR', 'TRY', 'XOF'] as const
export type FinancialCurrency = typeof FINANCIAL_CURRENCIES[number]

export type FinancialEntryKind =
  | 'vente'
  | 'recette'
  | 'creance'
  | 'depense'
  | 'dette'

export interface FinancialOption {
  id: string
  label: string
  client_id?: string | null
  currency?: string | null
}

export interface ManualFinancialEntry {
  id: string
  kind: FinancialEntryKind
  reference: string
  third_party: string
  description: string | null
  date: string
  due_date: string | null
  amount: number
  paid_amount: number
  currency: FinancialCurrency
  status: string
  is_opening_balance?: boolean
}

export interface FinancialEntryPayload {
  kind: FinancialEntryKind
  client_id?: string
  supplier_id?: string
  project_id?: string
  assigned_to?: string
  sales_invoice_id?: string
  external_reference?: string
  description?: string
  issue_date: string
  due_date?: string
  amount: number
  paid_amount?: number
  currency: FinancialCurrency
  status?: string
  category?: string
  payment_method?: string
  bank_reference?: string
  notes?: string
}
