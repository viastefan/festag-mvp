/** Team Panel — extends portal/decision chrome. */
export const TEAMS_CSS = `
  .team-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
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
    margin: 0 0 20px;
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
  .team-list { display: flex; flex-direction: column; }
  .team-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
  }
  .team-row:last-child { border-bottom: none; }
  .team-row--risk { background: color-mix(in srgb, #ea580c 6%, transparent); }
  .team-row-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
  .team-avatar {
    width: 36px; height: 36px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    background: var(--dec-pill-surface);
    font-size: 12px; color: var(--dec-soft);
  }
  .team-name { margin: 0; font-size: 15px; color: var(--dec-dark); }
  .team-role { margin: 2px 0 0; font-size: 12px; color: var(--dec-soft); }
  .team-row-stats {
    display: flex; gap: 16px; font-size: 12px; color: var(--dec-soft);
  }
  .team-row-stats strong { color: var(--dec-dark); font-weight: 500; }
  .team-risk-pill {
    font-size: 11px; padding: 4px 8px; border-radius: 999px;
    background: color-mix(in srgb, #ea580c 12%, transparent);
    color: #c2410c;
  }
  .team-foot { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
  .team-foot-link {
    display: inline-flex; align-items: center; height: 32px; padding: 0 12px;
    border-radius: 8px; background: var(--dec-pill-surface);
    color: var(--dec-soft); font-size: 12px; text-decoration: none;
  }
  .team-foot-link:hover { color: var(--dec-dark); }
`
