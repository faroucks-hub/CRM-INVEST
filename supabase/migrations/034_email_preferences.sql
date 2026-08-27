create table if not exists public.email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  signature text not null default '' check (char_length(signature) <= 2000),
  compose_font text not null default 'sans' check (compose_font in ('sans', 'serif', 'mono')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_preferences enable row level security;

drop policy if exists email_preferences_own on public.email_preferences;
create policy email_preferences_own on public.email_preferences
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke all on public.email_preferences from anon;
grant select, insert, update on public.email_preferences to authenticated;
