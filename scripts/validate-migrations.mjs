import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const db = new PGlite()

await db.exec(`
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE SCHEMA storage;
  CREATE TABLE auth.users (
    id uuid PRIMARY KEY,
    email text,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
  );
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  CREATE TABLE storage.buckets (
    id text PRIMARY KEY,
    name text,
    public boolean DEFAULT false,
    file_size_limit bigint
  );
  CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bucket_id text,
    name text,
    owner uuid
  );
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
`)

const migrationDir = path.join(root, 'supabase', 'migrations')
const files = fs.readdirSync(migrationDir)
  .filter(file => file.endsWith('.sql'))
  .sort()

for (const file of files) {
  let sql = fs.readFileSync(path.join(migrationDir, file), 'utf8')
  sql = sql
    .replace(/^CREATE EXTENSION[^;]+;.*$/gim, '')
    .replace(/uuid_generate_v4\(\)/gi, 'gen_random_uuid()')
    .replace(/^CREATE INDEX idx_clients_company[^;]+;$/gim, '')
  await db.exec(sql)
}

for (const file of ['002_security_checks.sql', '003_business_workflow_checks.sql']) {
  const sql = fs.readFileSync(path.join(root, 'supabase', 'verification', file), 'utf8')
  await db.exec(sql)
}

await db.close()
console.log(`MIGRATIONS_AND_VERIFICATIONS_OK ${files.length}`)
