/** Shared premium polish for the client portal shell and surfaces. */
export const PORTAL_PREMIUM_CSS = `
  .portal-app-shell {
    --portal-premium-radius: 22px;
    --portal-premium-radius-lg: 26px;
    --portal-premium-shadow:
      0 0 0 1px rgba(15, 23, 42, 0.04),
      0 1px 2px rgba(15, 23, 42, 0.03),
      0 10px 36px rgba(15, 23, 42, 0.07);
    --portal-premium-shadow-soft:
      0 0 0 1px rgba(15, 23, 42, 0.035),
      0 6px 24px rgba(15, 23, 42, 0.05);
    --portal-premium-border: 1px solid rgba(15, 23, 42, 0.07);
    --portal-premium-surface: #ffffff;
    --portal-premium-muted-surface: #f7f7f8;
    --portal-premium-line: rgba(15, 23, 42, 0.06);
    --portal-premium-text-secondary: #6e6e73;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  [data-theme="dark"] .portal-app-shell,
  [data-theme="classic-dark"] .portal-app-shell {
    --portal-premium-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.06),
      0 12px 40px rgba(0, 0, 0, 0.42);
    --portal-premium-shadow-soft:
      0 0 0 1px rgba(255, 255, 255, 0.05),
      0 8px 28px rgba(0, 0, 0, 0.34);
    --portal-premium-border: 1px solid rgba(255, 255, 255, 0.08);
    --portal-premium-surface: var(--festag-black-content, #111114);
    --portal-premium-muted-surface: var(--festag-black-popup, #121214);
    --portal-premium-line: rgba(255, 255, 255, 0.07);
    --portal-premium-text-secondary: #8e8e93;
  }

  @media (min-width: 901px) {
    .portal-app-shell {
      background:
        radial-gradient(1200px 600px at 12% -8%, rgba(255, 255, 255, 0.92), transparent 58%),
        radial-gradient(900px 500px at 88% 0%, rgba(235, 238, 245, 0.9), transparent 55%),
        var(--portal-bg, #ebebed);
    }
    [data-theme="dark"] .portal-app-shell,
    [data-theme="classic-dark"] .portal-app-shell {
      background:
        radial-gradient(900px 520px at 10% -6%, rgba(255, 255, 255, 0.04), transparent 58%),
        radial-gradient(700px 420px at 92% 0%, rgba(120, 120, 140, 0.08), transparent 55%),
        var(--portal-bg, #000000);
    }
    .portal-app-main {
      border-radius: var(--portal-premium-radius-lg) !important;
      border: var(--portal-premium-border) !important;
      box-shadow: var(--portal-premium-shadow) !important;
      background: var(--portal-premium-surface) !important;
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
