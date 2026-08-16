import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Aide & Documentation' }

const SECTIONS = [
  {
    id: 'clients',
    title: '👥 Comment ajouter un client',
    content: [
      { type:'step', text:'Aller dans **Clients & Prospects** dans le menu gauche.' },
      { type:'step', text:'Cliquer sur **Nouveau client** en haut à droite.' },
      { type:'step', text:'Remplir au minimum : **Nom de la société**, **Pays** et **Statut**.' },
      { type:'step', text:'Ajouter les informations de contact (nom, email, téléphone, WhatsApp).' },
      { type:'step', text:'Sélectionner le **commercial assigné** (admin/lead_team uniquement).' },
      { type:'step', text:'Cliquer sur **Créer le client**. Une référence IME-CLI-XXXX est générée automatiquement.' },
      { type:'tip', text:'Un client peut changer de statut (Prospect → Qualifié → Actif) au fil du temps.' },
    ],
  },
  {
    id: 'quotation',
    title: '📄 Comment créer une quotation (devis)',
    content: [
      { type:'step', text:'Aller dans **Quotations** puis **Nouvelle quotation**.' },
      { type:'step', text:'Sélectionner le **client** dans la liste déroulante.' },
      { type:'step', text:'Choisir la **devise** (USD, EUR, TRY, XOF) et l\'**incoterm** (DAP, FOB...).' },
      { type:'step', text:'Renseigner les conditions : délai de livraison, garantie, paiement.' },
      { type:'step', text:'Dans la section **Lignes de devis**, cliquer **Ajouter une ligne** et remplir la désignation, quantité et prix unitaire.' },
      { type:'step', text:'Cliquer sur **▼ détails** pour ajouter une description technique par ligne.' },
      { type:'step', text:'Le **total se calcule automatiquement** en temps réel.' },
      { type:'step', text:'Sauvegarder en **Brouillon**. Changer le statut en **Envoyée** après envoi au client.' },
      { type:'tip', text:'Les prix d\'achat et marges ne sont visibles que par Admin et Lead Team.' },
      { type:'warning', text:'La quotation ne contient pas d\'informations bancaires (uniquement la proforma).' },
    ],
  },
  {
    id: 'proforma',
    title: '🧾 Comment générer une proforma',
    content: [
      { type:'step', text:'Une proforma peut être créée depuis une quotation approuvée (bouton **Créer proforma** dans le menu d\'actions).' },
      { type:'step', text:'Ou manuellement dans **Proformas** → **Nouvelle proforma**.' },
      { type:'step', text:'Renseigner les **informations bancaires** : banque, IBAN, SWIFT/BIC, devise du compte.' },
      { type:'step', text:'Indiquer le **port de destination** (ex: Abidjan, Dakar...).' },
      { type:'step', text:'Cocher **Ajouter signature/cachet** si nécessaire.' },
      { type:'step', text:'Suivre le **statut paiement** (En attente → Acompte reçu → Paiement partiel → Payé).' },
      { type:'tip', text:'Indiquer la référence proforma dans les communications bancaires pour faciliter le rapprochement.' },
    ],
  },
  {
    id: 'projet',
    title: '🏗️ Comment suivre un projet',
    content: [
      { type:'step', text:'Un projet peut être créé depuis une proforma approuvée ou manuellement dans **Projets**.' },
      { type:'step', text:'Renseigner la **date de commande**, la **livraison prévue** et la **valeur du contrat**.' },
      { type:'step', text:'Cliquer sur l\'icône **Voir le workflow** (œil) pour accéder aux **15 étapes** du projet.' },
      { type:'step', text:'Pour chaque étape : définir une **deadline**, assigner un **responsable**, changer le **statut** (Non commencé → En cours → Terminé).' },
      { type:'step', text:'Si une étape est bloquée, cocher **Bloqué** et décrire la raison. Une alerte apparaît dans le dashboard.' },
      { type:'step', text:'Le **pourcentage d\'avancement** se recalcule automatiquement.' },
      { type:'tip', text:'Les projets avec une livraison dépassée apparaissent en rouge dans la liste et dans les alertes dashboard.' },
    ],
  },
  {
    id: 'calculateurs',
    title: '⚡ Comment utiliser les calculateurs',
    content: [
      { type:'step', text:'Aller dans **Calculateurs**, juste sous **Dashboard** dans le menu principal.' },
      { type:'step', text:'Choisir le type : **UPS**, **Batteries**, **Rectifier**, **Inverter**, **Frequency Converter** ou **BESS**.' },
      { type:'step', text:'Choisir **Nouveau dimensionnement** ou **Installation existante**, puis saisir manuellement les valeurs connues.' },
      { type:'step', text:'Les boutons de valeurs standards sont facultatifs : le champ accepte toujours une valeur personnalisée.' },
      { type:'step', text:'Cliquer **Sauvegarder** pour lier le calcul à un client, projet ou quotation.' },
      { type:'step', text:'Les calculs sauvegardés sont accessibles dans **Calculateurs → Historique**.' },
      { type:'step', text:'Utiliser **Export PDF** pour produire une fiche technique lisible avec les paramètres, résultats et avertissements.' },
      { type:'warning', text:'Tous les résultats sont des estimations préliminaires. Un ingénieur certifié doit valider le dimensionnement final.' },
    ],
  },
  {
    id: 'import-export',
    title: '📥 Comment importer et exporter les données',
    content: [
      { type:'step', text:'**Export CSV** : disponible dans toutes les listes (bouton Export en haut à droite). Compatible Excel avec encodage UTF-8 BOM.' },
      { type:'step', text:'**Import CSV clients** : dans la liste Clients → bouton Upload CSV. Le fichier doit contenir au minimum les colonnes : company_name, country.' },
      { type:'step', text:'**Export PDF quotation** : dans la liste Quotations → icône PDF dans les actions de chaque ligne.' },
      { type:'step', text:'**Export PDF proforma** : dans la liste Proformas → icône PDF. Inclut les informations bancaires.' },
      { type:'step', text:'**Upload documents** : dans Documents → Upload fichier. Taille max : 50 Mo par fichier.' },
      { type:'step', text:'**Lien externe** : dans Documents → Lien externe. Pour partager des fichiers Google Drive ou OneDrive.' },
      { type:'tip', text:'Les fichiers sont stockés de manière sécurisée dans Supabase Storage. Les liens de téléchargement expirent après 1 heure.' },
    ],
  },
  {
    id: 'lydie',
    title: '✨ Comment utiliser Lydie AI',
    content: [
      { type:'step', text:'Cliquer sur le **bouton doré** ✨ en bas à droite de l\'écran. Raccourci clavier : **⌘L** (Mac) / **Ctrl+L** (Windows).' },
      { type:'step', text:'Choisir parmi les **suggestions prédéfinies** ou taper directement votre question.' },
      { type:'step', text:'Lydie détecte automatiquement le **contexte** (Commercial / Technique / Projets / Dashboard).' },
      { type:'step', text:'Exemples : "Rédige une relance pour le client Banque Abidjan", "Quels projets sont en retard ?", "Explique ce calcul UPS".' },
      { type:'step', text:'Utiliser le mode **étendu** (icône agrandir) pour plus de confort sur desktop.' },
      { type:'step', text:'L\'historique complet est disponible dans **Lydie AI** dans le menu.' },
      { type:'warning', text:'Lydie AI nécessite une clé API OpenAI configurée par l\'administrateur.' },
      { type:'tip', text:'Lydie respecte vos droits : un commercial ne verra jamais de données sensibles dans les réponses.' },
    ],
  },
  {
    id: 'roles',
    title: '🔐 Rôles et permissions',
    content: [
      { type:'text', text:'IME CRM propose 3 niveaux d\'accès :' },
      { type:'table', rows:[
        ['Fonctionnalité', 'Admin', 'Lead Team', 'Commercial'],
        ['Dashboard complet', '✅', '✅', '✅ (ses données)'],
        ['Clients & Prospects', '✅', '✅', '✅ (ses clients)'],
        ['Partenaires', '✅', '✅', '❌'],
        ['Opportunités', '✅', '✅', '✅ (ses opps)'],
        ['Quotations (prix vente)', '✅', '✅', '✅'],
        ['Quotations (prix achat/marges)', '✅', '✅', '❌'],
        ['Proformas', '✅', '✅', '❌'],
        ['Projets', '✅', '✅', '✅ (ses projets)'],
        ['Paiements', '✅', '✅', '✅ (ses projets)'],
        ['Documents', '✅', '✅', '✅'],
        ['Calculateurs', '✅', '✅', '✅'],
        ['Historique calculs', '✅ (tous)', '✅ (tous)', '✅ (siens)'],
        ['Tâches', '✅ (toutes)', '✅ (toutes)', '✅ (siennes)'],
        ['Lydie AI', '✅', '✅', '✅ (données filtrées)'],
        ['Paramètres utilisateurs', '✅', '❌', '❌'],
      ]},
    ],
  },
  {
    id: 'bonnes-pratiques',
    title: '💡 Bonnes pratiques commerciales',
    content: [
      { type:'tip', text:'**Quotation → Proforma → Projet** : respectez ce flux pour une traçabilité complète.' },
      { type:'tip', text:'**Numérotation automatique** : ne modifiez jamais manuellement les références (IME-25-Q0001, etc.).' },
      { type:'tip', text:'**Statuts documents** : passez les quotations au statut "Envoyée" après envoi au client pour suivre les délais de validité.' },
      { type:'tip', text:'**Notes internes** : utilisez ce champ (visible uniquement par Admin/Lead Team) pour les informations sensibles.' },
      { type:'tip', text:'**Documents** : uploadez systématiquement les PO, confirmations et rapports FAT pour chaque projet.' },
      { type:'tip', text:'**Paiements** : enregistrez chaque acompte dès réception pour que le solde soit toujours à jour.' },
      { type:'tip', text:'**Tâches** : créez des relances avec une date limite après chaque envoi de quotation ou proforma.' },
    ],
  },
]

