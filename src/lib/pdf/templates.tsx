'use client'

import {
  Document, Page, Text, View, StyleSheet, Font, Image,
  pdf as renderPdf,
} from '@react-pdf/renderer'
import type { Quotation, QuotationLine } from '@/types/sprint3'

// ── Styles ────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 8.5, color: '#1F2937', padding: '30 36 36 36', backgroundColor: '#FFFFFF' },
  // Header
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: '#D9A441' },
  brand:       { flexDirection: 'column' },
  brandName:   { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0B1F3A', letterSpacing: 0.5 },
  brandSub:    { fontSize: 7, color: '#9CA3AF', marginTop: 2, letterSpacing: 0.8 },
  brandContact:{ fontSize: 7, color: '#6B7280', marginTop: 6, lineHeight: 1.6 },
  docInfo:     { alignItems: 'flex-end' },
  docType:     { fontSize: 7, color: '#D9A441', fontFamily: 'Helvetica-Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  docNumber:   { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0B1F3A' },
  docDate:     { fontSize: 7, color: '#9CA3AF', marginTop: 3 },
  docStatus:   { backgroundColor: '#F0F9F4', color: '#065F46', fontSize: 7, fontFamily: 'Helvetica-Bold', padding: '3 8', borderRadius: 3, marginTop: 6, letterSpacing: 0.5 },
  // Parties
  parties:     { flexDirection: 'row', gap: 20, marginBottom: 20 },
  partyBlock:  { flex: 1, backgroundColor: '#F9F7F3', padding: '10 12', borderRadius: 4, borderLeftWidth: 2, borderLeftColor: '#D9A441' },
  partyTitle:  { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#D9A441', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 },
  partyName:   { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0B1F3A', marginBottom: 2 },
  partyLine:   { fontSize: 7.5, color: '#4B5563', lineHeight: 1.5 },
  // Conditions
  condGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18, backgroundColor: '#F9F7F3', padding: '8 10', borderRadius: 4 },
  condItem:    { width: '30%' },
  condLabel:   { fontSize: 6, color: '#9CA3AF', fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 1.5 },
  condValue:   { fontSize: 7.5, color: '#1F2937', fontFamily: 'Helvetica-Bold' },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: '#0B1F3A', padding: '6 8', borderRadius: 3 },
  th:          { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#D9A441', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow:    { flexDirection: 'row', padding: '5 8', borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
  tableRowAlt: { backgroundColor: '#FAFAF8' },
  td:          { fontSize: 7.5, color: '#1F2937' },
  tdLabel:     { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0B1F3A' },
  tdDesc:      { fontSize: 6.5, color: '#9CA3AF', marginTop: 1 },
  // Totaux
  totalsWrapper:{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  totalsBlock: { width: 200, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel:  { fontSize: 7.5, color: '#6B7280' },
  totalValue:  { fontSize: 7.5, color: '#1F2937' },
  grandRow:    { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0B1F3A', padding: '6 10', borderRadius: 3, marginTop: 5 },
  grandLabel:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#D9A441' },
  grandValue:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  // Notes
  sectionTitle:{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  noteText:    { fontSize: 7.5, color: '#4B5563', lineHeight: 1.6 },
  noteBox:     { backgroundColor: '#F9F7F3', padding: '8 10', borderRadius: 4, marginBottom: 10 },
  // Footer
  footer:      { position: 'absolute', bottom: 20, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#E5E7EB', paddingTop: 6 },
  footerText:  { fontSize: 6.5, color: '#9CA3AF' },
  footerGold:  { fontSize: 6.5, color: '#D9A441', fontFamily: 'Helvetica-Bold' },
})

// ── Helpers ───────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Intl.DateTimeFormat('fr-FR').format(new Date(d))
}

function fmtNum(n: number, currency = 'USD') {
  const symbols: Record<string, string> = { USD: '$', EUR: '€', TRY: '₺', XOF: 'FCFA' }
  return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ${symbols[currency] ?? currency}`
}

// ── Quotation PDF Component ───────────────────────────────────────
export function QuotationPDF({ quot }: { quot: Quotation }) {
  const lines   = quot.lines ?? []
  const subtotal = lines.reduce((s, l) => s + l.line_total_sell, 0)
  const discAmt  = subtotal * (quot.discount_global / 100)
  const total    = subtotal - discAmt
  const cur      = quot.currency

  const statusLabel: Record<string, string> = {
    brouillon: 'BROUILLON', envoyee: 'ENVOYÉE', revisee: 'EN RÉVISION',
    approuvee: 'APPROUVÉE', perdue: 'PERDUE', annulee: 'ANNULÉE',
  }

  return (
    <Document title={`Quotation ${quot.number}`} author="Invest Mentor Énergie">
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.header}>
          <View style={S.brand}>
            <Text style={S.brandName}>Invest Mentor Énergie</Text>
            <Text style={S.brandSub}>HUB ÉNERGÉTIQUE TURQUIE — AFRIQUE</Text>
            <Text style={S.brandContact}>
              Istanbul, Turquie{'\n'}
              contact@investmentor-energie.com{'\n'}
              www.investmentor-energie.com
            </Text>
          </View>
          <View style={S.docInfo}>
            <Text style={S.docType}>Quotation</Text>
            <Text style={S.docNumber}>{quot.number}</Text>
            <Text style={S.docDate}>Date : {fmtDate(quot.issued_date)}</Text>
            <Text style={S.docDate}>Validité : {fmtDate(quot.valid_until)}</Text>
            <Text style={S.docStatus}>{statusLabel[quot.status] ?? quot.status}</Text>
          </View>
        </View>

        {/* Client */}
        <View style={S.parties}>
          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>De</Text>
            <Text style={S.partyName}>Invest Mentor Énergie</Text>
            <Text style={S.partyLine}>Istanbul, Turquie</Text>
            {quot.assigned_user && (
              <Text style={S.partyLine}>Commercial : {quot.assigned_user.full_name}</Text>
            )}
          </View>
          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>À l'attention de</Text>
            <Text style={S.partyName}>{quot.client?.company_name ?? ''}</Text>
            {quot.client?.contact_name && <Text style={S.partyLine}>{quot.client.contact_name}</Text>}
            {quot.client?.city && <Text style={S.partyLine}>{quot.client.city}</Text>}
            <Text style={S.partyLine}>{quot.client?.country ?? ''}</Text>
            {quot.client?.contact_email && <Text style={S.partyLine}>{quot.client.contact_email}</Text>}
          </View>
        </View>

        {/* Conditions */}
        <View style={S.condGrid}>
          {[
            { label: 'Devise', value: cur },
            { label: 'Incoterm', value: quot.incoterm ?? 'DAP' },
            { label: 'Délai de livraison', value: quot.delivery_delay ?? '6 à 8 semaines' },
            { label: 'Conditions de paiement', value: quot.payment_terms ?? '' },
            { label: 'Garantie', value: quot.warranty ?? '2 ans' },
            { label: 'Référence doc.', value: quot.number },
          ].map(({ label, value }) => (
            <View key={label} style={S.condItem}>
              <Text style={S.condLabel}>{label}</Text>
              <Text style={S.condValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Intro */}
        {quot.intro_text && (
          <View style={{ ...S.noteBox, marginBottom: 12 }}>
            <Text style={S.noteText}>{quot.intro_text}</Text>
          </View>
        )}

        {/* Table header */}
        <View style={S.tableHeader}>
          <Text style={{ ...S.th, width: '5%' }}>#</Text>
          <Text style={{ ...S.th, flex: 1 }}>Désignation / Description</Text>
          <Text style={{ ...S.th, width: '8%', textAlign: 'center' }}>Réf.</Text>
          <Text style={{ ...S.th, width: '8%', textAlign: 'right' }}>Qté</Text>
          <Text style={{ ...S.th, width: '13%', textAlign: 'right' }}>P.U. HT</Text>
          <Text style={{ ...S.th, width: '8%', textAlign: 'right' }}>Rem.</Text>
          <Text style={{ ...S.th, width: '14%', textAlign: 'right' }}>Total HT</Text>
        </View>

        {/* Lines */}
        {lines.map((line, i) => (
          <View key={line.id ?? i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
            <Text style={{ ...S.td, width: '5%', color: '#9CA3AF' }}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.tdLabel}>{line.designation}</Text>
              {line.description && <Text style={S.tdDesc}>{line.description}</Text>}
            </View>
            <Text style={{ ...S.td, width: '8%', textAlign: 'center', color: '#9CA3AF' }}>
              {line.reference ?? ''}
            </Text>
            <Text style={{ ...S.td, width: '8%', textAlign: 'right' }}>
              {line.quantity} {line.unit}
            </Text>
            <Text style={{ ...S.td, width: '13%', textAlign: 'right' }}>
              {fmtNum(line.unit_price_sell, cur)}
            </Text>
            <Text style={{ ...S.td, width: '8%', textAlign: 'right', color: '#DC2626' }}>
              {line.discount_pct > 0 ? `-${line.discount_pct}%` : '—'}
            </Text>
            <Text style={{ ...S.td, width: '14%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
              {fmtNum(line.line_total_sell, cur)}
            </Text>
          </View>
        ))}

        {/* Totaux */}
        <View style={S.totalsWrapper}>
          <View style={S.totalsBlock}>
            <View style={S.totalRow}>
              <Text style={S.totalLabel}>Sous-total HT</Text>
              <Text style={S.totalValue}>{fmtNum(subtotal, cur)}</Text>
            </View>
            {quot.discount_global > 0 && (
              <View style={S.totalRow}>
                <Text style={S.totalLabel}>Remise globale ({quot.discount_global}%)</Text>
                <Text style={{ ...S.totalValue, color: '#DC2626' }}>- {fmtNum(discAmt, cur)}</Text>
              </View>
            )}
            <View style={S.grandRow}>
              <Text style={S.grandLabel}>TOTAL HT</Text>
              <Text style={S.grandValue}>{fmtNum(total, cur)}</Text>
            </View>
          </View>
        </View>

        {/* Notes techniques */}
        {quot.technical_notes && (
          <View style={{ marginTop: 16 }}>
            <Text style={S.sectionTitle}>Notes techniques</Text>
            <View style={S.noteBox}>
              <Text style={S.noteText}>{quot.technical_notes}</Text>
            </View>
          </View>
        )}

        {/* Notes générales */}
        {quot.notes && (
          <View style={{ marginTop: quot.technical_notes ? 0 : 16 }}>
            <Text style={S.sectionTitle}>Conditions générales</Text>
            <View style={S.noteBox}>
              <Text style={S.noteText}>{quot.notes}</Text>
            </View>
          </View>
        )}

        {/* Disclaimer */}
        <View style={{ marginTop: 12, borderTopWidth: 0.5, borderTopColor: '#E5E7EB', paddingTop: 8 }}>
          <Text style={{ fontSize: 6.5, color: '#9CA3AF', lineHeight: 1.6 }}>
            Ce document est établi à titre indicatif et ne constitue pas un engagement contractuel.
            Les prix sont indiqués hors taxes et hors frais de transport sauf mention contraire.
            Document valable jusqu'au {fmtDate(quot.valid_until)}.
            Invest Mentor Énergie — Istanbul, Turquie.
          </Text>
        </View>

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Invest Mentor Énergie · Istanbul, Turquie</Text>
          <Text style={S.footerText}>{quot.number}</Text>
          <Text style={S.footerGold}>Ingénierie. Innovation. Performance.</Text>
        </View>

      </Page>
    </Document>
  )
}

// ── Proforma PDF Component ────────────────────────────────────────
import type { Proforma, ProformaLine } from '@/types/sprint3'

export function ProformaPDF({ prof }: { prof: Proforma }) {
  const lines    = prof.lines ?? []
  const subtotal = lines.reduce((s, l) => s + l.line_total_sell, 0)
  const discAmt  = subtotal * (prof.discount_global / 100)
  const total    = subtotal - discAmt
  const cur      = prof.currency

  const statusLabel: Record<string, string> = {
    en_attente:'EN ATTENTE', acompte_recu:'ACOMPTE REÇU',
    partiel:'PARTIELLEMENT PAYÉ', paye:'PAYÉ', annule:'ANNULÉ',
  }

  return (
    <Document title={`Proforma ${prof.number}`} author="Invest Mentor Énergie">
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.header}>
          <View style={S.brand}>
            <Text style={S.brandName}>Invest Mentor Énergie</Text>
            <Text style={S.brandSub}>HUB ÉNERGÉTIQUE TURQUIE — AFRIQUE</Text>
            <Text style={S.brandContact}>
              Istanbul, Turquie{'\n'}
              contact@investmentor-energie.com{'\n'}
              www.investmentor-energie.com
            </Text>
          </View>
          <View style={S.docInfo}>
            <Text style={S.docType}>Facture Proforma</Text>
            <Text style={S.docNumber}>{prof.number}</Text>
            <Text style={S.docDate}>Date : {fmtDate(prof.issued_date)}</Text>
            <Text style={S.docDate}>Validité : {fmtDate(prof.valid_until)}</Text>
            {prof.quotation && <Text style={S.docDate}>Réf. quotation : {prof.quotation.number}</Text>}
            <Text style={S.docStatus}>{statusLabel[prof.payment_status] ?? prof.payment_status}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={S.parties}>
          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>Vendeur / Expéditeur</Text>
            <Text style={S.partyName}>Invest Mentor Énergie</Text>
            <Text style={S.partyLine}>Istanbul, Turquie</Text>
            {prof.assigned_user && <Text style={S.partyLine}>Commercial : {prof.assigned_user.full_name}</Text>}
            <Text style={S.partyLine}>contact@investmentor-energie.com</Text>
          </View>
          <View style={S.partyBlock}>
            <Text style={S.partyTitle}>Acheteur / Destinataire</Text>
            <Text style={S.partyName}>{prof.client?.company_name ?? ''}</Text>
            {prof.client?.contact_name && <Text style={S.partyLine}>{prof.client.contact_name}</Text>}
            {prof.client?.address && <Text style={S.partyLine}>{prof.client.address}</Text>}
            {prof.client?.city && <Text style={S.partyLine}>{prof.client.city}</Text>}
            <Text style={S.partyLine}>{prof.client?.country ?? ''}</Text>
            {prof.client?.contact_email && <Text style={S.partyLine}>{prof.client.contact_email}</Text>}
          </View>
        </View>

        {/* Conditions */}
        <View style={S.condGrid}>
          {[
            { label: 'Devise', value: cur },
            { label: 'Incoterm', value: prof.incoterm ?? 'DAP' },
            { label: 'Port de destination', value: prof.port_destination ?? '—' },
            { label: 'Délai de livraison', value: prof.delivery_delay ?? '6 à 8 semaines' },
            { label: 'Conditions de paiement', value: prof.payment_terms ?? '' },
            { label: 'Garantie', value: prof.warranty ?? '2 ans' },
          ].map(({ label, value }) => (
            <View key={label} style={S.condItem}>
              <Text style={S.condLabel}>{label}</Text>
              <Text style={S.condValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Table */}
        <View style={S.tableHeader}>
          <Text style={{ ...S.th, width: '4%' }}>#</Text>
          <Text style={{ ...S.th, flex: 1 }}>Désignation</Text>
          <Text style={{ ...S.th, width: '8%' }}>Réf.</Text>
          <Text style={{ ...S.th, width: '7%' }}>Orig.</Text>
          <Text style={{ ...S.th, width: '8%', textAlign: 'right' }}>Qté</Text>
          <Text style={{ ...S.th, width: '13%', textAlign: 'right' }}>P.U. HT</Text>
          <Text style={{ ...S.th, width: '7%', textAlign: 'right' }}>Rem.</Text>
          <Text style={{ ...S.th, width: '14%', textAlign: 'right' }}>Total HT</Text>
        </View>

        {lines.map((line, i) => (
          <View key={line.id ?? i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
            <Text style={{ ...S.td, width: '4%', color: '#9CA3AF' }}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.tdLabel}>{line.designation}</Text>
              {line.description && <Text style={S.tdDesc}>{line.description}</Text>}
            </View>
            <Text style={{ ...S.td, width: '8%', color: '#9CA3AF' }}>{(line as ProformaLine).reference ?? ''}</Text>
            <Text style={{ ...S.td, width: '7%', color: '#9CA3AF' }}>{(line as ProformaLine).country_origin ?? 'TR'}</Text>
            <Text style={{ ...S.td, width: '8%', textAlign: 'right' }}>{line.quantity} {line.unit}</Text>
            <Text style={{ ...S.td, width: '13%', textAlign: 'right' }}>{fmtNum(line.unit_price_sell, cur)}</Text>
            <Text style={{ ...S.td, width: '7%', textAlign: 'right', color: '#DC2626' }}>
              {line.discount_pct > 0 ? `-${line.discount_pct}%` : '—'}
            </Text>
            <Text style={{ ...S.td, width: '14%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
              {fmtNum(line.line_total_sell, cur)}
            </Text>
          </View>
        ))}

        {/* Totaux */}
        <View style={S.totalsWrapper}>
          <View style={S.totalsBlock}>
            <View style={S.totalRow}>
              <Text style={S.totalLabel}>Sous-total HT</Text>
              <Text style={S.totalValue}>{fmtNum(subtotal, cur)}</Text>
            </View>
            {prof.discount_global > 0 && (
              <View style={S.totalRow}>
                <Text style={S.totalLabel}>Remise ({prof.discount_global}%)</Text>
                <Text style={{ ...S.totalValue, color: '#DC2626' }}>- {fmtNum(discAmt, cur)}</Text>
              </View>
            )}
            <View style={S.grandRow}>
              <Text style={S.grandLabel}>TOTAL HT</Text>
              <Text style={S.grandValue}>{fmtNum(total, cur)}</Text>
            </View>
            {prof.amount_received > 0 && (
              <>
                <View style={{ ...S.totalRow, marginTop: 6 }}>
                  <Text style={S.totalLabel}>Acompte reçu</Text>
                  <Text style={{ ...S.totalValue, color: '#065F46' }}>- {fmtNum(prof.amount_received, cur)}</Text>
                </View>
                <View style={{ ...S.grandRow, backgroundColor: '#065F46' }}>
                  <Text style={S.grandLabel}>SOLDE À PAYER</Text>
                  <Text style={S.grandValue}>{fmtNum(prof.balance_due, cur)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Informations bancaires */}
        {prof.bank_name && (
          <View style={{ marginTop: 16 }}>
            <Text style={S.sectionTitle}>Informations bancaires — Virement</Text>
            <View style={{ ...S.condGrid, backgroundColor: '#EFF6FF', borderWidth: 0.5, borderColor: '#BFDBFE', borderRadius: 4 }}>
              {[
                { label: 'Banque', value: prof.bank_name },
                { label: 'IBAN', value: prof.bank_iban ?? '—' },
                { label: 'Code SWIFT/BIC', value: prof.bank_swift ?? '—' },
                { label: 'Numéro de compte', value: prof.bank_account ?? '—' },
                { label: 'Devise du compte', value: prof.bank_currency ?? cur },
                { label: 'Adresse de la banque', value: prof.bank_address ?? '—' },
              ].map(({ label, value }) => (
                <View key={label} style={S.condItem}>
                  <Text style={S.condLabel}>{label}</Text>
                  <Text style={{ ...S.condValue, fontSize: 7 }}>{value}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 6.5, color: '#9CA3AF', marginTop: 4 }}>
              Merci d'indiquer la référence {prof.number} lors du virement.
            </Text>
          </View>
        )}

        {/* Notes */}
        {prof.notes && (
          <View style={{ marginTop: 12 }}>
            <Text style={S.sectionTitle}>Notes et conditions</Text>
            <View style={S.noteBox}>
              <Text style={S.noteText}>{prof.notes}</Text>
            </View>
          </View>
        )}

        {/* Signature */}
        {prof.has_signature && (
          <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end' }}>
            <View style={{ width: 160, borderTopWidth: 1, borderTopColor: '#0B1F3A', paddingTop: 6 }}>
              <Text style={{ fontSize: 7, color: '#6B7280', textAlign: 'center' }}>
                Signature et cachet
              </Text>
              {prof.signature_name && (
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0B1F3A', textAlign: 'center', marginTop: 4 }}>
                  {prof.signature_name}
                </Text>
              )}
              <Text style={{ fontSize: 6.5, color: '#9CA3AF', textAlign: 'center', marginTop: 2 }}>
                Invest Mentor Énergie
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Invest Mentor Énergie · Istanbul, Turquie</Text>
          <Text style={S.footerText}>{prof.number}</Text>
          <Text style={S.footerGold}>Ingénierie. Innovation. Performance.</Text>
        </View>

      </Page>
    </Document>
  )
}

// ── Export function ───────────────────────────────────────────────
export async function downloadQuotationPDF(quot: Quotation) {
  const blob = await renderPdf(<QuotationPDF quot={quot} />).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${quot.number}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadProformaPDF(prof: Proforma) {
  const blob = await renderPdf(<ProformaPDF prof={prof} />).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${prof.number}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
