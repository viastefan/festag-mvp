/** Supplemental styles for /issues — builds on DECISION_CSS portal chrome. */
export const ISSUE_EXTRA_CSS = `
  .iss-create-btn {
    display:inline-flex; align-items:center; gap:8px;
    height:36px; padding:0 16px; border-radius:999px;
    border:0; background:var(--dec-cta-bg, #5b647d); color:var(--dec-cta-text, #fff);
    font:inherit; font-size:13px; font-weight:500; cursor:pointer;
    transition:background .12s ease;
  }
  .iss-create-btn:hover { background:var(--dec-cta-hover, color-mix(in srgb, #5b647d 88%, #000)); }

  .dec-form-grid { display:flex; flex-direction:column; gap:14px; }
  .dec-form-row { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; }
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
  .dec-form-error {
    margin:0; font-size:13px; color:#dc2626;
  }
  .dec-drawer-footer {
    display:flex; flex-wrap:wrap; gap:8px; padding-top:8px;
  }
  .dec-detail-link {
    display:inline-flex; align-items:center; gap:6px;
    font-size:13px; color:var(--accent, #5b647d); text-decoration:none;
  }
  .dec-detail-link:hover { text-decoration:underline; }
  .dec-link-list {
    margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:8px;
  }
  .dec-link-list li {
    display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text);
  }
  .dec-panel .spin { animation: issSpin .8s linear infinite; }
  @keyframes issSpin { to { transform:rotate(360deg); } }

  @media (max-width: 720px) {
    .dec-form-row { grid-template-columns:1fr; }
    .dec-panel { width:100vw; }
  }
`
