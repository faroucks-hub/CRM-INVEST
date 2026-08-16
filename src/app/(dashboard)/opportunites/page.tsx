import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import OpportunitiesClient from '@/components/opportunites/OpportunitiesClient'

export const metadata: Metadata = { title: 'Opportunités' }

export default async function OpportunitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()

  const role = profile?.role ?? 'commercial'
  const isAdminOrLead = role === 'admin' || role === 'lead_team'

  let oppsQuery = supabase
    .from('opportunities')
    .select(`id, name, stage, pipeline_stage, estimated_sell, currency, sector, product_type,
      probability, expected_close, next_followup, lead_source, notes,
      client_id, assigned_to, created_at, updated_at,
      clients!inner(id, company_name, country),
      users_profiles!opportunities_assigned_to_fkey(id, full_name)`)
    .order('created_at', { ascending: false })

  if (role === 'commercial') oppsQuery = oppsQuery.eq('assigned_to', user!.id)

  const { data: opportunities } = await oppsQuery

  const { data: clients } = await supabase
    .from('clients')
    .select('id, company_name, country')
    .eq('is_archived', false)
    .order('company_name')

  const { data: users } = isAdminOrLead
    ? await supabase.from('users_profiles').select('id, full_name').eq('is_active', true).order('full_name')
    : { data: [] }

  return (
    <OpportunitiesClient
      opportunities={opportunities ?? []}
      clients={clients ?? []}
      users={users ?? []}
      role={role}
      isAdminOrLead={isAdminOrLead}
      currentUserId={user!.id}
    />
  )
}
