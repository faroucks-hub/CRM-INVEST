import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const checks = []
const ok = (name, condition, detail='') => {
  checks.push({name, condition, detail})
  if (!condition) failures.push(name)
}
const exists = p => fs.existsSync(path.join(root,p))

for (let i=23;i<=30;i++) {
  const prefix=String(i).padStart(3,'0')+'_'
  const found=fs.readdirSync(path.join(root,'supabase/migrations')).some(x=>x.startsWith(prefix))
  ok(`Migration ${String(i).padStart(3,'0')}`,found)
}
ok('Route Partenaires',exists('src/app/(dashboard)/partenaires/page.tsx'))
ok('Route Achats',exists('src/app/(dashboard)/achats/page.tsx'))
ok('Route Contrôle affaires',exists('src/app/(dashboard)/controle-affaires/page.tsx'))
ok('Route Consolidation',exists('src/app/(dashboard)/consolidation/page.tsx'))
ok('Action exécution',exists('src/lib/actions/execution-control.ts'))
ok('Aucun .env versionné',!fs.existsSync(path.join(root,'.env')) && !fs.existsSync(path.join(root,'.env.local')))

const terms=fs.readFileSync(path.join(root,'supabase/migrations/025_contractual_framework.sql'),'utf8')
ok('Conditions contractuelles toujours identifiées DRAFT avant validation juridique',terms.includes('LEGAL REVIEW REQUIRED'))
const actions=fs.readFileSync(path.join(root,'src/app/(dashboard)/achats/actions.ts'),'utf8')
ok('Sélection offre isolée par RFQ',actions.includes("eq('rfq_id',q.rfq_id)"))
const execution=fs.readFileSync(path.join(root,'src/lib/actions/execution-control.ts'),'utf8')
ok('Clôture serveur protégée',execution.includes("project_closure_status === 'closed'") && execution.includes('Clôture impossible'))

for (const c of checks) console.log(`${c.condition?'PASS':'FAIL'}  ${c.name}${c.detail?' — '+c.detail:''}`)
if (failures.length) { console.error(`\n${failures.length} échec(s): ${failures.join(', ')}`); process.exit(1) }
console.log(`\n${checks.length} contrôles statiques réussis.`)
