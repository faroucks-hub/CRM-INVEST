'use client'

import { useMemo, useState } from 'react'
import { LockKeyhole, Save, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { updateRoleModulePermissionsAction } from '@/lib/actions/access-settings'
import type { ModuleDefinition } from '@/lib/auth/module-access'

type PermissionRow = { role: string; module_key: string; enabled: boolean }
type ConfigurableRole = 'lead_team' | 'commercial'

export default function AccessPermissionsClient({
  modules,
  permissions,
  loadError,
}: {
  modules: ModuleDefinition[]
  permissions: PermissionRow[]
  loadError: string | null
}) {
  const initial = useMemo(() => Object.fromEntries(
    (['lead_team', 'commercial'] as ConfigurableRole[]).map(role => [role, Object.fromEntries(
      modules.map(module => [module.key, permissions.find(row => row.role === role && row.module_key === module.key)?.enabled ?? module.baselineRoles.includes(role)])
    )])
  ) as Record<ConfigurableRole, Record<string, boolean>>, [modules, permissions])
  const [values, setValues] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(values) !== JSON.stringify(saved)
  function toggle(role: ConfigurableRole, key: string) {
    setValues(current => ({ ...current, [role]: { ...current[role], [key]: !current[role][key] } }))
  }

  async function save() {
    setSaving(true)
    for (const role of ['lead_team', 'commercial'] as ConfigurableRole[]) {
      const result = await updateRoleModulePermissionsAction(role, values[role])
      if (result.error) {
        setSaving(false)
        toast.error(result.error)
        return
      }
    }
    setSaved(values)
    setSaving(false)
    toast.success('Permissions mises à jour')
  }

  const sections = [...new Set(modules.map(module => module.section))]

  return <div className="mx-auto max-w-5xl space-y-5">
    <div className="page-header items-start">
      <div>
        <h1 className="page-title">Accès et permissions</h1>
        <p className="page-subtitle">Limiter l’accès aux modules selon le rôle</p>
      </div>
      <button type="button" onClick={save} disabled={!dirty || saving || !!loadError} className="btn btn-primary disabled:opacity-40">
        <Save className="h-4 w-4" />{saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>

    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
      L’administrateur conserve toujours tous les accès. Une case verrouillée signifie que le rôle de sécurité ne peut pas recevoir ce module. Cette page peut retirer un droit, mais elle ne contourne jamais les protections financières et RLS.
    </div>
    {loadError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Migration V32 absente ou chargement impossible : {loadError}</div>}

    <div className="card overflow-hidden">
      <div className="grid grid-cols-[1fr_100px_100px_100px] items-center gap-2 border-b bg-gray-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        <span>Module</span><span className="text-center">Admin</span><span className="text-center">Lead</span><span className="text-center">Commercial</span>
      </div>
      {sections.map(section => <div key={section}>
        <div className="border-b bg-navy-900/5 px-4 py-2 text-xs font-semibold text-navy-900">{section}</div>
        {modules.filter(module => module.section === section).map(module => <div key={module.key} className="grid grid-cols-[1fr_100px_100px_100px] items-center gap-2 border-b px-4 py-3 last:border-b-0">
          <span className="text-sm text-gray-700">{module.label}</span>
          <span className="flex justify-center text-green-700" title="Accès administrateur permanent"><ShieldCheck className="h-4 w-4" /></span>
          {(['lead_team', 'commercial'] as ConfigurableRole[]).map(role => {
            const eligible = module.baselineRoles.includes(role)
            return <div key={role} className="flex justify-center">
              {eligible ? <button type="button" role="switch" aria-checked={values[role][module.key]} onClick={() => toggle(role, module.key)} className={`relative h-6 w-11 rounded-full transition-colors ${values[role][module.key] ? 'bg-green-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${values[role][module.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button> : <span className="text-gray-300" title="Interdit par le rôle de sécurité"><LockKeyhole className="h-4 w-4" /></span>}
            </div>
          })}
        </div>)}
      </div>)}
    </div>
  </div>
}
