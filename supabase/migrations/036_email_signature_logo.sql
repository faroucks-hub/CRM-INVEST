alter table public.email_preferences
  add column if not exists signature_logo_enabled boolean not null default true;
