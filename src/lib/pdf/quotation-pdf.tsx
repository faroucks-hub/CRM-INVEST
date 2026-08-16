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
import type { Quotation, Proforma, ProformaLine } from '@/types/sprint3'
import { getPdfLogoSource } from './assets'

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
    marginBottom: 24,
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
    marginBottom: 20,
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
    marginBottom: 18,
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

  totalsWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
  },

  totalsBlock: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  totalLabel: {
    fontSize: 7.5,
    color: '#6B7280',
  },

  totalValue: {
    fontSize: 7.5,
    color: '#1F2937',
  },

  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0B1F3A',
    padding: '7 10',
    borderRadius: 3,
    marginTop: 5,
  },

  grandLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#D9A441',
  },

  grandValue: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
  },

  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1F3A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  noteText: {
    fontSize: 7.5,
    color: '#4B5563',
    lineHeight: 1.6,
  },

  noteBox: {
    backgroundColor: '#F9F7F3',
    padding: '8 10',
    borderRadius: 4,
    marginBottom: 10,
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

function fmtDate(d?: string) {
  if (!d) return '-'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(d))
}

function fmtNum(n: number, currency = 'USD') {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    TRY: '₺',
    XOF: 'FCFA',
  }

  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(Number(n || 0))
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')

  return `${formatted} ${symbols[currency] ?? currency}`
}

