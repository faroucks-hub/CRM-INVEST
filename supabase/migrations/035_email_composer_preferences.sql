alter table public.email_preferences
  add column if not exists signature_enabled boolean not null default true,
  add column if not exists reply_signature text not null default '',
  add column if not exists reply_signature_enabled boolean not null default true;

alter table public.email_preferences
  drop constraint if exists email_preferences_reply_signature_check;

alter table public.email_preferences
  add constraint email_preferences_reply_signature_check
  check (char_length(reply_signature) <= 2000);

alter table public.email_preferences
  drop constraint if exists email_preferences_compose_font_check;

alter table public.email_preferences
  add constraint email_preferences_compose_font_check
  check (compose_font in ('sans', 'century-gothic', 'serif', 'mono'));
