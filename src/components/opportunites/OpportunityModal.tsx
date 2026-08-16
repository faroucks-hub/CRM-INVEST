'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Modal from '@/components/ui/modal/Modal'
import { Input, Select, Textarea, FormGrid, FormSection } from '@/components/ui/form/Fields'
import { createOpportunityAction, updateOpportunityAction, type OppFormData } from '@/lib/actions/opportunities'
import type { UserProfile } from '@/types'
import { PIPELINE_STAGE_LABELS } from '@/types/sprint2'

const schema = z.object({
  name:            z.string().min(1, 'Nom requis'),
  client_id:       z.string().min(1, 'Client requis'),
  assigned_to:     z.string().optional(),
  pipeline_stage:  z.string(),
  estimated_sell:  z.string().optional(),
  currency:        z.string(),
  sector:          z.string().optional(),
  product_type:    z.string().optional(),
  description:     z.string().optional(),
  probability:     z.string().optional(),
  expected_close:  z.string().optional(),
  next_followup:   z.string().optional(),
  lead_source:     z.string().optional(),
  notes:           z.string().optional(),
})

const STAGE_OPTIONS = Object.entries(PIPELINE_STAGE_LABELS).map(([v, l]) => ({ value: v, label: l }))

const PRODUCT_OPTIONS = [
  { value: 'ups_monophase',    label: 'UPS Monophasé' },
  { value: 'ups_triphase',     label: 'UPS Triphasé' },
  { value: 'ups_industriel',   label: 'UPS Industriel' },
  { value: 'redresseur',       label: 'Redresseur' },
  { value: 'onduleur',         label: 'Onduleur' },
  { value: 'batterie_vrla',    label: 'Batteries VRLA' },
  { value: 'batterie_liion',   label: 'Batteries Li-ion' },
  { value: 'systeme_solaire',  label: 'Système Solaire' },
  { value: 'bess',             label: 'BESS / Stockage' },
  { value: 'autre',            label: 'Autre' },
]

const SECTOR_OPTIONS = [
  { value: 'banques_finance',    label: 'Banques & Finance' },
  { value: 'telecommunications', label: 'Télécommunications' },
  { value: 'mines_extraction',   label: 'Mines & Extraction' },
  { value: 'data_centers',       label: 'Data Centers' },
  { value: 'hopitaux_sante',     label: 'Hôpitaux & Santé' },
  { value: 'marine_offshore',    label: 'Marine & Offshore' },
  { value: 'industrie',          label: 'Industrie' },
  { value: 'solaire_energie',    label: 'Solaire & Énergie' },
  { value: 'autre',              label: 'Autre' },
]

const SOURCE_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'salon', label: 'Salon / Événement' },
  { value: 'recommandation', label: 'Recommandation' },
  { value: 'email', label: 'Email entrant' },
  { value: 'site_web', label: 'Site web' },
  { value: 'autre', label: 'Autre' },
]

interface Props {
  open: boolean
  onClose: () => void
  opportunity?: Record<string, unknown> | null
  clients: { id: string; company_name: string; country: string }[]
  users: Pick<UserProfile, 'id' | 'full_name'>[]
  defaultStage?: string
}

