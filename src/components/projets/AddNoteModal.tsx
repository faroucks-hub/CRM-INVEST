'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createProjectNote } from '@/lib/actions/project-notes'

interface Props {
  projectId: string
  open: boolean
  onClose: () => void
}

export default function AddNoteModal({
  projectId,
  open,
  onClose,
}: Props) {
  const [content, setContent] = useState('')
  const [noteType, setNoteType] = useState('internal')
  const [isPending, startTransition] = useTransition()

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!content.trim()) {
      toast.error('Veuillez saisir une note.')
      return
    }

    startTransition(async () => {
      const result = await createProjectNote({
        projectId,
        note: content.trim(),
        noteType,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success('Note ajoutée')
      setContent('')
      setNoteType('internal')
      onClose()
      window.location.reload()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
      >
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-navy-900">
            Add Project Note
          </h2>
          <p className="text-sm text-gray-400">
            Add an internal project comment or production note.
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Note Type
            </label>

            <select
              className="input w-full"
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
            >
              <option value="internal">Internal</option>
              <option value="production">Production</option>
              <option value="commercial">Commercial</option>
              <option value="fat">FAT</option>
              <option value="shipping">Shipping</option>
              <option value="issue">Issue</option>
              <option value="client">Client</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Note
            </label>

            <textarea
              className="input min-h-[140px] w-full resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write project note..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline btn-sm"
            disabled={isPending}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </form>
    </div>
  )
}
