export const CATALOGUE_PRODUCT_STATUSES = [
  'active',
  'new',
  'updated',
  'hot',
  'custom',
  'on_request',
  'legacy',
  'discontinued',
] as const

export type CatalogueProductStatus = typeof CATALOGUE_PRODUCT_STATUSES[number]

export const CATALOGUE_PRODUCT_STATUS_LABELS: Record<CatalogueProductStatus, string> = {
  active: 'Actif — aucun badge',
  new: 'Nouveau',
  updated: 'Mis à jour',
  hot: 'Produit phare',
  custom: 'Sur mesure',
  on_request: 'Sur demande',
  legacy: 'Ancienne génération',
  discontinued: 'Plus disponible',
}

export function isCatalogueProductStatus(value: string): value is CatalogueProductStatus {
  return CATALOGUE_PRODUCT_STATUSES.includes(value as CatalogueProductStatus)
}
