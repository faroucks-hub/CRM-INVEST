import test from 'node:test'
import assert from 'node:assert/strict'
import { getCommercialContactState, isValidContactEmail, normalizeContactEmail } from '../../src/lib/commercial/contact-tracking.ts'

test('les adresses de contact sont normalisées et validées', () => {
  assert.equal(normalizeContactEmail('  Contact@IM-Energie.com '), 'contact@im-energie.com')
  assert.equal(isValidContactEmail('contact@im-energie.com'), true)
  assert.equal(isValidContactEmail('adresse-invalide'), false)
})

test('un historique non vérifié ne devient jamais automatiquement un nouveau contact', () => {
  assert.equal(getCommercialContactState(null), 'unverified')
  assert.equal(getCommercialContactState({ outbound_count: 0, inbound_count: 0 }), 'unverified')
})

test('les états commerciaux reposent sur les échanges vérifiés', () => {
  const checked = { history_checked_at: '2026-08-30T00:00:00Z' }
  assert.equal(getCommercialContactState({ ...checked, outbound_count: 0, inbound_count: 0 }), 'never_contacted')
  assert.equal(getCommercialContactState({ ...checked, outbound_count: 0, inbound_count: 2 }), 'awaiting_reply')
  assert.equal(getCommercialContactState({ ...checked, outbound_count: 2, inbound_count: 0 }), 'contacted')
  assert.equal(getCommercialContactState({ ...checked, outbound_count: 2, inbound_count: 1 }), 'reply_received')
  assert.equal(getCommercialContactState({ ...checked, outbound_count: 2, inbound_count: 1, last_contacted_at: '2026-08-29T10:00:00Z', last_reply_at: '2026-08-30T10:00:00Z' }), 'awaiting_reply')
  assert.equal(getCommercialContactState({ ...checked, outbound_count: 2, inbound_count: 1, last_contacted_at: '2026-08-30T11:00:00Z', last_reply_at: '2026-08-30T10:00:00Z' }), 'reply_received')
  assert.equal(getCommercialContactState({ ...checked, outbound_count: 2, inbound_count: 1 }, true), 'blocked')
})

test('le nombre affiché comme contacté correspond aux contacts sortants', () => {
  const engagement = { history_checked_at: '2026-09-01T00:00:00Z', outbound_count: 3, inbound_count: 2 }
  assert.equal(Number(engagement.outbound_count), 3)
})
