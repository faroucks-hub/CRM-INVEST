import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ClientsClient from '@/components/clients/ClientsClient'

export const metadata: Metadata = { title: 'Clients & Prospects' }

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()

  const role = profile?.role ?? 'commercial'
  const isAdminOrLead = role === 'admin' || role === 'lead_team'

  let query = supabase
    .from('clients')
    .select(`id, reference, company_name, trade_name, status, country, city, sector,
      contact_name, contact_title, contact_email, contact_phone, contact_whatsapp, communication_language, communication_market,
      assigned_to, lead_source, currency_pref, notes, tags, do_not_contact, is_archived, created_at, updated_at,
      assigned_user:users_profiles!clients_assigned_to_fkey(id, full_name)`)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (role === 'commercial') query = query.eq('assigned_to', user!.id)

  const { data: clients } = await query
  const emails = [...new Set((clients ?? []).map(client => client.contact_email?.trim().toLowerCase()).filter(Boolean))] as string[]
  const { data: engagements } = emails.length
    ? await supabase.from('contact_engagements').select('*').in('email_key', emails)
    : { data: [] }
  const engagementByEmail = new Map((engagements ?? []).map(item => [item.email_key, item]))
  const clientIds = (clients ?? []).map(client => client.id)
  const { data: touchpoints } = clientIds.length
    ? await supabase.from('contact_touchpoints')
        .select('id, client_id, user_id, direction, channel, outcome, occurred_at, subject')
        .in('client_id', clientIds).order('occurred_at', { ascending: false })
    : { data: [] }
  const touchpointUserIds = [...new Set((touchpoints ?? []).map(item => item.user_id).filter(Boolean))]
  const { data: touchpointUsers } = touchpointUserIds.length
    ? await supabase.from('users_profiles').select('id, full_name').in('id', touchpointUserIds)
    : { data: [] }
  const touchpointUserById = new Map((touchpointUsers ?? []).map(item => [item.id, item.full_name]))
  const touchpointsByClient = new Map<string, Record<string, unknown>[]>()
  for (const touchpoint of touchpoints ?? []) {
    if (!touchpoint.client_id) continue
    const list = touchpointsByClient.get(touchpoint.client_id) ?? []
    list.push({ ...touchpoint, user_name: touchpointUserById.get(touchpoint.user_id) ?? null })
    touchpointsByClient.set(touchpoint.client_id, list)
  }
  const { data: followUps } = clientIds.length
    ? await supabase.from('taches')
        .select('id, client_id, title, due_date, priority, assigned_to, users_profiles!taches_assigned_to_fkey(full_name)')
        .in('client_id', clientIds).neq('status', 'termine').order('due_date', { ascending: true, nullsFirst: false })
    : { data: [] }
  const nextTaskByClient = new Map<string, Record<string, unknown>>()
  for (const task of followUps ?? []) if (task.client_id && !nextTaskByClient.has(task.client_id)) {
    const assignee = task.users_profiles as unknown as { full_name?: string } | null
    nextTaskByClient.set(task.client_id, { ...task, assigned_name: assignee?.full_name ?? null })
  }
  const clientsWithEngagement = (clients ?? []).map(client => ({
    ...client,
    contact_engagement: client.contact_email ? engagementByEmail.get(client.contact_email.trim().toLowerCase()) ?? null : null,
    contact_touchpoints: touchpointsByClient.get(client.id) ?? [],
    next_task: nextTaskByClient.get(client.id) ?? null,
  }))

  const { data: users } = isAdminOrLead
    ? await supabase.from('users_profiles').select('id, full_name, role').eq('is_active', true).order('full_name')
    : { data: [] }

  return (
    <ClientsClient
      clients={clientsWithEngagement}
      users={users ?? []}
      role={role}
      isAdminOrLead={isAdminOrLead}
      currentUserId={user!.id}
    />
  )
}
