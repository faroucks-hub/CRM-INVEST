'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui'
import { toast } from 'sonner'
import {
  createDocumentRegisterItem, updateDocumentRegisterStatus, deleteDocumentRegisterItem,
  createEquipmentItem, updateEquipmentStatus, deleteEquipmentItem,
  createNameplateItem, updateNameplateStatus, deleteNameplateItem,
  updateCompletionItem,
} from '@/lib/actions/industrial-dossier'

type DocReg = { id:string; document_code:string; title:string; category:string; current_revision:string; status:string; required:boolean; planned_submission_date:string|null; actual_submission_date:string|null; approval_date:string|null; responsible:string|null; remarks:string|null }
type Equipment = { id:string; item_no:string|null; tag_no:string|null; description:string; manufacturer:string|null; model:string|null; quantity:number; rating:string|null; input_spec:string|null; output_spec:string|null; serial_no:string|null; equipment_status:string; remarks:string|null }
type Nameplate = { id:string; equipment_item_id:string|null; tag_no:string|null; equipment:string; manufacturer:string|null; model:string|null; serial_no:string|null; rating:string|null; input_data:string|null; output_data:string|null; protection_ip:string|null; frequency:string|null; manufacture_year:number|null; verification_status:string; remarks:string|null }
type Checklist = { id:string; checklist_key:string; label:string; category:string; required:boolean; status:string; remarks:string|null }

function downloadCsv(filename:string, rows:Record<string,unknown>[]) {
  if (!rows.length) return toast.error('Aucune donnée à exporter')
  const headers = Object.keys(rows[0])
  const esc=(v:unknown)=>`"${String(v ?? '').replaceAll('"','""')}"`
  const csv=[headers.map(esc).join(','),...rows.map(r=>headers.map(h=>esc(r[h])).join(','))].join('\n')
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url)
}

