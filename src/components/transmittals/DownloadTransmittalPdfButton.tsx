'use client'

import { Download } from 'lucide-react'
import { downloadTransmittalPDF } from '@/lib/pdf/transmittal-pdf'

interface Props {
  transmittal: any
  documents: any[]
}

export default function DownloadTransmittalPdfButton({
  transmittal,
  documents,
}: Props) {
  async function handleDownload() {
    await downloadTransmittalPDF({
      transmittal_number:
        transmittal.transmittal_number,

      subject:
        transmittal.subject || '',

      client_name:
        transmittal.clients?.company_name || '',

      comments:
        transmittal.comments || '',

      created_at:
        transmittal.created_at,

      documents,
    })

  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="btn btn-primary"
    >
      <Download className="w-4 h-4 mr-2" />
      Download PDF
    </button>
  )
}
