'use client'
import { useState, useMemo } from 'react'
import { Save, Download, RotateCcw } from 'lucide-react'
import { CalculationModeSelector, NumberInput, PresetNumberInput, SelectInput, ResultCard, CalcSection, DisclaimerBanner, ProgressBar, type CalculationMode } from './CalcUI'
import SaveCalcModal from './SaveCalcModal'
import { calcRectifier, type RectifierInputs } from '@/lib/calculators/engines'
import { downloadCalculationPdf } from '@/lib/pdf/calculator-report'

interface Props { clients:{id:string;company_name:string}[]; projects:{id:string;reference:string;name:string}[]; quotations:{id:string;number:string}[] }

const DEF: RectifierInputs = { vdc:48, load_current_a:100, battery_ah:200, recharge_time_h:8, efficiency:92, safety_margin:20, vac_input:220, phases:1, battery_type:'vrla', recharge_factor:1.2, input_power_factor:0.9, redundancy:1 }

export default function RectifierCalculator({ clients, projects, quotations }: Props) {
  const [inputs, setInputs] = useState<RectifierInputs>(DEF)
  const [mode, setMode] = useState<CalculationMode>('new_sizing')
  const [saveOpen, setSaveOpen] = useState(false)
  const set = (k:keyof RectifierInputs) => (v:number|string) => setInputs(p=>({...p,[k]:Number(v)||p[k]}))
  const results = useMemo(() => calcRectifier(inputs), [inputs])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <CalculationModeSelector value={mode} onChange={setMode} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center text-white text-xl">🔌</div>
              <div><h2 className="text-base font-semibold text-navy-900">Paramètres rectifier</h2>
              <p className="text-xs text-gray-400">Chargeur / Rectifier</p></div>
            </div>
            <button onClick={()=>setInputs(DEF)} className="btn btn-ghost btn-sm text-gray-400"><RotateCcw className="w-3.5 h-3.5"/></button>
          </div>

          <div className="space-y-6">
            <CalcSection title="Système DC">
              <PresetNumberInput label="Tension DC" value={inputs.vdc}
                presets={[24,48,110,125,220]} min={1} step={1} unit="V DC" onChange={set('vdc')}/>
              <NumberInput label="Courant nominal de charge" value={inputs.load_current_a} min={0.1} step={0.1} unit="A" required onChange={set('load_current_a')} hint="Courant total réel ou prévu des équipements alimentés."/>
            </CalcSection>

            <CalcSection title="Batterie">
              <SelectInput label="Technologie batterie" value={inputs.battery_type}
                options={[{value:'vrla',label:'VRLA'},{value:'nicd',label:'Ni-Cd'},{value:'lithium',label:'Lithium / LiFePO4'},{value:'lead_acid',label:'Plomb ouvert'}]}
                onChange={v=>setInputs(p=>({...p,battery_type:v}))}/>
              <NumberInput label="Capacité batterie" value={inputs.battery_ah} min={0.1} step={0.1} unit="Ah" onChange={set('battery_ah')}/>
              <NumberInput label={mode === 'existing_installation' ? 'Temps de recharge constaté' : 'Temps de recharge souhaité'} value={inputs.recharge_time_h} min={0.1} step={0.1} unit="h" onChange={set('recharge_time_h')}/>
              <NumberInput label="Facteur de recharge" value={inputs.recharge_factor} min={1} max={2} step={0.01} unit="×" onChange={set('recharge_factor')} hint="À confirmer selon la technologie et le fabricant."/>
            </CalcSection>

            <CalcSection title="Alimentation AC">
              <PresetNumberInput label="Tension AC entrée" value={inputs.vac_input}
                presets={[110,120,220,230,380,400,415,440,480]} min={1} step={1} unit="V AC" onChange={set('vac_input')}/>
              <SelectInput label="Nombre de phases" value={String(inputs.phases)}
                options={[{value:'1',label:'Monophasé (1Ph)'},{value:'3',label:'Triphasé (3Ph)'}]}
                onChange={v=>set('phases')(v)}/>
              <NumberInput label="Rendement" value={inputs.efficiency} min={1} max={100} step={0.1} unit="%" onChange={set('efficiency')}/>
              <NumberInput label="Facteur de puissance d'entrée" value={inputs.input_power_factor} min={0.1} max={1} step={0.01} unit="PF" onChange={set('input_power_factor')}/>
              <NumberInput label="Marge de sécurité" value={inputs.safety_margin} min={0} max={100} step={0.1} unit="%" onChange={set('safety_margin')}/>
              <PresetNumberInput label="Nombre de modules en redondance" value={inputs.redundancy}
                presets={[1,2,3]} min={1} step={1} unit="module(s)" onChange={set('redundancy')}/>
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
                <ResultCard label="Courant recommandé" value={results.recommended_current_a} unit="A" highlight/>
                <ResultCard label="Courant recharge" value={results.recharge_current_a} unit="A" color="text-teal-700"/>
                <ResultCard label="Puissance DC" value={results.dc_power_kw} unit="kW"/>
                <ResultCard label="Puissance AC estimée" value={results.ac_power_kva} unit="kVA" color="text-blue-700"/>
                <ResultCard label="Puissance AC active" value={results.ac_power_kw} unit="kW"/>
                <ResultCard label="Courant AC" value={results.ac_current_a} unit="A"/>
                <ResultCard label="Calibre standard / module" value={results.standard_module_current_a} unit="A" highlight/>
                <ResultCard label="Courant total installé" value={results.total_installed_current_a} unit="A"/>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2">
                <ProgressBar value={results.recharge_current_a} max={results.recommended_current_a}
                  label="Part recharge vs total" unit="A" color="bg-teal-500"/>
              </div>

              <div className="bg-teal-50 rounded-xl p-3 border border-teal-100 text-sm text-teal-800">
                {results.recommendation}
              </div>
              {results.warning && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
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
            <button onClick={()=>downloadCalculationPdf({ type:'rectifier', inputs:{...inputs,calculation_mode:mode}, outputs:{...results} })} className="btn btn-outline flex-1">
              <Download className="w-4 h-4"/> Export PDF
            </button>
            <button onClick={()=>setSaveOpen(true)} className="btn btn-primary flex-1">
              <Save className="w-4 h-4"/> Sauvegarder
            </button>
          </div>
        )}
      </div>

      <SaveCalcModal open={saveOpen} onClose={()=>setSaveOpen(false)} calcType="rectifier"
        inputs={{ ...inputs, calculation_mode: mode } as never} outputs={results as never}
        clients={clients} projects={projects} quotations={quotations}/>
      </div>
    </div>
  )
}
