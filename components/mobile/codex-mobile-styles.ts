/** Cursor-inspired mobile chrome — calm rounded-square controls on OLED dark. */
export const CODEX_ORB_CSS = `
  .cx-orb-group {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .cx-orb {
    width: var(--festag-mobile-control-height-compact, 44px);
    height: var(--festag-mobile-control-height-compact, 44px);
    border: 1px solid rgba(30, 30, 32, 0.08);
    border-radius: var(--festag-mobile-control-radius, 12px);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    background: var(--cx-orb-bg, #ffffff);
    color: var(--cx-orb-fg, #1d1d1f);
    box-shadow: var(--festag-mobile-control-shadow, 0 1px 2px rgba(0, 0, 0, 0.04));
    transition: transform 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
  }

  .cx-orb:active {
    transform: scale(0.985);
    background: var(--cx-orb-bg-active, #f5f5f6);
    box-shadow: none;
  }

  .cx-orb:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .cx-orb--dark,
  [data-theme="dark"] .cx-orb,
  [data-theme="classic-dark"] .cx-orb {
    --cx-orb-bg: var(--festag-black-popup, #1A2521);
    --cx-orb-bg-active: #2c2c2e;
    --cx-orb-fg: rgba(255, 255, 255, 0.92);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: var(--festag-mobile-control-shadow-dark, 0 1px 2px rgba(0, 0, 0, 0.32));
  }

  [data-theme="dark"] .cx-orb:active,
  [data-theme="classic-dark"] .cx-orb:active,
  .cx-orb--dark:active {
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
  .cx-topbar-spacer {
    width: var(--festag-mobile-control-height-compact, 44px);
    height: var(--festag-mobile-control-height-compact, 44px);
    flex-shrink: 0;
  }
  .cx-topbar-right {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  /* Legacy pill — maps to orb group in dark */
  .cx-action-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    height: auto;
    padding: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .cx-action-pill-btn {
    width: var(--festag-mobile-control-height-compact, 44px);
    height: var(--festag-mobile-control-height-compact, 44px);
    border: 1px solid rgba(30, 30, 32, 0.08);
    border-radius: var(--festag-mobile-control-radius, 12px);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    background: var(--cx-orb-bg, #ffffff);
    color: var(--cx-orb-fg, #1d1d1f);
    box-shadow: var(--festag-mobile-control-shadow, 0 1px 2px rgba(0, 0, 0, 0.04));
    transition: transform 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
  }
  .cx-action-pill-btn:active {
    transform: scale(0.985);
    background: var(--cx-orb-bg-active, #f5f5f6);
    box-shadow: none;
  }
  [data-theme="dark"] .cx-action-pill-btn,
  [data-theme="classic-dark"] .cx-action-pill-btn,
  .cx-action-pill--dark .cx-action-pill-btn {
    --cx-orb-bg: var(--festag-black-popup, #1A2521);
    --cx-orb-bg-active: #2c2c2e;
    --cx-orb-fg: rgba(255, 255, 255, 0.92);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: var(--festag-mobile-control-shadow-dark, 0 1px 2px rgba(0, 0, 0, 0.32));
  }

  .cx-mobile-nav-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 14px;
  }
  .cx-mobile-nav-spacer {
    width: var(--festag-mobile-control-height-compact, 44px);
    height: var(--festag-mobile-control-height-compact, 44px);
    flex-shrink: 0;
  }
`
