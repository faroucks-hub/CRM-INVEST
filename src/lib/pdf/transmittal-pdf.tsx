'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf as renderPdf,
} from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { getPdfLogoSource } from './assets'

interface TransmittalDocument {
  file_name: string
  revision?: number | string | null
  document_type?: string | null
}

interface TransmittalData {
  transmittal_number: string
  subject?: string | null
  client_name?: string | null
  comments?: string | null
  created_at?: string | null
  project_number?: string | null
  project_name?: string | null
  attention?: string | null
  client_email?: string | null
  prepared_by?: string | null
  documents: TransmittalDocument[]
}

const S = StyleSheet.create({
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
    alignItems: 'flex-start',
    marginBottom: 22,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#D9A441',
  },

  brand: {
    flexDirection: 'column',
  },

  brandName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1F3A',
    letterSpacing: 0.5,
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

  docStatus: {
    backgroundColor: '#F0F9F4',
    color: '#065F46',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    padding: '3 8',
    borderRadius: 3,
    marginTop: 6,
    letterSpacing: 0.5,
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
    fontFamily: 'Helvetica-Bold',
    color: '#0B1F3A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  noteBox: {
    backgroundColor: '#F9F7F3',
    padding: '8 10',
    borderRadius: 4,
    marginBottom: 12,
  },

  noteText: {
    fontSize: 7.5,
    color: '#4B5563',
    lineHeight: 1.6,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0B1F3A',
    padding: '6 8',
    borderRadius: 3,
  },

  th: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#D9A441',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  tableRow: {
    flexDirection: 'row',
    padding: '5 8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },

  tableRowAlt: {
    backgroundColor: '#FAFAF8',
  },

  td: {
    fontSize: 7.5,
    color: '#1F2937',
  },

  tdLabel: {
    fontSize: 7.8,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1F3A',
  },

  tdDesc: {
    fontSize: 6.5,
    color: '#9CA3AF',
    marginTop: 1,
  },

  signatureBox: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 10,
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
})

function fmtDate(d?: string | null) {
  if (!d) return '-'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(d))
}

