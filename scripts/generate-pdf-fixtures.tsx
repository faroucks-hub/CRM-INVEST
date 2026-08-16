import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { QuotationPDF, ProformaPDF } from '../src/lib/pdf/quotation-pdf'
import { TransmittalPDF } from '../src/lib/pdf/transmittal-pdf'
import { CommercialInvoicePDF } from '../src/lib/pdf/commercial-invoice-pdf'
import { PackingListPDF } from '../src/lib/pdf/packing-list-pdf'
import { DeliveryNotePDF } from '../src/lib/pdf/delivery-note-pdf'
import { buildCalculationPdf } from '../src/lib/pdf/calculator-report'
import { buildReportsExcel, buildReportsPdf } from '../src/lib/reports/export'

async function main() {
const outputDir = resolve('tmp/pdfs')
await mkdir(outputDir, { recursive: true })

const client = {
  company_name: 'West Africa Industrial Energy Corporation',
  contact_name: 'Mme Aminata Kouyaté',
  address: 'Zone industrielle de Vridi, bâtiment administratif principal',
  city: 'Abidjan',
  country: 'Côte d’Ivoire',
  contact_email: 'projects@example.com',
  contact_phone: '+225 00 00 00 00 00',
}

const lines = Array.from({ length: 25 }, (_, index) => ({
  id: `line-${index + 1}`,
  designation: index % 2
    ? `Industrial UPS system ${10 + index} kVA`
    : `Thyristor rectifier and battery charger ${110 + index} VDC`,
  description:
    'Complete industrial assembly with isolation transformer, protection, monitoring, communication and commissioning documentation.',
  reference: `IME-E2E-${String(index + 1).padStart(3, '0')}`,
  quantity: index % 3 + 1,
  unit: 'set',
  unit_price_sell: 4250 + index * 125,
  discount_pct: index % 4 === 0 ? 5 : 0,
  line_total_sell:
    (index % 3 + 1) * (4250 + index * 125) * (index % 4 === 0 ? 0.95 : 1),
  hs_code: '85044090',
  country_origin: 'Türkiye',
  net_weight: 120 + index * 4,
  gross_weight: 145 + index * 4,
  packages: 1,
  package_type: 'Wooden case',
  length_cm: 120,
  width_cm: 80,
  height_cm: 160,
}))

const baseDocument = {
  number: 'IME-26-Q0099',
  status: 'envoyee',
  payment_status: 'partiel',
  issued_date: '2026-07-28',
  valid_until: '2026-08-27',
  currency: 'EUR',
  incoterm: 'CIF Port of Abidjan',
  delivery_delay: '8 à 10 semaines après approbation technique',
  warranty: '24 mois après expédition ou 18 mois après mise en service',
  payment_terms: '30% à la commande, 70% avant expédition',
  discount_global: 2.5,
  amount_received: 25000,
  client,
  clients: client,
  assigned_user: { full_name: 'Farouck Oumar SANOGO' },
  intro_text:
    'Nous vous remercions pour votre consultation et vous soumettons notre proposition technique et commerciale.',
  technical_notes:
    'La configuration finale reste soumise à validation du schéma unifilaire, des conditions du site et des documents approuvés.',
  notes:
    'Offre hors travaux civils et câblage externe. Emballage export maritime inclus.',
  lines,
}

const qrCode = await QRCode.toDataURL('https://www.im-energie.com/verify/IME-26-Q0099')

async function saveReactPdf(
  name: string,
  element: Parameters<typeof renderToBuffer>[0],
) {
  const buffer = await renderToBuffer(element)
  await writeFile(resolve(outputDir, name), buffer)
}

await saveReactPdf(
  'quotation-sample.pdf',
  <QuotationPDF quot={baseDocument} qrCode={qrCode} />,
)
await saveReactPdf(
  'proforma-sample.pdf',
  <ProformaPDF
    prof={{ ...baseDocument, number: 'IME-26-F0099', bank_name: 'Test Bank', bank_iban: 'TR00 0000 0000 0000 0000 0000 00', bank_swift: 'TESTTRIS' }}
    qrCode={qrCode}
  />,
)
await saveReactPdf(
  'transmittal-sample.pdf',
  <TransmittalPDF
    data={{
      transmittal_number: 'TR-2026-0099',
      subject: 'Approved engineering documents for manufacturing release',
      client_name: client.company_name,
      client_email: client.contact_email,
      attention: client.contact_name,
      created_at: '2026-07-28',
      project_number: 'IME-26-PRJ-0099',
      project_name: 'Industrial power conversion package',
      prepared_by: 'Farouck Oumar SANOGO',
      comments: 'Please acknowledge receipt and return the signed document register.',
      documents: lines.slice(0, 18).map((line, index) => ({
        file_name: `${line.reference}-${line.designation}.pdf`,
        revision: index % 3,
        document_type: index % 2 ? 'Datasheet' : 'Drawing',
      })),
    }}
    qrCode={qrCode}
  />,
)
await saveReactPdf(
  'commercial-invoice-sample.pdf',
  <CommercialInvoicePDF
    invoice={{
      ...baseDocument,
      number: 'IME-26-F0099',
      invoice_number: 'CI-IME-26-F0099',
      project_reference: 'IME-26-PRJ-0099',
      country_origin: 'Türkiye',
      freight_amount: 3800,
      insurance_amount: 450,
      port_loading: 'Ambarlı, Istanbul',
      port_discharge: 'Port of Abidjan',
    }}
  />,
)
await saveReactPdf(
  'packing-list-sample.pdf',
  <PackingListPDF
    packing={{
      ...baseDocument,
      number: 'PL-IME-26-F0099',
      project_reference: 'IME-26-PRJ-0099',
      lines,
    }}
  />,
)
await saveReactPdf(
  'delivery-note-sample.pdf',
  <DeliveryNotePDF
    delivery={{
      ...baseDocument,
      number: 'DN-IME-26-F0099',
      project_reference: 'IME-26-PRJ-0099',
      delivery_date: '2026-10-15',
      lines,
    }}
  />,
)

const calculator = await buildCalculationPdf([{
  type: 'frequency_converter',
  name: 'Convertisseur de fréquence 20 kW - 400 Hz',
  client: client.company_name,
  project: 'IME-26-PRJ-0099',
  quotation: 'IME-26-Q0099',
  createdAt: '2026-07-28T10:00:00Z',
  inputs: {
    load_kw: 20,
    load_power_factor: 0.8,
    input_voltage: 400,
    input_phases: 3,
    input_frequency: 50,
    output_voltage: 200,
    output_phases: 3,
    output_frequency: 400,
    efficiency: 92,
    safety_margin: 20,
  },
  outputs: {
    recommended_kva: 30,
    input_current_a: 34.86,
    output_current_a: 72.17,
    conversion_ratio: 8,
    recommendation: 'Frequency Converter 30 kVA, entrée 400 V / 50 Hz, sortie 200 V / 400 Hz.',
    warning: 'Confirmer le filtre sinusoïdal, le transformateur et la compatibilité de la charge.',
    disclaimer: 'Pré-dimensionnement à valider par un ingénieur.',
  },
}])
await writeFile(
  resolve(outputDir, 'calculator-sample.pdf'),
  Buffer.from(calculator.output('arraybuffer')),
)

const reportPayload = {
  role: 'admin' as const,
  startDate: '2026-01-01',
  endDate: '2026-07-28',
  currencyFilter: null,
  period: 'month',
  summary: ['USD', 'EUR', 'TRY', 'XOF'].map((currency, index) => ({
    currency, invoice_count: 12 + index, invoiced_amount: 150000 + index * 20000,
    collected_amount: 90000 + index * 10000, refunded_amount: 1000,
    net_collected_amount: 89000 + index * 10000,
    outstanding_amount: 61000 + index * 10000, overdue_amount: 12000,
  })),
  trend: Array.from({ length: 14 }, (_, index) => ({
    period_start: `2026-${String(index % 7 + 1).padStart(2, '0')}-01`,
    currency: index % 2 ? 'EUR' : 'USD', invoice_count: index + 1,
    invoiced_amount: 10000 + index * 800, collected_amount: 7000 + index * 500,
    refunded_amount: 0, net_collected_amount: 7000 + index * 500,
  })),
  receivables: Array.from({ length: 18 }, (_, index) => ({
    source_type: 'invoice', source_id: `inv-${index}`, reference: `IME-INV-${index + 1}`,
    client_id: `client-${index}`, client_name: `Client industriel ${index + 1}`,
    assigned_to: 'user-1', salesperson_name: index % 2 ? 'Aminata Diallo' : 'Farouck Oumar SANOGO',
    currency: index % 2 ? 'EUR' : 'USD', due_date: '2026-07-15',
    original_amount: 10000 + index * 500, paid_amount: 4000,
    outstanding: 6000 + index * 500, days_overdue: 13, aging_bucket: '1_30',
  })),
  performance: Array.from({ length: 10 }, (_, index) => ({
    salesperson_id: `sales-${index}`, salesperson_name: `Commercial ${index + 1}`,
    currency: index % 2 ? 'EUR' : 'USD', quotation_count: 10 + index,
    approved_quotation_count: 5 + index, quotation_conversion_pct: 50,
    approved_quotation_amount: 50000, project_count: 4, contract_amount: 45000,
    invoice_count: 3, invoiced_amount: 40000, net_collected_amount: 30000,
    outstanding_amount: 10000,
  })),
  financial: ['USD', 'EUR', 'TRY', 'XOF'].map(currency => ({
    currency, invoiced_sales: 150000, customer_cash_in: 90000,
    supplier_invoices: 70000, supplier_cash_out: 45000,
    project_expenses_committed: 12000, project_expenses_paid: 9000,
    estimated_operating_result: 68000, net_cash_flow: 36000,
  })),
  cashFlow: Array.from({ length: 14 }, (_, index) => ({
    period_start: `2026-${String(index % 7 + 1).padStart(2, '0')}-01`,
    currency: index % 2 ? 'EUR' : 'USD', cash_in: 20000,
    supplier_out: 10000, expense_out: 2500, net_cash_flow: 7500,
  })),
  supplierDebts: Array.from({ length: 18 }, (_, index) => ({
    invoice_id: `si-${index}`, reference: `IME-SI-${index + 1}`,
    supplier_id: `supplier-${index}`, supplier_name: `Fabricant partenaire ${index + 1}`,
    project_id: `project-${index}`, currency: index % 2 ? 'EUR' : 'USD',
    due_date: '2026-07-10', original_amount: 8000 + index * 300,
    paid_amount: 3000, outstanding: 5000 + index * 300,
    days_overdue: 18, aging_bucket: '1_30',
  })),
}
const reportPdf = await buildReportsPdf(reportPayload)
await writeFile(resolve(outputDir, 'reports-sample.pdf'), Buffer.from(reportPdf.output('arraybuffer')))
await writeFile(resolve(outputDir, 'reports-sample.xlsx'), await buildReportsExcel(reportPayload))

console.log(`PDF_FIXTURES_OK ${outputDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
