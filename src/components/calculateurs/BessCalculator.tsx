'use client'
import { useState, useMemo } from 'react'
import { Save, Download, RotateCcw } from 'lucide-react'
import { CalculationModeSelector, NumberInput, PresetNumberInput, SelectInput, ResultCard, CalcSection, DisclaimerBanner, ProgressBar, type CalculationMode } from './CalcUI'
import SaveCalcModal from './SaveCalcModal'
import { calcBess, type BessInputs } from '@/lib/calculators/engines'
import { downloadCalculationPdf } from '@/lib/pdf/calculator-report'

interface Props { clients:{id:string;company_name:string}[]; projects:{id:string;reference:string;name:string}[]; quotations:{id:string;number:string}[] }

const DEF: BessInputs = { load_kw:100, autonomy_h:4, efficiency:90, dod:90, safety_margin:20, application:'backup', cycle_life:4000, cycles_per_day:1, calendar_life_y:15, peak_factor:1 }

const APPS = [{value:'backup',label:'Secours / Backup'},{value:'peak_shaving',label:'Peak Shaving'},{value:'solar_storage',label:'Stockage solaire'},{value:'hybrid',label:'Application hybride'}]
const CYCLES = [{value:'300',label:'300 (VRLA courte durée)'},{value:'1000',label:'1 000 (Li-ion standard)'},{value:'3000',label:'3 000 (Li-ion qualité)'},{value:'4000',label:'4 000 (LiFePO4)'},{value:'6000',label:'6 000 (LiFePO4 longue durée)'}]

export default function BessCalculator({ clients, projects, quotations }: Props) {
  const [inputs, setInputs] = useState<BessInputs>(DEF)
  const [mode, setMode] = useState<CalculationMode>('new_sizing')
  const [saveOpen, setSaveOpen] = useState(false)
  const set = (k:keyof BessInputs) => (v:number|string) => setInputs(p=>({...p,[k]:typeof v==='string'&&!isNaN(Number(v))?Number(v):v}))
  const results = useMemo(() => calcBess(inputs), [inputs])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <CalculationModeSelector value={mode} onChange={setMode} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-700 flex items-center justify-center text-white text-xl">☀️</div>
              <div><h2 className="text-base font-semibold text-navy-900">Paramètres BESS</h2>
              <p className="text-xs text-gray-400">Battery Energy Storage System</p></div>
            </div>
            <button onClick={()=>setInputs(DEF)} className="btn btn-ghost btn-sm text-gray-400"><RotateCcw className="w-3.5 h-3.5"/></button>
          </div>

          <div className="space-y-6">
            <CalcSection title="Application">
              <SelectInput label="Type d'application" value={inputs.application} options={APPS} onChange={v=>set('application')(v)}/>
              <NumberInput label="Puissance de charge" value={inputs.load_kw} min={0.1} step={0.1} unit="kW" required onChange={set('load_kw')}/>
              <NumberInput label="Facteur de puissance de pointe" value={inputs.peak_factor} min={1} max={10} step={0.01} unit="×" onChange={set('peak_factor')} hint="Rapport entre la pointe instantanée et la puissance continue."/>
              <NumberInput label={mode === 'existing_installation' ? 'Durée de décharge constatée' : 'Autonomie souhaitée'} value={inputs.autonomy_h} min={0.1} step={0.1} unit="h" onChange={set('autonomy_h')}/>
            </CalcSection>

            <CalcSection title="Performance système">
              <NumberInput label="Rendement système" value={inputs.efficiency} min={1} max={100} step={0.1} unit="%" onChange={set('efficiency')}/>
              <NumberInput label="Profondeur de décharge (DoD)" value={inputs.dod} min={1} max={100} step={0.1} unit="%" onChange={set('dod')}/>
              <NumberInput label="Marge de sécurité" value={inputs.safety_margin} min={0} max={100} step={0.1} unit="%" onChange={set('safety_margin')}/>
              <PresetNumberInput label="Durée de vie" value={inputs.cycle_life}
                presets={CYCLES.map(option => Number(option.value))} min={1} step={1} unit="cycles" onChange={set('cycle_life')}/>
              <NumberInput label="Cycles équivalents par jour" value={inputs.cycles_per_day}
                min={0.01} max={20} step={0.01} unit="cycle/j" onChange={set('cycles_per_day')}/>
              <NumberInput label="Durée de vie calendaire" value={inputs.calendar_life_y}
                min={1} max={50} step={0.1} unit="ans" onChange={set('calendar_life_y')}/>
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
                <ResultCard label="Énergie utile" value={results.useful_energy_kwh} unit="kWh" highlight/>
                <ResultCard label="Capacité nominale" value={results.nominal_capacity_kwh} unit="kWh" color="text-green-700"/>
                <ResultCard label="BESS recommandé" value={results.recommended_kwh} unit="kWh" highlight/>
                <ResultCard label="PCS recommandé" value={results.pcs_kw} unit="kW" color="text-blue-700"/>
                <ResultCard label="Puissance côté batterie" value={results.battery_power_kw} unit="kW"/>
                <ResultCard label="Cycles / an (estimés)" value={results.estimated_cycles_year} unit="cy/an"/>
                <ResultCard label="Durée de vie estimée" value={results.estimated_lifetime_y} unit="ans" color="text-emerald-700"/>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <ProgressBar value={results.useful_energy_kwh} max={results.recommended_kwh}
                  label="Énergie utile vs nominale" unit="kWh" color="bg-green-600"/>
              </div>

              <div className="bg-green-50 rounded-xl p-3 border border-green-100 text-sm text-green-800">
                {results.recommendation}
              </div>

              <p className="text-xs text-gray-400 italic text-center">
                * Aucun prix automatique : le coût dépend de la technologie, du C-rate, du BMS, du PCS, des protections et des conditions du site.
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">Entrez les paramètres</div>
          )}
        </div>

        <DisclaimerBanner text={results.disclaimer}/>

        {results.ok && (
          <div className="flex gap-3">
            <button onClick={()=>downloadCalculationPdf({ type:'bess', inputs:{...inputs,calculation_mode:mode}, outputs:{...results} })} className="btn btn-outline flex-1">
              <Download className="w-4 h-4"/> Export PDF
            </button>
            <button onClick={()=>setSaveOpen(true)} className="btn btn-primary flex-1">
              <Save className="w-4 h-4"/> Sauvegarder
            </button>
          </div>
        )}
      </div>

      <SaveCalcModal open={saveOpen} onClose={()=>setSaveOpen(false)} calcType="bess"
        inputs={{ ...inputs, calculation_mode: mode } as never} outputs={results as never}
        clients={clients} projects={projects} quotations={quotations}/>
      </div>
    </div>
  )
}
