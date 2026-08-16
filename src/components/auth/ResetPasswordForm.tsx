'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { completeOnboardingAction } from '@/lib/actions/settings'

export default function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 12) {
      setError('Le mot de passe doit contenir au moins 12 caractères.')
      return
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
        !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError('Ajoutez une minuscule, une majuscule, un chiffre et un caractère spécial.')
      return
    }
    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: passwordError } = await supabase.auth.updateUser({ password })
    if (passwordError) {
      setLoading(false)
      setError('Le lien est expiré ou le mot de passe a été refusé.')
      return
    }

    const result = await completeOnboardingAction()
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/60">Nouveau mot de passe</label>
        <input
          type="password"
          autoComplete="new-password"
          className="input"
          value={password}
          onChange={event => setPassword(event.target.value)}
          disabled={loading}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/60">Confirmation</label>
        <input
          type="password"
          autoComplete="new-password"
          className="input"
          value={confirmation}
          onChange={event => setConfirmation(event.target.value)}
          disabled={loading}
        />
      </div>
      <p className="text-xs leading-5 text-white/40">
        Minimum 12 caractères avec majuscule, minuscule, chiffre et caractère spécial.
      </p>
      {error && (
        <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Activation…' : 'Activer mon compte'}
      </button>
    </form>
  )
}
