import type { jsPDF as JsPdfType } from 'jspdf'
import type { CalcType } from '../../types/sprint5'
import { CALC_LABELS, UNIT_LABELS } from '../../types/sprint5'

export interface CalculationPdfEntry {
  type: CalcType
  name?: string
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  createdAt?: string
  client?: string
  project?: string
  quotation?: string
}

const LABELS: Record<string, string> = {
  calculation_mode: 'Mode de calcul',
  load_kw: 'Puissance active de la charge',
  kva: 'Puissance apparente',
  power_factor: 'Facteur de puissance',
  load_power_factor: 'Facteur de puissance de la charge',
  input_power_factor: "Facteur de puissance d'entrée",
  efficiency: 'Rendement',
  safety_margin: 'Marge de dimensionnement',
  aging_margin: 'Marge de vieillissement',
  temperature_margin: 'Correction de température',
  autonomy_min: 'Autonomie',
  autonomy_h: 'Autonomie',
  vdc_bus: 'Tension du bus DC',
  vdc: 'Tension du système DC',
  dc_voltage_nominal: 'Tension DC nominale',
  dc_voltage_min: 'Tension DC minimale',
  dc_voltage_max: 'Tension DC maximale',
  vac_input: "Tension AC d'entrée",
  input_voltage: "Tension d'entrée",
  output_voltage: 'Tension de sortie',
  input_frequency: "Fréquence d'entrée",
  output_frequency: 'Fréquence de sortie',
  input_phases: "Phases d'entrée",
  output_phases: 'Phases de sortie',
  phases: 'Nombre de phases',
  battery_type: 'Technologie batterie',
  battery_capacity_ah: 'Capacité batterie disponible',
  battery_block_capacity_ah: 'Capacité du bloc',
  battery_block_voltage: 'Tension du bloc',
  cell_capacity: 'Capacité du bloc ou de la cellule',
  cell_voltage: 'Tension du bloc ou de la cellule',
  battery_dod: 'Profondeur de décharge batterie',
  dod: 'Profondeur de décharge',
  load_current_a: 'Courant nominal de la charge',
  recharge_time_h: 'Temps de recharge',
  recharge_factor: 'Facteur de recharge',
  redundancy: 'Modules / redondance',
  load_type: 'Type de charge',
  overload_factor: 'Facteur de surcharge',
  overload_capability: 'Capacité de surcharge',
  starting_current_factor: 'Facteur de courant de démarrage',
  cycle_life: 'Durée de vie en cycles',
  cycles_per_day: 'Cycles équivalents par jour',
  calendar_life_y: 'Durée de vie calendaire',
  peak_factor: 'Facteur de pointe',
  application: 'Application',
  kw: 'Puissance active',
  kw_with_margin: 'Puissance active avec marge',
  dc_power_kw: 'Puissance côté DC',
  battery_energy_kwh: 'Énergie batterie',
  recommended_ah: 'Capacité batterie recommandée',
  batteries_12v: 'Nombre total d’éléments',
  batteries_per_string: 'Éléments par string',
  strings_parallel: 'Strings en parallèle',
  actual_dc_voltage: 'Tension DC réelle',
  installed_capacity_ah: 'Capacité installée',
  energy_needed_kwh: 'Énergie utile nécessaire',
  energy_nominal_kwh: 'Énergie nominale',
  capacity_ah: 'Capacité calculée',
  capacity_with_margin: 'Capacité avec corrections',
  cells_in_series: 'Éléments en série',
  total_cells: 'Nombre total d’éléments',
  total_capacity_ah: 'Capacité totale installée',
  total_energy_kwh: 'Énergie totale installée',
  estimated_autonomy_min: 'Autonomie estimée',
  actual_dod_pct: 'Profondeur de décharge réelle',
  actual_bank_voltage: 'Tension réelle du banc',
  recharge_current_a: 'Courant de recharge',
  total_current_a: 'Courant total calculé',
  recommended_current_a: 'Courant recommandé',
  ac_power_kva: 'Puissance apparente AC',
  ac_power_kw: 'Puissance active AC',
  ac_current_a: 'Courant AC',
  standard_module_current_a: 'Calibre standard par module',
  total_installed_current_a: 'Courant total installé',
  useful_energy_kwh: 'Énergie utile',
  nominal_capacity_kwh: 'Capacité nominale',
  recommended_kwh: 'Capacité BESS recommandée',
  pcs_kw: 'Puissance PCS recommandée',
  battery_power_kw: 'Puissance côté batterie',
  estimated_cycles_year: 'Cycles estimés par an',
  estimated_lifetime_y: 'Durée de vie limitée estimée',
  load_kva: 'Puissance apparente de la charge',
  required_kva: 'Besoin avec marge',
  recommended_kva: 'Puissance normalisée recommandée',
  overload_kva: 'Capacité de surcharge requise',
  dc_current_nominal_a: 'Courant DC nominal',
  dc_current_max_a: 'Courant DC maximal',
  output_current_a: 'Courant de sortie',
  required_battery_ah: 'Capacité batterie requise',
  module_count: 'Nombre de modules',
  installed_kva: 'Puissance totale installée',
  continuous_required_kva: 'Besoin continu',
  starting_kva: 'Puissance au démarrage',
  selection_basis_kva: 'Base de sélection',
  input_power_kw: 'Puissance active d’entrée',
  input_power_kva: 'Puissance apparente d’entrée',
  input_current_a: 'Courant d’entrée',
  conversion_ratio: 'Rapport de fréquence',
  recommendation: 'Recommandation',
  warning: 'Point de vigilance',
  new_sizing: 'Nouveau dimensionnement',
  existing_installation: 'Installation existante',
}

