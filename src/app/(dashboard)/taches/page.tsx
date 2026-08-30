import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import TasksClient from '@/components/taches/TasksClient'

export const metadata: Metadata = { title: 'Tâches & Relances' }

export default async function TachesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()

  const role = profile?.role ?? 'commercial'
  const isAdminOrLead = ['admin','lead_team'].includes(role)

  let q = supabase.from('taches')
    .select(`id, title, description, status, priority, due_date, completed_at, notes, created_at,
      assigned_to, client_id, project_id, quotation_id, website_lead_id, task_type,
      users_profiles!taches_assigned_to_fkey(id, full_name),
      clients!taches_client_id_fkey(id, company_name),
      projets_v2!taches_project_id_fkey(id, reference, name),
      quotations_v2!taches_quotation_id_fkey(id, number),
      website_leads!taches_website_lead_id_fkey(id, full_name, company)`)
    .order('priority', { ascending: false })
    .order('due_date',  { ascending: true, nullsFirst: false })

  if (!isAdminOrLead) {
    q = q.or(`assigned_to.eq.${user!.id},created_by.eq.${user!.id}`)
  }

  const { data: tasks } = await q

  const { data: users } = isAdminOrLead
    ? await supabase.from('users_profiles').select('id, full_name').eq('is_active', true).order('full_name')
    : { data: [{ id: user!.id, full_name: profile?.role ?? '' }] }

  const { data: clients } = await supabase.from('clients')
    .select('id, company_name').eq('is_archived', false).order('company_name').limit(50)

  const { data: leads } = await supabase.from('website_leads')
    .select('id, full_name, company').is('deleted_at', null).not('status', 'in', '(won,lost)').order('created_at', { ascending: false }).limit(50)

  const { data: projects } = await supabase.from('projets_v2')
    .select('id, reference, name').not('status','in','(cloture,annule)').order('reference').limit(30)

  return (
    <TasksClient
      tasks={tasks ?? []}
      users={users ?? []}
      clients={clients ?? []}
      leads={leads ?? []}
      projects={projects ?? []}
      role={role}
      isAdminOrLead={isAdminOrLead}
      currentUserId={user!.id}
    />
  )
}
