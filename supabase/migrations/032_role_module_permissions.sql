-- IM Energie CRM V32 — permissions de modules administrables

create table if not exists public.role_module_permissions (
  role text not null check (role in ('lead_team', 'commercial')),
  module_key text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users_profiles(id) on delete set null,
  primary key (role, module_key)
);

alter table public.role_module_permissions enable row level security;

drop policy if exists "role_permissions_read_own_or_admin" on public.role_module_permissions;
create policy "role_permissions_read_own_or_admin"
on public.role_module_permissions for select to authenticated
using (public.get_user_role() = 'admin' or role = public.get_user_role()::text);

drop policy if exists "role_permissions_admin_update" on public.role_module_permissions;
create policy "role_permissions_admin_update"
on public.role_module_permissions for update to authenticated
using (public.get_user_role() = 'admin')
with check (public.get_user_role() = 'admin');

revoke all on public.role_module_permissions from anon;
revoke insert, delete on public.role_module_permissions from authenticated;
grant select on public.role_module_permissions to authenticated;
grant update (enabled, updated_at, updated_by) on public.role_module_permissions to authenticated;

insert into public.role_module_permissions (role, module_key, enabled)
select role, module_key, enabled
from (values
  ('lead_team','website_leads',true), ('commercial','website_leads',true),
  ('lead_team','quotations',true), ('commercial','quotations',true),
  ('lead_team','clients',true), ('commercial','clients',true),
  ('lead_team','opportunities',true), ('commercial','opportunities',true),
  ('lead_team','proformas',true), ('commercial','proformas',false),
  ('lead_team','projects',true), ('commercial','projects',true),
  ('lead_team','payments',true), ('commercial','payments',true),
  ('lead_team','documents',true), ('commercial','documents',true),
  ('lead_team','partners',true), ('commercial','partners',false),
  ('lead_team','purchases',true), ('commercial','purchases',false),
  ('lead_team','deal_control',true), ('commercial','deal_control',false),
  ('lead_team','catalogue_products',true), ('commercial','catalogue_products',false),
  ('lead_team','consolidation',true), ('commercial','consolidation',true),
  ('lead_team','reports',true), ('commercial','reports',true),
  ('lead_team','tasks',true), ('commercial','tasks',true),
  ('lead_team','calculators',true), ('commercial','calculators',true),
  ('lead_team','lydie',true), ('commercial','lydie',true)
) as defaults(role, module_key, enabled)
on conflict (role, module_key) do nothing;

comment on table public.role_module_permissions is
  'Restrictions de modules configurées par l’administrateur, plafonnées par les rôles de sécurité du CRM.';
