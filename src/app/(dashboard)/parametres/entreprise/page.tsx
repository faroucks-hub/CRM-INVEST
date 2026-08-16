import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CompanySettingsClient from '@/components/parametres/CompanySettingsClient'

export const metadata: Metadata = { title: 'Paramètres entreprise' }

export default async function CompanySettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()

  if (profile?.role !== 'admin') redirect('/parametres')

  const { data: settings } = await supabase
    .from('company_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()

  return <CompanySettingsClient settings={settings ?? {}} />
}
