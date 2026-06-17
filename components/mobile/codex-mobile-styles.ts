/** Shared Codex-inspired mobile chrome — soft orbs, no strokes. */
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
    background: var(--cx-orb-bg, #fff);
    color: var(--cx-orb-fg, #1c1c1e);
    box-shadow:
      0 2px 10px rgba(0, 0, 0, 0.07),
      0 1px 3px rgba(0, 0, 0, 0.04);
    transition: transform 0.14s ease, background 0.14s ease;
  }
  .cx-orb:active {
    transform: scale(0.96);
    background: var(--cx-orb-bg-active, #f8f8f8);
  }
  .cx-orb:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .cx-orb--dark {
    --cx-orb-bg: rgba(255, 255, 255, 0.1);
    --cx-orb-bg-active: rgba(255, 255, 255, 0.14);
    --cx-orb-fg: rgba(255, 255, 255, 0.88);
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
`
