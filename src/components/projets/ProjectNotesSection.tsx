'use client'

import { useState } from 'react'
import AddNoteModal from './AddNoteModal'

interface Props {
  projectId: string
  notes: any[]
}

export default function ProjectNotesSection({
  projectId,
  notes,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Internal Notes
          </h2>

          <button
            onClick={() => setOpen(true)}
            className="btn btn-primary btn-sm"
          >
            Add Note
          </button>
        </div>

        <div className="space-y-4">

          {notes?.length === 0 && (
            <div className="text-sm text-gray-400">
              No notes yet
            </div>
          )}

          {notes?.map(note => (
            <div
              key={note.id}
              className="rounded-lg border border-gray-100 p-4"
            >
              <div className="flex items-center justify-between mb-2">

                <div className="flex items-center gap-2">

                  <span className="text-xs px-2 py-1 rounded-full bg-navy-50 text-navy-700 capitalize">
                    {note.note_type}
                  </span>

                  {note.is_pinned && (
                    <span className="text-[10px] text-amber-500 font-medium">
                      PINNED
                    </span>
                  )}

                </div>

                <div className="text-[11px] text-gray-300">
                  {note.users_profiles?.full_name ?? 'Unknown'}
                </div>
              </div>

              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {note.content}
              </div>
            </div>
          ))}

        </div>
      </div>

      <AddNoteModal
        open={open}
        onClose={() => setOpen(false)}
        projectId={projectId}
      />
    </>
  )
}