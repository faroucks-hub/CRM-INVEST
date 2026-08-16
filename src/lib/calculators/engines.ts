// ═══════════════════════════════════════════════════════════════════
// IME CRM — Moteurs de calcul techniques (Sprint 5)
// Résultats = estimations préliminaires — vérification technique requise
// ═══════════════════════════════════════════════════════════════════

// ── Types communs ─────────────────────────────────────────────────

export interface CalcResult {
  ok:      boolean
  warning?: string
  disclaimer: string
}

// ── 1. UPS CALCULATOR ─────────────────────────────────────────────

export interface UpsInputs {
  kva:           number   // Puissance apparente kVA
  power_factor:  number   // Facteur de puissance (0.7–1.0)
  efficiency:    number   // Rendement UPS % (85–98)
  autonomy_min:  number   // Autonomie souhaitée en minutes
  vdc_bus:       number   // Tension bus DC (48, 96, 192, 240, 384V)
  safety_margin: number   // Marge de sécurité % (10–30)
  load_type:     string   // 'resistive' | 'capacitive' | 'mixed' | 'server'
  battery_type:  string
  battery_block_voltage: number
  battery_block_capacity_ah: number
  dod: number
  aging_margin: number
  temperature_margin: number
}

export interface UpsOutputs extends CalcResult {
  kw:                  number   // Puissance active kW
  kw_with_margin:      number   // kW avec marge de sécurité
  recommended_kva:     number   // Calibre UPS normalisé avec marge
  dc_power_kw:         number   // Puissance DC estimée kW
  battery_energy_kwh:  number   // Énergie batterie kWh
  battery_capacity_ah: number   // Capacité batterie Ah
  recommended_ah:      number   // Capacité recommandée (avec marge)
  batteries_12v:       number   // Nb batteries 12V recommandées
  batteries_per_string:number   // Batteries par string
  strings_parallel:    number   // Strings en parallèle
  actual_dc_voltage:   number
  installed_capacity_ah:number
  sizing_category:     string   // 'small' | 'medium' | 'large' | 'very_large'
  recommendation:      string   // Texte recommandation UPS
}

export function calcUps(i: UpsInputs): UpsOutputs {
  const disclaimer = "Résultats préliminaires — dimensionnement définitif à valider par un ingénieur certifié."

  if (i.kva <= 0 || i.power_factor <= 0 || i.power_factor > 1 ||
      i.efficiency <= 0 || i.efficiency > 100 || i.autonomy_min <= 0 ||
      i.vdc_bus <= 0 || i.battery_block_voltage <= 0 ||
      i.battery_block_capacity_ah <= 0 || i.dod <= 0 || i.dod > 100) {
    return { ok: false, disclaimer, kw:0, kw_with_margin:0, recommended_kva:0, dc_power_kw:0,
      battery_energy_kwh:0, battery_capacity_ah:0, recommended_ah:0,
      batteries_12v:0, batteries_per_string:0, strings_parallel:0,
      actual_dc_voltage:0, installed_capacity_ah:0,
      sizing_category:'small', recommendation:'' }
  }

  const eff = i.efficiency / 100
  const margin = 1 + (i.safety_margin / 100)
  const dod = i.dod / 100
  const correction = (1 + i.aging_margin / 100) * (1 + i.temperature_margin / 100)

  // Puissance active
  const kw = round2(i.kva * i.power_factor)
  const kw_with_margin = round2(kw * margin)
  const required_kva = round2(i.kva * margin)
  const STANDARD_KVA = [1, 2, 3, 5, 6, 10, 15, 20, 30, 40, 50, 60, 80, 100, 120, 160, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1600, 2000]
  const recommended_kva =
    STANDARD_KVA.find(rating => rating >= required_kva) ??
    Math.ceil(required_kva / 100) * 100

  // Puissance DC (côté batterie — pertes rendement)
  const dc_power_kw = round2(kw_with_margin / eff)

  // Énergie batterie (kWh) = P_DC × autonomie (h)
  const autonomy_h = i.autonomy_min / 60
  const battery_energy_kwh = round2(dc_power_kw * autonomy_h)

  // Capacité Ah = Énergie kWh × 1000 / Vdc
  const battery_capacity_ah = round2(battery_energy_kwh * 1000 / (i.vdc_bus * dod))
  const recommended_ah = round2(battery_capacity_ah * correction)

  const batteries_per_string = Math.ceil(i.vdc_bus / i.battery_block_voltage)
  const actual_dc_voltage = round2(batteries_per_string * i.battery_block_voltage)

  const strings_parallel = Math.max(1, Math.ceil(recommended_ah / i.battery_block_capacity_ah))
  const batteries_12v = batteries_per_string * strings_parallel
  const installed_capacity_ah = round2(strings_parallel * i.battery_block_capacity_ah)

  // Catégorie de taille
  const sizing_category =
    i.kva <= 10 ? 'small' :
    i.kva <= 100 ? 'medium' :
    i.kva <= 500 ? 'large' : 'very_large'

  // Recommandation textuelle
  const rec = buildUpsRecommendation(recommended_kva, kw_with_margin, sizing_category, autonomy_h)
  const warning = i.load_type === 'capacitive' && i.power_factor > 0.85
    ? 'Vérifier le facteur de puissance et le courant de crête de la charge capacitive.'
    : i.battery_type === 'nicd'
      ? 'Pour le Ni-Cd, confirmer la capacité avec les tables de décharge du fabricant à la tension finale retenue.'
      : undefined

  return {
    ok: true, disclaimer,
    kw, kw_with_margin, recommended_kva, dc_power_kw,
    battery_energy_kwh, battery_capacity_ah, recommended_ah,
    batteries_12v, batteries_per_string, strings_parallel,
    actual_dc_voltage, installed_capacity_ah,
    sizing_category, recommendation: rec, warning,
  }
}

