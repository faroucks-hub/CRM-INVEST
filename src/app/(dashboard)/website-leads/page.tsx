import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/page-header'
import WebsiteLeadsClient from '@/components/website-leads/WebsiteLeadsClient'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Website Leads',
}

export default async function WebsiteLeadsPage() {
  const supabase = await createClient()

  const { data: leads, error } = await supabase
    .from('website_leads')
    .select('*, assigned_user:users_profiles!website_leads_assigned_to_fkey(id, full_name)')
    .order('created_at', { ascending: false })
  const emails = [...new Set((leads ?? []).map(lead => lead.email?.trim().toLowerCase()).filter(Boolean))] as string[]
  const { data: engagements } = emails.length
    ? await supabase.from('contact_engagements').select('*').in('email_key', emails)
    : { data: [] }
  const engagementByEmail = new Map((engagements ?? []).map(item => [item.email_key, item]))
  const leadIds = (leads ?? []).map(lead => lead.id)
  const { data: followUps } = leadIds.length
    ? await supabase.from('taches')
        .select('id, website_lead_id, title, due_date, priority, assigned_to, users_profiles!taches_assigned_to_fkey(full_name)')
        .in('website_lead_id', leadIds).neq('status', 'termine').order('due_date', { ascending: true, nullsFirst: false })
    : { data: [] }
  const nextTaskByLead = new Map<string, Record<string, unknown>>()
  for (const task of followUps ?? []) if (task.website_lead_id && !nextTaskByLead.has(task.website_lead_id)) {
    const assignee = task.users_profiles as unknown as { full_name?: string } | null
    nextTaskByLead.set(task.website_lead_id, { ...task, assigned_name: assignee?.full_name ?? null })
  }
  const leadsWithEngagement = (leads ?? []).map(lead => ({
    ...lead,
    contact_engagement: lead.email ? engagementByEmail.get(lead.email.trim().toLowerCase()) ?? null : null,
    next_task: nextTaskByLead.get(lead.id) ?? null,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Leads"
        description="Leads reçus depuis le site IME. Recherchez, filtrez, qualifiez et convertissez les demandes entrantes."
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Impossible de charger les leads : {error.message}
        </div>
      ) : (
        <WebsiteLeadsClient leads={leadsWithEngagement} />
      )}
    </div>
  )
}
