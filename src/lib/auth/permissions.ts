import type { ModuleKey } from '@/lib/auth/module-access'

export type UserRole = 'admin' | 'lead_team' | 'commercial'

export const permissions = {
  admin: {
    clients: true,
    suppliers: true,
    quotations: true,
    projects: true,
    finance: true,
    customerReceivables: true,
    purchaseCosts: true,
    margins: true,
    supplierDebts: true,
    treasury: true,
    adminPanel: true,
  },

  lead_team: {
    clients: true,
    suppliers: true,
    quotations: true,
    projects: true,
    finance: false,
    customerReceivables: true,
    purchaseCosts: true,
    margins: true,
    supplierDebts: false,
    treasury: false,
    adminPanel: false,
  },

  commercial: {
    clients: true,
    suppliers: false,
    quotations: true,
    projects: true,
    finance: false,
    customerReceivables: true,
    purchaseCosts: false,
    margins: false,
    supplierDebts: false,
    treasury: false,
    adminPanel: false,
  },
}

export function hasPermission(
  role: UserRole,
  permission: keyof typeof permissions.admin
) {
  return permissions[role]?.[permission] ?? false
}
export const routePermissions: Record<string, UserRole[]> = {
  '/website-leads/trash': ['admin', 'lead_team'],
  '/website-leads': ['admin', 'lead_team', 'commercial'],
  '/messagerie': ['admin', 'lead_team', 'commercial'],
  '/catalogue-produits': ['admin', 'lead_team'],
  '/rapports/saisie-financiere': ['admin', 'lead_team'],
  '/rapports': ['admin', 'lead_team', 'commercial'],
  '/dashboard': ['admin', 'lead_team', 'commercial'],
  '/clients': ['admin', 'lead_team', 'commercial'],
  '/opportunites': ['admin', 'lead_team', 'commercial'],
  '/quotations': ['admin', 'lead_team', 'commercial'],
  '/proformas': ['admin', 'lead_team'],
  '/projets': ['admin', 'lead_team', 'commercial'],
  '/documents': ['admin', 'lead_team', 'commercial'],
  '/taches': ['admin', 'lead_team', 'commercial'],
  '/calculateurs': ['admin', 'lead_team', 'commercial'],
  '/aide': ['admin', 'lead_team', 'commercial'],

  '/fournisseurs': ['admin', 'lead_team'],
  '/partenaires': ['admin', 'lead_team'],
  '/achats': ['admin', 'lead_team'],
  '/controle-affaires': ['admin', 'lead_team'],
  '/consolidation': ['admin', 'lead_team', 'commercial'],
  '/paiements': ['admin', 'lead_team', 'commercial'],
  '/parametres': ['admin'],
  '/notifications': ['admin', 'lead_team', 'commercial'],
  '/lydie': ['admin', 'lead_team', 'commercial'],
}

export const routeModules: Record<string, ModuleKey> = {
  '/website-leads': 'website_leads',
  '/messagerie': 'messaging',
  '/catalogue-produits': 'catalogue_products',
  '/quotations': 'quotations',
  '/clients': 'clients',
  '/opportunites': 'opportunities',
  '/proformas': 'proformas',
  '/projets': 'projects',
  '/paiements': 'payments',
  '/documents': 'documents',
  '/partenaires': 'partners',
  '/achats': 'purchases',
  '/controle-affaires': 'deal_control',
  '/consolidation': 'consolidation',
  '/rapports': 'reports',
  '/taches': 'tasks',
  '/calculateurs': 'calculators',
  '/lydie': 'lydie',
}

export function canAccessRoute(pathname: string, role: UserRole, allowedModules?: readonly string[]) {
  const entry = Object.entries(routePermissions)
    .sort(([a], [b]) => b.length - a.length)
    .find(([route]) => pathname === route || pathname.startsWith(`${route}/`))

  // Dashboard routes are private by default. A newly added page must be
  // explicitly assigned to one or more roles before it becomes reachable.
  if (!entry) return false

  if (!entry[1].includes(role)) return false
  if (role === 'admin' || !allowedModules) return true

  const moduleEntry = Object.entries(routeModules)
    .sort(([a], [b]) => b.length - a.length)
    .find(([route]) => pathname === route || pathname.startsWith(`${route}/`))

  return !moduleEntry || allowedModules.includes(moduleEntry[1])
}
