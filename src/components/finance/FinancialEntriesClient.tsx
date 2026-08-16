'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Banknote, CircleDollarSign, Plus, ReceiptText,
  ShoppingCart, Trash2, WalletCards,
} from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/modal/Modal'
import { FormGrid, FormSection } from '@/components/ui/form/Fields'
import { CurrencyBreakdown } from '@/components/ui/CurrencyBreakdown'
import {
  createFinancialEntryAction,
  voidFinancialEntryAction,
} from '@/lib/actions/financial-entries'
import {
  FINANCIAL_CURRENCIES,
  type FinancialCurrency,
  type FinancialEntryKind,
  type FinancialEntryPayload,
  type FinancialOption,
  type ManualFinancialEntry,
} from '@/types/financial'
import { sumByCurrency } from '@/lib/utils'

const CONFIG: Record<FinancialEntryKind, {
  label: string
  singular: string
  description: string
  icon: React.ElementType
}> = {
  vente: {
    label: 'Ventes',
    singular: 'vente',
    description: 'Factures et ventes réalisées, y compris les historiques.',
    icon: ShoppingCart,
  },
  recette: {
    label: 'Recettes',
    singular: 'recette',
    description: 'Encaissements clients reçus en banque ou en caisse.',
    icon: Banknote,
  },
  creance: {
    label: 'Créances',
    singular: 'créance',
    description: 'Soldes clients non réglés. Une créance crée une vente impayée.',
    icon: CircleDollarSign,
  },
  depense: {
    label: 'Dépenses',
    singular: 'dépense',
    description: 'Charges de projet et frais généraux déjà existants.',
    icon: WalletCards,
  },
  dette: {
    label: 'Dettes',
    singular: 'dette',
    description: 'Factures et soldes dus aux fournisseurs.',
    icon: ReceiptText,
  },
}

const EXPENSE_CATEGORIES = [
  ['transport', 'Transport'],
  ['banque', 'Frais bancaires'],
  ['commission', 'Commission'],
  ['certification', 'Certification'],
  ['douane', 'Douane'],
  ['deplacement', 'Déplacement'],
  ['installation', 'Installation'],
  ['sous_traitance', 'Sous-traitance'],
  ['assurance', 'Assurance'],
  ['autre', 'Autre'],
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function money(amount: number, currency: FinancialCurrency) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'XOF' ? 0 : 2,
  }).format(amount)
}

interface Props {
  role: 'admin' | 'lead_team'
  currentUserId: string
  entries: ManualFinancialEntry[]
  clients: FinancialOption[]
  suppliers: FinancialOption[]
  projects: FinancialOption[]
  users: FinancialOption[]
  invoices: FinancialOption[]
}

