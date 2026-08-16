'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'

import {
  createTransmittal,
} from '@/lib/actions/transmittals'

interface Props {
  projectId: string
}

export default function CreateTransmittalForm({
  projectId,
}: Props) {
  const router = useRouter()

  const [isPending, startTransition] =
    useTransition()

  const [documents, setDocuments] = useState<any[]>([])

  const [selectedDocs, setSelectedDocs] =
    useState<string[]>([])

  const [formData, setFormData] = useState({
    subject: '',
    client_name: '',
    comments: '',
  })

  useEffect(() => {
    async function loadDocuments() {
      const supabase = createClient()

      const { data } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('document_status', 'approved')
        .order('created_at', {
          ascending: false,
        })

      setDocuments(data || [])
    }

    loadDocuments()
  }, [projectId])

  function toggleDocument(documentId: string) {
    if (selectedDocs.includes(documentId)) {
      setSelectedDocs(
        selectedDocs.filter(
          (id) => id !== documentId
        )
      )
    } else {
      setSelectedDocs([
        ...selectedDocs,
        documentId,
      ])
    }
  }

  function handleCreateTransmittal() {
    if (!selectedDocs.length) {
      toast.error(
        'Select at least one approved document'
      )

      return
    }

    startTransition(async () => {
      const result = await createTransmittal({
        projectId,

        subject: formData.subject,

        clientName: formData.client_name,

        comments: formData.comments,

        documentIds: selectedDocs,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success('Transmittal created')

      router.push(`/projets/${projectId}`)
    })
  }

  return (
    <div className="space-y-6">

      <div className="card p-6">

        <h2 className="text-lg font-semibold mb-4">
          Transmittal Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="label">
              Subject
            </label>

            <input
              className="input"
              placeholder="Document submission"
              value={formData.subject}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  subject: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="label">
              Client Name
            </label>

            <input
              className="input"
              placeholder="Client"
              value={formData.client_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  client_name: e.target.value,
                })
              }
            />
          </div>

        </div>

        <div className="mt-4">

          <label className="label">
            Comments
          </label>

          <textarea
            className="input min-h-[120px]"
            placeholder="Comments"
            value={formData.comments}
            onChange={(e) =>
              setFormData({
                ...formData,
                comments: e.target.value,
              })
            }
          />

        </div>

      </div>

      <div className="card p-6">

        <h2 className="text-lg font-semibold mb-4">
          Approved Documents
        </h2>

        <div className="space-y-3">

          {documents.map((doc) => (

            <label
              key={doc.id}
              className="
                flex items-center justify-between
                border rounded-lg p-4
                cursor-pointer
                hover:bg-gray-50
              "
            >

              <div className="flex items-center gap-3">

                <input
                  type="checkbox"
                  checked={selectedDocs.includes(
                    doc.id
                  )}
                  onChange={() =>
                    toggleDocument(doc.id)
                  }
                />

                <div>

                  <div className="font-medium">
                    {doc.file_name}
                  </div>

                  <div className="text-sm text-gray-500">

                    REV {doc.revision}

                  </div>

                </div>

              </div>

              <div
                className="
                  px-2 py-1 rounded
                  bg-green-100 text-green-700
                  text-xs
                "
              >
                APPROVED
              </div>

            </label>

          ))}

          {!documents.length && (

            <div className="text-gray-500 text-sm">

              No approved documents found

            </div>

          )}

        </div>

      </div>

      <div className="flex justify-end">

        <button
          className="btn btn-primary"
          onClick={handleCreateTransmittal}
          disabled={isPending}
        >

          {isPending
            ? 'Creating...'
            : 'Create Transmittal'}

        </button>

      </div>

    </div>
  )
}