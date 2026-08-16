'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types'

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function getUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) { setUser(null); setLoading(false); return }

        const { data: profile } = await supabase
          .from('users_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        setUser(profile)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session?.user) { setUser(null); return }

        const { data: profile } = await supabase
          .from('users_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setUser(profile)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
