import { createClient } from '@/lib/supabase/server'
import ExportQuotationPdfButton from '@/components/quotations/ExportQuotationPdfButton'
import { PageHeader } from '@/components/ui/page-header'
import { notFound } from 'next/navigation'

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles')
    .select('role')
    .eq('id', user!.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  const { data: quotation } = await supabase
    .from('quotations_v2')
    .select(isAdmin
      ? '*, clients(*)'
      : `id, number, status, issued_date, valid_until, currency,
         subtotal, discount_global, total_sell, payment_terms,
         delivery_delay, warranty, notes, client_id, assigned_to,
         clients(*)`)
    .eq('id', id)
    .single()

  const { data: quotationLines } = await supabase
    .from('quotation_lines')
    .select(isAdmin
      ? '*'
      : `id, quotation_id, product_id, sort_order, designation,
         description, reference, quantity, unit, unit_price_sell,
         discount_pct, line_total_sell, notes`)
    .eq('quotation_id', id)
    .order('sort_order')

  if (!quotation) notFound()

  const quotationRecord = quotation as unknown as Record<string, any>
  const lineRecords = (quotationLines ?? []) as unknown as Record<string, any>[]

  return (
    <div className="space-y-6">
      <div className="card p-6 flex items-center justify-between gap-4">
        <PageHeader
          title={String(quotationRecord.number)}
          description={quotationRecord.clients?.company_name ||
            quotationRecord.clients?.company ||
            quotationRecord.clients?.name ||
            'Quotation detail'}
          backHref="/quotations"
          backLabel="Retour aux quotations"
        />

        <ExportQuotationPdfButton
          quotation={quotationRecord}
          lines={lineRecords}
        />
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">
          Items
        </h2>

        <div className="space-y-3">
          {lineRecords.map((line) => (
            <div
              key={line.id}
              className="flex items-center justify-between border rounded-lg p-4"
            >
              <div>
                <div className="font-medium">
                  {line.designation || line.description || '-'}
                </div>

                <div className="text-sm text-gray-400">
                  Qty: {line.quantity || 1}
                </div>
              </div>

              <div className="font-semibold">
                {Number(line.line_total_sell || 0).toLocaleString()}{' '}
                {quotationRecord.currency}
              </div>
            </div>
          ))}

          {!lineRecords.length && (
            <div className="text-sm text-gray-400">
              No items found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