export function QuotationPDF({
  quot,
  qrCode,
}: {
  quot: any
  qrCode?: string
}) {
  const lines = quot.lines ?? []
  const subtotal = lines.reduce(
    (sum: number, line: any) => sum + Number(line.line_total_sell || 0),
    0
  )

  const discountGlobal = Number(quot.discount_global || 0)
  const discountAmount = subtotal * (discountGlobal / 100)
  const total = subtotal - discountAmount
  const cur = quot.currency || 'USD'

  const statusLabel: Record<string, string> = {
    brouillon: 'BROUILLON',
    envoyee: 'ENVOYÉE',
    revisee: 'EN RÉVISION',
    approuvee: 'APPROUVÉE',
    perdue: 'PERDUE',
    annulee: 'ANNULÉE',
  }
const proformaStatusLabel: Record<string, string> = {
  en_attente: 'EN ATTENTE',
  partiellement_payee: 'PARTIELLEMENT PAYÉE',
  payee: 'PAYÉE',
  annulee: 'ANNULÉE',
}

  return (
    <Document title={`Quotation ${quot.number}`} author="Invest Mentor Énergie">
      <Page size="A4" style={S.page}>
        {quot.status === 'brouillon' && (
          <Text
            style={{
              position: 'absolute',
              top: '42%',
              left: '18%',
              fontSize: 72,
              color: '#E5E7EB',
              opacity: 0.18,
              transform: 'rotate(-32deg)',
              fontFamily: 'Helvetica-Bold',
              letterSpacing: 6,
            }}
          >
            BROUILLON
          </Text>
        )}

        <View style={S.header}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
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
            <Text style={S.docType}>Quotation</Text>
            <Text style={S.docNumber}>{quot.number}</Text>
            <Text style={S.docDate}>Date : {fmtDate(quot.issued_date)}</Text>
            <Text style={S.docDate}>Validité : {fmtDate(quot.valid_until)}</Text>
            <Text style={S.docStatus}>
              {statusLabel[quot.status] ?? quot.status}
            </Text>
          </View>
        </View>

        <View style={S.parties}>
          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>De</Text>
            <Text style={S.partyName}>Invest Mentor Énergie</Text>
            <Text style={S.partyLine}>Istanbul, Turquie</Text>

            {quot.assigned_user && (
              <Text style={S.partyLine}>
                Commercial : {quot.assigned_user.full_name}
              </Text>
            )}
          </View>

          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>À l'attention de</Text>
            <Text style={S.partyName}>
              {quot.clients?.company_name ?? quot.client?.company_name ?? ''}
            </Text>

            {(quot.clients?.contact_name || quot.client?.contact_name) && (
              <Text style={S.partyLine}>
                {quot.clients?.contact_name ?? quot.client?.contact_name}
              </Text>
            )}

            {(quot.clients?.city || quot.client?.city) && (
              <Text style={S.partyLine}>
                {quot.clients?.city ?? quot.client?.city}
              </Text>
            )}

            <Text style={S.partyLine}>
              {quot.clients?.country ?? quot.client?.country ?? ''}
            </Text>

            {(quot.clients?.contact_email || quot.client?.contact_email) && (
              <Text style={S.partyLine}>
                {quot.clients?.contact_email ?? quot.client?.contact_email}
              </Text>
            )}
          </View>
        </View>

        <View style={S.condGrid}>
          {[
            { label: 'Devise', value: cur },
            { label: 'Incoterm', value: quot.incoterm ?? 'DAP' },
            {
              label: 'Délai de livraison',
              value: quot.delivery_delay ?? '6 à 8 semaines',
            },
            {
              label: 'Conditions de paiement',
              value: quot.payment_terms ?? '',
            },
            { label: 'Garantie', value: quot.warranty ?? '2 ans' },
            {
              label: 'Cadre contractuel',
              value: quot.terms_code ? `${quot.terms_code}-${quot.terms_version ?? ''}` : 'Non défini',
            },
          ].map(({ label, value }) => (
            <View key={label} style={S.condItem}>
              <Text style={S.condLabel}>{label}</Text>
              <Text style={S.condValue}>{value}</Text>
            </View>
          ))}
        </View>

        {quot.intro_text && (
          <View style={{ ...S.noteBox, marginBottom: 12 }}>
            <Text style={S.noteText}>{quot.intro_text}</Text>
          </View>
        )}

        <View style={S.tableHeader} fixed>
          <Text style={{ ...S.th, width: '5%' }}>#</Text>
          <Text style={{ ...S.th, flex: 1 }}>Désignation / Description</Text>
          <Text style={{ ...S.th, width: '8%', textAlign: 'center' }}>Réf.</Text>
          <Text style={{ ...S.th, width: '8%', textAlign: 'right' }}>Qté</Text>
          <Text style={{ ...S.th, width: '13%', textAlign: 'right' }}>P.U. HT</Text>
          <Text style={{ ...S.th, width: '8%', textAlign: 'right' }}>Rem.</Text>
          <Text style={{ ...S.th, width: '14%', textAlign: 'right' }}>
            Total HT
          </Text>
        </View>

        {lines.map((line: any, index: number) => (
          <View
            key={line.id ?? index}
            style={[S.tableRow, index % 2 === 1 ? S.tableRowAlt : {}]}
          >
            <Text style={{ ...S.td, width: '5%', color: '#9CA3AF' }}>
              {index + 1}
            </Text>

            <View style={{ flex: 1 }}>
              <Text style={S.tdLabel}>
                {line.designation || line.description || '-'}
              </Text>

              {line.description && line.designation && (
                <Text style={S.tdDesc}>{line.description}</Text>
              )}
            </View>

            <Text
              style={{
                ...S.td,
                width: '8%',
                textAlign: 'center',
                color: '#9CA3AF',
              }}
            >
              {line.reference ?? ''}
            </Text>

            <Text style={{ ...S.td, width: '8%', textAlign: 'right' }}>
              {line.quantity} {line.unit}
            </Text>

            <Text style={{ ...S.td, width: '13%', textAlign: 'right' }}>
              {fmtNum(line.unit_price_sell, cur)}
            </Text>

            <Text
              style={{
                ...S.td,
                width: '8%',
                textAlign: 'right',
                color: '#DC2626',
              }}
            >
              {Number(line.discount_pct || 0) > 0
                ? `-${line.discount_pct}%`
                : '—'}
            </Text>

            <Text
              style={{
                ...S.td,
                width: '14%',
                textAlign: 'right',
                fontFamily: 'Helvetica-Bold',
              }}
            >
              {fmtNum(line.line_total_sell, cur)}
            </Text>
          </View>
        ))}

        <View style={S.totalsWrapper}>
          <View style={S.totalsBlock}>
            <View style={S.totalRow}>
              <Text style={S.totalLabel}>Sous-total HT</Text>
              <Text style={S.totalValue}>{fmtNum(subtotal, cur)}</Text>
            </View>

            {discountGlobal > 0 && (
              <View style={S.totalRow}>
                <Text style={S.totalLabel}>
                  Remise globale ({discountGlobal}%)
                </Text>
                <Text style={{ ...S.totalValue, color: '#DC2626' }}>
                  - {fmtNum(discountAmount, cur)}
                </Text>
              </View>
            )}

            <View style={S.grandRow}>
              <Text style={S.grandLabel}>TOTAL HT</Text>
              <Text style={S.grandValue}>{fmtNum(total, cur)}</Text>
            </View>
          </View>
        </View>

        {quot.technical_notes && (
          <View style={{ marginTop: 16 }}>
            <Text style={S.sectionTitle}>Notes techniques</Text>
            <View style={S.noteBox}>
              <Text style={S.noteText}>{quot.technical_notes}</Text>
            </View>
          </View>
        )}

        {quot.terms_snapshot && (
          <View style={{ marginTop: 16 }} break>
            <Text style={S.sectionTitle}>Commercial Terms & Conditions — {quot.terms_code}-{quot.terms_version}</Text>
            <View style={S.noteBox}>
              <Text style={S.noteText}>{quot.terms_snapshot}</Text>
            </View>
          </View>
        )}

        <View
          style={{
            marginTop: 18,
            borderTopWidth: 0.5,
            borderTopColor: '#E5E7EB',
            paddingTop: 8,
          }}
        >
          <Text style={{ fontSize: 6.5, color: '#9CA3AF', lineHeight: 1.6 }}>
            Ce document est établi à titre indicatif et ne constitue pas un
            engagement contractuel. Les prix sont indiqués hors taxes et hors
            frais de transport sauf mention contraire. Document valable jusqu'au{' '}
            {fmtDate(quot.valid_until)}. IM ÉNERGIE — Istanbul, Turquie.
          </Text>
        </View>

        <View
          style={{
            marginTop: 18,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderWidth: 0.5,
            borderColor: '#E5E7EB',
            borderRadius: 4,
            padding: 10,
          }}
        >
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
              Préparé par
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
              {quot.assigned_user?.full_name ?? 'Sales Engineer'}
            </Text>

            <Text
              style={{
                fontSize: 6.5,
                color: '#9CA3AF',
                marginTop: 2,
              }}
            >
              IM ÉNERGIE
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {qrCode ? (
              <Image
                src={qrCode}
                style={{
                  width: 48,
                  height: 48,
                }}
              />
            ) : null}

            <View style={{ marginLeft: 8 }}>
              <Text style={S.sectionTitle}>Vérification QR</Text>

              <Text
                style={{
                  fontSize: 6.5,
                  color: '#6B7280',
                  width: 120,
                  lineHeight: 1.4,
                }}
              >
                Vérifiez l’authenticité de cette quotation.
              </Text>

              <Text
                style={{
                  fontSize: 7,
                  color: '#D9A441',
                  marginTop: 3,
                }}
              >
                {quot.number}
              </Text>
            </View>
          </View>
        </View>

        <View style={S.footer} fixed>
          <Text style={S.footerText}>IM ÉNERGIE · Istanbul, Turquie</Text>
          <Text style={S.footerText}>{quot.number}</Text>
          <Text
  style={S.footerText}
  render={({ pageNumber, totalPages }) =>
    `Page ${pageNumber} / ${totalPages}`
  }
/>
          <Text style={S.footerGold}>Ingénierie. Innovation. Performance.</Text>
        </View>
      </Page>
    </Document>
  )
}

