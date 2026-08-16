import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  renderToBuffer,
} from '@react-pdf/renderer'
import { getPdfLogoSource } from './assets'

const S = {
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8.2,
    color: '#1F2937',
    padding: '30 36 36 36',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#D9A441',
  },
  brandName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0B1F3A' },
  brandSub: { fontSize: 7, color: '#9CA3AF', marginTop: 2, letterSpacing: 0.8 },
  brandContact: { fontSize: 7, color: '#6B7280', marginTop: 6, lineHeight: 1.55 },
  docInfo: { alignItems: 'flex-end' },
  docType: { fontSize: 7, color: '#D9A441', fontFamily: 'Helvetica-Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  docNumber: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0B1F3A' },
  docDate: { fontSize: 7, color: '#9CA3AF', marginTop: 3 },
  parties: { flexDirection: 'row', gap: 20, marginBottom: 14 },
  partyBlock: { flex: 1, backgroundColor: '#F9F7F3', padding: '10 12', borderRadius: 4, borderLeftWidth: 2, borderLeftColor: '#D9A441' },
  partyTitle: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#D9A441', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 },
  partyName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0B1F3A', marginBottom: 2 },
  partyLine: { fontSize: 7.3, color: '#4B5563', lineHeight: 1.45 },
  condGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14, backgroundColor: '#F9F7F3', padding: '8 10', borderRadius: 4 },
  condItem: { width: '30%' },
  condLabel: { fontSize: 6, color: '#9CA3AF', fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 1.5 },
  condValue: { fontSize: 7.3, color: '#1F2937', fontFamily: 'Helvetica-Bold' },
  sectionTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0B1F3A', padding: '6 7', borderRadius: 3 },
  th: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#D9A441', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: '5 7', borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
  tableRowAlt: { backgroundColor: '#FAFAF8' },
  td: { fontSize: 7, color: '#1F2937' },
  tdLabel: { fontSize: 7.4, fontFamily: 'Helvetica-Bold', color: '#0B1F3A' },
  tdDesc: { fontSize: 6.2, color: '#9CA3AF', marginTop: 1 },
  totalsWrapper: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  totalsBlock: { width: 230, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 7.3, color: '#6B7280' },
  totalValue: { fontSize: 7.3, color: '#1F2937' },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0B1F3A', padding: '7 10', borderRadius: 3, marginTop: 5 },
  grandLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#D9A441' },
  grandValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  infoGrid: { flexDirection: 'row', gap: 12, marginTop: 14 },
  infoBox: { flex: 1, backgroundColor: '#F9F7F3', padding: '8 10', borderRadius: 4, borderLeftWidth: 2, borderLeftColor: '#D9A441' },
  noteBox: { backgroundColor: '#F9F7F3', padding: '8 10', borderRadius: 4, marginTop: 12 },
  noteText: { fontSize: 7.2, color: '#4B5563', lineHeight: 1.55 },
  signatureBox: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signatureLine: { width: 170, borderTopWidth: 0.7, borderTopColor: '#D9A441', paddingTop: 5 },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#E5E7EB', paddingTop: 6 },
  footerText: { fontSize: 6.5, color: '#9CA3AF' },
  footerGold: { fontSize: 6.5, color: '#D9A441', fontFamily: 'Helvetica-Bold' },
} as const

function fmtDate(d?: string) {
  if (!d) return '-'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(d))
}

function fmtNum(n: number, currency = 'USD') {
  const symbols: Record<string, string> = { USD: '$', EUR: '€', TRY: '₺', XOF: 'FCFA' }
  const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .format(Number(n || 0))
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')
  return `${formatted} ${symbols[currency] ?? currency}`
}

