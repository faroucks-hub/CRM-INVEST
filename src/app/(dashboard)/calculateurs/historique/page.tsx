import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import CalcHistoryClient from '@/components/calculateurs/CalcHistoryClient'

export const metadata: Metadata = { title: 'Historique des calculs' }

export default async function CalcHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()
  const role = profile?.role ?? 'commercial'
  const isAdminOrLead = role === 'admin' || role === 'lead_team'

  let q = supabase.from('calc_history')
    .select(`id, calc_type, name, inputs, outputs, client_id, project_id, quotation_id, created_at,
      clients!calc_history_client_id_fkey(id, company_name),
      projets_v2!calc_history_project_id_fkey(id, reference, name),
      quotations_v2!calc_history_quotation_id_fkey(id, number),
      users_profiles!calc_history_created_by_fkey(id, full_name)`)
    .order('created_at', { ascending: false })

  if (!isAdminOrLead) q = q.eq('created_by', user!.id)

  const { data: history } = await q

  // Stats
  const { data: stats } = await supabase.from('calc_stats').select('*')

  return (
    <CalcHistoryClient
      history={history ?? []}
      stats={stats ?? []}
      isAdminOrLead={isAdminOrLead}
      currentUserId={user!.id}
    />
  )
}
