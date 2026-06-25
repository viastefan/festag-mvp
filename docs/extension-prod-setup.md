# Extension — Production database setup

`supabase db push` can fail when remote migration history diverges from this repo. The writing assistant only needs the tables below — run this **once** in the [Supabase SQL Editor](https://supabase.com/dashboard) for production.

## Quick apply

```bash
npm run extension:prod-sql
```

Copy the printed SQL into Supabase → SQL → New query → Run.

Or open `scripts/extension-prod-migration.sql` directly.

## Verify

After running SQL, signed-in users should get:

- `POST /api/extension/improve-text` → `{ improved, model, action }`
- `GET /api/extension/session` → `{ ok: true, user: { email } }`

## Extension checklist (prod)

1. Deploy latest `main` on Vercel (festag.app)
2. Run SQL above on Supabase prod
3. Install extension v0.8.4+ from [festag.app/download](https://festag.app/download#chrome-extension)
4. Log in at festag.app in the **same Chrome profile**
5. Open extension popup → **Mit Festag verbinden** (top) or **Verbunden als …** (bottom)
6. Reload any test tab with **F5** — Tagro dock bottom-right, chip on focus, toolbar on selection

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Popup shows connect button at top | Log in at festag.app, close popup, reopen |
| Chip never appears | Turn off „Nur ausgewählte Seiten“, reload tab (F5) |
| „Tagro-KI gerade nicht verfügbar“ | AI keys on Vercel; check `/api/extension/improve-text` logs |
| 401 unauthorized | Same Chrome profile as festag.app login; reload extension |
| DB insert errors in logs | Run `scripts/extension-prod-migration.sql` on prod |
