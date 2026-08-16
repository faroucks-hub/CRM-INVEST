// ── Export CSV ────────────────────────────────────────────────────

export function exportToCSV(
  data: Record<string, unknown>[],
  columns: { key: string; header: string; format?: (v: unknown) => string }[],
  filename: string
) {
  if (!data.length) return

  const BOM = '\uFEFF'  // UTF-8 BOM pour Excel
  const headers = columns.map(c => `"${c.header}"`).join(';')
  const rows = data.map(row =>
    columns.map(col => {
      const val = row[col.key]
      const formatted = col.format ? col.format(val) : (val ?? '')
      return `"${String(formatted).replace(/"/g, '""')}"`
    }).join(';')
  )

  const csv = BOM + [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ── Import CSV ────────────────────────────────────────────────────

export function parseCSV(
  file: File,
  requiredHeaders: string[]
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const text = e.target?.result as string
        const lines = text.replace(/\r/g, '').split('\n').filter(Boolean)
        if (!lines.length) throw new Error('Fichier vide')

        // Détecte le séparateur
        const sep = lines[0].includes(';') ? ';' : ','
        const headers = lines[0].split(sep).map(h =>
          h.replace(/^["']|["']$/g, '').trim()
        )

        const missing = requiredHeaders.filter(h => !headers.includes(h))
        if (missing.length) {
          throw new Error(`Colonnes manquantes : ${missing.join(', ')}`)
        }

        const rows = lines.slice(1).map(line => {
          const vals = line.split(sep).map(v => v.replace(/^["']|["']$/g, '').trim())
          return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
        })

        resolve({ headers, rows })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Erreur de lecture'))
    reader.readAsText(file, 'utf-8')
  })
}