function valueOrDash(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export function CommercialInvoicePDF({ invoice }: { invoice: any }) {
  const lines = invoice.lines ?? []
  const cur = invoice.currency ?? 'USD'

  const subtotal = lines.reduce((s: number, l: any) => s + Number(l.line_total_sell || 0), 0)
  const discountGlobal = Number(invoice.discount_global || 0)
  const discountAmount = subtotal * (discountGlobal / 100)
  const freight = Number(invoice.freight_amount || invoice.freight || 0)
  const insurance = Number(invoice.insurance_amount || invoice.insurance || 0)
  const otherCharges = Number(invoice.other_charges || 0)
  const total = subtotal - discountAmount + freight + insurance + otherCharges

  return (
    <Document title={`Commercial Invoice ${invoice.number}`} author="IM ÉNERGIE">
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image src={getPdfLogoSource()} style={{ width: 78, height: 78, objectFit: 'contain', marginRight: 12 }} />
            <View>
              <Text style={S.brandName}>IM ÉNERGIE</Text>
              <Text style={S.brandSub}>INDUSTRIAL · ENERGY · PARTNER</Text>
              <Text style={S.brandContact}>Istanbul, Türkiye{`\n`}contact@im-energie.com{`\n`}www.im-energie.com</Text>
            </View>
          </View>

          <View style={S.docInfo}>
            <Text style={S.docType}>Commercial Invoice</Text>
            <Text style={S.docNumber}>{invoice.invoice_number ?? `CI-${invoice.number}`}</Text>
            <Text style={S.docDate}>Invoice Date : {fmtDate(invoice.issued_date ?? invoice.created_at)}</Text>
            <Text style={S.docDate}>Project : {valueOrDash(invoice.project_reference)}</Text>
            <Text style={S.docDate}>Proforma : {valueOrDash(invoice.proforma_number ?? invoice.number)}</Text>
            <Text style={S.docDate}>Contract Ref : {valueOrDash(invoice.contract_reference)}</Text>
          </View>
        </View>

        <View style={S.parties}>
          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>Seller / Exporter</Text>
            <Text style={S.partyName}>Invest Mentor Énergie</Text>
            <Text style={S.partyLine}>Istanbul, Türkiye</Text>
            <Text style={S.partyLine}>contact@im-energie.com</Text>
            <Text style={S.partyLine}>www.im-energie.com</Text>
            <Text style={S.partyLine}>Tax / Registration No.: —</Text>
          </View>

          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>Buyer / Consignee</Text>
            <Text style={S.partyName}>{invoice.client?.company_name ?? invoice.clients?.company_name ?? ''}</Text>
            {(invoice.client?.contact_name || invoice.clients?.contact_name) && (
              <Text style={S.partyLine}>{invoice.client?.contact_name ?? invoice.clients?.contact_name}</Text>
            )}
            {(invoice.client?.address || invoice.clients?.address) && (
              <Text style={S.partyLine}>{invoice.client?.address ?? invoice.clients?.address}</Text>
            )}
            {(invoice.client?.city || invoice.clients?.city) && (
              <Text style={S.partyLine}>{invoice.client?.city ?? invoice.clients?.city}</Text>
            )}
            <Text style={S.partyLine}>{invoice.client?.country ?? invoice.clients?.country ?? invoice.country ?? ''}</Text>
            {(invoice.client?.contact_email || invoice.clients?.contact_email) && (
              <Text style={S.partyLine}>{invoice.client?.contact_email ?? invoice.clients?.contact_email}</Text>
            )}
          </View>
        </View>

        <View style={S.condGrid}>
          {[
            { label: 'Currency', value: cur },
            { label: 'Incoterm', value: invoice.incoterm ?? 'DAP' },
            { label: 'Payment Terms', value: invoice.payment_terms ?? '—' },
            { label: 'Country of Origin', value: invoice.country_origin ?? 'Türkiye' },
            { label: 'Shipment Method', value: invoice.shipment ?? '—' },
            { label: 'Final Destination', value: invoice.port_destination ?? invoice.final_destination ?? '—' },
          ].map(({ label, value }) => (
            <View key={label} style={S.condItem}>
              <Text style={S.condLabel}>{label}</Text>
              <Text style={S.condValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={S.condGrid}>
          {[
            { label: 'Port of Loading', value: invoice.port_loading ?? 'Istanbul, Türkiye' },
            { label: 'Port of Discharge', value: invoice.port_discharge ?? invoice.port_destination ?? '—' },
            { label: 'Transport Ref.', value: invoice.tracking_number ?? invoice.transport_reference ?? '—' },
            { label: 'Packing List Ref.', value: invoice.packing_list_number ?? `PL-${invoice.number}` },
            { label: 'Delivery Note Ref.', value: invoice.delivery_note_number ?? `DN-${invoice.number}` },
            { label: 'Reference', value: invoice.reference ?? invoice.number },
          ].map(({ label, value }) => (
            <View key={label} style={S.condItem}>
              <Text style={S.condLabel}>{label}</Text>
              <Text style={S.condValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={S.tableHeader} fixed>
          <Text style={{ ...S.th, width: '4%' }}>#</Text>
          <Text style={{ ...S.th, flex: 1 }}>Description of Goods</Text>
          <Text style={{ ...S.th, width: '12%', textAlign: 'center' }}>HS Code</Text>
          <Text style={{ ...S.th, width: '9%', textAlign: 'right' }}>Qty</Text>
          <Text style={{ ...S.th, width: '15%', textAlign: 'right' }}>Unit Price</Text>
          <Text style={{ ...S.th, width: '16%', textAlign: 'right' }}>Total</Text>
        </View>

        {lines.map((line: any, i: number) => (
          <View key={line.id ?? i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
            <Text style={{ ...S.td, width: '4%', color: '#9CA3AF' }}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.tdLabel}>{line.designation || line.description || '-'}</Text>
              {line.description && line.designation && <Text style={S.tdDesc}>{line.description}</Text>}
              {line.reference && <Text style={S.tdDesc}>Ref: {line.reference}</Text>}
            </View>
            <Text style={{ ...S.td, width: '12%', textAlign: 'center', color: '#6B7280' }}>{line.hs_code ?? invoice.default_hs_code ?? '8504'}</Text>
            <Text style={{ ...S.td, width: '9%', textAlign: 'right' }}>{line.quantity} {line.unit}</Text>
            <Text style={{ ...S.td, width: '15%', textAlign: 'right' }}>{fmtNum(line.unit_price_sell, cur)}</Text>
            <Text style={{ ...S.td, width: '16%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>{fmtNum(line.line_total_sell, cur)}</Text>
          </View>
        ))}

        <View style={S.totalsWrapper}>
          <View style={S.totalsBlock}>
            <View style={S.totalRow}><Text style={S.totalLabel}>Subtotal</Text><Text style={S.totalValue}>{fmtNum(subtotal, cur)}</Text></View>
            {discountGlobal > 0 && <View style={S.totalRow}><Text style={S.totalLabel}>Discount ({discountGlobal}%)</Text><Text style={{ ...S.totalValue, color: '#DC2626' }}>- {fmtNum(discountAmount, cur)}</Text></View>}
            {freight > 0 && <View style={S.totalRow}><Text style={S.totalLabel}>Freight</Text><Text style={S.totalValue}>{fmtNum(freight, cur)}</Text></View>}
            {insurance > 0 && <View style={S.totalRow}><Text style={S.totalLabel}>Insurance</Text><Text style={S.totalValue}>{fmtNum(insurance, cur)}</Text></View>}
            {otherCharges > 0 && <View style={S.totalRow}><Text style={S.totalLabel}>Other Charges</Text><Text style={S.totalValue}>{fmtNum(otherCharges, cur)}</Text></View>}
            <View style={S.grandRow}><Text style={S.grandLabel}>TOTAL INVOICE VALUE</Text><Text style={S.grandValue}>{fmtNum(total, cur)}</Text></View>
          </View>
        </View>

        {(invoice.bank_name || invoice.bank_iban || invoice.bank_swift) && (
          <View style={S.infoGrid}>
            <View style={S.infoBox}>
              <Text style={S.sectionTitle}>Bank Details</Text>
              <Text style={S.noteText}>Beneficiary: {invoice.bank_beneficiary ?? 'IM ÉNERGIE'}</Text>
              <Text style={S.noteText}>Bank Name: {invoice.bank_name ?? '—'}</Text>
              <Text style={S.noteText}>IBAN: {invoice.bank_iban ?? '—'}</Text>
              <Text style={S.noteText}>SWIFT: {invoice.bank_swift ?? '—'}</Text>
              <Text style={S.noteText}>Account: {invoice.bank_account ?? '—'}</Text>
            </View>
            <View style={S.infoBox}>
              <Text style={S.sectionTitle}>Payment Reference</Text>
              <Text style={S.noteText}>Invoice No.: {invoice.invoice_number ?? `CI-${invoice.number}`}</Text>
              <Text style={S.noteText}>Project Ref.: {valueOrDash(invoice.project_reference)}</Text>
              <Text style={S.noteText}>Currency: {cur}</Text>
              <Text style={S.noteText}>Payment Terms: {invoice.payment_terms ?? '—'}</Text>
            </View>
          </View>
        )}

        <View style={S.noteBox}>
          <Text style={S.sectionTitle}>Export Declaration</Text>
          <Text style={S.noteText}>
            We hereby certify that the goods described in this commercial invoice are supplied for industrial power conversion and energy systems. The information contained herein is true and correct to the best of our knowledge. Country of origin: {invoice.country_origin ?? 'Türkiye'}.
          </Text>
        </View>

        <View style={S.noteBox}>
          <Text style={S.sectionTitle}>Remarks</Text>
          <Text style={S.noteText}>
            This commercial invoice is issued for export, customs clearance, shipping documentation and client records. Goods must be inspected upon receipt and any discrepancy must be reported immediately.
          </Text>
        </View>

        <View style={S.signatureBox}>
          <View>
            <Text style={S.sectionTitle}>Prepared By</Text>
            <Text style={S.noteText}>{invoice.assigned_user?.full_name ?? invoice.prepared_by ?? 'Sales Engineer'}</Text>
            <Text style={S.noteText}>IM ÉNERGIE</Text>
          </View>
          <View style={S.signatureLine}>
            <Text style={{ ...S.noteText, fontFamily: 'Helvetica-Bold', color: '#0B1F3A' }}>Authorized Signature</Text>
            <Text style={S.noteText}>Invest Mentor Énergie</Text>
            <Text style={S.noteText}>Export Department</Text>
          </View>
        </View>

        <View style={S.footer} fixed>
          <Text style={S.footerText}>IM ÉNERGIE · Istanbul, Türkiye</Text>
          <Text style={S.footerText}>{invoice.invoice_number ?? `CI-${invoice.number}`}</Text>
          <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
          <Text style={S.footerGold}>Engineering. Innovation. Performance.</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function commercialInvoiceBlob(invoice: any) {
  const buffer = await renderToBuffer(<CommercialInvoicePDF invoice={invoice} />)
  const bytes = new Uint8Array(buffer)
  return new Blob([bytes], { type: 'application/pdf' })
}
