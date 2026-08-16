'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, FileDown } from 'lucide-react'
import { Input, Select, Textarea, FormGrid, FormSection } from '@/components/ui/form/Fields'
import DocumentLinesEditor, { type LineItem } from './DocumentLinesEditor'
import Modal from '@/components/ui/modal/Modal'
import { createQuotationAction, updateQuotationAction, type QuotationPayload } from '@/lib/actions/quotations'
import type { Quotation } from '@/types/sprint3'
import { INCOTERMS, DEFAULT_PAYMENT_TERMS, DEFAULT_WARRANTY, DEFAULT_DELIVERY } from '@/types/sprint3'
import { downloadQuotationPDF } from '@/lib/pdf/quotation-pdf'

interface Props {
  open:          boolean
  onClose:       () => void
  quotation?:    Quotation | null
  clients:       { id: string; company_name: string; country: string }[]
  opportunities: { id: string; name: string; client_id: string }[]
  users:         { id: string; full_name: string }[]
  isAdminOrLead: boolean
  canSeeCosts:   boolean
  currentUserId: string
  termsProfiles:{id:string;code:string;name:string;version:string;commercial_role:string;status:string;role_summary?:string|null}[]
}

function today() { return new Date().toISOString().split('T')[0] }
function inDays(n: number) { return new Date(Date.now() + n*86400000).toISOString().split('T')[0] }

