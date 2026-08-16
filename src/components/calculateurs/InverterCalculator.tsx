'use client'

import { useMemo, useState } from 'react'
import { Download, RotateCcw, Save, Waves } from 'lucide-react'
import {
  CalculationModeSelector,
  CalcSection,
  DisclaimerBanner,
  NumberInput,
  PresetNumberInput,
  ResultCard,
  SelectInput,
  type CalculationMode,
} from './CalcUI'
import SaveCalcModal from './SaveCalcModal'
import {
  calcInverter,
  type InverterInputs,
} from '@/lib/calculators/engines'
import { downloadCalculationPdf } from '@/lib/pdf/calculator-report'

interface Props {
  clients: { id: string; company_name: string }[]
  projects: { id: string; reference: string; name: string }[]
  quotations: { id: string; number: string }[]
}

const DEFAULTS: InverterInputs = {
  load_kw: 10,
  power_factor: 0.8,
  efficiency: 92,
  safety_margin: 20,
  overload_factor: 1.5,
  dc_voltage_nominal: 110,
  dc_voltage_min: 90,
  dc_voltage_max: 140,
  output_voltage: 230,
  output_phases: 1,
  output_frequency: 50,
  autonomy_min: 60,
  battery_capacity_ah: 200,
  battery_dod: 80,
  aging_margin: 20,
  temperature_margin: 10,
  redundancy: 1,
  load_type: 'mixed',
}

const LOAD_TYPES = [
  { value:'resistive', label:'Résistive' },
  { value:'inductive', label:'Inductive' },
  { value:'capacitive', label:'Capacitive' },
  { value:'motor', label:'Moteur / fort courant de démarrage' },
  { value:'mixed', label:'Mixte industrielle' },
]

