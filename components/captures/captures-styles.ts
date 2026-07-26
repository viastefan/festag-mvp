/** Freigaben (Captures) — extends portal/decision list chrome. */
export const CAPTURES_CSS = `
  .cap-filters {
    display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap;
  }
  .cap-filter {
    padding: 7px 14px; border-radius: 12px;
    border: 1px solid var(--portal-btn-outline-border, rgba(24, 24, 27, 0.08));
    background: var(--portal-raised, var(--raised, #FAFAFA));
    color: var(--portal-muted, #71717A);
    font-size: 12px; cursor: pointer; font-family: inherit;
    white-space: nowrap;
    box-shadow: var(--shadow-xs, 0 1px 2px rgba(24, 24, 27, 0.04));
    transition: background .12s, color .12s, border-color .12s, box-shadow .12s;
  }
  .cap-filter:hover {
    color: var(--portal-text, #18181B);
    background: color-mix(in srgb, var(--portal-raised, #FAFAFA) 88%, var(--portal-bg, #F0F0F2) 12%);
    border-color: var(--border-strong, rgba(24, 24, 27, 0.14));
  }
  .cap-filter.on {
    background: var(--portal-raised, #FAFAFA);
    color: var(--portal-text, #18181B);
    border-color: var(--border-strong, rgba(24, 24, 27, 0.12));
    box-shadow: var(--shadow-sm, 0 2px 8px rgba(24, 24, 27, 0.06));
  }
  .cap-ext-promo {
    margin-bottom: 18px;
    max-width: 640px;
  }
  .cap-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: min(52vh, 420px);
    padding: 48px 24px 64px;
    animation: capEmptyIn .35s cubic-bezier(.16, 1, .3, 1) both;
  }
  @keyframes capEmptyIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: none; }
  }
  .cap-empty-title {
    margin: 0 0 10px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 17px;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--dec-dark, var(--portal-text, #18181B));
  }
  .cap-empty-desc {
    margin: 0;
    max-width: 420px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.55;
    color: var(--dec-soft, var(--portal-muted, #71717A));
  }
  .cap-header-record,
  .cap-head-record {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 14px;
    border: 1px solid var(--portal-btn-outline-border, rgba(24, 24, 27, 0.08));
    border-radius: 999px;
    background: var(--portal-raised, #FAFAFA);
    color: var(--dec-dark, var(--portal-text, #18181B));
    font: inherit;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: var(--shadow-xs, 0 1px 2px rgba(24, 24, 27, 0.04));
    transition: background .12s, border-color .12s, box-shadow .12s;
  }
  .cap-head-record:hover {
    background: color-mix(in srgb, var(--portal-raised, #FAFAFA) 88%, var(--portal-bg, #F0F0F2) 12%);
    border-color: var(--border-strong, rgba(24, 24, 27, 0.14));
  }
  .cap-head-record:active {
    transform: translateY(1px);
  }
  .cap-head-tool {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    padding: 0;
    flex-shrink: 0;
    box-sizing: border-box;
    border: 1px solid var(--portal-btn-outline-border, rgba(24, 24, 27, 0.08));
    border-radius: 50%;
    background: var(--portal-raised, #FAFAFA);
    color: var(--portal-muted, #71717A);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--shadow-xs, 0 1px 2px rgba(24, 24, 27, 0.04));
    transition: background .12s, box-shadow .12s, color .12s, transform .1s, border-color .12s;
  }
  .cap-head-tool svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }
  .cap-head-tool:hover {
    color: var(--portal-text, #18181B);
    background: color-mix(in srgb, var(--portal-raised, #FAFAFA) 88%, var(--portal-bg, #F0F0F2) 12%);
    border-color: var(--border-strong, rgba(24, 24, 27, 0.12));
  }
  .cap-head-tool:active {
    transform: translateY(1px);
  }
  .cap-m-filters {
    display: none;
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    flex: 1;
    min-width: 0;
  }
  .cap-m-filters::-webkit-scrollbar { display: none; }
  .cap-m-filters .cap-filter {
    flex-shrink: 0;
  }
  .cap-os .dec-m-ctl {
    border: 1px solid var(--portal-btn-outline-border, rgba(24, 24, 27, 0.08)) !important;
    background: var(--portal-raised, #FAFAFA) !important;
    color: var(--portal-text, #18181B) !important;
    box-shadow: var(--shadow-xs, 0 1px 2px rgba(24, 24, 27, 0.04)) !important;
  }
  .cap-os .dec-m-ctl.on {
    background: color-mix(in srgb, var(--portal-pill-bg, #E4E4E7) 55%, var(--portal-raised, #FAFAFA) 45%) !important;
  }
  .cap-os .dec-m-ctl.has-active::after {
    background: var(--portal-muted, #71717A) !important;
    box-shadow: 0 0 0 1.5px var(--portal-raised, #FAFAFA) !important;
  }
  .cap-capture-row {
    flex-wrap: wrap;
  }
  .cap-capture-row .dec-card-project a {
    color: inherit;
    text-decoration: none;
  }
  .cap-capture-row .dec-card-project a:hover {
    color: var(--dec-dark);
    text-decoration: underline;
  }
  .cap-capture-row .dec-card-actions {
    width: auto;
    min-width: 105px;
  }
  .cap-warn-list {
    width: 100%;
    flex-basis: 100%;
    margin-top: 4px;
    padding-top: 12px;
    border-top: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(24,24,27,.08)) 55%, transparent);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cap-warn-item {
    margin: 0;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--amber-bg, rgba(154,123,10,0.08));
    font-size: 12px;
    color: var(--dec-dark);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    line-height: 1.4;
  }
  .cap-changes {
    margin: 0;
    padding-left: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--dec-muted);
    font-size: 13px;
    line-height: 1.45;
  }
  .cap-changes strong { color: var(--dec-dark); font-weight: 500; }
  .cap-page-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    font-size: 12px;
    color: var(--dec-soft);
    text-decoration: none;
  }
  .cap-page-link:hover { color: var(--dec-dark); text-decoration: underline; }
  .cap-sent-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 500;
    color: var(--green-dark, #248A44);
  }
  @media (max-width: 768px) {
    .cap-m-filters { display: flex !important; }
  }

  /* Light mode — neutral raised controls (no black fills). */
  [data-theme="light"] .cap-os .mpd-primary,
  [data-theme="read"] .cap-os .mpd-primary,
  [data-theme="pure-light"] .cap-os .mpd-primary {
    background: var(--portal-raised, #FAFAFA) !important;
    color: var(--portal-text, #18181B) !important;
    border: 1px solid var(--portal-btn-outline-border, rgba(24, 24, 27, 0.08)) !important;
    box-shadow: var(--shadow-sm, 0 2px 8px rgba(24, 24, 27, 0.06)) !important;
  }
  [data-theme="light"] .cap-os .mpd-primary svg,
  [data-theme="read"] .cap-os .mpd-primary svg,
  [data-theme="pure-light"] .cap-os .mpd-primary svg {
    color: var(--portal-text, #18181B) !important;
  }
  [data-theme="light"] .cap-os .cap-capture-row .fui-pill-btn--primary,
  [data-theme="read"] .cap-os .cap-capture-row .fui-pill-btn--primary,
  [data-theme="pure-light"] .cap-os .cap-capture-row .fui-pill-btn--primary {
    background: var(--portal-raised, #FAFAFA) !important;
    color: var(--portal-text, #18181B) !important;
    border: 1px solid var(--portal-btn-outline-border, rgba(24, 24, 27, 0.08)) !important;
    box-shadow: var(--shadow-xs, 0 1px 2px rgba(24, 24, 27, 0.04)) !important;
  }
  [data-theme="light"] .cap-os .cap-capture-row .fui-pill-btn--primary:hover:not(:disabled),
  [data-theme="read"] .cap-os .cap-capture-row .fui-pill-btn--primary:hover:not(:disabled),
  [data-theme="pure-light"] .cap-os .cap-capture-row .fui-pill-btn--primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--portal-raised, #FAFAFA) 88%, var(--portal-bg, #F0F0F2) 12%) !important;
    color: var(--portal-text, #18181B) !important;
  }
  [data-theme="light"] .cap-os .cap-capture-row .fui-pill-btn:not(.fui-pill-btn--primary),
  [data-theme="read"] .cap-os .cap-capture-row .fui-pill-btn:not(.fui-pill-btn--primary),
  [data-theme="pure-light"] .cap-os .cap-capture-row .fui-pill-btn:not(.fui-pill-btn--primary) {
    background: var(--portal-pill-bg, #E4E4E7) !important;
    color: var(--portal-muted, #71717A) !important;
    border: 1px solid transparent !important;
    box-shadow: none !important;
  }

  /* Dark mode — keep portal contrast on Freigaben controls. */
  [data-theme="dark"] .cap-filter,
  [data-theme="classic-dark"] .cap-filter {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    color: #9aa0ac;
    box-shadow: none;
  }
  [data-theme="dark"] .cap-filter.on,
  [data-theme="classic-dark"] .cap-filter.on {
    background: #fff;
    color: #000;
    border-color: transparent;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
  }
  [data-theme="dark"] .cap-head-record,
  [data-theme="classic-dark"] .cap-head-record {
    background: #fff;
    color: #000;
    border-color: transparent;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
  }
  [data-theme="dark"] .cap-head-tool,
  [data-theme="classic-dark"] .cap-head-tool {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    color: #9aa0ac;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 2px 6px -2px rgba(0, 0, 0, 0.28);
  }
  [data-theme="dark"] .cap-head-tool:hover,
  [data-theme="classic-dark"] .cap-head-tool:hover {
    background: rgba(255, 255, 255, 0.09);
    color: #f4f4f4;
  }
  [data-theme="dark"] .cap-m-filters .cap-filter.on,
  [data-theme="classic-dark"] .cap-m-filters .cap-filter.on {
    background: #fff;
    color: #000;
  }
`
