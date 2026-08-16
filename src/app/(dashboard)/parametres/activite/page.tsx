import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ActivityLogsClient from '@/components/parametres/ActivityLogsClient'

export const metadata: Metadata = { title: 'Journal d\'activité' }

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()

  if (profile?.role !== 'admin') redirect('/parametres')

  const { data: logs } = await supabase
    .from('activity_logs')
    .select(`id, action, entity_type, entity_label, old_value, new_value, created_at,
      users_profiles!activity_logs_user_id_fkey(id, full_name)`)
    .order('created_at', { ascending: false })
    .limit(200)

  return <ActivityLogsClient logs={logs ?? []} />
}
