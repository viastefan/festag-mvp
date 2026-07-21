# Festag Repository Instructions

Festag is a client-facing Delivery Intelligence Platform evolving into a
**self-learning Operational Intelligence System**. Treat these as the top
product context before changing core flows, Tagro, IA, or intelligence features:

1. `docs/festag-adaptive-intelligence.md` — Adaptive Intelligence / OKM / Company Brain
2. `docs/festag-product-north-star.md` — Delivery Intelligence Platform north star
3. `docs/leqra-festag-operating-architecture.md` — Leqra + Festag two-layer model

Cursor always applies `.cursor/rules/festag-adaptive-intelligence.mdc` as the
architect master prompt for this direction.

For the **Leqra (intelligence) + Festag (execution)** two-layer model and the
Delivery / Teams / Agency modes, read
`docs/leqra-festag-operating-architecture.md` before changing workspace modes,
Tagro scope, white-label behavior, or cross-portal architecture.

Do not build Festag as another Notion, Slack, Monday, ClickUp, Asana, Jira,
Linear, generic project manager, wiki, workspace, chat app, or AI agent
playground.

Always bias product decisions toward:

- Turning work signals into client-ready clarity **and** compounding company intelligence.
- Helping clients, CEOs, founders, and project owners understand what is
  actually happening — then predicting and optimizing what happens next.
- Reducing manual status communication for agencies and project teams.
- Creating trust through status, risks, decisions, approvals, and next steps.
- Keeping execution work in existing tools while Festag sits above them as the
  delivery + operational intelligence layer.
- Tagro / Veyra as Project / Operations Interpreters — not chatbots.
- Feeding the Operational Knowledge Model (OKM) and Operational DNA whenever
  new signals, decisions, or outcomes are captured.

Before adding a feature, ask:

- Does this help the client understand the project?
- Does this reduce manual status work?
- Does this create trust?
- Does this help an agency look more professional?
- Does this avoid becoming a generic task manager or workspace?
- Does this turn work signals into delivery intelligence?
- Does this learn, adapt, or improve future execution (OKM / DNA / prediction)?

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
