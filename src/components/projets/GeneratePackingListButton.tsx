'use client'

import { useState } from 'react'
import { Package, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { pdf } from '@react-pdf/renderer'

import { PackingListPDF } from '@/lib/pdf/packing-list-pdf'

import {
  getPackingListDataForProject,
  uploadProjectDocument,
} from '@/lib/actions/project-documents'

export default function GeneratePackingListButton({
  projectId,
}: {
  projectId: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    try {
      setLoading(true)

      const result = await getPackingListDataForProject(projectId)

      if (!result?.success || !result.packing) {
        toast.error(result?.error || 'Unable to load packing list data')
        return
      }

      const packing = result.packing

      const blob = await pdf(
        <PackingListPDF packing={packing} />
      ).toBlob()

      const file = new File(
        [blob],
        `${packing.number}.pdf`,
        {
          type: 'application/pdf',
        }
      )

      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('documentType', 'packing_list')

      const uploadResult = await uploadProjectDocument(formData)

      if (uploadResult?.error) {
        toast.error(uploadResult.error)
        return
      }

      toast.success('Packing List generated successfully')
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
          <Package className="w-4 h-4 mr-2" />
        )}

        {loading ? 'Generating...' : 'Generate Packing List'}
      </button>
    </div>
  )
}