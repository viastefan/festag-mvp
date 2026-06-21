/** Freigaben (Captures) — extends portal/decision list chrome. */
export const CAPTURES_CSS = `
  .cap-filters {
    display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap;
  }
  .cap-filter {
    padding: 7px 14px; border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
    background: var(--dec-pill-surface, rgba(255,255,255,.06));
    color: var(--dec-soft); font-size: 12px; cursor: pointer; font-family: inherit;
    white-space: nowrap;
  }
  .cap-filter.on {
    background: var(--portal-btn-primary, #fff);
    color: var(--portal-btn-primary-text, #000);
    border-color: transparent;
  }
  .cap-record-btn {
    display: inline-flex; align-items: center; gap: 8px;
    height: 36px; padding: 0 16px; border-radius: 999px;
    border: 0; background: var(--dec-cta-bg, #5b647d); color: var(--dec-cta-text, #fff);
    font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
    transition: background .12s ease;
  }
  .cap-record-btn:hover { background: var(--dec-cta-hover, color-mix(in srgb, #5b647d 88%, #000)); }
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
    border: var(--dec-m-white-border, 1px solid rgba(60,60,67,.12));
    background: #fff;
    box-shadow: var(--dec-m-white-elev, 0 2px 4px rgba(144,149,159,.07));
    color: #6e717e;
  }
  .cap-m-filters .cap-filter.on {
    background: var(--portal-btn-primary, #5b647d);
    color: #fff;
    border-color: transparent;
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
    border-top: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.08)) 55%, transparent);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cap-warn-item {
    margin: 0;
    padding: 8px 10px;
    border-radius: 8px;
    background: color-mix(in srgb, #d4882b 12%, transparent);
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
    color: #16a34a;
  }
  @media (max-width: 768px) {
    .cap-m-filters { display: flex !important; }
  }
`