function formatDocType(type?: string | null) {
  if (!type) return '-'
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatRevision(revision?: number | string | null) {
  if (revision === null || revision === undefined || revision === '') return '00'
  const value = String(revision)
  return /^\d+$/.test(value) ? value.padStart(2, '0') : value
}

function extractProjectNumber(data: TransmittalData) {
  if (data.project_number) return data.project_number
  const found = data.comments?.match(/project\s+([A-Z0-9-]+)/i)?.[1]
  return found || '-'
}

export function TransmittalPDF({
  data,
  qrCode,
}: {
  data: TransmittalData
  qrCode?: string
}) {
  const docs = data.documents ?? []
  const createdDate = fmtDate(data.created_at)
  const projectNumber = extractProjectNumber(data)

  return (
    <Document title={`Transmittal ${data.transmittal_number}`} author="IM ÉNERGIE">
      <Page size="A4" style={S.page}>
        <View style={S.header} fixed>
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

            <View style={S.brand}>
              <Text style={S.brandName}>IM ÉNERGIE</Text>
              <Text style={S.brandSub}>INDUSTRIAL · ENERGY · PARTNER</Text>
              <Text style={S.brandContact}>
                Istanbul, Turquie{'\n'}
                contact@im-energie.com{'\n'}
                www.im-energie.com
              </Text>
            </View>
          </View>

          <View style={S.docInfo}>
            <Text style={S.docType}>Document Transmittal</Text>
            <Text style={S.docNumber}>{data.transmittal_number}</Text>
            <Text style={S.docDate}>Date : {createdDate}</Text>
            <Text style={S.docDate}>Documents : {docs.length}</Text>
            <Text style={S.docStatus}>TRANSMITTED</Text>
          </View>
        </View>

        <View style={S.parties}>
          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>From</Text>
            <Text style={S.partyName}>IM ÉNERGIE</Text>
            <Text style={S.partyLine}>Istanbul, Turquie</Text>
            <Text style={S.partyLine}>contact@im-energie.com</Text>
          </View>

          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>To</Text>
            <Text style={S.partyName}>{data.client_name || '-'}</Text>
            {data.attention ? <Text style={S.partyLine}>Attn: {data.attention}</Text> : null}
            {data.client_email ? <Text style={S.partyLine}>{data.client_email}</Text> : null}
          </View>
        </View>

        <View style={S.condGrid}>
          {[
            { label: 'Date', value: createdDate },
            { label: 'Project No.', value: projectNumber },
            { label: 'Project / Subject', value: data.subject || data.project_name || '-' },
            { label: 'Reference', value: data.transmittal_number },
            { label: 'Revision', value: '00' },
            { label: 'Total Documents', value: String(docs.length) },
          ].map(({ label, value }) => (
            <View key={label} style={S.condItem}>
              <Text style={S.condLabel}>{label}</Text>
              <Text style={S.condValue}>{value}</Text>
            </View>
          ))}
        </View>

        {data.comments ? (
          <View style={S.noteBox}>
            <Text style={S.sectionTitle}>Comments</Text>
            <Text style={S.noteText}>{data.comments}</Text>
          </View>
        ) : null}

        <Text style={S.sectionTitle}>Transmitted Documents</Text>

        <View style={S.tableHeader} fixed>
          <Text style={{ ...S.th, width: '7%' }}>#</Text>
          <Text style={{ ...S.th, width: '16%' }}>Doc No.</Text>
          <Text style={{ ...S.th, flex: 1 }}>Description</Text>
          <Text style={{ ...S.th, width: '10%', textAlign: 'center' }}>Rev.</Text>
          <Text style={{ ...S.th, width: '18%', textAlign: 'center' }}>Type</Text>
          <Text style={{ ...S.th, width: '10%', textAlign: 'center' }}>Format</Text>
        </View>

        {docs.map((item, index) => (
          <View
            key={`${item.file_name}-${index}`}
            style={[S.tableRow, index % 2 === 1 ? S.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={{ ...S.td, width: '7%', color: '#9CA3AF' }}>{index + 1}</Text>
            <Text style={{ ...S.td, width: '16%', color: '#9CA3AF' }}>
              DOC-{String(index + 1).padStart(3, '0')}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={S.tdLabel}>{item.file_name || '-'}</Text>
              <Text style={S.tdDesc}>Included in this transmittal package</Text>
            </View>
            <Text style={{ ...S.td, width: '10%', textAlign: 'center' }}>
              {formatRevision(item.revision)}
            </Text>
            <Text style={{ ...S.td, width: '18%', textAlign: 'center' }}>
              {formatDocType(item.document_type)}
            </Text>
            <Text style={{ ...S.td, width: '10%', textAlign: 'center' }}>PDF</Text>
          </View>
        ))}

        <View style={S.signatureBox} wrap={false}>
          <View style={{ width: '55%' }}>
            <Text
              style={{
                fontSize: 7,
                color: '#D9A441',
                fontFamily: 'Helvetica-Bold',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 14,
              }}
            >
              Prepared by
            </Text>

            <View
              style={{
                borderTopWidth: 0.6,
                borderTopColor: '#D9A441',
                width: 160,
                marginBottom: 5,
              }}
            />

            <Text
              style={{
                fontSize: 8,
                color: '#0B1F3A',
                fontFamily: 'Helvetica-Bold',
              }}
            >
              {data.prepared_by || 'Project Engineer'}
            </Text>

            <Text style={{ fontSize: 6.5, color: '#9CA3AF', marginTop: 2 }}>
              IM ÉNERGIE
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {qrCode ? <Image src={qrCode} style={{ width: 48, height: 48 }} /> : null}

            <View style={{ marginLeft: 8 }}>
              <Text style={S.sectionTitle}>QR Verification</Text>
              <Text
                style={{
                  fontSize: 6.5,
                  color: '#6B7280',
                  width: 120,
                  lineHeight: 1.4,
                }}
              >
                Verify the authenticity of this transmittal.
              </Text>
              <Text style={{ fontSize: 7, color: '#D9A441', marginTop: 3 }}>
                {data.transmittal_number}
              </Text>
            </View>
          </View>
        </View>

        <View style={S.footer} fixed>
          <Text style={S.footerText}>IM ÉNERGIE · Istanbul, Turquie</Text>
          <Text style={S.footerText}>{data.transmittal_number}</Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
          <Text style={S.footerGold}>Ingénierie. Innovation. Performance.</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function transmittalPdfBlob(data: TransmittalData) {
  const qrCode = await QRCode.toDataURL(
    `https://www.im-energie.com/verify/${data.transmittal_number}`
  )

  return renderPdf(
    <TransmittalPDF data={data} qrCode={qrCode} />
  ).toBlob()
}

export async function downloadTransmittalPDF(data: TransmittalData) {
  const blob = await transmittalPdfBlob(data)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = `${data.transmittal_number}.pdf`
  a.click()

  URL.revokeObjectURL(url)
}
