import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import QuotationsClient from '@/components/quotations/QuotationsClient'

export const metadata: Metadata = { title: 'Quotations (Devis)' }

export default async function QuotationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()

  const role = profile?.role ?? 'commercial'
  const isAdminOrLead = role === 'admin' || role === 'lead_team'
  const quotationFields = role === 'admin'
    ? `id, number, status, issued_date, valid_until, currency,
       subtotal, discount_global, total_sell, total_buy, margin_pct,
       sent_at, approved_at, created_at, updated_at,
       commercial_role, terms_profile_id, terms_code, terms_version, terms_snapshot,
       client_id, assigned_to,
       clients!inner(id, company_name, country),
       users_profiles!quotations_v2_assigned_to_fkey(id, full_name)`
    : `id, number, status, issued_date, valid_until, currency,
       subtotal, discount_global, total_sell,
       sent_at, approved_at, created_at, updated_at,
       commercial_role, terms_profile_id, terms_code, terms_version, terms_snapshot,
       client_id, assigned_to,
       clients!inner(id, company_name, country),
       users_profiles!quotations_v2_assigned_to_fkey(id, full_name)`

  // Supabase's generated query type becomes too large for TypeScript here.
  // Keep runtime behavior unchanged while bounding inference at this read boundary.
  const quotationDb = supabase as any
  let q = quotationDb
    .from('quotations_v2')
    .select(quotationFields)
    .order('created_at', { ascending: false })

  if (role === 'commercial') q = q.eq('assigned_to', user!.id)

  const { data: quotations } = await q

  const { data: clients } = await supabase
    .from('clients').select('id, company_name, country')
    .eq('is_archived', false).order('company_name')

  const { data: opportunities } = await supabase
    .from('opportunities').select('id, name, client_id')
    .not('pipeline_stage', 'in', '(perdu_annule)').order('name')

  const { data: users } = isAdminOrLead
    ? await supabase.from('users_profiles').select('id, full_name').eq('is_active', true).order('full_name')
    : { data: [{ id: user!.id, full_name: profile?.role ?? '' }] }

  const { data: termsProfiles } = await supabase
    .from('commercial_terms_profiles')
    .select('id, code, name, version, commercial_role, status, role_summary')
    .eq('audience', 'customer')
    .in('status', ['draft','active'])
    .order('commercial_role')
    .order('created_at', { ascending: false })

  return (
    <QuotationsClient
      quotations={(quotations ?? []) as unknown as Record<string, unknown>[]}
      clients={clients ?? []}
      opportunities={opportunities ?? []}
      users={users ?? []}
      role={role}
      isAdminOrLead={isAdminOrLead}
      canSeeCosts={role === 'admin'}
      currentUserId={user!.id}
      termsProfiles={termsProfiles ?? []}
    />
  )
}
