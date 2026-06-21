# Festag Repository Instructions

Festag is a client-facing Delivery Intelligence Platform. Treat
`docs/festag-product-north-star.md` as the product north star before changing
core product flows, UI copy, IA, dashboard concepts, client portal behavior,
Execution Panel behavior, Veyra behavior, or white-label features.

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
