/** Objectives page — extends portal/decision chrome. */
export const OBJECTIVES_CSS = `
  .obj-progress-bar {
    height: 4px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--dec-pill-surface, #f1f3f5) 90%, transparent);
    overflow: hidden;
    margin-top: 6px;
  }
  .obj-progress-fill {
    height: 100%;
    border-radius: 999px;
    background: var(--dec-cta-bg, #5b647d);
  }
  .obj-risk-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 11px;
    background: color-mix(in srgb, #ea580c 12%, transparent);
    color: #c2410c;
  }
  .obj-target {
    font-size: 12px;
    color: var(--dec-soft);
  }
`
