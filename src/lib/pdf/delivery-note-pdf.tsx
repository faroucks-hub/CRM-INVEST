'use client'

import {
  Document,
  Page,
  Text,
  View,
  Image,
} from '@react-pdf/renderer'
import { getPdfLogoSource } from './assets'

const S = {
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: '#1F2937',
    padding: '30 36 36 36',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#D9A441',
  },
  brandName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1F3A',
  },
  brandSub: {
    fontSize: 7,
    color: '#9CA3AF',
    marginTop: 2,
    letterSpacing: 0.8,
  },
  brandContact: {
    fontSize: 7,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 1.6,
  },
  docInfo: {
    alignItems: 'flex-end',
  },
  docType: {
    fontSize: 7,
    color: '#D9A441',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  docNumber: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1F3A',
  },
  docDate: {
    fontSize: 7,
    color: '#9CA3AF',
    marginTop: 3,
  },
  parties: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  partyBlock: {
    flex: 1,
    backgroundColor: '#F9F7F3',
    padding: '10 12',
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#D9A441',
  },
  partyTitle: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#D9A441',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  partyName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1F3A',
    marginBottom: 2,
  },
  partyLine: {
    fontSize: 7.5,
    color: '#4B5563',
    lineHeight: 1.5,
  },
  condGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
    backgroundColor: '#F9F7F3',
    padding: '8 10',
    borderRadius: 4,
  },
  condItem: {
    width: '30%',
  },
  condLabel: {
    fontSize: 6,
    color: '#9CA3AF',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 1.5,
  },
  condValue: {
    fontSize: 7.5,
    color: '#1F2937',
    fontFamily: 'Helvetica-Bold',
  },
  sectionTitle: {
    fontSize: 7,
    color: '#D9A441',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0B1F3A',
    padding: '6 8',
    borderRadius: 3,
  },
  th: {
    fontSize: 6.3,
    fontFamily: 'Helvetica-Bold',
    color: '#D9A441',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '6 8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAF8',
  },
  td: {
    fontSize: 7.3,
    color: '#1F2937',
  },
  tdLabel: {
    fontSize: 7.7,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1F3A',
  },
  smallMuted: {
    fontSize: 6.5,
    color: '#9CA3AF',
    marginTop: 1,
  },
  noteBox: {
    backgroundColor: '#F9F7F3',
    padding: '8 10',
    borderRadius: 4,
    marginTop: 14,
    borderLeftWidth: 2,
    borderLeftColor: '#D9A441',
  },
  noteText: {
    fontSize: 7.5,
    color: '#4B5563',
    lineHeight: 1.6,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
    backgroundColor: '#F9F7F3',
    padding: '8 10',
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#D9A441',
  },
  summaryItem: {
    width: '30%',
  },
  signatureGrid: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 20,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 10,
    minHeight: 105,
  },
  signatureTitle: {
    fontSize: 7,
    color: '#D9A441',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 18,
    letterSpacing: 1,
  },
  signatureLine: {
    borderTopWidth: 0.6,
    borderTopColor: '#D9A441',
    marginTop: 14,
    marginBottom: 6,
  },
  signatureText: {
    fontSize: 7,
    color: '#6B7280',
    lineHeight: 1.6,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 6.5,
    color: '#9CA3AF',
  },
  footerGold: {
    fontSize: 6.5,
    color: '#D9A441',
    fontFamily: 'Helvetica-Bold',
  },
} as const

function fmtDate(d?: string) {
  if (!d) return '-'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(d))
}

function value(...items: any[]) {
  return items.find((item) => item !== undefined && item !== null && item !== '') ?? '—'
}

