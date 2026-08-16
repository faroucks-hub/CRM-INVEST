import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
      <div className="text-center">

        <Image
          src="/images/logo-ime.png"
          alt="IM ÉNERGIE"
          width={240}
          height={80}
          className="h-20 w-auto mx-auto mb-8"
        />

        <div className="text-gold-400 text-6xl font-bold mb-4">
          404
        </div>

        <h1 className="text-white text-2xl font-semibold mb-3">
          Page introuvable
        </h1>

        <p className="text-white/40 max-w-md mx-auto mb-8">
          La page demandée n'existe pas ou a été déplacée.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center px-5 py-3 rounded-lg
                     bg-gold-400 text-navy-900 font-medium"
        >
          Retour au Dashboard
        </Link>

      </div>
    </div>
  )
}
