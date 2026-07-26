-- Extended Rechnungssteller fields for legal/professional invoice lines
alter table public.workspace_branding
  add column if not exists invoice_managing_director text,
  add column if not exists invoice_register_info text,
  add column if not exists invoice_account_holder text,
  add column if not exists invoice_default_tax_note text,
  add column if not exists invoice_default_payment_terms text;
