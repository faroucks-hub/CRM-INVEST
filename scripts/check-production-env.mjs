const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
]

const optional = ['OPENAI_API_KEY', 'SUPABASE_DB_URL']
const placeholderPattern = /(VOTRE_|XXXX|example\.supabase|localhost|sk-proj-X)/i
const errors = []

for (const name of required) {
  const value = process.env[name]?.trim()
  if (!value) errors.push(`${name} absent`)
  else if (placeholderPattern.test(value)) errors.push(`${name} contient une valeur d’exemple`)
}

for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_APP_URL']) {
  const value = process.env[name]
  if (value && !value.startsWith('https://')) errors.push(`${name} doit utiliser HTTPS`)
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('NEXT_PUBLIC_')) {
  errors.push('SUPABASE_SERVICE_ROLE_KEY ne doit jamais être publique')
}

if (errors.length) {
  console.error('PRODUCTION_ENV_INVALID')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

const missingOptional = optional.filter(name => !process.env[name]?.trim())
console.log('PRODUCTION_ENV_OK')
if (missingOptional.length) {
  console.log(`Fonctions optionnelles non configurées : ${missingOptional.join(', ')}`)
}
