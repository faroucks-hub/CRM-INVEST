'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { FormField, Alert } from '@/components/ui'
import { createClientAction, updateClientAction } from '@/lib/actions/clients'
import type { ClientFormData } from '@/lib/actions/clients'
import {
  CLIENT_STATUS_LABELS, SECTOR_LABELS, LEAD_SOURCE_LABELS,
  IME_COUNTRIES, type UserRole, type Client
} from '@/types'

interface ClientFormProps {
  client?: Partial<Client>
  users?: { id: string; full_name: string }[]
  role: UserRole
  currentUserId: string
  mode: 'create' | 'edit'
}

export default function ClientForm({ client, users = [], role, currentUserId, mode }: ClientFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const isPriv = role === 'admin' || role === 'lead_team'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    setError(null)
    const rawFormData = new FormData(formRef.current)
    const formData = Object.fromEntries(rawFormData.entries()) as ClientFormData

    startTransition(async () => {
      try {
        if (mode === 'create') {
          const res = await createClientAction(formData)
          if (res?.error) { setError(res.error); return }
          toast.success('Client créé')
          router.push('/clients')
        } else if (client?.id) {
          const res = await updateClientAction(client.id, formData)
          if (res?.error) { setError(res.error); return }
          toast.success('Client mis à jour')
          router.push(`/clients/${client.id}`)
        }
      } catch (err: any) {
        setError(err.message ?? 'Une erreur est survenue')
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">

      {error && <Alert type="error" message={error} />}

      {/* ── Informations entreprise ─────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-gray-100">
          Informations entreprise
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nom de l'entreprise" required>
            <input name="company_name" required className="input"
              defaultValue={client?.company_name ?? ''} placeholder="ex: Banque Nationale de Dakar" />
          </FormField>
          <FormField label="Nom commercial (si différent)">
            <input name="trade_name" className="input"
              defaultValue={client?.trade_name ?? ''} />
          </FormField>
          <FormField label="Statut" required>
            <select name="status" required className="input"
              defaultValue={client?.status ?? 'prospect'}>
              {Object.entries(CLIENT_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Secteur d'activité">
            <select name="sector" className="input" defaultValue={client?.sector ?? ''}>
              <option value="">— Sélectionner —</option>
              {Object.entries(SECTOR_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Pays" required>
            <select name="country" required className="input" defaultValue={client?.country ?? ''}>
              <option value="">— Sélectionner —</option>
              {IME_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Ville">
            <input name="city" className="input" defaultValue={client?.city ?? ''} />
          </FormField>
          <FormField label="Site web">
            <input name="website" type="url" className="input"
              defaultValue={client?.website ?? ''} placeholder="https://" />
          </FormField>
          <FormField label="LinkedIn">
            <input name="linkedin_url" className="input"
              defaultValue={client?.linkedin_url ?? ''} placeholder="https://linkedin.com/company/..." />
          </FormField>
        </div>
      </section>

      {/* ── Contact principal ───────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-gray-100">
          Contact principal
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nom complet">
            <input name="contact_name" className="input"
              defaultValue={client?.contact_name ?? ''} placeholder="Prénom Nom" />
          </FormField>
          <FormField label="Titre / Poste">
            <input name="contact_title" className="input"
              defaultValue={client?.contact_title ?? ''} placeholder="ex: Directeur Technique" />
          </FormField>
          <FormField label="Email professionnel">
            <input name="contact_email" type="email" className="input"
              defaultValue={client?.contact_email ?? ''} />
          </FormField>
          <FormField label="Téléphone">
            <input name="contact_phone" type="tel" className="input"
              defaultValue={client?.contact_phone ?? ''} placeholder="+225 XX XX XX XX" />
          </FormField>
          <FormField label="WhatsApp">
            <input name="contact_whatsapp" type="tel" className="input"
              defaultValue={client?.contact_whatsapp ?? ''} placeholder="+225 XX XX XX XX" />
          </FormField>
          <FormField label="Langue de communication">
            <select name="communication_language" className="input"
              defaultValue={client?.communication_language ?? 'unknown'}>
              <option value="unknown">À déterminer au moment de l’envoi</option>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </FormField>
        </div>
      </section>

      {/* ── Informations commerciales ───────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-gray-100">
          Informations commerciales
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Source du lead">
            <select name="lead_source" className="input" defaultValue={client?.lead_source ?? ''}>
              <option value="">— Sélectionner —</option>
              {Object.entries(LEAD_SOURCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Commercial assigné">
            <select name="assigned_to" className="input"
              defaultValue={client?.assigned_to ?? currentUserId}>
              {isPriv ? (
                users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))
              ) : (
                <option value={currentUserId}>Moi-même</option>
              )}
            </select>
          </FormField>
          <FormField label="Devise préférée">
            <select name="currency_pref" className="input" defaultValue={client?.currency_pref ?? 'USD'}>
              {['USD','EUR','TRY','XOF'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FormField>
        </div>
      </section>

      {/* ── Notes ───────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-gray-100">
          Notes
        </h3>
        <div className="space-y-4">
          <FormField label="Notes générales">
            <textarea name="notes" rows={3} className="input resize-none"
              defaultValue={client?.notes ?? ''}
              placeholder="Contexte, besoins identifiés, historique de la relation..." />
          </FormField>
          {isPriv && (
            <FormField
              label="Notes techniques"
              hint="Visible uniquement par admin et lead team"
            >
              <textarea name="technical_notes" rows={3} className="input resize-none"
                defaultValue={client?.technical_notes ?? ''}
                placeholder="Infrastructure électrique, contraintes techniques, réseau..." />
            </FormField>
          )}
        </div>
      </section>

      {/* ── Submit ──────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <button type="button" onClick={() => router.back()} className="btn btn-outline">
          Annuler
        </button>
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          <Save className="w-4 h-4" />
          {mode === 'create' ? 'Créer le client' : 'Enregistrer'}
        </button>
      </div>

    </form>
  )
}
