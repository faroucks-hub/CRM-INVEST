'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  convertWebsiteLeadToOpportunityAction,
  updateWebsiteLeadNotesAction,
  updateWebsiteLeadStatusAction,
} from '@/lib/actions/website-leads'
import { WEBSITE_LEAD_STATUS_OPTIONS } from './WebsiteLeadStatusBadge'

type Props = {
  leadId: string
  status: string | null
  internalNotes?: string | null
  isConverted?: boolean
}

export default function WebsiteLeadActions({
  leadId,
  status,
  internalNotes,
  isConverted,
}: Props) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status || 'new')
  const [notes, setNotes] = useState(internalNotes || '')
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(nextStatus: string) {
    setCurrentStatus(nextStatus)

    startTransition(async () => {
      const result = await updateWebsiteLeadStatusAction(leadId, nextStatus)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Statut mis à jour')
      router.refresh()
    })
  }

  function handleSaveNotes() {
    startTransition(async () => {
      const result = await updateWebsiteLeadNotesAction(leadId, notes)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Note interne enregistrée')
      router.refresh()
    })
  }

  function handleConvert() {
    startTransition(async () => {
      const result = await convertWebsiteLeadToOpportunityAction(leadId)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Lead converti en opportunité')
      router.refresh()
    })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
      <div>
        <h2 className="text-base font-bold text-navy-950">Traitement commercial</h2>
        <p className="mt-1 text-sm text-slate-500">Qualifier, documenter et convertir le lead.</p>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Statut du lead
          </label>
          <select
            value={currentStatus}
            onChange={(event) => handleStatusChange(event.target.value)}
            disabled={isPending}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
          >
            {WEBSITE_LEAD_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Note interne
          </label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={6}
            placeholder="Résumé d'appel, priorité, prochaine action..."
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
          />
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={isPending}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Enregistrer la note
          </button>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={handleConvert}
            disabled={isPending || isConverted}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isConverted ? 'Déjà converti en opportunité' : 'Convertir en opportunité'}
          </button>
        </div>
      </div>
    </section>
  )
}
