import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import ReportsDashboard from '@/components/rapports/ReportsDashboard'
import type {
  CashFlowReport,
  FinancialReportSummary,
  ReceivableAging,
  SalespersonPerformance,
  SalesReportSummary,
  SalesReportTrend,
  SupplierDebtAging,
} from '@/types/reporting'
import type { UserRole } from '@/types'

export const metadata: Metadata = { title: 'Rapports & Performance' }
export const dynamic = 'force-dynamic'

interface SearchParams {
  debut?: string
  fin?: string
  devise?: string
  periode?: string
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function isDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

function validPeriod(value?: string) {
  return ['day', 'week', 'month', 'quarter', 'year'].includes(value ?? '')
    ? value!
    : 'month'
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const now = new Date()
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  const startDate = isDate(searchParams.debut) ? searchParams.debut! : isoDate(yearStart)
  const endDate = isDate(searchParams.fin) ? searchParams.fin! : isoDate(now)
  const currency = searchParams.devise?.trim().toUpperCase() || null
  const period = validPeriod(searchParams.periode)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'commercial') as UserRole
  const isAdmin = role === 'admin'
  const dateParams = {
    p_start_date: startDate,
    p_end_date: endDate,
    p_currency: currency,
  }

  const [
    summaryResult,
    trendResult,
    receivablesResult,
    performanceResult,
    financialResult,
    cashFlowResult,
    supplierDebtsResult,
  ] = await Promise.all([
    supabase.rpc('get_sales_report_summary', dateParams),
    supabase.rpc('get_sales_report_trend', { ...dateParams, p_period: period }),
    supabase.rpc('get_receivables_aging', {
      p_as_of_date: endDate,
      p_currency: currency,
    }),
    supabase.rpc('get_salesperson_performance', dateParams),
    isAdmin
      ? supabase.rpc('get_financial_report_summary', dateParams)
      : Promise.resolve({ data: [], error: null }),
    isAdmin
      ? supabase.rpc('get_cash_flow_report', { ...dateParams, p_period: period })
      : Promise.resolve({ data: [], error: null }),
    isAdmin
      ? supabase.rpc('get_supplier_debts_aging', {
          p_as_of_date: endDate,
          p_currency: currency,
        })
      : Promise.resolve({ data: [], error: null }),
  ])

  const errors = [
    summaryResult.error,
    trendResult.error,
    receivablesResult.error,
    performanceResult.error,
    financialResult.error,
    cashFlowResult.error,
    supplierDebtsResult.error,
  ].filter(Boolean).map(error => error!.message)

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Rapports & Performance"
          description={
            role === 'commercial'
              ? 'Suivi de vos ventes, encaissements, créances et performances.'
              : 'Pilotage des ventes, encaissements, créances et performances IM ÉNERGIE.'
          }
        />
        {role !== 'commercial' && (
          <Link href="/rapports/saisie-financiere" className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" /> Saisir des données
          </Link>
        )}
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4" method="get">
        <label className="min-w-[150px]">
          <span className="label">Du</span>
          <input className="input h-9 text-sm" type="date" name="debut" defaultValue={startDate} />
        </label>
        <label className="min-w-[150px]">
          <span className="label">Au</span>
          <input className="input h-9 text-sm" type="date" name="fin" defaultValue={endDate} />
        </label>
        <label className="min-w-[140px]">
          <span className="label">Devise</span>
          <select className="input h-9 text-sm" name="devise" defaultValue={currency ?? ''}>
            <option value="">Toutes</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="TRY">TRY</option>
            <option value="XOF">XOF</option>
          </select>
        </label>
        <label className="min-w-[150px]">
          <span className="label">Regroupement</span>
          <select className="input h-9 text-sm" name="periode" defaultValue={period}>
            <option value="day">Jour</option>
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Année</option>
          </select>
        </label>
        <button className="btn btn-primary btn-sm h-9" type="submit">
          Actualiser
        </button>
      </form>

      <ReportsDashboard
        role={role}
        summary={(summaryResult.data ?? []) as SalesReportSummary[]}
        trend={(trendResult.data ?? []) as SalesReportTrend[]}
        receivables={(receivablesResult.data ?? []) as ReceivableAging[]}
        performance={(performanceResult.data ?? []) as SalespersonPerformance[]}
        financial={(financialResult.data ?? []) as FinancialReportSummary[]}
        cashFlow={(cashFlowResult.data ?? []) as CashFlowReport[]}
        supplierDebts={(supplierDebtsResult.data ?? []) as SupplierDebtAging[]}
        errors={errors}
        period={period}
        startDate={startDate}
        endDate={endDate}
        currencyFilter={currency}
      />
    </div>
  )
}
