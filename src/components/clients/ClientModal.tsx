'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Modal from '@/components/ui/modal/Modal'
import { Input, Select, Textarea, FormGrid, FormSection } from '@/components/ui/form/Fields'
import { createClientAction, updateClientAction, type ClientFormData } from '@/lib/actions/clients'
import type { UserProfile } from '@/types'

const schema = z.object({
  company_name:     z.string().min(1, 'Nom de société requis'),
  trade_name:       z.string().optional(),
  status:           z.string(),
  country:          z.string().min(1, 'Pays requis'),
  city:             z.string().optional(),
  website:          z.string().optional(),
  sector:           z.string().optional(),
  contact_name:     z.string().optional(),
  contact_title:    z.string().optional(),
  contact_email:    z.string().optional(),
  contact_phone:    z.string().optional(),
  contact_whatsapp: z.string().optional(),
  communication_language: z.enum(['fr', 'en', 'unknown']),
  contact2_name:    z.string().optional(),
  contact2_email:   z.string().optional(),
  contact2_phone:   z.string().optional(),
  assigned_to:      z.string().optional(),
  lead_source:      z.string().optional(),
  currency_pref:    z.string(),
  notes:            z.string().optional(),
  technical_notes:  z.string().optional(),
})

const STATUS_OPTIONS = [
  { value: 'prospect',     label: 'Prospect' },
  { value: 'qualifie',     label: 'Qualifié' },
  { value: 'actif',        label: 'Client actif' },
  { value: 'distributeur', label: 'Distributeur' },
  { value: 'partenaire',   label: 'Partenaire' },
  { value: 'inactif',      label: 'Inactif' },
  { value: 'perdu',        label: 'Perdu' },
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
  { value: 'linkedin',       label: 'LinkedIn' },
  { value: 'whatsapp',       label: 'WhatsApp' },
  { value: 'salon',          label: 'Salon / Événement' },
  { value: 'recommandation', label: 'Recommandation' },
  { value: 'email',          label: 'Email entrant' },
  { value: 'site_web',       label: 'Site web' },
  { value: 'autre',          label: 'Autre' },
]

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'TRY', label: 'TRY (₺)' },
  { value: 'XOF', label: 'XOF (FCFA)' },
]

const LANGUAGE_OPTIONS = [
  { value: 'unknown', label: 'À déterminer au moment de l’envoi' },
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
]

interface Props {
  open: boolean
  onClose: () => void
  client?: Record<string, unknown> | null
  users: Pick<UserProfile, 'id' | 'full_name'>[]
  isAdminOrLead: boolean
}

