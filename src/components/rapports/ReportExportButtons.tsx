'use client'

import { useState } from 'react'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import {
  exportReportsExcel,
  exportReportsPdf,
  type ReportExportPayload,
} from '@/lib/reports/export'

export function ReportExportButtons({ payload }: { payload: ReportExportPayload }) {
  const [loading, setLoading] = useState<'pdf' | 'excel' | null>(null)

  async function run(type: 'pdf' | 'excel') {
    setLoading(type)
    try {
      if (type === 'pdf') await exportReportsPdf(payload)
      else await exportReportsExcel(payload)
      toast.success(`Export ${type === 'pdf' ? 'PDF' : 'Excel'} généré`)
    } catch (error) {
      console.error(error)
      toast.error("Impossible de générer l'export")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={loading !== null}
        onClick={() => run('pdf')}
      >
        <FileDown className="h-4 w-4" />
        {loading === 'pdf' ? 'Génération…' : 'Exporter en PDF'}
      </button>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={loading !== null}
        onClick={() => run('excel')}
      >
        <FileSpreadsheet className="h-4 w-4" />
        {loading === 'excel' ? 'Génération…' : 'Exporter en Excel'}
      </button>
    </div>
  )
}