function buildUpsRecommendation(kva: number, kw: number, cat: string, h: number): string {
  const topology = cat === 'small' ? 'Double conversion online (VFI)' :
    cat === 'medium' ? 'Double conversion online (VFI SS 111)' :
    'UPS modulaire double conversion (VFI SS 111)'

  return `Recommandation : UPS ${topology} · ${kva} kVA / ${kw} kW · Autonomie ${h >= 1 ? h + 'h' : Math.round(h*60) + 'min'} · Norme IEC 62040-3. Certification CE, ISO 9001 recommandée.`
}

// ── 2. BATTERY CALCULATOR ─────────────────────────────────────────

export interface BatteryInputs {
  vdc:           number   // Tension système DC (24, 48, 96, 110, 192, 220, 240V)
  load_kw:       number   // Puissance charge kW
  autonomy_min:  number   // Autonomie souhaitée (minutes)
  efficiency:    number   // Rendement % (90–98)
  dod:           number   // Profondeur de décharge % (50–100)
  battery_type:  string   // 'vrla' | 'lithium' | 'nicd' | 'lead_acid'
  cell_voltage:  number   // Tension bloc: 2, 6, ou 12V
  cell_capacity: number   // Capacité bloc disponible Ah (ex: 100, 150, 200Ah)
  safety_margin: number   // Marge de sécurité %
  aging_margin: number
  temperature_margin: number
}

export interface BatteryOutputs extends CalcResult {
  energy_needed_kwh:    number
  energy_nominal_kwh:   number
  capacity_ah:          number
  capacity_with_margin: number
  cells_in_series:      number
  strings_parallel:     number
  total_cells:          number
  total_capacity_ah:    number
  total_energy_kwh:     number
  estimated_autonomy_min: number
  actual_dod_pct:       number
  actual_bank_voltage:  number
  autonomy_data:        { minutes: number; soc: number; power_kw: number }[]
}

