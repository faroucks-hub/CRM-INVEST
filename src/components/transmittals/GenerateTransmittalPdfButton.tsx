'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { transmittalPdfBlob } from '@/lib/pdf/transmittal-pdf'
import { uploadProjectDocument } from '@/lib/actions/project-documents'

interface Props {
  projectId: string
  transmittal: any
}

export default function GenerateTransmittalPdfButton({
  projectId,
  transmittal,
}: Props) {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    try {
      setLoading(true)

      if (!transmittal) {
        toast.error('Transmittal data not found')
        return
      }

      const blob = await transmittalPdfBlob({
        ...transmittal,
        documents:
          transmittal.documents ??
          transmittal.document_transmittal_items ??
          [],
      })

      const transmittalNumber =
        transmittal.transmittal_number ||
        transmittal.number ||
        'document-transmittal'

      const file = new File(
        [blob],
        `${transmittalNumber}.pdf`,
        {
          type: 'application/pdf',
        }
      )

      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('documentType', 'transmittal')

      const uploadResult = await uploadProjectDocument(formData)

      if (uploadResult?.error) {
        toast.error(uploadResult.error)
        return
      }

      toast.success(`Transmittal PDF generated: ${transmittalNumber}`)
      window.location.reload()
    } catch (error) {
      console.error(error)
      toast.error('Failed to generate transmittal PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={loading}
      className="btn btn-primary btn-sm"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}

      {loading ? 'Generating...' : 'Generate PDF'}
    </button>
  )
}
