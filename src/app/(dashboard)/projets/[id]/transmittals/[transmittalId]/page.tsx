import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DownloadTransmittalPdfButton from '@/components/transmittals/DownloadTransmittalPdfButton'
import { PageHeader } from '@/components/ui/page-header'

interface Props {
  params: Promise<{
    id: string
    transmittalId: string
  }>
}

export default async function TransmittalDetailPage({ params }: Props) {
  const { id, transmittalId } = await params
  const supabase = await createClient()

  const { data: transmittal } = await supabase
    .from('document_transmittals')
    .select(`
      *,
      clients(id, company_name),
      projets_v2(id, reference, name),
      document_transmittal_items(*)
    `)
    .eq('id', transmittalId)
    .eq('project_id', id)
    .single()

  if (!transmittal) {
    notFound()
  }

  const items = transmittal.document_transmittal_items ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="card p-8">
        <div className="border-b pb-6 mb-6">
          <PageHeader
            title={transmittal.transmittal_number}
            description="Official document submission"
            backHref={`/projets/${id}`}
            backLabel="Retour au projet"
          />
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm mb-8">
          <div>
            <div className="text-gray-400">Project</div>
            <div className="font-medium">
              {transmittal.projets_v2?.reference} —{' '}
              {transmittal.projets_v2?.name}
            </div>
          </div>

          <div>
            <div className="text-gray-400">Client</div>
            <div className="font-medium">
              {transmittal.clients?.company_name ?? '—'}
            </div>
          </div>

          <div>
            <div className="text-gray-400">Date</div>
            <div className="font-medium">
              {new Date(transmittal.created_at).toLocaleDateString()}
            </div>
          </div>

          <div>
            <div className="text-gray-400">Status</div>
            <div className="font-medium capitalize">
              {transmittal.status}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Revision</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">
                    {item.file_name}
                  </td>

                  <td className="px-4 py-3">
                    {item.document_type}
                  </td>

                  <td className="px-4 py-3">
                    REV {item.revision}
                  </td>

                  <td className="px-4 py-3 capitalize">
                    {item.document_status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-6">
          <DownloadTransmittalPdfButton
           transmittal={transmittal}
           documents={items}
         />
        </div>
      </div>
    </div>
  )
}
