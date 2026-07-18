/** Objectives page — extends portal/decision chrome. */
export const OBJECTIVES_CSS = `
  .obj-os {
    --obj-chip-bg: var(--portal-pill-bg, #E4E4E7);
    --obj-chip-on-bg: var(--portal-raised, #FAFAFA);
    --obj-chip-border: var(--portal-btn-outline-border, rgba(24, 24, 27, 0.08));
    --obj-chip-shadow: var(--shadow-xs, 0 1px 2px rgba(24, 24, 27, 0.04));
  }

  .dec-area-tagline {
    margin: -8px 0 16px;
    max-width: 680px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--dec-soft, var(--portal-muted, #71717A));
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }

  .obj-at-risk-banner {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0 0 16px;
    padding: 10px 12px;
    border-radius: 10px;
    background: color-mix(in srgb, #c2410c 10%, var(--portal-raised, #fafafa));
    border: 1px solid color-mix(in srgb, #c2410c 18%, transparent);
    font-size: 13px;
    line-height: 1.45;
    color: #9a3412;
  }
  .obj-at-risk-banner svg { flex-shrink: 0; margin-top: 1px; }
  [data-theme="dark"] .obj-at-risk-banner,
  [data-theme="classic-dark"] .obj-at-risk-banner {
    background: color-mix(in srgb, #ea580c 14%, rgba(255, 255, 255, 0.06));
    border-color: color-mix(in srgb, #ea580c 22%, transparent);
    color: #fdba74;
  }

  .obj-filters {
    display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap;
  }
  .obj-filter {
    padding: 7px 14px; border-radius: 12px;
    border: 1px solid var(--obj-chip-border);
    background: var(--obj-chip-bg);
    color: var(--portal-muted, #71717A);
    font-size: 12px; cursor: pointer; font-family: inherit;
    transition: background .12s, color .12s, border-color .12s, box-shadow .12s;
  }
  .obj-filter:hover {
    color: var(--portal-text, #18181B);
    background: color-mix(in srgb, var(--obj-chip-on-bg) 72%, var(--obj-chip-bg) 28%);
  }
  .obj-filter.on {
    background: var(--obj-chip-on-bg);
    color: var(--portal-text, #18181B);
    border-color: var(--border-strong, rgba(24, 24, 27, 0.12));
    box-shadow: var(--obj-chip-shadow);
  }
  .obj-create-btn {
    display:inline-flex; align-items:center; gap:8px;
    height:36px; padding:0 16px; border-radius:999px;
    border:1px solid var(--obj-chip-border);
    background:var(--obj-chip-on-bg);
    color:var(--portal-text, #18181B);
    font:inherit; font-size:13px; font-weight:500; cursor:pointer;
    box-shadow:var(--obj-chip-shadow);
    transition:background .12s ease, border-color .12s ease, box-shadow .12s ease;
  }
  .obj-create-btn:hover {
    background:color-mix(in srgb, var(--obj-chip-on-bg) 88%, var(--portal-bg, #f0f0f2) 12%);
    border-color:var(--border-strong, rgba(24, 24, 27, 0.14));
  }
  [data-theme="dark"] .obj-os .obj-create-btn,
  [data-theme="classic-dark"] .obj-os .obj-create-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #f4f4f4;
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: none;
  }
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
    background: var(--portal-btn-primary, #2d2e2c);
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

  /* Floating drawer — same shell as Cmd+K search (festag-popup-surface). */
  .obj-drawer-backdrop {
    z-index: 9499;
  }
  .obj-drawer-panel {
    position: fixed;
    top: 16px;
    right: 16px;
    bottom: 16px;
    width: min(480px, calc(100vw - 32px));
    z-index: 9501;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: objDrawerIn .24s cubic-bezier(.16, 1, .3, 1) both;
  }
  @keyframes objDrawerIn {
    from { opacity: 0; transform: translateX(12px) scale(0.985); }
    to { opacity: 1; transform: none; }
  }
  @media (max-width: 768px) {
    .obj-drawer-panel {
      top: auto !important;
      right: 0 !important;
      left: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      max-height: min(88dvh, 640px);
      border-radius: 20px 20px 0 0 !important;
      border-bottom: none !important;
      padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
      animation: objDrawerSheetIn .26s cubic-bezier(.16, 1, .3, 1) both;
    }
    @keyframes objDrawerSheetIn {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: none; }
    }
  }

  .obj-drawer-panel .dec-drawer-head {
    flex-shrink: 0;
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--fp-divider, var(--border, rgba(24, 24, 27, 0.08)));
  }
  .obj-drawer-panel .dec-kicker {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--fp-muted, var(--dec-soft));
  }
  .obj-drawer-panel .dec-saved {
    font-size: 12px;
    color: var(--fp-muted, var(--dec-soft));
  }
  .obj-drawer-panel .dec-icon-btn {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    color: var(--fp-muted, var(--dec-soft));
  }
  .obj-drawer-panel .dec-icon-btn:hover {
    background: var(--fp-hover, var(--nav-on));
    color: var(--fp-text, var(--text));
  }
  .obj-drawer-panel .dec-drawer-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 14px 22px 22px;
    -webkit-overflow-scrolling: touch;
  }
  .obj-drawer-panel .dec-drawer-footer {
    padding-top: 12px;
    border-top: 1px solid var(--fp-divider, var(--border, rgba(24, 24, 27, 0.08)));
  }

  .obj-drawer-panel .dec-form-grid { display:flex; flex-direction:column; gap:14px; }
  .obj-drawer-panel .dec-form-field { display:flex; flex-direction:column; gap:6px; }
  .obj-drawer-panel .dec-form-field > span {
    font-size:11px; letter-spacing:.06em; text-transform:uppercase;
    color: var(--fp-muted, var(--dec-soft));
  }
  .obj-drawer-panel .dec-form-field input,
  .obj-drawer-panel .dec-form-field select,
  .obj-drawer-panel .dec-form-field textarea {
    width:100%; box-sizing:border-box;
    border:0;
    border-radius:8px;
    background: var(--fp-inp, var(--inp, var(--festag-input-fill, #DFDFE1)));
    color: var(--fp-text, var(--text));
    font:inherit; font-size:14px; font-weight:400; line-height:1.45;
    padding:10px 12px; outline:none;
    transition: background .12s, box-shadow .12s;
  }
  .obj-drawer-panel .dec-form-field textarea { resize:vertical; min-height:88px; }
  .obj-drawer-panel .dec-form-field input:focus,
  .obj-drawer-panel .dec-form-field select:focus,
  .obj-drawer-panel .dec-form-field textarea:focus {
    background: var(--fp-inp-focus, var(--surface, #F7F7F8));
    box-shadow: 0 0 0 3px var(--fp-glow, var(--glow, rgba(24, 24, 27, 0.04)));
  }
  .obj-drawer-panel .dec-card-muted {
    color: var(--fp-muted, var(--dec-soft));
  }
  .obj-drawer-panel .obj-progress-bar {
    background: var(--fp-pill, var(--surface-2, #E4E4E7));
  }
  .obj-drawer-panel .obj-progress-fill {
    background: var(--fp-text, var(--portal-text, #18181B));
  }
  [data-theme="dark"] .obj-drawer-panel .obj-progress-fill,
  [data-theme="classic-dark"] .obj-drawer-panel .obj-progress-fill {
    background: #ffffff;
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
