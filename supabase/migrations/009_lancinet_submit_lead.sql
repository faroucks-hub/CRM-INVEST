-- ============================================================================
-- 009_lancinet_submit_lead.sql
-- Lancinet — Sécurisation du pipeline de leads (Phase 1)
-- ÉTAT : déjà appliqué en base via SQL Editor. Ce fichier est le REGISTRE
--        (reconstruction idempotente, rejouable sans erreur).
-- ============================================================================

-- 1) Table source. Sur une base déjà connectée au site, CREATE IF NOT EXISTS
-- conserve la table et les données. Sur une base neuve, il rend la chaîne de
-- migrations autonome.
create table if not exists public.website_leads (
  id          uuid primary key default uuid_generate_v4(),
  full_name   text not null,
  company     text not null,
  email       text not null,
  phone       text,
  country     text,
  message     text not null,
  source      text not null default 'website',
  status      text not null default 'new'
              check (status in (
                'new', 'contacted', 'qualified', 'quotation',
                'negotiation', 'won', 'lost'
              )),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_website_leads_updated on public.website_leads;
create trigger trg_website_leads_updated
  before update on public.website_leads
  for each row execute function public.update_updated_at();

alter table public.website_leads enable row level security;

drop policy if exists "website_leads_select" on public.website_leads;
create policy "website_leads_select"
  on public.website_leads for select
  using (auth.uid() is not null);

drop policy if exists "website_leads_update" on public.website_leads;
create policy "website_leads_update"
  on public.website_leads for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- 2) Colonnes structurées sur website_leads
alter table public.website_leads
  add column if not exists score        int  not null default 0,
  add column if not exists lead_type    text,
  add column if not exists fingerprint  text;

create index if not exists idx_leads_fp_time
  on public.website_leads (fingerprint, created_at desc);

-- 3) Fonction = unique porte d'écriture validée (validation/dédup/score serveur)
create or replace function public.submit_lead(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name    text := nullif(trim(p->>'full_name'), '');
  v_company text := nullif(trim(p->>'company'), '');
  v_email   text := lower(nullif(trim(p->>'email'), ''));
  v_phone   text := nullif(trim(p->>'phone'), '');
  v_country text := nullif(trim(p->>'country'), '');
  v_msg     text := trim(coalesce(p->>'message', ''));
  v_source  text := coalesce(nullif(trim(p->>'source'), ''), 'website');
  v_ltype   text := nullif(trim(p->>'lead_type'), '');
  v_hp      text := coalesce(p->>'website', '');   -- honeypot
  v_fp      text;
  v_score   int  := 0;
begin
  if v_hp <> '' then
    return jsonb_build_object('status','rejected','reason','spam');
  end if;
  if v_company is null then
    return jsonb_build_object('status','rejected','reason','company_required');
  end if;
  if v_email is null
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' then
    return jsonb_build_object('status','rejected','reason','email_invalid');
  end if;
  if char_length(v_msg) < 1 then
    return jsonb_build_object('status','rejected','reason','message_required');
  end if;

  v_fp := md5(v_email || '|' || v_source);
  if exists (
    select 1 from public.website_leads
    where fingerprint = v_fp and created_at > now() - interval '24 hours'
  ) then
    return jsonb_build_object('status','duplicate');
  end if;

  -- Score serveur PARTIEL (contact). La grille V500 complète viendra avec
  -- l'arc Lancinet (besoin/famille/secteur) — incrément 2.
  v_score := (case when v_company is not null then 18 else 0 end)
           + (case when v_email   is not null then 12 else 0 end)
           + (case when v_name    is not null then  5 else 0 end)
           + (case when v_phone   is not null then  5 else 0 end);

  insert into public.website_leads(
    full_name, company, email, phone, country, message,
    source, status, score, lead_type, fingerprint
  ) values (
    coalesce(v_name,'Non renseigné'), v_company, v_email,
    coalesce(v_phone,'Non renseigné'), coalesce(v_country,'Non renseigné'),
    v_msg, v_source, 'new', v_score, v_ltype, v_fp
  );

  return jsonb_build_object('status','ok','score',v_score);
end;
$$;

revoke all on function public.submit_lead(jsonb) from public;
grant execute on function public.submit_lead(jsonb) to anon;
grant execute on function public.submit_lead(jsonb) to authenticated;

-- 4) Verrou : anon n'a plus AUCUN accès direct à la table (écrit via submit_lead)
revoke all on public.website_leads from anon;
