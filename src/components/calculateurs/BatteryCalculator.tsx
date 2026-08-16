'use client'
import { useState, useMemo } from 'react'
import { Save, Download, RotateCcw } from 'lucide-react'
import { CalculationModeSelector, NumberInput, PresetNumberInput, SelectInput, ResultCard, CalcSection, DisclaimerBanner, ProgressBar, AutonomyChart, type CalculationMode } from './CalcUI'
import SaveCalcModal from './SaveCalcModal'
import { calcBattery, type BatteryInputs } from '@/lib/calculators/engines'
import { downloadCalculationPdf } from '@/lib/pdf/calculator-report'

interface Props { clients:{id:string;company_name:string}[]; projects:{id:string;reference:string;name:string}[]; quotations:{id:string;number:string}[] }

const DEF: BatteryInputs = { vdc:48, load_kw:10, autonomy_min:60, efficiency:95, dod:80, battery_type:'vrla', cell_voltage:12, cell_capacity:100, safety_margin:20, aging_margin:20, temperature_margin:10 }

const TYPES = [{value:'vrla',label:'VRLA — AGM/Gel'},{value:'lithium',label:'Li-ion LiFePO4'},{value:'nicd',label:'Ni-Cd'},{value:'lead_acid',label:'Lead Acid ouvert'}]
const CELLS = [{value:'2',label:'2V (cellules industrielles)'},{value:'6',label:'6V (blocs)'},{value:'12',label:'12V (blocs standard)'}]
const VDC_OPT = [{value:'24',label:'24V'},{value:'48',label:'48V'},{value:'96',label:'96V'},{value:'110',label:'110V DC'},{value:'192',label:'192V DC'},{value:'220',label:'220V DC'},{value:'240',label:'240V DC'}]

export default function BatteryCalculator({ clients, projects, quotations }: Props) {
  const [inputs, setInputs] = useState<BatteryInputs>(DEF)
  const [mode, setMode] = useState<CalculationMode>('new_sizing')
  const [saveOpen, setSaveOpen] = useState(false)
  const set = (k:keyof BatteryInputs) => (v:number|string) => setInputs(p=>({...p,[k]:typeof v==='string'&&!isNaN(Number(v))?Number(v):v}))
  const results = useMemo(() => calcBattery(inputs), [inputs])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <CalculationModeSelector value={mode} onChange={setMode} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white text-xl">🔋</div>
              <div><h2 className="text-base font-semibold text-navy-900">Paramètres batteries</h2>
              <p className="text-xs text-gray-400">Dimensionnement banc</p></div>
            </div>
            <button onClick={()=>setInputs(DEF)} className="btn btn-ghost btn-sm text-gray-400"><RotateCcw className="w-3.5 h-3.5"/></button>
          </div>

          <div className="space-y-6">
            <CalcSection title="Système">
              <PresetNumberInput label="Tension système DC" value={inputs.vdc}
                presets={VDC_OPT.map(option => Number(option.value))} min={1} step={1} unit="V DC" onChange={set('vdc')}/>
              <NumberInput label="Puissance de la charge" value={inputs.load_kw} min={0.01} step={0.01} unit="kW" required onChange={set('load_kw')}/>
              <NumberInput label={mode === 'existing_installation' ? 'Autonomie mesurée ou nominale' : 'Autonomie souhaitée'} value={inputs.autonomy_min} min={0.1} step={0.1} unit="min" onChange={set('autonomy_min')}/>
            </CalcSection>

            <CalcSection title="Type de batterie">
              <SelectInput label="Technologie" value={inputs.battery_type} options={TYPES} onChange={v=>set('battery_type')(v)}/>
              <PresetNumberInput label="Tension par bloc ou cellule" value={inputs.cell_voltage}
                presets={[1.2, ...CELLS.map(option => Number(option.value))]} min={0.1} step={0.1} unit="V" onChange={set('cell_voltage')}/>
              <NumberInput label="Capacité du bloc ou de la cellule" value={inputs.cell_capacity} min={0.1} step={0.1} unit="Ah" onChange={set('cell_capacity')} hint="Saisissez la capacité réellement disponible ou retenue."/>
            </CalcSection>

            <CalcSection title="Performance">
              <NumberInput label="Rendement" value={inputs.efficiency} min={1} max={100} step={0.1} unit="%" onChange={set('efficiency')}/>
              <NumberInput label="Profondeur de décharge (DoD)" value={inputs.dod} min={1} max={100} step={0.1} unit="%" onChange={set('dod')} hint="Saisissez la limite du fabricant lorsqu'elle est connue."/>
              <NumberInput label="Marge de sécurité" value={inputs.safety_margin} min={0} max={100} step={0.1} unit="%" onChange={set('safety_margin')}/>
              <NumberInput label="Marge de vieillissement" value={inputs.aging_margin} min={0} max={200} step={0.1} unit="%" onChange={set('aging_margin')}/>
              <NumberInput label="Correction de température" value={inputs.temperature_margin} min={0} max={200} step={0.1} unit="%" onChange={set('temperature_margin')}/>
            </CalcSection>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Résultats</h3>
          {results.ok ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <ResultCard label="Énergie nécessaire" value={results.energy_needed_kwh} unit="kWh" highlight/>
                <ResultCard label="Capacité nominale" value={results.energy_nominal_kwh} unit="kWh" color="text-amber-700"/>
                <ResultCard label="Blocs en série" value={results.cells_in_series} unit="blocs" sub={`${inputs.vdc}V ÷ ${inputs.cell_voltage}V`}/>
                <ResultCard label="Strings parallèles" value={results.strings_parallel} unit="strings"/>
                <ResultCard label="Blocs totaux" value={results.total_cells} unit="blocs" highlight/>
                <ResultCard label="Autonomie estimée" value={Math.round(results.estimated_autonomy_min)} unit="min" color="text-green-700"/>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2">
                <ProgressBar value={results.actual_dod_pct} max={100} label="DoD réel" unit="%"/>
                <ProgressBar value={results.total_capacity_ah} max={results.capacity_with_margin*1.5} label="Capacité totale" unit="Ah" color="bg-amber-500"/>
              </div>

              {/* Graphique autonomie */}
              {results.autonomy_data.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Courbe de décharge estimée</h4>
                  <AutonomyChart data={results.autonomy_data} autonomy_min={inputs.autonomy_min}/>
                </div>
              )}

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-xs text-amber-800">
                Configuration : <strong>{results.cells_in_series} éléments × {results.strings_parallel} strings = {results.total_cells} éléments</strong> de {inputs.cell_capacity} Ah / {inputs.cell_voltage}V — bus réel {results.actual_bank_voltage}V
              </div>
              {results.warning && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  {results.warning}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">Entrez les paramètres</div>
          )}
        </div>

        <DisclaimerBanner text={results.disclaimer}/>

        {results.ok && (
          <div className="flex gap-3">
            <button onClick={()=>downloadCalculationPdf({ type:'battery', inputs:{...inputs,calculation_mode:mode}, outputs:{...results} })} className="btn btn-outline flex-1">
              <Download className="w-4 h-4"/> Export PDF
            </button>
            <button onClick={()=>setSaveOpen(true)} className="btn btn-primary flex-1">
              <Save className="w-4 h-4"/> Sauvegarder
            </button>
          </div>
        )}
      </div>

      <SaveCalcModal open={saveOpen} onClose={()=>setSaveOpen(false)} calcType="battery"
        inputs={{ ...inputs, calculation_mode: mode } as never} outputs={results as never}
        clients={clients} projects={projects} quotations={quotations}/>
      </div>
    </div>
  )
}
