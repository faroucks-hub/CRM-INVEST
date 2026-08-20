'use server'

import { revalidatePath } from 'next/cache'
import { getActionContext, roleDenied } from '@/lib/auth/action-context'
import { isCatalogueProductStatus } from '@/lib/catalogue-products'

type UpdateCatalogueProductInput = {
  id: string
  status: string
  isPublished: boolean
  expectedUpdatedAt?: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function updateCatalogueProductAction(input: UpdateCatalogueProductInput) {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isPrivileged) return roleDenied()
  if (!UUID_RE.test(input.id)) return { error: 'Identifiant produit invalide' }
  if (!isCatalogueProductStatus(input.status)) return { error: 'Statut produit invalide' }
  if (typeof input.isPublished !== 'boolean') return { error: 'État de publication invalide' }

  const { data: current, error: readError } = await ctx.supabase
    .from('catalogue_products')
    .select('id,model,slug,status,is_published,updated_at')
    .eq('id', input.id)
    .maybeSingle()

  if (readError) return { error: readError.message }
  if (!current) return { error: 'Produit introuvable' }
  if (input.expectedUpdatedAt && current.updated_at !== input.expectedUpdatedAt) {
    return { error: 'Ce produit a été modifié par un autre utilisateur. Rechargez la page.' }
  }

  const updatedAt = new Date().toISOString()
  const next = {
    status: input.status,
    is_published: input.isPublished,
    updated_at: updatedAt,
  }

  const { data: updated, error } = await ctx.supabase
    .from('catalogue_products')
    .update(next)
    .eq('id', input.id)
    .eq('updated_at', current.updated_at)
    .select('id,model,slug,status,is_published,updated_at')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!updated) return { error: 'La fiche a changé pendant l’enregistrement. Rechargez la page.' }

  await ctx.supabase.rpc('log_activity', {
    p_user_id: ctx.user.id,
    p_action: 'update_catalogue_status',
    p_entity: 'catalogue_product',
    p_entity_id: input.id,
    p_label: current.model,
    p_old: { status: current.status, is_published: current.is_published },
    p_new: { status: updated.status, is_published: updated.is_published },
  })

  revalidatePath('/catalogue-produits')
  return { success: true, data: updated }
}