export function calcBattery(i: BatteryInputs): BatteryOutputs {
  const disclaimer = "Résultats préliminaires — validation par ingénieur requise."

  if (i.vdc <= 0 || i.load_kw <= 0 || i.cell_capacity <= 0 ||
      i.cell_voltage <= 0 || i.autonomy_min <= 0 || i.efficiency <= 0 ||
      i.efficiency > 100 || i.dod <= 0 || i.dod > 100) {
    return { ok:false, disclaimer, energy_needed_kwh:0, energy_nominal_kwh:0,
      capacity_ah:0, capacity_with_margin:0, cells_in_series:0,
      strings_parallel:0, total_cells:0, total_capacity_ah:0,
      total_energy_kwh:0, estimated_autonomy_min:0, actual_dod_pct:0,
      actual_bank_voltage:0, autonomy_data:[] }
  }

  const eff = i.efficiency / 100
  const dod = i.dod / 100
  const margin = 1 + (i.safety_margin / 100)
  const correction = (1 + i.aging_margin / 100) * (1 + i.temperature_margin / 100)
  const autonomy_h = i.autonomy_min / 60

  // Énergie nécessaire utile (côté charge)
  const energy_needed_kwh = round2(i.load_kw * autonomy_h)

  // Énergie nominale batterie (tenant compte rendement + DoD)
  const energy_nominal_kwh = round2(energy_needed_kwh / (eff * dod))

  // Capacité Ah = Énergie (Wh) / Vdc
  const capacity_ah = round2(energy_nominal_kwh * 1000 / i.vdc)
  const capacity_with_margin = round2(capacity_ah * margin * correction)

  // Cellules en série = Vdc / V_cellule
  const cells_in_series = Math.ceil(i.vdc / i.cell_voltage)
  const actual_bank_voltage = round2(cells_in_series * i.cell_voltage)

  // Strings parallèles = Capacité requise / Capacité bloc
  const strings_parallel = Math.max(1, Math.ceil(capacity_with_margin / i.cell_capacity))

  // Totaux réels
  const total_cells        = cells_in_series * strings_parallel
  const total_capacity_ah  = round2(strings_parallel * i.cell_capacity)
  const total_energy_kwh   = round2(total_capacity_ah * actual_bank_voltage / 1000)

  // Autonomie réelle estimée avec batterie choisie
  // Autonomie garantie en fin de vie / à la température de calcul :
  // la capacité utile est déclassée par les mêmes corrections que le besoin.
  const usable_energy_kwh  = round2(total_energy_kwh * dod * eff / correction)
  const estimated_autonomy_min = round2((usable_energy_kwh / i.load_kw) * 60)

  // DoD réel
  const actual_dod_pct = round2((energy_needed_kwh / total_energy_kwh) * 100)

  // Données graphique autonomie (simulation décharge toutes les 10min)
  const autonomy_data = buildDischargeData(total_energy_kwh, i.load_kw, dod, eff)

  const warning = i.battery_type === 'nicd' || i.autonomy_min <= 60
    ? 'Le résultat énergétique doit être confirmé avec la table de décharge constructeur (température, tension finale et régime de décharge).'
    : undefined

  return {
    ok: true, disclaimer,
    energy_needed_kwh, energy_nominal_kwh, capacity_ah, capacity_with_margin,
    cells_in_series, strings_parallel, total_cells,
    total_capacity_ah, total_energy_kwh, estimated_autonomy_min, actual_dod_pct,
    actual_bank_voltage, autonomy_data, warning,
  }
}

function buildDischargeData(
  total_kwh: number, load_kw: number, dod: number, eff: number
): { minutes: number; soc: number; power_kw: number }[] {
  const max_kwh = total_kwh * dod * eff
  const step    = 5 // toutes les 5 minutes
  const data: { minutes: number; soc: number; power_kw: number }[] = []
  let energy_left = max_kwh

  for (let min = 0; energy_left > 0 && min <= 480; min += step) {
    const soc = Math.max(0, (energy_left / max_kwh) * 100)
    data.push({ minutes: min, soc: round2(soc), power_kw: load_kw })
    energy_left -= (load_kw * step / 60)
  }

  if (data[data.length - 1]?.soc > 0) {
    data.push({ minutes: data[data.length - 1].minutes + step, soc: 0, power_kw: 0 })
  }
  return data
}

// ── 3. RECTIFIER CALCULATOR ───────────────────────────────────────

export interface RectifierInputs {
  vdc:              number   // Tension DC
  load_current_a:   number   // Courant nominal charge A
  battery_ah:       number   // Capacité batterie Ah
  recharge_time_h:  number   // Temps recharge souhaité (heures)
  efficiency:       number   // Rendement %
  safety_margin:    number   // Marge sécurité %
  vac_input:        number   // Tension AC entrée (220, 380, 415V)
  phases:           number   // 1 ou 3 phases
  battery_type:     string
  recharge_factor:  number
  input_power_factor:number
  redundancy:       number
}

export interface RectifierOutputs extends CalcResult {
  dc_power_kw:       number
  recharge_current_a:number
  total_current_a:   number
  recommended_current_a: number
  ac_power_kva:      number
  ac_power_kw:       number
  ac_current_a:      number
  standard_module_current_a: number
  total_installed_current_a: number
  recommendation:    string
}