export function ProformaPDF({
  prof,
  qrCode,
}: {
  prof: any
  qrCode?: string
}) {
  const lines = prof.lines ?? []
  const subtotal = lines.reduce(
    (s: number, l: any) => s + Number(l.line_total_sell || 0),
    0
  )
  const discountGlobal = Number(prof.discount_global || 0)
  const discAmt = subtotal * (discountGlobal / 100)
  const total = subtotal - discAmt
  const amountReceived = Number(prof.amount_received || 0)
  const balanceDue =
    prof.balance_due !== null &&
    prof.balance_due !== undefined &&
    Number.isFinite(Number(prof.balance_due))
      ? Number(prof.balance_due)
      : Math.max(total - amountReceived, 0)
  const cur = prof.currency || 'USD'

const proformaStatusLabel: Record<string, string> = {
  en_attente: 'EN ATTENTE',
  partiellement_payee: 'PARTIELLEMENT PAYÉE',
  payee: 'PAYÉE',
  annulee: 'ANNULÉE',
}

  return (
    <Document title={`Proforma ${prof.number}`} author="Invest Mentor Énergie">
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
            <Text style={S.docType}>Facture Proforma</Text>
            <Text style={S.docNumber}>{prof.number}</Text>
            <Text style={S.docDate}>Date : {fmtDate(prof.issued_date)}</Text>
            <Text style={S.docDate}>Validité : {fmtDate(prof.valid_until)}</Text>
            <Text style={S.docStatus}>
            {proformaStatusLabel[prof.payment_status] ?? 'EN ATTENTE'}
          </Text>
          </View>
        </View>

        <View style={S.parties}>
          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>Vendeur / Expéditeur</Text>
            <Text style={S.partyName}>Invest Mentor Énergie</Text>
            <Text style={S.partyLine}>Istanbul, Turquie</Text>
            <Text style={S.partyLine}>contact@im-energie.com</Text>
          </View>

          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>Acheteur / Destinataire</Text>
            <Text style={S.partyName}>
              {prof.client?.company_name ?? prof.clients?.company_name ?? ''}
            </Text>
            {(prof.client?.contact_name || prof.clients?.contact_name) && (
              <Text style={S.partyLine}>
                {prof.client?.contact_name ?? prof.clients?.contact_name}
              </Text>
            )}
            {(prof.client?.address || prof.clients?.address) && (
              <Text style={S.partyLine}>
                {prof.client?.address ?? prof.clients?.address}
              </Text>
            )}
            {(prof.client?.city || prof.clients?.city) && (
              <Text style={S.partyLine}>
                {prof.client?.city ?? prof.clients?.city}
              </Text>
            )}
            <Text style={S.partyLine}>
              {prof.client?.country ?? prof.clients?.country ?? ''}
            </Text>
          </View>
        </View>

        <View style={S.condGrid}>
          {[
            { label: 'Devise', value: cur },
            { label: 'Incoterm', value: prof.incoterm ?? 'DAP' },
            { label: 'Port de destination', value: prof.port_destination ?? '—' },
            { label: 'Délai de livraison', value: prof.delivery_delay ?? '6 à 8 semaines' },
            { label: 'Conditions de paiement', value: prof.payment_terms ?? '—' },
            { label: 'Garantie', value: prof.warranty ?? '2 ans' },
            { label: 'Cadre contractuel', value: prof.terms_code ? `${prof.terms_code}-${prof.terms_version ?? ''}` : 'Non défini' },
          ].map(({ label, value }) => (
            <View key={label} style={S.condItem}>
              <Text style={S.condLabel}>{label}</Text>
              <Text style={S.condValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={S.tableHeader}>
          <Text style={{ ...S.th, width: '4%' }}>#</Text>
          <Text style={{ ...S.th, flex: 1 }}>Désignation</Text>
          <Text style={{ ...S.th, width: '8%' }}>Réf.</Text>
          <Text style={{ ...S.th, width: '8%', textAlign: 'right' }}>Qté</Text>
          <Text style={{ ...S.th, width: '13%', textAlign: 'right' }}>
            P.U. HT
          </Text>
          <Text style={{ ...S.th, width: '14%', textAlign: 'right' }}>
            Total HT
          </Text>
        </View>

        {lines.map((line: any, i: number) => (
          <View key={line.id ?? i} wrap={false} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
            <Text style={{ ...S.td, width: '4%', color: '#9CA3AF' }}>{i + 1}</Text>

            <View style={{ flex: 1 }}>
              <Text style={S.tdLabel}>
                {line.designation || line.description || '-'}
              </Text>
              {line.description && line.designation && (
                <Text style={S.tdDesc}>{line.description}</Text>
              )}
            </View>

            <Text style={{ ...S.td, width: '8%', color: '#9CA3AF' }}>
              {line.reference ?? ''}
            </Text>

            <Text style={{ ...S.td, width: '8%', textAlign: 'right' }}>
              {line.quantity} {line.unit}
            </Text>

            <Text style={{ ...S.td, width: '13%', textAlign: 'right' }}>
              {fmtNum(line.unit_price_sell, cur)}
            </Text>

            <Text style={{ ...S.td, width: '14%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
              {fmtNum(line.line_total_sell, cur)}
            </Text>
          </View>
        ))}

        {/*
          Bloc financier final : insécable pour éviter une page orpheline contenant
          uniquement le QR/signature. La table, elle, reste libre de s'étendre sur
          autant de pages que nécessaire.
        */}
        <View wrap={false} style={{ marginTop: 2 }}>
          <View style={S.totalsWrapper}>
            <View style={S.totalsBlock}>
              <View style={S.totalRow}>
                <Text style={S.totalLabel}>Sous-total HT</Text>
                <Text style={S.totalValue}>{fmtNum(subtotal, cur)}</Text>
              </View>

              {discountGlobal > 0 && (
                <View style={S.totalRow}>
                  <Text style={S.totalLabel}>Remise ({discountGlobal}%)</Text>
                  <Text style={{ ...S.totalValue, color: '#DC2626' }}>
                    - {fmtNum(discAmt, cur)}
                  </Text>
                </View>
              )}

              <View style={S.grandRow}>
                <Text style={S.grandLabel}>TOTAL HT</Text>
                <Text style={S.grandValue}>{fmtNum(total, cur)}</Text>
              </View>

              {amountReceived > 0 && (
                <>
                  <View style={{ ...S.totalRow, marginTop: 6 }}>
                    <Text style={S.totalLabel}>Acompte reçu</Text>
                    <Text style={{ ...S.totalValue, color: '#065F46' }}>
                      - {fmtNum(prof.amount_received, cur)}
                    </Text>
                  </View>

                  <View style={{ ...S.grandRow, backgroundColor: '#065F46' }}>
                    <Text style={S.grandLabel}>SOLDE À PAYER</Text>
                    <Text style={S.grandValue}>
                      {fmtNum(balanceDue, cur)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {prof.bank_name && (
            <View style={{ marginTop: 14 }}>
              <Text style={S.sectionTitle}>Informations bancaires</Text>

              <View style={S.noteBox}>
                <Text style={S.noteText}>Bénéficiaire : IM ÉNERGIE</Text>
                <Text style={S.noteText}>Banque : {prof.bank_name}</Text>
                <Text style={S.noteText}>IBAN : {prof.bank_iban ?? '—'}</Text>
                <Text style={S.noteText}>SWIFT : {prof.bank_swift ?? '—'}</Text>
                <Text style={S.noteText}>Compte : {prof.bank_account ?? '—'}</Text>
                <Text style={S.noteText}>Devise : {prof.bank_currency ?? cur}</Text>
              </View>
            </View>
          )}

          <View
            style={{
              marginTop: 14,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderWidth: 0.5,
              borderColor: '#E5E7EB',
              borderRadius: 4,
              padding: 10,
            }}
          >
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
                Préparé par
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
                {prof.assigned_user?.full_name ?? 'Sales Engineer'}
              </Text>

              <Text style={{ fontSize: 6.5, color: '#9CA3AF', marginTop: 2 }}>
                IM ÉNERGIE
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {qrCode ? (
                <Image src={qrCode} style={{ width: 48, height: 48 }} />
              ) : null}

              <View style={{ marginLeft: 8 }}>
                <Text style={S.sectionTitle}>Vérification QR</Text>
                <Text
                  style={{
                    fontSize: 6.5,
                    color: '#6B7280',
                    width: 120,
                    lineHeight: 1.4,
                  }}
                >
                  Vérifiez l’authenticité de cette proforma.
                </Text>
                <Text style={{ fontSize: 7, color: '#D9A441', marginTop: 3 }}>
                  {prof.number}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/*
          Les conditions peuvent être longues : elles restent wrappables et peuvent
          continuer librement sur plusieurs pages. On ne force plus un saut de page.
        */}
        {prof.terms_snapshot && (
          <View style={{ marginTop: 16 }} minPresenceAhead={70}>
            <Text style={S.sectionTitle}>
              Commercial Terms & Conditions — {prof.terms_code}-{prof.terms_version}
            </Text>
            <View style={S.noteBox}>
              <Text style={S.noteText}>{prof.terms_snapshot}</Text>
            </View>
          </View>
        )}

        <View style={S.footer} fixed>
          <Text style={S.footerText}>IM ÉNERGIE · Istanbul, Turquie</Text>
          <Text style={S.footerText}>{prof.number}</Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
          <Text style={S.footerGold}>Ingénierie. Innovation. Performance.</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadQuotationPDF(quot: any) {
  const qrCode = await QRCode.toDataURL(
    `https://www.im-energie.com/verify/${quot.number}`
  )
  const blob = await renderPdf(
    <QuotationPDF quot={quot} qrCode={qrCode} />
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${quot.number ?? 'quotation'}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function downloadProformaPDF(prof: Proforma) {
  const qrCode = await QRCode.toDataURL(
    `https://www.im-energie.com/verify/${prof.number}`
  )

  const blob = await renderPdf(
    <ProformaPDF prof={prof} qrCode={qrCode} />
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = `${prof.number}.pdf`
  a.click()

  URL.revokeObjectURL(url)
}