export default function OpportunityModal({
  open, onClose, opportunity, clients, users, defaultStage
}: Props) {
  const isEdit = !!opportunity

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm({
      resolver: zodResolver(schema),
      defaultValues: opportunity ? {
        name:           String(opportunity.name ?? ''),
        client_id:      String(opportunity.client_id ?? ''),
        assigned_to:    String(opportunity.assigned_to ?? ''),
        pipeline_stage: String(opportunity.pipeline_stage ?? 'nouveau_lead'),
        estimated_sell: String(opportunity.estimated_sell ?? ''),
        currency:       String(opportunity.currency ?? 'USD'),
        sector:         String(opportunity.sector ?? ''),
        product_type:   String(opportunity.product_type ?? ''),
        description:    String(opportunity.description ?? ''),
        probability:    String(opportunity.probability ?? '20'),
        expected_close: String(opportunity.expected_close ?? ''),
        next_followup:  String(opportunity.next_followup ?? ''),
        lead_source:    String(opportunity.lead_source ?? ''),
        notes:          String(opportunity.notes ?? ''),
      } : {
        pipeline_stage: defaultStage ?? 'nouveau_lead',
        currency: 'USD',
        probability: '20',
      },
    })

  const probability = watch('probability')

  async function onSubmit(data: any) {
    const payload: OppFormData = {
      name:           data.name,
      client_id:      data.client_id,
      assigned_to:    data.assigned_to || undefined,
      pipeline_stage: data.pipeline_stage,
      estimated_sell: data.estimated_sell ? Number(data.estimated_sell) : undefined,
      currency:       data.currency as OppFormData['currency'],
      sector:         data.sector || undefined,
      product_type:   data.product_type || undefined,
      description:    data.description || undefined,
      probability:    data.probability ? Number(data.probability) : 20,
      expected_close: data.expected_close || undefined,
      next_followup:  data.next_followup || undefined,
      lead_source:    data.lead_source || undefined,
      notes:          data.notes || undefined,
    }

    const result = isEdit
      ? await updateOpportunityAction(String(opportunity!.id), payload)
      : await createOpportunityAction(payload)

    if (result.error) { toast.error(result.error); return }
    toast.success(isEdit ? 'Opportunité mise à jour' : 'Opportunité créée')
    reset(); onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier l\'opportunité' : 'Nouvelle opportunité'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">

        <FormSection title="Informations de base">
          <Input label="Nom de l'opportunité" required
            {...register('name')} error={errors.name as never}
            placeholder="ex: UPS 100 kVA — Banque Abidjan" />
          <FormGrid cols={2}>
            <div>
              <label className="label">Client <span className="text-red-400">*</span></label>
              <select {...register('client_id')}
                className="input">
                <option value="">— Sélectionner un client —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.country})
                  </option>
                ))}
              </select>
            </div>
            <Select label="Étape pipeline" required
              {...register('pipeline_stage')} options={STAGE_OPTIONS} />
          </FormGrid>
        </FormSection>

        <FormSection title="Produit & Secteur">
          <FormGrid cols={2}>
            <Select label="Type de produit"
              {...register('product_type')} options={PRODUCT_OPTIONS} placeholder="— Type —" />
            <Select label="Secteur"
              {...register('sector')} options={SECTOR_OPTIONS} placeholder="— Secteur —" />
          </FormGrid>
          <Textarea label="Description / Besoin technique"
            {...register('description')}
            placeholder="Décrivez le besoin technique et le contexte du projet..." />
        </FormSection>

        <FormSection title="Valeur & Commercial">
          <FormGrid cols={3}>
            <Input label="Montant estimé (vente)"
              type="number" {...register('estimated_sell')}
              placeholder="ex: 85000" />
            <Select label="Devise" {...register('currency')} options={[
              { value: 'USD', label: 'USD ($)' },
              { value: 'EUR', label: 'EUR (€)' },
              { value: 'TRY', label: 'TRY (₺)' },
              { value: 'XOF', label: 'XOF (FCFA)' },
            ]} />
            <div>
              <label className="label">Probabilité : {probability}%</label>
              <input type="range" min="0" max="100" step="5"
                {...register('probability')}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer
                           bg-gray-200 accent-gold-400" />
              <div className="flex justify-between text-2xs text-gray-400 mt-0.5">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </FormGrid>
          <FormGrid cols={2}>
            <Select label="Commercial assigné"
              {...register('assigned_to')}
              placeholder="— Non assigné —"
              options={users.map(u => ({ value: u.id, label: u.full_name }))} />
            <Select label="Source" {...register('lead_source')}
              options={SOURCE_OPTIONS} placeholder="— Source —" />
          </FormGrid>
        </FormSection>

        <FormSection title="Suivi">
          <FormGrid cols={2}>
            <Input label="Date de clôture prévue"
              type="date" {...register('expected_close')} />
            <Input label="Prochaine relance"
              type="date" {...register('next_followup')} />
          </FormGrid>
          <Textarea label="Notes" {...register('notes')}
            placeholder="Notes internes sur l'opportunité..." />
        </FormSection>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn btn-outline">Annuler</button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer l\'opportunité'}
          </button>
        </div>

      </form>
    </Modal>
  )
}
