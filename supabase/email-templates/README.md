# Festag Supabase Auth Email Templates

Paste these files into Supabase Dashboard > Authentication > Email Templates.

Important: GitHub/Vercel deployments do not automatically update Supabase Auth email templates. After changing these files, paste the matching HTML into the Supabase Dashboard or update the project through the Supabase Management API.

## Magic Link

Use `auth-magic-link.html` for the `Magic Link` template.

Subject suggestion:

```text
Dein Festag Login
```

## Confirm Signup

Use `auth-confirm-signup.html` for the `Confirm signup` template.

Subject suggestion:

```text
Willkommen bei Festag
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

## Font note

The template references Qurova via:

```css
@font-face { src: url('https://festag.app/fonts/QurovaDEMO-Medium.otf') format('opentype'); }
```

Some email clients ignore custom fonts. The wordmark falls back to Georgia/serif so the email stays clean even when Qurova is blocked.
