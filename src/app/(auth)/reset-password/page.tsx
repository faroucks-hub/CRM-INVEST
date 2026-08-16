import type { Metadata } from 'next'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = { title: 'Définir le mot de passe' }

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl">
        <h1 className="text-2xl font-semibold text-white">Activer votre compte</h1>
        <p className="mt-2 text-sm leading-6 text-white/50">
          Choisissez votre mot de passe personnel pour accéder au CRM IM ÉNERGIE.
        </p>
        <ResetPasswordForm />
      </div>
    </div>
  )
}