export default function InverterCalculator({ clients, projects, quotations }: Props) {
  const [inputs, setInputs] = useState<InverterInputs>(DEFAULTS)
  const [mode, setMode] = useState<CalculationMode>('new_sizing')
  const [saveOpen, setSaveOpen] = useState(false)
  const set = (key: keyof InverterInputs) => (value: number | string) =>
    setInputs(previous => ({ ...previous, [key]: value }))
  const results = useMemo(() => calcInverter(inputs), [inputs])

  function reset() {
    setInputs(DEFAULTS)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <CalculationModeSelector value={mode} onChange={setMode} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-700">
                <Waves className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-navy-900">Paramètres Inverter</h2>
                <p className="text-xs text-gray-400">Conversion DC vers AC</p>
              </div>
            </div>
            <button type="button" onClick={reset} className="btn btn-ghost btn-sm text-gray-400">
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </button>
          </div>

          <div className="space-y-6">
            <CalcSection title="Charge AC">
              <NumberInput label="Puissance active de la charge" value={inputs.load_kw}
                min={0.01} step={0.01} unit="kW" required onChange={set('load_kw')} />
              <NumberInput label="Facteur de puissance" value={inputs.power_factor}
                min={0.1} max={1} step={0.01} unit="PF" onChange={set('power_factor')} />
              <SelectInput label="Type de charge" value={inputs.load_type}
                options={LOAD_TYPES} onChange={set('load_type')} />
              <NumberInput label="Facteur de surcharge transitoire" value={inputs.overload_factor}
                min={1} max={10} step={0.01} unit="×" onChange={set('overload_factor')} />
              <NumberInput label="Marge de dimensionnement" value={inputs.safety_margin}
                min={0} max={100} step={0.1} unit="%" onChange={set('safety_margin')} />
            </CalcSection>

            <CalcSection title="Entrée DC">
              <PresetNumberInput label="Tension DC nominale" value={inputs.dc_voltage_nominal}
                presets={[24, 48, 110, 125, 220, 384]} min={1} step={1}
                unit="V DC" onChange={set('dc_voltage_nominal')} />
              <NumberInput label="Tension DC minimale" value={inputs.dc_voltage_min}
                min={1} step={0.1} unit="V DC" onChange={set('dc_voltage_min')} />
              <NumberInput label="Tension DC maximale" value={inputs.dc_voltage_max}
                min={1} step={0.1} unit="V DC" onChange={set('dc_voltage_max')} />
              <NumberInput label="Rendement de l'inverter" value={inputs.efficiency}
                min={1} max={100} step={0.1} unit="%" onChange={set('efficiency')} />
            </CalcSection>

            <CalcSection title="Sortie AC">
              <PresetNumberInput label="Tension de sortie" value={inputs.output_voltage}
                presets={[110, 115, 120, 220, 230, 240, 380, 400, 415, 440, 480]}
                min={1} step={1} unit="V AC" onChange={set('output_voltage')} />
              <SelectInput label="Nombre de phases" value={String(inputs.output_phases)}
                options={[{ value:'1', label:'Monophasé' }, { value:'3', label:'Triphasé' }]}
                onChange={value => set('output_phases')(Number(value))} />
              <PresetNumberInput label="Fréquence de sortie" value={inputs.output_frequency}
                presets={[50, 60]} min={1} step={0.1} unit="Hz"
                onChange={set('output_frequency')} />
              <PresetNumberInput label="Modules / redondance" value={inputs.redundancy}
                presets={[1, 2, 3]} min={1} step={1} unit="module(s)"
                onChange={set('redundancy')} />
            </CalcSection>

            <CalcSection title="Autonomie batterie">
              <NumberInput label={mode === 'existing_installation' ? 'Autonomie attendue ou mesurée' : 'Autonomie souhaitée'}
                value={inputs.autonomy_min} min={0} step={0.1} unit="min"
                onChange={set('autonomy_min')} />
              <NumberInput label="Capacité batterie disponible" value={inputs.battery_capacity_ah}
                min={0} step={0.1} unit="Ah" onChange={set('battery_capacity_ah')} />
              <NumberInput label="Profondeur de décharge admissible" value={inputs.battery_dod}
                min={1} max={100} step={0.1} unit="%" onChange={set('battery_dod')} />
              <NumberInput label="Marge de vieillissement" value={inputs.aging_margin}
                min={0} max={200} step={0.1} unit="%" onChange={set('aging_margin')} />
              <NumberInput label="Correction de température" value={inputs.temperature_margin}
                min={0} max={200} step={0.1} unit="%" onChange={set('temperature_margin')} />
            </CalcSection>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Résultats</h3>
            {results.ok ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Inverter recommandé" value={results.recommended_kva} unit="kVA" highlight />
                  <ResultCard label="Besoin calculé" value={results.required_kva} unit="kVA" />
                  <ResultCard label="Capacité de surcharge" value={results.overload_kva} unit="kVA" />
                  <ResultCard label="Courant de sortie" value={results.output_current_a} unit="A" />
                  <ResultCard label="Courant DC nominal" value={results.dc_current_nominal_a} unit="A" />
                  <ResultCard label="Courant DC maximal" value={results.dc_current_max_a} unit="A" color="text-red-600" />
                  <ResultCard label="Batterie requise" value={results.required_battery_ah} unit="Ah" />
                  <ResultCard label="Autonomie avec batterie saisie" value={results.estimated_autonomy_min} unit="min" />
                  <ResultCard label="Modules" value={results.module_count} unit="unité(s)" />
                  <ResultCard label="Puissance totale installée" value={results.installed_kva} unit="kVA" />
                </div>

                <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-900">
                  {results.recommendation}
                </div>
                {results.warning && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    {results.warning}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-gray-400">
                Vérifiez les tensions, puissances et facteurs saisis.
              </div>
            )}
          </div>

          <DisclaimerBanner text={results.disclaimer} />

          {results.ok && (
            <div className="flex gap-3">
              <button type="button" onClick={() => downloadCalculationPdf({
                type:'inverter', inputs:{ ...inputs, calculation_mode:mode }, outputs:{ ...results },
              })} className="btn btn-outline flex-1">
                <Download className="h-4 w-4" /> Export PDF
              </button>
              <button type="button" onClick={() => setSaveOpen(true)} className="btn btn-primary flex-1">
                <Save className="h-4 w-4" /> Sauvegarder
              </button>
            </div>
          )}
        </div>
      </div>

      <SaveCalcModal open={saveOpen} onClose={() => setSaveOpen(false)}
        calcType="inverter" inputs={{ ...inputs, calculation_mode: mode }}
        outputs={{ ...results }} clients={clients} projects={projects}
        quotations={quotations} />
    </div>
  )
}