export function calcRectifier(i: RectifierInputs): RectifierOutputs {
  const disclaimer = "Résultats préliminaires — validation par ingénieur requise."
  if (i.vdc <= 0 || i.load_current_a < 0 || i.battery_ah < 0 ||
      i.recharge_time_h <= 0 || i.efficiency <= 0 || i.efficiency > 100 ||
      ![1, 3].includes(i.phases) || i.vac_input <= 0 ||
      i.input_power_factor <= 0 || i.input_power_factor > 1 ||
      i.recharge_factor < 1 || i.redundancy < 1) {
    return {
      ok:false, disclaimer, dc_power_kw:0, recharge_current_a:0,
      total_current_a:0, recommended_current_a:0, ac_power_kva:0,
      ac_power_kw:0, ac_current_a:0, standard_module_current_a:0,
      total_installed_current_a:0, recommendation:'',
    }
  }
  const eff    = i.efficiency / 100
  const margin = 1 + (i.safety_margin / 100)

  // Puissance DC charge
  const dc_power_kw = round2(i.vdc * i.load_current_a / 1000)

  // Courant recharge batterie (charge en C_x)
  // I_recharge = Ah / h_recharge × 1.2 (facteur absorption)
  const recharge_current_a = round2((i.battery_ah / i.recharge_time_h) * i.recharge_factor)

  // Courant total = charge + recharge
  const total_current_a    = round2(i.load_current_a + recharge_current_a)
  const recommended_current_a = round2(total_current_a * margin)
  const STANDARD_CURRENTS = [10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000]
  const standard_module_current_a =
    STANDARD_CURRENTS.find(rating => rating >= recommended_current_a) ?? Math.ceil(recommended_current_a / 100) * 100
  const total_installed_current_a = standard_module_current_a * i.redundancy

  // Puissance DC totale recommandée
  const dc_total_kw = round2(i.vdc * recommended_current_a / 1000)

  // Puissance AC côté entrée (tenant compte rendement)
  const ac_power_kw  = round2(dc_total_kw / eff)
  const ac_power_kva = round2(ac_power_kw / i.input_power_factor)

  // Courant AC
  const ac_current_a = round2(
    ac_power_kva * 1000 / (i.vac_input * (i.phases === 3 ? Math.sqrt(3) : 1))
  )

  // Recommandation
  const rec = `Rectifier ${Math.ceil(i.vdc)}V DC · ${i.redundancy} module(s) de ${standard_module_current_a}A · Besoin calculé ${recommended_current_a}A · Alimentation ${i.phases === 3 ? 'triphasée' : 'monophasée'} ${i.vac_input}V AC · Recharge ${i.recharge_time_h}h`
  const warning = i.phases === 3 && i.vac_input < 300
    ? 'La combinaison triphasée avec une tension inférieure à 300 V doit être confirmée (tension ligne-ligne).'
    : i.phases === 1 && i.vac_input > 277
      ? 'La tension monophasée saisie est atypique ; vérifier s’il s’agit d’une tension ligne-ligne.'
      : undefined

  return {
    ok: true, disclaimer,
    dc_power_kw, recharge_current_a, total_current_a, recommended_current_a,
    ac_power_kva, ac_power_kw, ac_current_a,
    standard_module_current_a, total_installed_current_a,
    recommendation: rec, warning,
  }
}

// ── 4. BESS CALCULATOR ────────────────────────────────────────────

export interface BessInputs {
  load_kw:       number   // Puissance charge kW
  autonomy_h:    number   // Autonomie souhaitée heures
  efficiency:    number   // Rendement système % (85–95)
  dod:           number   // Profondeur de décharge %
  safety_margin: number   // Marge sécurité %
  application:   string   // 'backup' | 'peak_shaving' | 'solar_storage' | 'hybrid'
  cycle_life:    number   // Durée de vie cycles (300–6000)
  cycles_per_day:number
  calendar_life_y:number
  peak_factor:   number
}

export interface BessOutputs extends CalcResult {
  useful_energy_kwh:    number
  nominal_capacity_kwh: number
  recommended_kwh:      number
  pcs_kw:               number
  estimated_cycles_year: number
  estimated_lifetime_y:  number
  recommendation:        string
  battery_power_kw:       number
}

