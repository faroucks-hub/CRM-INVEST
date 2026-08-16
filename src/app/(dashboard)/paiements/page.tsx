import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaymentsClient from '@/components/paiements/PaymentsClient'

export const metadata: Metadata = { title: 'Paiements' }

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()
  const role = profile?.role ?? 'commercial'
  const isAdminOrLead = role === 'admin' || role === 'lead_team'

  let q = supabase.from('paiements')
    .select(`id, reference, status, total_amount, deposit_expected, deposit_received,
      balance_remaining, currency, due_date, received_date, bank_reference, notes,
      client_id, project_id, proforma_id, assigned_to, created_at, updated_at,
      clients!inner(id, company_name, country),
      projets_v2!paiements_project_id_fkey(id, reference, name),
      proformas_v2!paiements_proforma_id_fkey(id, number),
      users_profiles!paiements_assigned_to_fkey(id, full_name)`)
    .order('due_date', { ascending: true, nullsFirst: false })
  if (role === 'commercial') q = q.eq('assigned_to', user!.id)
  const { data: payments } = await q

  const paymentIds = (payments ?? []).map(payment => payment.id)
  const { data: paymentTransactions } = paymentIds.length
    ? await supabase
        .from('payment_transactions')
        .select(`
          id, payment_id, transaction_type, amount, currency,
          transaction_date, value_date, is_opening_balance, voided_at
        `)
        .in('payment_id', paymentIds)
        .is('voided_at', null)
        .order('transaction_date', { ascending: false })
    : { data: [] }

  const { data: clients } = await supabase.from('clients')
    .select('id, company_name, country').eq('is_archived', false).order('company_name')
  const { data: projects } = await supabase.from('projets_v2')
    .select('id, reference, name, client_id').not('status','in','(cloture,annule)').order('reference')
  const { data: proformas } = await supabase.from('proformas_v2')
    .select('id, number, client_id, total_sell, currency').order('number')
  const { data: users } = isAdminOrLead
    ? await supabase.from('users_profiles').select('id, full_name').eq('is_active', true).order('full_name')
    : { data: [] }

  return <PaymentsClient payments={payments??[]} transactions={paymentTransactions??[]}
    clients={clients??[]} projects={projects??[]}
    proformas={proformas??[]} users={users??[]} role={role} isAdminOrLead={isAdminOrLead} currentUserId={user!.id}/>
}
