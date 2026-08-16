'use client'
import { useState } from 'react'
import { ShieldCheck, AlertTriangle, Save, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { activateTermsProfileAction, updateTermsProfileAction } from '@/lib/actions/terms'

type Row=Record<string,unknown>
const roleLabel:Record<string,string>={facilitation:'Facilitation',resale:'Revente',distribution:'Distribution',purchase:'Purchase Terms'}
export default function CommercialTermsClient({profiles}:{profiles:Row[]}){
 const router=useRouter(); const [editing,setEditing]=useState<string|null>(null); const [busy,setBusy]=useState(false)
 async function activate(id:string){setBusy(true);const fd=new FormData();fd.set('id',id);const r=await activateTermsProfileAction(fd);setBusy(false);if(r.error){toast.error(r.error);return}toast.success('Version activée');router.refresh()}
 return <div className="max-w-5xl mx-auto space-y-5">
  <div className="page-header"><div><h1 className="page-title">Conditions commerciales</h1><p className="page-subtitle">Profils versionnés FAC / RES / DIST et Purchase Terms partenaire</p></div></div>
  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3 text-sm text-amber-900"><AlertTriangle className="w-5 h-5 shrink-0"/><div><div className="font-semibold">Validation juridique obligatoire avant activation</div><p className="text-xs mt-1 text-amber-800">Les textes V1.0 fournis sont des brouillons de structure. L’activation signifie que la version peut être rattachée aux nouveaux documents. Les documents existants conservent toujours leur snapshot historique.</p></div></div>
  <div className="grid gap-4">{profiles.map(p=>{const id=String(p.id);const isEdit=editing===id;return <div key={id} className="card p-5">
   <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-navy-900"/><h2 className="text-sm font-semibold text-navy-900">{String(p.name)}</h2><span className={`text-2xs px-2 py-1 rounded-full ${p.status==='active'?'bg-green-50 text-green-700':p.status==='draft'?'bg-amber-50 text-amber-700':'bg-gray-100 text-gray-500'}`}>{String(p.status)}</span></div><div className="text-xs text-gray-400 mt-1">{String(p.code)} · {String(p.version)} · {roleLabel[String(p.commercial_role)]??String(p.commercial_role)} · {String(p.audience)==='customer'?'Client':'Partenaire'}</div></div><div className="flex gap-2">{p.status==='draft'&&<button className="btn btn-outline btn-sm" onClick={()=>setEditing(isEdit?null:id)}>{isEdit?'Fermer':'Modifier'}</button>}{p.status==='draft'&&<button disabled={busy} onClick={()=>activate(id)} className="btn btn-primary btn-sm"><CheckCircle2 className="w-3.5 h-3.5"/>Activer</button>}</div></div>
   {isEdit?<form action={async(fd)=>{setBusy(true);const r=await updateTermsProfileAction(fd);setBusy(false);if(r.error){toast.error(r.error);return}toast.success('Brouillon enregistré');setEditing(null);router.refresh()}} className="mt-4 space-y-3"><input type="hidden" name="id" value={id}/><label><span className="label">Résumé du rôle</span><textarea name="role_summary" defaultValue={String(p.role_summary??'')} className="input min-h-20 text-sm"/></label><label><span className="label">Texte maître</span><textarea name="terms_text" defaultValue={String(p.terms_text??'')} className="input min-h-48 text-sm" required/></label><div className="flex justify-end"><button disabled={busy} className="btn btn-primary" type="submit"><Save className="w-4 h-4"/>Enregistrer le brouillon</button></div></form>:<div className="mt-4"><p className="text-xs font-medium text-gray-500">Positionnement</p><p className="text-sm text-gray-700 mt-1">{String(p.role_summary??'—')}</p><details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-navy-900">Voir le texte maître</summary><div className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 border border-gray-100 p-4 text-xs leading-5 text-gray-600">{String(p.terms_text)}</div></details></div>}
  </div>})}</div>
 </div>
}
