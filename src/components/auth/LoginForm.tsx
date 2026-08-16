'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function LoginForm({ initialError = null }: { initialError?: string | null }) {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [serverError, setServerError] = useState<string | null>(initialError)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    if (!email || !password) {
      setServerError('Veuillez remplir tous les champs.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password: password,
    })

    if (error) {
      setLoading(false)
      if (error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_credentials')) {
        setServerError('Email ou mot de passe incorrect.')
      } else if (error.message.includes('Email not confirmed')) {
        setServerError('Veuillez confirmer votre email avant de vous connecter.')
      } else {
        setServerError('Erreur de connexion. Vérifiez vos identifiants.')
      }
      return
    }

    if (!data.session) {
      setLoading(false)
      setServerError('Session non créée. Réessayez.')
      return
    }

    // Update last_login_at silently
    try {
      await supabase
        .from('users_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id)
    } catch { /* non-blocking */ }


window.location.href = '/dashboard'
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>

      {/* Email */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">
          Adresse email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="vous@investmentor-energie.com"
          autoComplete="email"
          disabled={loading}
          className={cn(
            'w-full px-3.5 py-2.5 bg-white/5 border rounded-md text-sm text-white',
            'placeholder-white/20 outline-none transition-all duration-150',
            'focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400',
            'disabled:opacity-50',
            'border-white/10'
          )}
        />
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">
          Mot de passe
        </label>
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
            className={cn(
              'w-full px-3.5 py-2.5 pr-10 bg-white/5 border rounded-md text-sm text-white',
              'placeholder-white/20 outline-none transition-all duration-150',
              'focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400',
              'disabled:opacity-50',
              'border-white/10'
            )}
          />
          <button
            type="button"
            onClick={() => setShowPwd(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2
                       text-white/30 hover:text-white/70 transition-colors"
          >
            {showPwd
              ? <EyeOff className="w-4 h-4" />
              : <Eye className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="px-3.5 py-2.5 bg-red-500/10 border border-red-500/20
                       rounded-md text-red-400 text-xs">
          {serverError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 px-4',
          'bg-gold-400 hover:bg-gold-300 text-navy-900 font-medium text-sm',
          'rounded-md transition-all duration-150 active:scale-[0.99]',
          'disabled:opacity-60 disabled:cursor-not-allowed mt-2'
        )}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>

      <div className="text-center">
        <Link
          href="/reset-password"
          className="text-xs text-white/30 hover:text-gold-400 transition-colors"
        >
          Mot de passe oublié ?
        </Link>
      </div>

    </form>
  )
}
