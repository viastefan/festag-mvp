# Festag Email Templates

Pushes to `main` that touch this folder are auto-synced to the live Supabase project via `.github/workflows/supabase-email-sync.yml` (uses the `SUPABASE_ACCESS_TOKEN` repo secret).

## Design system

Canonical chrome: `lib/email/system.ts`. Copy composition: `lib/email/templates.ts`.

**Open letter — no card shell, no nested boxes.**

- Ivory canvas `#FAF9F5` (continuous page)
- Quiet wordmark `festag`
- Title + calm lead (`#8891a0`)
- Large spaced OTP / PIN as typography only
- Primary action as slate text link (`#5B647D` … →) or soft white 6px CTA
- Security as muted one-liner (no tinted panel)
- Footer: Docs, Datenschutz, Impressum, Hilfe (spacing only)

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
