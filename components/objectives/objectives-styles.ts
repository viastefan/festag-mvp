/** Objectives page — extends portal/decision chrome. */
export const OBJECTIVES_CSS = `
  .obj-filters {
    display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap;
  }
  .obj-filter {
    padding: 7px 14px; border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
    background: var(--dec-pill-surface, rgba(255,255,255,.06));
    color: var(--dec-soft); font-size: 12px; cursor: pointer; font-family: inherit;
  }
  .obj-filter.on {
    background: var(--portal-btn-primary, #fff);
    color: var(--portal-btn-primary-text, #000);
    border-color: transparent;
  }
  .obj-create-btn {
    display:inline-flex; align-items:center; gap:8px;
    height:36px; padding:0 16px; border-radius:999px;
    border:0; background:var(--dec-cta-bg, #5b647d); color:var(--dec-cta-text, #fff);
    font:inherit; font-size:13px; font-weight:500; cursor:pointer;
    transition:background .12s ease;
  }
  .obj-create-btn:hover { background:var(--dec-cta-hover, color-mix(in srgb, #5b647d 88%, #000)); }
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
  .obj-drawer-risk {
    margin: 8px 0 0;
    font-size: 12.5px;
    color: #c2410c;
    line-height: 1.45;
  }
  .obj-drawer-hint {
    margin: 12px 0 0;
    font-size: 12px;
    color: var(--dec-soft);
  }
  .dec-form-grid { display:flex; flex-direction:column; gap:14px; }
  .dec-form-field { display:flex; flex-direction:column; gap:6px; }
  .dec-form-field > span {
    font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--dec-soft);
  }
  .dec-form-field input,
  .dec-form-field select,
  .dec-form-field textarea {
    width:100%; box-sizing:border-box;
    border:1px solid color-mix(in srgb, var(--border, #e7ebf0) 80%, transparent);
    border-radius:10px; background:var(--card, #fff); color:var(--text);
    font:inherit; font-size:13.5px; line-height:1.45;
    padding:10px 12px; outline:none;
    transition:border-color .12s, box-shadow .12s;
  }
  .dec-form-field textarea { resize:vertical; min-height:72px; }
  .dec-form-field input:focus,
  .dec-form-field select:focus,
  .dec-form-field textarea:focus {
    border-color:color-mix(in srgb, var(--accent, #5b647d) 40%, var(--border));
    box-shadow:0 0 0 3px color-mix(in srgb, var(--accent, #5b647d) 12%, transparent);
  }
  .dec-form-error { margin:0; font-size:13px; color:#dc2626; }
  .dec-drawer-footer { display:flex; flex-wrap:wrap; gap:8px; padding-top:8px; }
  .dec-detail-link {
    display:inline-flex; align-items:center; gap:6px;
    font-size:13px; color:var(--accent, #5b647d); text-decoration:none;
  }
  .dec-detail-link:hover { text-decoration:underline; }
  .dec-link-list {
    margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:8px;
  }
  .dec-link-list li {
    display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:13px;
  }
`
