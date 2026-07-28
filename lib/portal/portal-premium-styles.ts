/** Shared elevated polish for the client portal shell and surfaces. */
export const PORTAL_PREMIUM_CSS = `
  .portal-app-shell {
    --portal-premium-radius: var(--festag-plate-radius, 12px);
    --portal-premium-radius-lg: var(--festag-plate-radius, 12px);
    --portal-premium-shadow: var(--festag-plate-shadow);
    --portal-premium-shadow-soft: var(--festag-plate-shadow-soft);
    --portal-premium-border: 1px solid var(--festag-plate-border, rgba(15, 23, 42, 0.055));
    --portal-premium-surface: var(--festag-plate-bg, #FFFFFF);
    --portal-premium-muted-surface: color-mix(in srgb, var(--festag-plate-bg, #FFFFFF) 92%, var(--festag-portal-canvas-desktop, #E8E9ED) 8%);
    --portal-premium-line: var(--festag-plate-border, rgba(15, 23, 42, 0.055));
    --portal-premium-text-secondary: #6e6e73;
    --portal-premium-blur: none;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  [data-theme="dark"] .portal-app-shell,
  [data-theme="classic-dark"] .portal-app-shell {
    --portal-premium-shadow: var(--festag-plate-shadow);
    --portal-premium-shadow-soft: var(--festag-plate-shadow-soft);
    --portal-premium-border: 1px solid var(--festag-plate-border, rgba(255, 255, 255, 0.07));
    --portal-premium-surface: var(--festag-plate-bg, var(--festag-black-content, #0E0E10));
    --portal-premium-muted-surface: var(--festag-night-fill, rgba(255, 255, 255, 0.055));
    --portal-premium-line: var(--festag-plate-border, rgba(255, 255, 255, 0.07));
    --portal-premium-text-secondary: var(--festag-night-ink-2, rgba(228, 228, 234, 0.58));
    --portal-premium-blur: none;
    --portal-premium-radius: var(--festag-plate-radius, 12px);
    --portal-premium-radius-lg: var(--festag-plate-radius, 12px);
  }

  @media (min-width: 769px) {
    .portal-app-shell {
      background:
        radial-gradient(1100px 520px at 10% -12%, rgba(255, 255, 255, 0.78), transparent 62%),
        radial-gradient(900px 480px at 92% 4%, rgba(214, 218, 228, 0.55), transparent 58%),
        linear-gradient(180deg, #ECEDEF 0%, var(--festag-portal-canvas-desktop, #E8E9ED) 100%);
    }
    [data-theme="dark"] .portal-app-shell,
    [data-theme="classic-dark"] .portal-app-shell {
      background: var(--festag-black-canvas, #070708);
    }
    .portal-app-main {
      border-radius: var(--festag-plate-radius, 12px) !important;
      border-top-left-radius: 0 !important;
      border-bottom-left-radius: 0 !important;
      border: 1px solid var(--festag-plate-border, rgba(15, 23, 42, 0.055)) !important;
      box-shadow: var(--festag-plate-shadow) !important;
      background: var(--festag-plate-bg, #FFFFFF) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    .portal-app-shell.portal-sidebar-collapsed .portal-app-main {
      border-top-left-radius: var(--festag-plate-radius, 12px) !important;
      border-bottom-left-radius: var(--festag-plate-radius, 12px) !important;
    }
    [data-theme="dark"] .portal-app-main,
    [data-theme="classic-dark"] .portal-app-main {
      border-radius: var(--festag-plate-radius, 12px) !important;
      border-top-left-radius: 0 !important;
      border-bottom-left-radius: 0 !important;
      border: 1px solid var(--festag-plate-border, rgba(255, 255, 255, 0.07)) !important;
      box-shadow: var(--festag-plate-shadow) !important;
      background: var(--festag-plate-bg, var(--festag-black-content, #0E0E10)) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    [data-theme="dark"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main,
    [data-theme="classic-dark"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main {
      border-top-left-radius: var(--festag-plate-radius, 12px) !important;
      border-bottom-left-radius: var(--festag-plate-radius, 12px) !important;
    }
    [data-theme="dark"] .portal-app-main-col,
    [data-theme="classic-dark"] .portal-app-main-col,
    [data-theme="dark"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main-col,
    [data-theme="classic-dark"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main-col {
      padding: var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) 0 !important;
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