export function calcBess(i: BessInputs): BessOutputs {
  const disclaimer = "Résultats préliminaires — étude de faisabilité approfondie requise."
  if (i.load_kw <= 0 || i.autonomy_h <= 0 || i.efficiency <= 0 ||
      i.efficiency > 100 || i.dod <= 0 || i.dod > 100 ||
      i.cycle_life <= 0 || i.cycles_per_day <= 0 ||
      i.calendar_life_y <= 0 || i.peak_factor < 1) {
    return {
      ok:false, disclaimer, useful_energy_kwh:0, nominal_capacity_kwh:0,
      recommended_kwh:0, pcs_kw:0, estimated_cycles_year:0,
      estimated_lifetime_y:0, battery_power_kw:0, recommendation:'',
    }
  }
  const eff    = i.efficiency / 100
  const dod    = i.dod / 100
  const margin = 1 + (i.safety_margin / 100)

  // Énergie utile = P × t
  const useful_energy_kwh = round2(i.load_kw * i.autonomy_h)

  // Capacité nominale = utile / (η × DoD)
  const nominal_capacity_kwh = round2(useful_energy_kwh / (eff * dod))
  const recommended_kwh      = round2(nominal_capacity_kwh * margin)

  // PCS (Power Conversion System) = puissance crête × marge
  const pcs_kw = round2(i.load_kw * i.peak_factor * margin)
  const battery_power_kw = round2(pcs_kw / eff)

  // Estimation cycles / an selon application
  const estimated_cycles_year = round2(i.cycles_per_day * 365)
  const cycle_limited_life = i.cycle_life / estimated_cycles_year
  const estimated_lifetime_y  = round2(Math.min(cycle_limited_life, i.calendar_life_y))

  // Recommandation
  const app_label: Record<string,string> = {
    backup: 'backup secours', peak_shaving: 'peak shaving',
    solar_storage: 'stockage solaire', hybrid: 'hybride'
  }
  const rec = `BESS ${recommended_kwh} kWh nominal · PCS ${pcs_kw} kW · Puissance batterie ${battery_power_kw} kW · Application ${app_label[i.application]??''} · Durée de vie limitée estimée ${estimated_lifetime_y} ans`

  return {
    ok: true, disclaimer,
    useful_energy_kwh, nominal_capacity_kwh, recommended_kwh,
    pcs_kw, estimated_cycles_year, estimated_lifetime_y,
    battery_power_kw, recommendation: rec,
  }
}

// ── 5. INVERTER CALCULATOR ───────────────────────────────────────

export interface InverterInputs {
  load_kw: number
  power_factor: number
  efficiency: number
  safety_margin: number
  overload_factor: number
  dc_voltage_nominal: number
  dc_voltage_min: number
  dc_voltage_max: number
  output_voltage: number
  output_phases: number
  output_frequency: number
  autonomy_min: number
  battery_capacity_ah: number
  battery_dod: number
  aging_margin: number
  temperature_margin: number
  redundancy: number
  load_type: string
}

export interface InverterOutputs extends CalcResult {
  load_kva: number
  required_kva: number
  recommended_kva: number
  overload_kva: number
  dc_power_kw: number
  dc_current_nominal_a: number
  dc_current_max_a: number
  output_current_a: number
  required_battery_ah: number
  estimated_autonomy_min: number
  module_count: number
  installed_kva: number
  recommendation: string
}