export default function FinancialEntriesClient({
  role,
  currentUserId,
  entries,
  clients,
  suppliers,
  projects,
  users,
  invoices,
}: Props) {
  const router = useRouter()
  const availableKinds = useMemo<FinancialEntryKind[]>(
    () => role === 'admin'
      ? ['vente', 'recette', 'creance', 'depense', 'dette']
      : ['vente', 'recette', 'creance'],
    [role],
  )
  const [kind, setKind] = useState<FinancialEntryKind>('vente')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currencyFilter, setCurrencyFilter] = useState('')
  const [form, setForm] = useState({
    client_id: '',
    supplier_id: '',
    project_id: '',
    assigned_to: currentUserId,
    sales_invoice_id: '',
    external_reference: '',
    description: '',
    issue_date: today(),
    due_date: '',
    amount: '',
    paid_amount: '',
    currency: 'USD' as FinancialCurrency,
    status: 'payee',
    category: 'autre',
    payment_method: 'virement',
    bank_reference: '',
    notes: '',
  })

  const visible = entries
    .filter(entry => kind === 'vente'
      ? entry.kind === 'vente' || entry.kind === 'creance'
      : entry.kind === kind)
    .filter(entry => !currencyFilter || entry.currency === currencyFilter)
    .sort((a, b) => b.date.localeCompare(a.date))

  const totals = sumByCurrency(
    visible,
    entry => kind === 'creance'
      ? Math.max(entry.amount - entry.paid_amount, 0)
      : entry.amount,
    entry => entry.currency,
  )

  const selectedClientProjects = form.client_id
    ? projects.filter(project => project.client_id === form.client_id)
    : projects

  function update(key: keyof typeof form, value: string) {
    setForm(previous => ({ ...previous, [key]: value }))
  }

  function startEntry() {
    setForm(previous => ({
      ...previous,
      client_id: '',
      supplier_id: '',
      project_id: '',
      sales_invoice_id: '',
      external_reference: '',
      description: '',
      issue_date: today(),
      due_date: '',
      amount: '',
      paid_amount: '',
      currency: 'USD',
      status: kind === 'depense' ? 'payee' : previous.status,
      bank_reference: '',
      notes: '',
    }))
    setOpen(true)
  }

  async function save() {
    const payload: FinancialEntryPayload = {
      kind,
      client_id: form.client_id || undefined,
      supplier_id: form.supplier_id || undefined,
      project_id: form.project_id || undefined,
      assigned_to: form.assigned_to || undefined,
      sales_invoice_id: form.sales_invoice_id || undefined,
      external_reference: form.external_reference || undefined,
      description: form.description || undefined,
      issue_date: form.issue_date,
      due_date: form.due_date || undefined,
      amount: Number(form.amount),
      paid_amount: Number(form.paid_amount) || 0,
      currency: form.currency,
      status: form.status,
      category: form.category,
      payment_method: form.payment_method,
      bank_reference: form.bank_reference || undefined,
      notes: form.notes || undefined,
    }

    setSaving(true)
    const result = await createFinancialEntryAction(payload)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`${CONFIG[kind].singular[0].toUpperCase()}${CONFIG[kind].singular.slice(1)} enregistrée`)
    setOpen(false)
    router.refresh()
  }

  async function voidEntry(entry: ManualFinancialEntry) {
    const reason = window.prompt(`Motif d’annulation de ${entry.reference} :`)
    if (!reason) return
    const result = await voidFinancialEntryAction(entry.kind, entry.id, reason)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Écriture annulée et conservée dans la piste d’audit')
    router.refresh()
  }

  const ActiveIcon = CONFIG[kind].icon

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="page-header">
        <div>
          <Link href="/rapports" className="mb-2 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-navy-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Rapports & Performance
          </Link>
          <h1 className="page-title">Saisie financière</h1>
          <p className="page-subtitle">Enregistrement manuel des données existantes, sans conversion automatique.</p>
        </div>
        <button type="button" onClick={startEntry} className="btn btn-primary btn-sm">
          <Plus className="h-4 w-4" /> Nouvelle {CONFIG[kind].singular}
        </button>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Chaque montant conserve sa devise d’origine. Les totaux USD, EUR, TRY et XOF ne sont jamais additionnés entre eux.
      </div>

      <div className="card overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/60 px-3 pt-3">
          {availableKinds.map(item => {
            const ItemIcon = CONFIG[item].icon
            return (
              <button
                key={item}
                type="button"
                onClick={() => setKind(item)}
                className={`-mb-px flex items-center gap-2 whitespace-nowrap rounded-t-md px-4 py-2.5 text-sm font-medium ${
                  kind === item
                    ? 'border border-b-white border-gray-200 bg-white text-navy-900'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <ItemIcon className="h-4 w-4" /> {CONFIG[item].label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-navy-900">
              <ActiveIcon className="h-4 w-4" /> {CONFIG[kind].label}
            </h2>
            <p className="text-xs text-gray-400">{CONFIG[kind].description}</p>
          </div>
          <select
            className="input h-9 w-auto text-sm"
            value={currencyFilter}
            onChange={event => setCurrencyFilter(event.target.value)}
          >
            <option value="">Toutes les devises</option>
            {FINANCIAL_CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}
          </select>
        </div>

        <div className="grid gap-3 border-b bg-gray-50/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(totals).map(([currency, amount]) => (
            <div key={currency} className="rounded-lg border border-gray-100 bg-white p-3">
              <div className="text-2xs font-medium text-gray-400">{currency}</div>
              <div className="mt-1 font-semibold text-navy-900">
                {money(amount, currency as FinancialCurrency)}
              </div>
            </div>
          ))}
          {!Object.keys(totals).length && <span className="text-sm text-gray-400">Aucun montant enregistré.</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Référence', 'Tiers / description', 'Date', 'Échéance', 'Statut', 'Montant', 'Réglé', 'Solde', ''].map(label => (
                  <th key={label} className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-400">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map(entry => {
                const balance = Math.max(entry.amount - entry.paid_amount, 0)
                return (
                  <tr key={`${entry.kind}-${entry.id}`} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-medium text-navy-900">{entry.reference}</td>
                    <td className="px-4 py-3">
                      <div>{entry.third_party}</div>
                      {entry.description && <div className="text-xs text-gray-400">{entry.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{entry.date}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.due_date || '—'}</td>
                    <td className="px-4 py-3"><span className="badge">{entry.status}</span></td>
                    <td className="px-4 py-3 text-right font-medium">{money(entry.amount, entry.currency)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{money(entry.paid_amount, entry.currency)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700">{money(balance, entry.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      {role === 'admin' && (
                        <button
                          type="button"
                          title="Annuler"
                          onClick={() => voidEntry(entry)}
                          className="btn-icon p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!visible.length && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">Aucune donnée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`Nouvelle ${CONFIG[kind].singular}`} size="lg">
        <div className="space-y-5 p-6">
          {(kind === 'vente' || kind === 'creance' || kind === 'recette') && (
            <FormSection title="Client et rattachement">
              <FormGrid cols={2}>
                <div>
                  <label className="label">Client <span className="text-red-400">*</span></label>
                  <select className="input" value={form.client_id} onChange={event => {
                    update('client_id', event.target.value)
                    update('project_id', '')
                  }}>
                    <option value="">— Sélectionner —</option>
                    {clients.map(client => <option key={client.id} value={client.id}>{client.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Projet lié</label>
                  <select className="input" value={form.project_id} onChange={event => update('project_id', event.target.value)}>
                    <option value="">— Aucun / historique —</option>
                    {selectedClientProjects.map(project => <option key={project.id} value={project.id}>{project.label}</option>)}
                  </select>
                </div>
              </FormGrid>
              {kind === 'recette' && (
                <div>
                  <label className="label">Facture liée</label>
                  <select className="input" value={form.sales_invoice_id} onChange={event => {
                    const invoice = invoices.find(item => item.id === event.target.value)
                    update('sales_invoice_id', event.target.value)
                    if (invoice?.client_id) update('client_id', invoice.client_id)
                    if (invoice?.currency && FINANCIAL_CURRENCIES.includes(invoice.currency as FinancialCurrency)) {
                      update('currency', invoice.currency)
                    }
                  }}>
                    <option value="">— Recette historique sans facture CRM —</option>
                    {invoices.map(invoice => <option key={invoice.id} value={invoice.id}>{invoice.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Commercial responsable</label>
                <select className="input" value={form.assigned_to} onChange={event => update('assigned_to', event.target.value)}>
                  {users.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </div>
            </FormSection>
          )}

          {(kind === 'depense' || kind === 'dette') && (
            <FormSection title="Origine">
              <FormGrid cols={2}>
                {kind === 'dette' && (
                  <div>
                    <label className="label">Fournisseur <span className="text-red-400">*</span></label>
                    <select className="input" value={form.supplier_id} onChange={event => update('supplier_id', event.target.value)}>
                      <option value="">— Sélectionner —</option>
                      {suppliers.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label">Projet lié</label>
                  <select className="input" value={form.project_id} onChange={event => update('project_id', event.target.value)}>
                    <option value="">— Frais général / historique —</option>
                    {projects.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </div>
                {kind === 'depense' && (
                  <div>
                    <label className="label">Catégorie</label>
                    <select className="input" value={form.category} onChange={event => update('category', event.target.value)}>
                      {EXPENSE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                )}
              </FormGrid>
            </FormSection>
          )}

          <FormSection title="Montants et dates">
            <FormGrid cols={3}>
              <div>
                <label className="label">Montant total <span className="text-red-400">*</span></label>
                <input type="number" min="0.01" step="0.01" className="input" value={form.amount} onChange={event => update('amount', event.target.value)} />
              </div>
              <div>
                <label className="label">Devise</label>
                <select className="input" value={form.currency} onChange={event => update('currency', event.target.value)}>
                  {FINANCIAL_CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}
                </select>
              </div>
              {(kind === 'vente' || kind === 'dette') && (
                <div>
                  <label className="label">Déjà réglé</label>
                  <input type="number" min="0" step="0.01" className="input" value={form.paid_amount} onChange={event => update('paid_amount', event.target.value)} />
                </div>
              )}
            </FormGrid>
            <FormGrid cols={2}>
              <div>
                <label className="label">Date <span className="text-red-400">*</span></label>
                <input type="date" className="input" value={form.issue_date} onChange={event => update('issue_date', event.target.value)} />
              </div>
              {(kind === 'vente' || kind === 'creance' || kind === 'depense' || kind === 'dette') && (
                <div>
                  <label className="label">Échéance</label>
                  <input type="date" className="input" value={form.due_date} onChange={event => update('due_date', event.target.value)} />
                </div>
              )}
            </FormGrid>
            {kind === 'depense' && (
              <div>
                <label className="label">État de la dépense</label>
                <select className="input" value={form.status} onChange={event => update('status', event.target.value)}>
                  <option value="payee">Déjà payée</option>
                  <option value="engagee">Engagée, non payée</option>
                  <option value="prevue">Prévue</option>
                </select>
              </div>
            )}
          </FormSection>

          <FormSection title="Références">
            <FormGrid cols={2}>
              <div>
                <label className="label">Référence externe</label>
                <input className="input" value={form.external_reference} onChange={event => update('external_reference', event.target.value)} placeholder="Facture, pièce ou référence historique" />
              </div>
              {(kind === 'recette' || kind === 'vente' || kind === 'dette') && (
                <div>
                  <label className="label">Référence bancaire</label>
                  <input className="input" value={form.bank_reference} onChange={event => update('bank_reference', event.target.value)} />
                </div>
              )}
            </FormGrid>
            <div>
              <label className="label">Description</label>
              <input className="input" value={form.description} onChange={event => update('description', event.target.value)} />
            </div>
            <div>
              <label className="label">Notes internes</label>
              <textarea className="input min-h-20 resize-none" value={form.notes} onChange={event => update('notes', event.target.value)} />
            </div>
          </FormSection>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">Annuler</button>
            <button type="button" onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
