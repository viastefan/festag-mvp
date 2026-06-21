import { DECISION_CSS } from '@/components/decisions/decisions-styles'

/** Desktop + shared Codex chrome for /project/[id] — imports full dec-os token stack. */
export const PROJECT_DETAIL_CSS = `
${DECISION_CSS}

  .pj-os.dec-os.pv {
    display: flex !important;
    flex-direction: column !important;
    grid-template-rows: unset !important;
    background: var(--portal-canvas, var(--surface, #f4f4f5)) !important;
  }

  .pj-os .pv-topbar,
  .pj-os .pv-tabs {
    display: none !important;
  }

  .pj-d-static-top {
    display: none;
    flex: 0 0 auto;
    background: var(--portal-card, #f7f7f8);
    border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }

  [data-theme="dark"] .pj-d-static-top,
  [data-theme="classic-dark"] .pj-d-static-top {
    background: var(--festag-black-canvas, #000);
  }

  .pj-d-page-head {
    max-width: var(--festag-content-max, 1080px);
    margin: 0 auto;
    padding: clamp(48px, 6vh, 72px) var(--festag-content-pad-x, 56px) 20px !important;
    box-sizing: border-box;
  }

  .pj-d-kicker {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 500;
    color: var(--dec-soft, var(--portal-muted));
    text-decoration: none;
    transition: color .12s;
  }
  .pj-d-kicker:hover { color: var(--dec-dark, var(--portal-text)); }

  .pj-d-title-row {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .pj-d-color-bar {
    width: 10px;
    height: 42px;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .pj-os .pj-d-page-head .dec-page-title {
    margin: 0;
    min-width: 0;
  }

  .pj-d-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 8px;
  }

  .pj-d-cta {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 36px;
    padding: 0 16px;
    border-radius: 999px;
    border: 0;
    background: var(--dec-cta-bg, #18181b);
    color: var(--dec-cta-text, #fafafa);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
    transition: background .14s, transform .1s;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.12), 0 2px 8px rgba(15,23,42,.12);
  }
  .pj-d-cta:hover { background: var(--dec-cta-hover, #000); }
  .pj-d-cta.ghost {
    background: var(--festag-elev-bg, #fff);
    color: var(--dec-dark, #0f0f10);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    box-shadow: var(--festag-elev-shadow, 0 2px 6px rgba(15,23,42,.06));
  }
  .pj-d-cta.ghost:hover {
    background: var(--festag-elev-active-bg, #f5f5f7);
  }
  .pj-d-cta.muted {
    opacity: .55;
    cursor: not-allowed;
    pointer-events: none;
  }

  .pj-d-tab-row {
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: var(--festag-content-max, 1080px);
    margin: 0 auto;
    padding: 0 var(--festag-content-pad-x, 56px) 18px;
    box-sizing: border-box;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .pj-d-tab-row::-webkit-scrollbar { display: none; }

  .pj-d-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--dec-soft, var(--portal-muted));
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    text-decoration: none;
    transition: background .12s, color .12s, border-color .12s, box-shadow .12s;
  }
  .pj-d-tab:hover {
    color: var(--dec-dark, var(--portal-text));
    background: color-mix(in srgb, var(--portal-card) 80%, transparent);
  }
  .pj-d-tab.on {
    background: var(--festag-elev-bg, #fff);
    color: var(--dec-dark, var(--portal-text));
    border-color: color-mix(in srgb, var(--border) 65%, transparent);
    box-shadow: var(--festag-elev-shadow, 0 2px 6px rgba(15,23,42,.06));
  }

  [data-theme="dark"] .pj-d-tab.on,
  [data-theme="classic-dark"] .pj-d-tab.on {
    background: var(--festag-black-popup, #121214);
    border-color: rgba(255,255,255,.12);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 2px 8px rgba(0,0,0,.35);
  }

  .pj-os .pv-body {
    flex: 1 1 auto;
    min-height: 0;
    background: var(--portal-canvas, var(--surface, #f4f4f5));
  }

  .pj-os .pv-main {
    padding: 32px clamp(20px, 4vw, 56px) 48px !important;
    max-width: calc(var(--festag-content-max, 1080px) + 320px);
  }

  .pj-os .pv-sidebar {
    background: var(--portal-card, #f7f7f8) !important;
    border-left: 1px solid color-mix(in srgb, var(--border) 55%, transparent) !important;
    border-radius: 16px 0 0 0;
    margin-top: 8px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.65);
  }

  [data-theme="dark"] .pj-os .pv-sidebar,
  [data-theme="classic-dark"] .pj-os .pv-sidebar {
    background: var(--festag-black-content, #0c0c0e) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
  }

  .pj-os .pv-latest,
  .pj-os .pv-ms-card,
  .pj-os .pv-composer,
  .pj-os .pv-tasks-add {
    background: var(--festag-elev-bg, #fff) !important;
    border: 1px solid color-mix(in srgb, var(--border) 60%, transparent) !important;
    box-shadow: var(--festag-elev-shadow, 0 2px 6px rgba(15,23,42,.05)) !important;
    border-radius: 14px !important;
  }

  [data-theme="dark"] .pj-os .pv-latest,
  [data-theme="dark"] .pj-os .pv-ms-card,
  [data-theme="dark"] .pj-os .pv-composer,
  [data-theme="dark"] .pj-os .pv-tasks-add,
  [data-theme="classic-dark"] .pj-os .pv-latest,
  [data-theme="classic-dark"] .pj-os .pv-ms-card,
  [data-theme="classic-dark"] .pj-os .pv-composer,
  [data-theme="classic-dark"] .pj-os .pv-tasks-add {
    background: var(--festag-black-content, #0c0c0e) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 2px 8px rgba(0,0,0,.35) !important;
  }

  .pj-os .pv-hero-title {
    font-size: clamp(28px, 3.2vw, 36px) !important;
    letter-spacing: -0.02em !important;
    font-weight: 500 !important;
  }

  @media (min-width: 921px) {
    .pj-d-static-top { display: block; }
    .pj-m-head, .pj-m-tabs { display: none !important; }
  }

  .pj-d-menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 10px;
    border-radius: 8px;
    border: 0;
    background: transparent;
    color: var(--dec-dark, var(--text));
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
  }
  .pj-d-menu-item:hover { background: color-mix(in srgb, var(--surface-2) 80%, transparent); }
  .pj-d-menu-item.danger { color: var(--red, #d14343); }
  .pj-d-menu-item.danger:hover { background: color-mix(in srgb, var(--red, #d14343) 10%, transparent); }
`
