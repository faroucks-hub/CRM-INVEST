-- V37.3 — Suivi commercial unifie Clients / Website Leads

create table if not exists public.contact_engagements (
  email_key text primary key,
  first_contacted_at timestamptz,
  last_contacted_at timestamptz,
  last_reply_at timestamptz,
  outbound_count integer not null default 0 check (outbound_count >= 0),
  inbound_count integer not null default 0 check (inbound_count >= 0),
  history_checked_at timestamptz,
  last_subject text,
  last_contacted_by uuid references public.users_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_engagements_email_check
    check (email_key = lower(trim(email_key)) and email_key ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

create table if not exists public.contact_touchpoints (
  id uuid primary key default gen_random_uuid(),
  email_key text not null references public.contact_engagements(email_key) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  direction text not null check (direction in ('outbound', 'inbound')),
  channel text not null default 'email' check (channel in ('email', 'phone', 'meeting', 'note')),
  outcome text not null default 'completed' check (outcome in ('completed', 'received', 'failed')),
  occurred_at timestamptz not null default now(),
  subject text,
  gmail_message_id text,
  gmail_thread_id text,
  client_id uuid references public.clients(id) on delete set null,
  website_lead_id uuid references public.website_leads(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, gmail_message_id, direction)
);

create index if not exists idx_contact_touchpoints_email_date
  on public.contact_touchpoints(email_key, occurred_at desc);
create index if not exists idx_contact_touchpoints_client
  on public.contact_touchpoints(client_id, occurred_at desc) where client_id is not null;
create index if not exists idx_contact_touchpoints_lead
  on public.contact_touchpoints(website_lead_id, occurred_at desc) where website_lead_id is not null;

alter table public.clients
  add column if not exists do_not_contact boolean not null default false;

alter table public.website_leads
  add column if not exists do_not_contact boolean not null default false;

alter table public.taches
  add column if not exists website_lead_id uuid references public.website_leads(id) on delete set null,
  add column if not exists task_type text not null default 'general';

alter table public.taches
  drop constraint if exists taches_task_type_check;
alter table public.taches
  add constraint taches_task_type_check
  check (task_type in ('general', 'follow_up', 'call', 'meeting'));

create index if not exists idx_taches_website_lead
  on public.taches(website_lead_id) where website_lead_id is not null;

create or replace function public.refresh_contact_engagement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.contact_engagements (
    email_key, first_contacted_at, last_contacted_at, last_reply_at,
    outbound_count, inbound_count, last_subject, last_contacted_by
  ) values (
    new.email_key,
    case when new.direction = 'outbound' then new.occurred_at end,
    case when new.direction = 'outbound' then new.occurred_at end,
    case when new.direction = 'inbound' then new.occurred_at end,
    case when new.direction = 'outbound' then 1 else 0 end,
    case when new.direction = 'inbound' then 1 else 0 end,
    new.subject,
    case when new.direction = 'outbound' then new.user_id end
  )
  on conflict (email_key) do update set
    first_contacted_at = case
      when new.direction = 'outbound' then least(
        coalesce(contact_engagements.first_contacted_at, new.occurred_at), new.occurred_at
      ) else contact_engagements.first_contacted_at end,
    last_contacted_at = case
      when new.direction = 'outbound' then greatest(
        coalesce(contact_engagements.last_contacted_at, new.occurred_at), new.occurred_at
      ) else contact_engagements.last_contacted_at end,
    last_reply_at = case
      when new.direction = 'inbound' then greatest(
        coalesce(contact_engagements.last_reply_at, new.occurred_at), new.occurred_at
      ) else contact_engagements.last_reply_at end,
    outbound_count = contact_engagements.outbound_count + case when new.direction = 'outbound' then 1 else 0 end,
    inbound_count = contact_engagements.inbound_count + case when new.direction = 'inbound' then 1 else 0 end,
    last_subject = case
      when new.occurred_at >= coalesce(contact_engagements.last_contacted_at, contact_engagements.last_reply_at, '-infinity')
      then new.subject else contact_engagements.last_subject end,
    last_contacted_by = case
      when new.direction = 'outbound' and new.occurred_at >= coalesce(contact_engagements.last_contacted_at, '-infinity')
      then new.user_id else contact_engagements.last_contacted_by end,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_refresh_contact_engagement on public.contact_touchpoints;
create trigger trg_refresh_contact_engagement
  after insert on public.contact_touchpoints
  for each row execute function public.refresh_contact_engagement();

alter table public.contact_engagements enable row level security;
alter table public.contact_touchpoints enable row level security;

drop policy if exists contact_engagements_read on public.contact_engagements;
create policy contact_engagements_read on public.contact_engagements
  for select to authenticated using (true);
drop policy if exists contact_engagements_write on public.contact_engagements;
create policy contact_engagements_write on public.contact_engagements
  for insert to authenticated with check (true);
drop policy if exists contact_engagements_update on public.contact_engagements;
create policy contact_engagements_update on public.contact_engagements
  for update to authenticated using (true) with check (true);

drop policy if exists contact_touchpoints_read on public.contact_touchpoints;
create policy contact_touchpoints_read on public.contact_touchpoints
  for select to authenticated using (true);
drop policy if exists contact_touchpoints_insert_own on public.contact_touchpoints;
create policy contact_touchpoints_insert_own on public.contact_touchpoints
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists contact_touchpoints_update_own on public.contact_touchpoints;
create policy contact_touchpoints_update_own on public.contact_touchpoints
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.contact_engagements, public.contact_touchpoints from anon;
grant select, insert, update on public.contact_engagements to authenticated;
grant select, insert, update on public.contact_touchpoints to authenticated;

comment on table public.contact_engagements is
  'Resume commercial partage par adresse e-mail. Aucun corps de message Gmail n est stocke.';
comment on table public.contact_touchpoints is
  'Evenements commerciaux minimaux partages entre Clients et Website Leads.';
