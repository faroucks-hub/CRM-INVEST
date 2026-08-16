'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markNotifReadAction(id: string) {
  const supabase = await createClient()
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  revalidatePath('/')
  return { success: true }
}

export async function markAllReadAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
  revalidatePath('/')
  return { success: true }
}

export async function deleteNotifAction(id: string) {
  const supabase = await createClient()
  await supabase.from('notifications').delete().eq('id', id)
  revalidatePath('/')
  return { success: true }
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  return count ?? 0
}
