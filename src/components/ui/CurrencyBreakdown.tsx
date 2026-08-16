import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/types'

interface CurrencyBreakdownProps {
  totals: Record<string, number>
  className?: string
  emptyLabel?: string
}

export function CurrencyBreakdown({
  totals,
  className = '',
  emptyLabel = '—',
}: CurrencyBreakdownProps) {
  const entries = Object.entries(totals)
    .filter(([, amount]) => Number.isFinite(amount) && amount !== 0)
    .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))

  if (!entries.length) {
    return <span className={className}>{emptyLabel}</span>
  }

  return (
    <div className={`space-y-0.5 ${className}`}>
      {entries.map(([currency, amount]) => (
        <div key={currency}>
          {formatCurrency(amount, currency as Currency)}
        </div>
      ))}
    </div>
  )
}
