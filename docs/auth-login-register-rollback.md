# Auth Login / Register — rollback snapshot

Before unified auth onboarding (`feat/unified-auth-onboarding`).

## Restore points (GitHub)

| Kind | Ref | Commit |
|------|-----|--------|
| Tag | `auth-login-register-before-unified` | `273f2d1` |
| Branch | `backup/pre-unified-auth-login-register` | same as tag |
| `main` at cut | `273f2d1` — *Ship Dev onboarding with primary-dusk chrome…* | |

## What this preserves

- `components/auth/AuthLandingPage.tsx` with Client ↔ Dev panel switch (`/dev/login`)
- `AuthPanelSwitchModal` entry on login/register
- `LoginPageLegacy.tsx` / `RegisterPageLegacy.tsx` shells

## How to reset Login / Register only

```bash
git checkout auth-login-register-before-unified -- \
  components/auth/AuthLandingPage.tsx \
  components/auth/AuthPanelSwitchModal.tsx \
  components/auth/LoginPageLegacy.tsx \
  components/auth/RegisterPageLegacy.tsx
```

Or switch the whole app back:

```bash
git checkout backup/pre-unified-auth-login-register
```

Do not delete the Legacy login/register files without an explicit ask — they remain the local rollback path.
