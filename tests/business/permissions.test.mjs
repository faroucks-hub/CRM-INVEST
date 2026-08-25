import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('le commercial ne peut pas ouvrir le controle d affaires', () => {
  const permissions = read('src/lib/auth/permissions.ts')
  assert.match(permissions, /'\/controle-affaires': \['admin', 'lead_team'\]/)
  assert.doesNotMatch(permissions, /'\/controle-affaires': \[[^\]]*'commercial'/)
})

test('le lead peut controler les couts et les marges', () => {
  const permissions = read('src/lib/auth/permissions.ts')
  const lead = permissions.match(/lead_team:\s*\{([\s\S]*?)\n\s*\},/)
  assert.ok(lead)
  assert.match(lead[1], /purchaseCosts:\s*true/)
  assert.match(lead[1], /margins:\s*true/)
})

test('les suppressions critiques exigent le role administrateur', () => {
  for (const file of [
    'src/lib/actions/projects.ts',
    'src/lib/actions/quotations.ts',
    'src/lib/actions/proformas.ts',
    'src/lib/actions/payments.ts',
  ]) {
    assert.match(read(file), /if \(!ctx\.isAdmin\)/, file)
  }
})

test('le menu masque le controle d affaires au commercial', () => {
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.match(sidebar, /href:'\/controle-affaires'[\s\S]*?roles:\['admin','lead_team'\]/)
})

test('la gestion des produits du site est reservee aux administrateurs et leads', () => {
  const permissions = read('src/lib/auth/permissions.ts')
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.match(permissions, /'\/catalogue-produits': \['admin', 'lead_team'\]/)
  assert.doesNotMatch(permissions, /'\/catalogue-produits': \[[^\]]*'commercial'/)
  assert.match(sidebar, /href:'\/catalogue-produits'[\s\S]*?roles:\['admin','lead_team'\]/)
})

test('les statuts publics du catalogue sont limites a la liste validee', () => {
  const statuses = read('src/lib/catalogue-products.ts')
  const action = read('src/lib/actions/catalogue-products.ts')
  for (const status of ['active', 'new', 'updated', 'hot', 'custom', 'on_request', 'legacy', 'discontinued']) {
    assert.match(statuses, new RegExp(`'${status}'`))
  }
  assert.match(action, /if \(!ctx\.isPrivileged\) return roleDenied\(\)/)
  assert.match(action, /isCatalogueProductStatus\(input\.status\)/)
})

test('les permissions configurables restent plafonnees par les roles de securite', () => {
  const modules = read('src/lib/auth/module-access.ts')
  const action = read('src/lib/actions/access-settings.ts')
  assert.match(modules, /key:'catalogue_products'[\s\S]*?baselineRoles:\['admin','lead_team'\]/)
  assert.match(modules, /key:'deal_control'[\s\S]*?baselineRoles:\['admin','lead_team'\]/)
  assert.match(action, /enabled && !baselineAllows\(role, key\)/)
  assert.match(action, /actor\?\.role !== 'admin'/)
})

test('le layout applique les permissions aux routes et au menu', () => {
  const layout = read('src/app/(dashboard)/layout.tsx')
  const permissions = read('src/lib/auth/permissions.ts')
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.match(layout, /role_module_permissions/)
  assert.match(layout, /canAccessRoute\([\s\S]*allowedModules/)
  assert.match(permissions, /allowedModules\.includes\(moduleEntry\[1\]\)/)
  assert.match(sidebar, /allowedModules\.includes\(item\.moduleKey\)/)
})

test('les actions principales verifient les modules desactives', () => {
  const expected = {
    clients: 'clients', opportunities: 'opportunities', quotations: 'quotations',
    proformas: 'proformas', projects: 'projects', payments: 'payments',
  }
  for (const [file, moduleKey] of Object.entries(expected)) {
    assert.match(read(`src/lib/actions/${file}.ts`), new RegExp(`getBaseActionContext\\('${moduleKey}'\\)`), file)
  }
  assert.match(read('src/lib/actions/catalogue-products.ts'), /getActionContext\('catalogue_products'\)/)
})

test('la messagerie est individuelle et disponible aux trois roles', () => {
  const permissions = read('src/lib/auth/permissions.ts')
  const modules = read('src/lib/auth/module-access.ts')
  const migration = read('supabase/migrations/033_gmail_individual_mailboxes.sql')
  assert.match(permissions, /'\/messagerie': \['admin', 'lead_team', 'commercial'\]/)
  assert.match(modules, /key:'messaging'[\s\S]*?baselineRoles:\['admin','lead_team','commercial'\]/)
  assert.match(migration, /user_id = auth\.uid\(\)/)
  assert.doesNotMatch(migration, /mail\.google\.com/)
})

test('les jetons Gmail sont chiffres et les messages restent chez Google', () => {
  const crypto = read('src/lib/email/crypto.ts')
  const gmail = read('src/lib/email/gmail.ts')
  const migration = read('supabase/migrations/033_gmail_individual_mailboxes.sql')
  assert.match(crypto, /aes-256-gcm/)
  assert.match(gmail, /gmail\.modify/)
  assert.match(migration, /access_token_encrypted/)
  assert.doesNotMatch(migration, /\bbody\b/)
})