export function DeliveryNotePDF({ delivery }: { delivery: any }) {
  const lines = delivery.lines ?? []

  const totalQty = lines.reduce(
    (s: number, l: any) => s + Number(l.quantity || 0),
    0
  )

  const consignee = delivery.client ?? delivery.clients ?? {}
  const deliveryAddress = value(
    delivery.delivery_address,
    consignee.address,
    [consignee.city, consignee.country].filter(Boolean).join(', ')
  )

  return (
    <Document title={`Delivery Note ${delivery.number}`} author="IM ÉNERGIE">
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              src={getPdfLogoSource()}
              style={{
                width: 78,
                height: 78,
                objectFit: 'contain',
                marginRight: 12,
              }}
            />

            <View>
              <Text style={S.brandName}>IM ÉNERGIE</Text>
              <Text style={S.brandSub}>INDUSTRIAL · ENERGY · PARTNER</Text>
              <Text style={S.brandContact}>
                Istanbul, Türkiye{'\n'}
                contact@im-energie.com{'\n'}
                www.im-energie.com
              </Text>
            </View>
          </View>

          <View style={S.docInfo}>
            <Text style={S.docType}>Delivery Note</Text>
            <Text style={S.docNumber}>{delivery.number}</Text>
            <Text style={S.docDate}>Date : {fmtDate(delivery.issued_date)}</Text>
            <Text style={S.docDate}>Project : {delivery.project_reference ?? '—'}</Text>
            <Text style={S.docDate}>Tracking : {delivery.tracking_number ?? '—'}</Text>
          </View>
        </View>

        <View style={S.parties}>
          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>Delivered By</Text>
            <Text style={S.partyName}>Invest Mentor Énergie</Text>
            <Text style={S.partyLine}>Istanbul, Türkiye</Text>
            <Text style={S.partyLine}>contact@im-energie.com</Text>
            <Text style={S.partyLine}>www.im-energie.com</Text>
          </View>

          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>Delivered To / Consignee</Text>
            <Text style={S.partyName}>{value(consignee.company_name)}</Text>
            {consignee.contact_name && (
              <Text style={S.partyLine}>Contact : {consignee.contact_name}</Text>
            )}
            <Text style={S.partyLine}>{deliveryAddress}</Text>
            {consignee.contact_email && (
              <Text style={S.partyLine}>{consignee.contact_email}</Text>
            )}
          </View>
        </View>

        <View style={S.condGrid}>
          {[
            { label: 'Delivery Note No.', value: delivery.number ?? '—' },
            { label: 'Project Reference', value: delivery.project_reference ?? '—' },
            { label: 'Contract Ref.', value: delivery.contract_reference ?? delivery.proforma_number ?? '—' },
            { label: 'Shipment Method', value: delivery.shipment ?? '—' },
            { label: 'Carrier / Shipper', value: delivery.shipper ?? '—' },
            { label: 'Tracking Number', value: delivery.tracking_number ?? '—' },
            { label: 'Destination', value: delivery.port_destination ?? delivery.destination ?? '—' },
            { label: 'Country of Origin', value: delivery.country_origin ?? 'Türkiye' },
            { label: 'Delivery Date', value: fmtDate(delivery.delivery_date ?? delivery.issued_date) },
          ].map(({ label, value }) => (
            <View key={label} style={S.condItem}>
              <Text style={S.condLabel}>{label}</Text>
              <Text style={S.condValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={S.tableHeader} fixed>
          <Text style={{ ...S.th, width: '4%' }}>#</Text>
          <Text style={{ ...S.th, flex: 1 }}>Description</Text>
          <Text style={{ ...S.th, width: '12%' }}>Reference</Text>
          <Text style={{ ...S.th, width: '9%', textAlign: 'center' }}>Qty</Text>
          <Text style={{ ...S.th, width: '9%', textAlign: 'center' }}>Unit</Text>
          <Text style={{ ...S.th, width: '14%', textAlign: 'center' }}>Condition</Text>
          <Text style={{ ...S.th, width: '18%', textAlign: 'center' }}>Remarks</Text>
        </View>

        {lines.map((line: any, i: number) => (
          <View
            key={line.id ?? i}
            style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}
          >
            <Text style={{ ...S.td, width: '4%', color: '#9CA3AF' }}>
              {i + 1}
            </Text>

            <View style={{ flex: 1 }}>
              <Text style={S.tdLabel}>
                {line.designation || line.description || '-'}
              </Text>
              {line.description && line.designation && (
                <Text style={S.smallMuted}>{line.description}</Text>
              )}
            </View>

            <Text style={{ ...S.td, width: '12%', color: '#9CA3AF' }}>
              {line.reference ?? '—'}
            </Text>

            <Text style={{ ...S.td, width: '9%', textAlign: 'center' }}>
              {line.quantity ?? 0}
            </Text>

            <Text style={{ ...S.td, width: '9%', textAlign: 'center' }}>
              {line.unit ?? 'PCS'}
            </Text>

            <Text style={{ ...S.td, width: '14%', textAlign: 'center' }}>
              {line.condition ?? 'GOOD'}
            </Text>

            <Text style={{ ...S.td, width: '18%', textAlign: 'center' }}>
              {line.remarks ?? 'Delivered as ordered'}
            </Text>
          </View>
        ))}

        <View style={S.summaryGrid}>
          <View style={S.summaryItem}>
            <Text style={S.condLabel}>Total Items Delivered</Text>
            <Text style={S.condValue}>{lines.length}</Text>
          </View>
          <View style={S.summaryItem}>
            <Text style={S.condLabel}>Total Quantity Delivered</Text>
            <Text style={S.condValue}>{totalQty}</Text>
          </View>
          <View style={S.summaryItem}>
            <Text style={S.condLabel}>Shipment Method</Text>
            <Text style={S.condValue}>{delivery.shipment ?? '—'}</Text>
          </View>
          <View style={S.summaryItem}>
            <Text style={S.condLabel}>Tracking Number</Text>
            <Text style={S.condValue}>{delivery.tracking_number ?? '—'}</Text>
          </View>
          <View style={S.summaryItem}>
            <Text style={S.condLabel}>Destination</Text>
            <Text style={S.condValue}>{delivery.port_destination ?? delivery.destination ?? '—'}</Text>
          </View>
          <View style={S.summaryItem}>
            <Text style={S.condLabel}>Delivery Status</Text>
            <Text style={S.condValue}>{delivery.delivery_status ?? 'Delivered / To be confirmed'}</Text>
          </View>
        </View>

        <View style={S.noteBox}>
          <Text style={S.sectionTitle}>Receipt Confirmation</Text>
          <Text style={S.noteText}>
            The undersigned confirms that the goods listed in this Delivery Note
            have been received in good condition and in the quantities stated
            above, unless otherwise noted in the remarks section.
          </Text>
        </View>

        <View style={S.noteBox}>
          <Text style={S.sectionTitle}>Remarks</Text>
          <Text style={S.noteText}>• Packaging must be checked upon delivery.</Text>
          <Text style={S.noteText}>• Visible damages must be reported immediately.</Text>
          <Text style={S.noteText}>• Any discrepancy must be notified within 48 hours.</Text>
          {delivery.notes && <Text style={S.noteText}>• {delivery.notes}</Text>}
        </View>

        <View style={S.signatureGrid}>
          <View style={S.signatureBox}>
            <Text style={S.signatureTitle}>Delivered By</Text>
            <Text style={S.signatureText}>Name:</Text>
            <Text style={S.signatureText}>Position:</Text>
            <Text style={S.signatureText}>Date:</Text>
            <View style={S.signatureLine} />
            <Text style={S.signatureText}>Signature</Text>
          </View>

          <View style={S.signatureBox}>
            <Text style={S.signatureTitle}>Received By</Text>
            <Text style={S.signatureText}>Name:</Text>
            <Text style={S.signatureText}>Position:</Text>
            <Text style={S.signatureText}>Date:</Text>
            <View style={S.signatureLine} />
            <Text style={S.signatureText}>Signature / Company Stamp</Text>
          </View>
        </View>

        <View style={S.footer} fixed>
          <Text style={S.footerText}>IM ÉNERGIE · Istanbul, Türkiye</Text>
          <Text style={S.footerText}>{delivery.number}</Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
          <Text style={S.footerGold}>Engineering. Innovation. Performance.</Text>
        </View>
      </Page>
    </Document>
  )
}
