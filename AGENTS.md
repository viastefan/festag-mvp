# Festag Repository Instructions

## Product constitution (supreme)

Festag is **The Operating System for Projects** — not project management software
and not an AI chatbot wrapper.

**Always apply:** `.cursor/rules/festag-product-constitution.mdc`  
**Human doc:** `docs/festag-product-constitution.md`  

## Architecture confirmation (locked)

**Always apply:** `.cursor/rules/festag-architecture-confirmation.mdc`  
**Human doc:** `docs/festag-architecture-confirmation.md`  

One platform. Client App / Developer App **deprecated**.  
One Account · Multiple Workspaces · Projects · Project Roles · Adaptive Intelligence.  
Workspace is primary. Tagro infers first. Prefer better product over dual-product compatibility.

**Code anchors:** `lib/platform/roles.ts`, `lib/platform/onboarding.ts`, `lib/platform/join.ts`, `lib/platform/identity.ts`, `lib/platform/integrations.ts`, `lib/platform/workspace.ts`, `lib/platform/workspace-personalization.ts`

## Authentication & Onboarding constitution (locked)

**Always apply:** `.cursor/rules/festag-authentication-onboarding-constitution.mdc`  
**Human doc:** `docs/festag-authentication-onboarding-constitution.md`  
**Code:** `lib/platform/onboarding.ts`

The **only** auth flow. User creates an intelligent Workspace — not a registration form.  
Order: Workspace Name → Auth → Context → Focus (optional) → Connect (optional) → Tagro → Type → `/preparing` → Adaptive Dashboard.  
Invitees: `/join`. Returning users skip Build. One continuous dusk chrome — never Client|Developer|Admin auth forks.

## Experience constitution (how it feels)

**Always apply:** `.cursor/rules/festag-experience-constitution.mdc`  
**Human doc:** `docs/festag-experience-constitution.md`

Defines calm, premium, timeless OS feel — whitespace, motion as state, Tagro as quiet COO,
auth evolved from developer onboarding (never redesigned from scratch).

Self-review before UI ship: simpler? less load? Apple remove / Linear simplify / Stripe calm?
Still unmistakably Festag?

## Identity constitution (how Festag understands people)

**Always apply:** `.cursor/rules/festag-identity-constitution.mdc`  
**Human doc:** `docs/festag-identity-constitution.md`  
**Code:** `lib/platform/identity.ts`

Users never configure the platform — Festag understands them through **Workspace Context**
(natural language). Tagro infers roles/modules/dashboard. Account Profile ≠ Workspace Profile.
No identity forms, dropdowns, or role checkboxes when NL suffices.

## Integrations constitution (how Festag connects work)

**Always apply:** `.cursor/rules/festag-integrations-constitution.mdc`  
**Human doc:** `docs/festag-integrations-constitution.md`  
**Code:** `lib/platform/integrations.ts`

Integrations are part of building the workspace — not API settings. Optional always.
Tagro recommends from Workspace Context. States: Connected · Available · Recommended · Coming Soon.
Signals make the workspace smarter; never recreate work that already lives elsewhere.

Non-negotiables (product):

- One platform — Client App / Developer App **deprecated**; experiences via context + roles + permissions
- Workspace is primary — how work happens, not who the user is
- Project is permanent — knowledge belongs to projects, not people
- Creator = Project Owner (transferable)
- One onboarding path (Build) + Join Project for invitees — never Client|Developer split
- One authentication flow — never Client|Developer|Admin auth experiences
- Dashboard = adaptive Festag Workspace — not Client/Dev dashboards
- Understand people through **context**; Tagro **infers first, asks second**
- Connect workspace through **signals**, not configuration
- Prefer better product over preserving dual-product forks
- Gate: does this reduce manual work and make the project more intelligent?

Where older docs describe dual portals or Client|Developer entry, the
**constitution wins**. Migrate toward unification; do not deepen the fork.

## Supporting context (still useful)

1. `docs/festag-adaptive-intelligence.md` — OKM / Operational DNA / Company Brain
2. `docs/festag-workspace-team-connection-v3.md` — workspace SSOT, invites (read with constitution)
3. `docs/festag-workspace-portal-system.md` — **legacy dual-perspective notes**; SSOT yes, separate products no
4. `docs/festag-tagro-client-developer-scenarios.md` — Tagro mediation scenarios (role lenses, not apps)
5. `docs/festag-product-north-star.md` — delivery intelligence north star
6. `docs/leqra-festag-operating-architecture.md` — Leqra + Festag layers

Cursor also applies adaptive-intelligence, workspace SSOT, and Tagro scenario rules —
all **subordinate** to the product constitution when they conflict.

Do not build Festag as another Notion, Slack, Monday, ClickUp, Asana, Jira,
Linear, generic project manager, wiki, workspace, chat app, or AI agent
playground.

Always bias product decisions toward:

- Projects that organize themselves; humans decide; system structures
- Tagro as operating intelligence — observes, creates, removes manual work
- One project graph; role lenses for visibility
- Trust through status, risks, decisions, approvals, next steps
- Compounding OKM / Operational DNA when signals and outcomes are captured