export default function IndustrialDossierClient({projectId,projectReference,documentRegister,equipment,nameplates,checklist}:{projectId:string;projectReference:string;documentRegister:DocReg[];equipment:Equipment[];nameplates:Nameplate[];checklist:Checklist[]}){
  const [tab,setTab]=useState<'mdr'|'equipment'|'nameplates'|'closing'>('mdr')
  const [modal,setModal]=useState<null|'mdr'|'equipment'|'nameplate'>(null)
  const [pending,startTransition]=useTransition()
  const compliance=useMemo(()=>{
    const req=checklist.filter(x=>x.required)
    const ok=req.filter(x=>['approved','not_applicable'].includes(x.status)).length
    return req.length ? Math.round(ok/req.length*100) : 100
  },[checklist])
  const run=(fn:()=>Promise<{error?:string;success?:boolean}>)=>startTransition(async()=>{const r=await fn(); if(r.error)toast.error(r.error); else {toast.success('Mise à jour enregistrée'); location.reload()}})

  return <div className="card p-6 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-lg font-semibold text-navy-900">Dossier projet industriel</h2><p className="text-sm text-gray-400">MDR, liste équipements, plaques signalétiques et dossier final.</p></div>
      <div className="flex items-center gap-3"><div className="text-right"><div className="text-xs text-gray-400">Complétude clôture</div><div className="font-semibold text-navy-900">{compliance}%</div></div><div className="h-2 w-28 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-green-500" style={{width:`${compliance}%`}}/></div></div>
    </div>
    <div className="flex gap-2 flex-wrap border-b border-gray-100 pb-3">
      {[['mdr','Document Register / MDR'],['equipment','Equipment List'],['nameplates','Nameplate List'],['closing','Dossier final']].map(([k,l])=><button key={k} onClick={()=>setTab(k as typeof tab)} className={`px-3 py-2 rounded-lg text-sm ${tab===k?'bg-navy-900 text-white':'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>{l}</button>)}
    </div>

    {tab==='mdr' && <section className="space-y-3">
      <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>downloadCsv(`${projectReference}-MDR.csv`,documentRegister)}>Exporter CSV</button><button className="btn btn-primary" onClick={()=>setModal('mdr')}><Plus className="w-4 h-4 mr-2"/>Document</button></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-400 border-b"><th className="py-2">N° Doc.</th><th>Titre</th><th>Catégorie</th><th>Rev.</th><th>Échéance</th><th>Statut</th><th/></tr></thead><tbody>{documentRegister.map(d=><tr key={d.id} className="border-b border-gray-50"><td className="py-3 font-medium">{d.document_code}</td><td>{d.title}</td><td>{d.category}</td><td>{d.current_revision}</td><td>{d.planned_submission_date??'—'}</td><td><select value={d.status} disabled={pending} onChange={e=>run(()=>updateDocumentRegisterStatus(d.id,projectId,e.target.value))} className="input h-8 text-xs"><option value="not_started">À préparer</option><option value="draft">Draft</option><option value="submitted">Soumis</option><option value="commented">Commenté</option><option value="revise_resubmit">À réviser</option><option value="approved">Approuvé</option><option value="final">Final</option><option value="waived">Non requis</option></select></td><td><button onClick={()=>run(()=>deleteDocumentRegisterItem(d.id,projectId))} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button></td></tr>)}</tbody></table>{!documentRegister.length&&<div className="py-8 text-center text-sm text-gray-400">Aucun document au MDR.</div>}</div>
    </section>}

    {tab==='equipment' && <section className="space-y-3">
      <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>downloadCsv(`${projectReference}-Equipment-List.csv`,equipment)}>Exporter CSV</button><button className="btn btn-primary" onClick={()=>setModal('equipment')}><Plus className="w-4 h-4 mr-2"/>Équipement</button></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-400 border-b"><th className="py-2">Item</th><th>Tag</th><th>Description</th><th>Fabricant / Modèle</th><th>Qté</th><th>Rating</th><th>Statut</th><th/></tr></thead><tbody>{equipment.map(x=><tr key={x.id} className="border-b border-gray-50"><td className="py-3">{x.item_no??'—'}</td><td>{x.tag_no??'—'}</td><td className="font-medium">{x.description}</td><td>{[x.manufacturer,x.model].filter(Boolean).join(' / ')||'—'}</td><td>{x.quantity}</td><td>{x.rating??'—'}</td><td><select value={x.equipment_status} onChange={e=>run(()=>updateEquipmentStatus(x.id,projectId,e.target.value))} className="input h-8 text-xs"><option value="planned">Planifié</option><option value="ordered">Commandé</option><option value="in_production">Production</option><option value="tested">Testé</option><option value="ready">Prêt</option><option value="shipped">Expédié</option><option value="delivered">Livré</option><option value="cancelled">Annulé</option></select></td><td><button onClick={()=>run(()=>deleteEquipmentItem(x.id,projectId))} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button></td></tr>)}</tbody></table>{!equipment.length&&<div className="py-8 text-center text-sm text-gray-400">Aucun équipement enregistré.</div>}</div>
    </section>}

    {tab==='nameplates' && <section className="space-y-3">
      <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>downloadCsv(`${projectReference}-Nameplate-List.csv`,nameplates)}>Exporter CSV</button><button className="btn btn-primary" onClick={()=>setModal('nameplate')}><Plus className="w-4 h-4 mr-2"/>Plaque</button></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-400 border-b"><th className="py-2">Tag</th><th>Équipement</th><th>Fabricant / Modèle</th><th>S/N</th><th>Rating</th><th>Entrée / Sortie</th><th>IP</th><th>Vérification</th><th/></tr></thead><tbody>{nameplates.map(x=><tr key={x.id} className="border-b border-gray-50"><td className="py-3">{x.tag_no??'—'}</td><td className="font-medium">{x.equipment}</td><td>{[x.manufacturer,x.model].filter(Boolean).join(' / ')||'—'}</td><td>{x.serial_no??'—'}</td><td>{x.rating??'—'}</td><td>{[x.input_data,x.output_data].filter(Boolean).join(' → ')||'—'}</td><td>{x.protection_ip??'—'}</td><td><select value={x.verification_status} onChange={e=>run(()=>updateNameplateStatus(x.id,projectId,e.target.value))} className="input h-8 text-xs"><option value="pending">À vérifier</option><option value="verified">Vérifié</option><option value="non_conforming">Non conforme</option><option value="not_applicable">N/A</option></select></td><td><button onClick={()=>run(()=>deleteNameplateItem(x.id,projectId))} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button></td></tr>)}</tbody></table>{!nameplates.length&&<div className="py-8 text-center text-sm text-gray-400">Aucune plaque signalétique enregistrée.</div>}</div>
    </section>}

    {tab==='closing' && <section className="grid md:grid-cols-2 gap-3">{checklist.map(x=><div key={x.id} className={`rounded-xl border p-4 ${x.required?'border-gray-200':'border-dashed border-gray-200'}`}><div className="flex justify-between gap-3"><div><div className="font-medium text-sm">{x.label}</div><div className="text-xs text-gray-400 mt-1">{x.category} · {x.required?'Obligatoire':'Optionnel'}</div></div><select value={x.status} onChange={e=>run(()=>updateCompletionItem(x.id,projectId,e.target.value))} className="input h-8 text-xs"><option value="pending">Manquant</option><option value="available">Disponible</option><option value="approved">Validé</option><option value="not_applicable">N/A</option></select></div></div>)}</section>}

    <Modal open={modal==='mdr'} onClose={()=>setModal(null)} title="Ajouter au Document Register"><form action={async fd=>{const r=await createDocumentRegisterItem(fd); if(r.error)toast.error(r.error); else location.reload()}} className="grid grid-cols-2 gap-3"><input type="hidden" name="projectId" value={projectId}/><Field n="documentCode" l="N° document *"/><Field n="title" l="Titre *"/><Field n="category" l="Catégorie"/><Field n="revision" l="Révision" p="00"/><Field n="plannedDate" l="Soumission prévue" t="date"/><Field n="responsible" l="Responsable"/><Field n="remarks" l="Remarques" c="col-span-2"/><button className="btn btn-primary col-span-2">Ajouter</button></form></Modal>
    <Modal open={modal==='equipment'} onClose={()=>setModal(null)} title="Ajouter un équipement"><form action={async fd=>{const r=await createEquipmentItem(fd); if(r.error)toast.error(r.error); else location.reload()}} className="grid grid-cols-2 gap-3"><input type="hidden" name="projectId" value={projectId}/><Field n="itemNo" l="Item"/><Field n="tagNo" l="Tag"/><Field n="description" l="Description *" c="col-span-2"/><Field n="manufacturer" l="Fabricant"/><Field n="model" l="Modèle"/><Field n="quantity" l="Quantité" t="number" p="1"/><Field n="rating" l="Rating"/><Field n="inputSpec" l="Entrée"/><Field n="outputSpec" l="Sortie"/><Field n="serialNo" l="N° série"/><Field n="remarks" l="Remarques"/><button className="btn btn-primary col-span-2">Ajouter</button></form></Modal>
    <Modal open={modal==='nameplate'} onClose={()=>setModal(null)} title="Ajouter une plaque signalétique"><form action={async fd=>{const r=await createNameplateItem(fd); if(r.error)toast.error(r.error); else location.reload()}} className="grid grid-cols-2 gap-3"><input type="hidden" name="projectId" value={projectId}/><Field n="tagNo" l="Tag"/><Field n="equipment" l="Équipement *"/><Field n="manufacturer" l="Fabricant"/><Field n="model" l="Modèle"/><Field n="serialNo" l="N° série"/><Field n="rating" l="Rating"/><Field n="inputData" l="Entrée"/><Field n="outputData" l="Sortie"/><Field n="protectionIp" l="Indice IP"/><Field n="frequency" l="Fréquence"/><Field n="manufactureYear" l="Année fabrication" t="number"/><Field n="remarks" l="Remarques"/><button className="btn btn-primary col-span-2">Ajouter</button></form></Modal>
  </div>
}

function Field({n,l,t='text',p='',c=''}:{n:string;l:string;t?:string;p?:string;c?:string}){return <label className={`text-sm ${c}`}><span className="block text-gray-600 mb-1">{l}</span><input name={n} type={t} placeholder={p} className="input w-full"/></label>}
