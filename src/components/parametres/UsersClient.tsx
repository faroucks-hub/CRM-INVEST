'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Shield, ShieldOff, Edit, Mail, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/modal/Modal'
import { StatusBadge, Avatar } from '@/components/ui/StatusBadge'
import {
  inviteUserAction,
  toggleUserStatusAction,
  updateManagedUserAction,
  updateUserRoleAction,
} from '@/lib/actions/settings'
import { formatDateTime } from '@/lib/utils'
import { ROLE_LABELS, type UserRole } from '@/types'

const ROLE_COLORS: Record<UserRole, string> = {
  admin:      'bg-red-50 text-red-700',
  lead_team:  'bg-purple-50 text-purple-700',
  commercial: 'bg-blue-50 text-blue-700',
}

interface Props {
  users:         Record<string, unknown>[]
  currentUserId: string
}

export default function UsersClient({ users, currentUserId }: Props) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editUser,   setEditUser]   = useState<Record<string,unknown>|null>(null)
  const [loading,    setLoading]    = useState<string|null>(null)

  async function handleToggleStatus(userId: string, current: boolean) {
    if (userId === currentUserId) { toast.error('Vous ne pouvez pas désactiver votre propre compte'); return }
    setLoading(userId + '-status')
    const r = await toggleUserStatusAction(userId, !current)
    setLoading(null)
    if (r.error) { toast.error(r.error); return }
    toast.success(!current ? 'Utilisateur activé' : 'Utilisateur désactivé')
    router.refresh()
  }

  async function handleRoleChange(userId: string, newRole: string) {
    if (userId === currentUserId) { toast.error('Vous ne pouvez pas modifier votre propre rôle'); return }
    setLoading(userId + '-role')
    const r = await updateUserRoleAction(userId, newRole)
    setLoading(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Rôle mis à jour')
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des utilisateurs</h1>
          <p className="page-subtitle">{users.length} utilisateur{users.length>1?'s':''}</p>
        </div>
        <button onClick={() => setInviteOpen(true)} className="btn btn-primary btn-sm">
          <Plus className="w-3.5 h-3.5" /> Ajouter un utilisateur
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        {(['admin','lead_team','commercial'] as UserRole[]).map(r => (
          <div key={r} className="card p-4 text-center">
            <div className="text-2xl font-semibold text-navy-900">
              {users.filter(u => u.role === r).length}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{ROLE_LABELS[r]}</div>
          </div>
        ))}
      </div>

      {/* Table utilisateurs */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Dernière connexion</th>
              <th>Créé le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const role     = String(u.role) as UserRole
              const isActive = Boolean(u.is_active)
              const isSelf   = u.id === currentUserId
              const invitationPending = Boolean(u.invited_at) && !u.onboarding_completed_at

              return (
                <tr key={String(u.id)} className={!isActive ? 'opacity-50' : ''}>
                  {/* Utilisateur */}
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={String(u.full_name ?? '')} size="md" />
                      <div>
                        <div className="text-sm font-semibold text-navy-900 flex items-center gap-1.5">
                          {String(u.full_name)}
                          {isSelf && <span className="text-2xs bg-gold-50 text-gold-600 border border-gold-200 px-1.5 py-0.5 rounded-full">Vous</span>}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />{String(u.email)}
                        </div>
                        {Boolean(u.position) && <div className="text-2xs text-gray-300">{String(u.position)}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Rôle — éditable */}
                  <td>
                    {isSelf ? (
                      <StatusBadge label={ROLE_LABELS[role]} color={ROLE_COLORS[role]} size="xs" />
                    ) : (
                      <select
                        value={role}
                        onChange={e => handleRoleChange(String(u.id), e.target.value)}
                        disabled={loading === String(u.id) + '-role'}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5
                                   focus:outline-none focus:border-navy-900 bg-white"
                      >
                        <option value="commercial">Commercial</option>
                        <option value="lead_team">Lead Team</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    )}
                  </td>

                  {/* Statut */}
                  <td>
                    {invitationPending
                      ? <div className="flex items-center gap-1.5 text-xs text-amber-600">
                          <Mail className="w-3.5 h-3.5" /> Invitation en attente
                        </div>
                      : isActive
                      ? <div className="flex items-center gap-1.5 text-xs text-green-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Actif
                        </div>
                      : <div className="flex items-center gap-1.5 text-xs text-red-500">
                          <XCircle className="w-3.5 h-3.5" /> Inactif
                        </div>
                    }
                  </td>

                  {/* Dernière connexion */}
                  <td className="text-xs text-gray-400">
                    {u.last_login_at ? formatDateTime(String(u.last_login_at)) : '—'}
                  </td>

                  {/* Date création */}
                  <td className="text-xs text-gray-400">
                    {u.created_at ? new Date(String(u.created_at)).toLocaleDateString('fr-FR') : '—'}
                  </td>

                  {/* Actions */}
                  <td>
                    {!isSelf && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditUser(u)}
                          className="btn-icon p-1.5"
                          title="Modifier"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(String(u.id), isActive)}
                          disabled={loading === String(u.id) + '-status'}
                          className={`btn-icon p-1.5 ${isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}
                          title={isActive ? 'Désactiver' : 'Activer'}
                        >
                          {isActive ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Légende rôles */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-navy-900 mb-3">Droits par rôle</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-xs">
          {[
            { role:'Administrateur', color:'text-red-700 bg-red-50', items:[
              '✅ Accès complet à toutes les données',
              '✅ Gestion utilisateurs et paramètres',
              '✅ Prix achat, marges, fournisseurs',
              '✅ Journal d\'activité',
            ]},
            { role:'Lead Team', color:'text-purple-700 bg-purple-50', items:[
              '✅ Toutes les données commerciales',
              '✅ Partenaires et suivi d’équipe',
              '✅ Proformas et paiements',
              '❌ Prix achat et marges confidentiels',
              '❌ Gestion utilisateurs et paramètres',
            ]},
            { role:'Commercial', color:'text-blue-700 bg-blue-50', items:[
              '✅ Ses clients, opportunités, quotations',
              '✅ Ses projets et calculs',
              '❌ Prix achat et marges',
              '❌ Partenaires, proformas, paiements globaux',
            ]},
          ].map(({ role, color, items }) => (
            <div key={role}>
              <div className={`text-xs font-semibold px-2 py-1 rounded-lg inline-block mb-2 ${color}`}>{role}</div>
              <ul className="space-y-1 text-gray-600">
                {items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      {editUser && (
        <EditUserModal open={!!editUser} onClose={() => setEditUser(null)} user={editUser} />
      )}
    </div>
  )
}

// ── Invite Modal ──────────────────────────────────────────────────
function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [saving, setSaving]   = useState(false)
  const [email,  setEmail]    = useState('')
  const [name,   setName]     = useState('')
  const [role,   setRole]     = useState('commercial')
  const [position, setPosition] = useState('')
  const [phone, setPhone] = useState('')

  async function handleInvite() {
    if (!email || !name) { toast.error('Email et nom requis'); return }
    setSaving(true)
    const r = await inviteUserAction(email, name, role, position, phone)
    setSaving(false)
    if (r.error) {
      toast.error(r.error)
      return
    }
    toast.success(`Utilisateur ${name} créé. Un email de connexion lui sera envoyé.`)
    setEmail(''); setName(''); setRole('commercial'); setPosition(''); setPhone('')
    onClose(); router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} title="Inviter un utilisateur" size="sm">
      <div className="p-6 space-y-4">
        <div>
          <label className="label">Nom complet <span className="text-red-400">*</span></label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Farouck Diallo"/>
        </div>
        <div>
          <label className="label">Email <span className="text-red-400">*</span></label>
          <input type="email" className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="f.diallo@investmentor-energie.com"/>
        </div>
        <div>
          <label className="label">Rôle</label>
          <select className="input" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="commercial">Commercial</option>
            <option value="lead_team">Lead Team</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>
        <div>
          <label className="label">Poste</label>
          <input className="input" value={position} onChange={e=>setPosition(e.target.value)} placeholder="Commercial Afrique de l’Ouest"/>
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+90 ..."/>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
          Supabase enverra un lien sécurisé. L’utilisateur choisira lui-même son mot de passe lors de l’activation.
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn btn-outline">Annuler</button>
          <button onClick={handleInvite} disabled={saving} className="btn btn-primary">
            {saving ? 'Création...' : 'Créer le compte'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Edit User Modal ───────────────────────────────────────────────
function EditUserModal({ open, onClose, user }: {
  open:boolean; onClose:()=>void; user:Record<string,unknown>
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState(String(user.full_name??''))
  const [position, setPosition] = useState(String(user.position??''))
  const [phone, setPhone] = useState(String(user.phone??''))

  async function handleSave() {
    setSaving(true)
    const result = await updateManagedUserAction(String(user.id), {
      fullName,
      position,
      phone,
    })
    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('Profil mis à jour')
    onClose(); router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} title="Modifier l'utilisateur" size="sm">
      <div className="p-6 space-y-4">
        <div>
          <label className="label">Nom complet</label>
          <input className="input" value={fullName} onChange={e=>setFullName(e.target.value)}/>
        </div>
        <div>
          <label className="label">Titre / Poste</label>
          <input className="input" value={position} onChange={e=>setPosition(e.target.value)} placeholder="ex: Commercial Afrique de l'Ouest"/>
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
          Email : <strong>{String(user.email)}</strong> (non modifiable)
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn btn-outline">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Sauvegarde...' : 'Mettre à jour'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
