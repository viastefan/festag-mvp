/** Shared popover / filter menu styles for the Dev Panel shell. */
export const DEV_SHELL_MENU_CSS = `
  .dev-filter-wrap { position: relative; display: inline-flex; }
  .dev-filter-trigger {
    display: inline-flex; align-items: center; gap: 6px;
    height: 32px; padding: 0 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    background: transparent;
    color: var(--text-muted);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 13px; font-weight: 400; letter-spacing: 0;
    cursor: pointer;
    transition: background .12s ease, border-color .12s ease, color .12s ease;
    white-space: nowrap;
  }
  .dev-filter-trigger:hover,
  .dev-filter-trigger.on {
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
    border-color: color-mix(in srgb, var(--border) 100%, transparent);
    color: var(--text);
  }

  .dev-menu {
    position: absolute; top: calc(100% + 6px); left: 0; z-index: 40;
    min-width: 200px; width: max-content; max-width: min(280px, 90vw);
    padding: 4px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
    background: var(--surface);
    box-shadow:
      0 4px 14px rgba(15,23,42,.07),
      0 16px 36px -12px rgba(15,23,42,.14);
    display: flex; flex-direction: column; gap: 1px;
    animation: devMenuIn .16s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes devMenuIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: none; }
  }
  [data-theme="dark"] .dev-menu,
  [data-theme="classic-dark"] .dev-menu {
    background: color-mix(in srgb, var(--surface) 94%, #101215);
    border-color: rgba(255,255,255,.1);
    box-shadow: 0 16px 40px -12px rgba(0,0,0,.45);
  }

  .dev-menu-label {
    margin: 6px 10px 4px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 11px; font-weight: 400; letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .dev-menu-item {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    width: 100%; min-height: 36px; padding: 0 10px;
    border: 0; border-radius: 6px !important;
    background: transparent;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 14px; font-weight: 400; letter-spacing: 0;
    color: var(--text); text-align: left; cursor: pointer;
    white-space: nowrap;
    transition: background .12s ease, color .12s ease;
  }
  .dev-menu-item:hover { background: color-mix(in srgb, var(--surface-2) 80%, transparent); }
  .dev-menu-item.on { background: color-mix(in srgb, var(--surface-2) 95%, transparent); }
  .dev-menu-check { font-size: 13px; color: var(--text-muted); flex-shrink: 0; }

  [data-theme="dark"] .dev-menu-item:hover,
  [data-theme="classic-dark"] .dev-menu-item:hover {
    background: rgba(255,255,255,.06);
  }
  [data-theme="dark"] .dev-menu-item.on,
  [data-theme="classic-dark"] .dev-menu-item.on {
    background: rgba(255,255,255,.08);
  }

  .festag-app-shell .app-footer-theme-menu,
  .festag-app-shell .app-footer-theme-option {
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-weight: 400;
  }
  .festag-app-shell .app-footer-theme-option { font-size: 14px; }

  .festag-app-shell .dev-page select,
  .festag-app-shell .dev-page .dec-composer select {
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-weight: 400;
    font-size: 13px;
  }
`
