import {
  FESTAG_CONTENT_HEAD_CSS,
  FESTAG_MOBILE_HEAD_CSS,
  FESTAG_SCROLL_FADE_CSS,
} from '@/components/mobile/mobile-codex-list-styles'

/** Shell + mobile chrome for /project/[id] — aligns with dec-os portal surfaces. */
export const PROJECT_VIEW_SHELL_CSS = `
${FESTAG_CONTENT_HEAD_CSS}
${FESTAG_MOBILE_HEAD_CSS}
${FESTAG_SCROLL_FADE_CSS}

  .pj-os.dec-os.pv {
    --pj-soft: var(--portal-muted, #8f93a4);
    --pj-text: var(--portal-text, #0f0f10);
    --pj-card: var(--portal-card, #f7f7f8);
    --pj-surface: var(--portal-card, #f7f7f8);
    --pv-page-bg: var(--portal-canvas, var(--surface, #f4f4f5));
    --pv-muted: var(--portal-muted, #71717a);
    --pv-soft: var(--portal-muted, #52525b);
    width: 100%;
    height: 100%;
    min-height: 0;
    color: var(--pj-text);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-weight: 400;
    letter-spacing: 0;
    position: relative;
    overflow: hidden;
  }

  [data-theme="dark"] .pj-os.dec-os.pv,
  [data-theme="classic-dark"] .pj-os.dec-os.pv {
    --pj-soft: var(--portal-muted, #9aa0ac);
    --pj-text: var(--portal-text, #f4f4f4);
    --pj-card: var(--festag-black-content, #0c0c0e);
    --pj-surface: var(--festag-black-content, #0c0c0e);
    --pv-page-bg: var(--festag-black-canvas, #000000);
    --pv-muted: #9aa0ac;
    --pv-soft: #b7bdc8;
  }

  .pj-m-head,
  .pj-m-tabs,
  .pj-fab-desktop { display: none; }

  .pj-os .pv-topbar,
  .pj-os .pv-tabs {
    background: color-mix(in srgb, var(--pj-card) 88%, transparent);
  }

  [data-theme="dark"] .pj-os .pv-latest,
  [data-theme="classic-dark"] .pj-os .pv-latest,
  [data-theme="dark"] .pj-os .pv-ms-card,
  [data-theme="classic-dark"] .pj-os .pv-ms-card,
  [data-theme="dark"] .pj-os .pv-composer,
  [data-theme="classic-dark"] .pj-os .pv-composer,
  [data-theme="dark"] .pj-os .pv-tasks-add,
  [data-theme="classic-dark"] .pj-os .pv-tasks-add {
    background: var(--pj-card);
    border-color: color-mix(in srgb, var(--border) 55%, transparent);
  }

  [data-theme="dark"] .pj-os .pv-tagro-btn,
  [data-theme="classic-dark"] .pj-os .pv-tagro-btn {
    background: #ffffff;
    color: #121214;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 2px 8px rgba(0,0,0,.35);
  }

  [data-theme="dark"] .pj-os .pv-tagro-btn:hover,
  [data-theme="classic-dark"] .pj-os .pv-tagro-btn:hover {
    background: #f0f0f2;
  }

  [data-theme="dark"] .pj-os .pv-sidebar,
  [data-theme="classic-dark"] .pj-os .pv-sidebar {
    background: color-mix(in srgb, var(--pj-card) 72%, transparent);
  }

  .pj-fab-desktop {
    position: fixed;
    right: calc(var(--portal-sidebar-width, 240px) + 28px);
    bottom: 28px;
    z-index: 14;
    pointer-events: none;
  }
  .pj-fab-desktop .festag-content-fab {
    pointer-events: auto;
  }

  @media (max-width: 920px) {
    .pj-os.pv {
      grid-template-rows: auto auto minmax(0, 1fr) !important;
    }

    .pj-m-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px 10px;
      flex-shrink: 0;
      position: relative;
      z-index: 6;
      background: var(--pv-page-bg);
    }

    .pj-m-title {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .pj-m-kicker {
      margin: 0;
      font-size: 13px;
      font-weight: 500;
      color: var(--pj-soft);
      letter-spacing: 0.02em;
    }

    .pj-m-title h1 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 29px;
      font-weight: 500;
      line-height: 1.08;
      letter-spacing: -0.02em;
      color: var(--pj-text);
      min-width: 0;
    }

    .pj-m-title h1 span:last-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pj-m-dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .pj-os .pv-topbar { display: none !important; }

    .pj-m-tabs {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 14px 8px;
      overflow-x: auto;
      scrollbar-width: none;
      flex-shrink: 0;
      border-bottom: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
      background: var(--pv-page-bg);
    }
    .pj-m-tabs::-webkit-scrollbar { display: none; }

    .pj-m-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--pv-soft);
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      text-decoration: none;
      transition: background .12s, color .12s, border-color .12s;
    }
    .pj-m-tab.on {
      background: color-mix(in srgb, var(--pj-card) 90%, transparent);
      border-color: color-mix(in srgb, var(--border) 50%, transparent);
      color: var(--pj-text);
    }

    .pj-os .pv-tabs { display: none !important; }

    .pj-os .pv-main {
      padding: 20px 16px calc(120px + env(safe-area-inset-bottom, 0px)) !important;
    }

    .pj-fab-desktop { display: none !important; }

    [data-theme="dark"] .pj-m-head .cx-action-pill,
    [data-theme="classic-dark"] .pj-m-head .cx-action-pill {
      background: var(--festag-black-popup, #121214) !important;
      border: 1px solid rgba(255,255,255,.12) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 2px 8px rgba(0,0,0,.42) !important;
    }
  }

  @media (min-width: 921px) {
    .pj-fab-desktop { display: block; }
  }
`
