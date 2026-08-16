import { cn } from '@/lib/utils'

export const WEBSITE_LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  quotation: 'Quotation',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

export const WEBSITE_LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

const WEBSITE_LEAD_STATUS_STYLES: Record<string, string> = {
  new: 'border-blue-200 bg-blue-50 text-blue-700',
  contacted: 'border-violet-200 bg-violet-50 text-violet-700',
  qualified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  quotation: 'border-orange-200 bg-orange-50 text-orange-700',
  negotiation: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  won: 'border-green-200 bg-green-50 text-green-700',
  lost: 'border-red-200 bg-red-50 text-red-700',
}

export function WebsiteLeadStatusBadge({ status }: { status?: string | null }) {
  const value = status || 'new'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        WEBSITE_LEAD_STATUS_STYLES[value] || WEBSITE_LEAD_STATUS_STYLES.new
      )}
    >
      {WEBSITE_LEAD_STATUS_LABELS[value] || value}
    </span>
  )
}
