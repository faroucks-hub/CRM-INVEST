create table if not exists public.email_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google' check (provider = 'google'), email_address text not null,
  access_token_encrypted text not null, refresh_token_encrypted text not null, token_expires_at timestamptz not null,
  scopes text[] not null default '{}', status text not null default 'active' check (status in ('active','reauthorization_required')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, provider)
);
create table if not exists public.email_crm_links (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  gmail_thread_id text not null, website_lead_id uuid references public.website_leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null, opportunity_id uuid references public.opportunities(id) on delete set null,
  created_at timestamptz not null default now(), unique(user_id, gmail_thread_id)
);
create table if not exists public.email_activity (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  gmail_message_id text not null, gmail_thread_id text, direction text not null check (direction in ('inbound','outbound')),
  recipient text, subject text, website_lead_id uuid references public.website_leads(id) on delete set null, created_at timestamptz not null default now()
);
alter table public.email_accounts enable row level security;
alter table public.email_crm_links enable row level security;
alter table public.email_activity enable row level security;
drop policy if exists email_accounts_own on public.email_accounts;
create policy email_accounts_own on public.email_accounts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists email_crm_links_own on public.email_crm_links;
create policy email_crm_links_own on public.email_crm_links for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists email_activity_own on public.email_activity;
create policy email_activity_own on public.email_activity for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.email_accounts, public.email_crm_links, public.email_activity from anon;
grant select, insert, update, delete on public.email_accounts, public.email_crm_links, public.email_activity to authenticated;
insert into public.role_module_permissions(role, module_key, enabled)
values ('lead_team', 'messaging', true), ('commercial', 'messaging', true)
on conflict (role, module_key) do nothing;
