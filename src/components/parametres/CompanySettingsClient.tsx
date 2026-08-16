'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, CreditCard, FileText, Save } from 'lucide-react'
import { FormGrid, FormSection } from '@/components/ui/form/Fields'
import { updateCompanySettingsAction, type CompanySettingsData } from '@/lib/actions/settings'

interface Props { settings: Record<string, unknown> }

export default function CompanySettingsClient({ settings }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [f, setF] = useState<CompanySettingsData>({
    company_name:          String(settings.company_name ?? 'Invest Mentor Énergie'),
    company_tagline:       String(settings.company_tagline ?? 'Hub Énergétique Turquie — Afrique'),
    address:               String(settings.address ?? 'Istanbul, Turquie'),
    website:               String(settings.website ?? ''),
    email_principal:       String(settings.email_principal ?? ''),
    email_commercial:      String(settings.email_commercial ?? ''),
    phone_principal:       String(settings.phone_principal ?? ''),
    phone_whatsapp:        String(settings.phone_whatsapp ?? ''),
    bank_name:             String(settings.bank_name ?? ''),
    bank_iban:             String(settings.bank_iban ?? ''),
    bank_swift:            String(settings.bank_swift ?? ''),
    bank_account:          String(settings.bank_account ?? ''),
    bank_address:          String(settings.bank_address ?? ''),
    bank_currency:         String(settings.bank_currency ?? 'USD'),
    default_currency:      String(settings.default_currency ?? 'USD'),
    default_incoterm:      String(settings.default_incoterm ?? 'DAP'),
    default_payment_terms: String(settings.default_payment_terms ?? ''),
    default_warranty:      String(settings.default_warranty ?? ''),
    default_delivery:      String(settings.default_delivery ?? ''),
    default_validity_days: Number(settings.default_validity_days ?? 30),
    pdf_footer_text:       String(settings.pdf_footer_text ?? ''),
    pdf_intro_text:        String(settings.pdf_intro_text ?? ''),
  })

  const up = (k: keyof CompanySettingsData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF(prev => ({ ...prev, [k]: e.target.value }))

  async function handleSave() {
    setSaving(true)
    const r = await updateCompanySettingsAction(f)
    setSaving(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Paramètres entreprise sauvegardés')
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Paramètres entreprise</h1>
          <p className="page-subtitle">Informations utilisées dans les PDF et documents</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {/* Identité */}
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <Building2 className="w-5 h-5 text-navy-900" />
          <h2 className="text-sm font-semibold text-navy-900">Identité de l'entreprise</h2>
        </div>
        <div className="space-y-4">
          <FormGrid cols={2}>
            <div>
              <label className="label">Nom de la société</label>
              <input className="input" value={f.company_name ?? ''} onChange={up('company_name')} />
            </div>
            <div>
              <label className="label">Tagline / Slogan</label>
              <input className="input" value={f.company_tagline ?? ''} onChange={up('company_tagline')} />
            </div>
          </FormGrid>
          <div>
            <label className="label">Adresse complète</label>
            <input className="input" value={f.address ?? ''} onChange={up('address')} placeholder="Istanbul, Turquie" />
          </div>
          <FormGrid cols={2}>
            <div>
              <label className="label">Site web</label>
              <input className="input" value={f.website ?? ''} onChange={up('website')} placeholder="www.investmentor-energie.com" />
            </div>
            <div>
              <label className="label">Email principal</label>
              <input type="email" className="input" value={f.email_principal ?? ''} onChange={up('email_principal')} />
            </div>
          </FormGrid>
          <FormGrid cols={2}>
            <div>
              <label className="label">Email commercial</label>
              <input type="email" className="input" value={f.email_commercial ?? ''} onChange={up('email_commercial')} />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={f.phone_principal ?? ''} onChange={up('phone_principal')} />
            </div>
          </FormGrid>
        </div>
      </div>

      {/* Infos bancaires */}
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <CreditCard className="w-5 h-5 text-navy-900" />
          <h2 className="text-sm font-semibold text-navy-900">Informations bancaires (pour proformas)</h2>
        </div>
        <div className="space-y-4">
          <FormGrid cols={2}>
            <div>
              <label className="label">Nom de la banque</label>
              <input className="input" value={f.bank_name ?? ''} onChange={up('bank_name')} placeholder="ex: Ziraat Bankası" />
            </div>
            <div>
              <label className="label">Devise du compte</label>
              <select className="input" value={f.bank_currency ?? 'USD'} onChange={up('bank_currency')}>
                {['USD','EUR','TRY','XOF'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </FormGrid>
          <FormGrid cols={2}>
            <div>
              <label className="label">IBAN</label>
              <input className="input font-mono text-sm" value={f.bank_iban ?? ''} onChange={up('bank_iban')} placeholder="TR00 0000 0000 0000 0000 0000 00" />
            </div>
            <div>
              <label className="label">Code SWIFT / BIC</label>
              <input className="input font-mono text-sm" value={f.bank_swift ?? ''} onChange={up('bank_swift')} placeholder="TCZBTR2A" />
            </div>
          </FormGrid>
          <div>
            <label className="label">Adresse de la banque</label>
            <input className="input" value={f.bank_address ?? ''} onChange={up('bank_address')} />
          </div>
        </div>
      </div>

      {/* Conditions commerciales par défaut */}
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <FileText className="w-5 h-5 text-navy-900" />
          <h2 className="text-sm font-semibold text-navy-900">Conditions commerciales par défaut</h2>
        </div>
        <div className="space-y-4">
          <FormGrid cols={3}>
            <div>
              <label className="label">Devise par défaut</label>
              <select className="input" value={f.default_currency ?? 'USD'} onChange={up('default_currency')}>
                {['USD','EUR','TRY','XOF'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Incoterm par défaut</label>
              <select className="input" value={f.default_incoterm ?? 'DAP'} onChange={up('default_incoterm')}>
                {['DAP','DDP','FOB','CIF','CFR','EXW','FCA'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Validité offre (jours)</label>
              <input type="number" className="input" value={f.default_validity_days ?? 30}
                onChange={e => setF(p => ({ ...p, default_validity_days: Number(e.target.value) || 30 }))} />
            </div>
          </FormGrid>
          <div>
            <label className="label">Conditions de paiement par défaut</label>
            <input className="input" value={f.default_payment_terms ?? ''} onChange={up('default_payment_terms')} />
          </div>
          <div>
            <label className="label">Garantie par défaut</label>
            <input className="input" value={f.default_warranty ?? ''} onChange={up('default_warranty')} />
          </div>
          <div>
            <label className="label">Délai de livraison par défaut</label>
            <input className="input" value={f.default_delivery ?? ''} onChange={up('default_delivery')} />
          </div>
          <div>
            <label className="label">Texte d'introduction PDF (optionnel)</label>
            <textarea className="input min-h-[70px] resize-none text-sm" value={f.pdf_intro_text ?? ''} onChange={up('pdf_intro_text')}
              placeholder="Madame, Monsieur, Nous avons le plaisir de vous soumettre notre offre..." />
          </div>
          <div>
            <label className="label">Pied de page PDF</label>
            <input className="input" value={f.pdf_footer_text ?? ''} onChange={up('pdf_footer_text')} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder tous les paramètres'}
        </button>
      </div>
    </div>
  )
}
