import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientForm from '@/components/clients/ClientForm'
import { PageHeader } from '@/components/ui/page-header'

export const metadata: Metadata = { title: 'Nouveau client' }

export default async function NouveauClientPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users_profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? 'commercial'
  const isPriv = role === 'admin' || role === 'lead_team'

  let users: any[] = []
  if (isPriv) {
    const { data } = await supabase
      .from('users_profiles').select('id, full_name').eq('is_active', true)
    users = data ?? []
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Nouveau client"
        description="Créer un client ou prospect"
        backHref="/clients"
        backLabel="Retour aux clients"
      />

      <div className="card card-body">
        <ClientForm
          users={users}
          role={role}
          currentUserId={user.id}
          mode="create"
        />
      </div>
    </div>
  )
}
