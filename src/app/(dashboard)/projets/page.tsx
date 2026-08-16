import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProjectsClient from '@/components/projets/ProjectsClient'

export const metadata: Metadata = { title: 'Projets' }

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()
  const role = profile?.role ?? 'commercial'
  const isAdminOrLead = role === 'admin' || role === 'lead_team'

  let q = supabase.from('projets_v2')
    .select(`id, reference, name, status, workflow_stage, progress_pct, contract_value, currency,
      order_date, expected_delivery, actual_delivery, country, port_destination,
      tracking_number, warranty_months, warranty_start, warranty_end,
      client_id, assigned_to, quotation_id, proforma_id, created_at, updated_at,
      clients!inner(id, company_name, country),
      users_profiles!projets_v2_assigned_to_fkey(id, full_name),
      quotations_v2!projets_v2_quotation_id_fkey(id, number),
      proformas_v2!projets_v2_proforma_id_fkey(id, number)`)
    .order('created_at', { ascending: false })
  if (role === 'commercial') q = q.eq('assigned_to', user!.id)
  const { data: projects } = await q

  const { data: clients } = await supabase.from('clients')
    .select('id, company_name, country').eq('is_archived', false).order('company_name')
  const { data: quotations } = await supabase.from('quotations_v2')
    .select('id, number, client_id').eq('status', 'approuvee').order('number')
  const { data: proformas } = await supabase
  .from('proformas_v2')
  .select(`
    id,
    number,
    client_id,
    total_sell,
    currency,
    quotation_id,
    assigned_to,
    incoterm,
    port_destination,
    delivery_delay,
    notes
  `)
  .order('number')
  const { data: users } = isAdminOrLead
    ? await supabase.from('users_profiles').select('id, full_name').eq('is_active', true).order('full_name')
    : { data: [] }

  return <ProjectsClient projects={projects??[]} clients={clients??[]} quotations={quotations??[]}
    proformas={proformas??[]} users={users??[]} role={role} isAdminOrLead={isAdminOrLead} currentUserId={user!.id}/>
}
