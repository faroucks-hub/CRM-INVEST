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
      contact_name, contact_email, contact_phone, contact_whatsapp, communication_language, communication_market,
      assigned_to, lead_source, currency_pref, notes, tags, do_not_contact, is_archived, created_at, updated_at`)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (role === 'commercial') query = query.eq('assigned_to', user!.id)

  const { data: clients } = await query
  const emails = [...new Set((clients ?? []).map(client => client.contact_email?.trim().toLowerCase()).filter(Boolean))] as string[]
  const { data: engagements } = emails.length
    ? await supabase.from('contact_engagements').select('*').in('email_key', emails)
    : { data: [] }
  const engagementByEmail = new Map((engagements ?? []).map(item => [item.email_key, item]))
  const clientsWithEngagement = (clients ?? []).map(client => ({
    ...client,
    contact_engagement: client.contact_email ? engagementByEmail.get(client.contact_email.trim().toLowerCase()) ?? null : null,
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
