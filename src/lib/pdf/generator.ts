// ═══════════════════════════════════════════════════════════════════
// IME CRM — Générateur PDF
// Utilise jsPDF (côté client uniquement)
// Sprint 3 : Quotations & Proformas
// ═══════════════════════════════════════════════════════════════════

import type { QuotationFull, ProformaFull, LineItem } from '@/types/sprint3'
import { formatDate } from '@/lib/utils'

// ── Constantes design ─────────────────────────────────────────────
const NAVY   = [11,  31,  58]   as const   // #0B1F3A
const GOLD   = [217, 164, 65]  as const   // #D9A441
const GOLD_L = [245, 230, 192] as const   // #F5E6C0
const WHITE  = [255, 255, 255] as const
const GRAY   = [107, 114, 128] as const
const LGRAY  = [229, 231, 235] as const
const TEXT   = [31,  41,  55]  as const

const PW = 210   // A4 width mm
const PH = 297   // A4 height mm
const ML = 15    // margin left
const MR = 15    // margin right
const CW = PW - ML - MR  // content width

// ── Helper dynamique (charge jsPDF côté client) ───────────────────
async function getJsPDF() {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')
  return jsPDF
}

// ── Format devise ─────────────────────────────────────────────────
function fmtCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null) return '—'
  const symbols: Record<string, string> = { USD: '$', EUR: '€', TRY: '₺', XOF: 'FCFA' }
  const sym = symbols[currency] ?? currency
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${formatted} ${sym}`
}

// ── Page header commun ────────────────────────────────────────────
function drawHeader(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  docNumber: string,
  docTitle: string,
  issuedDate: string,
  validUntil: string,
  currency: string
) {
  const d = doc as unknown as {
    setFillColor(r:number,g:number,b:number):void
    rect(x:number,y:number,w:number,h:number,style:string):void
    setTextColor(r:number,g:number,b:number):void
    setFontSize(n:number):void
    setFont(f:string,s?:string):void
    text(t:string,x:number,y:number,opts?:Record<string,unknown>):void
    addImage(img:string,fmt:string,x:number,y:number,w:number,h:number):void
    line(x1:number,y1:number,x2:number,y2:number):void
    setDrawColor(r:number,g:number,b:number):void
    setLineWidth(n:number):void
  }

  // ── Bande navy header ─────────────────────────────────────────
  d.setFillColor(...NAVY)
  d.rect(0, 0, PW, 42, 'F')

  // Accent gold
  d.setFillColor(...GOLD)
  d.rect(0, 42, PW, 1.2, 'F')

  // Titre document (droite)
  d.setTextColor(...WHITE)
  d.setFontSize(18)
  d.setFont('helvetica', 'bold')
  d.text(docTitle.toUpperCase(), PW - MR, 14, { align: 'right' })

  d.setFontSize(11)
  d.setFont('helvetica', 'normal')
  d.text(docNumber, PW - MR, 22, { align: 'right' })

  // Nom société (gauche)
  d.setFontSize(14)
  d.setFont('helvetica', 'bold')
  d.text('INVEST MENTOR ÉNERGIE', ML, 14)

  d.setFontSize(8)
  d.setFont('helvetica', 'normal')
  d.setTextColor(...GOLD_L)
  d.text('Hub énergétique Turquie — Afrique', ML, 20)
  d.text('Istanbul, Turquie', ML, 25)
  d.text('contact@investmentor-energie.com', ML, 30)
  d.text('www.investmentor-energie.com', ML, 35)

  // ── Méta infos (dates / devise) ───────────────────────────────
  const metaY = 48
  d.setTextColor(...GRAY)
  d.setFontSize(8)
  d.setFont('helvetica', 'normal')

  const metaItems = [
    ['Date d\'émission :', formatDate(issuedDate)],
    ['Valide jusqu\'au :', formatDate(validUntil)],
    ['Devise :', currency],
  ]

  metaItems.forEach(([label, value], i) => {
    const x = ML + i * 60
    d.text(label, x, metaY)
    d.setTextColor(...TEXT)
    d.setFont('helvetica', 'bold')
    d.text(value, x, metaY + 5)
    d.setTextColor(...GRAY)
    d.setFont('helvetica', 'normal')
  })

  return 58  // next Y position
}

// ── Bloc client ───────────────────────────────────────────────────
function drawClientBlock(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  client: QuotationFull['client'],
  y: number
) {
  const d = doc as unknown as {
    setFillColor(r:number,g:number,b:number):void
    rect(x:number,y:number,w:number,h:number,style:string):void
    setTextColor(r:number,g:number,b:number):void
    setFontSize(n:number):void
    setFont(f:string,s?:string):void
    text(t:string,x:number,y:number,opts?:Record<string,unknown>):void
    setDrawColor(r:number,g:number,b:number):void
    setLineWidth(n:number):void
  }

  const blockH = 30
  d.setFillColor(246, 248, 250)
  d.rect(ML, y, CW, blockH, 'F')

  // Bordure gold gauche
  d.setFillColor(...GOLD)
  d.rect(ML, y, 2, blockH, 'F')

  d.setTextColor(...GRAY)
  d.setFontSize(7)
  d.setFont('helvetica', 'bold')
  d.text('DESTINATAIRE', ML + 5, y + 6)

  d.setTextColor(...TEXT)
  d.setFontSize(11)
  d.setFont('helvetica', 'bold')
  d.text(client?.company_name ?? '—', ML + 5, y + 13)

  d.setFontSize(8.5)
  d.setFont('helvetica', 'normal')
  d.setTextColor(...GRAY)

  const lines = [
    client?.contact_name,
    [client?.city, client?.country].filter(Boolean).join(', '),
    client?.contact_email,
  ].filter(Boolean)

  lines.forEach((line, i) => {
    d.text(line!, ML + 5, y + 20 + i * 4)
  })

  return y + blockH + 6
}

// ── Conditions commerciales ────────────────────────────────────────
function drawConditions(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  data: {
    incoterm?: string | null
    delivery_delay?: string | null
    warranty_terms?: string | null
    payment_terms?: string | null
  },
  y: number
) {
  const d = doc as unknown as {
    setFillColor(r:number,g:number,b:number):void
    rect(x:number,y:number,w:number,h:number,style:string):void
    setTextColor(r:number,g:number,b:number):void
    setFontSize(n:number):void
    setFont(f:string,s?:string):void
    text(t:string,x:number,y:number,opts?:Record<string,unknown>):void
  }

  const conditions = [
    ['Incoterm', data.incoterm || 'DAP'],
    ['Délai livraison', data.delivery_delay || 'Sur devis'],
    ['Garantie', data.warranty_terms || 'Garantie fabricant 2 ans'],
    ['Paiement', data.payment_terms || '30% acompte, solde avant expédition'],
  ]

  const colW = CW / 4
  conditions.forEach(([label, value], i) => {
    const cx = ML + i * colW
    d.setFillColor(i % 2 === 0 ? 249 : 244, i % 2 === 0 ? 250 : 245, i % 2 === 0 ? 251 : 248)
    d.rect(cx, y, colW, 14, 'F')

    d.setTextColor(...GRAY)
    d.setFontSize(7)
    d.setFont('helvetica', 'bold')
    d.text(label.toUpperCase(), cx + 3, y + 5)

    d.setTextColor(...TEXT)
    d.setFontSize(8)
    d.setFont('helvetica', 'normal')
    // Tronque si trop long
    const short = value.length > 30 ? value.slice(0, 28) + '…' : value
    d.text(short, cx + 3, y + 11)
  })

  return y + 20
}

// ── Table produits ────────────────────────────────────────────────
async function drawItemsTable(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  items: LineItem[],
  currency: string,
  y: number,
  hidePrices = false
) {
  const autoTable = (doc as unknown as { autoTable: (opts: Record<string, unknown>) => { finalY: number } }).autoTable

  const head = hidePrices
    ? [['#', 'Désignation', 'Qté', 'Unité']]
    : [['#', 'Désignation', 'Qté', 'Unité', 'P.U. HT', 'Remise', 'Total HT']]

  const body = items.map((item, i) => {
    const base = [
      String(i + 1),
      { content: [item.description, item.detail].filter(Boolean).join('\n'), styles: { cellWidth: 'auto' } },
      new Intl.NumberFormat('fr-FR').format(item.quantity),
      item.unit,
    ]
    if (!hidePrices) {
      base.push(
        fmtCurrency(item.unit_sell_price, currency),
        item.discount_pct > 0 ? `${item.discount_pct}%` : '—',
        fmtCurrency(item.line_total_sell, currency)
      )
    }
    return base
  })

  const result = autoTable({
    startY: y,
    head,
    body,
    theme: 'grid',
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
    },
    bodyStyles: {
      fontSize: 8,
      textColor: TEXT,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: hidePrices ? {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
    } : {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'right' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: ML, right: MR },
    styles: {
      lineColor: LGRAY,
      lineWidth: 0.1,
    },
    didParseCell: (data: Record<string, unknown>) => {
      const row = data.row as { index: number }
      const col = data.column as { index: number }
      const cell = data.cell as { styles: Record<string, unknown> }
      // Colonne total en gras
      if (!hidePrices && col.index === 6) {
        cell.styles.fontStyle = 'bold'
        cell.styles.textColor = NAVY
      }
    },
  })

  return (result as unknown as { finalY: number }).finalY
}

// ── Bloc totaux ───────────────────────────────────────────────────
function drawTotals(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  subtotal: number,
  discountAmount: number,
  totalSell: number,
  currency: string,
  y: number,
  acomptePct?: number
) {
  const d = doc as unknown as {
    setFillColor(r:number,g:number,b:number):void
    rect(x:number,y:number,w:number,h:number,style:string):void
    setTextColor(r:number,g:number,b:number):void
    setFontSize(n:number):void
    setFont(f:string,s?:string):void
    text(t:string,x:number,y:number,opts?:Record<string,unknown>):void
    setDrawColor(r:number,g:number,b:number):void
    setLineWidth(n:number):void
  }

  const tX = PW - MR - 80
  const tW = 80
  let tY = y + 4

  const rows: [string, string, boolean][] = [
    ['Sous-total HT', fmtCurrency(subtotal, currency), false],
  ]
  if (discountAmount > 0) {
    rows.push(['Remise globale', `- ${fmtCurrency(discountAmount, currency)}`, false])
  }
  rows.push(['TOTAL HT', fmtCurrency(totalSell, currency), true])

  if (acomptePct && acomptePct > 0) {
    rows.push(['Acompte requis', `${acomptePct}% — ${fmtCurrency(totalSell * acomptePct / 100, currency)}`, false])
    rows.push(['Solde', fmtCurrency(totalSell * (1 - acomptePct / 100), currency), false])
  }

  rows.forEach(([label, value, isBold]) => {
    if (isBold) {
      d.setFillColor(...NAVY)
      d.rect(tX, tY - 4, tW, 10, 'F')
      d.setTextColor(...WHITE)
    } else {
      d.setFillColor(245, 246, 248)
      d.rect(tX, tY - 4, tW, 8, 'F')
      d.setTextColor(...TEXT)
    }

    d.setFont('helvetica', isBold ? 'bold' : 'normal')
    d.setFontSize(isBold ? 9 : 8)
    d.text(label, tX + 4, tY + (isBold ? 1 : 0))
    d.text(value, tX + tW - 4, tY + (isBold ? 1 : 0), { align: 'right' })
    tY += isBold ? 12 : 10
  })

  return tY + 4
}

// ── Pied de page ──────────────────────────────────────────────────
function drawFooter(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  note?: string | null,
  technicalNote?: string | null,
  bankInfo?: { name?: string; swift?: string; iban?: string; account?: string; address?: string } | null
) {
  const d = doc as unknown as {
    internal: { pageSize: { height: number } }
    setFillColor(r:number,g:number,b:number):void
    rect(x:number,y:number,w:number,h:number,style:string):void
    setTextColor(r:number,g:number,b:number):void
    setFontSize(n:number):void
    setFont(f:string,s?:string):void
    text(t:string,x:number,y:number,opts?:Record<string,unknown>):void
    splitTextToSize(t:string,w:number):string[]
    getNumberOfPages():number
  }

  const pageH = d.internal.pageSize.height
  let footY = pageH - 36

  // Notes techniques
  if (technicalNote) {
    d.setFillColor(254, 252, 244)
    d.rect(ML, footY - 16, CW, 14, 'F')
    d.setTextColor(...GRAY)
    d.setFont('helvetica', 'bold')
    d.setFontSize(7)
    d.text('NOTES TECHNIQUES', ML + 3, footY - 10)
    d.setFont('helvetica', 'normal')
    const lines = d.splitTextToSize(technicalNote, CW - 6)
    d.text(lines[0], ML + 3, footY - 5)
    footY -= 20
  }

  // Notes générales
  if (note) {
    d.setTextColor(...GRAY)
    d.setFont('helvetica', 'italic')
    d.setFontSize(7.5)
    const lines = d.splitTextToSize(note, CW)
    d.text(lines.slice(0, 3).join('\n'), ML, footY - 8)
    footY -= lines.length > 1 ? 18 : 12
  }

  // Informations bancaires (proforma seulement)
  if (bankInfo?.name) {
    d.setFillColor(11, 31, 58)
    d.rect(ML, footY - 20, CW, 18, 'F')
    d.setTextColor(...GOLD_L)
    d.setFont('helvetica', 'bold')
    d.setFontSize(7)
    d.text('INFORMATIONS BANCAIRES', ML + 4, footY - 14)
    d.setFont('helvetica', 'normal')
    d.setTextColor(...WHITE)
    const bankLines = [
      bankInfo.name && `Banque : ${bankInfo.name}`,
      bankInfo.account && `Compte : ${bankInfo.account}`,
      bankInfo.swift && `SWIFT : ${bankInfo.swift}`,
      bankInfo.iban && `IBAN : ${bankInfo.iban}`,
    ].filter(Boolean).join('   |   ')
    d.text(bankLines, ML + 4, footY - 7)
    footY -= 26
  }

  // Barre pied de page
  d.setFillColor(...NAVY)
  d.rect(0, pageH - 14, PW, 14, 'F')
  d.setTextColor(...WHITE)
  d.setFontSize(7)
  d.setFont('helvetica', 'normal')
  d.text('Invest Mentor Énergie — Istanbul, Turquie — contact@investmentor-energie.com', ML, pageH - 7)
  d.setTextColor(...GOLD)
  d.text(`Page ${d.getNumberOfPages()}`, PW - MR, pageH - 7, { align: 'right' })
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT PUBLIC : générer PDF quotation
// ═══════════════════════════════════════════════════════════════════
export async function generateQuotationPDF(quotation: QuotationFull): Promise<void> {
  const JsPDF = await getJsPDF()
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = drawHeader(
    doc as never, quotation.number, 'Quotation',
    quotation.issued_date, quotation.valid_until, quotation.currency
  )

  // Intro text
  if (quotation.intro_text) {
    const d = doc as unknown as {
      setTextColor(r:number,g:number,b:number):void
      setFontSize(n:number):void
      setFont(f:string,s?:string):void
      text(t:string,x:number,y:number,opts?:Record<string,unknown>):void
      splitTextToSize(t:string,w:number):string[]
    }
    d.setTextColor(...GRAY)
    d.setFontSize(8.5)
    d.setFont('helvetica', 'italic')
    const lines = d.splitTextToSize(quotation.intro_text, CW)
    d.text(lines.slice(0, 3).join('\n'), ML, y)
    y += lines.length > 1 ? lines.length * 4 + 2 : 8
  }

  // Client
  if (quotation.client) {
    y = drawClientBlock(doc as never, quotation.client, y)
  }

  // Conditions
  y = drawConditions(doc as never, {
    incoterm:       quotation.incoterm,
    delivery_delay: quotation.delivery_delay,
    warranty_terms: quotation.warranty_terms,
    payment_terms:  quotation.payment_terms,
  }, y)

  // Titre section
  const d = doc as unknown as {
    setTextColor(r:number,g:number,b:number):void
    setFontSize(n:number):void
    setFont(f:string,s?:string):void
    text(t:string,x:number,y:number,opts?:Record<string,unknown>):void
    setFillColor(r:number,g:number,b:number):void
    rect(x:number,y:number,w:number,h:number,style:string):void
  }
  d.setFillColor(...GOLD)
  d.rect(ML, y, 3, 6, 'F')
  d.setTextColor(...NAVY)
  d.setFontSize(9)
  d.setFont('helvetica', 'bold')
  d.text('DÉSIGNATION DES PRODUITS ET SERVICES', ML + 6, y + 4.5)
  y += 10

  // Table items
  if (quotation.items?.length) {
    y = await drawItemsTable(doc as never, quotation.items, quotation.currency, y, false)
    y += 4
  }

  // Totaux
  drawTotals(
    doc as never,
    quotation.subtotal,
    quotation.discount_amount ?? 0,
    quotation.total_sell,
    quotation.currency,
    y
  )

  // Footer
  drawFooter(doc as never, quotation.notes, quotation.technical_notes)

  // Save
  doc.save(`${quotation.number}_quotation.pdf`)
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT PUBLIC : générer PDF proforma
// ═══════════════════════════════════════════════════════════════════
export async function generateProformaPDF(proforma: ProformaFull): Promise<void> {
  const JsPDF = await getJsPDF()
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = drawHeader(
    doc as never, proforma.number, 'Facture Proforma',
    proforma.issued_date, proforma.valid_until, proforma.currency
  )

  // Référence quotation liée
  if (proforma.quotation) {
    const d = doc as unknown as {
      setTextColor(r:number,g:number,b:number):void
      setFontSize(n:number):void
      setFont(f:string,s?:string):void
      text(t:string,x:number,y:number,opts?:Record<string,unknown>):void
    }
    d.setTextColor(...GOLD)
    d.setFontSize(8)
    d.setFont('helvetica', 'italic')
    d.text(`Réf. devis : ${proforma.quotation.number}`, ML, y)
    y += 6
  }

  // Intro
  if (proforma.intro_text) {
    const d = doc as unknown as {
      setTextColor(r:number,g:number,b:number):void
      setFontSize(n:number):void
      setFont(f:string,s?:string):void
      text(t:string,x:number,y:number,opts?:Record<string,unknown>):void
      splitTextToSize(t:string,w:number):string[]
    }
    d.setTextColor(...GRAY)
    d.setFontSize(8.5)
    d.setFont('helvetica', 'italic')
    const lines = d.splitTextToSize(proforma.intro_text, CW)
    d.text(lines.slice(0, 3).join('\n'), ML, y)
    y += lines.length * 4 + 2
  }

  // Client
  if (proforma.client) {
    y = drawClientBlock(doc as never, proforma.client, y)
  }

  // Conditions
  y = drawConditions(doc as never, {
    incoterm:       proforma.incoterm,
    delivery_delay: proforma.delivery_delay,
    warranty_terms: proforma.warranty_terms,
    payment_terms:  proforma.payment_terms,
  }, y)

  // Table items
  const d2 = doc as unknown as {
    setTextColor(r:number,g:number,b:number):void
    setFontSize(n:number):void
    setFont(f:string,s?:string):void
    text(t:string,x:number,y:number,opts?:Record<string,unknown>):void
    setFillColor(r:number,g:number,b:number):void
    rect(x:number,y:number,w:number,h:number,style:string):void
  }
  d2.setFillColor(...GOLD)
  d2.rect(ML, y, 3, 6, 'F')
  d2.setTextColor(...NAVY)
  d2.setFontSize(9)
  d2.setFont('helvetica', 'bold')
  d2.text('DÉSIGNATION DES PRODUITS ET SERVICES', ML + 6, y + 4.5)
  y += 10

  if (proforma.items?.length) {
    y = await drawItemsTable(doc as never, proforma.items, proforma.currency, y, false)
    y += 4
  }

  // Totaux avec acompte
  drawTotals(
    doc as never,
    proforma.subtotal,
    proforma.discount_amount ?? 0,
    proforma.total_sell,
    proforma.currency,
    y,
    proforma.acompte_pct ?? undefined
  )

  // Footer avec infos bancaires
  const bankInfo = proforma.bank_name ? {
    name:    proforma.bank_name,
    swift:   proforma.bank_swift ?? undefined,
    iban:    proforma.bank_iban ?? undefined,
    account: proforma.bank_account ?? undefined,
    address: proforma.bank_address ?? undefined,
  } : null

  drawFooter(doc as never, proforma.notes, proforma.technical_notes, bankInfo)

  doc.save(`${proforma.number}_proforma.pdf`)
}