const INPUT_UNITS: Record<string, string> = {
  load_kw:'kW', kva:'kVA', efficiency:'%', safety_margin:'%',
  aging_margin:'%', temperature_margin:'%', autonomy_min:'min',
  autonomy_h:'h', vdc_bus:'V DC', vdc:'V DC', dc_voltage_nominal:'V DC',
  dc_voltage_min:'V DC', dc_voltage_max:'V DC', vac_input:'V AC',
  input_voltage:'V AC', output_voltage:'V AC', input_frequency:'Hz',
  output_frequency:'Hz', battery_capacity_ah:'Ah',
  battery_block_capacity_ah:'Ah', battery_block_voltage:'V',
  cell_capacity:'Ah', cell_voltage:'V', battery_dod:'%', dod:'%',
  load_current_a:'A', recharge_time_h:'h', redundancy:'module(s)',
  cycle_life:'cycles', cycles_per_day:'cycle/j', calendar_life_y:'ans',
}

export function calculationFieldLabel(key: string) {
  return LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase())
}

export function formatCalculationValue(key: string, raw: unknown, output = false) {
  if (raw === null || raw === undefined || raw === '') return '-'
  if (typeof raw === 'boolean') return raw ? 'Oui' : 'Non'
  const translated = typeof raw === 'string' ? LABELS[raw] : undefined
  const formatted = typeof raw === 'number'
    ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(raw)
    : translated ?? String(raw)
  const unit = output ? UNIT_LABELS[key] : INPUT_UNITS[key]
  return unit ? `${formatted} ${unit}` : formatted
}

function safeFilename(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
}

