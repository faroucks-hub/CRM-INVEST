alter table public.clients
  add column if not exists communication_language text not null default 'unknown';

alter table public.clients
  drop constraint if exists clients_communication_language_check;

alter table public.clients
  add constraint clients_communication_language_check
  check (communication_language in ('fr', 'en', 'unknown'));

comment on column public.clients.communication_language is
  'Langue de communication commerciale : fr, en ou unknown. Aucun choix ne doit être déduit automatiquement du pays.';

alter table public.email_activity
  add column if not exists client_id uuid references public.clients(id) on delete set null;
