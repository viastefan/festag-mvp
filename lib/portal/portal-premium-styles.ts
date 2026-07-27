/** Shared premium polish for the client portal shell and surfaces. */
export const PORTAL_PREMIUM_CSS = `
  .portal-app-shell {
    --portal-premium-radius: 18px;
    --portal-premium-radius-lg: 20px;
    --portal-premium-shadow: var(--festag-glass-shadow,
      0 1px 0 rgba(255, 255, 255, 0.72) inset,
      0 8px 28px rgba(15, 23, 42, 0.05));
    --portal-premium-shadow-soft: var(--festag-glass-shadow-soft,
      0 1px 0 rgba(255, 255, 255, 0.55) inset,
      0 4px 16px rgba(15, 23, 42, 0.04));
    --portal-premium-border: 0;
    --portal-premium-surface: var(--festag-content-panel, #FFFFFF);
    --portal-premium-muted-surface: color-mix(in srgb, var(--festag-content-panel, #FFFFFF) 92%, var(--workspace-bg, #EBEBED) 8%);
    --portal-premium-line: rgba(15, 23, 42, 0.06);
    --portal-premium-text-secondary: #6e6e73;
    --portal-premium-blur: none;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  [data-theme="dark"] .portal-app-shell,
  [data-theme="classic-dark"] .portal-app-shell {
    --portal-premium-shadow: none;
    --portal-premium-shadow-soft: none;
    --portal-premium-border: 0;
    --portal-premium-surface: transparent;
    --portal-premium-muted-surface: rgba(255, 255, 255, 0.06);
    --portal-premium-line: rgba(255, 255, 255, 0.08);
    --portal-premium-text-secondary: #8e8e93;
    --portal-premium-blur: none;
    --portal-premium-radius: 0;
    --portal-premium-radius-lg: 0;
  }

  @media (min-width: 769px) {
    .portal-app-shell {
      background:
        radial-gradient(1200px 600px at 12% -8%, rgba(255, 255, 255, 0.72), transparent 58%),
        radial-gradient(900px 500px at 88% 0%, rgba(220, 224, 232, 0.95), transparent 55%),
        var(--festag-portal-canvas-desktop, var(--portal-bg, #ebebed));
    }
    [data-theme="dark"] .portal-app-shell,
    [data-theme="classic-dark"] .portal-app-shell {
      /* Pure OLED canvas — Cursor/Festag dark, no staged float plate */
      background: var(--festag-black-canvas, #000000);
    }
    .portal-app-main {
      border-radius: var(--portal-premium-radius-lg) !important;
      border: 1px solid var(--festag-content-panel-border, rgba(0, 0, 0, 0.08)) !important;
      box-shadow: var(--portal-premium-shadow) !important;
      background: var(--portal-premium-surface) !important;
      backdrop-filter: var(--portal-premium-blur) !important;
      -webkit-backdrop-filter: var(--portal-premium-blur) !important;
    }
    [data-theme="dark"] .portal-app-main,
    [data-theme="classic-dark"] .portal-app-main {
      border-radius: 0 !important;
      border: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    [data-theme="dark"] .portal-app-main-col,
    [data-theme="classic-dark"] .portal-app-main-col,
    [data-theme="dark"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main-col,
    [data-theme="classic-dark"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main-col {
      padding: 0 !important;
    }
  }

  .portal-app-shell .portal-nav-item.active {
    background: var(--portal-nav-active-bg);
    border-radius: 8px;
  }
  [data-theme="dark"] .portal-app-shell .portal-nav-item.active,
  [data-theme="classic-dark"] .portal-app-shell .portal-nav-item.active {
    background: var(--portal-nav-active-bg);
  }
  .portal-app-shell .portal-nav-recent-item.active {
    background: var(--portal-nav-active-bg);
    border-radius: 8px;
  }
  [data-theme="dark"] .portal-app-shell .portal-nav-recent-item.active,
  [data-theme="classic-dark"] .portal-app-shell .portal-nav-recent-item.active {
    background: var(--portal-nav-active-bg);
  }
  .portal-app-shell .portal-nav-ws {
    border-radius: 8px;
    transition: background .14s ease;
  }
  .portal-app-shell .portal-nav-ws:hover,
  .portal-app-shell .portal-nav-ws.is-open {
    background: var(--portal-nav-hover-bg);
  }
`
