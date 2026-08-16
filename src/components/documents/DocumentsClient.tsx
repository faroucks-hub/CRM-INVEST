'use client'

import { useState, useMemo, useRef } from 'react'
import { Upload, Link, Download, Trash2, ExternalLink, Search, FileText, Filter } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/modal/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/modal/ConfirmDialog'
import { uploadDocumentAction, addExternalLinkAction, deleteDocumentAction, getDocumentUrlAction } from '@/lib/actions/documents_v2'
import { formatDate, formatFileSize } from '@/lib/utils'
import { DOC_TYPE_LABELS, DOC_TYPE_ICONS, type DocType } from '@/types/sprint4'

interface Props {
  documents:  Record<string,unknown>[]
  clients:    {id:string;company_name:string}[]
  projects:   {id:string;reference:string;name:string}[]
  quotations: {id:string;number:string}[]
  proformas:  {id:string;number:string}[]
  role:string; isAdminOrLead:boolean; currentUserId:string;
}

export default function DocumentsClient({ documents, clients, projects, quotations, proformas, role, isAdminOrLead, currentUserId }: Props) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [linkOpen,   setLinkOpen]   = useState(false)
  const [deleteTarget, setDelete]   = useState<Record<string,unknown>|null>(null)
  const [deleting,  setDeleting]    = useState(false)
  const [search,    setSearch]      = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterProject, setFilterProject] = useState('')

  const filtered = useMemo(() => documents.filter(d => {
    if (filterType    && d.doc_type   !== filterType)    return false
    if (filterClient  && d.client_id  !== filterClient)  return false
    if (filterProject && d.project_id !== filterProject) return false
    if (search) {
      const q = search.toLowerCase()
      return String(d.name??'').toLowerCase().includes(q) ||
        String(d.description??'').toLowerCase().includes(q)
    }
    return true
  }), [documents, filterType, filterClient, filterProject, search])

  async function handleDownload(doc: Record<string,unknown>) {
    if (doc.source_type === 'external_link') {
      window.open(String(doc.external_url), '_blank')
      return
    }
    if (!doc.file_path) { toast.error('Fichier introuvable'); return }
    const url = await getDocumentUrlAction(String(doc.file_path))
    if (!url) { toast.error('Impossible de générer le lien'); return }
    window.open(url, '_blank')
  }

  async function handleDelete() {
    if (!deleteTarget) return; setDeleting(true)
    const r = await deleteDocumentAction(
      String(deleteTarget.id),
      deleteTarget.file_path ? String(deleteTarget.file_path) : undefined
    )
    setDeleting(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Document supprimé'); setDelete(null)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">{documents.length} document{documents.length>1?'s':''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLinkOpen(true)} className="btn btn-outline btn-sm">
            <Link className="w-3.5 h-3.5" /> Lien externe
          </button>
          <button onClick={() => setUploadOpen(true)} className="btn btn-primary btn-sm">
            <Upload className="w-3.5 h-3.5" /> Upload fichier
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..."
            className="input pl-9 h-9 text-sm" />
        </div>
        <select className="input w-auto text-sm h-9" value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(DOC_TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input w-auto text-sm h-9" value={filterClient} onChange={e=>setFilterClient(e.target.value)}>
          <option value="">Tous les clients</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <select className="input w-auto text-sm h-9" value={filterProject} onChange={e=>setFilterProject(e.target.value)}>
          <option value="">Tous les projets</option>
          {projects.map(p=><option key={p.id} value={p.id}>{p.reference}</option>)}
        </select>
        {(filterType||filterClient||filterProject||search) &&
          <button onClick={()=>{setFilterType('');setFilterClient('');setFilterProject('');setSearch('')}} className="text-xs text-gray-400 hover:text-gray-700">× Effacer</button>}
      </div>

      {/* Documents grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <div className="text-sm font-medium text-gray-400">Aucun document</div>
          <div className="text-xs text-gray-300 mt-1">Uploadez des fichiers ou ajoutez des liens Google Drive</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(doc => {
            const dtype = String(doc.doc_type??'autre') as DocType
            const client = doc.clients as Record<string,unknown>|null
            const project = doc.projets_v2 as Record<string,unknown>|null
            const uploader = doc.users_profiles as Record<string,unknown>|null
            const isExternal = doc.source_type === 'external_link'

            return (
              <div key={String(doc.id)} className="card hover:shadow-md transition-all hover:border-gray-300 group">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-navy-900/5 flex items-center justify-center text-xl flex-shrink-0">
                      {DOC_TYPE_ICONS[dtype]}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDownload(doc)}
                        className="btn-icon p-1.5" title={isExternal ? 'Ouvrir' : 'Télécharger'}>
                        {isExternal ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                      </button>
                      {isAdminOrLead && (
                        <button onClick={() => setDelete(doc)}
                          className="btn-icon p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-navy-900 truncate mb-1" title={String(doc.name)}>
                    {String(doc.name)}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <StatusBadge label={DOC_TYPE_LABELS[dtype]??dtype} color="bg-navy-900/5 text-navy-900" size="xs" />
                    {isExternal && <StatusBadge label="Lien ext." color="bg-blue-50 text-blue-600" size="xs" />}
                    {Boolean(doc.is_confidential) && <StatusBadge label="Confidentiel" color="bg-amber-50 text-amber-600" size="xs" />}
                  </div>
                  {Boolean(doc.description) && (
                    <div className="text-xs text-gray-400 truncate mb-2">{String(doc.description)}</div>
                  )}
                  <div className="space-y-0.5 text-2xs text-gray-400">
                    {Boolean(client?.company_name) && <div>Client : {String(client?.company_name)}</div>}
                    {Boolean(project?.reference) && <div>Projet : {String(project?.reference)}</div>}
                    {Boolean(doc.file_size) && <div>Taille : {formatFileSize(Number(doc.file_size))}</div>}
                    <div>{formatDate(String(doc.created_at))} · {uploader?.full_name as string ?? '—'}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)}
        clients={clients} projects={projects} quotations={quotations} proformas={proformas} />

      {/* External Link Modal */}
      <ExternalLinkModal open={linkOpen} onClose={() => setLinkOpen(false)}
        clients={clients} projects={projects} quotations={quotations} proformas={proformas} />

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDelete(null)} onConfirm={handleDelete}
        title="Supprimer ce document ?" message={`"${deleteTarget?.name}" sera supprimé définitivement.`}
        confirmLabel="Supprimer" loading={deleting} danger />
    </div>
  )
}

