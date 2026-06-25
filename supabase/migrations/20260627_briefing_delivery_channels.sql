-- Briefing delivery channels (WhatsApp + Nachricht) — per-user, persisted on profiles.

alter table profiles
  add column if not exists briefing_whatsapp_phone text,
  add column if not exists briefing_whatsapp_linked_at timestamptz,
  add column if not exists briefing_message_channel text,
  add column if not exists briefing_message_destination text,
  add column if not exists briefing_message_linked_at timestamptz;

do $$ begin
  alter table profiles
    add constraint profiles_briefing_message_channel_check
    check (briefing_message_channel is null or briefing_message_channel in ('email', 'sms'));
exception when duplicate_object then null; end $$;

comment on column profiles.briefing_whatsapp_phone is 'E.164 phone for WhatsApp briefing share, e.g. +4915201234567';
comment on column profiles.briefing_message_destination is 'Email address or SMS phone for offline briefing delivery';
