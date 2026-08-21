import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import LydieChat from '@/components/lydie/LydieChat'
import type { UserRole } from '@/types'
import { canAccessRoute } from '@/lib/auth/permissions'
import { headers } from 'next/headers'
import CrmContextNavigation from "@/components/crm/CrmContextNavigation";
import GlobalCalculator from '@/components/calculateurs/GlobalCalculator'
import { defaultAllowedModules } from '@/lib/auth/module-access'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()

  // 1) Verify authenticated user on the server
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  const { data, error: profileError } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !data || !data.is_active) {
    redirect('/login?error=profile_access_denied')
  }

  if (!['admin', 'lead_team', 'commercial'].includes(data.role)) {
    redirect('/login?error=invalid_role')
  }

const normalizedProfile = {
  ...data,
  full_name: data.full_name ?? data.email ?? 'Utilisateur',
  role: data.role as UserRole,
}

let allowedModules = defaultAllowedModules(normalizedProfile.role)
if (normalizedProfile.role !== 'admin') {
  const { data: configuredPermissions } = await supabase
    .from('role_module_permissions')
    .select('module_key, enabled')
    .eq('role', normalizedProfile.role)
  if (configuredPermissions) {
    const configured = new Map(configuredPermissions.map(item => [item.module_key, item.enabled]))
    allowedModules = allowedModules.filter(moduleKey => configured.get(moduleKey) !== false)
  }
}

const requestHeaders = await headers()
const pathname = requestHeaders.get('x-pathname') ?? '/dashboard'

if (
  !canAccessRoute(
    pathname,
    normalizedProfile.role,
    allowedModules
  )
) {
  redirect('/dashboard')
}

  return (
    <div className="flex h-screen overflow-hidden bg-surface-100">
      <Sidebar role={normalizedProfile.role} allowedModules={allowedModules} />

      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        <TopBar user={normalizedProfile} allowedModules={allowedModules} />

        <main className="flex-1 min-h-0 overflow-y-auto"> 
          <div className="p-3 sm:p-6 animate-fade-up">
          <CrmContextNavigation />
          {children}</div> 
        </main>
      </div>

      {(normalizedProfile.role === 'admin' || allowedModules.includes('lydie')) && <LydieChat
        user={{
          id: normalizedProfile.id,
          full_name: normalizedProfile.full_name,
          role: normalizedProfile.role,
        }}
      />}
      {(normalizedProfile.role === 'admin' || allowedModules.includes('calculators')) && <GlobalCalculator />}
    </div>
  )
}
