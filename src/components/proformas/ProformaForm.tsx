'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, FileDown } from 'lucide-react'
import { FormGrid, FormSection } from '@/components/ui/form/Fields'
import DocumentLinesEditor, { type LineItem } from '../quotations/DocumentLinesEditor'
import Modal from '@/components/ui/modal/Modal'
import {
  createProformaAction,
  updateProformaAction,
  type ProformaPayload,
} from '@/lib/actions/proformas'
import { getQuotationDetailsAction } from '@/lib/actions/quotations'
import type { Proforma } from '@/types/sprint3'
import {
  INCOTERMS,
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_WARRANTY,
  DEFAULT_DELIVERY,
  PROFORMA_STATUS_LABELS,
  type ProformaPaymentStatus,
} from '@/types/sprint3'
import { downloadProformaPDF } from '@/lib/pdf/quotation-pdf'

interface Props {
  open: boolean
  onClose: () => void
  proforma?: Proforma | null
  clients: { id: string; company_name: string; country: string }[]
  quotations: {
    id: string
    number: string
    client_id: string
    total_sell: number
    currency: string
  }[]
  users: { id: string; full_name: string }[]
  isAdminOrLead: boolean
  currentUserId: string
  termsProfiles:{id:string;code:string;name:string;version:string;commercial_role:string;status:string;role_summary?:string|null}[]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function inDays(n: number) {
  return new Date(Date.now() + n * 86400000).toISOString().split('T')[0]
}

export default function ProformaForm({
  open,
  onClose,
  proforma,
  clients,
  quotations,
  users,
  isAdminOrLead,
  currentUserId,
  termsProfiles,
}: Props) {
  const router = useRouter()
  const isEdit = !!proforma

  const [saving, setSaving] = useState(false)
  const [loadingQuotation, setLoadingQuotation] = useState(false)

  const [clientId, setClientId] = useState(proforma?.client_id ?? '')
  const [quotId, setQuotId] = useState(proforma?.quotation_id ?? '')
  const [assignedTo, setAssignedTo] = useState(proforma?.assigned_to ?? currentUserId)

  const [issuedDate, setIssuedDate] = useState(proforma?.issued_date ?? today())
  const [validUntil, setValidUntil] = useState(proforma?.valid_until ?? inDays(30))

  const [currency, setCurrency] = useState(proforma?.currency ?? 'USD')
  const [incoterm, setIncoterm] = useState(proforma?.incoterm ?? 'DAP')
  const [portDest, setPortDest] = useState(proforma?.port_destination ?? '')
  const [delivery, setDelivery] = useState(proforma?.delivery_delay ?? DEFAULT_DELIVERY)
  const [warranty, setWarranty] = useState(proforma?.warranty ?? DEFAULT_WARRANTY)
  const [paymentTerms, setPaymentTerms] = useState(
    proforma?.payment_terms ?? DEFAULT_PAYMENT_TERMS
  )
  const [termsProfileId, setTermsProfileId] = useState(proforma?.terms_profile_id ?? '')
  const [commercialRole, setCommercialRole] = useState<'facilitation'|'resale'|'distribution'|''>((proforma?.commercial_role as any) ?? '')

  const [discountGlobal, setDiscountGlobal] = useState(proforma?.discount_global ?? 0)
  const [amountReceived, setAmountReceived] = useState(proforma?.amount_received ?? 0)

  const [hasSignature, setHasSignature] = useState(proforma?.has_signature ?? false)
  const [signatureName, setSignatureName] = useState(proforma?.signature_name ?? '')

  const [bankName, setBankName] = useState(proforma?.bank_name ?? '')
  const [bankIban, setBankIban] = useState(proforma?.bank_iban ?? '')
  const [bankSwift, setBankSwift] = useState(proforma?.bank_swift ?? '')
  const [bankAccount, setBankAccount] = useState(proforma?.bank_account ?? '')
  const [bankAddress, setBankAddress] = useState(proforma?.bank_address ?? '')
  const [bankCurrency, setBankCurrency] = useState(proforma?.bank_currency ?? 'USD')

  const [notes, setNotes] = useState(proforma?.notes ?? '')
  const [paymentStatus, setPaymentStatus] = useState<ProformaPaymentStatus>(
    (proforma?.payment_status ?? 'en_attente') as ProformaPaymentStatus
  )

  const [lines, setLines] = useState<LineItem[]>(
    proforma?.lines?.map((l) => ({
      id: l.id,
      sort_order: l.sort_order,
      designation: l.designation,
      description: l.description ?? '',
      reference: l.reference ?? '',
      quantity: l.quantity,
      unit: l.unit,
      unit_price_sell: l.unit_price_sell,
      discount_pct: l.discount_pct,
      line_total_sell: l.line_total_sell,
      unit_price_buy: l.unit_price_buy ?? undefined,
      notes: l.notes ?? '',
    })) ?? []
  )

  async function handleQuotationChange(quotationId: string) {
    setQuotId(quotationId)

    if (!quotationId) return

    setLoadingQuotation(true)

    const result = await getQuotationDetailsAction(quotationId)

    setLoadingQuotation(false)

    if (result.error || !result.data) {
      toast.error('Impossible de charger la quotation')
      return
    }

    const q = result.data as any

    setClientId(q.client_id ?? '')
    setCurrency(q.currency ?? 'USD')
    setBankCurrency(q.currency ?? 'USD')
    setIncoterm(q.incoterm ?? 'DAP')
    setDelivery(q.delivery_delay ?? DEFAULT_DELIVERY)
    setWarranty(q.warranty ?? DEFAULT_WARRANTY)
    setPaymentTerms(q.payment_terms ?? DEFAULT_PAYMENT_TERMS)
    setTermsProfileId(q.terms_profile_id ?? '')
    setCommercialRole((q.commercial_role as any) ?? '')
    setDiscountGlobal(Number(q.discount_global ?? 0))
    setNotes(q.notes ?? '')

    if (q.assigned_to) {
      setAssignedTo(q.assigned_to)
    }

    if (q.lines?.length) {
      setLines(
        q.lines.map((l: any, i: number) => ({
          id: undefined,
          sort_order: i,
          designation: l.designation ?? l.description ?? '',
          description: l.description ?? '',
          reference: l.reference ?? '',
          quantity: Number(l.quantity ?? 1),
          unit: l.unit ?? 'unit',
          unit_price_sell: Number(l.unit_price_sell ?? 0),
          discount_pct: Number(l.discount_pct ?? 0),
          line_total_sell: Number(l.line_total_sell ?? 0),
          unit_price_buy: l.unit_price_buy ?? undefined,
          notes: l.notes ?? '',
        }))
      )
    }

    toast.success('Quotation importée dans la proforma')
  }

  async function handleSave() {
    if (!clientId) {
      toast.error('Sélectionnez un client')
      return
    }

    if (!lines.length) {
      toast.error('Ajoutez au moins une ligne produit')
      return
    }

    setSaving(true)

    const payload: ProformaPayload = {
      client_id: clientId,
      quotation_id: quotId || undefined,
      assigned_to: assignedTo || undefined,
      issued_date: issuedDate,
      valid_until: validUntil,
      currency,
      incoterm,
      port_destination: portDest || undefined,
      delivery_delay: delivery,
      warranty,
      payment_terms: paymentTerms,
      commercial_role: commercialRole || undefined,
      terms_profile_id: termsProfileId || undefined,

      bank_name: bankName || undefined,
      bank_iban: bankIban || undefined,
      bank_swift: bankSwift || undefined,
      bank_account: bankAccount || undefined,
      bank_address: bankAddress || undefined,
      bank_currency: bankCurrency || undefined,

      notes: notes || undefined,
      has_signature: hasSignature,
      signature_name: signatureName || undefined,

      discount_global: discountGlobal,
      amount_received: amountReceived,

      lines: lines.map((l, i) => ({
        sort_order: i,
        product_id: null,
        designation: l.designation,
        description: l.description || undefined,
        reference: l.reference || undefined,
        hs_code: null,
        country_origin: 'Turquie',
        quantity: l.quantity,
        unit: l.unit,
        unit_price_sell: l.unit_price_sell,
        discount_pct: l.discount_pct,
        line_total_sell: l.line_total_sell,
        unit_price_buy: l.unit_price_buy ?? undefined,
        notes: l.notes || undefined,
      })),
    }

    const result = isEdit
      ? await updateProformaAction(proforma!.id, {
          ...payload,
          payment_status: paymentStatus,
        })
      : await createProformaAction(payload)

    setSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(isEdit ? 'Proforma mise à jour' : 'Proforma créée')
    onClose()
    router.refresh()
  }

  async function handlePDF() {
    if (!isEdit) {
      toast.info("Enregistrez d'abord")
      return
    }

    try {
      await downloadProformaPDF({
        ...proforma!,
        lines: lines as Proforma['lines'],
      })

      toast.success('PDF téléchargé')
    } catch {
      toast.error('Erreur PDF')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Modifier ${proforma!.number}` : 'Nouvelle facture proforma'}
      subtitle="Document commercial avec informations bancaires"
      size="xl"
    >
      <div className="p-6 space-y-6">
        <FormSection title="Client & Relations">
          <FormGrid cols={2}>
            <div>
              <label className="label">
                Client <span className="text-red-400">*</span>
              </label>

              <select
                className="input"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">— Sélectionner —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Quotation liée</label>

              <select
                className="input"
                value={quotId}
                onChange={(e) => handleQuotationChange(e.target.value)}
                disabled={loadingQuotation}
              >
                <option value="">
                  {loadingQuotation ? 'Chargement...' : '— Aucune —'}
                </option>

                {quotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.number}
                  </option>
                ))}
              </select>

              {loadingQuotation && (
                <p className="text-xs text-gray-400 mt-1">
                  Import automatique de la quotation...
                </p>
              )}
            </div>
          </FormGrid>

          <FormGrid cols={3}>
            <div>
              <label className="label">Commercial</label>
              <select
                className="input"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Date émission</label>
              <input
                type="date"
                className="input"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Validité</label>
              <input
                type="date"
                className="input"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title="Conditions commerciales">
          <div className="rounded-lg border border-navy-900/10 bg-navy-900/[0.03] p-4 mb-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Cadre commercial</label>
                <select className="input" value={termsProfileId} onChange={e=>{const id=e.target.value;setTermsProfileId(id);const p=termsProfiles.find(x=>x.id===id);setCommercialRole((p?.commercial_role as any)??'')}}>
                  <option value="">— Hériter / sélectionner —</option>
                  {termsProfiles.map(p=><option key={p.id} value={p.id}>{p.code} · {p.version} · {p.name}{p.status==='draft'?' [DRAFT]':''}</option>)}
                </select>
              </div>
              <div className="text-xs text-gray-500 leading-5 pt-6">La Proforma doit conserver le même régime contractuel que la Quotation acceptée. Toute modification doit être volontaire et traçable.</div>
            </div>
            {termsProfiles.find(x=>x.id===termsProfileId)?.status==='draft'&&<div className="mt-3 text-xs font-medium text-amber-700">⚠ Version DRAFT — validation juridique requise avant usage externe.</div>}
          </div>
          <FormGrid cols={3}>
            <div>
              <label className="label">Devise</label>
              <select
                className="input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {['USD', 'EUR', 'TRY', 'XOF'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Incoterm</label>
              <select
                className="input"
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
              >
                {INCOTERMS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Port de destination</label>
              <input
                className="input"
                value={portDest}
                onChange={(e) => setPortDest(e.target.value)}
                placeholder="ex: Abidjan, CI"
              />
            </div>
          </FormGrid>

          <FormGrid cols={2}>
            <div>
              <label className="label">Délai de livraison</label>
              <input
                className="input"
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Garantie</label>
              <input
                className="input"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
              />
            </div>
          </FormGrid>

          <div>
            <label className="label">Conditions de paiement</label>
            <input
              className="input"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </div>
        </FormSection>

        <FormSection title="Informations bancaires — Virement">
          <FormGrid cols={2}>
            <div>
              <label className="label">Nom de la banque</label>
              <input
                className="input"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="ex: Ziraat Bankası"
              />
            </div>

            <div>
              <label className="label">IBAN</label>
              <input
                className="input"
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                placeholder="TR..."
              />
            </div>
          </FormGrid>

          <FormGrid cols={3}>
            <div>
              <label className="label">Code SWIFT/BIC</label>
              <input
                className="input"
                value={bankSwift}
                onChange={(e) => setBankSwift(e.target.value)}
                placeholder="TCZBTR2A"
              />
            </div>

            <div>
              <label className="label">Numéro de compte</label>
              <input
                className="input"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Devise du compte</label>
              <select
                className="input"
                value={bankCurrency}
                onChange={(e) => setBankCurrency(e.target.value)}
              >
                {['USD', 'EUR', 'TRY', 'XOF'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </FormGrid>

          <div>
            <label className="label">Adresse de la banque</label>
            <input
              className="input"
              value={bankAddress}
              onChange={(e) => setBankAddress(e.target.value)}
              placeholder="Adresse complète de la banque"
            />
          </div>
        </FormSection>

        <FormSection title="Lignes de la proforma">
          <DocumentLinesEditor
            lines={lines}
            onChange={setLines}
            currency={currency}
            discountGlobal={discountGlobal}
            onDiscountChange={setDiscountGlobal}
            canSeeBuyPrice={isAdminOrLead}
          />
        </FormSection>

        <FormSection title="Paiement & Statut">
          <FormGrid cols={3}>
            <div>
              <label className="label">Statut paiement</label>
              <select
                className="input"
                value={paymentStatus}
                onChange={(e) =>
                  setPaymentStatus(e.target.value as ProformaPaymentStatus)
                }
              >
                {Object.entries(PROFORMA_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Acompte reçu ({currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={amountReceived}
                onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
              />
            </div>
          </FormGrid>

          <div>
            <label className="label">Notes et conditions affichées sur PDF</label>
            <textarea
              className="input min-h-[60px] resize-none text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conditions générales, mentions légales..."
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSignature}
                onChange={(e) => setHasSignature(e.target.checked)}
                className="w-4 h-4 accent-navy-900"
              />
              <span className="text-sm text-gray-700">
                Ajouter signature/cachet
              </span>
            </label>

            {hasSignature && (
              <div className="flex-1">
                <input
                  className="input text-sm"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Nom du signataire"
                />
              </div>
            )}
          </div>
        </FormSection>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex gap-2">
            {isEdit && (
              <button
                type="button"
                onClick={handlePDF}
                className="btn btn-outline btn-sm"
              >
                <FileDown className="w-3.5 h-3.5" />
                PDF Proforma
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Annuler
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loadingQuotation}
              className="btn btn-primary"
            >
              <Save className="w-4 h-4" />
              {saving
                ? 'Enregistrement...'
                : isEdit
                  ? 'Mettre à jour'
                  : 'Créer la proforma'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
