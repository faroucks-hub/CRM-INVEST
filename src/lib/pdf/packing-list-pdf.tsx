'use client'

import {
  Document,
  Page,
  Text,
  View,
  Image,
  pdf as renderPdf,
} from '@react-pdf/renderer'
import { getPdfLogoSource } from './assets'

const S = {
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
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
    marginBottom: 14,
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
    marginBottom: 14,
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
    fontSize: 7.3,
    color: '#1F2937',
    fontFamily: 'Helvetica-Bold',
  },
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1F3A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0B1F3A',
    padding: '6 7',
    borderRadius: 3,
  },
  th: {
    fontSize: 5.8,
    fontFamily: 'Helvetica-Bold',
    color: '#D9A441',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '6 7',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    minHeight: 28,
  },
  tableRowAlt: {
    backgroundColor: '#FAFAF8',
  },
  td: {
    fontSize: 6.8,
    color: '#1F2937',
  },
  tdMuted: {
    fontSize: 6.2,
    color: '#9CA3AF',
    marginTop: 1.5,
  },
  tdLabel: {
    fontSize: 7.2,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1F3A',
  },
  summaryBox: {
    marginTop: 16,
    backgroundColor: '#F9F7F3',
    padding: '10 12',
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#D9A441',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryItem: {
    width: '31%',
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 7,
    color: '#D9A441',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 1,
  },
  summaryLabel: {
    fontSize: 6,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 1,
  },
  summaryValue: {
    fontSize: 7.3,
    color: '#1F2937',
    fontFamily: 'Helvetica-Bold',
  },
  remarksBox: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  remarkText: {
    fontSize: 6.8,
    color: '#6B7280',
    lineHeight: 1.5,
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

function fmtNumber(value: unknown, decimals = 2) {
  const n = Number(value || 0)
  if (!Number.isFinite(n) || n === 0) return '-'
  return n.toFixed(decimals)
}

function getDimensions(line: any) {
  if (line.dimensions) return line.dimensions

  const length = line.length_mm ?? line.length_cm
  const width = line.width_mm ?? line.width_cm
  const height = line.height_mm ?? line.height_cm

  if (!length || !width || !height) return '-'

  const unit = line.length_mm || line.width_mm || line.height_mm ? 'mm' : 'cm'
  return `${length} × ${width} × ${height} ${unit}`
}

function getCbm(line: any) {
  if (line.cbm || line.volume_cbm) return Number(line.cbm ?? line.volume_cbm)

  const lengthCm = Number(line.length_cm || 0)
  const widthCm = Number(line.width_cm || 0)
  const heightCm = Number(line.height_cm || 0)

  if (!lengthCm || !widthCm || !heightCm) return 0
  return (lengthCm * widthCm * heightCm) / 1_000_000
}

export function PackingListPDF({ packing }: { packing: any }) {
  const lines = packing.lines ?? []

  const totalQty = lines.reduce(
    (s: number, l: any) => s + Number(l.quantity || 0),
    0
  )

  const totalNetWeight = lines.reduce(
    (s: number, l: any) => s + Number(l.net_weight || l.net_weight_kg || 0),
    0
  )

  const totalGrossWeight = lines.reduce(
    (s: number, l: any) => s + Number(l.gross_weight || l.gross_weight_kg || 0),
    0
  )

  const totalVolume = lines.reduce(
    (s: number, l: any) => s + getCbm(l),
    0
  )

  const totalPackages = packing.total_packages ?? lines.length

  return (
    <Document title={`Packing List ${packing.number}`} author="IM ÉNERGIE">
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
            <Text style={S.docType}>Packing List</Text>
            <Text style={S.docNumber}>{packing.number}</Text>
            <Text style={S.docDate}>Date : {fmtDate(packing.issued_date)}</Text>
            <Text style={S.docDate}>Project : {packing.project_reference ?? '—'}</Text>
          </View>
        </View>

        <View style={S.parties}>
          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>Exporter / Shipper</Text>
            <Text style={S.partyName}>Invest Mentor Énergie</Text>
            <Text style={S.partyLine}>Istanbul, Türkiye</Text>
            <Text style={S.partyLine}>contact@im-energie.com</Text>
            <Text style={S.partyLine}>www.im-energie.com</Text>
          </View>

          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>Consignee</Text>
            <Text style={S.partyName}>
              {packing.client?.company_name ??
                packing.clients?.company_name ??
                ''}
            </Text>
            {(packing.client?.address || packing.clients?.address) && (
              <Text style={S.partyLine}>
                {packing.client?.address ?? packing.clients?.address}
              </Text>
            )}
            {(packing.client?.city || packing.clients?.city) && (
              <Text style={S.partyLine}>
                {packing.client?.city ?? packing.clients?.city}
              </Text>
            )}
            <Text style={S.partyLine}>
              {packing.client?.country ??
                packing.clients?.country ??
                packing.country ??
                ''}
            </Text>
          </View>
        </View>

        <View style={S.condGrid}>
          {[
            { label: 'Shipment Method', value: packing.shipment ?? '—' },
            { label: 'Incoterm', value: packing.incoterm ?? 'DAP' },
            { label: 'Port of Loading', value: packing.port_loading ?? 'Istanbul, Türkiye' },
            { label: 'Port / Destination', value: packing.port_destination ?? '—' },
            { label: 'Country of Origin', value: packing.country_origin ?? 'Türkiye' },
            { label: 'Project Reference', value: packing.project_reference ?? '—' },
          ].map(({ label, value }) => (
            <View key={label} style={S.condItem}>
              <Text style={S.condLabel}>{label}</Text>
              <Text style={S.condValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={S.sectionTitle}>Package Details</Text>

        <View style={S.tableHeader} fixed>
          <Text style={{ ...S.th, width: '8%' }}>Case</Text>
          <Text style={{ ...S.th, flex: 1 }}>Description</Text>
          <Text style={{ ...S.th, width: '9%', textAlign: 'center' }}>Qty</Text>
          <Text style={{ ...S.th, width: '12%', textAlign: 'center' }}>Package</Text>
          <Text style={{ ...S.th, width: '11%', textAlign: 'right' }}>N.W.</Text>
          <Text style={{ ...S.th, width: '11%', textAlign: 'right' }}>G.W.</Text>
          <Text style={{ ...S.th, width: '15%', textAlign: 'right' }}>Dimensions</Text>
          <Text style={{ ...S.th, width: '9%', textAlign: 'right' }}>CBM</Text>
        </View>

        {lines.map((line: any, i: number) => (
          <View
            key={line.id ?? i}
            style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={{ ...S.td, width: '8%', color: '#9CA3AF' }}>
              {line.case_no ?? line.package_no ?? `C-${i + 1}`}
            </Text>

            <View style={{ flex: 1 }}>
              <Text style={S.tdLabel}>
                {line.designation || line.description || '-'}
              </Text>
              {line.reference && (
                <Text style={S.tdMuted}>Ref: {line.reference}</Text>
              )}
              {(line.hs_code || line.remarks) && (
                <Text style={S.tdMuted}>
                  {line.hs_code ? `HS: ${line.hs_code}` : ''}
                  {line.hs_code && line.remarks ? ' · ' : ''}
                  {line.remarks ?? ''}
                </Text>
              )}
            </View>

            <Text style={{ ...S.td, width: '9%', textAlign: 'center' }}>
              {line.quantity} {line.unit ?? ''}
            </Text>

            <Text style={{ ...S.td, width: '12%', textAlign: 'center' }}>
              {line.package_type ?? 'Carton'}
            </Text>

            <Text style={{ ...S.td, width: '11%', textAlign: 'right' }}>
              {fmtNumber(line.net_weight ?? line.net_weight_kg)} kg
            </Text>

            <Text style={{ ...S.td, width: '11%', textAlign: 'right' }}>
              {fmtNumber(line.gross_weight ?? line.gross_weight_kg)} kg
            </Text>

            <Text style={{ ...S.td, width: '15%', textAlign: 'right' }}>
              {getDimensions(line)}
            </Text>

            <Text style={{ ...S.td, width: '9%', textAlign: 'right' }}>
              {fmtNumber(getCbm(line), 3)}
            </Text>
          </View>
        ))}

        <View style={S.summaryBox}>
          <Text style={S.summaryTitle}>Packing Summary</Text>

          <View style={S.summaryGrid}>
            <View style={S.summaryItem}>
              <Text style={S.summaryLabel}>Total Items</Text>
              <Text style={S.summaryValue}>{totalQty}</Text>
            </View>

            <View style={S.summaryItem}>
              <Text style={S.summaryLabel}>Total Packages</Text>
              <Text style={S.summaryValue}>{totalPackages}</Text>
            </View>

            <View style={S.summaryItem}>
              <Text style={S.summaryLabel}>Net Weight</Text>
              <Text style={S.summaryValue}>{fmtNumber(totalNetWeight)} kg</Text>
            </View>

            <View style={S.summaryItem}>
              <Text style={S.summaryLabel}>Gross Weight</Text>
              <Text style={S.summaryValue}>{fmtNumber(totalGrossWeight)} kg</Text>
            </View>

            <View style={S.summaryItem}>
              <Text style={S.summaryLabel}>Total Volume</Text>
              <Text style={S.summaryValue}>{fmtNumber(totalVolume, 3)} CBM</Text>
            </View>

            <View style={S.summaryItem}>
              <Text style={S.summaryLabel}>Origin</Text>
              <Text style={S.summaryValue}>{packing.country_origin ?? 'Türkiye'}</Text>
            </View>
          </View>
        </View>

        <View style={S.remarksBox}>
          <Text style={S.sectionTitle}>Remarks</Text>
          <Text style={S.remarkText}>
            Goods are packed for international transportation. All dimensions,
            weights and volumes are indicative unless otherwise certified.
            Consignee is requested to verify package condition upon receipt.
          </Text>
        </View>

        <View style={S.footer} fixed>
          <Text style={S.footerText}>IM ÉNERGIE · Istanbul, Türkiye</Text>
          <Text style={S.footerText}>{packing.number}</Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
          <Text style={S.footerGold}>
            Engineering. Innovation. Performance.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function packingListBlob(packing: any) {
  return renderPdf(<PackingListPDF packing={packing} />).toBlob()
}
