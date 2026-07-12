/** Shared premium polish for the client portal shell and surfaces. */
export const PORTAL_PREMIUM_CSS = `
  .portal-app-shell {
    --portal-premium-radius: 22px;
    --portal-premium-radius-lg: 26px;
    --portal-premium-shadow: var(--festag-glass-shadow,
      0 1px 0 rgba(255, 255, 255, 0.72) inset,
      0 8px 28px rgba(15, 23, 42, 0.05));
    --portal-premium-shadow-soft: var(--festag-glass-shadow-soft,
      0 1px 0 rgba(255, 255, 255, 0.55) inset,
      0 4px 16px rgba(15, 23, 42, 0.04));
    --portal-premium-border: 0;
    --portal-premium-surface: var(--festag-glass-bg, rgba(255, 255, 255, 0.58));
    --portal-premium-muted-surface: var(--festag-glass-bg-soft, rgba(255, 255, 255, 0.42));
    --portal-premium-line: rgba(15, 23, 42, 0.06);
    --portal-premium-text-secondary: #6e6e73;
    --portal-premium-blur: var(--festag-glass-blur, blur(18px) saturate(155%));
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  [data-theme="dark"] .portal-app-shell,
  [data-theme="classic-dark"] .portal-app-shell {
    --portal-premium-shadow: 0 12px 40px rgba(0, 0, 0, 0.42);
    --portal-premium-shadow-soft: 0 8px 28px rgba(0, 0, 0, 0.34);
    --portal-premium-border: 0;
    --portal-premium-surface: var(--surface-0, #1C1C1E);
    --portal-premium-muted-surface: var(--festag-black-popup, #121214);
    --portal-premium-line: rgba(255, 255, 255, 0.07);
    --portal-premium-text-secondary: #8e8e93;
    --portal-premium-blur: none;
  }

  @media (min-width: 901px) {
    .portal-app-shell {
      background:
        radial-gradient(1200px 600px at 12% -8%, rgba(255, 255, 255, 0.72), transparent 58%),
        radial-gradient(900px 500px at 88% 0%, rgba(220, 224, 232, 0.95), transparent 55%),
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
      border: 0 !important;
      box-shadow: var(--portal-premium-shadow) !important;
      background: var(--portal-premium-surface) !important;
      backdrop-filter: var(--portal-premium-blur) !important;
      -webkit-backdrop-filter: var(--portal-premium-blur) !important;
    }
    [data-theme="dark"] .portal-app-main,
    [data-theme="classic-dark"] .portal-app-main {
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      border: 1px solid rgba(255, 255, 255, 0.06) !important;
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
