'use client'

import { Download } from 'lucide-react'
import { downloadTransmittalPDF } from '@/lib/pdf/transmittal-pdf'

interface Props {
  transmittal?: any
  documents?: any[]
}

export default function ExportTransmittalPdfButton({
  transmittal,
  documents = [],
}: Props) {
  async function handleExport() {
    if (!transmittal) {
      alert('Transmittal data not found')
      return
    }

    await downloadTransmittalPDF({
      transmittal_number:
        transmittal.transmittal_number || 'Document-Transmittal',
      subject: transmittal.subject || '',
      client_name:
        transmittal.clients?.company_name ||
        transmittal.client_name ||
        '',
      comments: transmittal.comments || transmittal.notes || '',
      created_at: transmittal.created_at || new Date().toISOString(),
      documents: documents || [],
    })

  }

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={handleExport}
    >
      <Download className="w-4 h-4 mr-2" />
      Export PDF
    </button>
  )
}
