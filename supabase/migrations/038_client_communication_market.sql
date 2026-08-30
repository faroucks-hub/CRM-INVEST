alter table public.clients
  add column if not exists communication_market text not null default 'unknown';

alter table public.clients
  drop constraint if exists clients_communication_market_check;

alter table public.clients
  add constraint clients_communication_market_check
  check (communication_market in ('africa', 'international', 'unknown'));

comment on column public.clients.communication_market is
  'Orientation documentaire : africa, international ou unknown. Le pays peut guider le choix, mais ne doit pas imposer automatiquement le segment.';
