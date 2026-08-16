// ═══════════════════════════════════════════════════════════════════
// IME CRM — Gestionnaire d'erreurs centralisé
// Messages en français, professionnels et clairs
// ═══════════════════════════════════════════════════════════════════

export type ErrorCode =
  | 'auth/not-authenticated'
  | 'auth/insufficient-permissions'
  | 'auth/invalid-credentials'
  | 'auth/account-inactive'
  | 'db/not-found'
  | 'db/duplicate'
  | 'db/constraint-violation'
  | 'db/rls-violation'
  | 'db/generic'
  | 'upload/file-too-large'
  | 'upload/invalid-type'
  | 'upload/storage-error'
  | 'pdf/generation-error'
  | 'pdf/missing-data'
  | 'ai/api-key-missing'
  | 'ai/rate-limit'
  | 'ai/context-too-large'
  | 'ai/generic'
  | 'validation/required-field'
  | 'validation/invalid-email'
  | 'validation/invalid-phone'
  | 'validation/invalid-amount'
  | 'validation/invalid-date'
  | 'validation/invalid-reference'
  | 'network/timeout'
  | 'network/offline'
  | 'generic'

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentification
  'auth/not-authenticated':        'Vous devez être connecté pour effectuer cette action.',
  'auth/insufficient-permissions': 'Vous n\'avez pas les droits nécessaires pour cette action.',
  'auth/invalid-credentials':      'Email ou mot de passe incorrect. Veuillez réessayer.',
  'auth/account-inactive':         'Votre compte est désactivé. Contactez l\'administrateur.',
  // Base de données
  'db/not-found':             'L\'élément demandé est introuvable.',
  'db/duplicate':             'Un enregistrement identique existe déjà.',
  'db/constraint-violation':  'Cette donnée est liée à d\'autres enregistrements et ne peut pas être supprimée.',
  'db/rls-violation':         'Accès refusé à cette donnée.',
  'db/generic':               'Une erreur de base de données est survenue. Réessayez.',
  // Upload
  'upload/file-too-large':    'Le fichier est trop volumineux (maximum 50 Mo).',
  'upload/invalid-type':      'Ce type de fichier n\'est pas autorisé.',
  'upload/storage-error':     'Erreur lors de l\'upload. Vérifiez votre connexion et réessayez.',
  // PDF
  'pdf/generation-error':     'Erreur lors de la génération du PDF. Vérifiez que le document contient des lignes.',
  'pdf/missing-data':         'Données insuffisantes pour générer le PDF. Complétez le document.',
  // IA Lydie
  'ai/api-key-missing':       'Clé API OpenAI non configurée. Contactez l\'administrateur.',
  'ai/rate-limit':            'Limite d\'appels IA atteinte. Veuillez patienter quelques instants.',
  'ai/context-too-large':     'Contexte trop volumineux. Réduisez la longueur de votre message.',
  'ai/generic':               'Lydie AI est temporairement indisponible. Réessayez dans quelques instants.',
  // Validation
  'validation/required-field':   'Veuillez remplir tous les champs obligatoires.',
  'validation/invalid-email':    'L\'adresse email n\'est pas valide.',
  'validation/invalid-phone':    'Le numéro de téléphone n\'est pas valide.',
  'validation/invalid-amount':   'Le montant doit être un nombre positif.',
  'validation/invalid-date':     'La date saisie n\'est pas valide.',
  'validation/invalid-reference':'Le format de référence est invalide.',
  // Réseau
  'network/timeout':  'La requête a expiré. Vérifiez votre connexion internet.',
  'network/offline':  'Vous semblez être hors ligne. Vérifiez votre connexion.',
  // Générique
  'generic': 'Une erreur inattendue est survenue. Veuillez réessayer.',
}

// ── Mapper les erreurs Supabase → codes IME ───────────────────────
export function mapSupabaseError(error: { message?: string; code?: string }): ErrorCode {
  const msg  = error.message?.toLowerCase() ?? ''
  const code = error.code ?? ''

  if (code === 'PGRST116' || msg.includes('no rows'))         return 'db/not-found'
  if (code === '23505' || msg.includes('duplicate'))          return 'db/duplicate'
  if (code === '23503' || msg.includes('foreign key'))        return 'db/constraint-violation'
  if (code === '42501' || msg.includes('row-level security')) return 'db/rls-violation'
  if (msg.includes('jwt') || msg.includes('not authenticated')) return 'auth/not-authenticated'
  if (msg.includes('permission') || msg.includes('policy'))   return 'auth/insufficient-permissions'
  return 'db/generic'
}

// ── Mapper les erreurs OpenAI ─────────────────────────────────────
export function mapOpenAIError(error: { message?: string; code?: string; status?: number }): ErrorCode {
  if (!process.env.OPENAI_API_KEY)    return 'ai/api-key-missing'
  if (error.status === 429)           return 'ai/rate-limit'
  if (error.code === 'context_length_exceeded') return 'ai/context-too-large'
  return 'ai/generic'
}

// ── Formater le message d'erreur ──────────────────────────────────
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.generic
}

// ── Classe d'erreur IME ───────────────────────────────────────────
export class ImeError extends Error {
  public readonly code: ErrorCode
  public readonly userMessage: string

  constructor(code: ErrorCode, detail?: string) {
    super(detail ?? getErrorMessage(code))
    this.code = code
    this.userMessage = getErrorMessage(code)
    this.name = 'ImeError'
  }
}

// ── Helper pour server actions ────────────────────────────────────
export function handleActionError(error: unknown): { error: string } {
  console.error('[IME Action Error]', error)

  if (error instanceof ImeError) {
    return { error: error.userMessage }
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const code = mapSupabaseError(error as { message: string; code?: string })
    return { error: getErrorMessage(code) }
  }

  return { error: getErrorMessage('generic') }
}

// ── Validation helpers ────────────────────────────────────────────
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePhone(phone: string): boolean {
  // Accepte formats internationaux : +225 07 XX XX XX, +90 5XX, etc.
  return /^\+?[\d\s\-().]{7,20}$/.test(phone)
}

export function validateAmount(amount: number | string): boolean {
  const n = Number(amount)
  return !isNaN(n) && n >= 0
}

export function validateDateRange(start: string, end: string): boolean {
  if (!start || !end) return true
  return new Date(start) <= new Date(end)
}

export function sanitizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

// ── Toast helpers (à utiliser avec sonner) ────────────────────────
export const toastMessages = {
  created:  (entity: string) => `${entity} créé(e) avec succès`,
  updated:  (entity: string) => `${entity} mis(e) à jour`,
  deleted:  (entity: string) => `${entity} supprimé(e)`,
  archived: (entity: string) => `${entity} archivé(e)`,
  exported: (count: number)  => `${count} élément(s) exporté(s)`,
  saved:    ()               => 'Sauvegardé avec succès',
  copied:   ()               => 'Copié dans le presse-papiers',
}
