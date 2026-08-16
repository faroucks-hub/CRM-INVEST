import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DealControlClient from '@/components/affaires/DealControlClient'

export default async function ControleAffairesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users_profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'lead_team', 'commercial'].includes(profile.role)) redirect('/dashboard')

  const [projects, orders, supplierQuotes, expenses, supplierPayments, customerPayments, controls, suppliers] = await Promise.all([
    supabase.from('projets_v2').select('id,reference,name,status,contract_value,currency,order_date,expected_delivery,incoterm,warranty_months,commercial_role,terms_code,terms_version,quotation_id,proforma_id,client:client_id(company_name)').order('created_at', { ascending: false }).limit(300),
    supabase.from('purchase_orders').select('id,reference,project_id,supplier_id,supplier_quotation_id,amount,currency,payment_terms,delivery_terms,expected_delivery,warranty_months,status').neq('status','annule').order('created_at',{ascending:false}),
    supabase.from('supplier_quotations').select('id,project_id,supplier_id,amount,currency,payment_terms,lead_time_days,warranty_months,incoterm,status').eq('status','selectionnee'),
    supabase.from('project_expenses').select('id,project_id,category,status,amount,currency').neq('status','annulee'),
    supabase.from('supplier_payments').select('id,project_id,amount,currency,transaction_type,voided_at').is('voided_at',null),
    supabase.from('paiements').select('id,project_id,total_amount,deposit_received,balance_remaining,currency,status'),
    supabase.from('project_deal_controls').select('*'),
    supabase.from('suppliers').select('id,company_name'),
  ])

  return <DealControlClient
    role={profile.role}
    projects={projects.data ?? []}
    orders={orders.data ?? []}
    supplierQuotes={supplierQuotes.data ?? []}
    expenses={expenses.data ?? []}
    supplierPayments={supplierPayments.data ?? []}
    customerPayments={customerPayments.data ?? []}
    controls={controls.data ?? []}
    suppliers={suppliers.data ?? []}
  />
}
