'use client'

import { useState } from 'react'
import { Truck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { pdf } from '@react-pdf/renderer'

import { DeliveryNotePDF } from '@/lib/pdf/delivery-note-pdf'

import {
  getDeliveryNoteDataForProject,
  uploadProjectDocument,
} from '@/lib/actions/project-documents'

export default function GenerateDeliveryNoteButton({
  projectId,
}: {
  projectId: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    try {
      setLoading(true)

      const result = await getDeliveryNoteDataForProject(projectId)

      if (!result?.success || !result.delivery) {
        toast.error(result?.error || 'Unable to load delivery note data')
        return
      }

      const delivery = result.delivery

      const blob = await pdf(
        <DeliveryNotePDF delivery={delivery} />
      ).toBlob()

      const file = new File(
        [blob],
        `${delivery.number}.pdf`,
        {
          type: 'application/pdf',
        }
      )

      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('documentType', 'delivery_note')

      const uploadResult = await uploadProjectDocument(formData)

      if (uploadResult?.error) {
        toast.error(uploadResult.error)
        return
      }

      toast.success('Delivery Note generated successfully')
    } catch (err) {
      console.error(err)
      toast.error('Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-end">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="btn btn-outline btn-sm"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Truck className="w-4 h-4 mr-2" />
        )}

        {loading ? 'Generating...' : 'Generate Delivery Note'}
      </button>
    </div>
  )
}