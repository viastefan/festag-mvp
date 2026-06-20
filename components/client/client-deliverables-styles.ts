/** Client Lieferungen + Verlauf — portal chrome extension */
export const CLIENT_DELIVERABLES_CSS = `
  .cd-tabs {
    display: flex;
    gap: 8px;
    margin: 0 0 20px;
    flex-wrap: wrap;
  }
  .cd-tab {
    height: 32px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.12)) 55%, transparent);
    background: transparent;
    color: var(--dec-soft);
    font-size: 13px;
    cursor: pointer;
  }
  .cd-tab.on {
    background: var(--dec-pill-surface);
    color: var(--dec-dark);
    border-color: color-mix(in srgb, var(--dec-dark) 12%, transparent);
  }
  .cd-list { display: flex; flex-direction: column; gap: 12px; }
  .cd-card {
    padding: 16px 18px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
    background: var(--dec-pill-surface, rgba(255,255,255,.04));
  }
  .cd-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }
  .cd-card-title {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    color: var(--dec-dark);
  }
  .cd-card-meta {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--dec-soft);
  }
  .cd-pill {
    flex-shrink: 0;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, #ea580c 12%, transparent);
    color: #c2410c;
  }
  .cd-pill.ok {
    background: color-mix(in srgb, #16a34a 12%, transparent);
    color: #15803d;
  }
  .cd-body {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.55;
    color: var(--dec-soft);
  }
  .cd-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cd-btn {
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.12)) 55%, transparent);
    background: transparent;
    color: var(--dec-soft);
    font-size: 12px;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .cd-btn.primary {
    background: var(--dec-cta, #5b647d);
    color: #fff;
    border-color: transparent;
  }
  .cd-btn:hover { opacity: .85; }
  .cd-timeline { display: flex; flex-direction: column; gap: 0; }
  .cd-tl-row {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 16px;
    padding: 14px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.08)) 55%, transparent);
  }
  .cd-tl-row:last-child { border-bottom: none; }
  .cd-tl-time { font-size: 11px; color: var(--dec-soft); padding-top: 2px; }
  .cd-tl-title { margin: 0 0 4px; font-size: 14px; color: var(--dec-dark); }
  .cd-tl-body { margin: 0; font-size: 13px; line-height: 1.5; color: var(--dec-soft); }
  .cd-tl-kind {
    display: inline-block;
    margin-bottom: 6px;
    font-size: 10px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--dec-soft);
  }
  .cd-feedback {
    width: 100%;
    margin-top: 8px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.12)) 55%, transparent);
    background: transparent;
    color: var(--dec-dark);
    font-family: inherit;
    font-size: 13px;
    resize: vertical;
    min-height: 72px;
  }
`