export default function ClientModal({ open, onClose, client, users, isAdminOrLead }: Props) {
  const isEdit = !!client

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<ClientFormData>({
      resolver: zodResolver(schema),
      defaultValues: client ? {
        company_name:     String(client.company_name ?? ''),
        trade_name:       String(client.trade_name ?? ''),
        status:           String(client.status ?? 'prospect'),
        country:          String(client.country ?? ''),
        city:             String(client.city ?? ''),
        website:          String(client.website ?? ''),
        sector:           String(client.sector ?? ''),
        contact_name:     String(client.contact_name ?? ''),
        contact_title:    String(client.contact_title ?? ''),
        contact_email:    String(client.contact_email ?? ''),
        contact_phone:    String(client.contact_phone ?? ''),
        contact_whatsapp: String(client.contact_whatsapp ?? ''),
        communication_language: String(client.communication_language ?? 'unknown') as 'fr' | 'en' | 'unknown',
        contact2_name:    String(client.contact2_name ?? ''),
        contact2_email:   String(client.contact2_email ?? ''),
        contact2_phone:   String(client.contact2_phone ?? ''),
        assigned_to:      String(client.assigned_to ?? ''),
        lead_source:      String(client.lead_source ?? ''),
        currency_pref:    String(client.currency_pref ?? 'USD'),
        notes:            String(client.notes ?? ''),
        technical_notes:  String(client.technical_notes ?? ''),
      } : {
        status: 'prospect',
        currency_pref: 'USD',
        communication_language: 'unknown',
      },
    })

  async function onSubmit(data: ClientFormData) {
      console.log('SUBMIT DATA:', data)
      const result = isEdit
      ? await updateClientAction(String(client!.id), data)
      : await createClientAction(data)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(isEdit ? 'Client mis à jour' : 'Client créé')
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier le client' : 'Nouveau client / prospect'}
      subtitle={isEdit ? String(client!.company_name) : 'Remplissez les informations du nouveau client'}
      size="lg"
    >
      <form
  onSubmit={handleSubmit(
    onSubmit,
    (errors) => {
      console.log('FORM VALIDATION ERRORS:', errors)
      toast.error('Veuillez vérifier les champs obligatoires.')
    }
  )}
  className="p-6 space-y-6"
>
        {/* Informations société */}
        <FormSection title="Informations société">
          <FormGrid cols={2}>
            <Input
              label="Nom de la société"
              required
              {...register('company_name')}
              error={errors.company_name}
              placeholder="ex: Banque Nationale Côte d'Ivoire"
            />
            <Input label="Nom commercial (si différent)"
              {...register('trade_name')} placeholder="ex: BNCI" />
          </FormGrid>
          <FormGrid cols={3}>
            <Select label="Statut" required
              {...register('status')} options={STATUS_OPTIONS} />
            <Select label="Secteur"
              {...register('sector')} options={SECTOR_OPTIONS} placeholder="— Secteur —" />
            <Select label="Devise préférée"
              {...register('currency_pref')} options={CURRENCY_OPTIONS} />
          </FormGrid>
          <FormGrid cols={3}>
            <Input label="Pays" required {...register('country')} placeholder="Côte d'Ivoire" />
            <Input label="Ville" {...register('city')} placeholder="Abidjan" />
            <Input label="Site web" {...register('website')} placeholder="https://..." />
          </FormGrid>
        </FormSection>

        {/* Contact principal */}
        <FormSection title="Contact principal">
          <FormGrid cols={2}>
            <Input label="Nom & prénom" {...register('contact_name')} placeholder="Jean Dupont" />
            <Input label="Titre / Poste" {...register('contact_title')} placeholder="Directeur Technique" />
          </FormGrid>
          <FormGrid cols={3}>
            <Input label="Email" type="email" {...register('contact_email')} placeholder="j.dupont@..." />
            <Input label="Téléphone" {...register('contact_phone')} placeholder="+225 07..." />
            <Input label="WhatsApp" {...register('contact_whatsapp')} placeholder="+225 07..." />
          </FormGrid>
          <Select label="Langue de communication"
            {...register('communication_language')} options={LANGUAGE_OPTIONS} />
        </FormSection>

        {/* Contact secondaire */}
        <FormSection title="Contact secondaire (optionnel)">
          <FormGrid cols={3}>
            <Input label="Nom" {...register('contact2_name')} />
            <Input label="Email" type="email" {...register('contact2_email')} />
            <Input label="Téléphone" {...register('contact2_phone')} />
          </FormGrid>
        </FormSection>

        {/* Commercial & Source */}
        <FormSection title="Suivi commercial">
          <FormGrid cols={2}>
            <Select
              label="Commercial assigné"
              {...register('assigned_to')}
              placeholder="— Non assigné —"
              options={users.map(u => ({ value: u.id, label: u.full_name }))}
            />
            <Select label="Source du lead"
              {...register('lead_source')} options={SOURCE_OPTIONS} placeholder="— Source —" />
          </FormGrid>
          <Textarea label="Notes" {...register('notes')} placeholder="Notes générales..." />
          {isAdminOrLead && (
            <Textarea
              label="Notes techniques (confidentiel)"
              {...register('technical_notes')}
              placeholder="Réseau électrique, puissance installée, infrastructure existante..."
            />
          )}
        </FormSection>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn btn-outline">
            Annuler
          </button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le client'}
          </button>
        </div>

      </form>
    </Modal>
  )
}
