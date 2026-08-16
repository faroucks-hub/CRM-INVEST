'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Modal from '@/components/ui/modal/Modal'
import { FormGrid, FormSection } from '@/components/ui/form/Fields'
import {
  createProjectAction,
  updateProjectAction,
  type ProjectPayload,
} from '@/lib/actions/projects'

interface Props {
  open: boolean
  onClose: () => void
  project?: Record<string, unknown> | null
  clients: { id: string; company_name: string; country: string }[]
  quotations: { id: string; number: string; client_id: string }[]
  proformas: {
    id: string
    number: string
    client_id: string
    total_sell: number
    currency: string
    quotation_id?: string
    assigned_to?: string
    incoterm?: string
    port_destination?: string
    delivery_delay?: string
    notes?: string
  }[]
  users: { id: string; full_name: string }[]
  isAdminOrLead: boolean
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function addDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function ProjectModal({
  open,
  onClose,
  project,
  clients,
  quotations,
  proformas,
  users,
  isAdminOrLead,
}: Props) {
  const router = useRouter()
  const isEdit = !!project
  const [saving, setSaving] = useState(false)

  const [f, setF] = useState({
    name: String(project?.name ?? ''),
    client_id: String(project?.client_id ?? ''),
    assigned_to: String(project?.assigned_to ?? ''),
    quotation_id: String(project?.quotation_id ?? ''),
    proforma_id: String(project?.proforma_id ?? ''),
    status: String(project?.status ?? 'en_attente'),
    contract_value: String(project?.contract_value ?? ''),
    currency: String(project?.currency ?? 'USD'),
    order_date: String(project?.order_date ?? ''),
    expected_delivery: String(project?.expected_delivery ?? ''),
    incoterm: String(project?.incoterm ?? 'DAP'),
    port_destination: String(project?.port_destination ?? ''),
    country: String(project?.country ?? ''),
    shipper: String(project?.shipper ?? ''),
    tracking_number: String(project?.tracking_number ?? ''),
    warranty_months: String(project?.warranty_months ?? '24'),
    warranty_start: String(project?.warranty_start ?? ''),
    warranty_end: String(project?.warranty_end ?? ''),
    notes: String(project?.notes ?? ''),
    internal_notes: String(project?.internal_notes ?? ''),
  })

  const up =
    (k: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      setF((prev) => ({ ...prev, [k]: e.target.value }))

  function handleClientChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const value = e.target.value

    setF((prev) => ({
      ...prev,
      client_id: value,
      quotation_id: '',
      proforma_id: '',
    }))
  }

  function handleProformaChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const value = e.target.value
    const p = proformas.find((x) => x.id === value)

    if (!p) {
      setF((prev) => ({
        ...prev,
        proforma_id: '',
      }))
      return
    }

    const client = clients.find((c) => c.id === p.client_id)

    setF((prev) => ({
      ...prev,
      proforma_id: value,
      client_id: p.client_id,
      quotation_id: p.quotation_id ?? '',
      assigned_to: p.assigned_to ?? prev.assigned_to,
      contract_value: String(p.total_sell ?? ''),
      currency: p.currency ?? 'USD',
      incoterm: p.incoterm ?? prev.incoterm,
      port_destination: p.port_destination ?? prev.port_destination,
      country: client?.country ?? prev.country,
      notes: p.notes ?? prev.notes,
      name:
        prev.name ||
        `Projet ${p.number} - ${client?.company_name ?? ''}`,
      order_date: prev.order_date || today(),
      expected_delivery: prev.expected_delivery || addDays(45),
    }))

    toast.success('Proforma importée dans le projet')
  }

  async function handleSave() {
    if (!f.client_id || !f.name) {
      toast.error('Client et nom requis')
      return
    }

    setSaving(true)

    const payload: ProjectPayload = {
      name: f.name,
      client_id: f.client_id,
      assigned_to: f.assigned_to || undefined,
      quotation_id: f.quotation_id || undefined,
      proforma_id: f.proforma_id || undefined,
      status: f.status,
      contract_value: f.contract_value
        ? Number(f.contract_value)
        : undefined,
      currency: f.currency,
      order_date: f.order_date || undefined,
      expected_delivery: f.expected_delivery || undefined,
      incoterm: f.incoterm,
      port_destination: f.port_destination || undefined,
      country: f.country || undefined,
      shipper: f.shipper || undefined,
      tracking_number: f.tracking_number || undefined,
      warranty_months: Number(f.warranty_months) || 24,
      warranty_start: f.warranty_start || undefined,
      warranty_end: f.warranty_end || undefined,
      notes: f.notes || undefined,
      internal_notes: f.internal_notes || undefined,
    }

    const r = isEdit
      ? await updateProjectAction(String(project!.id), payload)
      : await createProjectAction(payload)

    setSaving(false)

    if (r.error) {
      toast.error(r.error)
      return
    }

    toast.success(
      isEdit ? 'Projet mis à jour' : 'Projet créé avec les 15 étapes'
    )

    onClose()
    router.refresh()
  }

  const filtQ = f.client_id
    ? quotations.filter((q) => q.client_id === f.client_id)
    : quotations

