/** Client Portal topbar — mirrors Dev `.dv-topbar` density, client-facing actions only. */

export const PORTAL_TOPBAR_CSS = `
  .ptb {
    --ptb-h: 48px;
    display: none;
    flex: 0 0 auto;
    align-items: center;
    gap: 8px;
    height: var(--ptb-h);
    padding: 0 14px 0 16px;
    box-sizing: border-box;
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    background: color-mix(in srgb, var(--portal-card, #fff) 88%, transparent);
    backdrop-filter: blur(12px) saturate(1.08);
    -webkit-backdrop-filter: blur(12px) saturate(1.08);
    z-index: 20;
  }

  @media (min-width: 769px) {
    .ptb {
      display: flex;
    }
  }

  [data-theme="dark"] .ptb,
  [data-theme="classic-dark"] .ptb {
    border-bottom-color: rgba(255, 255, 255, 0.05);
    background: color-mix(in srgb, var(--festag-black-content, #0E0E10) 82%, transparent);
  }

  .ptb-crumbs {
    display: flex;
    align-items: center;
    min-width: 0;
    flex: 0 1 auto;
    font-size: 13px;
    letter-spacing: 0.01em;
    color: var(--portal-muted, #86868B);
  }
  .ptb-crumb {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--portal-text, #1D1D1F);
    font-weight: 500;
  }
  [data-theme="dark"] .ptb-crumb,
  [data-theme="classic-dark"] .ptb-crumb {
    color: var(--festag-night-ink, #E8EAF0);
  }

  .ptb-spacer {
    flex: 1 1 auto;
    min-width: 8px;
  }

  .ptb-search {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 30px;
    min-width: 200px;
    max-width: 280px;
    padding: 0 8px 0 10px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 8px;
    background: var(--portal-raised, #FAFAFA);
    color: var(--portal-muted, #86868B);
    font: inherit;
    font-size: 12.5px;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: border-color 0.12s ease, color 0.12s ease, background 0.12s ease;
  }
  .ptb-search:hover {
    border-color: rgba(15, 23, 42, 0.14);
    color: var(--portal-text, #1D1D1F);
  }
  [data-theme="dark"] .ptb-search,
  [data-theme="classic-dark"] .ptb-search {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
    color: var(--festag-night-ink-3, #8B909E);
  }
  [data-theme="dark"] .ptb-search:hover,
  [data-theme="classic-dark"] .ptb-search:hover {
    border-color: rgba(255, 255, 255, 0.14);
    color: var(--festag-night-ink, #E8EAF0);
  }
  .ptb-search-label {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ptb-kbd {
    display: inline-flex;
    align-items: center;
    height: 18px;
    padding: 0 5px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 5px;
    background: var(--portal-card, #fff);
    color: var(--portal-muted, #86868B);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.02em;
    flex: 0 0 auto;
  }
  [data-theme="dark"] .ptb-kbd,
  [data-theme="classic-dark"] .ptb-kbd {
    background: rgba(0, 0, 0, 0.35);
    border-color: rgba(255, 255, 255, 0.08);
    color: var(--festag-night-ink-3, #8B909E);
  }

  .ptb-icon-btn,
  .ptb .fui-icon-btn.ptb-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    min-width: 30px;
    min-height: 30px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--portal-nav-util, #6E6E73);
    cursor: pointer;
    box-shadow: none;
    flex-shrink: 0;
  }
  .ptb-icon-btn:hover,
  .ptb .fui-icon-btn.ptb-icon-btn:hover:not(:disabled) {
    background: var(--portal-nav-hover-bg, rgba(0, 0, 0, 0.05));
    color: var(--portal-nav-util-hover, #3C3C3C);
    box-shadow: none;
    transform: none;
  }
  [data-theme="dark"] .ptb-icon-btn,
  [data-theme="classic-dark"] .ptb-icon-btn {
    color: var(--portal-nav-util, #8B909E);
  }
  [data-theme="dark"] .ptb-icon-btn:hover,
  [data-theme="classic-dark"] .ptb-icon-btn:hover {
    background: var(--portal-nav-hover-bg, rgba(255, 255, 255, 0.06));
    color: var(--festag-night-ink, #E8EAF0);
  }

  .ptb-bell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .ptb-bell .nb-trigger.portal {
    width: 30px !important;
    min-width: 30px !important;
    height: 30px !important;
    min-height: 30px !important;
    padding: 0 !important;
    border-radius: 8px !important;
    color: var(--portal-nav-util, #6E6E73) !important;
    background: transparent !important;
  }
  .ptb-bell .nb-trigger.portal:hover,
  .ptb-bell .nb-trigger.portal[aria-expanded="true"] {
    background: var(--portal-nav-hover-bg, rgba(0, 0, 0, 0.05)) !important;
  }
  [data-theme="dark"] .ptb-bell .nb-trigger.portal,
  [data-theme="classic-dark"] .ptb-bell .nb-trigger.portal {
    color: var(--portal-nav-util, #8B909E) !important;
  }
  [data-theme="dark"] .ptb-bell .nb-trigger.portal:hover,
  [data-theme="classic-dark"] .ptb-bell .nb-trigger.portal:hover {
    background: var(--portal-nav-hover-bg, rgba(255, 255, 255, 0.06)) !important;
  }

  .ptb-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    text-decoration: none;
    background: var(--portal-nav-avatar-bg, #f4f4f5);
    border: 1px solid var(--portal-nav-avatar-border, rgba(0, 0, 0, 0.08));
    color: var(--portal-text, #1D1D1F);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .ptb-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  [data-theme="dark"] .ptb-avatar,
  [data-theme="classic-dark"] .ptb-avatar {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
    color: var(--festag-night-ink, #E8EAF0);
  }

  /* Content below topbar fills remaining plate height */
  .portal-app-main > .ptb + * {
    flex: 1 1 auto;
    min-height: 0;
  }
`
