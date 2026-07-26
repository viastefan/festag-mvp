# Festag Email Templates

Pushes to `main` that touch this folder are auto-synced to the live Supabase project via `.github/workflows/supabase-email-sync.yml` (uses the `SUPABASE_ACCESS_TOKEN` repo secret).

## Design system (Cursor-inspired)

All Festag outbound mail shares one chrome in `lib/email/templates.ts`:

- Soft canvas `#F5F5F3` + white rounded content card
- **Wordmark** `festag` only (no mark/logo)
- Large title + calm lead
- Optional **artistic feature panel** (`olive` / `dusk` / `stone` SVGs in `/public/email/`) with nested UI mock
- Black pill CTA with `→`
- Quiet footer: wordmark, Docs | Datenschutz | Impressum | Hilfe

Art assets (must be live on festag.app for Gmail):

- `/email/art-olive.svg`
- `/email/art-dusk.svg`
- `/email/art-stone.svg`

## Magic Link

Use `auth-magic-link.html` for the `Magic Link` template.

Subject: `Dein Anmeldecode`

## Confirm Signup

Use `auth-confirm-signup.html` for the `Confirm signup` template.

Subject: `Dein Bestätigungscode`

## Production path

Login / signup OTP is sent by **`POST /api/auth/otp/request`** (Festag IONOS + `tplAuthOtp`), not by the Supabase Auth mailer. Keep the HTML files here visually identical to `tplAuthOtp`.

## Font

Aeonik Regular from `https://festag.app/fonts/Aeonik-Regular.ttf`, Helvetica/system sans fallback — never Georgia/serif.
