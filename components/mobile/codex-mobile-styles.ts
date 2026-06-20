/** Shared Codex-inspired mobile chrome — Sana-style soft orbs, no strokes. */
export const CODEX_ORB_CSS = `
  .cx-orb {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    background: var(--cx-orb-bg, #f2f2f7);
    color: var(--cx-orb-fg, #000);
    box-shadow: none;
    transition: transform 0.14s ease, background 0.14s ease;
  }
  .cx-orb:active {
    transform: scale(0.96);
    background: var(--cx-orb-bg-active, #e5e5ea);
  }
  .cx-orb:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .cx-orb--dark {
    --cx-orb-bg: rgba(255, 255, 255, 0.10);
    --cx-orb-bg-active: rgba(255, 255, 255, 0.14);
    --cx-orb-fg: rgba(255, 255, 255, 0.92);
    box-shadow: none;
  }
  .cx-topbar {
    position: absolute;
    top: calc(env(safe-area-inset-top, 0px) + 8px);
    left: 20px;
    right: 20px;
    z-index: 6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    pointer-events: none;
  }
  .cx-topbar > * { pointer-events: auto; }
  .cx-topbar-spacer { width: 44px; height: 44px; flex-shrink: 0; }

  .cx-action-pill {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    height: 44px;
    padding: 0 2px;
    border-radius: 999px;
    background: var(--cx-orb-bg, #fff);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.95),
      0 2px 4px rgba(144, 149, 159, 0.09);
  }
  .cx-action-pill--dark {
    --cx-orb-bg: rgba(255, 255, 255, 0.1);
    --cx-orb-fg: rgba(255, 255, 255, 0.88);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 2px 4px rgba(0, 0, 0, 0.34);
  }
  [data-theme="dark"] .cx-action-pill,
  [data-theme="classic-dark"] .cx-action-pill {
    --cx-orb-bg: rgba(255, 255, 255, 0.08);
    --cx-orb-bg-active: rgba(255, 255, 255, 0.12);
    --cx-orb-fg: rgba(255, 255, 255, 0.88);
    background: var(--cx-orb-bg);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 2px 4px rgba(0, 0, 0, 0.34);
  }
  [data-theme="dark"] .cx-orb,
  [data-theme="classic-dark"] .cx-orb {
    --cx-orb-bg: rgba(255, 255, 255, 0.10);
    --cx-orb-bg-active: rgba(255, 255, 255, 0.14);
    --cx-orb-fg: rgba(255, 255, 255, 0.92);
    box-shadow: none;
  }
  .cx-action-pill-btn {
    width: 42px;
    height: 42px;
    border: 0;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    background: transparent;
    color: var(--cx-orb-fg, #1c1c1e);
    transition: background 0.14s ease, transform 0.14s ease;
  }
  .cx-action-pill-btn:active {
    transform: scale(0.96);
    background: var(--cx-orb-bg-active, #f8f8f8);
  }
`
