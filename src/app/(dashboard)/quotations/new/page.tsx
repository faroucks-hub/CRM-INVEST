import CreateQuotationForm from '@/components/quotations/CreateQuotationForm'
import { PageHeader } from '@/components/ui/page-header'

export default function NewQuotationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Quotation"
        description="Create industrial quotation / proposal"
        backHref="/quotations"
        backLabel="Retour aux quotations"
      />

      <CreateQuotationForm />
    </div>
  )
}