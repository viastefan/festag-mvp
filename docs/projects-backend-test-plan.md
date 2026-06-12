# Projects Backend Bridge — Test Plan

## 1. Festag-Delivery Happy Path
- Client legt Projekt an: 5.000–8.000 EUR, Note „App mit Login und Stripe"
- `POST /api/projects/festag-pool` → pool fan-out an approved Devs
- Dev A öffnet Pool → sieht Projekt → klickt „Projekt prüfen" → `/dev/proposals/[id]`
- Dev akzeptiert direkt zu 8.000 → `POST /api/dev/proposals/[id]/accept`
- Solo-Celebration beim Client (ProjectAcceptedCelebration)
- Tagro schlägt 30/40/30 Milestones vor → `POST /api/projects/[id]/milestones/propose`
- Dev passt auf 20/40/40 an → `PATCH /api/projects/[id]/milestones/[mid]`
- Client bestätigt → `POST /api/projects/[id]/milestones/confirm` → Status `in_progress`
- Anzahlungs-Milestone über Stripe → `POST /api/payments/stripe` → Checkout → Webhook
- Dev sieht `milestone_paid` Notification

## 2. Festag-Delivery mit Budget-Klärung
- Client legt Projekt an: 2.000 EUR, Scope wie oben
- Dev klickt „Preis-Klarstellung" → 6.000 EUR + Begründung
- `POST /api/dev/proposals/[id]/clarify-budget` → Tagro übersetzt → Notification an Client
- Client sieht `BudgetClarificationCard` → adjustiert auf 5.000
- `POST /api/projects/[id]/proposals/[propId]/respond` mit `action: 'adjust'`
- Dev akzeptiert → weiter wie oben

## 3. Existing-Dev
- Client wählt `assign_existing_dev` → `POST /api/projects/assign-existing` mit dev handle
- Dev B sieht `proposal_received` Notification + „Wartet auf Antwort" Sektion
- Dev B akzeptiert direkt → Solo-Celebration

## 4. Invite-New-Dev
- Client wählt `invite_new_dev` → `POST /api/projects/invite-dev` mit `neu@x.de`
- Mail 1 mit Confirm/Reject Links
- Dev klickt Confirm → `GET /api/dev-invitations/[token]/confirm`
- Profil wird provisioniert (username + PIN), Mail 2 mit Zugangsdaten
- `project_proposals` Row wird erstellt → Dev sieht Proposal im Panel
- Dev akzeptiert → Celebration

## 5. Dev-Team
- Client wählt `team_internal` → `POST /api/projects/assign-team` mit 3 Members
- Member 1 (Lead, existiert) → Proposal
- Member 2 (existiert) → Proposal
- Member 3 (neu) → Invitation → Confirm → Proposal
- Alle 3 akzeptieren → `dev_team_complete` Notification → TeamCompleteCelebration

## 6. Rechnungs-Pfad
- Client wählt bei Milestone „Rechnung" → `POST /api/payments/invoice`
- Rechnungsnummer `RE-2026-0001` generiert
- PDF-Mail an Client
- Admin bekommt `invoice_awaiting_confirmation`
- Admin markiert bezahlt → `POST /api/payments/invoice/[id]/mark-paid`
- Dev sieht `milestone_paid`

## 7. Stripe-Webhook
```bash
stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
```
- `checkout.session.completed` → payment + milestone auf `paid`, Notifications
- `payment_intent.payment_failed` → payment auf `failed`, Client Notification
- `charge.refunded` → payment + milestone zurücksetzen

## 8. Pool-Expiry
- Proposal älter als 48h mit `expires_at`
- `GET /api/cron/proposals-expiry` → Status `expired`
- Projekt taucht wieder im Pool auf

## ENV-Variablen
```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_PUBLISHABLE_KEY=pk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
MOLLIE_API_KEY=test_…
OPENAI_API_KEY=…
NEXT_PUBLIC_APP_URL=https://festag.app
CRON_SECRET=… (für Vercel Cron)
```