export default function QuotationForm({
  open, onClose, quotation, clients, opportunities, users, isAdminOrLead, canSeeCosts, currentUserId, termsProfiles,
}: Props) {
  const router   = useRouter()
  const isEdit   = !!quotation
  const [saving, setSaving] = useState(false)

  // Form state
  const [clientId,     setClientId]     = useState(quotation?.client_id ?? '')
  const [oppId,        setOppId]        = useState(quotation?.opportunity_id ?? '')
  const [assignedTo,   setAssignedTo]   = useState(quotation?.assigned_to ?? currentUserId)
  const [issuedDate,   setIssuedDate]   = useState(quotation?.issued_date ?? today())
  const [validUntil,   setValidUntil]   = useState(quotation?.valid_until ?? inDays(30))
  const [currency,     setCurrency]     = useState(quotation?.currency ?? 'USD')
  const [incoterm,     setIncoterm]     = useState(quotation?.incoterm ?? 'DAP')
  const [delivery,     setDelivery]     = useState(quotation?.delivery_delay ?? DEFAULT_DELIVERY)
  const [warranty,     setWarranty]     = useState(quotation?.warranty ?? DEFAULT_WARRANTY)
  const [paymentTerms, setPaymentTerms] = useState(quotation?.payment_terms ?? DEFAULT_PAYMENT_TERMS)
  const [termsProfileId, setTermsProfileId] = useState(quotation?.terms_profile_id ?? '')
  const [commercialRole, setCommercialRole] = useState<'facilitation'|'resale'|'distribution'|''>((quotation?.commercial_role as any) ?? '')
  const [introText,    setIntroText]    = useState(quotation?.intro_text ?? '')
  const [techNotes,    setTechNotes]    = useState(quotation?.technical_notes ?? '')
  const [notes,        setNotes]        = useState(quotation?.notes ?? '')
  const [internalNotes,setInternalNotes]= useState(quotation?.internal_notes ?? '')
  const [discountGlobal, setDiscountGlobal] = useState(quotation?.discount_global ?? 0)

  // Lines
  const [lines, setLines] = useState<LineItem[]>(
    quotation?.lines?.map(l => ({
      id:             l.id,
      sort_order:     l.sort_order,
      designation:    l.designation,
      description:    l.description ?? '',
      reference:      l.reference ?? '',
      quantity:       l.quantity,
      unit:           l.unit,
      unit_price_sell:l.unit_price_sell,
      discount_pct:   l.discount_pct,
      line_total_sell:l.line_total_sell,
      unit_price_buy: l.unit_price_buy ?? undefined,
      notes:          l.notes ?? '',
    })) ?? []
  )

  // Filter opportunities by client
  const filteredOpps = clientId
    ? opportunities.filter(o => o.client_id === clientId)
    : opportunities

  async function handleSave(andClose = true) {
    if (!clientId) { toast.error('Sélectionnez un client'); return }
    setSaving(true)

    const payload: QuotationPayload = {
      client_id:      clientId,
      opportunity_id: oppId || undefined,
      assigned_to:    assignedTo || undefined,
      issued_date:    issuedDate,
      valid_until:    validUntil,
      currency,
      incoterm,
      delivery_delay: delivery,
      warranty,
      payment_terms:  paymentTerms,
      commercial_role: commercialRole || undefined,
      terms_profile_id: termsProfileId || undefined,
      intro_text:     introText || undefined,
      technical_notes:techNotes || undefined,
      notes:          notes || undefined,
      internal_notes: isAdminOrLead ? (internalNotes || undefined) : undefined,
      discount_global:discountGlobal,
      lines:          lines.map((l, i) => ({
        sort_order:     i,
        product_id:     null,
        designation:    l.designation,
        description:    l.description || undefined,
        reference:      l.reference || undefined,
        quantity:       l.quantity,
        unit:           l.unit,
        unit_price_sell:l.unit_price_sell,
        discount_pct:   l.discount_pct,
        line_total_sell:l.line_total_sell,
        unit_price_buy: l.unit_price_buy ?? undefined,
        notes:          l.notes || undefined,
      })),
    }

    const result = isEdit
      ? await updateQuotationAction(quotation!.id, payload)
      : await createQuotationAction(payload)

    setSaving(false)

    if (result.error) { toast.error(result.error); return }
    toast.success(isEdit ? 'Quotation mise à jour' : `Quotation ${(result.data as Quotation).number} créée`)
    if (andClose) onClose()
    router.refresh()
  }

  async function handleDownloadPDF() {
    if (isEdit && quotation) {
      try {
        await downloadQuotationPDF({ ...quotation, lines: lines as Quotation['lines'] })
        toast.success('PDF téléchargé')
      } catch {
        toast.error('Erreur lors de la génération du PDF')
      }
    } else {
      toast.info('Enregistrez d\'abord la quotation')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Modifier ${quotation!.number}` : 'Nouvelle quotation'}
      subtitle="Devis commercial Invest Mentor Énergie"
      size="xl"
    >
      <div className="p-6 space-y-6">

        {/* Client & Relations */}
        <FormSection title="Client & Relations">
          <FormGrid cols={2}>
            <div>
              <label className="label">Client <span className="text-red-400">*</span></label>
              <select className="input" value={clientId}
                onChange={e => { setClientId(e.target.value); setOppId('') }}>
                <option value="">— Sélectionner un client —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name} ({c.country})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Opportunité liée</label>
              <select className="input" value={oppId} onChange={e => setOppId(e.target.value)}>
                <option value="">— Aucune —</option>
                {filteredOpps.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </FormGrid>
          <FormGrid cols={3}>
            <div>
              <label className="label">Commercial assigné</label>
              <select className="input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                <option value="">— Non assigné —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date d'émission</label>
              <input type="date" className="input" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Validité jusqu'au</label>
              <input type="date" className="input" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>
          </FormGrid>
        </FormSection>

        {/* Conditions commerciales */}
        <FormSection title="Conditions commerciales">
          <div className="rounded-lg border border-navy-900/10 bg-navy-900/[0.03] p-4 mb-4">
            <div className="grid md:grid-cols-[1fr_1fr] gap-4">
              <div>
                <label className="label">Cadre commercial *</label>
                <select className="input" value={termsProfileId} onChange={e => {
                  const id=e.target.value; setTermsProfileId(id)
                  const p=termsProfiles.find(x=>x.id===id); setCommercialRole((p?.commercial_role as any) ?? '')
                }}>
                  <option value="">— Sélectionner FAC / RES / DIST —</option>
                  {termsProfiles.map(p => <option key={p.id} value={p.id}>{p.code} · {p.version} · {p.name}{p.status==='draft'?' [DRAFT]':''}</option>)}
                </select>
              </div>
              <div className="text-xs text-gray-500 leading-5 pt-6">
                {termsProfileId ? (termsProfiles.find(x=>x.id===termsProfileId)?.role_summary ?? 'Conditions versionnées rattachées à cette transaction.') : 'Le cadre commercial doit être choisi avant émission définitive. La Proforma héritera automatiquement de cette version.'}
              </div>
            </div>
            {termsProfiles.find(x=>x.id===termsProfileId)?.status==='draft' && <div className="mt-3 text-xs font-medium text-amber-700">⚠ Version DRAFT — ne pas utiliser comme conditions contractuelles externes avant validation juridique.</div>}
          </div>
          <FormGrid cols={3}>
            <div>
              <label className="label">Devise</label>
              <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                {['USD','EUR','TRY','XOF'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Incoterm</label>
              <select className="input" value={incoterm} onChange={e => setIncoterm(e.target.value)}>
                {INCOTERMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Délai de livraison</label>
              <input className="input" value={delivery} onChange={e => setDelivery(e.target.value)}
                placeholder="ex: 6 à 8 semaines" />
            </div>
          </FormGrid>
          <FormGrid cols={2}>
            <div>
              <label className="label">Conditions de paiement</label>
              <input className="input" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
            </div>
            <div>
              <label className="label">Garantie</label>
              <input className="input" value={warranty} onChange={e => setWarranty(e.target.value)} />
            </div>
          </FormGrid>
        </FormSection>

        {/* Texte d'introduction */}
        <FormSection title="Introduction (optionnel)">
          <textarea className="input min-h-[70px] resize-none text-sm" value={introText}
            onChange={e => setIntroText(e.target.value)}
            placeholder="Texte d'introduction du devis, contexte du projet..." />
        </FormSection>

        {/* Lignes */}
        <FormSection title="Lignes de devis">
          <DocumentLinesEditor
            lines={lines}
            onChange={setLines}
            currency={currency}
            discountGlobal={discountGlobal}
            onDiscountChange={setDiscountGlobal}
            canSeeBuyPrice={canSeeCosts}
          />
        </FormSection>

        {/* Notes */}
        <FormSection title="Notes et observations">
          <FormGrid cols={2}>
            <div>
              <label className="label">Notes techniques (affichées sur PDF)</label>
              <textarea className="input min-h-[70px] resize-none text-sm" value={techNotes}
                onChange={e => setTechNotes(e.target.value)}
                placeholder="Notes techniques, précisions sur les produits..." />
            </div>
            <div>
              <label className="label">Conditions générales (affichées sur PDF)</label>
              <textarea className="input min-h-[70px] resize-none text-sm" value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Conditions de livraison, de retour, mentions légales..." />
            </div>
          </FormGrid>
          {isAdminOrLead && (
            <div>
              <label className="label">Notes internes <span className="text-xs text-amber-500 ml-1">(confidentiel — non imprimé)</span></label>
              <textarea className="input min-h-[60px] resize-none text-sm border-amber-200" value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                placeholder="Notes internes pour l'équipe..." />
            </div>
          )}
        </FormSection>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex gap-2">
            {isEdit && (
              <button type="button" onClick={handleDownloadPDF}
                className="btn btn-outline btn-sm">
                <FileDown className="w-3.5 h-3.5" /> PDF
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-outline">Annuler</button>
            <button type="button" onClick={() => handleSave(true)} disabled={saving}
              className="btn btn-primary">
              <Save className="w-4 h-4" />
              {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer la quotation'}
            </button>
          </div>
        </div>

      </div>
    </Modal>
  )
}
