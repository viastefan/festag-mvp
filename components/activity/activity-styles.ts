/** Activity feed — portal/decision chrome. */
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
  .act-groups { display: flex; flex-direction: column; gap: 20px; }
  .act-date {
    margin: 0 0 10px; font-size: 12px; font-weight: 600;
    color: var(--dec-soft); letter-spacing: .04em; text-transform: uppercase;
  }
  .act-card {
    border-radius: 14px; overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
    background: var(--dec-pill-surface, rgba(255,255,255,.04));
  }
  .act-row {
    display: flex; gap: 14px; align-items: flex-start; padding: 14px 16px;
  }
  .act-row.has-border {
    border-bottom: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
  }
  .act-icon {
    width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--dec-card-bg); border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
  }
  .act-body { flex: 1; min-width: 0; }
  .act-row-top { display: flex; justify-content: space-between; gap: 10px; }
  .act-title { margin: 0; font-size: 14px; color: var(--dec-dark); line-height: 1.4; }
  .act-time { font-size: 12px; color: var(--dec-soft); flex-shrink: 0; }
  .act-meta { display: flex; gap: 8px; margin-top: 5px; flex-wrap: wrap; align-items: center; }
  .act-role {
    font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px;
    background: var(--dec-pill-surface); letter-spacing: .04em;
  }
  .act-project { font-size: 12px; color: var(--dec-soft); }
  .act-impact {
    font-size: 10px; padding: 2px 7px; border-radius: 6px;
    background: color-mix(in srgb, #ea580c 12%, transparent); color: #c2410c;
  }
`
