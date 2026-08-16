'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  CashFlowReport,
  ReceivableAging,
  SalespersonPerformance,
  SalesReportTrend,
} from '@/types/reporting'

const COLORS = {
  navy: '#10243e',
  gold: '#d5a928',
  green: '#15803d',
  amber: '#d97706',
  red: '#dc2626',
  slate: '#64748b',
  grid: '#e5e7eb',
}

const AGING_ORDER = ['non_echue', '1_30', '31_60', '61_90', 'plus_90']
const AGING_LABELS: Record<string, string> = {
  non_echue: 'Non échue',
  '1_30': '1–30 j',
  '31_60': '31–60 j',
  '61_90': '61–90 j',
  plus_90: '+90 j',
}

function compact(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0)
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function periodLabel(value: string, period: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  const options: Intl.DateTimeFormatOptions = period === 'year'
    ? { year: 'numeric', timeZone: 'UTC' }
    : period === 'month' || period === 'quarter'
      ? { month: 'short', year: '2-digit', timeZone: 'UTC' }
      : { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' }
  return new Intl.DateTimeFormat('fr-FR', options).format(date)
}

function uniqueCurrencies(rows: { currency: string }[]) {
  return [...new Set(rows.map(row => row.currency).filter(Boolean))].sort()
}

function useCurrency(rows: { currency: string }[]) {
  const currencies = useMemo(() => uniqueCurrencies(rows), [rows])
  const [currency, setCurrency] = useState(currencies[0] ?? 'USD')

  useEffect(() => {
    if (!currencies.includes(currency)) setCurrency(currencies[0] ?? 'USD')
  }, [currencies, currency])

  return { currencies, currency, setCurrency }
}

function ChartCard({
  title,
  description,
  currencies,
  currency,
  onCurrencyChange,
  empty,
  height = 288,
  children,
}: {
  title: string
  description: string
  currencies: string[]
  currency: string
  onCurrencyChange: (currency: string) => void
  empty: boolean
  height?: number
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-gray-100 p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-400">{description}</p>
        </div>
        {currencies.length > 1 && (
          <div className="flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
            {currencies.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => onCurrencyChange(item)}
                className={`rounded px-2.5 py-1 text-2xs font-semibold transition ${
                  currency === item
                    ? 'bg-white text-navy-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
      {empty ? (
        <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
          Pas encore assez de données pour ce graphique.
        </div>
      ) : (
        <div className="w-full" style={{ height }}>{children}</div>
      )}
    </div>
  )
}

export function SalesTrendChart({ rows, period }: { rows: SalesReportTrend[]; period: string }) {
  const { currencies, currency, setCurrency } = useCurrency(rows)
  const data = rows
    .filter(row => row.currency === currency)
    .map(row => ({
      period: periodLabel(row.period_start, period),
      factured: Number(row.invoiced_amount),
      collected: Number(row.net_collected_amount),
    }))

  return (
    <ChartCard
      title="Tendance du chiffre d’affaires"
      description="Comparaison entre montants facturés et encaissements nets."
      currencies={currencies}
      currency={currency}
      onCurrencyChange={setCurrency}
      empty={!data.length}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: COLORS.slate }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: COLORS.slate }} tickLine={false} axisLine={false} width={58} />
          <Tooltip formatter={(value) => money(Number(value), currency)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="factured" name="Facturé" stroke={COLORS.navy} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="collected" name="Encaissé net" stroke={COLORS.green} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function ReceivablesAgingChart({ rows }: { rows: ReceivableAging[] }) {
  const { currencies, currency, setCurrency } = useCurrency(rows)
  const data = AGING_ORDER.map(bucket => ({
    bucket: AGING_LABELS[bucket],
    amount: rows
      .filter(row => row.currency === currency && row.aging_bucket === bucket)
      .reduce((sum, row) => sum + Number(row.outstanding), 0),
  }))

  return (
    <ChartCard
      title="Ancienneté des créances"
      description="Montants restant dus, classés selon leur retard."
      currencies={currencies}
      currency={currency}
      onCurrencyChange={setCurrency}
      empty={!rows.some(row => row.currency === currency)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: COLORS.slate }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: COLORS.slate }} tickLine={false} axisLine={false} width={58} />
          <Tooltip formatter={(value) => money(Number(value), currency)} />
          <Bar dataKey="amount" name="Reste dû" fill={COLORS.amber} radius={[5, 5, 0, 0]} maxBarSize={64} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function SalespersonChart({ rows }: { rows: SalespersonPerformance[] }) {
  const { currencies, currency, setCurrency } = useCurrency(rows)
  const data = rows
    .filter(row => row.currency === currency)
    .sort((a, b) => Number(b.invoiced_amount) - Number(a.invoiced_amount))
    .map(row => ({
      salesperson: row.salesperson_name,
      factured: Number(row.invoiced_amount),
      collected: Number(row.net_collected_amount),
    }))

  const height = Math.max(288, data.length * 52)

  return (
    <ChartCard
      title="Comparaison des vendeurs"
      description="Montants facturés et encaissés par commercial."
      currencies={currencies}
      currency={currency}
      onCurrencyChange={setCurrency}
      empty={!data.length}
      height={height}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, left: 12, bottom: 4 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11, fill: COLORS.slate }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="salesperson" width={128} tick={{ fontSize: 11, fill: COLORS.slate }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => money(Number(value), currency)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="factured" name="Facturé" fill={COLORS.navy} radius={[0, 4, 4, 0]} maxBarSize={16} />
          <Bar dataKey="collected" name="Encaissé net" fill={COLORS.gold} radius={[0, 4, 4, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function CashFlowChart({ rows, period }: { rows: CashFlowReport[]; period: string }) {
  const { currencies, currency, setCurrency } = useCurrency(rows)
  const data = rows
    .filter(row => row.currency === currency)
    .map(row => ({
      period: periodLabel(row.period_start, period),
      cashIn: Number(row.cash_in),
      cashOut: Number(row.supplier_out) + Number(row.expense_out),
      net: Number(row.net_cash_flow),
    }))

  return (
    <ChartCard
      title="Évolution de la trésorerie"
      description="Entrées, sorties et flux net sur la période."
      currencies={currencies}
      currency={currency}
      onCurrencyChange={setCurrency}
      empty={!data.length}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: COLORS.slate }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: COLORS.slate }} tickLine={false} axisLine={false} width={58} />
          <Tooltip formatter={(value) => money(Number(value), currency)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke={COLORS.slate} strokeDasharray="3 3" />
          <Line type="monotone" dataKey="cashIn" name="Entrées" stroke={COLORS.green} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="cashOut" name="Sorties" stroke={COLORS.red} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="net" name="Flux net" stroke={COLORS.navy} strokeWidth={3} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
