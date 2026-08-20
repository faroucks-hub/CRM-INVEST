import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CatalogueProductsClient from '@/components/catalogue/CatalogueProductsClient'

export const metadata: Metadata = { title: 'Produits du site' }

export default async function CatalogueProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active || !['admin', 'lead_team'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: products, error } = await supabase
    .from('catalogue_products')
    .select('id,model,slug,status,is_published,updated_at')
    .order('model')

  return (
    <CatalogueProductsClient
      products={products ?? []}
      loadError={error?.message ?? null}
    />
  )
}
