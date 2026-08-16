'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { FileText, Copy, Download, ChevronDown } from 'lucide-react'
import Modal from '@/components/ui/modal/Modal'
import { Input, Select, Textarea, FormGrid, FormSection } from '@/components/ui/form/Fields'
import LineItemsEditor from './LineItemsEditor'
import {
  createQuotationAction, updateQuotationAction,
  updateQuotationStatusAction, duplicateQuotationAction
} from '@/lib/actions/documents'
import { generateQuotationPDF } from '@/lib/pdf/generator'
import type { LineItem, QuotationFull, QuotationStatus } from '@/types/sprint3'
import {
  QUOT_STATUS_CONFIG, INCOTERM_OPTIONS, CURRENCY_OPTIONS, calcTotals
} from '@/types/sprint3'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { UserProfile } from '@/types'

const DEFAULT_VALID_DAYS = 30

interface Props {
  open:          boolean
  onClose:       () => void
  quotation?:    QuotationFull | null
  clients:       { id: string; company_name: string; country: string }[]
  opportunities: { id: string; name: string; client_id: string }[]
  users:         Pick<UserProfile, 'id' | 'full_name'>[]
  isAdminOrLead: boolean
}

export default function QuotationModal({
  open, onClose, quotation, clients, opportunities, users, isAdminOrLead
}: Props) {
  const isEdit = !!quotation

  const today = new Date().toISOString().split('T')[0]
  const validUntil = new Date(Date.now() + DEFAULT_VALID_DAYS * 86400_000)
    .toISOString().split('T')[0]

  const [items, setItems] = useState<LineItem[]>(quotation?.items ?? [])
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isDuplicating, setIsDuplicating]     = useState(false)

  useEffect(() => {
    setItems(quotation?.items ?? [])
  }, [quotation])

  const { register, handleSubmit, watch, control, formState: { errors, isSubmitting } } = useForm({
    defaultValues: quotation ? {
      client_id:       quotation.client_id,
      opportunity_id:  quotation.opportunity_id ?? '',
      assigned_to:     quotation.assigned_to ?? '',
      status_v3:       quotation.status_v3,
      issued_date:     quotation.issued_date,
      valid_until:     quotation.valid_until,
      currency:        quotation.currency,
      incoterm:        quotation.incoterm ?? 'DAP',
      delivery_delay:  quotation.delivery_delay ?? '',
      warranty_terms:  quotation.warranty_terms ?? 'Garantie fabricant 2 ans',
      payment_terms:   quotation.payment_terms ?? 'Acompte 30% à la commande, solde avant expédition',
      intro_text:      quotation.intro_text ?? '',
      technical_notes: quotation.technical_notes ?? '',
      notes:           quotation.notes ?? '',
      internal_notes:  quotation.internal_notes ?? '',
      discount_pct:    quotation.discount_pct ?? 0,
    } : {
      issued_date:    today,
      valid_until:    validUntil,
      currency:       'USD',
      incoterm:       'DAP',
      warranty_terms: 'Garantie fabricant 2 ans',
      payment_terms:  'Acompte 30% à la commande, solde avant expédition',
      discount_pct:   0,
    }
  })

  const currency     = watch('currency')
  const discountPct  = watch('discount_pct') || 0
  const clientId     = watch('client_id')

  const { subtotal, discountAmount, totalSell } = calcTotals(items, Number(discountPct))
  const sym = { USD:'$', EUR:'€', TRY:'₺', XOF:'FCFA' }[currency] ?? currency

  const filteredOpps = opportunities.filter(o => !clientId || o.client_id === clientId)

  async function onSubmit(data: any) {
    if (items.length === 0) {
      toast.error('Ajoutez au moins une ligne de produit')
      return
    }

    const payload = {
      ...data,
      discount_pct: Number(data.discount_pct ?? 0),
      items: items.map((item, i) => ({ ...item, sort_order: i })),
    }

    const result = isEdit
      ? await updateQuotationAction(quotation!.id, payload as never)
      : await createQuotationAction(payload as never)

    if (result.error) { toast.error(result.error); return }
    toast.success(isEdit ? 'Quotation mise à jour' : `Quotation ${isEdit ? '' : 'créée'}`)
    onClose()
  }

  async function handleStatusChange(status: QuotationStatus) {
    if (!quotation) return
    const result = await updateQuotationStatusAction(quotation.id, status)
    if (result.error) toast.error(result.error)
    else { toast.success('Statut mis à jour'); setStatusMenuOpen(false) }
  }

  async function handleDuplicate() {
    if (!quotation) return
    setIsDuplicating(true)
    const result = await duplicateQuotationAction(quotation.id)
    setIsDuplicating(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('Quotation dupliquée')
    onClose()
  }

  async function handlePDF() {
    if (!quotation) return
    setIsGeneratingPDF(true)
    try {
      await generateQuotationPDF({
        ...quotation,
        items,
        currency,
      })
      toast.success('PDF généré')
    } catch (err) {
      toast.error('Erreur PDF : ' + String(err))
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Quotation ${quotation?.number}` : 'Nouvelle Quotation'}
      subtitle={isEdit
        ? `${quotation?.client?.company_name} · ${formatDate(quotation?.issued_date)}`
        : 'Créez une offre commerciale professionnelle'
      }
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">

        {/* Action bar (edit only) */}
        {isEdit && (
          <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100">
            {/* Status */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setStatusMenuOpen(p => !p)}
                className="flex items-center gap-2 text-sm font-medium"
              >
                {quotation?.status_v3 && (
                  <StatusBadge
                    label={QUOT_STATUS_CONFIG[quotation.status_v3].label}
                    color={QUOT_STATUS_CONFIG[quotation.status_v3].color}
                  />
                )}
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {statusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-100
                                 rounded-lg shadow-lg z-20 py-1 animate-fade-up">
                    {Object.entries(QUOT_STATUS_CONFIG).map(([status, { label, color }]) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusChange(status as QuotationStatus)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <StatusBadge label={label} color={color} size="xs" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <button type="button" onClick={handleDuplicate} disabled={isDuplicating}
              className="btn btn-outline btn-sm">
              <Copy className="w-3.5 h-3.5" />
              {isDuplicating ? 'Duplication...' : 'Dupliquer'}
            </button>
            <button type="button" onClick={handlePDF} disabled={isGeneratingPDF}
              className="btn btn-outline btn-sm">
              <Download className="w-3.5 h-3.5" />
              {isGeneratingPDF ? 'Génération...' : 'PDF'}
            </button>
          </div>
        )}

        <div className="p-6 space-y-6 overflow-y-auto flex-1">

          {/* En-tête document */}
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
              <Select label="Opportunité liée" {...register('opportunity_id')}
                options={filteredOpps.map(o => ({ value: o.id, label: o.name }))}
                placeholder="— Aucune —" />
            </FormGrid>
            <FormGrid cols={3}>
              <Input label="Date d'émission" type="date" required {...register('issued_date')} />
              <Input label="Valide jusqu'au" type="date" required {...register('valid_until')} />
              <Select label="Devise" {...register('currency')} options={CURRENCY_OPTIONS.map(c => ({ value: c.value, label: `${c.value} — ${c.symbol}` }))} />
            </FormGrid>
            <FormGrid cols={2}>
              <Select label="Commercial assigné" {...register('assigned_to')}
                placeholder="— Non assigné —"
                options={users.map(u => ({ value: u.id, label: u.full_name }))} />
              <Select label="Incoterm" {...register('incoterm')} options={INCOTERM_OPTIONS} />
            </FormGrid>
          </FormSection>

          {/* Conditions commerciales */}
          <FormSection title="Conditions commerciales">
            <FormGrid cols={2}>
              <Input label="Délai de livraison" {...register('delivery_delay')}
                placeholder="ex: 6 à 8 semaines" />
              <Input label="Garantie" {...register('warranty_terms')}
                placeholder="Garantie fabricant 2 ans" />
            </FormGrid>
            <Textarea label="Conditions de paiement" {...register('payment_terms')}
              placeholder="Acompte 30% à la commande, solde avant expédition" />
            <Textarea label="Texte d'introduction (optionnel)" {...register('intro_text')}
              placeholder="Objet : Suite à votre demande, nous vous soumettons notre offre..." />
          </FormSection>

          {/* Lignes de produits */}
          <FormSection title={`Lignes de produits / services (${items.length})`}>
            <LineItemsEditor
              items={items}
              onChange={setItems}
              currency={currency}
              showBuyPrices={isAdminOrLead}
            />

            {/* Remise globale */}
            <div className="flex justify-end mt-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500">Remise globale :</label>
                <div className="relative w-24">
                  <Controller
                    name="discount_pct"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        min="0" max="100"
                        className="input text-right pr-7"
                      />
                    )}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
            </div>

            {/* Récapitulatif total */}
            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="w-72 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500 py-1">
                    <span>Sous-total HT</span>
                    <span>{formatCurrency(subtotal, currency as 'USD')}</span>
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
                </div>
              </div>
            )}
          </FormSection>

          {/* Notes */}
          <FormSection title="Notes & informations">
            <Textarea label="Notes techniques" {...register('technical_notes')}
              placeholder="Spécifications techniques, conditions d'installation, prérequis..." />
            <Textarea label="Notes générales" {...register('notes')}
              placeholder="Informations complémentaires pour le client..." />
            {isAdminOrLead && (
              <Textarea label="Notes internes (confidentielles)" {...register('internal_notes')}
                placeholder="Notes visibles uniquement par l'équipe interne..." />
            )}
          </FormSection>

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100
                       flex-shrink-0 bg-gray-50/50">
          <div className="text-sm font-semibold text-navy-900">
            {items.length > 0 && `Total : ${formatCurrency(totalSell, currency as 'USD')}`}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting
                ? 'Enregistrement...'
                : isEdit ? 'Mettre à jour' : 'Créer la quotation'
              }
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
