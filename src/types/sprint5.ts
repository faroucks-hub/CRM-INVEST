// ── Sprint 5 — Types calculateurs ────────────────────────────────

export type CalcType = 'ups' | 'battery' | 'rectifier' | 'bess' | 'inverter' | 'frequency_converter'

export interface CalcHistoryEntry {
  id:            string
  calc_type:     CalcType
  name?:         string | null
  inputs:        Record<string, unknown>
  outputs:       Record<string, unknown>
  client_id?:    string | null
  project_id?:   string | null
  quotation_id?: string | null
  ai_analysis?:  string | null
  created_by:    string
  created_at:    string
  // Relations
  client?:    { id: string; company_name: string } | null
  project?:   { id: string; reference: string; name: string } | null
  quotation?: { id: string; number: string } | null
  creator?:   { id: string; full_name: string } | null
}

export const CALC_LABELS: Record<CalcType, string> = {
  ups:       'Calculateur UPS',
  battery:   'Calculateur Batteries',
  rectifier: 'Calculateur Rectifier',
  bess:      'Calculateur BESS',
  inverter:  'Calculateur Inverter',
  frequency_converter: 'Calculateur Frequency Converter',
}

export const CALC_DESCRIPTIONS: Record<CalcType, string> = {
  ups:       'Pré-dimensionnement UPS — puissance, autonomie, batteries',
  battery:   'Dimensionnement banc de batteries — capacité, série/parallèle',
  rectifier: 'Dimensionnement chargeur/rectifier — courant, puissance AC/DC',
  bess:      'Calcul système BESS — capacité kWh, PCS, durée de vie',
  inverter:  'Dimensionnement inverter — conversion DC/AC, courants et autonomie',
  frequency_converter: 'Dimensionnement convertisseur de fréquence — AC/AC, courants et démarrage',
}

export const CALC_ICONS: Record<CalcType, string> = {
  ups:       '⚡',
  battery:   '🔋',
  rectifier: '🔌',
  bess:      '☀️',
  inverter:  '〰️',
  frequency_converter: '🔄',
}

export const CALC_COLORS: Record<CalcType, { bg: string; text: string; border: string; accent: string }> = {
  ups:       { bg:'bg-blue-50',   text:'text-blue-700',   border:'border-blue-200',   accent:'#1D4ED8' },
  battery:   { bg:'bg-amber-50',  text:'text-amber-700',  border:'border-amber-200',  accent:'#B45309' },
  rectifier: { bg:'bg-teal-50',   text:'text-teal-700',   border:'border-teal-200',   accent:'#0F766E' },
  bess:      { bg:'bg-green-50',  text:'text-green-700',  border:'border-green-200',  accent:'#15803D' },
  inverter:  { bg:'bg-violet-50', text:'text-violet-700', border:'border-violet-200', accent:'#6D28D9' },
  frequency_converter: { bg:'bg-cyan-50', text:'text-cyan-700', border:'border-cyan-200', accent:'#0E7490' },
}

// Unités d'affichage
export const UNIT_LABELS: Record<string, string> = {
  kva:                    'kVA',
  kw:                     'kW',
  kw_with_margin:         'kW',
  dc_power_kw:            'kW',
  battery_energy_kwh:     'kWh',
  battery_capacity_ah:    'Ah',
  recommended_ah:         'Ah',
  batteries_12v:          'unités',
  batteries_per_string:   'unités/string',
  strings_parallel:       'strings',
  actual_dc_voltage:      'V DC',
  installed_capacity_ah:  'Ah',
  energy_needed_kwh:      'kWh',
  energy_nominal_kwh:     'kWh',
  capacity_ah:            'Ah',
  capacity_with_margin:   'Ah',
  cells_in_series:        'cellules/string',
  strings_parallel_b:     'strings',
  total_cells:            'cellules',
  total_capacity_ah:      'Ah',
  total_energy_kwh:       'kWh',
  estimated_autonomy_min: 'minutes',
  actual_dod_pct:         '%',
  actual_bank_voltage:    'V DC',
  dc_power_kw_r:          'kW',
  recharge_current_a:     'A',
  total_current_a:        'A',
  recommended_current_a:  'A',
  ac_power_kva:           'kVA',
  ac_power_kw:            'kW',
  ac_current_a:           'A',
  standard_module_current_a:'A/module',
  total_installed_current_a:'A',
  useful_energy_kwh:      'kWh',
  nominal_capacity_kwh:   'kWh',
  recommended_kwh:        'kWh',
  pcs_kw:                 'kW',
  estimated_cycles_year:  'cycles/an',
  estimated_lifetime_y:   'ans',
  battery_power_kw:       'kW',
  required_kva:           'kVA',
  recommended_kva:        'kVA',
  overload_kva:           'kVA',
  dc_current_nominal_a:   'A',
  dc_current_max_a:       'A',
  output_current_a:       'A',
  required_battery_ah:    'Ah',
  installed_kva:          'kVA',
  continuous_required_kva:'kVA',
  starting_kva:           'kVA',
  selection_basis_kva:    'kVA',
  input_power_kw:         'kW',
  input_power_kva:        'kVA',
  input_current_a:        'A',
  conversion_ratio:       '×',
}