// ── Upload Modal ──────────────────────────────────────────────────
function UploadModal({ open, onClose, clients, projects, quotations, proformas }: {
  open:boolean; onClose:()=>void;
  clients:{id:string;company_name:string}[];
  projects:{id:string;reference:string;name:string}[];
  quotations:{id:string;number:string}[];
  proformas:{id:string;number:string}[];
}) {
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File|null>(null)
  const [f, setF] = useState({ name:'', doc_type:'autre', description:'', client_id:'', project_id:'', quotation_id:'', proforma_id:'', is_confidential:'false' })
  const up = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setF(prev=>({...prev,[k]:e.target.value}))
  const fileRef = useRef<HTMLInputElement>(null)
  const { useRouter } = require('next/navigation')
  const router = useRouter()

  async function handleUpload() {
    if (!file) { toast.error('Sélectionnez un fichier'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', f.name || file.name)
    fd.append('doc_type', f.doc_type)
    fd.append('description', f.description)
    fd.append('client_id', f.client_id)
    fd.append('project_id', f.project_id)
    fd.append('quotation_id', f.quotation_id)
    fd.append('proforma_id', f.proforma_id)
    fd.append('is_confidential', f.is_confidential)
    const r = await uploadDocumentAction(fd)
    setUploading(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Document uploadé')
    onClose(); router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload de document" size="md">
      <div className="p-6 space-y-4">
        {/* File drop zone */}
        <div
          className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-gold-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" className="hidden" onChange={e => {
            const f = e.target.files?.[0]; if(f){setFile(f);setF(prev=>({...prev,name:f.name}))}
          }} />
          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          {file ? (
            <div><div className="text-sm font-medium text-navy-900">{file.name}</div>
            <div className="text-xs text-gray-400">{formatFileSize(file.size)}</div></div>
          ) : (
            <div><div className="text-sm text-gray-500">Cliquer pour sélectionner un fichier</div>
            <div className="text-xs text-gray-400 mt-1">Max 50 Mo · PDF, Word, Excel, Image...</div></div>
          )}
        </div>

        <div><label className="label">Nom du document</label>
          <input className="input" value={f.name} onChange={up('name')} placeholder="Nom lisible pour ce document"/></div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Type</label>
            <select className="input" value={f.doc_type} onChange={up('doc_type')}>
              {Object.entries(DOC_TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select></div>
          <div><label className="label">Client</label>
            <select className="input" value={f.client_id} onChange={up('client_id')}>
              <option value="">— Aucun —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Projet</label>
            <select className="input" value={f.project_id} onChange={up('project_id')}>
              <option value="">— Aucun —</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.reference}</option>)}
            </select></div>
          <div><label className="label">Proforma</label>
            <select className="input" value={f.proforma_id} onChange={up('proforma_id')}>
              <option value="">— Aucune —</option>
              {proformas.map(p=><option key={p.id} value={p.id}>{p.number}</option>)}
            </select></div>
        </div>

        <div><label className="label">Description</label>
          <input className="input" value={f.description} onChange={up('description')} placeholder="Description optionnelle"/></div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={f.is_confidential==='true'} onChange={e=>setF(prev=>({...prev,is_confidential:e.target.checked?'true':'false'}))} className="w-4 h-4 accent-navy-900"/>
          <span className="text-sm text-gray-700">Document confidentiel (admin/lead_team uniquement)</span>
        </label>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn btn-outline">Annuler</button>
          <button onClick={handleUpload} disabled={uploading||!file} className="btn btn-primary">
            <Upload className="w-3.5 h-3.5" />
            {uploading?'Upload en cours...':'Uploader'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── External Link Modal ───────────────────────────────────────────
function ExternalLinkModal({ open, onClose, clients, projects, quotations, proformas }: {
  open:boolean; onClose:()=>void;
  clients:{id:string;company_name:string}[];
  projects:{id:string;reference:string;name:string}[];
  quotations:{id:string;number:string}[];
  proformas:{id:string;number:string}[];
}) {
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ name:'', doc_type:'autre', description:'', external_url:'', client_id:'', project_id:'', quotation_id:'', proforma_id:'' })
  const up = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setF(prev=>({...prev,[k]:e.target.value}))
  const { useRouter } = require('next/navigation')
  const router = useRouter()

  async function handleSave() {
    if (!f.name || !f.external_url) { toast.error('Nom et URL requis'); return }
    setSaving(true)
    const r = await addExternalLinkAction({
      name:f.name, doc_type:f.doc_type, description:f.description||undefined,
      external_url:f.external_url, source_type:'external_link',
      client_id:f.client_id||undefined, project_id:f.project_id||undefined,
      quotation_id:f.quotation_id||undefined, proforma_id:f.proforma_id||undefined,
    })
    setSaving(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Lien externe ajouté')
    onClose(); router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajouter un lien externe" subtitle="Google Drive, OneDrive, SharePoint..." size="md">
      <div className="p-6 space-y-4">
        <div><label className="label">Nom du document <span className="text-red-400">*</span></label>
          <input className="input" value={f.name} onChange={up('name')} placeholder="ex: SLD Banque Abidjan v2.pdf"/></div>

        <div><label className="label">URL du lien <span className="text-red-400">*</span></label>
          <input className="input" value={f.external_url} onChange={up('external_url')} placeholder="https://drive.google.com/file/d/..."/></div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Type</label>
            <select className="input" value={f.doc_type} onChange={up('doc_type')}>
              {Object.entries(DOC_TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select></div>
          <div><label className="label">Client</label>
            <select className="input" value={f.client_id} onChange={up('client_id')}>
              <option value="">— Aucun —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Projet</label>
            <select className="input" value={f.project_id} onChange={up('project_id')}>
              <option value="">— Aucun —</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.reference}</option>)}
            </select></div>
          <div><label className="label">Quotation</label>
            <select className="input" value={f.quotation_id} onChange={up('quotation_id')}>
              <option value="">— Aucune —</option>
              {quotations.map(q=><option key={q.id} value={q.id}>{q.number}</option>)}
            </select></div>
        </div>

        <div><label className="label">Description</label>
          <input className="input" value={f.description} onChange={up('description')} placeholder="Description optionnelle"/></div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn btn-outline">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            <Link className="w-3.5 h-3.5" />
            {saving?'Enregistrement...':'Ajouter le lien'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
