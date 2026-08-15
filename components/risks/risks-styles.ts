/** Ergänzende Stile für /risks — baut auf der DECISION_CSS-Chrome auf. */
export const RISK_EXTRA_CSS = `
  .rsk-meta {
    display:grid; grid-template-columns:repeat(3, minmax(0,1fr));
    gap:1px; margin:0 0 18px;
    background:color-mix(in srgb, var(--border, #e7ebf0) 70%, transparent);
    border:1px solid color-mix(in srgb, var(--border, #e7ebf0) 70%, transparent);
    border-radius:12px; overflow:hidden;
  }
  .rsk-meta-cell {
    background:var(--card, #fff); padding:12px 14px;
    display:flex; flex-direction:column; gap:4px;
  }
  .rsk-meta-label {
    font-size:10.5px; letter-spacing:.08em; text-transform:uppercase;
    color:var(--dec-soft, #7a8397);
  }
  .rsk-meta-value { font-size:14px; color:var(--text); letter-spacing:.01em; }

  .rsk-section { margin:0 0 20px; }
  .rsk-section-title {
    margin:0 0 8px; font-size:11px; letter-spacing:.08em;
    text-transform:uppercase; color:var(--dec-soft, #7a8397);
  }
  .rsk-body-text {
    margin:0 0 18px; font-size:14px; line-height:1.62;
    color:var(--text); letter-spacing:.012em;
  }

  .rsk-evidence { margin:0; padding:0; list-style:none; }
  .rsk-evidence li {
    display:flex; gap:9px; align-items:flex-start;
    padding:9px 0; font-size:13.5px; line-height:1.5; color:var(--text);
    border-bottom:1px solid color-mix(in srgb, var(--border, #e7ebf0) 55%, transparent);
  }
  .rsk-evidence li:last-child { border-bottom:none; }
  .rsk-evidence-dot {
    width:5px; height:5px; border-radius:50%; margin-top:7px; flex:0 0 auto;
    background:color-mix(in srgb, var(--text, #1e1e20) 32%, transparent);
  }
  .rsk-evidence-detail {
    display:block; margin-top:3px; font-size:12.5px;
    color:var(--dec-soft, #7a8397);
  }

  .rsk-reco {
    padding:14px 16px; border-radius:12px;
    border:1px solid color-mix(in srgb, var(--border, #e7ebf0) 75%, transparent);
    background:color-mix(in srgb, var(--card, #fff) 92%, var(--bg, #faf9f7));
    margin:0 0 18px;
  }
  .rsk-reco-title { margin:0 0 4px; font-size:14px; color:var(--text); letter-spacing:.01em; }
  .rsk-reco-why { margin:0; font-size:13px; line-height:1.55; color:var(--dec-soft, #7a8397); }

  .rsk-history { margin:0; padding:0; list-style:none; }
  .rsk-history li { padding:8px 0; font-size:13px; line-height:1.5; color:var(--text); }
  .rsk-history-when {
    display:block; font-size:11.5px; color:var(--dec-soft, #7a8397); margin-top:2px;
  }

  /* Feld- und Link-Chrome, die die Decisions-Styles nicht mitbringen. */
  .dec-form-grid { display:flex; flex-direction:column; gap:14px; }
  .dec-form-row { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:10px; }
  .dec-form-field { display:flex; flex-direction:column; gap:6px; }
  .dec-form-field > span {
    font-size:11px; letter-spacing:.08em; text-transform:uppercase;
    color:var(--dec-soft, #7a8397);
  }
  .dec-form-field input,
  .dec-form-field select,
  .dec-form-field textarea {
    width:100%; box-sizing:border-box;
    border:1px solid color-mix(in srgb, var(--border, #e7ebf0) 80%, transparent);
    border-radius:10px; background:var(--card, #fff); color:var(--text);
    font:inherit; font-size:13.5px; line-height:1.45; padding:10px 12px; outline:none;
    transition:border-color .12s, box-shadow .12s;
  }
  .dec-form-field textarea { resize:vertical; min-height:56px; }
  .dec-form-field input:focus,
  .dec-form-field select:focus,
  .dec-form-field textarea:focus {
    border-color:color-mix(in srgb, var(--accent, #5b647d) 40%, var(--border));
    box-shadow:0 0 0 3px color-mix(in srgb, var(--accent, #5b647d) 12%, transparent);
  }
  .dec-detail-link {
    display:inline-flex; align-items:center; gap:6px;
    font-size:13px; color:var(--accent, #5b647d); text-decoration:none;
  }
  .dec-detail-link:hover { text-decoration:underline; }
  .dec-panel .spin { animation: rskSpin .8s linear infinite; }
  @keyframes rskSpin { to { transform:rotate(360deg); } }

  .rsk-actions { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
  .rsk-note { margin:10px 0 0; font-size:12.5px; color:var(--dec-soft, #7a8397); }
  .rsk-error { margin:10px 0 0; font-size:13px; color:#dc2626; }

  @media (max-width: 720px) {
    .rsk-meta { grid-template-columns:1fr; }
    .dec-form-row { grid-template-columns:1fr; }
    .dec-panel { width:100vw; }
  }
`
