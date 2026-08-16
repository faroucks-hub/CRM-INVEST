import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProformasClient from '@/components/proformas/ProformasClient'

export const metadata: Metadata = { title: 'Factures Proformas' }

export default async function ProformasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()

  const role = profile?.role ?? 'commercial'
  const isAdminOrLead = role === 'admin' || role === 'lead_team'

  let q = supabase
    .from('proformas_v2')
    .select(`
      id, number, payment_status, issued_date, valid_until, currency,
      subtotal, discount_global, total_sell, amount_received, balance_due,
      bank_name, has_signature, created_at, updated_at,
      commercial_role, terms_profile_id, terms_code, terms_version, terms_snapshot,
      client_id, quotation_id, assigned_to,
      clients!inner(id, company_name, country),
      quotations_v2!proformas_v2_quotation_id_fkey(id, number),
      users_profiles!proformas_v2_assigned_to_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false })

  if (role === 'commercial') q = q.eq('assigned_to', user!.id)

  const { data: proformas } = await q

  const { data: clients } = await supabase
    .from('clients').select('id, company_name, country')
    .eq('is_archived', false).order('company_name')

  const { data: quotations } = await supabase
    .from('quotations_v2').select('id, number, client_id, total_sell, currency')
    .eq('status', 'approuvee').order('number')

  const { data: users } = isAdminOrLead
    ? await supabase.from('users_profiles').select('id, full_name').eq('is_active', true).order('full_name')
    : { data: [{ id: user!.id, full_name: '' }] }

  const { data: termsProfiles } = await supabase
    .from('commercial_terms_profiles')
    .select('id, code, name, version, commercial_role, status, role_summary')
    .eq('audience', 'customer')
    .in('status', ['draft','active'])
    .order('commercial_role')
    .order('created_at', { ascending: false })

  return (
    <ProformasClient
      proformas={proformas ?? []}
      clients={clients ?? []}
      quotations={quotations ?? []}
      users={users ?? []}
      role={role}
      isAdminOrLead={isAdminOrLead}
      currentUserId={user!.id}
      termsProfiles={termsProfiles ?? []}
    />
  )
}
