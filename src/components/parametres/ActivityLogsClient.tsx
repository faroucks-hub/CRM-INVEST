'use client'

import { useState, useMemo } from 'react'
import { ClipboardList, User, FileText, FolderKanban, CreditCard, Settings } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create:        { label: 'Création',         color: 'bg-green-50 text-green-700' },
  update:        { label: 'Modification',      color: 'bg-blue-50 text-blue-700' },
  delete:        { label: 'Suppression',       color: 'bg-red-50 text-red-600' },
  status_change: { label: 'Changement statut', color: 'bg-amber-50 text-amber-700' },
  activate:      { label: 'Activation',        color: 'bg-green-50 text-green-700' },
  deactivate:    { label: 'Désactivation',     color: 'bg-gray-100 text-gray-600' },
  login:         { label: 'Connexion',         color: 'bg-navy-50 text-navy-700' },
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  client:           User,
  quotation:        FileText,
  project:          FolderKanban,
  payment:          CreditCard,
  user:             User,
  company_settings: Settings,
  default:          ClipboardList,
}

const ENTITY_LABELS: Record<string, string> = {
  client:           'Client',
  quotation:        'Quotation',
  proforma:         'Proforma',
  project:          'Projet',
  payment:          'Paiement',
  document:         'Document',
  user:             'Utilisateur',
  opportunity:      'Opportunité',
  company_settings: 'Paramètres',
  task:             'Tâche',
  calc:             'Calcul',
}

interface Props { logs: Record<string, unknown>[] }

export default function ActivityLogsClient({ logs }: Props) {
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => logs.filter(l => {
    if (filterAction && l.action !== filterAction) return false
    if (filterEntity && l.entity_type !== filterEntity) return false
    if (search) {
      const q = search.toLowerCase()
      return String(l.entity_label ?? '').toLowerCase().includes(q) ||
        String(l.action ?? '').toLowerCase().includes(q)
    }
    return true
  }), [logs, filterAction, filterEntity, search])

  const entityTypes = [...new Set(logs.map(l => String(l.entity_type ?? '')))]

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">Journal d'activité</h1>
        <p className="page-subtitle">{logs.length} entrée{logs.length > 1 ? 's' : ''} · 200 dernières</p>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="input h-9 text-sm flex-1 min-w-[180px] max-w-xs"
        />
        <select className="input w-auto text-sm h-9" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select className="input w-auto text-sm h-9" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
          <option value="">Tous les modules</option>
          {entityTypes.map(e => <option key={e} value={e}>{ENTITY_LABELS[e] ?? e}</option>)}
        </select>
        {(filterAction || filterEntity || search) && (
          <button onClick={() => { setFilterAction(''); setFilterEntity(''); setSearch('') }}
            className="text-xs text-gray-400 hover:text-gray-700">× Effacer</button>
        )}
      </div>

      {/* Timeline */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <div className="text-sm text-gray-400">Aucune activité enregistrée</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Module</th>
                <th>Entité</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const action  = String(log.action ?? '')
                const entity  = String(log.entity_type ?? '')
                const ac      = ACTION_LABELS[action]
                const Icon    = ENTITY_ICONS[entity] ?? ENTITY_ICONS.default
                const user    = log.users_profiles as Record<string, unknown> | null

                return (
                  <tr key={String(log.id)}>
                    <td className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDateTime(String(log.created_at))}
                    </td>
                    <td>
                      <span className="text-sm font-medium text-gray-800">
                        {user?.full_name as string ?? '—'}
                      </span>
                    </td>
                    <td>
                      {ac && (
                        <span className={`badge text-xs font-medium ${ac.color}`}>
                          {ac.label}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Icon className="w-3.5 h-3.5" />
                        {ENTITY_LABELS[entity] ?? entity}
                      </div>
                    </td>
                    <td className="text-sm text-gray-700 max-w-[200px] truncate">
                      {String(log.entity_label ?? '—')}
                    </td>
                    <td>
                      {Boolean(log.old_value || log.new_value) && (
                        <details className="text-2xs text-gray-400 cursor-pointer">
                          <summary className="hover:text-gray-700">Voir</summary>
                          <div className="mt-1 bg-gray-50 rounded p-2 text-2xs font-mono">
                            {Boolean(log.old_value) && (
                              <div className="text-red-500">- {JSON.stringify(log.old_value)}</div>
                            )}
                            {Boolean(log.new_value) && (
                              <div className="text-green-600">+ {JSON.stringify(log.new_value)}</div>
                            )}
                          </div>
                        </details>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
