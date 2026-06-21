/** Shared mobile layout for Dev Panel content pages. */
export const DEV_MOBILE_PAGE_CSS = `
  .dmp-page {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 28px 48px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .dmp-head { margin-bottom: 24px; }
  .dmp-kicker {
    margin: 0 0 6px;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .dmp-title {
    margin: 0;
    font-size: 24px;
    font-weight: 400;
    letter-spacing: -0.02em;
    line-height: 1.12;
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
  }
  .dmp-lead {
    margin: 8px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  .dmp-card {
    padding: 20px;
    margin-bottom: 16px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--card);
  }
  .dmp-card-meta {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--text-muted);
  }
  .dmp-textarea {
    width: 100%;
    min-height: 140px;
    border-radius: 12px;
    border: 1px solid var(--border);
    padding: 14px;
    font-size: 15px;
    line-height: 1.5;
    resize: vertical;
    font-family: inherit;
    background: var(--surface);
    color: var(--text);
    box-sizing: border-box;
  }
  .dmp-textarea:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  }
  .dmp-actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
    flex-wrap: wrap;
  }
  .dmp-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 999px;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .14s ease, transform .14s ease;
  }
  .dmp-btn:active:not(:disabled) { transform: scale(0.98); }
  .dmp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .dmp-btn-ghost {
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text);
  }
  .dmp-btn-primary {
    border: 0;
    background: var(--accent, #5b647d);
    color: var(--accent-text, #fff);
  }
  .dmp-preview-label {
    margin: 0 0 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }
  .dmp-preview-body {
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--text);
  }
  .dmp-preview-card {
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  }
  .dmp-tip {
    font-size: 13px;
    color: var(--text-muted);
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }
  .dmp-done-links {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    flex-wrap: wrap;
  }
  .dmp-link {
    font-size: 13px;
    color: var(--accent);
    text-decoration: none;
  }
  .dmp-link-muted {
    font-size: 13px;
    border: 0;
    background: transparent;
    cursor: pointer;
    color: var(--text-muted);
    font: inherit;
  }

  .dmp-sticky-bar {
    display: none;
  }

  @media (max-width: 768px) {
    .dmp-page {
      padding: 16px 14px calc(120px + env(safe-area-inset-bottom, 0px));
    }
    .dmp-head { margin-bottom: 18px; }
    .dmp-title { font-size: 21px; }
    .dmp-lead { font-size: 13px; }
    .dmp-card { padding: 16px; border-radius: 12px; }
    .dmp-textarea {
      min-height: 160px;
      font-size: 16px;
    }
    .dmp-actions--inline { display: none; }
    .dmp-sticky-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      position: fixed;
      left: 14px;
      right: 14px;
      bottom: calc(82px + env(safe-area-inset-bottom, 0px));
      z-index: 188;
      padding: 8px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--card) 92%, transparent);
      border: 1px solid var(--border);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    [data-theme='dark'] .dmp-sticky-bar,
    [data-theme='classic-dark'] .dmp-sticky-bar {
      background: color-mix(in srgb, #121214 88%, transparent);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.42);
    }
    .dmp-sticky-bar .dmp-btn { flex: 1 1 auto; min-width: 0; }
    .dmp-sticky-bar .dmp-btn-icon {
      flex: 0 0 auto;
      width: 40px;
      padding: 0;
    }
  }
`

/** Global Dev Panel mobile polish — injected once in DevAppShell. */
export const DEV_SHELL_MOBILE_CSS = `
  @media (max-width: 768px) {
    body.festag-dev-dock .dev-page-header > div:last-child:not(:only-child) .teb,
    body.festag-dev-dock .dev-page-header .teb,
    body.festag-dev-dock .r-head .r-refresh:first-child {
      display: none !important;
    }

    .dev-page-header > div:last-child:not(:only-child) {
      display: flex;
      gap: 8px;
      flex-wrap: nowrap;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      max-width: 100%;
      padding-bottom: 2px;
    }
    .dev-page-header > div:last-child:not(:only-child)::-webkit-scrollbar { display: none; }
    .dev-page-header > div:last-child:not(:only-child) .dev-secondary-btn,
    .dev-page-header > div:last-child:not(:only-child) .dev-primary-btn,
    .dev-page-header > div:last-child:not(:only-child) .link-btn {
      flex-shrink: 0;
    }

    .dev-mobile-quick {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      margin: -6px 0 16px;
      padding: 2px 0 4px;
    }
    .dev-mobile-quick::-webkit-scrollbar { display: none; }
    .dev-mobile-quick a,
    .dev-mobile-quick button {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 34px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: color-mix(in srgb, var(--surface-2) 55%, var(--surface));
      color: var(--text);
      font: inherit;
      font-size: 12.5px;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .dev-mobile-quick a.on,
    .dev-mobile-quick button.on {
      background: var(--text);
      color: var(--bg);
      border-color: var(--text);
    }

    .dev-kpi-grid { gap: 8px; }
    .dev-kpi { padding: 12px; }
    .dev-kpi strong { font-size: 16px; }

    .r-toolbar {
      position: sticky;
      top: 0;
      z-index: 4;
      padding: 8px 0 10px;
      margin-bottom: 8px;
      background: color-mix(in srgb, var(--bg) 92%, transparent);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .r-trust { font-size: 11px; padding: 8px 10px; }

    .dmp-vis-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
    .dmp-vis-head-actions { display: none; }
  }

  @media (min-width: 769px) {
    .dev-mobile-quick { display: none; }
  }
`
