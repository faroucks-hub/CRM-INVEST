import type { Metadata } from 'next'
import Image from 'next/image'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Connexion',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const initialError = error === 'account_disabled'
    ? 'Ce compte a été désactivé. Contactez un administrateur.'
    : error === 'auth_callback_error'
      ? 'Le lien de connexion est invalide ou expiré.'
      : null
  return (
    <div className="min-h-screen min-h-dvh bg-navy-900 flex">

      {/* ── Panneau gauche — branding ─────────────────── */}
      <div className="login-brand-panel flex-col justify-between
                      p-7 xl:p-12 bg-navy-950 border-r border-white/5 relative overflow-hidden">

        {/* Motif géométrique subtil */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(217,164,65,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(217,164,65,1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <Image
              src="/im.png"
              alt="IM ÉNERGIE"
              width={160}
              height={64}
              className="h-10 w-auto object-contain"
            />
            <div>
              <div className="text-white font-semibold text-base">IM ÉNERGIE CRM</div>
              <div className="text-white/30 text-xs">Industrial Energy Management</div>
            </div>
          </div>

          <h1 className="font-serif text-3xl xl:text-4xl font-semibold text-white leading-tight mb-4">
            Pilotez vos projets<br />
            <span className="text-gold-400">énergétiques</span>
          </h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-sm">
            Plateforme unifiée pour la gestion des projets,
            de la documentation technique, des offres commerciales
            et du suivi client à l’international.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4">
          {[
            { icon: '📑', label: 'Documentation maîtrisée', desc: 'Quotations, proformas, invoices et transmittals' },
            { icon: '⚙️', label: 'Exécution de projets', desc: 'De l’étude technique à la livraison finale' },
            { icon: '🌍', label: 'Opérations internationales', desc: 'Turquie, Afrique et Moyen-Orient' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10
                             flex items-center justify-center text-sm flex-shrink-0">
                {icon}
              </div>
              <div>
                <div className="text-white/70 text-sm font-medium">{label}</div>
                <div className="text-white/30 text-xs">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <div className="text-white/20 text-xs">
            © {new Date().getFullYear()} IM ÉNERGIE · Istanbul, Turquie
          </div>
          <div className="text-gold-400/40 text-xs mt-1 font-serif italic">
            Engineering • Energy • Reliability
          </div>
        </div>
      </div>

      {/* ── Panneau droit — formulaire ────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-5 sm:p-8">
        <div className="w-[min(82vw,320px)] sm:w-full sm:max-w-sm">

          <div className="flex flex-col items-center mb-4 text-center sm:mb-8">
  <Image
    src="/images/logo-ime.png"
    alt="IM ÉNERGIE"
    width={240}
    height={80}
    className="h-11 w-auto object-contain mb-2 sm:h-20 sm:mb-5"
  />

  <h1 className="text-lg font-semibold text-white tracking-wide sm:text-2xl">
    IM ÉNERGIE CRM
  </h1>

  <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-gold-400/80 sm:text-xs sm:tracking-[0.22em]">
    Business Management System
  </p>
</div>

          <LoginForm initialError={initialError} />
        </div>
      </div>
    </div>
  )
}
