'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const USER_ROLES = ['admin', 'lead_team', 'commercial'] as const
type ManagedUserRole = typeof USER_ROLES[number]

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' as const }

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' || !profile.is_active) {
    return { error: 'Accès réservé aux administrateurs' as const }
  }

  return { supabase, user }
}

function validRole(role: string): role is ManagedUserRole {
  return USER_ROLES.includes(role as ManagedUserRole)
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

// ── Company settings ──────────────────────────────────────────────
export interface CompanySettingsData {
  company_name?:         string
  company_tagline?:      string
  address?:              string
  website?:              string
  email_principal?:      string
  email_commercial?:     string
  phone_principal?:      string
  phone_whatsapp?:       string
  bank_name?:            string
  bank_iban?:            string
  bank_swift?:           string
  bank_account?:         string
  bank_address?:         string
  bank_currency?:        string
  default_currency?:     string
  default_incoterm?:     string
  default_payment_terms?:string
  default_warranty?:     string
  default_delivery?:     string
  default_validity_days?:number
  pdf_footer_text?:      string
  pdf_intro_text?:       string
}

export async function getCompanySettings() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()
  return data
}

export async function updateCompanySettingsAction(data: CompanySettingsData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('company_settings')
    .update({ ...data, updated_by: user.id })
    .eq('id', '00000000-0000-0000-0000-000000000001')

  if (error) return { error: error.message }

  // Log l'action
  await supabase.rpc('log_activity', {
    p_user_id: user.id, p_action: 'update',
    p_entity: 'company_settings', p_label: 'Paramètres entreprise',
  })

  revalidatePath('/parametres/entreprise')
  return { success: true }
}

// ── User management ───────────────────────────────────────────────
export async function updateUserRoleAction(userId: string, role: string) {
  const actor = await requireAdmin()
  if ('error' in actor) return actor
  if (!validRole(role)) return { error: 'Rôle invalide' }
  if (actor.user.id === userId) return { error: 'Vous ne pouvez pas modifier votre propre rôle' }

  const { data: target } = await actor.supabase
    .from('users_profiles').select('full_name, role, is_active').eq('id', userId).single()
  if (!target) return { error: 'Utilisateur introuvable' }

  if (target.role === 'admin' && role !== 'admin' && target.is_active) {
    const { count } = await actor.supabase
      .from('users_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true)
    if ((count ?? 0) <= 1) return { error: 'Le dernier administrateur actif ne peut pas être rétrogradé' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('users_profiles').update({ role }).eq('id', userId)
  if (error) return { error: error.message }

  await actor.supabase.rpc('log_activity', {
    p_user_id: actor.user.id, p_action: 'role_change',
    p_entity: 'user', p_entity_id: userId,
    p_label: target?.full_name ?? userId,
    p_old: { role: target?.role },
    p_new: { role },
  })

  revalidatePath('/parametres/utilisateurs')
  return { success: true }
}

export async function toggleUserStatusAction(userId: string, isActive: boolean) {
  const actor = await requireAdmin()
  if ('error' in actor) return actor
  if (actor.user.id === userId) return { error: 'Vous ne pouvez pas désactiver votre propre compte' }

  const { data: target } = await actor.supabase
    .from('users_profiles')
    .select('full_name, role, is_active')
    .eq('id', userId)
    .single()
  if (!target) return { error: 'Utilisateur introuvable' }

  if (!isActive && target.role === 'admin' && target.is_active) {
    const { count } = await actor.supabase
      .from('users_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true)
    if ((count ?? 0) <= 1) return { error: 'Le dernier administrateur actif ne peut pas être désactivé' }
  }

  const adminClient = createAdminClient()
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: isActive ? 'none' : '876000h',
  })
  if (authError) return { error: authError.message }

  const { error } = await adminClient
    .from('users_profiles').update({ is_active: isActive }).eq('id', userId)
  if (error) return { error: error.message }

  await actor.supabase.rpc('log_activity', {
    p_user_id: actor.user.id, p_action: isActive ? 'activate' : 'deactivate',
    p_entity: 'user', p_entity_id: userId, p_label: target.full_name,
    p_old: { is_active: target.is_active },
    p_new: { is_active: isActive },
  })

  revalidatePath('/parametres/utilisateurs')
  return { success: true }
}

export async function inviteUserAction(
  email: string,
  fullName: string,
  role: string,
  position?: string,
  phone?: string,
) {
  const actor = await requireAdmin()
  if ('error' in actor) return actor

  const cleanEmail = normalizeEmail(email)
  const cleanName = fullName.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { error: 'Adresse email invalide' }
  if (cleanName.length < 2) return { error: 'Nom complet invalide' }
  if (!validRole(role)) return { error: 'Rôle invalide' }

  const adminClient = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (!appUrl) return { error: 'NEXT_PUBLIC_APP_URL doit être configurée' }

  const { data: newUser, error } = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
    data: { full_name: cleanName },
    redirectTo: `${appUrl}/callback?next=/reset-password`,
  })

  if (error) return { error: error.message }

  const { error: profileError } = await adminClient.from('users_profiles').update({
    full_name: cleanName,
    role,
    position: position?.trim() || null,
    phone: phone?.trim() || null,
    is_active: true,
    invited_by: actor.user.id,
    invited_at: new Date().toISOString(),
  }).eq('id', newUser.user.id)
  if (profileError) {
    await adminClient.auth.admin.deleteUser(newUser.user.id)
    return { error: profileError.message }
  }

  await actor.supabase.rpc('log_activity', {
    p_user_id: actor.user.id, p_action: 'invite',
    p_entity: 'user', p_entity_id: newUser.user.id, p_label: cleanName,
    p_new: { email: cleanEmail, role, position: position?.trim() || null },
  })

  revalidatePath('/parametres/utilisateurs')
  return { success: true, user: newUser.user }
}

export async function updateManagedUserAction(
  userId: string,
  data: { fullName: string; position?: string; phone?: string },
) {
  const actor = await requireAdmin()
  if ('error' in actor) return actor
  if (data.fullName.trim().length < 2) return { error: 'Nom complet invalide' }

  const adminClient = createAdminClient()
  const { data: target } = await actor.supabase
    .from('users_profiles')
    .select('full_name, position, phone')
    .eq('id', userId)
    .single()
  if (!target) return { error: 'Utilisateur introuvable' }

  const next = {
    full_name: data.fullName.trim(),
    position: data.position?.trim() || null,
    phone: data.phone?.trim() || null,
  }
  const { error } = await adminClient.from('users_profiles').update(next).eq('id', userId)
  if (error) return { error: error.message }

  await actor.supabase.rpc('log_activity', {
    p_user_id: actor.user.id,
    p_action: 'update',
    p_entity: 'user',
    p_entity_id: userId,
    p_label: next.full_name,
    p_old: target,
    p_new: next,
  })
  revalidatePath('/parametres/utilisateurs')
  return { success: true }
}

export async function completeOnboardingAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session invalide ou expirée' }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('users_profiles')
    .select('is_active, invited_at, onboarding_completed_at')
    .eq('id', user.id)
    .single()
  if (!profile?.is_active || !profile.invited_at) {
    return { error: 'Ce compte ne peut pas être activé avec ce lien' }
  }

  const { error } = await adminClient
    .from('users_profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) return { error: error.message }

  await supabase.rpc('log_activity', {
    p_user_id: user.id,
    p_action: 'onboarding_completed',
    p_entity: 'user',
    p_entity_id: user.id,
  })
  return { success: true }
}
