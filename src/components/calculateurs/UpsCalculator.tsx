'use client'

import { useState, useMemo } from 'react'
import { Save, Download, RotateCcw, Zap } from 'lucide-react'
import { CalculationModeSelector, NumberInput, PresetNumberInput, SelectInput, ResultCard, CalcSection, DisclaimerBanner, ProgressBar, type CalculationMode } from './CalcUI'
import SaveCalcModal from './SaveCalcModal'
import { calcUps, type UpsInputs } from '@/lib/calculators/engines'
import { downloadCalculationPdf } from '@/lib/pdf/calculator-report'

interface Props {
  clients:    { id: string; company_name: string }[]
  projects:   { id: string; reference: string; name: string }[]
  quotations: { id: string; number: string }[]
}

const DEFAULTS: UpsInputs = {
  kva: 100, power_factor: 0.8, efficiency: 94,
  autonomy_min: 30, vdc_bus: 192, safety_margin: 20,
  load_type: 'server', battery_type:'vrla', battery_block_voltage:12,
  battery_block_capacity_ah:100, dod:80, aging_margin:20, temperature_margin:10,
}

const LOAD_TYPES = [
  { value:'server',     label:'Serveurs / IT (PF 0.9)' },
  { value:'resistive',  label:'Charge résistive (PF 1.0)' },
  { value:'capacitive', label:'Charge capacitive (PF 0.7-0.8)' },
  { value:'mixed',      label:'Charge mixte industrielle' },
]

const VDC_OPTIONS = [
  { value:'48',  label:'48V DC (petits systèmes <10kVA)' },
  { value:'96',  label:'96V DC' },
  { value:'192', label:'192V DC (standard industriel)' },
  { value:'240', label:'240V DC' },
  { value:'384', label:'384V DC (grands systèmes)' },
]

const BATTERY_TYPES = [
  { value:'vrla', label:'VRLA — AGM/Gel' },
  { value:'nicd', label:'Ni-Cd industriel' },
  { value:'lithium', label:'Lithium / LiFePO4' },
  { value:'lead_acid', label:'Plomb ouvert' },
]

