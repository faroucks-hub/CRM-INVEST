-- ============================================================================
-- 010_lancinet_soft_delete.sql
-- Lancinet — Corbeille (soft delete) + purge réservée aux Admin (Phase 5)
-- ÉTAT : déjà appliqué en base via SQL Editor. Registre idempotent.
-- Confirmé : authenticated n'a plus ni DELETE ni TRUNCATE sur website_leads.
-- ============================================================================

-- 1) Colonne de soft delete
alter table public.website_leads
  add column if not exists deleted_at timestamptz default null,
  add column if not exists deleted_by uuid references public.users_profiles(id) on delete set null,
  add column if not exists deleted_reason text,
  add column if not exists internal_notes text,
  add column if not exists assigned_to uuid references public.users_profiles(id) on delete set null,
  add column if not exists converted_at timestamptz,
  add column if not exists converted_opportunity_id uuid
    references public.opportunities(id) on delete set null;

create index if not exists idx_leads_active
  on public.website_leads (created_at desc)
  where deleted_at is null;

create index if not exists idx_leads_assigned
  on public.website_leads (assigned_to)
  where deleted_at is null;

create index if not exists idx_leads_converted_opportunity
  on public.website_leads (converted_opportunity_id)
  where converted_opportunity_id is not null;

-- 2) Effacement DUR réservé aux Admin (vérifie le rôle de l'appelant)
create or replace function public.purge_lead(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role::text into v_role
  from public.users_profiles
  where id = auth.uid();

  if v_role is distinct from 'admin' then
    return jsonb_build_object('status','forbidden','reason','admin_only');
  end if;

  delete from public.website_leads where id = p_id;
  return jsonb_build_object('status','ok','purged',p_id);
end;
$$;

revoke all on function public.purge_lead(uuid) from public;
grant execute on function public.purge_lead(uuid) to authenticated;

-- 3) Fermeture du DELETE / TRUNCATE directs pour authenticated.
--    Hard delete uniquement via purge_lead() (Admin). Soft delete / restore =
--    UPDATE de deleted_at (authenticated garde UPDATE).
revoke delete   on public.website_leads from authenticated;
revoke truncate on public.website_leads from authenticated;