function ContentBlock({ item }: { item: { type:string; text?:string; rows?: string[][] } }) {
  if (item.type === 'step') return (
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full bg-navy-900/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <div className="w-1.5 h-1.5 bg-navy-900 rounded-full" />
      </div>
      <p className="text-sm text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: (item.text??'').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>') }} />
    </div>
  )
  if (item.type === 'tip') return (
    <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-lg px-3.5 py-2.5">
      <span className="text-blue-500 text-sm flex-shrink-0">💡</span>
      <p className="text-xs text-blue-800 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: (item.text??'').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>') }} />
    </div>
  )
  if (item.type === 'warning') return (
    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-lg px-3.5 py-2.5">
      <span className="text-amber-500 text-sm flex-shrink-0">⚠️</span>
      <p className="text-xs text-amber-800 leading-relaxed">{item.text}</p>
    </div>
  )
  if (item.type === 'text') return (
    <p className="text-sm text-gray-700">{item.text}</p>
  )
  if (item.type === 'table' && item.rows) {
    const [header, ...rows] = item.rows
    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-900">
              {header.map((h,i) => (
                <th key={i} className="text-left px-3 py-2 text-xs font-semibold text-gold-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row,i) => (
              <tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}>
                {row.map((cell,j) => (
                  <td key={j} className={`px-3 py-2 text-xs ${j===0?'font-medium text-gray-800':'text-gray-600 text-center'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return null
}

export default function AidePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Centre d'aide</h1>
        <p className="text-sm text-gray-400 mt-1">
          Documentation IME CRM — Invest Mentor Énergie
        </p>
      </div>

      {/* Nav rapide */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`}
            className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full
                       hover:border-navy-900/30 hover:text-navy-900 transition-colors text-gray-600">
            {s.title.split(' ').slice(0,2).join(' ')}
          </a>
        ))}
      </div>

      {/* Sections */}
      {SECTIONS.map(section => (
        <div key={section.id} id={section.id} className="card">
          <div className="card-header">
            <h2 className="text-base font-semibold text-navy-900">{section.title}</h2>
          </div>
          <div className="card-body space-y-3">
            {section.content.map((item, i) => (
              <ContentBlock key={i} item={item} />
            ))}
          </div>
        </div>
      ))}

      {/* Support */}
      <div className="card p-6 bg-navy-900/5 border-navy-900/10">
        <h3 className="text-sm font-semibold text-navy-900 mb-2">Besoin d'aide supplémentaire ?</h3>
        <p className="text-sm text-gray-500">
          Contactez l'équipe technique d'Invest Mentor Énergie ou utilisez{' '}
          <strong>Lydie AI</strong> (bouton ✨ en bas à droite) pour toute question.
        </p>
      </div>
    </div>
  )
}
