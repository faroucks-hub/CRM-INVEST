'use client'

import { useMemo, useState } from 'react'
import { Download, RefreshCw, RotateCcw, Save } from 'lucide-react'
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
  calcFrequencyConverter,
  type FrequencyConverterInputs,
} from '@/lib/calculators/engines'
import { downloadCalculationPdf } from '@/lib/pdf/calculator-report'

interface Props {
  clients: { id: string; company_name: string }[]
  projects: { id: string; reference: string; name: string }[]
  quotations: { id: string; number: string }[]
}

const DEFAULTS: FrequencyConverterInputs = {
  load_kw: 10,
  load_power_factor: 0.8,
  input_voltage: 400,
  input_phases: 3,
  input_frequency: 50,
  input_power_factor: 0.95,
  output_voltage: 230,
  output_phases: 3,
  output_frequency: 60,
  efficiency: 92,
  safety_margin: 20,
  starting_current_factor: 1,
  overload_capability: 1.5,
  redundancy: 1,
  load_type: 'mixed',
}

const LOAD_TYPES = [
  { value:'resistive', label:'Résistive' },
  { value:'inductive', label:'Inductive' },
  { value:'capacitive', label:'Capacitive' },
  { value:'motor', label:'Moteur' },
  { value:'mixed', label:'Mixte industrielle' },
  { value:'aviation', label:'Aéronautique / 400 Hz' },
]

