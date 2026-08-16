'use client'

import { useState, useTransition } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'

import { restoreLead, hardDeleteLead } from '@/lib/actions/website-leads'
import ConfirmDialog from '@/components/ui/modal/ConfirmDialog'

interface LeadTrashActionsProps {
  leadId: string
}

export function LeadTrashActions({ leadId }: LeadTrashActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)

  function handleRestore() {
    startTransition(async () => {
      await restoreLead(leadId)
    })
  }

  function handleHardDelete() {
    startTransition(async () => {
      await hardDeleteLead(leadId)
      setDeleteOpen(false)
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">

        <button
          type="button"
          disabled={isPending}
          onClick={handleRestore}
          title="Restaurer le lead"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => setDeleteOpen(true)}
          title="Effacer définitivement"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>

      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleHardDelete}
        loading={isPending}
        danger
        title="Effacer définitivement ce lead ?"
        message="Cette action est irréversible. Toutes les informations associées à ce lead seront définitivement supprimées et ne pourront pas être récupérées."
        confirmLabel="Effacer définitivement"
      />
    </>
  )
}