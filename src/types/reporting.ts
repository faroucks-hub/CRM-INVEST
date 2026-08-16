export interface SalesReportSummary {
  currency: string
  invoice_count: number
  invoiced_amount: number
  collected_amount: number
  refunded_amount: number
  net_collected_amount: number
  outstanding_amount: number
  overdue_amount: number
}

export interface SalesReportTrend {
  period_start: string
  currency: string
  invoice_count: number
  invoiced_amount: number
  collected_amount: number
  refunded_amount: number
  net_collected_amount: number
}

export interface ReceivableAging {
  source_type: string
  source_id: string
  reference: string
  client_id: string
  client_name: string
  assigned_to: string | null
  salesperson_name: string | null
  currency: string
  due_date: string | null
  original_amount: number
  paid_amount: number
  outstanding: number
  days_overdue: number
  aging_bucket: string
}

export interface SalespersonPerformance {
  salesperson_id: string
  salesperson_name: string
  currency: string
  quotation_count: number
  approved_quotation_count: number
  quotation_conversion_pct: number
  approved_quotation_amount: number
  project_count: number
  contract_amount: number
  invoice_count: number
  invoiced_amount: number
  net_collected_amount: number
  outstanding_amount: number
}

export interface FinancialReportSummary {
  currency: string
  invoiced_sales: number
  customer_cash_in: number
  supplier_invoices: number
  supplier_cash_out: number
  project_expenses_committed: number
  project_expenses_paid: number
  estimated_operating_result: number
  net_cash_flow: number
}

export interface CashFlowReport {
  period_start: string
  currency: string
  cash_in: number
  supplier_out: number
  expense_out: number
  net_cash_flow: number
}

export interface SupplierDebtAging {
  invoice_id: string
  reference: string
  supplier_id: string
  supplier_name: string
  project_id: string | null
  currency: string
  due_date: string | null
  original_amount: number
  paid_amount: number
  outstanding: number
  days_overdue: number
  aging_bucket: string
}
