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
        <WebsiteLeadsClient leads={leads ?? []} />
      )}
    </div>
  )
}
