import type {
  CashFlowReport,
  FinancialReportSummary,
  ReceivableAging,
  SalespersonPerformance,
  SalesReportSummary,
  SalesReportTrend,
  SupplierDebtAging,
} from '@/types/reporting'

export interface ReportExportPayload {
  role: 'admin' | 'lead_team' | 'commercial'
  startDate: string
  endDate: string
  currencyFilter: string | null
  period: string
  summary: SalesReportSummary[]
  trend: SalesReportTrend[]
  receivables: ReceivableAging[]
  performance: SalespersonPerformance[]
  financial: FinancialReportSummary[]
  cashFlow: CashFlowReport[]
  supplierDebts: SupplierDebtAging[]
}

const NAVY = '10243E'
const GOLD = 'D5A928'
const LIGHT = 'EAF0F5'
const MONEY_FORMAT = '#,##0.00;[Red](#,##0.00);-'
const AGING_LABELS: Record<string, string> = {
  non_echue: 'Non échue',
  '1_30': '1-30 jours',
  '31_60': '31-60 jours',
  '61_90': '61-90 jours',
  plus_90: '+90 jours',
}

function filename(payload: ReportExportPayload, extension: string) {
  return `IME_Rapports_${payload.startDate}_${payload.endDate}.${extension}`
}

function download(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

function scope(payload: ReportExportPayload) {
  const roles = { admin: 'Administrateur', lead_team: 'Responsable équipe', commercial: 'Commercial' }
  return `${roles[payload.role]} - ${payload.currencyFilter ?? 'Toutes les devises'}`
}

function number(value: unknown) {
  return Number(value) || 0
}

function pdfMoney(value: unknown, currency: string) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(number(value))} ${currency}`
}

export async function buildReportsPdf(payload: ReportExportPayload) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = autoTableModule.default
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const generatedAt = new Date()

  const heading = (title: string, first = false) => {
    if (!first) doc.addPage()
    doc.setFillColor(16, 36, 62)
    doc.rect(0, 0, 297, 24, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(15)
    doc.text(title, 14, 15)
    doc.setTextColor(40, 50, 65)
  }
  const table = (head: string[], body: (string | number)[][], startY = 32) => {
    autoTable(doc, {
      startY,
      head: [head],
      body: body.length ? body : [['Aucune donnée sur la période', ...head.slice(1).map(() => '')]],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [16, 36, 62], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [244, 247, 250] },
      margin: { left: 10, right: 10, bottom: 14 },
    })
  }

  heading('IM ÉNERGIE CRM - Rapports & Performance', true)
  doc.setFontSize(10)
  doc.text(`Période : ${payload.startDate} au ${payload.endDate}`, 14, 32)
  doc.text(`Périmètre : ${scope(payload)}`, 14, 39)
  doc.text(`Regroupement : ${payload.period}`, 14, 46)
  table(
    ['Devise', 'Factures', 'Facturé', 'Encaissé', 'Remboursé', 'Net encaissé', 'Créances', 'En retard'],
    payload.summary.map(r => [
      r.currency, r.invoice_count, pdfMoney(r.invoiced_amount, r.currency),
      pdfMoney(r.collected_amount, r.currency), pdfMoney(r.refunded_amount, r.currency),
      pdfMoney(r.net_collected_amount, r.currency), pdfMoney(r.outstanding_amount, r.currency),
      pdfMoney(r.overdue_amount, r.currency),
    ]),
    55,
  )

  heading('Évolution des ventes')
  table(
    ['Période', 'Devise', 'Factures', 'Facturé', 'Encaissé', 'Remboursé', 'Net encaissé'],
    payload.trend.map(r => [
      r.period_start, r.currency, r.invoice_count, pdfMoney(r.invoiced_amount, r.currency),
      pdfMoney(r.collected_amount, r.currency), pdfMoney(r.refunded_amount, r.currency),
      pdfMoney(r.net_collected_amount, r.currency),
    ]),
  )

  heading('Créances clients')
  table(
    ['Référence', 'Client', 'Commercial', 'Échéance', 'Ancienneté', 'Facture', 'Payé', 'Reste dû'],
    payload.receivables.map(r => [
      r.reference, r.client_name, r.salesperson_name ?? '-', r.due_date ?? '-',
      AGING_LABELS[r.aging_bucket] ?? r.aging_bucket, pdfMoney(r.original_amount, r.currency),
      pdfMoney(r.paid_amount, r.currency), pdfMoney(r.outstanding, r.currency),
    ]),
  )

  heading('Performance des vendeurs')
  table(
    ['Commercial', 'Devise', 'Devis', 'Approuvés', 'Conversion', 'Projets', 'Contrats', 'Facturé', 'Net encaissé', 'Créances'],
    payload.performance.map(r => [
      r.salesperson_name, r.currency, r.quotation_count, r.approved_quotation_count,
      `${number(r.quotation_conversion_pct).toFixed(1)} %`, r.project_count,
      pdfMoney(r.contract_amount, r.currency), pdfMoney(r.invoiced_amount, r.currency),
      pdfMoney(r.net_collected_amount, r.currency), pdfMoney(r.outstanding_amount, r.currency),
    ]),
  )

  if (payload.role === 'admin') {
    heading('Bilan financier')
    table(
      ['Devise', 'Ventes', 'Entrées clients', 'Achats fournisseurs', 'Sorties fournisseurs', 'Dépenses engagées', 'Dépenses payées', 'Résultat estimé', 'Flux net'],
      payload.financial.map(r => [
        r.currency, pdfMoney(r.invoiced_sales, r.currency), pdfMoney(r.customer_cash_in, r.currency),
        pdfMoney(r.supplier_invoices, r.currency), pdfMoney(r.supplier_cash_out, r.currency),
        pdfMoney(r.project_expenses_committed, r.currency), pdfMoney(r.project_expenses_paid, r.currency),
        pdfMoney(r.estimated_operating_result, r.currency), pdfMoney(r.net_cash_flow, r.currency),
      ]),
    )
    heading('Évolution de la trésorerie')
    table(
      ['Période', 'Devise', 'Entrées', 'Fournisseurs', 'Dépenses', 'Flux net'],
      payload.cashFlow.map(r => [
        r.period_start, r.currency, pdfMoney(r.cash_in, r.currency),
        pdfMoney(r.supplier_out, r.currency), pdfMoney(r.expense_out, r.currency),
        pdfMoney(r.net_cash_flow, r.currency),
      ]),
    )
    heading('Dettes fournisseurs')
    table(
      ['Référence', 'Fournisseur', 'Échéance', 'Ancienneté', 'Facture', 'Payé', 'Reste dû'],
      payload.supplierDebts.map(r => [
        r.reference, r.supplier_name, r.due_date ?? '-',
        AGING_LABELS[r.aging_bucket] ?? r.aging_bucket, pdfMoney(r.original_amount, r.currency),
        pdfMoney(r.paid_amount, r.currency), pdfMoney(r.outstanding, r.currency),
      ]),
    )
  }

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setFontSize(7)
    doc.setTextColor(110)
    doc.text(`Confidentiel - ${scope(payload)}`, 10, 204)
    doc.text(
      `Généré le ${generatedAt.toLocaleString('fr-FR')} - Page ${page}/${pages}`,
      287, 204, { align: 'right' },
    )
  }
  return doc
}

export async function exportReportsPdf(payload: ReportExportPayload) {
  const doc = await buildReportsPdf(payload)
  doc.save(filename(payload, 'pdf'))
}

export async function buildReportsExcel(payload: ReportExportPayload) {
  const ExcelJSModule = await import('exceljs')
  const ExcelJS = ExcelJSModule.default ?? ExcelJSModule
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'IM ÉNERGIE CRM'
  workbook.company = 'IM ÉNERGIE'
  workbook.title = 'Rapports & Performance'
  workbook.subject = `${payload.startDate} au ${payload.endDate} - ${scope(payload)}`
  workbook.created = new Date()

  type Row = (string | number | Date | null)[]
  const addSheet = (name: string, title: string, headers: string[], rows: Row[], moneyColumns: number[] = [], percentColumns: number[] = []) => {
    const sheet = workbook.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 6 }],
      properties: { defaultRowHeight: 18 },
    })
    sheet.mergeCells(1, 1, 1, Math.max(headers.length, 2))
    const titleCell = sheet.getCell(1, 1)
    titleCell.value = title
    titleCell.font = { bold: true, size: 16, color: { argb: `FF${NAVY}` } }
    sheet.getCell(2, 1).value = 'Période'
    sheet.getCell(2, 2).value = `${payload.startDate} au ${payload.endDate}`
    sheet.getCell(3, 1).value = 'Périmètre'
    sheet.getCell(3, 2).value = scope(payload)
    sheet.getCell(4, 1).value = 'Généré le'
    sheet.getCell(4, 2).value = new Date()
    sheet.getCell(4, 2).numFmt = 'dd/mm/yyyy hh:mm'
    const headerRow = sheet.getRow(6)
    headerRow.values = headers
    headerRow.height = 28
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.alignment = { vertical: 'middle', wrapText: true }
    })
    rows.forEach(values => sheet.addRow(values))
    sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: headers.length } }
    sheet.columns.forEach((column, index) => {
      const max = Math.max(headers[index]?.length ?? 10, ...rows.map(row => String(row[index] ?? '').length))
      column.width = Math.min(Math.max(max + 2, 12), 34)
    })
    moneyColumns.forEach(column => {
      sheet.getColumn(column).numFmt = MONEY_FORMAT
    })
    percentColumns.forEach(column => {
      sheet.getColumn(column).numFmt = '0.0%'
    })
    for (let row = 7; row <= sheet.rowCount; row += 1) {
      if (row % 2 === 0) {
        sheet.getRow(row).eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${LIGHT}` } }
        })
      }
    }
    sheet.getRow(1).border = { bottom: { style: 'medium', color: { argb: `FF${GOLD}` } } }
    return sheet
  }

  addSheet('Synthese', 'Synthèse des ventes', [
    'Devise', 'Factures', 'Facturé', 'Encaissé', 'Remboursé', 'Net encaissé', 'Créances', 'En retard',
  ], payload.summary.map(r => [
    r.currency, number(r.invoice_count), number(r.invoiced_amount), number(r.collected_amount),
    number(r.refunded_amount), number(r.net_collected_amount), number(r.outstanding_amount),
    number(r.overdue_amount),
  ]), [3, 4, 5, 6, 7, 8])

  addSheet('Evolution', 'Évolution des ventes', [
    'Période', 'Devise', 'Factures', 'Facturé', 'Encaissé', 'Remboursé', 'Net encaissé',
  ], payload.trend.map(r => [
    new Date(`${r.period_start.slice(0, 10)}T00:00:00Z`), r.currency, number(r.invoice_count),
    number(r.invoiced_amount), number(r.collected_amount), number(r.refunded_amount),
    number(r.net_collected_amount),
  ]), [4, 5, 6, 7]).getColumn(1).numFmt = 'dd/mm/yyyy'

  const receivables = addSheet('Creances', 'Créances clients', [
    'Référence', 'Client', 'Commercial', 'Devise', 'Échéance', 'Jours de retard', 'Ancienneté',
    'Montant initial', 'Payé', 'Reste dû',
  ], payload.receivables.map(r => [
    r.reference, r.client_name, r.salesperson_name ?? '', r.currency,
    r.due_date ? new Date(`${r.due_date.slice(0, 10)}T00:00:00Z`) : null,
    number(r.days_overdue), AGING_LABELS[r.aging_bucket] ?? r.aging_bucket,
    number(r.original_amount), number(r.paid_amount), number(r.outstanding),
  ]), [8, 9, 10])
  receivables.getColumn(5).numFmt = 'dd/mm/yyyy'

  addSheet('Performance', 'Performance des vendeurs', [
    'Commercial', 'Devise', 'Devis', 'Devis approuvés', 'Conversion', 'Montant devis approuvés',
    'Projets', 'Montant contrats', 'Factures', 'Facturé', 'Net encaissé', 'Créances',
  ], payload.performance.map(r => [
    r.salesperson_name, r.currency, number(r.quotation_count), number(r.approved_quotation_count),
    number(r.quotation_conversion_pct) / 100, number(r.approved_quotation_amount),
    number(r.project_count), number(r.contract_amount), number(r.invoice_count),
    number(r.invoiced_amount), number(r.net_collected_amount), number(r.outstanding_amount),
  ]), [6, 8, 10, 11, 12], [5])

  if (payload.role === 'admin') {
    addSheet('Bilan financier', 'Bilan financier', [
      'Devise', 'Ventes facturées', 'Entrées clients', 'Factures fournisseurs',
      'Sorties fournisseurs', 'Dépenses engagées', 'Dépenses payées', 'Résultat estimé', 'Flux net',
    ], payload.financial.map(r => [
      r.currency, number(r.invoiced_sales), number(r.customer_cash_in), number(r.supplier_invoices),
      number(r.supplier_cash_out), number(r.project_expenses_committed),
      number(r.project_expenses_paid), number(r.estimated_operating_result), number(r.net_cash_flow),
    ]), [2, 3, 4, 5, 6, 7, 8, 9])

    addSheet('Tresorerie', 'Évolution de la trésorerie', [
      'Période', 'Devise', 'Entrées', 'Sorties fournisseurs', 'Dépenses', 'Flux net',
    ], payload.cashFlow.map(r => [
      new Date(`${r.period_start.slice(0, 10)}T00:00:00Z`), r.currency, number(r.cash_in),
      number(r.supplier_out), number(r.expense_out), number(r.net_cash_flow),
    ]), [3, 4, 5, 6]).getColumn(1).numFmt = 'dd/mm/yyyy'

    const debts = addSheet('Dettes fournisseurs', 'Dettes fournisseurs', [
      'Référence', 'Fournisseur', 'Devise', 'Échéance', 'Jours de retard', 'Ancienneté',
      'Montant initial', 'Payé', 'Reste dû',
    ], payload.supplierDebts.map(r => [
      r.reference, r.supplier_name, r.currency,
      r.due_date ? new Date(`${r.due_date.slice(0, 10)}T00:00:00Z`) : null,
      number(r.days_overdue), AGING_LABELS[r.aging_bucket] ?? r.aging_bucket,
      number(r.original_amount), number(r.paid_amount), number(r.outstanding),
    ]), [7, 8, 9])
    debts.getColumn(4).numFmt = 'dd/mm/yyyy'
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(buffer)
}

export async function exportReportsExcel(payload: ReportExportPayload) {
  const buffer = await buildReportsExcel(payload)
  download(
    buffer,
    filename(payload, 'xlsx'),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
}
