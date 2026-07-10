-- Issuer API stores IBAN/BIC on profiles (dual-write with workspace_branding).
alter table public.profiles
  add column if not exists invoice_iban text,
  add column if not exists invoice_bic text;
