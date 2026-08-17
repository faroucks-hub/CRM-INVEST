import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/auth/permissions'

export type ActionResult<T = unknown> = {
  error?: string
  data?: T
  success?: boolean
}

export async function getActionContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Non authentifié', supabase, user: null, role: null }

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active || !['admin', 'lead_team', 'commercial'].includes(profile.role)) {
    return { ok: false as const, error: 'Accès non autorisé', supabase, user: null, role: null }
  }

  return {
    ok: true as const,
    supabase,
    user,
    role: profile.role as UserRole,
    isAdmin: profile.role === 'admin',
    isLead: profile.role === 'lead_team',
    isPrivileged: ['admin', 'lead_team'].includes(profile.role),
  }
}

export function roleDenied() {
  return { error: 'Accès non autorisé pour votre rôle' }
}
