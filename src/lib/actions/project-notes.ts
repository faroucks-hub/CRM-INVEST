'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createProjectNote(data: {
  projectId: string
  note: string
  noteType?: string
  isPinned?: boolean
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('project_notes')
    .insert({
      project_id: data.projectId,
      user_id: user.id,
      content: data.note,
      note_type: data.noteType || 'internal',
      is_pinned: data.isPinned ?? false,
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projets/${data.projectId}`)

  return { success: true }
}