Before adding a feature, ask:

- Does this reduce manual work and make the project more intelligent?
- Does this attach knowledge to the project (not the person)?
- Does this use roles/permissions instead of forking products?
- Does this avoid becoming a generic task manager or chat app?

## UI theming (dark mode — Festag Night)

Source of truth: `lib/design-tokens/dark.ts` + `app/globals.css` `[data-theme="dark"]`.

All portaled overlays, modals, pickers, and nested sheets (Tagro, @-Kontext-Picker,
Command Palette, Modal, AssignDev, etc.) must respect `html[data-theme="dark"]` and `html[data-theme="classic-dark"]`:

| Layer | Token | Hex |
|---|---|---|
| Canvas | `--festag-black-canvas` | `#070708` |
| Content | `--festag-black-content` | `#0E0E10` |
| Card | `--festag-black-raised` | `#151518` |
| Elevated / Popup | `--festag-black-popup` / `--fp-bg` | `#1A1A1E` |
| Ink | `--festag-night-ink` | `#E8EAF0` (soft — not pure white) |

Use cool slates / quiet hairlines / calm semantics. Primary CTAs in dark use soft cool-white
(`--festag-btn-dark-bg` `#F0F2F5` / fg `#1A1A1E`) — never colored fills. Accent `#5B647D` is for
focus/links only. Auth idle stays quiet transparent; ready = soft white.
`--modal-backdrop` is a soft black scrim (no cool wash). Never force a white card
shell in dark mode unless a Figma spec explicitly requires it
(e.g. mobile NewProject sheet).

Anchor-adjacent popovers (workspace menu, inbox category picker, notification
bell) must **not** use `festag-popup-backdrop` on desktop — the page stays fully
visible; dismiss via outside-click only. Full modals (Cmd+K, Tagro, NewProject)
keep the scrim backdrop.

On mobile (≤768px), portaled popups use `festag-popup-mobile-sheet` with drag
handle (`.festag-popup-drag-area`) and `--festag-black-popup` surface; anchor
popovers get a backdrop only on mobile.

Workspace / profile marks use **6px corner radius** everywhere (expanded sidebar,
collapsed rail, workspace popover, settings) — not circular pills.

## Mobile portal UI (≤768px)

On client portal subpages, mobile chrome is fixed — see `.cursor/rules/festag-mobile-ui.mdc`.

- **Top left:** Aeonik page title (current large left header style).
- **Top right:** `CodexMobileActionPill` — Suche + Menü in **one** pill; Menü opens `MobileNavSheet`.
- **Bottom:** `MobilePageDock` — drag grip + **exactly two** context-specific actions for the current page.
- **Never:** persistent multi-tab bottom nav, search without menu, or removing the page dock grip.

## Cursor Cloud specific instructions

Single Next.js 14 app (`festag-mvp`), package manager **npm**, backend is **Supabase**.
The startup update script already runs `npm install`. Standard commands live in
`package.json` scripts; `.env.local.example` is the env template.

**Supabase backend is hosted-only (the key gotcha).** The app hard-validates
`NEXT_PUBLIC_SUPABASE_URL` to be an `https://*.supabase.co` URL
(`lib/supabase/public-env.ts`), so a local `http://127.0.0.1` Supabase is rejected —
you cannot run this app against `supabase start`. The intended dev/prod backend is the
hosted project `xsdkoepwuvpuroijjain.supabase.co`. Additionally, `supabase/migrations/`
are incremental patches on top of an already-existing hosted baseline (e.g.
`20260501_phase8to14.sql` does `alter table profiles …` but no migration ever creates
`profiles`; `20240501000000_rel_quotes.sql` is mis-timestamped before its `rel_projects`
dependency), so `supabase db reset` / `supabase start` cannot rebuild the schema from
scratch. Do not reorder/rename migration files (it desyncs the remote migration history).

**To run with real data:** create `.env.local` from `.env.local.example` with the hosted
project's `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` (a JWT starting with `eyJ`, server-only) from Supabase
Dashboard → Settings → API. Verify with `npm run check:supabase`. The anon key has **no
default** — both `next build` (prerender) and `next dev` page renders throw
`Missing NEXT_PUBLIC_SUPABASE_ANON_KEY` without a valid-format anon JWT. Provide these via
Cursor Secrets so they persist across VMs.

**Run / build / lint:**
- `npm run dev` — dev server on `http://localhost:3000`. `/` redirects to `/login`.
- `npm run build` — compiles all routes. `next.config.js` ignores TS + ESLint errors, so
  a green build does NOT mean type-clean.
- `npm run lint` — **unconfigured**: with no ESLint config it drops into an interactive
  "How would you like to configure ESLint?" prompt (hangs without a TTY), and ESLint is
  skipped during builds anyway. There is no working lint gate in this repo.
- Do **not** run `npm run build` while `npm run dev` is running — the build rewrites
  `.next` and breaks the running dev server with `MODULE_NOT_FOUND` until it recompiles.
