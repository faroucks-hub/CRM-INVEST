import type { LucideIcon } from 'lucide-react'
import { Construction } from 'lucide-react'

interface ComingSoonProps {
  module: string
  description?: string
  sprint?: string
  icon?: LucideIcon
}

export default function ComingSoon({
  module,
  description,
  sprint = 'Sprint 2',
  icon: Icon = Construction,
}: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-navy-900/5 border border-navy-900/10
                       flex items-center justify-center mx-auto mb-5">
          <Icon className="w-6 h-6 text-navy-900/30" />
        </div>
        <h2 className="text-lg font-semibold text-navy-900 mb-2">{module}</h2>
        <p className="text-sm text-gray-400 mb-4 leading-relaxed">
          {description ?? 'Ce module sera développé dans le prochain sprint.'}
        </p>
        <span className="inline-flex items-center px-3 py-1 rounded-full
                        text-xs font-medium bg-gold-50 text-gold-700 border border-gold-200">
          {sprint} · En cours de développement
        </span>
      </div>
    </div>
  )
}