export default function FrequencyConverterCalculator({
  clients,
  projects,
  quotations,
}: Props) {
  const [inputs, setInputs] = useState<FrequencyConverterInputs>(DEFAULTS)
  const [mode, setMode] = useState<CalculationMode>('new_sizing')
  const [saveOpen, setSaveOpen] = useState(false)
  const set = (key: keyof FrequencyConverterInputs) => (value: number | string) =>
    setInputs(previous => ({ ...previous, [key]: value }))
  const results = useMemo(() => calcFrequencyConverter(inputs), [inputs])

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <CalculationModeSelector value={mode} onChange={setMode} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700">
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-navy-900">Paramètres Frequency Converter</h2>
                <p className="text-xs text-gray-400">Conversion AC/AC de tension et fréquence</p>
              </div>
            </div>
            <button type="button" onClick={() => setInputs(DEFAULTS)}
              className="btn btn-ghost btn-sm text-gray-400">
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </button>
          </div>

          <div className="space-y-6">
            <CalcSection title="Charge">
              <NumberInput label="Puissance active de la charge" value={inputs.load_kw}
                min={0.01} step={0.01} unit="kW" required onChange={set('load_kw')} />
              <NumberInput label="Facteur de puissance de la charge" value={inputs.load_power_factor}
                min={0.1} max={1} step={0.01} unit="PF" onChange={set('load_power_factor')} />
              <SelectInput label="Type de charge" value={inputs.load_type}
                options={LOAD_TYPES} onChange={set('load_type')} />
              <NumberInput label="Facteur de courant de démarrage" value={inputs.starting_current_factor}
                min={1} max={20} step={0.01} unit="×" onChange={set('starting_current_factor')}
                hint="1 pour une charge sans pointe ; valeur constructeur pour un moteur." />
              <NumberInput label="Capacité de surcharge du convertisseur" value={inputs.overload_capability}
                min={1} max={10} step={0.01} unit="×" onChange={set('overload_capability')}
                hint="Exemple : 1,5 pour 150 % pendant la durée spécifiée." />
              <NumberInput label="Marge de dimensionnement" value={inputs.safety_margin}
                min={0} max={100} step={0.1} unit="%" onChange={set('safety_margin')} />
            </CalcSection>

            <CalcSection title="Alimentation AC">
              <PresetNumberInput label="Tension d'entrée" value={inputs.input_voltage}
                presets={[110, 120, 220, 230, 380, 400, 415, 440, 480, 690]}
                min={1} step={1} unit="V AC" onChange={set('input_voltage')} />
              <SelectInput label="Phases d'entrée" value={String(inputs.input_phases)}
                options={[{ value:'1', label:'Monophasé' }, { value:'3', label:'Triphasé' }]}
                onChange={value => set('input_phases')(Number(value))} />
              <PresetNumberInput label="Fréquence d'entrée" value={inputs.input_frequency}
                presets={[50, 60, 400]} min={1} step={0.1} unit="Hz"
                onChange={set('input_frequency')} />
              <NumberInput label="Facteur de puissance d'entrée" value={inputs.input_power_factor}
                min={0.1} max={1} step={0.01} unit="PF" onChange={set('input_power_factor')} />
            </CalcSection>

            <CalcSection title="Sortie AC">
              <PresetNumberInput label="Tension de sortie" value={inputs.output_voltage}
                presets={[110, 115, 120, 200, 220, 230, 240, 380, 400, 415, 440, 480]}
                min={1} step={1} unit="V AC" onChange={set('output_voltage')} />
              <SelectInput label="Phases de sortie" value={String(inputs.output_phases)}
                options={[{ value:'1', label:'Monophasé' }, { value:'3', label:'Triphasé' }]}
                onChange={value => set('output_phases')(Number(value))} />
              <PresetNumberInput label="Fréquence de sortie" value={inputs.output_frequency}
                presets={[50, 60, 400]} min={1} step={0.1} unit="Hz"
                onChange={set('output_frequency')} />
              <NumberInput label="Rendement" value={inputs.efficiency}
                min={1} max={100} step={0.1} unit="%" onChange={set('efficiency')} />
              <PresetNumberInput label="Modules / redondance" value={inputs.redundancy}
                presets={[1, 2, 3]} min={1} step={1} unit="module(s)"
                onChange={set('redundancy')} />
            </CalcSection>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Résultats
            </h3>
            {results.ok ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Convertisseur recommandé" value={results.recommended_kva} unit="kVA" highlight />
                  <ResultCard label="Besoin continu" value={results.continuous_required_kva} unit="kVA" />
                  <ResultCard label="Pointe au démarrage" value={results.starting_kva} unit="kVA" />
                  <ResultCard label="Base de sélection" value={results.selection_basis_kva} unit="kVA" />
                  <ResultCard label="Courant d'entrée" value={results.input_current_a} unit="A" />
                  <ResultCard label="Courant de sortie" value={results.output_current_a} unit="A" />
                  <ResultCard label="Puissance active d'entrée" value={results.input_power_kw} unit="kW" />
                  <ResultCard label="Puissance apparente d'entrée" value={results.input_power_kva} unit="kVA" />
                  <ResultCard label="Rapport de fréquence" value={results.conversion_ratio} unit="×" />
                  <ResultCard label="Puissance totale installée" value={results.installed_kva} unit="kVA" />
                </div>

                <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900">
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
                Vérifiez les tensions, phases, fréquences et facteurs saisis.
              </div>
            )}
          </div>

          <DisclaimerBanner text={results.disclaimer} />

          {results.ok && (
            <div className="flex gap-3">
              <button type="button" onClick={() => downloadCalculationPdf({
                type:'frequency_converter',
                inputs:{ ...inputs, calculation_mode:mode },
                outputs:{ ...results },
              })} className="btn btn-outline flex-1">
                <Download className="h-4 w-4" /> Export PDF
              </button>
              <button type="button" onClick={() => setSaveOpen(true)}
                className="btn btn-primary flex-1">
                <Save className="h-4 w-4" /> Sauvegarder
              </button>
            </div>
          )}
        </div>
      </div>

      <SaveCalcModal open={saveOpen} onClose={() => setSaveOpen(false)}
        calcType="frequency_converter"
        inputs={{ ...inputs, calculation_mode: mode }}
        outputs={{ ...results }}
        clients={clients} projects={projects} quotations={quotations} />
    </div>
  )
}
