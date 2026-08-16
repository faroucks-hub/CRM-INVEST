import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsersClient from '@/components/parametres/UsersClient'

export const metadata: Metadata = { title: 'Gestion des utilisateurs' }

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role, is_active').eq('id', user.id).single()

  if (profile?.role !== 'admin' || !profile.is_active) redirect('/parametres')

  const { data: users } = await supabase
    .from('users_profiles')
    .select('id, email, full_name, role, is_active, last_login_at, created_at, position, phone, invited_at, onboarding_completed_at')
    .order('created_at', { ascending: true })

  return (
    <UsersClient
      users={users ?? []}
      currentUserId={user.id}
    />
  )
}
