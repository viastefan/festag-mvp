/** Client Lieferungen + Verlauf — extends dec-os list chrome */
export const CLIENT_DELIVERABLES_CSS = `
  .cd-deliverable-row {
    flex-wrap: wrap;
  }
  .cd-deliverable-row .dec-card-actions {
    gap: 8px;
    align-items: center;
  }
  .cd-link-btn {
    height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.12)) 55%, transparent);
    background: transparent;
    color: var(--dec-soft);
    font-size: 12px;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
  }
  .cd-link-btn:hover { opacity: .85; }
  .cd-feedback-block {
    width: 100%;
    padding: 0 0 4px;
    border-top: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.08)) 55%, transparent);
    margin-top: 4px;
    padding-top: 14px;
  }
  .cd-feedback {
    width: 100%;
    margin-bottom: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.12)) 55%, transparent);
    background: transparent;
    color: var(--dec-dark);
    font-family: inherit;
    font-size: 13px;
    resize: vertical;
    min-height: 72px;
    box-sizing: border-box;
  }
  .cd-timeline { display: flex; flex-direction: column; gap: 0; }
  .cd-tl-row {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.08)) 55%, transparent);
  }
  .cd-tl-row:last-child { border-bottom: none; }
  .cd-tl-time { font-size: 11px; color: var(--dec-soft); padding-top: 2px; }
  .cd-tl-title { margin: 0 0 4px; font-size: 14px; color: var(--dec-dark); line-height: 1.4; }
  .cd-tl-body { margin: 0; font-size: 13px; line-height: 1.5; color: var(--dec-soft); }
  .cd-tl-kind {
    display: inline-block;
    margin-bottom: 6px;
    font-size: 10px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--dec-soft);
  }
`
