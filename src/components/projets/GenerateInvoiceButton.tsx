'use client'

import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { pdf } from '@react-pdf/renderer'

import {
  CommercialInvoicePDF,
} from '@/lib/pdf/commercial-invoice-pdf'

import {
  getCommercialInvoiceDataForProject,
  uploadProjectDocument,
} from '@/lib/actions/project-documents'

export default function GenerateInvoiceButton({
  projectId,
}: {
  projectId: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    try {
      setLoading(true)

      const result =
        await getCommercialInvoiceDataForProject(projectId)

      if (!result?.success || !result.invoice) {
        toast.error(result?.error || 'Unable to load invoice data')
        return
      }

      const invoice = result.invoice

      const blob = await pdf(
        <CommercialInvoicePDF invoice={invoice} />
      ).toBlob()

      const file = new File(
        [blob],
        `CI-${invoice.number}.pdf`,
        {
          type: 'application/pdf',
        }
      )

      const formData = new FormData()

      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('documentType', 'commercial_invoice')

      const uploadResult =
        await uploadProjectDocument(formData)

      if (uploadResult?.error) {
        toast.error(uploadResult.error)
        return
      }

      toast.success('Commercial Invoice generated successfully')
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
        className="btn btn-primary btn-sm"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 mr-2" />
        )}

        {loading
          ? 'Generating...'
          : 'Generate Commercial Invoice'}
      </button>
    </div>
  )
}