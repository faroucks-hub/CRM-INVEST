'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActionContext } from '@/lib/auth/action-context'

export type TaskPriority = 'faible' | 'normale' | 'haute' | 'urgente'
export type TaskStatus   = 'a_faire' | 'en_cours' | 'termine' | 'en_retard'

export interface TaskPayload {
  title:        string
  description?: string
  status?:      TaskStatus
  priority?:    TaskPriority
  due_date?:    string
  assigned_to?: string
  client_id?:   string
  project_id?:  string
  quotation_id?: string
  remind_at?:   string
  notes?:       string
}

export async function createTaskAction(data: TaskPayload) {
  const access = await getActionContext('tasks')
  if (!access.ok) return { error: access.error }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: task, error } = await supabase
    .from('taches')
    .insert({
      title:        data.title,
      description:  data.description || null,
      status:       data.status || 'a_faire',
      priority:     data.priority || 'normale',
      due_date:     data.due_date || null,
      assigned_to:  data.assigned_to || user.id,
      created_by:   user.id,
      client_id:    data.client_id    || null,
      project_id:   data.project_id   || null,
      quotation_id: data.quotation_id || null,
      notes:        data.notes || null,
    })
    .select().single()

  if (error) return { error: error.message }
  revalidatePath('/taches')
  return { data: task }
}

export async function updateTaskAction(id: string, data: Partial<TaskPayload> & { completed_at?: string }) {
  const access = await getActionContext('tasks')
  if (!access.ok) return { error: access.error }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const updateData: Record<string,unknown> = { ...data }
  if (data.status === 'termine' && !data.completed_at) {
    updateData.completed_at = new Date().toISOString()
  }

  const { data: task, error } = await supabase
    .from('taches')
    .update(updateData)
    .eq('id', id)
    .select().single()

  if (error) return { error: error.message }
  revalidatePath('/taches')
  return { data: task }
}

export async function deleteTaskAction(id: string) {
  const access = await getActionContext('tasks')
  if (!access.ok) return { error: access.error }
  const supabase = await createClient()
  const { error } = await supabase.from('taches').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/taches')
  return { success: true }
}

export async function markTaskDoneAction(id: string) {
  return updateTaskAction(id, { status: 'termine', completed_at: new Date().toISOString() })
}
