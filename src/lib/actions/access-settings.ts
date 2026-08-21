'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { baselineAllows, isModuleKey } from '@/lib/auth/module-access'
import type { UserRole } from '@/types'

type ConfigurableRole = Extract<UserRole, 'lead_team' | 'commercial'>

export async function updateRoleModulePermissionsAction(
  role: ConfigurableRole,
  values: Record<string, boolean>,
) {
  if (!['lead_team', 'commercial'].includes(role)) return { error: 'Rôle non configurable' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  const { data: actor } = await supabase
    .from('users_profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .single()
  if (actor?.role !== 'admin' || !actor.is_active) return { error: 'Accès réservé aux administrateurs' }

  const entries = Object.entries(values)
  if (!entries.length) return { error: 'Configuration de permissions vide' }
  for (const [key, enabled] of entries) {
    if (!isModuleKey(key) || typeof enabled !== 'boolean' || (enabled && !baselineAllows(role, key))) {
      return { error: 'Configuration de permissions invalide' }
    }
  }

  const { data: before } = await supabase
    .from('role_module_permissions')
    .select('module_key,enabled')
    .eq('role', role)

  for (const [moduleKey, enabled] of entries) {
    const { error } = await supabase
      .from('role_module_permissions')
      .update({ enabled, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('role', role)
      .eq('module_key', moduleKey)
    if (error) return { error: error.message }
  }

  await supabase.rpc('log_activity', {
    p_user_id: user.id,
    p_action: 'update_role_permissions',
    p_entity: 'role_permissions',
    p_label: role,
    p_old: Object.fromEntries((before ?? []).map(item => [item.module_key, item.enabled])),
    p_new: values,
  })

  revalidatePath('/parametres/acces')
  revalidatePath('/dashboard')
  return { success: true }
}
