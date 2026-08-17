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
