import type { UserRole } from '@/types'

export const MODULE_KEYS = [
  'website_leads', 'quotations', 'clients', 'opportunities', 'proformas',
  'projects', 'payments', 'documents', 'partners', 'purchases',
  'deal_control', 'catalogue_products', 'consolidation', 'reports',
  'tasks', 'calculators', 'lydie', 'messaging',
] as const

export type ModuleKey = typeof MODULE_KEYS[number]

export type ModuleDefinition = {
  key: ModuleKey
  label: string
  section: string
  baselineRoles: UserRole[]
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  { key:'website_leads', label:'Website Leads', section:'Développement commercial', baselineRoles:['admin','lead_team','commercial'] },
  { key:'quotations', label:'Quotations', section:'Développement commercial', baselineRoles:['admin','lead_team','commercial'] },
  { key:'clients', label:'Clients & Prospects', section:'Développement commercial', baselineRoles:['admin','lead_team','commercial'] },
  { key:'opportunities', label:'Opportunités', section:'Développement commercial', baselineRoles:['admin','lead_team','commercial'] },
  { key:'messaging', label:'Messagerie', section:'Développement commercial', baselineRoles:['admin','lead_team','commercial'] },
  { key:'proformas', label:'Proformas', section:'Exécution', baselineRoles:['admin','lead_team'] },
  { key:'projects', label:'Projets', section:'Exécution', baselineRoles:['admin','lead_team','commercial'] },
  { key:'payments', label:'Paiements', section:'Exécution', baselineRoles:['admin','lead_team','commercial'] },
  { key:'documents', label:'Documents', section:'Exécution', baselineRoles:['admin','lead_team','commercial'] },
  { key:'partners', label:'Partenaires', section:'Achats & partenaires', baselineRoles:['admin','lead_team'] },
  { key:'purchases', label:'Achats & Commandes', section:'Achats & partenaires', baselineRoles:['admin','lead_team'] },
  { key:'deal_control', label:'Contrôle d’affaires', section:'Pilotage', baselineRoles:['admin','lead_team'] },
  { key:'catalogue_products', label:'Produits du site', section:'Pilotage', baselineRoles:['admin','lead_team'] },
  { key:'consolidation', label:'Consolidation affaires', section:'Pilotage', baselineRoles:['admin','lead_team','commercial'] },
  { key:'reports', label:'Rapports & Performance', section:'Pilotage', baselineRoles:['admin','lead_team','commercial'] },
  { key:'tasks', label:'Tâches et rappels', section:'Outils', baselineRoles:['admin','lead_team','commercial'] },
  { key:'calculators', label:'Calculateurs', section:'Outils', baselineRoles:['admin','lead_team','commercial'] },
  { key:'lydie', label:'Lydie AI', section:'Outils', baselineRoles:['admin','lead_team','commercial'] },
]

export function baselineAllows(role: UserRole, moduleKey: ModuleKey) {
  return role === 'admin' || MODULE_DEFINITIONS.some(item =>
    item.key === moduleKey && item.baselineRoles.includes(role)
  )
}

export function defaultAllowedModules(role: UserRole): ModuleKey[] {
  if (role === 'admin') return [...MODULE_KEYS]
  return MODULE_DEFINITIONS
    .filter(item => item.baselineRoles.includes(role))
    .map(item => item.key)
}

export function isModuleKey(value: string): value is ModuleKey {
  return MODULE_KEYS.includes(value as ModuleKey)
}
