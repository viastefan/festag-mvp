/** Team Panel — extends portal/decision chrome. */
export const TEAMS_CSS = `
  .team-subnav { margin-bottom: 4px; }
  .team-subnav .act-filter { text-decoration: none; display: inline-flex; align-items: center; }

  .team-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }
  .team-metric {
    padding: 14px 16px;
    border-radius: 12px;
    background: var(--dec-pill-surface, rgba(255,255,255,.08));
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
  }
  .team-metric-label {
    margin: 0 0 6px;
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--dec-soft);
  }
  .team-metric-value {
    margin: 0;
    font-size: 22px;
    color: var(--dec-dark);
  }

  .team-insights {
    margin: 0 0 16px;
    padding: 14px 16px;
    border-radius: 12px;
    background: color-mix(in srgb, #ea580c 10%, transparent);
    border: 1px solid color-mix(in srgb, #ea580c 25%, transparent);
  }
  .team-insights p {
    margin: 0 0 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #c2410c;
  }
  .team-insights p:last-child { margin-bottom: 0; }

  .team-member-mark {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .team-avatar {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: var(--dec-pill-surface);
    font-size: 12px; font-weight: 500; color: var(--dec-soft);
    flex-shrink: 0;
  }
  .team-member-row--risk {
    background: color-mix(in srgb, #ea580c 4%, transparent);
  }
  .team-risk-pill {
    font-size: 11px; padding: 4px 8px; border-radius: 999px;
    background: color-mix(in srgb, #ea580c 12%, transparent);
    color: #c2410c;
  }
  .team-risk-pill--soft {
    background: color-mix(in srgb, #f59e0b 10%, transparent);
    color: #b45309;
  }

  .team-panel-row {
    text-decoration: none;
    color: inherit;
    cursor: pointer;
  }
  .team-panel-row:hover {
    background: var(--dec-row-hover-bg, rgba(241,243,245,.4));
  }
  .team-panel-arrow {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    color: var(--dec-soft);
    min-width: 28px;
  }
  .team-report-body {
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .team-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .team-search {
    flex: 1 1 220px;
    max-width: 360px;
    height: 36px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.12)) 55%, transparent);
    background: var(--dec-pill-surface, rgba(255,255,255,.06));
    color: var(--dec-soft);
  }
  .team-search input {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--dec-dark);
    font: inherit;
    font-size: 13px;
  }
  .team-search input::placeholder { color: var(--dec-soft); }

  .team-invite-btn {
    height: 32px;
    padding: 0 14px;
    border-radius: 999px;
    border: 0;
    background: var(--dec-cta-bg, #5b647d);
    color: var(--dec-cta-text, #fff);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .team-invite-btn:hover { opacity: .9; }
`
