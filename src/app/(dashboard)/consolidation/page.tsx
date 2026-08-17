import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BusinessConsolidationClient from '@/components/consolidation/BusinessConsolidationClient'

export default async function ConsolidationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users_profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? 'commercial'

  let projectQuery = supabase.from('projets_v2')
    .select('id,reference,name,status,workflow_stage,progress_pct,contract_value,currency,expected_delivery,quotation_id,proforma_id,commercial_role,terms_code,terms_version,assigned_to,client:client_id(company_name)')
    .order('created_at', { ascending: false })
    .limit(400)
  if (role === 'commercial') projectQuery = projectQuery.eq('assigned_to', user.id)

  const [projects, quotations, proformas, orders, supplierQuotes, supplierProformas, execution, controls, checklist, documents, customerPayments, supplierInvoices, supplierPayments] = await Promise.all([
    projectQuery,
    supabase.from('quotations_v2').select('id,number,status,total_sell,currency,commercial_role,terms_code,terms_version'),
    supabase.from('proformas_v2').select('id,number,payment_status,total_sell,currency,quotation_id,commercial_role,terms_code,terms_version'),
    supabase.from('purchase_orders').select('id,reference,project_id,supplier_id,supplier_quotation_id,amount,currency,status,purchase_terms_code,purchase_terms_version,expected_delivery,warranty_months').neq('status','annule'),
    supabase.from('supplier_quotations').select('id,reference,project_id,supplier_id,amount,currency,status,lead_time_days,warranty_months,incoterm').eq('status','selectionnee'),
    supabase.from('supplier_proformas').select('id,reference,project_id,purchase_order_id,amount,currency,status'),
    supabase.from('project_execution_control').select('*'),
    supabase.from('project_deal_controls').select('project_id,review_status,risk_override_reason,reviewer_notes'),
    supabase.from('project_completion_checklist').select('project_id,required,status'),
    supabase.from('project_documents').select('project_id,document_type,created_at'),
    supabase.from('paiements').select('project_id,total_amount,deposit_received,balance_remaining,currency,status'),
    supabase.from('supplier_invoices').select('project_id,total_amount,currency,status,voided_at'),
    supabase.from('supplier_payments').select('project_id,amount,currency,transaction_type,voided_at').is('voided_at',null),
  ])

  const visibleProjects = projects.data ?? []
  const visibleProjectIds = new Set(visibleProjects.map(project => String(project.id)))
  const visibleQuotationIds = new Set(visibleProjects.map(project => project.quotation_id).filter(Boolean).map(String))
  const visibleProformaIds = new Set(visibleProjects.map(project => project.proforma_id).filter(Boolean).map(String))
  const ownProjectRows = <T extends { project_id?: unknown }>(rows: T[] | null) =>
    (rows ?? []).filter(row => row.project_id && visibleProjectIds.has(String(row.project_id)))

  return <BusinessConsolidationClient
    role={role}
    projects={visibleProjects}
    quotations={(quotations.data ?? []).filter(row => role !== 'commercial' || visibleQuotationIds.has(String(row.id)))}
    proformas={(proformas.data ?? []).filter(row => role !== 'commercial' || visibleProformaIds.has(String(row.id)))}
    orders={role === 'commercial' ? [] : orders.data ?? []}
    supplierQuotes={role === 'commercial' ? [] : supplierQuotes.data ?? []}
    supplierProformas={role === 'commercial' ? [] : supplierProformas.data ?? []}
    execution={role === 'commercial' ? ownProjectRows(execution.data) : execution.data ?? []}
    controls={role === 'commercial' ? [] : controls.data ?? []}
    checklist={role === 'commercial' ? ownProjectRows(checklist.data) : checklist.data ?? []}
    documents={role === 'commercial' ? ownProjectRows(documents.data) : documents.data ?? []}
    customerPayments={role === 'commercial' ? ownProjectRows(customerPayments.data) : customerPayments.data ?? []}
    supplierInvoices={role === 'commercial' ? [] : supplierInvoices.data ?? []}
    supplierPayments={role === 'commercial' ? [] : supplierPayments.data ?? []}
  />
}
