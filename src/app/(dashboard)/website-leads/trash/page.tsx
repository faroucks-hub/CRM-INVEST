import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { LeadTrashActions } from '@/components/website-leads/LeadTrashActions'

export const metadata: Metadata = {
  title: 'Corbeille des Leads',
}

export default async function WebsiteLeadsTrashPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('website_leads')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corbeille des Leads"
        description="Les leads supprimés sont conservés temporairement afin de prévenir toute suppression accidentelle. Vous pouvez les restaurer ou les effacer définitivement selon vos droits d'accès."
      />

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-3 text-left">Date suppression</th>
              <th className="p-3 text-left">Nom du contact</th>
              <th className="p-3 text-left">Entreprise</th>
              <th className="p-3 text-left">Coordonnées</th>
              <th className="p-3 text-left">Origine</th>
              <th className="p-3 text-left">Motif</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {leads?.map((lead) => (
              <tr key={lead.id} className="border-t hover:bg-muted/50">
                <td className="p-3">
                  {lead.deleted_at
                    ? new Date(lead.deleted_at).toLocaleDateString()
                    : '-'}
                </td>

                <td className="p-3">
                  <Link
                    href={`/website-leads/${lead.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {lead.full_name || 'Non renseigné'}
                  </Link>
                </td>

                <td className="p-3">
                  {lead.company || '-'}
                </td>

                <td className="p-3">
                  <div>{lead.email || '-'}</div>
                  <div className="text-xs text-muted-foreground">
                    {lead.phone || '-'}
                  </div>
                </td>

                <td className="p-3 capitalize">
                  {lead.source || '-'}
                </td>

                <td className="p-3">
                  {lead.deleted_reason || 'Aucun motif renseigné'}
                </td>

                <td className="p-3">
                  <LeadTrashActions leadId={lead.id} />
                </td>
              </tr>
            ))}

            {!leads?.length && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={7}>
                  La corbeille est vide. Aucun lead supprimé n'est actuellement en attente de restauration ou de suppression définitive.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
