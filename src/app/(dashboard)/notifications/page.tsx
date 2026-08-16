import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import NotificationsClient from '@/components/notifications/NotificationsClient'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifs } = await supabase
    .from('notifications')
    .select('id, type, title, message, link, is_read, entity_type, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const unread = (notifs ?? []).filter(n => !n.is_read).length

  return <NotificationsClient notifications={notifs ?? []} unreadCount={unread} />
}
