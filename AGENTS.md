# Festag Repository Instructions

Festag is a client-facing Delivery Intelligence Platform. Treat
`docs/festag-product-north-star.md` as the product north star before changing
core product flows, UI copy, IA, dashboard concepts, client portal behavior,
Execution Panel behavior, Veyra behavior, or white-label features.

For the **Leqra (intelligence) + Festag (execution)** two-layer model and the
Delivery / Teams / Agency modes, read
`docs/leqra-festag-operating-architecture.md` before changing workspace modes,
Tagro scope, white-label behavior, or cross-portal architecture.

Do not build Festag as another Notion, Slack, Monday, ClickUp, Asana, Jira,
Linear, generic project manager, wiki, workspace, chat app, or AI agent
playground.

Always bias product decisions toward:

- Turning work signals into client-ready clarity.
- Helping clients, CEOs, founders, and project owners understand what is
  actually happening.
- Reducing manual status communication for agencies and project teams.
- Creating trust through status, risks, decisions, approvals, and next steps.
- Keeping execution work in existing tools while Festag sits above them as the
  delivery intelligence layer.
- Veyra as a Project Interpreter, not a chatbot.

Before adding a feature, ask:

- Does this help the client understand the project?
- Does this reduce manual status work?
- Does this create trust?
- Does this help an agency look more professional?
- Does this avoid becoming a generic task manager or workspace?
- Does this turn work signals into delivery intelligence?

## UI theming (dark mode)

All portaled overlays, modals, pickers, and nested sheets (Tagro, @-Kontext-Picker,
Command Palette, Modal, AssignDev, etc.) must respect `html[data-theme="dark"]` and `html[data-theme="classic-dark"]`: OLED canvas
(`--festag-black-canvas` / `#000000`), content containers one step up
(`--festag-black-content` / `#0c0c0e`, `--portal-card`), popups one step above
(`--festag-black-popup` / `#121214`, `--fp-bg`), light text, and blurred
`--modal-backdrop` / `--tov-backdrop`.
Never force a white card shell in dark mode unless a Figma spec explicitly requires
it (e.g. mobile NewProject sheet).

Anchor-adjacent popovers (workspace menu, inbox category picker, notification
bell) must **not** use `festag-popup-backdrop` on desktop — the page stays fully
visible; dismiss via outside-click only. Full modals (Cmd+K, Tagro, NewProject)
keep the blurred backdrop.

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
