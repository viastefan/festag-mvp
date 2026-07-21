# Festag Firmen-SSO (SAML)

Login-UI, Callback, Registry, Anfragen und Audit sind fertig. Pro Enterprise-Kunde: **einmal** Setup in Supabase + IdP, dann Domain in der Festag-Registry.

**Nicht gebaut (bewusst, erst auf Kundenwunsch):** SCIM, WorkOS, Self-Serve-IdP-Connect.

## Warum SSO überhaupt?

| Nutzen | Für wen |
|--------|---------|
| Ein Login (Okta / Entra / Google Workspace) | IT & Security |
| Kein separates Festag-Passwort | Admins, Helpdesk |
| Domain kontrolliert den Zugang | Agency / Enterprise |
| Hakt Security-Fragebögen ab | Procurement |
| Professioneller Client-Zugang | CEOs / Board |

## Warum als Enterprise-Addon (1290 €)

1. Deal-Opener für IT-Freigaben — nicht Free-Tier.
2. Setup ist Service (Metadata, Test, Registry).
3. Supabase SAML oft erst ab Team/Pro.
4. Upsell später: SCIM — nicht vorher bauen.
5. Registry-Kontrolle (`status = active`).

## Was fertig ist (Produkt)

| Baustein | Pfad |
|----------|------|
| Domain-Registry + `enforce_sso` | `organization_sso_providers` |
| Login-Audit | `sso_login_attempts` |
| Setup-Anfragen | `sso_setup_requests` + Settings „SSO anfragen“ |
| Preflight | `GET /api/auth/sso/check` |
| Attempt-Log | `POST /api/auth/sso/attempt` |
| Nach Login (Profil + JIT Join) | `POST /api/auth/sso/finish` |
| Kunden-Anfrage | `POST /api/auth/sso/request` |
| Admin Registry | `GET/POST /api/admin/sso/providers` |
| Admin Anfragen | `GET/PATCH /api/admin/sso/requests` |
| Admin Attempts | `GET /api/admin/sso/attempts` |
| Login UI | Domain-Check live, Enforce → SSO statt Magic-Link/Google |
| Ops UI | `/internal-admin` → SSO |

## Ops-Ablauf (ein Kunde)

1. Kunde: Settings → Sicherheit → **SSO anfragen** (oder Sales)
2. Anfrage landet in `/internal-admin` + optional Founder-Mail
3. Supabase → Authentication → SAML Provider + Domain
4. `/internal-admin` → Domain `active`, optional `enforce_sso`, optional `workspace_id` (JIT Join)
5. Test: `/login` → Single Sign-On → `name@domain`

## Kosten

| Posten | Preis |
|--------|--------|
| Festag Code | 0 € |
| Supabase SAML | oft Team/Pro |
| Kunden-IdP | meist vorhanden |
| Addon Verkauf | 1290 € Setup |

## Migrationen

```bash
npm run db:push
```

- `20260720_organization_sso.sql`
- `20260721_sso_setup_requests.sql`

## Redirect URLs

- `https://festag.app/auth/callback`
- Site URL: `https://festag.app`
- Dev: `http://localhost:3000/auth/callback`
