import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucket = 'project-documents'

if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
const root = path.resolve(
  process.env.IME_BACKUP_DIR || 'backups',
  'storage',
  timestamp,
  bucket,
)
let downloaded = 0

function safeSegment(value) {
  if (!value || value === '.' || value === '..' || value.includes('/') || value.includes('\\')) {
    throw new Error(`Unsafe storage path segment: ${value}`)
  }
  return value
}

async function walk(prefix = '') {
  let offset = 0
  const limit = 1000

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw error
    const entries = data ?? []

    for (const entry of entries) {
      const name = safeSegment(entry.name)
      const objectPath = prefix ? `${prefix}/${name}` : name
      if (entry.id === null) {
        await walk(objectPath)
        continue
      }

      const { data: blob, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(objectPath)
      if (downloadError) throw downloadError

      const destination = path.join(root, ...objectPath.split('/').map(safeSegment))
      await mkdir(path.dirname(destination), { recursive: true })
      await writeFile(destination, Buffer.from(await blob.arrayBuffer()))
      downloaded += 1
    }

    if (entries.length < limit) break
    offset += limit
  }
}

await walk()
console.log(`STORAGE_BACKUP_OK ${downloaded} files ${root}`)
