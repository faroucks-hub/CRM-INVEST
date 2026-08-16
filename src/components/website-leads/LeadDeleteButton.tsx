'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'

import { softDeleteLead } from '@/lib/actions/website-leads'
import Modal from '@/components/ui/modal/Modal'

interface LeadDeleteButtonProps {
  leadId: string
}

const DELETE_REASONS = [
  'Doublon',
  'Test',
  'Demande non qualifiée',
  'Erreur de saisie',
  'Autre',
]

export function LeadDeleteButton({ leadId }: LeadDeleteButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')

  const finalReason = reason === 'Autre' ? otherReason.trim() : reason
  const canSubmit = Boolean(finalReason) && !isPending

  function closeModal() {
    if (isPending) return
    setOpen(false)
    setReason('')
    setOtherReason('')
  }

  function handleDelete() {
    if (!canSubmit) return

    startTransition(async () => {
      await softDeleteLead(leadId, finalReason)
      setOpen(false)
      setReason('')
      setOtherReason('')
    })
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen(true)}
        title="Déplacer vers la corbeille"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Modal open={open} onClose={closeModal} title="" size="sm">
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <Trash2 className="h-6 w-6 text-red-500" />
          </div>

          <div className="text-center">
            <h3 className="mb-2 text-base font-semibold text-navy-900">
              Déplacer ce lead dans la corbeille ?
            </h3>
            <p className="text-sm leading-relaxed text-gray-500">
              Ce lead sera retiré de la liste active, mais pourra être restauré ultérieurement depuis la corbeille.
            </p>
          </div>

          <div className="mt-5 space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Motif de suppression
            </label>

            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            >
              <option value="">Sélectionnez un motif</option>
              {DELETE_REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {reason === 'Autre' && (
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Précision
              </label>
              <textarea
                value={otherReason}
                onChange={(event) => setOtherReason(event.target.value)}
                rows={3}
                placeholder="Indiquez brièvement la raison de suppression."
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={closeModal}
              disabled={isPending}
              className="btn btn-outline flex-1"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={!canSubmit}
              className="btn btn-danger flex-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'En cours...' : 'Déplacer'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