export function calcInverter(i: InverterInputs): InverterOutputs {
  const disclaimer = 'Pré-dimensionnement selon les valeurs saisies — confirmer les surcharges, la plage DC et la courbe de décharge avec le fabricant.'
  const invalid =
    i.load_kw <= 0 || i.power_factor <= 0 || i.power_factor > 1 ||
    i.efficiency <= 0 || i.efficiency > 100 ||
    i.dc_voltage_min <= 0 || i.dc_voltage_nominal <= 0 || i.dc_voltage_max <= 0 ||
    i.dc_voltage_min > i.dc_voltage_nominal || i.dc_voltage_nominal > i.dc_voltage_max ||
    i.output_voltage <= 0 || ![1, 3].includes(i.output_phases) ||
    i.output_frequency <= 0 || i.overload_factor < 1 ||
    i.battery_dod <= 0 || i.battery_dod > 100 || i.redundancy < 1

  if (invalid) {
    return {
      ok:false, disclaimer, load_kva:0, required_kva:0, recommended_kva:0,
      overload_kva:0, dc_power_kw:0, dc_current_nominal_a:0,
      dc_current_max_a:0, output_current_a:0, required_battery_ah:0,
      estimated_autonomy_min:0, module_count:0, installed_kva:0,
      recommendation:'',
    }
  }

  const eff = i.efficiency / 100
  const margin = 1 + i.safety_margin / 100
  const dod = i.battery_dod / 100
  const correction = (1 + i.aging_margin / 100) * (1 + i.temperature_margin / 100)
  const load_kva = round2(i.load_kw / i.power_factor)
  const required_kva = round2(load_kva * margin)
  const STANDARD_KVA = [1, 2, 3, 5, 6, 10, 15, 20, 30, 40, 50, 60, 80, 100, 120, 160, 200, 250, 300, 400, 500, 600, 800, 1000]
  const recommended_kva =
    STANDARD_KVA.find(rating => rating >= required_kva) ?? Math.ceil(required_kva / 100) * 100
  const overload_kva = round2(required_kva * i.overload_factor)
  const dc_power_kw = round2((i.load_kw * margin) / eff)
  const dc_current_nominal_a = round2(dc_power_kw * 1000 / i.dc_voltage_nominal)
  const dc_current_max_a = round2(dc_power_kw * 1000 / i.dc_voltage_min)
  const output_current_a = round2(
    required_kva * 1000 /
      (i.output_voltage * (i.output_phases === 3 ? Math.sqrt(3) : 1))
  )
  const required_battery_ah = i.autonomy_min > 0
    ? round2(
        dc_power_kw * 1000 * (i.autonomy_min / 60) /
        (i.dc_voltage_nominal * dod) * correction
      )
    : 0
  const usable_battery_kwh =
    i.battery_capacity_ah * i.dc_voltage_nominal / 1000 * dod / correction
  const estimated_autonomy_min = i.battery_capacity_ah > 0
    ? round2(usable_battery_kwh / dc_power_kw * 60)
    : 0
  const module_count = Math.max(1, Math.ceil(i.redundancy))
  const installed_kva = recommended_kva * module_count

  const warning = i.load_type === 'motor'
    ? 'Charge moteur : confirmer le courant de démarrage et la capacité de surcharge transitoire de l’inverter.'
    : i.load_type === 'capacitive'
      ? 'Charge capacitive : confirmer le courant de crête et la compatibilité avec le filtre de sortie.'
      : undefined
  const recommendation =
    `Inverter ${recommended_kva} kVA par module · ${module_count} module(s) · ` +
    `${i.dc_voltage_min}-${i.dc_voltage_max} V DC → ${i.output_voltage} V AC / ` +
    `${i.output_frequency} Hz · courant DC maximal ${dc_current_max_a} A`

  return {
    ok:true, disclaimer, warning, load_kva, required_kva, recommended_kva,
    overload_kva, dc_power_kw, dc_current_nominal_a, dc_current_max_a,
    output_current_a, required_battery_ah, estimated_autonomy_min,
    module_count, installed_kva, recommendation,
  }
}

// ── 6. FREQUENCY CONVERTER CALCULATOR ────────────────────────────

export interface FrequencyConverterInputs {
  load_kw: number
  load_power_factor: number
  input_voltage: number
  input_phases: number
  input_frequency: number
  input_power_factor: number
  output_voltage: number
  output_phases: number
  output_frequency: number
  efficiency: number
  safety_margin: number
  starting_current_factor: number
  overload_capability: number
  redundancy: number
  load_type: string
}

export interface FrequencyConverterOutputs extends CalcResult {
  load_kva: number
  continuous_required_kva: number
  starting_kva: number
  selection_basis_kva: number
  recommended_kva: number
  input_power_kw: number
  input_power_kva: number
  input_current_a: number
  output_current_a: number
  conversion_ratio: number
  module_count: number
  installed_kva: number
  recommendation: string
}

