import { cn } from '@/lib/utils'

interface BadgeProps {
  label: string
  color?: string
  size?: 'xs' | 'sm'
}

export function StatusBadge({ label, color = 'bg-gray-100 text-gray-600', size = 'sm' }: BadgeProps) {
  return (
    <span className={cn(
      'badge font-medium',
      color,
      size === 'xs' ? 'text-2xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
    )}>
      {label}
    </span>
  )
}

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
  return (
    <div className={cn(
      'rounded-full bg-navy-900 flex items-center justify-center flex-shrink-0',
      size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'
    )}>
      <span className={cn('text-gold-400 font-semibold', size === 'sm' ? 'text-2xs' : 'text-xs')}>
        {initials}
      </span>
    </div>
  )
}
