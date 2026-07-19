# Festag Supabase Auth Email Templates

Pushes to `main` that touch this folder are auto-synced to the live Supabase project via `.github/workflows/supabase-email-sync.yml` (uses the `SUPABASE_ACCESS_TOKEN` repo secret).

Manual paste through Supabase Dashboard > Authentication > Email Templates is still supported as a fallback.

## Magic Link

Use `auth-magic-link.html` for the `Magic Link` template.

Subject suggestion:

```text
Dein Anmeldecode
```

## Confirm Signup

Use `auth-confirm-signup.html` for the `Confirm signup` template.

Subject suggestion:

```text
Dein Bestätigungscode
```

## Required auth URL setup

Authentication > URL Configuration:

```text
Site URL: https://festag.app
Redirect URLs:
https://festag.app/auth/callback
https://festag.app/auth/callback/**
https://festag.app/**
http://localhost:3000/auth/callback
http://localhost:3000/**
```

## Why the link format matters

The button uses:

```html
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email
```

The app sends `emailRedirectTo` with `?next=/dashboard` for login and `?next=/onboarding` for registration. The `token_hash` lets `/auth/callback` verify the email link reliably in the browser.

## Production path

Login / signup OTP is sent by **`POST /api/auth/otp/request`** (Festag IONOS + `tplAuthOtp` in `lib/email/templates.ts`), not by the Supabase Auth mailer. That keeps Gmail on the premium HTML even when the dashboard sync Action fails.

The HTML files in this folder stay the source of truth for Supabase Dashboard / Management API sync (fallback / invite flows that still use the built-in mailer). Keep them visually identical to `tplAuthOtp`.

## Font note

Templates load Aeonik Regular from `https://festag.app/fonts/Aeonik-Regular.ttf` via `@font-face`, with a sans-only fallback (never Georgia / Times):

```css
font-family: 'Aeonik', 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
font-weight: 400;
```

Gmail often strips webfonts; Helvetica/system sans keeps the calm Festag look. Do not use serif fallbacks for the wordmark.

## CTA note

Auth OTP emails follow the OpenAI-minimal pattern: **no pill button**. Use a muted underlined text link („Anmeldung öffnen“) only. Other transactional mails may still use white/light Linear CTAs — never black/near-black fills in light mode.
