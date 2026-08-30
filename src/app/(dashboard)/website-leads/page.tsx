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
    .select('*')
    .order('created_at', { ascending: false })
  const emails = [...new Set((leads ?? []).map(lead => lead.email?.trim().toLowerCase()).filter(Boolean))] as string[]
  const { data: engagements } = emails.length
    ? await supabase.from('contact_engagements').select('*').in('email_key', emails)
    : { data: [] }
  const engagementByEmail = new Map((engagements ?? []).map(item => [item.email_key, item]))
  const leadsWithEngagement = (leads ?? []).map(lead => ({
    ...lead,
    contact_engagement: lead.email ? engagementByEmail.get(lead.email.trim().toLowerCase()) ?? null : null,
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
