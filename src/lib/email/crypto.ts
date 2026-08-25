import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function key() {
  const raw = process.env.EMAIL_TOKEN_ENCRYPTION_KEY
  if (!raw) throw new Error('EMAIL_TOKEN_ENCRYPTION_KEY absent')
  const decoded = Buffer.from(raw, 'base64')
  if (decoded.length !== 32) throw new Error('EMAIL_TOKEN_ENCRYPTION_KEY doit contenir 32 octets en base64')
  return decoded
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.')
}

export function decryptSecret(value: string) {
  const [iv, tag, encrypted] = value.split('.').map(part => Buffer.from(part, 'base64url'))
  if (!iv || !tag || !encrypted) throw new Error('Secret chiffré invalide')
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
