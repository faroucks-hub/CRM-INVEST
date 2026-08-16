'use client'

import Link from 'next/link'
import { FileText, Download } from 'lucide-react'
import GenerateTransmittalPdfButton from './GenerateTransmittalPdfButton'

interface Props {
  projectId: string
  transmittals: any[]
}

export default function ProjectTransmittalsSection({
  projectId,
  transmittals,
}: Props) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold">
            Document Transmittals
          </h2>

          <p className="text-sm text-gray-400">
            Official document submissions
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {transmittals?.length === 0 && (
          <div className="text-sm text-gray-400">
            No transmittals generated
          </div>
        )}

        {transmittals?.map((trm) => {
          const items = trm.document_transmittal_items ?? []

          return (
            <div
              key={trm.id}
              className="rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-navy-900">
                    {trm.transmittal_number}
                  </div>

                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(trm.created_at).toLocaleDateString()}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
  {items.length} docs • {trm.client_name ?? 'Client'}
</div>
                </div>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700 capitalize">
                  {trm.status}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
  {items.slice(0, 3).map((item: any) => (
    <span
      key={item.id}
      className="
        px-2 py-1
        rounded-md
        bg-gray-100
        text-xs
        text-gray-700
      "
    >
      {item.document_type}
    </span>
  ))}

  {items.length > 3 && (
    <span
      className="
        px-2 py-1
        rounded-md
        bg-blue-100
        text-xs
        text-blue-700
      "
    >
      +{items.length - 3} more
    </span>
  )}
</div>

              <div className="flex gap-2 mt-4">
                <Link
                  href={`/projets/${projectId}/transmittals/${trm.id}`}
                  className="btn btn-outline btn-sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View
                </Link>

                <GenerateTransmittalPdfButton
                 projectId={projectId}
                 transmittal={trm}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}