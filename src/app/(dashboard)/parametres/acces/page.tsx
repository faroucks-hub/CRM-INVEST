import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AccessPermissionsClient from '@/components/parametres/AccessPermissionsClient'
import { MODULE_DEFINITIONS } from '@/lib/auth/module-access'

export const metadata: Metadata = { title: 'Accès et permissions' }

export default async function AccessPermissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('users_profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin' || !profile.is_active) redirect('/dashboard')

  const { data, error } = await supabase
    .from('role_module_permissions')
    .select('role,module_key,enabled')
    .order('module_key')

  return <AccessPermissionsClient
    modules={MODULE_DEFINITIONS}
    permissions={data ?? []}
    loadError={error?.message ?? null}
  />
}
