-- Dev profile facts — freeform onboarding notes for Tagro personalization.
-- Raw text from onboarding; Tagro later extracts position, stack, modules.
alter table profiles
  add column if not exists dev_profile_facts text,
  add column if not exists dev_profile_summary text;

comment on column profiles.dev_profile_facts is
  'Freeform developer self-description from onboarding (facts, position, stack).';
comment on column profiles.dev_profile_summary is
  'Tagro-normalized summary + module hints derived from dev_profile_facts.';
