'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { markNotifReadAction, markAllReadAction, deleteNotifAction } from '@/lib/actions/notifications'

interface Notif {
  id:         string
  type:       string
  title:      string
  message?:   string | null
  link?:      string | null
  is_read:    boolean
  created_at: string
}

const NOTIF_ICONS: Record<string, string> = {
  quotation_created: '📄',
  proforma_created:  '🧾',
  payment_late:      '⚠️',
  project_late:      '🔴',
  document_added:    '📁',
  calc_saved:        '⚡',
  task_due:          '⏰',
  task_assigned:     '✅',
  opportunity_won:   '🏆',
  general:           '💬',
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)   return 'À l\'instant'
  if (min < 60)  return `Il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24)    return `Il y a ${h}h`
  return `Il y a ${Math.floor(h / 24)}j`
}

export default function NotificationBell({ userId }: { userId: string }) {
  const router       = useRouter()
  const [open, setOpen]         = useState(false)
  const [notifs, setNotifs]     = useState<Notif[]>([])
  const [loading, setLoading]   = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.is_read).length

  // Load notifications
  async function loadNotifs() {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, message, link, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data ?? [])
  }

  useEffect(() => {
    loadNotifs()
    // Real-time subscription
    const supabase = createClient()
    const sub = supabase
      .channel('notifs-' + userId)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => loadNotifs())
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleMarkRead(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await markNotifReadAction(id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function handleMarkAll() {
    setLoading(true)
    await markAllReadAction()
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setLoading(false)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteNotifAction(id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  async function handleClick(notif: Notif) {
    if (!notif.is_read) {
      await markNotifReadAction(notif.id)
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
    }
    if (notif.link) {
      router.push(notif.link)
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(p => !p)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          open ? 'bg-navy-900/5 text-navy-900' : 'text-gray-400 hover:text-navy-900 hover:bg-gray-50'
        )}
        aria-label="Notifications"
      >
        <Bell className="w-4.5 h-4.5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white
                          text-2xs font-bold rounded-full flex items-center justify-center
                          border border-white animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl
                       border border-gray-200 shadow-xl z-50 overflow-hidden animate-fade-up">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
                         border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-navy-900">Notifications</span>
              {unread > 0 && (
                <span className="text-2xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={handleMarkAll} disabled={loading}
                  className="text-2xs text-gray-400 hover:text-navy-900 flex items-center gap-1
                             transition-colors px-2 py-1 rounded-lg hover:bg-gray-100">
                  <CheckCheck className="w-3 h-3" /> Tout lire
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifs.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucune notification</p>
              </div>
            ) : notifs.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 cursor-pointer group transition-colors',
                  !n.is_read ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-gray-50'
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0',
                  !n.is_read ? 'bg-blue-100' : 'bg-gray-100'
                )}>
                  {NOTIF_ICONS[n.type] ?? '💬'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs leading-tight',
                    !n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                  )}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-2xs text-gray-400 mt-0.5 truncate">{n.message}</p>
                  )}
                  <p className="text-2xs text-gray-300 mt-1">{timeAgo(n.created_at)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0
                               group-hover:opacity-100 transition-opacity">
                  {!n.is_read && (
                    <button onClick={e => handleMarkRead(n.id, e)}
                      className="p-1 rounded-lg text-blue-400 hover:bg-blue-100 transition-colors"
                      title="Marquer comme lu">
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={e => handleDelete(n.id, e)}
                    className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Supprimer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Unread dot */}
                {!n.is_read && (
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/60">
              <Link href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-navy-900 hover:text-gold-600 font-medium transition-colors">
                Voir toutes les notifications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
