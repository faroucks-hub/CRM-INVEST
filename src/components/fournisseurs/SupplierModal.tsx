'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Modal from '@/components/ui/modal/Modal'
import { Input, Select, Textarea, FormGrid, FormSection } from '@/components/ui/form/Fields'
import { createSupplierAction, updateSupplierAction, type SupplierFormData } from '@/lib/actions/suppliers'

const schema = z.object({
  company_name: z.string().min(1, 'Nom requis'),
  country: z.string().min(1, 'Pays requis'),
  city: z.string().optional(),
  website: z.string().optional(),
  contact_name: z.string().optional(),
  contact_role: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  whatsapp: z.string().optional(),
  supplier_type: z.string().default('fabricant_turc'),
  products_supplied: z.string().optional(),
  relationship_start: z.string().optional(),
  contract_name: z.string().optional(),
  contract_document_url: z.string().optional(),
  contract_expiry: z.string().optional(),
  lead_time_days: z.number().optional(),
  is_active: z.boolean().default(true),
  is_preferred: z.boolean().default(false),
  notes: z.string().optional(),
})

const PARTNER_TYPE_OPTIONS = [
  { value: 'fabricant_turc', label: 'Fabricant — Turquie' },
  { value: 'fabricant_hors_turquie', label: 'Fabricant — international' },
  { value: 'partenaire_technique', label: 'Partenaire technique' },
  { value: 'sous_traitant', label: 'Sous-traitant' },
  { value: 'distributeur', label: 'Distributeur' },
  { value: 'logistique', label: 'Logistique / Transitaire' },
  { value: 'agent_representant', label: 'Agent / Représentant' },
  { value: 'prestataire_service', label: 'Prestataire de services' },
  { value: 'bureau_etudes', label: 'Bureau d’études / Ingénierie' },
  { value: 'partenaire_strategique', label: 'Partenaire stratégique' },
]

interface Props {
  open: boolean
  onClose: () => void
  supplier?: Record<string, unknown> | null
}

export default function SupplierModal({ open, onClose, supplier }: Props) {
  const isEdit = !!supplier
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SupplierFormData>({
    resolver: zodResolver(schema),
    defaultValues: supplier ? {
      company_name: String(supplier.company_name ?? ''),
      country: String(supplier.country ?? 'Turquie'),
      city: String(supplier.city ?? ''),
      website: String(supplier.website ?? ''),
      contact_name: String(supplier.contact_name ?? ''),
      contact_role: String(supplier.contact_role ?? ''),
      contact_email: String(supplier.contact_email ?? ''),
      contact_phone: String(supplier.contact_phone ?? ''),
      whatsapp: String(supplier.whatsapp ?? supplier.whatsapp ?? ''),
      supplier_type: String(supplier.supplier_type ?? 'fabricant_turc'),
      products_supplied: String(supplier.products_supplied ?? ''),
      relationship_start: String(supplier.relationship_start ?? ''),
      contract_name: String(supplier.contract_name ?? ''),
      contract_document_url: String(supplier.contract_document_url ?? ''),
      contract_expiry: String(supplier.contract_expiry ?? ''),
      lead_time_days: Number(supplier.lead_time_days ?? 0) || undefined,
      is_active: Boolean(supplier.is_active ?? true),
      is_preferred: Boolean(supplier.is_preferred ?? false),
      notes: String(supplier.notes ?? ''),
    } : {
      country: 'Turquie',
      supplier_type: 'fabricant_turc',
      is_active: true,
      is_preferred: false,
      relationship_start: new Date().toISOString().slice(0, 10),
    },
  })

  async function onSubmit(data: SupplierFormData) {
    const result = isEdit
      ? await updateSupplierAction(String(supplier!.id), data)
      : await createSupplierAction(data)
    if (result.error) { toast.error(result.error); return }
    toast.success(isEdit ? 'Partenaire mis à jour' : 'Partenaire ajouté')
    reset(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le partenaire' : 'Nouveau partenaire'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
        <FormSection title="Entreprise">
          <FormGrid cols={2}>
            <Input label="Nom de l’entreprise" required {...register('company_name')} error={errors.company_name} placeholder="ex : EPC Energy" />
            <Select label="Type de partenaire" required {...register('supplier_type')} options={PARTNER_TYPE_OPTIONS} />
          </FormGrid>
          <FormGrid cols={3}>
            <Input label="Pays" required {...register('country')} error={errors.country} />
            <Input label="Ville" {...register('city')} />
            <Input label="Début de relation" type="date" {...register('relationship_start')} />
          </FormGrid>
          <Input label="Produit / activité" {...register('products_supplied')} placeholder="UPS, batteries, transformateurs, transport…" />
        </FormSection>

        <FormSection title="Contact principal">
          <FormGrid cols={2}>
            <Input label="Nom & prénom" {...register('contact_name')} />
            <Input label="Fonction / responsabilité" {...register('contact_role')} placeholder="Sales Manager, Directeur…" />
          </FormGrid>
          <FormGrid cols={2}>
            <Input label="Email" type="email" {...register('contact_email')} />
            <Input label="Téléphone / WhatsApp" {...register('contact_phone')} />
          </FormGrid>
          <Input label="Site web" {...register('website')} placeholder="https://..." />
        </FormSection>

        <FormSection title="Contrat / accord">
          <FormGrid cols={2}>
            <Input label="Nom ou référence du contrat" {...register('contract_name')} placeholder="NDA, accord commercial, contrat cadre…" />
            <Input label="Date d’expiration" type="date" {...register('contract_expiry')} />
          </FormGrid>
          <Input label="Document du contrat" {...register('contract_document_url')} placeholder="Lien Drive / URL du document" />
        </FormSection>

        <FormSection title="Notes">
          <Textarea label="Notes internes" {...register('notes')} placeholder="Informations utiles sur la relation, conditions particulières…" />
          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('is_active')} className="w-4 h-4 accent-navy-900" />
              <span className="text-sm text-gray-700">Partenaire actif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('is_preferred')} className="w-4 h-4 accent-gold-400" />
              <span className="text-sm text-gray-700">Partenaire stratégique / préféré</span>
            </label>
          </div>
        </FormSection>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn btn-outline">Annuler</button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Ajouter le partenaire'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