export function calcFrequencyConverter(
  i: FrequencyConverterInputs
): FrequencyConverterOutputs {
  const disclaimer =
    'Pré-dimensionnement électrique — confirmer la surcharge, les harmoniques, le filtre, le transformateur et les conditions du site avec le fabricant.'
  const invalid =
    i.load_kw <= 0 || i.load_power_factor <= 0 || i.load_power_factor > 1 ||
    i.input_voltage <= 0 || i.output_voltage <= 0 ||
    ![1, 3].includes(i.input_phases) || ![1, 3].includes(i.output_phases) ||
    i.input_frequency <= 0 || i.output_frequency <= 0 ||
    i.input_power_factor <= 0 || i.input_power_factor > 1 ||
    i.efficiency <= 0 || i.efficiency > 100 ||
    i.starting_current_factor < 1 || i.overload_capability < 1 ||
    i.redundancy < 1

  if (invalid) {
    return {
      ok:false, disclaimer, load_kva:0, continuous_required_kva:0,
      starting_kva:0, selection_basis_kva:0, recommended_kva:0,
      input_power_kw:0, input_power_kva:0, input_current_a:0,
      output_current_a:0, conversion_ratio:0, module_count:0,
      installed_kva:0, recommendation:'',
    }
  }

  const efficiency = i.efficiency / 100
  const margin = 1 + i.safety_margin / 100
  const load_kva = round2(i.load_kw / i.load_power_factor)
  const continuous_required_kva = round2(load_kva * margin)
  const starting_kva = round2(load_kva * i.starting_current_factor)
  const selection_basis_kva = round2(
    Math.max(continuous_required_kva, starting_kva / i.overload_capability)
  )
  const STANDARD_KVA = [1, 2, 3, 5, 6, 10, 15, 20, 30, 40, 50, 60, 80, 100, 120, 160, 200, 250, 300, 400, 500, 600, 800, 1000]
  const recommended_kva =
    STANDARD_KVA.find(rating => rating >= selection_basis_kva) ??
    Math.ceil(selection_basis_kva / 100) * 100
  const input_power_kw = round2(i.load_kw / efficiency)
  const input_power_kva = round2(input_power_kw / i.input_power_factor)
  const input_current_a = round2(
    input_power_kva * 1000 /
      (i.input_voltage * (i.input_phases === 3 ? Math.sqrt(3) : 1))
  )
  const output_current_a = round2(
    load_kva * 1000 /
      (i.output_voltage * (i.output_phases === 3 ? Math.sqrt(3) : 1))
  )
  const conversion_ratio = round2(i.output_frequency / i.input_frequency)
  const module_count = Math.max(1, Math.ceil(i.redundancy))
  const installed_kva = recommended_kva * module_count

  let warning: string | undefined
  if (i.load_type === 'motor') {
    warning = 'Charge moteur : le courant de démarrage, le profil d’accélération et la capacité de surcharge doivent être validés avec le fabricant.'
  } else if (i.output_frequency >= 300) {
    warning = 'Sortie haute fréquence : confirmer le filtre sinusoïdal, le transformateur, les câbles et la compatibilité de la charge.'
  } else if (i.input_phases === 1 && recommended_kva > 30) {
    warning = 'Une alimentation monophasée de cette puissance est atypique ; vérifier la capacité du réseau amont.'
  }

  const recommendation =
    `Frequency Converter ${recommended_kva} kVA par module · ${module_count} module(s) · ` +
    `${i.input_voltage} V / ${i.input_frequency} Hz / ${i.input_phases}Ph → ` +
    `${i.output_voltage} V / ${i.output_frequency} Hz / ${i.output_phases}Ph`

  return {
    ok:true, disclaimer, warning, load_kva, continuous_required_kva,
    starting_kva, selection_basis_kva, recommended_kva, input_power_kw,
    input_power_kva, input_current_a, output_current_a, conversion_ratio,
    module_count, installed_kva, recommendation,
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Export Excel (XLSX) ───────────────────────────────────────────
export function exportCalcToCSV(
  type: string,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
  filename: string
) {
  const BOM = '\uFEFF'
  const rows = [
    ['TYPE DE CALCUL', type.toUpperCase()],
    ['DATE', new Date().toLocaleDateString('fr-FR')],
    [''],
    ['PARAMÈTRES D\'ENTRÉE', ''],
    ...Object.entries(inputs).map(([k, v]) => [k.replace(/_/g, ' ').toUpperCase(), String(v)]),
    [''],
    ['RÉSULTATS', ''],
    ...Object.entries(outputs)
      .filter(([k]) => !['ok', 'disclaimer', 'autonomy_data', 'recommendation'].includes(k))
      .map(([k, v]) => [k.replace(/_/g, ' ').toUpperCase(), String(v)]),
    [''],
    ['RECOMMANDATION', String(outputs.recommendation ?? '')],
    [''],
    ['AVERTISSEMENT', String(outputs.disclaimer ?? '')],
  ]

  const csv = BOM + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
