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

  return <BusinessConsolidationClient
    role={role}
    projects={projects.data ?? []}
    quotations={quotations.data ?? []}
    proformas={proformas.data ?? []}
    orders={orders.data ?? []}
    supplierQuotes={supplierQuotes.data ?? []}
    supplierProformas={supplierProformas.data ?? []}
    execution={execution.data ?? []}
    controls={controls.data ?? []}
    checklist={checklist.data ?? []}
    documents={documents.data ?? []}
    customerPayments={customerPayments.data ?? []}
    supplierInvoices={supplierInvoices.data ?? []}
    supplierPayments={supplierPayments.data ?? []}
  />
}
