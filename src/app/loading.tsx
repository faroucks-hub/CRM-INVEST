import Image from 'next/image'

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-navy-900">
      <div className="flex flex-col items-center">
        <Image
          src="/images/logo-ime.png"
          alt="IM ÉNERGIE"
          width={192}
          height={64}
          className="h-16 w-auto animate-pulse"
        />

        <div className="mt-4 text-gold-400 text-sm tracking-widest uppercase">
          IM ÉNERGIE CRM
        </div>

        <div className="mt-2 text-white/40 text-xs">
          Chargement...
        </div>
      </div>
    </div>
  )
}
