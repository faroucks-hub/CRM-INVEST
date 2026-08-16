'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { SearchBar, FilterSelect } from '@/components/ui'
import { X } from 'lucide-react'
import { CLIENT_STATUS_LABELS, SECTOR_LABELS } from '@/types'

interface ClientsFiltersProps {
  users: { id: string; full_name: string }[]
  currentFilters: Record<string, string | undefined>
  isPriv: boolean
}

export default function ClientsFilters({ users, currentFilters, isPriv }: ClientsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/clients?${params.toString()}`)
  }, [router, searchParams])

  const clearAll = () => router.push('/clients')

  const hasFilters = Object.values(currentFilters).some(v => v && v.length > 0)

  const statusOptions = Object.entries(CLIENT_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))
  const sectorOptions = Object.entries(SECTOR_LABELS).map(([v, l]) => ({ value: v, label: l }))
  const userOptions   = users.map(u => ({ value: u.id, label: u.full_name }))

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <SearchBar
        value={currentFilters.search ?? ''}
        onChange={(v) => updateFilter('search', v)}
        placeholder="Rechercher entreprise, contact..."
        className="w-64"
      />

      <FilterSelect
        value={currentFilters.status ?? ''}
        onChange={(v) => updateFilter('status', v)}
        options={statusOptions}
        placeholder="Tous les statuts"
        className="min-w-[140px]"
      />

      <FilterSelect
        value={currentFilters.sector ?? ''}
        onChange={(v) => updateFilter('sector', v)}
        options={sectorOptions}
        placeholder="Tous les secteurs"
        className="min-w-[150px]"
      />

      {isPriv && users.length > 0 && (
        <FilterSelect
          value={currentFilters.assigned_to ?? ''}
          onChange={(v) => updateFilter('assigned_to', v)}
          options={userOptions}
          placeholder="Tous les commerciaux"
          className="min-w-[160px]"
        />
      )}

      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500
                     hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Réinitialiser
        </button>
      )}
    </div>
  )
}