export default function UpsCalculator({ clients, projects, quotations }: Props) {
  const [inputs, setInputs] = useState<UpsInputs>(DEFAULTS)
  const [mode, setMode] = useState<CalculationMode>('new_sizing')
  const [saveOpen, setSaveOpen] = useState(false)

  const set = (key: keyof UpsInputs) => (v: number | string) =>
    setInputs(prev => ({ ...prev, [key]: v }))

  const results = useMemo(() => calcUps(inputs), [inputs])

  function handleReset() { setInputs(DEFAULTS) }

  async function handleExportPDF() {
    await downloadCalculationPdf({
      type:'ups',
      inputs:{ ...inputs, calculation_mode:mode },
      outputs:{ ...results },
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <CalculationModeSelector value={mode} onChange={setMode} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── INPUTS ───────────────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center">
                <Zap className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-navy-900">Paramètres d'entrée</h2>
                <p className="text-xs text-gray-400">Puissance et autonomie</p>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm text-gray-400 hover:text-gray-700">
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          </div>

          <div className="space-y-6">
            <CalcSection title="Puissance">
              <NumberInput label="Puissance apparente de la charge" value={inputs.kva}
                min={0.1} step={0.1} unit="kVA" required
                onChange={set('kva')}
                hint={mode === 'existing_installation' ? "Valeur de la plaque signalétique de l'UPS." : "Puissance nominale requise ou estimée."} />
              <NumberInput label="Facteur de puissance" value={inputs.power_factor}
                min={0.1} max={1} step={0.01} unit="PF"
                onChange={set('power_factor')}
                hint="Saisissez la valeur réelle lorsqu'elle est connue." />
              <NumberInput label="Rendement UPS" value={inputs.efficiency}
                min={1} max={100} step={0.1} unit="%"
                onChange={set('efficiency')}
                hint="Valeur constructeur ou estimation préliminaire." />
              <SelectInput label="Type de charge" value={inputs.load_type}
                options={LOAD_TYPES} onChange={v => set('load_type')(v)} />
            </CalcSection>

            <CalcSection title="Autonomie & Batteries">
              <NumberInput label={mode === 'existing_installation' ? 'Autonomie constatée ou nominale' : 'Autonomie souhaitée'} value={inputs.autonomy_min}
                min={0.1} step={0.1} unit="min"
                onChange={set('autonomy_min')}
                hint="Saisie libre en minutes, y compris au-delà de 8 heures." />
              <PresetNumberInput label="Tension bus DC" value={inputs.vdc_bus}
                presets={VDC_OPTIONS.map(option => Number(option.value))}
                min={1} step={1} unit="V DC"
                onChange={set('vdc_bus')} />
              <SelectInput label="Technologie batterie" value={inputs.battery_type}
                options={BATTERY_TYPES} onChange={set('battery_type')} />
              <PresetNumberInput label="Tension du bloc ou de la cellule"
                value={inputs.battery_block_voltage} presets={[1.2, 2, 6, 12]}
                min={0.1} step={0.1} unit="V" onChange={set('battery_block_voltage')} />
              <NumberInput label="Capacité unitaire disponible"
                value={inputs.battery_block_capacity_ah} min={0.1} step={0.1}
                unit="Ah" onChange={set('battery_block_capacity_ah')} />
              <NumberInput label="Profondeur de décharge admissible"
                value={inputs.dod} min={1} max={100} step={0.1}
                unit="%" onChange={set('dod')} />
              <NumberInput label="Marge de sécurité" value={inputs.safety_margin}
                min={0} max={100} step={0.1} unit="%"
                onChange={set('safety_margin')}
                hint="Valeur libre selon le cahier des charges." />
              <NumberInput label="Marge de vieillissement" value={inputs.aging_margin}
                min={0} max={200} step={0.1} unit="%" onChange={set('aging_margin')} />
              <NumberInput label="Correction de température" value={inputs.temperature_margin}
                min={0} max={200} step={0.1} unit="%" onChange={set('temperature_margin')}
                hint="À définir selon la température minimale et les données du fabricant." />
            </CalcSection>
          </div>
        </div>
      </div>

      {/* ── RESULTS ──────────────────────────────────────────────── */}
      <div className="space-y-4">

        {/* Primary results */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Résultats</h3>

          {results.ok ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <ResultCard label="UPS recommandé" value={results.recommended_kva} unit="kVA" highlight />
                <ResultCard label="Puissance active" value={results.kw} unit="kW" highlight />
                <ResultCard label="Avec marge de sécurité" value={results.kw_with_margin} unit="kW"
                  color="text-gold-600" />
                <ResultCard label="Puissance DC estimée" value={results.dc_power_kw} unit="kW" />
                <ResultCard label="Énergie batterie" value={results.battery_energy_kwh} unit="kWh"
                  color="text-blue-700" />
              </div>

              {/* Battery section */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Configuration batteries
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Capacité recommandée" value={results.recommended_ah} unit="Ah"
                    highlight />
                  <ResultCard label="Blocs / cellules estimés" value={results.batteries_12v} unit="unités" />
                  <ResultCard label="Éléments / string" value={results.batteries_per_string} unit="unités"
                    sub={`${results.actual_dc_voltage} V DC réels`} />
                  <ResultCard label="Strings parallèles" value={results.strings_parallel}
                    sub={`${results.installed_capacity_ah} Ah installés`} />
                </div>
              </div>

              {/* Progress bars */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <ProgressBar value={results.kw} max={inputs.kva}
                  label="Utilisation puissance" unit="kW"
                  color="bg-navy-900" />
                <ProgressBar value={inputs.safety_margin} max={50}
                  label="Marge de sécurité" unit="%"
                  color="bg-gold-400" />
              </div>

              {/* Recommendation */}
              <div className="bg-navy-900/5 rounded-xl p-4 border border-navy-900/10">
                <p className="text-xs font-semibold text-navy-900 uppercase tracking-wide mb-2">
                  Recommandation
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{results.recommendation}</p>
              </div>
              {results.warning && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  {results.warning}
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Zap className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Entrez les paramètres pour calculer</p>
            </div>
          )}
        </div>

        <DisclaimerBanner text={results.disclaimer} />

        {/* Actions */}
        {results.ok && (
          <div className="flex gap-3">
            <button onClick={handleExportPDF} className="btn btn-outline flex-1">
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button onClick={() => setSaveOpen(true)} className="btn btn-primary flex-1">
              <Save className="w-4 h-4" /> Sauvegarder
            </button>
          </div>
        )}
      </div>

      <SaveCalcModal open={saveOpen} onClose={() => setSaveOpen(false)}
        calcType="ups"
        inputs={{ ...inputs, calculation_mode: mode }}
        outputs={{ ...results }}
        clients={clients} projects={projects} quotations={quotations} />
      </div>
    </div>
  )
}
