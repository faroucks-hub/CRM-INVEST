'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { Download, ChevronDown } from 'lucide-react'
import Modal from '@/components/ui/modal/Modal'
import { Input, Select, Textarea, FormGrid, FormSection } from '@/components/ui/form/Fields'
import LineItemsEditor from '@/components/quotations/LineItemsEditor'
import { createProformaAction, updateProformaStatusAction } from '@/lib/actions/documents'
import { generateProformaPDF } from '@/lib/pdf/generator'
import type { LineItem, ProformaFull, ProformaPaymentStatus } from '@/types/sprint3'
import {
  PROF_PAYMENT_CONFIG, INCOTERM_OPTIONS, CURRENCY_OPTIONS, calcTotals
} from '@/types/sprint3'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { UserProfile } from '@/types'

interface Props {
  open:          boolean
  onClose:       () => void
  proforma?:     ProformaFull | null
  clients:       { id: string; company_name: string; country: string }[]
  quotations:    { id: string; number: string; client_id: string; status_v3: string }[]
  users:         Pick<UserProfile, 'id' | 'full_name'>[]
  isAdminOrLead: boolean
}

const today = new Date().toISOString().split('T')[0]
const validUntil = new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0]

export default function ProformaModal({
  open, onClose, proforma, clients, quotations, users, isAdminOrLead
}: Props) {
  const isEdit = !!proforma
  const [items, setItems] = useState<LineItem[]>(proforma?.items ?? [])
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  useEffect(() => { setItems(proforma?.items ?? []) }, [proforma])

  const { register, handleSubmit, watch, control, formState: { isSubmitting } } = useForm({
    defaultValues: proforma ? {
      client_id:        proforma.client_id,
      quotation_id:     proforma.quotation_id ?? '',
      assigned_to:      proforma.assigned_to ?? '',
      status_v3:        proforma.status_v3,
      issued_date:      proforma.issued_date,
      valid_until:      proforma.valid_until,
      currency:         proforma.currency,
      incoterm:         proforma.incoterm ?? 'DAP',
      delivery_delay:   proforma.delivery_delay ?? '',
      port_destination: proforma.port_destination ?? '',
      warranty_terms:   proforma.warranty_terms ?? 'Garantie fabricant 2 ans',
      payment_terms:    proforma.payment_terms ?? 'Acompte 30% à la commande, solde avant expédition',
      intro_text:       proforma.intro_text ?? '',
      technical_notes:  proforma.technical_notes ?? '',
      notes:            proforma.notes ?? '',
      discount_pct:     0,
      acompte_pct:      proforma.acompte_pct ?? 30,
      bank_name:        proforma.bank_name ?? '',
      bank_account:     proforma.bank_account ?? '',
      bank_swift:       proforma.bank_swift ?? '',
      bank_iban:        proforma.bank_iban ?? '',
      bank_address:     proforma.bank_address ?? '',
      has_signature:    proforma.has_signature ?? false,
      has_stamp:        proforma.has_stamp ?? false,
    } : {
      issued_date:    today,
      valid_until:    validUntil,
      currency:       'USD',
      incoterm:       'DAP',
      warranty_terms: 'Garantie fabricant 2 ans',
      payment_terms:  'Acompte 30% à la commande, solde avant expédition',
      acompte_pct:    30,
      discount_pct:   0,
    },
  })

  const currency    = watch('currency')
  const discountPct = Number(watch('discount_pct') || 0)
  const acomptePct  = Number(watch('acompte_pct') || 30)
  const clientId    = watch('client_id')

  const { subtotal, discountAmount, totalSell } = calcTotals(items, discountPct)
  const acompteAmount = totalSell * acomptePct / 100
  const sym = { USD:'$', EUR:'€', TRY:'₺', XOF:'FCFA' }[currency] ?? currency

  const filteredQuotations = quotations.filter(q =>
    q.status_v3 === 'approuvee' && (!clientId || q.client_id === clientId)
  )

  async function onSubmit(data: any) {
    if (items.length === 0) { toast.error('Ajoutez au moins un article'); return }
    const payload = {
      ...data,
      discount_pct: Number(data.discount_pct ?? 0),
      acompte_pct:  Number(data.acompte_pct ?? 30),
      has_signature: Boolean(data.has_signature),
      has_stamp:     Boolean(data.has_stamp),
      items: items.map((item, i) => ({ ...item, sort_order: i })),
    }
    const result = await createProformaAction(payload as never)
    if (result.error) { toast.error(result.error); return }
    toast.success('Proforma créée')
    onClose()
  }

  async function handleStatusChange(status: ProformaPaymentStatus) {
    if (!proforma) return
    const result = await updateProformaStatusAction(proforma.id, status)
    if (result.error) toast.error(result.error)
    else { toast.success('Statut de paiement mis à jour'); setStatusMenuOpen(false) }
  }

  async function handlePDF() {
    if (!proforma) return
    setIsGeneratingPDF(true)
    try {
      await generateProformaPDF({ ...proforma, items, currency })
      toast.success('PDF généré')
    } catch (err) {
      toast.error('Erreur PDF: ' + String(err))
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Proforma ${proforma?.number}` : 'Nouvelle Facture Proforma'}
      subtitle={isEdit
        ? `${proforma?.client?.company_name} · ${formatDate(proforma?.issued_date)}`
        : undefined
      }
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">

        {/* Action bar */}
        {isEdit && (
          <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100">
            <div className="relative">
              <button type="button" onClick={() => setStatusMenuOpen(p => !p)}
                className="flex items-center gap-2 text-sm">
                {proforma?.status_v3 && (
                  <StatusBadge
                    label={PROF_PAYMENT_CONFIG[proforma.status_v3].label}
                    color={PROF_PAYMENT_CONFIG[proforma.status_v3].color}
                  />
                )}
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {statusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-100
                                 rounded-lg shadow-lg z-20 py-1 animate-fade-up">
                    {Object.entries(PROF_PAYMENT_CONFIG).map(([status, { label, color }]) => (
                      <button key={status} type="button"
                        onClick={() => handleStatusChange(status as ProformaPaymentStatus)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                        <StatusBadge label={label} color={color} size="xs" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex-1" />
            <button type="button" onClick={handlePDF} disabled={isGeneratingPDF}
              className="btn btn-outline btn-sm">
              <Download className="w-3.5 h-3.5" />
              {isGeneratingPDF ? 'Génération...' : 'PDF Proforma'}
            </button>
          </div>
        )}

        <div className="p-6 space-y-6 overflow-y-auto flex-1">

          {/* En-tête */}
          <FormSection title="En-tête du document">
            <FormGrid cols={2}>
              <div>
                <label className="label">Client <span className="text-red-400">*</span></label>
                <select {...register('client_id', { required: true })} className="input">
                  <option value="">— Sélectionner un client —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name} ({c.country})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Quotation liée (approuvée)</label>
                <select {...register('quotation_id')} className="input">
                  <option value="">— Aucune —</option>
                  {filteredQuotations.map(q => (
                    <option key={q.id} value={q.id}>{q.number}</option>
                  ))}
                </select>
              </div>
            </FormGrid>
            <FormGrid cols={3}>
              <Input label="Date d'émission" type="date" required {...register('issued_date')} />
              <Input label="Valide jusqu'au" type="date" {...register('valid_until')} />
              <Select label="Devise" {...register('currency')}
                options={CURRENCY_OPTIONS.map(c => ({ value: c.value, label: `${c.value} ${c.symbol}` }))} />
            </FormGrid>
            <FormGrid cols={2}>
              <Select label="Commercial assigné" {...register('assigned_to')}
                placeholder="— Non assigné —"
                options={users.map(u => ({ value: u.id, label: u.full_name }))} />
              <Select label="Incoterm" {...register('incoterm')} options={INCOTERM_OPTIONS} />
            </FormGrid>
          </FormSection>

          {/* Conditions */}
          <FormSection title="Conditions commerciales & logistiques">
            <FormGrid cols={2}>
              <Input label="Délai de livraison" {...register('delivery_delay')} placeholder="ex: 6 à 8 semaines" />
              <Input label="Port de destination" {...register('port_destination')} placeholder="ex: Port d'Abidjan" />
            </FormGrid>
            <FormGrid cols={2}>
              <Input label="Garantie" {...register('warranty_terms')} />
              <Textarea label="Conditions de paiement" {...register('payment_terms')} />
            </FormGrid>
          </FormSection>

          {/* Lignes */}
          <FormSection title="Lignes de produits">
            <LineItemsEditor
              items={items}
              onChange={setItems}
              currency={currency}
              showBuyPrices={isAdminOrLead}
            />
            <div className="flex justify-end mt-3 gap-6">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Remise globale :</label>
                <div className="relative w-20">
                  <input type="number" {...register('discount_pct')} min="0" max="100"
                    className="input text-right pr-6 py-1.5 text-sm" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Acompte :</label>
                <div className="relative w-20">
                  <input type="number" {...register('acompte_pct')} min="0" max="100"
                    className="input text-right pr-6 py-1.5 text-sm" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
            </div>

            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="w-80 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500 py-1">
                    <span>Sous-total HT</span><span>{formatCurrency(subtotal, currency as 'USD')}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-gray-500 py-1">
                      <span>Remise ({discountPct}%)</span>
                      <span className="text-red-500">− {formatCurrency(discountAmount, currency as 'USD')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-navy-900 py-2
                                 bg-navy-900/5 px-3 rounded-md text-base">
                    <span>TOTAL HT</span>
                    <span>{formatCurrency(totalSell, currency as 'USD')}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 py-1.5 bg-amber-50 px-3 rounded-md">
                    <span>Acompte ({acomptePct}%)</span>
                    <span className="font-medium">{formatCurrency(acompteAmount, currency as 'USD')}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 py-1">
                    <span>Solde ({100 - acomptePct}%)</span>
                    <span>{formatCurrency(totalSell - acompteAmount, currency as 'USD')}</span>
                  </div>
                </div>
              </div>
            )}
          </FormSection>

          {/* Informations bancaires */}
          <FormSection title="Informations bancaires">
            <div className="p-3 bg-navy-900/5 rounded-lg text-xs text-navy-900/60 mb-3">
              Ces informations apparaîtront dans le PDF de la facture proforma.
            </div>
            <FormGrid cols={2}>
              <Input label="Nom de la banque" {...register('bank_name')} placeholder="ex: Garanti BBVA" />
              <Input label="SWIFT / BIC" {...register('bank_swift')} placeholder="ex: TGBATRISXXX" />
            </FormGrid>
            <FormGrid cols={2}>
              <Input label="Numéro de compte" {...register('bank_account')} />
              <Input label="IBAN" {...register('bank_iban')} />
            </FormGrid>
            <Input label="Adresse de la banque" {...register('bank_address')} />
          </FormSection>

          {/* Signature / Cachet */}
          <FormSection title="Signature & Cachet">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('has_signature')} className="w-4 h-4 accent-navy-900" />
                <span className="text-sm text-gray-700">Signature incluse dans le PDF</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('has_stamp')} className="w-4 h-4 accent-navy-900" />
                <span className="text-sm text-gray-700">Cachet inclus dans le PDF</span>
              </label>
            </div>
            <Textarea label="Texte d'introduction" {...register('intro_text')}
              placeholder="Objet : Suite à votre demande, nous vous adressons la présente facture proforma..." />
            <Textarea label="Notes techniques" {...register('technical_notes')} />
            <Textarea label="Notes" {...register('notes')} />
          </FormSection>

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100
                       flex-shrink-0 bg-gray-50/50">
          <div className="text-sm font-semibold text-navy-900">
            {items.length > 0 && `Total : ${formatCurrency(totalSell, currency as 'USD')}`}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-outline">Annuler</button>
            <button type="submit" disabled={isSubmitting || isEdit} className="btn btn-primary">
              {isSubmitting ? 'Création...' : isEdit ? 'Lecture seule (modifier depuis la liste)' : 'Créer la proforma'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
