import CreateTransmittalForm from '@/components/transmittals/CreateTransmittalForm'
import { PageHeader } from '@/components/ui/page-header'

export default async function NewTransmittalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Transmittal"
        description="Create document transmittal for client submission"
        backHref={`/projets/${id}`}
        backLabel="Retour au projet"
      />

      <CreateTransmittalForm
        projectId={id}
      />
    </div>
  )
}