export async function buildCalculationPdf(entries: CalculationPdfEntry[]) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = autoTableModule.default
  const doc = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait' })
  const generatedAt = new Date()
  const width = doc.internal.pageSize.getWidth()

  entries.forEach((entry, index) => {
    if (index > 0) doc.addPage()

    doc.setFillColor(16, 36, 62)
    doc.rect(0, 0, width, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('IM ÉNERGIE CRM', 14, 11)
    doc.setFontSize(11)
    doc.text(entry.name || CALC_LABELS[entry.type], 14, 20)
    doc.setTextColor(38, 48, 62)

    const metadata = [
      ['Type', CALC_LABELS[entry.type]],
      ['Date du calcul', entry.createdAt ? new Date(entry.createdAt).toLocaleString('fr-FR') : generatedAt.toLocaleString('fr-FR')],
      ['Client', entry.client || '-'],
      ['Projet', entry.project || '-'],
      ['Quotation', entry.quotation || '-'],
    ]
    autoTable(doc, {
      startY:34,
      body:metadata,
      theme:'plain',
      styles:{ fontSize:8, cellPadding:1.3 },
      columnStyles:{
        0:{ fontStyle:'bold', textColor:[16, 36, 62], cellWidth:35 },
        1:{ textColor:[70, 78, 90] },
      },
      margin:{ left:14, right:14 },
    })

    let y = (doc as JsPdfType & { lastAutoTable: { finalY:number } }).lastAutoTable.finalY + 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(16, 36, 62)
    doc.text("PARAMÈTRES D'ENTRÉE", 14, y)
    autoTable(doc, {
      startY:y + 3,
      head:[['Paramètre', 'Valeur']],
      body:Object.entries(entry.inputs).map(([key, raw]) => [
        calculationFieldLabel(key), formatCalculationValue(key, raw),
      ]),
      theme:'grid',
      headStyles:{ fillColor:[16, 36, 62], textColor:255, fontStyle:'bold' },
      alternateRowStyles:{ fillColor:[245, 247, 250] },
      styles:{ fontSize:8, cellPadding:2 },
      columnStyles:{ 0:{ cellWidth:92 }, 1:{ halign:'right' } },
      margin:{ left:14, right:14 },
    })

    y = (doc as JsPdfType & { lastAutoTable: { finalY:number } }).lastAutoTable.finalY + 7
    if (y > 245) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(16, 36, 62)
    doc.text('RÉSULTATS TECHNIQUES', 14, y)
    const excluded = new Set(['ok', 'disclaimer', 'recommendation', 'warning', 'autonomy_data'])
    autoTable(doc, {
      startY:y + 3,
      head:[['Résultat', 'Valeur']],
      body:Object.entries(entry.outputs)
        .filter(([key]) => !excluded.has(key))
        .map(([key, raw]) => [
          calculationFieldLabel(key), formatCalculationValue(key, raw, true),
        ]),
      theme:'grid',
      headStyles:{ fillColor:[16, 36, 62], textColor:255, fontStyle:'bold' },
      alternateRowStyles:{ fillColor:[245, 247, 250] },
      styles:{ fontSize:8, cellPadding:2 },
      columnStyles:{ 0:{ cellWidth:92 }, 1:{ halign:'right', fontStyle:'bold' } },
      margin:{ left:14, right:14, bottom:20 },
    })

    y = (doc as JsPdfType & { lastAutoTable: { finalY:number } }).lastAutoTable.finalY + 6
    const notes = [
      entry.outputs.recommendation && ['Recommandation', String(entry.outputs.recommendation)],
      entry.outputs.warning && ['Point de vigilance', String(entry.outputs.warning)],
      entry.outputs.disclaimer && ['Limite du calcul', String(entry.outputs.disclaimer)],
    ].filter(Boolean) as string[][]
    if (notes.length) {
      autoTable(doc, {
        startY:y,
        body:notes,
        theme:'grid',
        styles:{ fontSize:8, cellPadding:2.5, overflow:'linebreak' },
        columnStyles:{
          0:{ cellWidth:38, fontStyle:'bold', textColor:[16, 36, 62] },
          1:{ textColor:[70, 78, 90] },
        },
        margin:{ left:14, right:14, bottom:20 },
      })
    }
  })

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    const height = doc.internal.pageSize.getHeight()
    doc.setDrawColor(213, 169, 40)
    doc.line(14, height - 12, width - 14, height - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(110, 116, 125)
    doc.text('Document confidentiel - Pré-dimensionnement à valider par un ingénieur.', 14, height - 7)
    doc.text(`Page ${page}/${pages}`, width - 14, height - 7, { align:'right' })
  }
  return doc
}

export async function downloadCalculationPdf(entry: CalculationPdfEntry) {
  const doc = await buildCalculationPdf([entry])
  const base = safeFilename(entry.name || CALC_LABELS[entry.type]) || 'calcul_technique'
  doc.save(`${base}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export async function downloadCalculationHistoryPdf(entries: CalculationPdfEntry[]) {
  if (!entries.length) return
  const doc = await buildCalculationPdf(entries)
  doc.save(`IME_Historique_Calculs_${new Date().toISOString().slice(0, 10)}.pdf`)
}
