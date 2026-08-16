import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import LydiePageClient from '@/components/lydie/LydiePageClient'

export const metadata: Metadata = { title: 'Lydie AI — Assistante intelligente' }

export default async function LydiePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('id, full_name, role')
    .eq('id', user!.id)
    .single()

  const role = profile?.role ?? 'commercial'
  const isAdmin = role === 'admin'
  const isAdminOrLead = ['admin', 'lead_team'].includes(role)

  // Historique des conversations de l'utilisateur
  const { data: conversations } = await supabase
    .from('ai_conversations')
    .select('id, role, message, response, context_type, created_at, session_id, tokens_used')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Stats d'usage (admin/lead_team uniquement)
  const { data: usageStats } = isAdminOrLead
    ? await supabase.from('lydie_usage_stats').select('*')
    : { data: null }

  // Compte les tokens utilisés par l'utilisateur
  const totalTokens = (conversations ?? [])
    .reduce((sum, c) => sum + (Number(c.tokens_used) || 0), 0)

  return (
    <LydiePageClient
      profile={profile ?? { id: user!.id, full_name: '', role: 'commercial' }}
      conversations={conversations ?? []}
      usageStats={usageStats ?? []}
      totalTokens={totalTokens}
      isAdminOrLead={isAdminOrLead}
      isAdmin={isAdmin}
    />
  )
}
