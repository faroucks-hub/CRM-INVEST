'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle, Banknote, BriefcaseBusiness, CircleDollarSign,
  Clock3, FileText, Landmark, ReceiptText, TrendingUp, Users,
} from 'lucide-react'
import type {
  CashFlowReport,
  FinancialReportSummary,
  ReceivableAging,
  SalespersonPerformance,
  SalesReportSummary,
  SalesReportTrend,
  SupplierDebtAging,
} from '@/types/reporting'
import {
  CashFlowChart,
  ReceivablesAgingChart,
  SalespersonChart,
  SalesTrendChart,
} from './ReportsCharts'
import { ReportExportButtons } from './ReportExportButtons'

type Tab = 'ventes' | 'creances' | 'vendeurs' | 'finance' | 'dettes'

interface Props {
  role: 'admin' | 'lead_team' | 'commercial'
  summary: SalesReportSummary[]
  trend: SalesReportTrend[]
  receivables: ReceivableAging[]
  performance: SalespersonPerformance[]
  financial: FinancialReportSummary[]
  cashFlow: CashFlowReport[]
  supplierDebts: SupplierDebtAging[]
  errors: string[]
  period: string
  startDate: string
  endDate: string
  currencyFilter: string | null
}

const AGING_LABELS: Record<string, string> = {
  non_echue: 'Non échue',
  '1_30': '1–30 jours',
  '31_60': '31–60 jours',
  '61_90': '61–90 jours',
  plus_90: '+90 jours',
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function date(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

function MetricByCurrency({
  title,
  rows,
  field,
  icon: Icon,
  tone = 'text-navy-900',
}: {
  title: string
  rows: SalesReportSummary[]
  field: keyof SalesReportSummary
  icon: React.ElementType
  tone?: string
}) {
  return (
    <div className="card p-4 min-h-[112px]">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{title}</span>
        <Icon className="h-4 w-4 text-gray-300" />
      </div>
      <div className={`mt-3 space-y-1 text-lg font-semibold ${tone}`}>
        {rows.length ? rows.map(row => (
          <div key={row.currency} className="flex items-baseline justify-between gap-3">
            <span>{money(Number(row[field]), row.currency)}</span>
            <span className="text-2xs font-medium text-gray-400">{row.currency}</span>
          </div>
        )) : <span className="text-gray-300">—</span>}
      </div>
    </div>
  )
}

function EmptyRow({ colSpan, label = 'Aucune donnée sur la période.' }: { colSpan: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-gray-400">
        {label}
      </td>
    </tr>
  )
}

const tableClass = 'w-full text-sm'
const thClass = 'px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-400'
const tdClass = 'px-4 py-3 align-top'

export default function ReportsDashboard({
  role,
  summary,
  trend,
  receivables,
  performance,
  financial,
  cashFlow,
  supplierDebts,
  errors,
  period,
  startDate,
  endDate,
  currencyFilter,
}: Props) {
  const isAdmin = role === 'admin'
  const [tab, setTab] = useState<Tab>('ventes')

  const tabs: { key: Tab; label: string; icon: React.ElementType; admin?: boolean }[] = [
    { key: 'ventes', label: 'Ventes', icon: TrendingUp },
    { key: 'creances', label: 'Créances', icon: Clock3 },
    { key: 'vendeurs', label: role === 'commercial' ? 'Ma performance' : 'Vendeurs', icon: Users },
    { key: 'finance', label: 'Bilan financier', icon: Landmark, admin: true },
    { key: 'dettes', label: 'Dettes fournisseurs', icon: ReceiptText, admin: true },
  ]

  const visibleTabs = tabs.filter(item => !item.admin || isAdmin)
  const overdueCount = receivables.filter(item => item.days_overdue > 0).length
  const receivablesByCurrency = useMemo(() => {
    const totals = new Map<string, number>()
    receivables.forEach(item => {
      totals.set(item.currency, (totals.get(item.currency) ?? 0) + Number(item.outstanding))
    })
    return [...totals.entries()]
  }, [receivables])

  return (
    <div className="space-y-5">
      <ReportExportButtons payload={{
        role, startDate, endDate, currencyFilter, period, summary, trend,
        receivables, performance, financial, cashFlow, supplierDebts,
      }} />

      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Données de reporting incomplètes</p>
              <p className="mt-1 text-xs text-amber-700">
                Vérifiez que les migrations 011 à 015 ont été exécutées dans Supabase.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricByCurrency title="Ventes facturées" rows={summary} field="invoiced_amount" icon={FileText} />
        <MetricByCurrency title="Encaissements nets" rows={summary} field="net_collected_amount" icon={Banknote} tone="text-green-700" />
        <MetricByCurrency title="Créances ouvertes" rows={summary} field="outstanding_amount" icon={CircleDollarSign} tone="text-amber-600" />
        <MetricByCurrency title="Créances en retard" rows={summary} field="overdue_amount" icon={AlertTriangle} tone="text-red-600" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 bg-gray-50/60 px-3 pt-3">
          {visibleTabs.map(item => {
            const Icon = item.icon
            const active = tab === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border border-b-white border-gray-200 bg-white text-navy-900 -mb-px'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </div>

        {tab === 'ventes' && (
          <div>
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold text-navy-900">Évolution des ventes et encaissements</h2>
              <p className="text-xs text-gray-400">Analyse chronologique, séparée par devise.</p>
            </div>
            <SalesTrendChart rows={trend} period={period} />
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className={thClass}>Période</th>
                    <th className={thClass}>Devise</th>
                    <th className={`${thClass} text-right`}>Factures</th>
                    <th className={`${thClass} text-right`}>Facturé</th>
                    <th className={`${thClass} text-right`}>Encaissé</th>
                    <th className={`${thClass} text-right`}>Remboursé</th>
                    <th className={`${thClass} text-right`}>Net encaissé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trend.length ? trend.map(row => (
                    <tr key={`${row.period_start}-${row.currency}`} className="hover:bg-gray-50/60">
                      <td className={tdClass}>{date(row.period_start)}</td>
                      <td className={tdClass}><span className="badge">{row.currency}</span></td>
                      <td className={`${tdClass} text-right`}>{row.invoice_count}</td>
                      <td className={`${tdClass} text-right font-medium`}>{money(row.invoiced_amount, row.currency)}</td>
                      <td className={`${tdClass} text-right text-green-700`}>{money(row.collected_amount, row.currency)}</td>
                      <td className={`${tdClass} text-right text-red-500`}>{money(row.refunded_amount, row.currency)}</td>
                      <td className={`${tdClass} text-right font-semibold`}>{money(row.net_collected_amount, row.currency)}</td>
                    </tr>
                  )) : <EmptyRow colSpan={7} />}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'creances' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <h2 className="font-semibold text-navy-900">Créances clients</h2>
                <p className="text-xs text-gray-400">{overdueCount} créance{overdueCount > 1 ? 's' : ''} en retard.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {receivablesByCurrency.map(([currency, total]) => (
                  <span key={currency} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    {money(total, currency)}
                  </span>
                ))}
              </div>
            </div>
            <ReceivablesAgingChart rows={receivables} />
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className={thClass}>Référence</th>
                    <th className={thClass}>Client</th>
                    <th className={thClass}>Commercial</th>
                    <th className={thClass}>Échéance</th>
                    <th className={thClass}>Ancienneté</th>
                    <th className={`${thClass} text-right`}>Reste dû</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {receivables.length ? receivables.map(row => (
                    <tr key={`${row.source_type}-${row.source_id}`} className="hover:bg-gray-50/60">
                      <td className={`${tdClass} font-medium text-navy-900`}>{row.reference}</td>
                      <td className={tdClass}>{row.client_name}</td>
                      <td className={`${tdClass} text-gray-500`}>{row.salesperson_name || '—'}</td>
                      <td className={`${tdClass} ${row.days_overdue > 0 ? 'text-red-600' : ''}`}>{date(row.due_date)}</td>
                      <td className={tdClass}>
                        <span className={`rounded-full px-2 py-1 text-2xs font-medium ${
                          row.days_overdue > 60 ? 'bg-red-50 text-red-600' :
                          row.days_overdue > 0 ? 'bg-amber-50 text-amber-700' :
                          'bg-green-50 text-green-700'
                        }`}>
                          {AGING_LABELS[row.aging_bucket] ?? row.aging_bucket}
                        </span>
                      </td>
                      <td className={`${tdClass} text-right font-semibold`}>{money(row.outstanding, row.currency)}</td>
                    </tr>
                  )) : <EmptyRow colSpan={6} label="Aucune créance ouverte." />}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'vendeurs' && (
          <div>
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold text-navy-900">
                {role === 'commercial' ? 'Ma performance commerciale' : 'Performance des vendeurs'}
              </h2>
              <p className="text-xs text-gray-400">Résultats séparés par vendeur et par devise.</p>
            </div>
            <SalespersonChart rows={performance} />
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className={thClass}>Commercial</th>
                    <th className={thClass}>Devise</th>
                    <th className={`${thClass} text-right`}>Devis</th>
                    <th className={`${thClass} text-right`}>Conversion</th>
                    <th className={`${thClass} text-right`}>Projets</th>
                    <th className={`${thClass} text-right`}>Facturé</th>
                    <th className={`${thClass} text-right`}>Encaissé</th>
                    <th className={`${thClass} text-right`}>Créances</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {performance.length ? performance.map(row => (
                    <tr key={`${row.salesperson_id}-${row.currency}`} className="hover:bg-gray-50/60">
                      <td className={`${tdClass} font-medium text-navy-900`}>{row.salesperson_name}</td>
                      <td className={tdClass}>{row.currency}</td>
                      <td className={`${tdClass} text-right`}>{row.approved_quotation_count}/{row.quotation_count}</td>
                      <td className={`${tdClass} text-right font-medium`}>{Number(row.quotation_conversion_pct).toFixed(1)}%</td>
                      <td className={`${tdClass} text-right`}>{row.project_count}</td>
                      <td className={`${tdClass} text-right`}>{money(row.invoiced_amount, row.currency)}</td>
                      <td className={`${tdClass} text-right text-green-700`}>{money(row.net_collected_amount, row.currency)}</td>
                      <td className={`${tdClass} text-right text-amber-700`}>{money(row.outstanding_amount, row.currency)}</td>
                    </tr>
                  )) : <EmptyRow colSpan={8} />}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'finance' && isAdmin && (
          <div className="space-y-5 p-5">
            <div>
              <h2 className="font-semibold text-navy-900">Bilan financier</h2>
              <p className="text-xs text-gray-400">Données sensibles réservées à l’administrateur.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {financial.map(row => (
                <div key={row.currency} className="rounded-lg border border-gray-100 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-semibold text-navy-900">{row.currency}</span>
                    <BriefcaseBusiness className="h-4 w-4 text-gray-300" />
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-gray-400">Ventes facturées</dt><dd>{money(row.invoiced_sales, row.currency)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-gray-400">Achats fournisseurs</dt><dd>{money(row.supplier_invoices, row.currency)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-gray-400">Dépenses engagées</dt><dd>{money(row.project_expenses_committed, row.currency)}</dd></div>
                    <div className="flex justify-between gap-3 border-t pt-2 font-semibold">
                      <dt>Résultat estimé</dt>
                      <dd className={Number(row.estimated_operating_result) >= 0 ? 'text-green-700' : 'text-red-600'}>
                        {money(row.estimated_operating_result, row.currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 font-semibold">
                      <dt>Flux net</dt>
                      <dd className={Number(row.net_cash_flow) >= 0 ? 'text-green-700' : 'text-red-600'}>
                        {money(row.net_cash_flow, row.currency)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
              {!financial.length && <p className="text-sm text-gray-400">Aucune donnée financière.</p>}
            </div>

            <div className="-mx-5 border-t">
              <CashFlowChart rows={cashFlow} period={period} />
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className={tableClass}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className={thClass}>Période</th>
                    <th className={thClass}>Devise</th>
                    <th className={`${thClass} text-right`}>Entrées</th>
                    <th className={`${thClass} text-right`}>Fournisseurs</th>
                    <th className={`${thClass} text-right`}>Dépenses</th>
                    <th className={`${thClass} text-right`}>Flux net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cashFlow.length ? cashFlow.map(row => (
                    <tr key={`${row.period_start}-${row.currency}`}>
                      <td className={tdClass}>{date(row.period_start)}</td>
                      <td className={tdClass}>{row.currency}</td>
                      <td className={`${tdClass} text-right text-green-700`}>{money(row.cash_in, row.currency)}</td>
                      <td className={`${tdClass} text-right`}>{money(row.supplier_out, row.currency)}</td>
                      <td className={`${tdClass} text-right`}>{money(row.expense_out, row.currency)}</td>
                      <td className={`${tdClass} text-right font-semibold`}>{money(row.net_cash_flow, row.currency)}</td>
                    </tr>
                  )) : <EmptyRow colSpan={6} />}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'dettes' && isAdmin && (
          <div>
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold text-navy-900">Dettes fournisseurs</h2>
              <p className="text-xs text-gray-400">Factures fournisseurs restant à régler.</p>
            </div>
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className={thClass}>Référence</th>
                    <th className={thClass}>Fournisseur</th>
                    <th className={thClass}>Échéance</th>
                    <th className={thClass}>Ancienneté</th>
                    <th className={`${thClass} text-right`}>Facture</th>
                    <th className={`${thClass} text-right`}>Payé</th>
                    <th className={`${thClass} text-right`}>Reste dû</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supplierDebts.length ? supplierDebts.map(row => (
                    <tr key={row.invoice_id} className="hover:bg-gray-50/60">
                      <td className={`${tdClass} font-medium text-navy-900`}>{row.reference}</td>
                      <td className={tdClass}>{row.supplier_name}</td>
                      <td className={`${tdClass} ${row.days_overdue > 0 ? 'text-red-600' : ''}`}>{date(row.due_date)}</td>
                      <td className={tdClass}>{AGING_LABELS[row.aging_bucket] ?? row.aging_bucket}</td>
                      <td className={`${tdClass} text-right`}>{money(row.original_amount, row.currency)}</td>
                      <td className={`${tdClass} text-right text-green-700`}>{money(row.paid_amount, row.currency)}</td>
                      <td className={`${tdClass} text-right font-semibold text-red-600`}>{money(row.outstanding, row.currency)}</td>
                    </tr>
                  )) : <EmptyRow colSpan={7} label="Aucune dette fournisseur ouverte." />}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
