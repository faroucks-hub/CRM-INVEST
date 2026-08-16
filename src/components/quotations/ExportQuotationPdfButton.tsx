'use client'

import { downloadQuotationPDF } from '@/lib/pdf/quotation-pdf'

interface Props {
  quotation: any
  lines: any[]
}

export default function ExportQuotationPdfButton({
  quotation,
  lines,
}: Props) {
  async function handleExport() {
    const mappedLines = lines.map((line) => ({
      description:
        line.designation ||
        line.description ||
        '-',

      quantity: Number(line.quantity || 1),

      unit: line.unit || 'pcs',

      unit_price_sell:
        Number(line.unit_price_sell || 0),

      discount_pct:
        Number(line.discount_pct || 0),

      line_total_sell:
        Number(line.line_total_sell || 0),
    }))

    await downloadQuotationPDF({
      ...quotation,
      lines: mappedLines,
    })
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="btn btn-primary"
    >
      Export PDF
    </button>
  )
}
