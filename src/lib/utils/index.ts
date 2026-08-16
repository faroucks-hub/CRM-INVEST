import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Currency, UserRole } from '@/types'

// ── Tailwind merge ────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Formatage monétaire ───────────────────────────────────────────────
export function formatCurrency(
  amount: number | null | undefined,
  currency: Currency = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  if (amount == null) return '—'

  const localeMap: Record<Currency, string> = {
    USD: 'fr-FR',
    EUR: 'fr-FR',
    TRY: 'tr-TR',
    XOF: 'fr-SN',
  }

  const symbolMap: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
    TRY: '₺',
    XOF: 'FCFA',
  }

  const formatted = new Intl.NumberFormat(localeMap[currency], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount)

  return `${formatted} ${symbolMap[currency]}`
}

// ── Agrégations multidevises ─────────────────────────────────────────
// Ne jamais additionner directement des montants exprimés dans des devises
// différentes. Cette fonction produit un total indépendant par devise.
export function sumByCurrency<T>(
  items: T[],
  amountSelector: (item: T) => number,
  currencySelector: (item: T) => string
): Record<string, number> {
  return items.reduce<Record<string, number>>((totals, item) => {
    const currency = String(currencySelector(item) || 'USD').toUpperCase()
    const amount = Number(amountSelector(item))

    if (!Number.isFinite(amount)) return totals

    totals[currency] = (totals[currency] ?? 0) + amount
    return totals
  }, {})
}

// ── Formatage dates ───────────────────────────────────────────────────
export function formatDate(
  date: string | Date | null | undefined
): string {
  if (!date) return '—';

  const parsedDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsedDate);
}

export function formatDateTime(
  date: string | Date | null | undefined
): string {
  if (!date) return '—';

  const parsedDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
}

export function formatRelativeDate(date: string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} jours`
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine(s)`
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`
  return `Il y a ${Math.floor(diffDays / 365)} an(s)`
}

// ── Permissions ───────────────────────────────────────────────────────
export function hasPermission(
  role: UserRole | undefined | null,
  permission: 'prices' | 'margins' | 'suppliers' | 'payments' | 'users' | 'delete'
): boolean {
  if (!role) return false

  const permissions: Record<typeof permission, UserRole[]> = {
    prices:    ['admin', 'lead_team'],
    margins:   ['admin', 'lead_team'],
    suppliers: ['admin', 'lead_team'],
    payments:  ['admin', 'lead_team'],
    users:     ['admin'],
    delete:    ['admin'],
  }

  return permissions[permission].includes(role)
}

// ── Initiales avatar ──────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')
}

// ── Couleurs de statut ────────────────────────────────────────────────
export function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    prospect:      'bg-surface-300 text-surface-700',
    contact:       'bg-amber-100 text-amber-800',
    qualification: 'bg-blue-100 text-blue-800',
    devis:         'bg-purple-100 text-purple-800',
    negociation:   'bg-orange-100 text-orange-800',
    gagne:         'bg-green-100 text-green-800',
    perdu:         'bg-red-100 text-red-800',
    abandonne:     'bg-gray-100 text-gray-500',
  }
  return colors[stage] ?? 'bg-surface-300 text-surface-700'
}

export function getProjectStatusColor(status: string): string {
  const colors: Record<string, string> = {
    commande:      'bg-blue-100 text-blue-800',
    fabrication:   'bg-amber-100 text-amber-800',
    logistique:    'bg-purple-100 text-purple-800',
    installation:  'bg-orange-100 text-orange-800',
    commissioning: 'bg-teal-100 text-teal-800',
    garantie:      'bg-green-100 text-green-800',
    cloture:       'bg-gray-100 text-gray-500',
  }
  return colors[status] ?? 'bg-surface-300 text-surface-700'
}

export function getDocStatusColor(status: string): string {
  const colors: Record<string, string> = {
    brouillon:   'bg-surface-300 text-surface-700',
    envoye:      'bg-blue-100 text-blue-800',
    en_revision: 'bg-amber-100 text-amber-800',
    accepte:     'bg-green-100 text-green-800',
    refuse:      'bg-red-100 text-red-800',
    expire:      'bg-gray-100 text-gray-500',
    annule:      'bg-red-50 text-red-400',
  }
  return colors[status] ?? 'bg-surface-300 text-surface-700'
}

// ── Truncate ──────────────────────────────────────────────────────────
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
}
