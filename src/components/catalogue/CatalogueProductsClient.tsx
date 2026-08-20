'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, Eye, EyeOff, PackageSearch, Save, Search } from 'lucide-react'
import { toast } from 'sonner'
import { updateCatalogueProductAction } from '@/lib/actions/catalogue-products'
import {
  CATALOGUE_PRODUCT_STATUSES,
  CATALOGUE_PRODUCT_STATUS_LABELS,
  type CatalogueProductStatus,
} from '@/lib/catalogue-products'

type CatalogueProduct = {
  id: string
  model: string
  slug: string | null
  status: string
  is_published: boolean
  updated_at: string | null
}

type Draft = { status: CatalogueProductStatus; isPublished: boolean }

const STATUS_COLORS: Record<CatalogueProductStatus, string> = {
  active: 'bg-gray-100 text-gray-700',
  new: 'bg-green-100 text-green-800',
  updated: 'bg-blue-100 text-blue-800',
  hot: 'bg-amber-100 text-amber-900',
  custom: 'bg-violet-100 text-violet-800',
  on_request: 'bg-slate-200 text-slate-800',
  legacy: 'bg-gray-700 text-white',
  discontinued: 'bg-red-100 text-red-800',
}

function normalizedStatus(value: string): CatalogueProductStatus {
  return CATALOGUE_PRODUCT_STATUSES.includes(value as CatalogueProductStatus)
    ? value as CatalogueProductStatus
    : 'active'
}

export default function CatalogueProductsClient({
  products,
  loadError,
}: {
  products: CatalogueProduct[]
  loadError: string | null
}) {
  const router = useRouter()
  const [rows, setRows] = useState(products)
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(
    products.map(product => [product.id, {
      status: normalizedStatus(product.status),
      isPublished: product.is_published,
    }])
  ))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [publicationFilter, setPublicationFilter] = useState('all')
  const [savingId, setSavingId] = useState<string | null>(null)

  const filtered = useMemo(() => rows.filter(product => {
    const draft = drafts[product.id]
    const text = `${product.model} ${product.slug ?? ''}`.toLowerCase()
    if (search && !text.includes(search.trim().toLowerCase())) return false
    if (statusFilter !== 'all' && draft?.status !== statusFilter) return false
    if (publicationFilter === 'published' && !draft?.isPublished) return false
    if (publicationFilter === 'hidden' && draft?.isPublished) return false
    return true
  }), [drafts, publicationFilter, rows, search, statusFilter])

  const publishedCount = rows.filter(product => drafts[product.id]?.isPublished).length
  const highlightedCount = rows.filter(product => drafts[product.id]?.status === 'hot').length
  const discontinuedCount = rows.filter(product => drafts[product.id]?.status === 'discontinued').length

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts(current => ({ ...current, [id]: { ...current[id], ...patch } }))
  }

  function isDirty(product: CatalogueProduct) {
    const draft = drafts[product.id]
    return draft && (draft.status !== normalizedStatus(product.status) || draft.isPublished !== product.is_published)
  }

  async function save(product: CatalogueProduct) {
    const draft = drafts[product.id]
    if (!draft || !isDirty(product)) return
    setSavingId(product.id)
    const result = await updateCatalogueProductAction({
      id: product.id,
      status: draft.status,
      isPublished: draft.isPublished,
      expectedUpdatedAt: product.updated_at,
    })
    setSavingId(null)

    if ('error' in result && result.error) {
      toast.error(result.error)
      return
    }
    if (!('data' in result) || !result.data) return

    setRows(current => current.map(row => row.id === product.id ? {
      ...row,
      status: result.data!.status,
      is_published: result.data!.is_published,
      updated_at: result.data!.updated_at,
    } : row))
    toast.success(`${product.model} mis à jour`)
    router.refresh()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="page-header items-start">
        <div>
          <h1 className="page-title">Produits du site</h1>
          <p className="page-subtitle">Piloter les badges et la publication du catalogue public IM Énergie</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <PackageSearch className="h-4 w-4" />
          Synchronisation Supabase
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossible de charger le catalogue : {loadError}
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
        <p className="text-xs leading-relaxed text-amber-900">
          « Plus disponible » affiche le produit avec un badge. « Masqué » retire entièrement le produit du site. Ces deux réglages ne doivent pas être confondus.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Produits', rows.length],
          ['Publiés', publishedCount],
          ['Produits phares', highlightedCount],
          ['Plus disponibles', discontinuedCount],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-4">
            <div className="text-xs text-gray-400">{label}</div>
            <div className="mt-1 text-xl font-semibold text-navy-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="card p-3">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className="input h-9 w-full pl-9 text-sm" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un modèle ou un slug…" />
          </div>
          <select className="input h-9 text-sm md:w-52" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="all">Tous les statuts</option>
            {CATALOGUE_PRODUCT_STATUSES.map(status => <option key={status} value={status}>{CATALOGUE_PRODUCT_STATUS_LABELS[status]}</option>)}
          </select>
          <select className="input h-9 text-sm md:w-44" value={publicationFilter} onChange={event => setPublicationFilter(event.target.value)}>
            <option value="all">Toute publication</option>
            <option value="published">Publiés</option>
            <option value="hidden">Masqués</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {filtered.map(product => {
          const draft = drafts[product.id] ?? {
            status: normalizedStatus(product.status),
            isPublished: product.is_published,
          }
          const dirty = isDirty(product)
          const saving = savingId === product.id
          return (
            <article key={product.id} className={`card p-4 transition-colors ${dirty ? 'border-gold-400/60 bg-gold-50/30' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-navy-900">{product.model}</h2>
                  <p className="mt-0.5 truncate text-xs text-gray-400">{product.slug || 'Slug non défini'}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_COLORS[draft.status]}`}>
                  {CATALOGUE_PRODUCT_STATUS_LABELS[draft.status]}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-gray-500">Badge affiché sur le site</span>
                  <select className="input h-10 w-full text-sm" value={draft.status} onChange={event => updateDraft(product.id, { status: event.target.value as CatalogueProductStatus })}>
                    {CATALOGUE_PRODUCT_STATUSES.map(status => <option key={status} value={status}>{CATALOGUE_PRODUCT_STATUS_LABELS[status]}</option>)}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => updateDraft(product.id, { isPublished: !draft.isPublished })}
                  aria-pressed={draft.isPublished}
                  className={`flex h-10 min-w-36 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors ${draft.isPublished ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
                >
                  {draft.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {draft.isPublished ? 'Publié' : 'Masqué'}
                </button>
              </div>

              <div className="mt-3 flex min-h-8 items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-[10px] text-gray-400">
                  {dirty ? 'Modification non enregistrée' : <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> À jour</span>}
                </span>
                <button type="button" disabled={!dirty || saving} onClick={() => save(product)} className="btn btn-primary btn-sm disabled:cursor-not-allowed disabled:opacity-40">
                  <Save className="h-3.5 w-3.5" />{saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {!loadError && filtered.length === 0 && (
        <div className="card p-10 text-center text-sm text-gray-400">Aucun produit ne correspond aux filtres.</div>
      )}
    </div>
  )
}
