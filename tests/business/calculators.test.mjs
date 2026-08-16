import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calcBattery,
  calcBess,
  calcFrequencyConverter,
  calcInverter,
  calcRectifier,
  calcUps,
} from '../../src/lib/calculators/engines.ts'

test('UPS : dimensionnement nominal et batterie restent cohérents', () => {
  const result = calcUps({
    kva: 10, power_factor: 0.8, efficiency: 92, autonomy_min: 60,
    vdc_bus: 192, safety_margin: 20, load_type: 'mixed',
    battery_type: 'vrla', battery_block_voltage: 12,
    battery_block_capacity_ah: 100, dod: 80,
    aging_margin: 20, temperature_margin: 10,
  })
  assert.equal(result.ok, true)
  assert.equal(result.kw, 8)
  assert.equal(result.recommended_kva, 15)
  assert.equal(result.batteries_per_string, 16)
  assert.ok(result.installed_capacity_ah >= result.recommended_ah)
})

test('Batterie : autonomie installée couvre l’autonomie demandée', () => {
  const result = calcBattery({
    vdc: 110, load_kw: 3, autonomy_min: 240, efficiency: 90, dod: 80,
    battery_type: 'nicd', cell_voltage: 1.2, cell_capacity: 200,
    safety_margin: 20, aging_margin: 20, temperature_margin: 10,
  })
  assert.equal(result.ok, true)
  assert.ok(result.estimated_autonomy_min >= 240)
  assert.equal(result.cells_in_series, 92)
  assert.equal(result.actual_bank_voltage, 110.4)
})

test('Redresseur : charge et recharge sont additionnées', () => {
  const result = calcRectifier({
    vdc: 28, load_current_a: 1200, battery_ah: 200,
    recharge_time_h: 10, efficiency: 92, safety_margin: 10,
    vac_input: 380, phases: 3, battery_type: 'nicd',
    recharge_factor: 1.2, input_power_factor: 0.9, redundancy: 2,
  })
  assert.equal(result.ok, true)
  assert.equal(result.recharge_current_a, 24)
  assert.equal(result.total_current_a, 1224)
  assert.equal(result.standard_module_current_a, 1500)
  assert.equal(result.total_installed_current_a, 3000)
})

test('BESS : puissance PCS et durée de vie suivent les contraintes', () => {
  const result = calcBess({
    load_kw: 100, autonomy_h: 2, efficiency: 90, dod: 80,
    safety_margin: 15, application: 'backup', cycle_life: 6000,
    cycles_per_day: 1, calendar_life_y: 15, peak_factor: 1.2,
  })
  assert.equal(result.ok, true)
  assert.equal(result.useful_energy_kwh, 200)
  assert.equal(result.pcs_kw, 138)
  assert.ok(result.estimated_lifetime_y <= 15)
})

test('Inverter : plage DC, courant maximal et redondance sont pris en compte', () => {
  const result = calcInverter({
    load_kw: 8, power_factor: 0.8, efficiency: 92, safety_margin: 20,
    overload_factor: 1.5, dc_voltage_nominal: 110, dc_voltage_min: 90,
    dc_voltage_max: 140, output_voltage: 230, output_phases: 1,
    output_frequency: 50, autonomy_min: 60, battery_capacity_ah: 200,
    battery_dod: 80, aging_margin: 20, temperature_margin: 10,
    redundancy: 2, load_type: 'mixed',
  })
  assert.equal(result.ok, true)
  assert.equal(result.recommended_kva, 15)
  assert.equal(result.module_count, 2)
  assert.equal(result.installed_kva, 30)
  assert.ok(result.dc_current_max_a > result.dc_current_nominal_a)
})

test('Convertisseur de fréquence : dimensionnement 50 vers 400 Hz', () => {
  const result = calcFrequencyConverter({
    load_kw: 20, load_power_factor: 0.8, input_voltage: 400,
    input_phases: 3, input_frequency: 50, input_power_factor: 0.9,
    output_voltage: 200, output_phases: 3, output_frequency: 400,
    efficiency: 92, safety_margin: 20, starting_current_factor: 1,
    overload_capability: 1.5, redundancy: 1, load_type: 'mixed',
  })
  assert.equal(result.ok, true)
  assert.equal(result.conversion_ratio, 8)
  assert.equal(result.recommended_kva, 30)
  assert.match(result.warning ?? '', /haute fréquence/i)
})

test('Les six calculateurs refusent des entrées physiquement invalides', () => {
  const invalidUps = calcUps({
    kva: 0, power_factor: 1, efficiency: 90, autonomy_min: 10,
    vdc_bus: 48, safety_margin: 10, load_type: 'mixed',
    battery_type: 'vrla', battery_block_voltage: 12,
    battery_block_capacity_ah: 100, dod: 80,
    aging_margin: 0, temperature_margin: 0,
  })
  const invalidInverter = calcInverter({
    load_kw: 5, power_factor: 0.8, efficiency: 90, safety_margin: 10,
    overload_factor: 1, dc_voltage_nominal: 110, dc_voltage_min: 140,
    dc_voltage_max: 100, output_voltage: 230, output_phases: 1,
    output_frequency: 50, autonomy_min: 0, battery_capacity_ah: 0,
    battery_dod: 80, aging_margin: 0, temperature_margin: 0,
    redundancy: 1, load_type: 'mixed',
  })
  assert.equal(invalidUps.ok, false)
  assert.equal(invalidInverter.ok, false)
})
