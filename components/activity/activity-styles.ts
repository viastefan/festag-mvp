/** Activity feed — portal/decision chrome (flat rows + hover like Entscheidungen). */
export const ACTIVITY_CSS = `
  .act-filters {
    display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap;
  }
  .act-filter {
    padding: 7px 14px; border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
    background: var(--dec-pill-surface, rgba(255,255,255,.06));
    color: var(--dec-soft); font-size: 12px; cursor: pointer; font-family: inherit;
  }
  .act-filter.on {
    background: var(--portal-btn-primary, #fff);
    color: var(--portal-btn-primary-text, #000);
    border-color: transparent;
  }
  .act-groups { display: flex; flex-direction: column; gap: 28px; }
  .act-group { display: flex; flex-direction: column; }
  .act-date {
    margin: 0 0 6px;
    padding: 0 var(--festag-list-row-inset-x, 20px);
    font-size: 12px; font-weight: 600;
    color: var(--dec-soft); letter-spacing: .04em; text-transform: uppercase;
  }
  .act-row {
    display: flex; gap: 14px; align-items: flex-start;
    padding: 14px var(--festag-list-row-inset-x, 20px);
    width: 100%; box-sizing: border-box;
    background: transparent;
    cursor: default;
  }
  .act-icon {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--dec-pill-surface, #f1f3f5) 72%, transparent);
    color: var(--dec-soft);
  }
  [data-theme="dark"] .act-icon,
  [data-theme="classic-dark"] .act-icon {
    background: color-mix(in srgb, var(--dec-pill-surface, rgba(255,255,255,.06)) 88%, transparent);
  }
  .act-body { flex: 1; min-width: 0; }
  .act-row-top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
  .act-title {
    margin: 0;
    font-size: 15px; font-weight: 500;
    color: var(--dec-dark); line-height: 1.4;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .act-time { font-size: 12px; color: var(--dec-soft); flex-shrink: 0; padding-top: 2px; }
  .act-meta { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; align-items: center; }
  .act-role {
    display: inline-flex; align-items: center;
    font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px;
    background: color-mix(in srgb, var(--dec-pill-surface, #f1f3f5) 88%, transparent);
    letter-spacing: .04em;
  }
  .act-project { font-size: 12px; color: var(--dec-soft); }
  .act-impact {
    font-size: 10px; padding: 3px 8px; border-radius: 999px;
    background: color-mix(in srgb, #ea580c 12%, transparent); color: #c2410c;
  }
`
