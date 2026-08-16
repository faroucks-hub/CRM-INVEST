'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { markNotifReadAction, markAllReadAction, deleteNotifAction } from '@/lib/actions/notifications'

interface Notif {
  id:          string
  type:        string
  title:       string
  message?:    string | null
  link?:       string | null
  is_read:     boolean
  entity_type?: string | null
  created_at:  string
}

const NOTIF_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  quotation_created: { icon:'📄', color:'bg-blue-50 text-blue-700 border-blue-200',   label:'Quotation' },
  proforma_created:  { icon:'🧾', color:'bg-teal-50 text-teal-700 border-teal-200',   label:'Proforma' },
  payment_late:      { icon:'⚠️', color:'bg-red-50 text-red-700 border-red-200',      label:'Paiement' },
  project_late:      { icon:'🔴', color:'bg-red-50 text-red-700 border-red-200',      label:'Projet' },
  document_added:    { icon:'📁', color:'bg-amber-50 text-amber-700 border-amber-200',label:'Document' },
  calc_saved:        { icon:'⚡', color:'bg-purple-50 text-purple-700 border-purple-200', label:'Calcul' },
  task_due:          { icon:'⏰', color:'bg-orange-50 text-orange-700 border-orange-200', label:'Tâche' },
  task_assigned:     { icon:'✅', color:'bg-green-50 text-green-700 border-green-200', label:'Tâche' },
  opportunity_won:   { icon:'🏆', color:'bg-gold-50 text-gold-700 border-gold-200',   label:'Opportunité' },
  general:           { icon:'💬', color:'bg-gray-50 text-gray-600 border-gray-200',   label:'Info' },
}

function fmtDate(d: string) {
  const date = new Date(d)
  const now  = new Date()
  const diff = now.getTime() - date.getTime()
  const min  = Math.floor(diff / 60000)

  if (min < 1)   return 'À l\'instant'
  if (min < 60)  return `Il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24)    return `Il y a ${h}h`
  if (h < 48)    return 'Hier'
  return date.toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
}

interface Props {
  notifications: Notif[]
  unreadCount:   number
}

export default function NotificationsClient({ notifications, unreadCount }: Props) {
  const router = useRouter()
  const [items, setItems]           = useState<Notif[]>(notifications)
  const [filterType, setFilterType] = useState('')
  const [showUnread, setShowUnread] = useState(false)
  const [loading, setLoading]       = useState(false)

  const filtered = useMemo(() => items.filter(n => {
    if (showUnread && n.is_read)            return false
    if (filterType && n.type !== filterType) return false
    return true
  }), [items, showUnread, filterType])

  const unread = items.filter(n => !n.is_read).length

  async function handleMarkRead(id: string) {
    await markNotifReadAction(id)
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function handleMarkAll() {
    setLoading(true)
    await markAllReadAction()
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    setLoading(false)
    toast.success('Toutes les notifications marquées comme lues')
  }

  async function handleDelete(id: string) {
    await deleteNotifAction(id)
    setItems(prev => prev.filter(n => n.id !== id))
    toast.success('Notification supprimée')
  }

  async function handleClick(n: Notif) {
    if (!n.is_read) await handleMarkRead(n.id)
    if (n.link) router.push(n.link)
  }

  // Group by day
  const grouped = useMemo(() => {
    const groups: Record<string, Notif[]> = {}
    filtered.forEach(n => {
      const day = new Date(n.created_at).toLocaleDateString('fr-FR', {
        weekday:'long', day:'numeric', month:'long'
      })
      if (!groups[day]) groups[day] = []
      groups[day].push(n)
    })
    return groups
  }, [filtered])

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour ✓'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={handleMarkAll} disabled={loading} className="btn btn-outline btn-sm">
            <CheckCheck className="w-3.5 h-3.5" />
            {loading ? 'En cours...' : 'Tout marquer lu'}
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowUnread(p => !p)}
          className={cn(
            'text-xs px-3 py-1.5 rounded-full border transition-colors',
            showUnread
              ? 'bg-navy-900 text-white border-navy-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-navy-900'
          )}
        >
          {showUnread ? '● ' : ''}Non lues{unread > 0 && ` (${unread})`}
        </button>
        <select className="input w-auto text-xs h-8" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(NOTIF_CONFIG).map(([v, c]) => (
            <option key={v} value={v}>{c.icon} {c.label}</option>
          ))}
        </select>
        {(filterType || showUnread) && (
          <button onClick={() => { setFilterType(''); setShowUnread(false) }}
            className="text-xs text-gray-400 hover:text-gray-700">× Effacer</button>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card p-16 text-center">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <div className="text-sm font-medium text-gray-400">Aucune notification</div>
          <div className="text-xs text-gray-300 mt-1">Vous êtes à jour !</div>
        </div>
      )}

      {/* Grouped notifications */}
      {Object.entries(grouped).map(([day, dayNotifs]) => (
        <div key={day}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs font-medium text-gray-400 capitalize">{day}</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="space-y-2">
            {dayNotifs.map(n => {
              const cfg = NOTIF_CONFIG[n.type] ?? NOTIF_CONFIG.general

              return (
                <div
                  key={n.id}
                  className={cn(
                    'card overflow-hidden group',
                    !n.is_read && 'border-l-2 border-l-blue-500'
                  )}
                >
                  <div className={cn(
                    'flex items-start gap-4 p-4',
                    n.link && 'cursor-pointer hover:bg-gray-50 transition-colors',
                    !n.is_read && 'bg-blue-50/20'
                  )}
                    onClick={() => n.link && handleClick(n)}
                  >
                    {/* Icon */}
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border',
                      cfg.color
                    )}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          'text-sm leading-snug',
                          !n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                        )}>
                          {n.title}
                        </p>
                        <span className="text-2xs text-gray-400 flex-shrink-0 mt-0.5">
                          {fmtDate(n.created_at)}
                        </span>
                      </div>
                      {n.message && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className={cn('text-2xs px-2 py-0.5 rounded-full border font-medium', cfg.color)}>
                          {cfg.label}
                        </span>
                        {n.link && (
                          <span className="text-2xs text-gray-400 flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> Voir le détail
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0
                                   group-hover:opacity-100 transition-opacity">
                      {!n.is_read && (
                        <button
                          onClick={e => { e.stopPropagation(); handleMarkRead(n.id) }}
                          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 transition-colors"
                          title="Marquer comme lu"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(n.id) }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500
                                   hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
