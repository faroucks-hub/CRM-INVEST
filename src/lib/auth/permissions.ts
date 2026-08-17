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

export function canAccessRoute(pathname: string, role: UserRole) {
  const entry = Object.entries(routePermissions)
    .sort(([a], [b]) => b.length - a.length)
    .find(([route]) => pathname === route || pathname.startsWith(`${route}/`))

  // Dashboard routes are private by default. A newly added page must be
  // explicitly assigned to one or more roles before it becomes reachable.
  if (!entry) return false

  return entry[1].includes(role)
}
