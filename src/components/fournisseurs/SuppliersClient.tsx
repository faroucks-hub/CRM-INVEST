'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Download, Star, CheckCircle2, CirclePause, AlertTriangle, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import DataTable, { type Column } from '@/components/ui/table/DataTable'
import SupplierModal from './SupplierModal'
import { exportToCSV } from '@/lib/utils/export'
import { SUPPLIER_TYPE_LABELS } from '@/types/sprint2'

interface Props {
  suppliers: Record<string, unknown>[]
  role: string
}

function moneyByCurrency(rows: Record<string, unknown>[], amountKey: string) {
  const out = new Map<string, number>()
  for (const r of rows) {
    const c = String(r.currency ?? 'USD')
    out.set(c, (out.get(c) ?? 0) + Number(r[amountKey] ?? 0))
  }
  return [...out.entries()].map(([c, v]) => `${v.toLocaleString('fr-FR')} ${c}`).join(' · ') || '—'
}

export default function SuppliersClient({ suppliers, role }: Props) {
  const router = useRouter()
  const canManage = role === 'admin' || role === 'lead_team'
  const [modalOpen, setModalOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Record<string, unknown> | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const filtered = useMemo(() => suppliers.filter(s => {
    if (filterType && s.supplier_type !== filterType) return false
    if (filterCountry && s.country !== filterCountry) return false
    if (filterStatus === 'active' && !s.is_active) return false
    if (filterStatus === 'inactive' && s.is_active) return false
    return true
  }), [suppliers, filterType, filterCountry, filterStatus])

  const countries = [...new Set(suppliers.map(s => String(s.country ?? '')).filter(Boolean))].sort()
  const active = suppliers.filter(s => Boolean(s.is_active))
  const projectsActive = suppliers.reduce((n, s) => n + Number(s.active_projects_count ?? 0), 0)
  const upcoming = suppliers.filter(s => Boolean(s.next_due_date)).length
  const invoiceRows = suppliers.flatMap(s => (s._open_invoices as Record<string, unknown>[] | undefined) ?? [])
  const outstanding = moneyByCurrency(invoiceRows, 'balance')

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'company_name', header: 'Partenaire', sortable: true,
      render: row => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center flex-shrink-0">
            <span className="text-gold-400 text-xs font-bold">{String(row.company_name ?? '').slice(0,2).toUpperCase()}</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-navy-900">{String(row.company_name)}</span>
              {Boolean(row.is_preferred) && <Star className="w-3.5 h-3.5 text-gold-400 fill-gold-400" />}
            </div>
            <div className="text-2xs text-gray-400">{String(row.reference ?? '')}</div>
          </div>
        </div>
      )
    },
    {
      key: 'supplier_type', header: 'Type',
      render: row => <span className="text-xs px-2 py-1 rounded-full bg-navy-900/5 text-navy-900 border border-navy-900/10">
        {SUPPLIER_TYPE_LABELS[String(row.supplier_type) as keyof typeof SUPPLIER_TYPE_LABELS] ?? String(row.supplier_type)}
      </span>
    },
    {
      key: 'country', header: 'Localisation', sortable: true,
      render: row => <div><div className="text-sm">{String(row.country ?? '—')}</div><div className="text-xs text-gray-400">{String(row.city ?? '')}</div></div>
    },
    {
      key: 'products_supplied', header: 'Activité / Produits',
      render: row => <div className="max-w-[210px] truncate text-sm text-gray-600">{String(row.products_supplied ?? '—')}</div>
    },
    {
      key: 'active_projects_count', header: 'Projets',
      render: row => <div className="text-center"><span className="text-sm font-semibold text-navy-900">{Number(row.active_projects_count ?? 0)}</span><div className="text-2xs text-gray-400">actifs</div></div>
    },
    {
      key: 'outstanding_label', header: 'Solde',
      render: row => <span className="text-sm font-semibold text-navy-900">{String(row.outstanding_label ?? '—')}</span>
    },
    {
      key: 'next_due_date', header: 'Prochaine échéance',
      render: row => row.next_due_date ? (
        <div className="flex items-center gap-1.5 text-xs text-amber-700"><CalendarClock className="w-3.5 h-3.5" />{String(row.next_due_label ?? row.next_due_date)}</div>
      ) : <span className="text-gray-300">—</span>
    },
    {
      key: 'is_active', header: 'Statut',
      render: row => row.is_active ? <div className="flex items-center gap-1 text-xs text-green-700"><CheckCircle2 className="w-3.5 h-3.5"/>Actif</div>
        : <div className="flex items-center gap-1 text-xs text-gray-400"><CirclePause className="w-3.5 h-3.5"/>Inactif</div>
    },
  ]

  function handleExport() {
    exportToCSV(filtered, [
      { key: 'reference', header: 'Référence' },
      { key: 'company_name', header: 'Partenaire' },
      { key: 'supplier_type', header: 'Type' },
      { key: 'country', header: 'Pays' },
      { key: 'city', header: 'Ville' },
      { key: 'contact_name', header: 'Contact' },
      { key: 'contact_role', header: 'Fonction' },
      { key: 'contact_email', header: 'Email' },
      { key: 'contact_phone', header: 'Téléphone' },
      { key: 'products_supplied', header: 'Activité / Produits' },
      { key: 'active_projects_count', header: 'Projets actifs' },
      { key: 'outstanding_label', header: 'Solde' },
    ], 'partenaires_ime')
    toast.success(`${filtered.length} partenaire(s) exporté(s)`)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Partenaires</h1>
          <p className="page-subtitle">Fabricants, fournisseurs, prestataires et partenaires stratégiques</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-outline btn-sm"><Download className="w-3.5 h-3.5"/>Export</button>
          {canManage && <button onClick={() => { setEditSupplier(null); setModalOpen(true) }} className="btn btn-primary btn-sm"><Plus className="w-3.5 h-3.5"/>Nouveau partenaire</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['Partenaires actifs', active.length, 'text-navy-900'],
          ['Projets actifs', projectsActive, 'text-blue-700'],
          ['Engagements ouverts', invoiceRows.length, 'text-violet-700'],
          ['Solde à payer', outstanding, 'text-amber-700'],
          ['Échéances', upcoming, upcoming ? 'text-red-600' : 'text-green-700'],
        ].map(([label, value, color]) => <div key={String(label)} className="card p-4"><div className="text-xs text-gray-400 mb-1">{label}</div><div className={`text-xl font-semibold ${color}`}>{String(value)}</div></div>)}
      </div>

      {upcoming > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-amber-600"/><div className="text-sm text-amber-900"><span className="font-semibold">À surveiller :</span> {upcoming} partenaire{upcoming>1?'s':''} avec une échéance financière ou contractuelle à venir.</div></div>}

      <div className="card p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <select className="input w-auto h-9 text-sm" value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            {Object.entries(SUPPLIER_TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input w-auto h-9 text-sm" value={filterCountry} onChange={e=>setFilterCountry(e.target.value)}><option value="">Tous les pays</option>{countries.map(c=><option key={c}>{c}</option>)}</select>
          <select className="input w-auto h-9 text-sm" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="">Tous les statuts</option><option value="active">Actifs</option><option value="inactive">Inactifs</option></select>
          {(filterType||filterCountry||filterStatus) && <button className="text-xs text-gray-400 hover:text-gray-700" onClick={()=>{setFilterType('');setFilterCountry('');setFilterStatus('')}}>× Effacer</button>}
        </div>
      </div>

      <div className="card p-4">
        <DataTable data={filtered} columns={columns} searchable searchPlaceholder="Rechercher un partenaire…" searchKeys={['company_name','reference','products_supplied','contact_name','country']} pageSize={20} emptyMessage="Aucun partenaire" emptySubtext="Ajoutez votre premier partenaire" onRowClick={row=>router.push(`/partenaires/${row.id}`)} actions={canManage ? row => <button onClick={()=>{setEditSupplier(row);setModalOpen(true)}} className="text-xs text-gray-400 hover:text-navy-900">Modifier</button> : undefined}/>
      </div>

      <SupplierModal open={modalOpen} onClose={()=>setModalOpen(false)} supplier={editSupplier}/>
    </div>
  )
}