  const filtP = f.client_id
    ? proformas.filter((p) => p.client_id === f.client_id)
    : proformas

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier le projet' : 'Nouveau projet'}
      subtitle="Toutes les étapes du workflow seront créées automatiquement"
      size="xl"
    >
      <div className="p-6 space-y-5">
        <FormSection title="Informations générales">
          <div>
            <label className="label">
              Nom du projet <span className="text-red-400">*</span>
            </label>

            <input
              className="input"
              value={f.name}
              onChange={up('name')}
              placeholder="ex: UPS 100 kVA — Banque Abidjan"
            />
          </div>

          <FormGrid cols={2}>
            <div>
              <label className="label">
                Client <span className="text-red-400">*</span>
              </label>

              <select
                className="input"
                value={f.client_id}
                onChange={handleClientChange}
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
              <label className="label">Commercial assigné</label>

              <select
                className="input"
                value={f.assigned_to}
                onChange={up('assigned_to')}
              >
                <option value="">— Non assigné —</option>

                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>
          </FormGrid>

          <FormGrid cols={2}>
            <div>
              <label className="label">Quotation liée</label>

              <select
                className="input"
                value={f.quotation_id}
                onChange={up('quotation_id')}
              >
                <option value="">— Aucune —</option>

                {filtQ.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Proforma liée</label>

              <select
                className="input"
                value={f.proforma_id}
                onChange={handleProformaChange}
              >
                <option value="">— Aucune —</option>

                {filtP.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.number}
                  </option>
                ))}
              </select>
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title="Valeur & Dates">
          <FormGrid cols={3}>
            <div>
              <label className="label">Valeur contrat</label>

              <input
                type="number"
                className="input"
                value={f.contract_value}
                onChange={up('contract_value')}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="label">Devise</label>

              <select
                className="input"
                value={f.currency}
                onChange={up('currency')}
              >
                {['USD', 'EUR', 'TRY', 'XOF'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Statut</label>

              <select
                className="input"
                value={f.status}
                onChange={up('status')}
              >
                {[
                  ['en_attente', 'En attente'],
                  ['en_cours', 'En cours'],
                  ['en_retard', 'En retard'],
                  ['livre', 'Livré'],
                  ['cloture', 'Clôturé'],
                  ['annule', 'Annulé'],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </FormGrid>

          <FormGrid cols={2}>
            <div>
              <label className="label">Date de commande</label>

              <input
                type="date"
                className="input"
                value={f.order_date}
                onChange={up('order_date')}
              />
            </div>

            <div>
              <label className="label">Livraison prévue</label>

              <input
                type="date"
                className="input"
                value={f.expected_delivery}
                onChange={up('expected_delivery')}
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title="Logistique">
          <FormGrid cols={3}>
            <div>
              <label className="label">Incoterm</label>

              <select
                className="input"
                value={f.incoterm}
                onChange={up('incoterm')}
              >
                {[
                  'EXW',
                  'FCA',
                  'CPT',
                  'CIP',
                  'DAP',
                  'DPU',
                  'DDP',
                  'FAS',
                  'FOB',
                  'CFR',
                  'CIF',
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Port de destination</label>

              <input
                className="input"
                value={f.port_destination}
                onChange={up('port_destination')}
                placeholder="ex: Abidjan"
              />
            </div>

            <div>
              <label className="label">Pays destination</label>

              <input
                className="input"
                value={f.country}
                onChange={up('country')}
                placeholder="ex: Côte d'Ivoire"
              />
            </div>
          </FormGrid>

          <FormGrid cols={2}>
            <div>
              <label className="label">Transporteur</label>

              <input
                className="input"
                value={f.shipper}
                onChange={up('shipper')}
                placeholder="ex: MSC"
              />
            </div>

            <div>
              <label className="label">Numéro de suivi</label>

              <input
                className="input"
                value={f.tracking_number}
                onChange={up('tracking_number')}
                placeholder="ex: MSCUXXXXXXXXX"
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title="Garantie">
          <FormGrid cols={3}>
            <div>
              <label className="label">Durée garantie (mois)</label>

              <input
                type="number"
                className="input"
                value={f.warranty_months}
                onChange={up('warranty_months')}
              />
            </div>

            <div>
              <label className="label">Début garantie</label>

              <input
                type="date"
                className="input"
                value={f.warranty_start}
                onChange={up('warranty_start')}
              />
            </div>

            <div>
              <label className="label">Fin garantie</label>

              <input
                type="date"
                className="input"
                value={f.warranty_end}
                onChange={up('warranty_end')}
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title="Notes">
          <textarea
            className="input min-h-[60px] resize-none text-sm"
            value={f.notes}
            onChange={up('notes')}
            placeholder="Notes générales..."
          />

          {isAdminOrLead && (
            <textarea
              className="input min-h-[50px] resize-none text-sm border-amber-200"
              value={f.internal_notes}
              onChange={up('internal_notes')}
              placeholder="Notes internes (non partagées)..."
            />
          )}
        </FormSection>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn btn-outline">
            Annuler
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving
              ? 'Enregistrement...'
              : isEdit
                ? 'Mettre à jour'
                : 'Créer le projet'}
          </button>
        </div>
      </div>
    </Modal>
  )
}