/** Executive overview — extends portal/decision chrome. */
export const EXECUTIVE_CSS = `
  .exec-metrics {
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));
    gap:12px;
    margin:24px 0 28px;
  }
  .exec-metric {
    padding:14px 16px;
    border-radius:12px;
    background:var(--dec-pill-surface, rgba(255,255,255,.08));
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
  }
  .exec-metric-label {
    margin:0 0 6px;
    font-size:11px;
    letter-spacing:.06em;
    text-transform:uppercase;
    color:var(--dec-soft);
  }
  .exec-metric-value {
    margin:0;
    font-size:22px;
    font-weight:400;
    color:var(--dec-dark);
    letter-spacing:-0.5px;
  }
  .exec-metric-sub {
    margin:4px 0 0;
    font-size:12px;
    color:var(--dec-soft);
  }
  a.exec-metric--link {
    text-decoration:none;
    color:inherit;
    transition:background .12s;
  }
  a.exec-metric--link:hover {
    background:color-mix(in srgb, var(--dec-pill-surface, #f1f3f5) 100%, transparent);
  }

  .exec-health {
    display:inline-flex;
    align-items:center;
    gap:8px;
    height:28px;
    padding:0 12px;
    border-radius:999px;
    font-size:12px;
    margin-bottom:12px;
  }
  .exec-health-dot { width:7px; height:7px; border-radius:999px; }
  .exec-health--healthy { background:color-mix(in srgb, #16a34a 12%, transparent); color:#15803d; }
  .exec-health--healthy .exec-health-dot { background:#16a34a; }
  .exec-health--watch { background:color-mix(in srgb, #ca8a04 12%, transparent); color:#a16207; }
  .exec-health--watch .exec-health-dot { background:#ca8a04; }
  .exec-health--risk { background:color-mix(in srgb, #ea580c 12%, transparent); color:#c2410c; }
  .exec-health--risk .exec-health-dot { background:#ea580c; }
  .exec-health--blocked { background:color-mix(in srgb, #dc2626 12%, transparent); color:#b91c1c; }
  .exec-health--blocked .exec-health-dot { background:#dc2626; }

  .exec-forecast {
    margin:0 0 24px;
    padding:14px 16px;
    border-radius:12px;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
    background:var(--dec-pill-surface, rgba(255,255,255,.06));
    font-size:14px;
    line-height:1.55;
    color:var(--dec-dark);
  }

  .exec-daily {
    margin:0 0 28px;
    padding:18px 20px;
    border-radius:14px;
    background:var(--dec-pill-surface, rgba(255,255,255,.06));
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
  }
  .exec-daily-head {
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:12px;
    margin-bottom:14px;
  }
  .exec-daily-kicker {
    margin:0;
    font-size:11px;
    letter-spacing:.06em;
    text-transform:uppercase;
    color:var(--dec-soft);
  }
  .exec-daily-date {
    margin:4px 0 0;
    font-size:14px;
    color:var(--dec-dark);
    letter-spacing:-0.3px;
  }
  .exec-daily-gen {
    display:inline-flex;
    align-items:center;
    gap:6px;
    height:30px;
    padding:0 12px;
    border-radius:8px;
    border:none;
    background:color-mix(in srgb, var(--dec-pill-surface, #f1f3f5) 100%, transparent);
    color:var(--dec-soft);
    font-size:12px;
    cursor:pointer;
    transition:background .12s ease, color .12s ease;
  }
  .exec-daily-gen:hover:not(:disabled) {
    color:var(--dec-dark);
  }
  .exec-daily-gen:disabled { opacity:.6; cursor:wait; }
  .exec-daily-body {
    font-size:14px;
    line-height:1.6;
    color:var(--dec-dark);
  }
  .exec-daily-body p { margin:0 0 8px; }
  .exec-daily-body p:last-child { margin-bottom:0; }
  .exec-daily-highlights {
    margin:14px 0 0;
    padding:0;
    list-style:none;
    display:flex;
    flex-wrap:wrap;
    gap:8px;
  }
  .exec-daily-highlights li {
    font-size:11px;
    padding:4px 10px;
    border-radius:999px;
    background:color-mix(in srgb, var(--dec-pill-surface, #f1f3f5) 90%, transparent);
    color:var(--dec-soft);
  }

  .exec-projects { display:flex; flex-direction:column; gap:0; }
  .exec-project-row {
    display:grid;
    grid-template-columns:minmax(0, 1.4fr) repeat(4, minmax(0, 0.6fr));
    gap:16px;
    align-items:center;
    padding:16px 8px;
    border-bottom:1px solid color-mix(in srgb, var(--border, #e7ebf0) 55%, transparent);
    text-decoration:none;
    color:inherit;
    transition:background .12s ease;
  }
  .exec-project-row:hover {
    background:var(--dec-row-hover-bg, rgba(241,243,245,.4));
  }
  .exec-project-row:last-child { border-bottom:none; }
  .exec-project-title {
    display:flex; align-items:center; gap:10px; min-width:0;
  }
  .exec-project-dot { width:8px; height:8px; border-radius:999px; flex-shrink:0; }
  .exec-project-name {
    margin:0;
    font-size:15px;
    font-weight:400;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .exec-project-summary {
    margin:4px 0 0;
    font-size:12.5px;
    color:var(--dec-soft);
    line-height:1.45;
    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
    overflow:hidden;
  }
  .exec-cell {
    font-size:13px;
    color:var(--dec-soft);
  }
  .exec-cell strong {
    display:block;
    font-size:15px;
    font-weight:400;
    color:var(--dec-dark);
  }

  @media (max-width: 900px) {
    .exec-metrics { grid-template-columns:repeat(2, 1fr); }
    .exec-project-row {
      grid-template-columns:1fr;
      gap:8px;
      align-items:flex-start;
    }
  }

  .exec-foot {
    display:flex; flex-wrap:wrap; gap:8px;
    margin-top:24px;
  }
  .exec-foot-link {
    display:inline-flex; align-items:center; gap:6px;
    height:32px; padding:0 12px;
    border-radius:8px;
    background:color-mix(in srgb, var(--dec-pill-surface, #f1f3f5) 80%, transparent);
    color:var(--dec-soft);
    font-size:12px;
    text-decoration:none;
    transition:background .12s ease, color .12s ease;
  }
  .exec-foot-link:hover {
    background:color-mix(in srgb, var(--dec-pill-surface, #f1f3f5) 100%, transparent);
    color:var(--dec-dark);
  }
`
