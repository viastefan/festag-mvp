export const DECISION_CSS = `
  .dec-os {
    --dec-soft: var(--portal-soft, #8f93a4);
    --dec-dark: var(--portal-text, #0f0f10);
    --dec-card-bg: var(--portal-card, #fff);
    width:100%; height:100%; min-height:0; color:var(--dec-dark);
    display:flex; flex-direction:column;     overflow:hidden;
    letter-spacing:0;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-weight:400;
    position:relative;
  }
  .dec-hero-bg {
    position:absolute; left:0; right:0; pointer-events:none; z-index:0;
    overflow:hidden;
  }
  .dec-hero-bg img { width:100%; height:100%; object-fit:cover; display:block; }
  .dec-hero-bg-top { top:0; height:255px; }
  .dec-hero-bg-bottom { bottom:0; height:129px; }
  .dec-static-top, .dec-scroll-body { position:relative; z-index:1; }

  .dec-static-top {
    flex:0 0 auto; position:sticky; top:0; z-index:8;
    background:var(--dec-card-bg); padding:40px 56px 0;
  }
  .dec-static-top::after {
    content:''; display:block; position:absolute;
    left:0; right:0; bottom:-20px; height:20px;
    background:linear-gradient(to bottom, var(--dec-card-bg) 0%, color-mix(in srgb, var(--dec-card-bg) 75%, transparent) 55%, transparent 100%);
    pointer-events:none;
  }

  .dec-hero { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; padding-bottom:24px; }
  .dec-hero-text { max-width:600px; flex:1; min-width:0; }
  .dec-hero-title {
    margin:0; font-size:30px; font-weight:500; color:var(--dec-dark);
    letter-spacing:-0.01em; line-height:1.2;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .dec-hero-sub { margin-top:16px; display:flex; flex-direction:column; gap:4px; }
  .dec-hero-sub p {
    margin:0; font-size:20px; font-weight:400; color:var(--dec-soft);
    line-height:1.3; letter-spacing:-0.01em;
  }
  .dec-hero-actions { display:flex; gap:8px; align-items:center; flex-shrink:0; }
  .dec-hero-actions-group { display:flex; gap:6px; align-items:center; }

  .dec-divider-gradient {
    height:.5px; width:100%;
    background:linear-gradient(90deg, rgba(233,239,246,.4) 0%, #e3e8ef 27%, #e9eff6 64%, rgba(233,239,246,.4) 100%);
  }
  [data-theme="dark"] .dec-divider-gradient,
  [data-theme="classic-dark"] .dec-divider-gradient {
    background:linear-gradient(90deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.1) 27%, rgba(255,255,255,.06) 64%, rgba(255,255,255,.04) 100%);
  }

  .dec-spin { animation:decSpin 1s linear infinite; }
  @keyframes decSpin { from { transform:rotate(0); } to { transform:rotate(360deg); } }

  .dec-scroll-body {
    flex:1 1 auto; min-height:0;
    overflow-y:auto; overflow-x:hidden;
    padding:24px 56px 96px;
    overscroll-behavior:contain;
    scrollbar-width:none;
  }
  .dec-scroll-body::-webkit-scrollbar { display:none; }

  /* ── Decision card rows (Figma) ── */
  .dec-card {
    display:flex; gap:56px; align-items:center;
    padding:16px 24px; width:100%;
    transition:background .12s, border-radius .12s;
    border-radius:12px;
    background:transparent;
    cursor:pointer;
  }
  .dec-card:hover {
    background:var(--portal-row-hover, rgba(241,243,245,.4));
  }
  .dec-card:focus-visible {
    outline:2px solid color-mix(in srgb, var(--portal-btn-primary, #5b647d) 55%, transparent);
    outline-offset:2px;
  }

  .dec-clamp-wrap { position:relative; }
  .dec-clamp-text {
    display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden;
    text-overflow:ellipsis;
  }
  .dec-tip-popup {
    position:absolute; left:0; top:calc(100% + 8px); z-index:20;
    min-width:min(320px, 90vw); max-width:360px;
    padding:12px 14px; border-radius:10px;
    background:var(--dec-dark); color:#fff;
    font-size:13px; line-height:1.45; letter-spacing:0;
    box-shadow:0 12px 32px rgba(0,0,0,.18);
    pointer-events:none;
  }
  [data-theme="dark"] .dec-tip-popup,
  [data-theme="classic-dark"] .dec-tip-popup {
    background:#2a2c31; color:#f4f4f4;
  }

  .dec-card-left { width:179px; flex-shrink:0; display:flex; flex-direction:column; gap:32px; }
  .dec-card-title-block { display:flex; flex-direction:column; gap:8px; }
  .dec-card-title {
    margin:0; font-size:18px; font-weight:500; color:var(--dec-dark);
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    letter-spacing:0;
  }
  .dec-card-project {
    margin:0; font-size:14px; font-weight:400; color:var(--dec-soft);
    letter-spacing:0;
  }
  .dec-card-type-pill {
    display:inline-flex; align-items:center; gap:8px;
    padding:6px 12px; border-radius:999px;
    background:var(--portal-pill-bg); color:var(--dec-dark);
    font-size:12px; font-weight:500; letter-spacing:0;
    width:fit-content;
  }
  .dec-card-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

  .dec-card-mid { width:298px; flex-shrink:0; display:flex; flex-direction:column; gap:16px; }
  .dec-card-section { display:flex; flex-direction:column; gap:4px; }
  .dec-card-label {
    margin:0; font-size:14px; font-weight:500; color:var(--dec-dark);
    letter-spacing:0;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .dec-card-muted {
    margin:0; font-size:13px; font-weight:400; color:var(--dec-soft);
    line-height:1.45; letter-spacing:0;
  }

  .dec-card-meta { width:93px; flex-shrink:0; display:flex; flex-direction:column; gap:16px; justify-content:flex-start; }
  .dec-card-prio-pill {
    display:inline-flex; align-items:center;
    padding:6px 12px; border-radius:999px;
    background:var(--portal-pill-bg); color:var(--dec-dark);
    font-size:12px; font-weight:500; letter-spacing:0;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    width:fit-content;
  }

  .dec-card-actions {
    width:105px; flex-shrink:0; display:flex; flex-direction:column; gap:8px; align-items:stretch;
    position:relative;
  }
  .dec-card-dots {
    align-self:flex-end;
    border:0; background:transparent; color:var(--dec-soft);
    cursor:pointer; padding:4px; transition:color .12s;
  }
  .dec-card-dots:hover { color:var(--dec-dark); }
  .dec-card-menu {
    position:absolute; top:28px; right:0; z-index:30;
    min-width:210px; padding:6px;
    border-radius:12px;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 90%, transparent);
    background:var(--portal-card, #fff);
    box-shadow:0 12px 36px -12px rgba(15,23,42,.22);
    display:flex; flex-direction:column; gap:2px;
  }
  [data-theme="dark"] .dec-card-menu,
  [data-theme="classic-dark"] .dec-card-menu {
    background:var(--portal-card, #141416);
    border-color:rgba(255,255,255,.1);
    box-shadow:0 16px 40px -12px rgba(0,0,0,.45);
  }
  .dec-card-menu-item {
    display:flex; align-items:center; gap:9px;
    width:100%; min-height:34px; padding:0 10px;
    border:0; border-radius:8px; background:transparent;
    font:inherit; font-size:13px; font-weight:400;
    color:var(--dec-dark); text-align:left; cursor:pointer;
    transition:background .12s ease, color .12s ease;
    letter-spacing:var(--ls-body, 0.017em);
  }
  .dec-card-menu-item:hover:not(:disabled) {
    background:var(--portal-row-hover, rgba(241,243,245,.55));
  }
  .dec-card-menu-item:disabled { opacity:.5; cursor:not-allowed; }
  .dec-card-menu-item.is-danger { color:#d14343; }
  .dec-card-menu-item.is-danger:hover:not(:disabled) {
    background:rgba(209,67,67,.08);
  }
  .dec-card-menu-icon {
    width:16px; display:inline-flex; align-items:center; justify-content:center;
    color:var(--dec-soft); flex-shrink:0;
  }
  .dec-card-menu-item.is-danger .dec-card-menu-icon { color:#d14343; }
  .dec-card-actions .fui-pill-btn {
    height:40px; min-height:40px; font-size:13px; width:100%;
  }
  .dec-card-actions .fui-pill-btn--primary {
    border: none;
    background: var(--portal-btn-primary, #5b647d);
    background-image: none;
    box-shadow: none;
  }
  .dec-card-actions .fui-pill-btn--primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--portal-btn-primary, #5b647d) 88%, #000);
    background-image: none;
    border: none;
    box-shadow: none;
  }
  .dec-card-actions .fui-pill-btn--primary:active:not(:disabled) {
    background: color-mix(in srgb, var(--portal-btn-primary, #5b647d) 80%, #000);
    background-image: none;
    box-shadow: none;
  }

  .dec-empty {
    padding:48px 6px; color:var(--dec-soft);
    font-size:14px; text-align:center;
    display:flex; flex-direction:column; align-items:center; gap:8px;
  }
  .dec-empty svg { color:var(--dec-soft); }
  .dec-empty p { margin:0; }
  .dec-empty small { font-size:13px; opacity:.75; max-width:420px; line-height:1.5; }

  /* Shared elements used by Drawer */
  .dec-tagro-cta {
    display:inline-flex; align-items:center; gap:6px;
    height:30px; padding:0 14px; border-radius:8px;
    background:var(--portal-btn-primary, #5B647D); color:#fff; border:0;
    font:inherit; font-size:12px; font-weight:500; letter-spacing:.005em;
    cursor:pointer; transition:background .14s ease;
  }
  .dec-tagro-cta:hover { background:color-mix(in srgb, var(--portal-btn-primary, #5B647D) 88%, #000); }
  .dec-tagro-cta:active { background:color-mix(in srgb, var(--portal-btn-primary, #5B647D) 80%, #000); }
  .dec-pill {
    display:inline-flex; align-items:center; gap:4px;
    height:18px; padding:0 8px; border-radius:999px;
    font-size:10px; letter-spacing:.04em; text-transform:uppercase;
    background:color-mix(in srgb, var(--surface-2, #f1f3f5) 70%, transparent);
    color:var(--dec-dark); white-space:nowrap;
  }
  .dec-pill.tone-red    { background:color-mix(in srgb, #ef4444 14%, transparent); color:#ef4444; }
  .dec-pill.tone-amber  { background:color-mix(in srgb, #f59e0b 14%, transparent); color:#f59e0b; }
  .dec-pill.tone-good   { background:color-mix(in srgb, #22c55e 14%, transparent); color:#22c55e; }
  .dec-pill.tone-muted  { background:color-mix(in srgb, var(--surface-2, #f1f3f5) 70%, transparent); color:var(--dec-soft); }
  .dec-row-dot { width:7px; height:7px; border-radius:50%; display:inline-block; }

  /* ── Drawer ─────────────────────────────────────────────── */
  .dec-overlay { position:fixed; inset:0; z-index:1200; display:flex; justify-content:flex-end; }
  .dec-backdrop { flex:1; background:rgba(8,10,14,.42); backdrop-filter:blur(4px); cursor:pointer; }
  .dec-panel {
    width:min(620px, 100vw); height:100%;
    background:var(--bg); color:var(--text);
    border-left:1px solid var(--border);
    display:flex; flex-direction:column;
    box-shadow:-24px 0 64px -20px rgba(0,0,0,.45);
    animation:decIn .22s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes decIn { from { transform:translateX(20px); opacity:0; } to { transform:none; opacity:1; } }

  /* ── Detail sub-page (Codex-style) ─────────────────────── */
  .dec-os-detail {
    --text: var(--portal-text, #0f0f10);
    --text-secondary: var(--portal-muted, #6e717e);
    --dec-soft: var(--portal-soft, #8f93a4);
    --dec-dark: var(--portal-text, #0f0f10);
    --dec-card-bg: var(--portal-card, #fff);
    --border: color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 85%, transparent);
    --card: var(--portal-card, #fff);
    --surface-2: var(--portal-pill-bg, #f1f3f5);
    --accent: var(--portal-btn-primary, #5b647d);
    --btn-prim: var(--portal-btn-primary, #5b647d);
    --btn-prim-text: #fff;
    display:flex; flex-direction:column; overflow:hidden;
    height:100%; min-height:0;
    letter-spacing:var(--ls-body, 0.017em);
  }

  .dec-detail-hero {
    flex:0 0 auto;
    padding:28px 48px 24px;
    border-bottom:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 65%, transparent);
    position:relative; z-index:2;
  }
  [data-theme="dark"] .dec-detail-hero,
  [data-theme="classic-dark"] .dec-detail-hero {
    border-bottom-color:rgba(255,255,255,.08);
  }

  .dec-detail-toolbar {
    display:flex; align-items:center; justify-content:space-between;
    gap:16px; margin-bottom:28px;
  }
  .dec-detail-back {
    display:inline-flex; align-items:center; gap:6px;
    font-size:13px; color:var(--dec-soft); text-decoration:none;
    transition:color .14s ease;
    letter-spacing:var(--ls-body, 0.017em);
  }
  .dec-detail-back:hover { color:var(--dec-dark); }
  .dec-detail-tagro-btn {
    display:inline-flex; align-items:center; justify-content:center;
    height:32px; padding:0 14px; border-radius:8px;
    background:var(--portal-btn-primary, #5b647d); color:#fff; border:0;
    font:inherit; font-size:13px; font-weight:500;
    letter-spacing:var(--ls-body, 0.017em);
    cursor:pointer; transition:background .14s ease;
    flex-shrink:0;
  }
  .dec-detail-tagro-btn:hover {
    background:color-mix(in srgb, var(--portal-btn-primary, #5b647d) 88%, #000);
  }

  .dec-detail-hero-main { margin-bottom:16px; }
  .dec-detail-hero-text {
    display:flex; flex-direction:column; gap:10px;
    max-width:640px;
  }
  .dec-detail-title {
    margin:0;
    font-size:34px; font-weight:500; color:var(--dec-dark);
    letter-spacing:-0.025em; line-height:1.12;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .dec-detail-subtitle {
    margin:0;
    font-size:16px; font-weight:400; color:var(--dec-soft);
    line-height:1.5; letter-spacing:var(--ls-body, 0.017em);
    max-width:520px;
  }

  .dec-detail-meta-row {
    display:flex; flex-wrap:wrap; align-items:center; gap:8px;
  }
  .dec-detail-meta-chip {
    display:inline-flex; align-items:center; gap:6px;
    height:26px; padding:0 10px; border-radius:7px;
    font-size:12px; font-weight:500; color:var(--dec-soft);
    background:var(--portal-pill-bg, #f1f3f5);
    letter-spacing:var(--ls-body, 0.017em);
  }
  .dec-detail-meta-chip--amber { color:#b98700; background:rgba(185,135,0,.1); }
  .dec-detail-meta-chip--red { color:#d14343; background:rgba(209,67,67,.1); }
  .dec-detail-meta-chip--good { color:#28a745; background:rgba(52,199,89,.1); }
  .dec-detail-meta-chip--muted { color:var(--dec-soft); }
  .dec-detail-meta-chip--time { gap:5px; background:transparent; padding:0 4px 0 0; }
  .dec-detail-project-dot {
    width:7px; height:7px; border-radius:50%; flex-shrink:0;
  }

  .dec-detail-loading {
    padding:48px 48px; color:var(--dec-soft); font-size:14px;
  }
  .dec-detail-page {
    flex:1; min-height:0; overflow-y:auto;
    padding:32px 48px 72px;
    overscroll-behavior:contain;
    scrollbar-width:none;
  }
  .dec-detail-page::-webkit-scrollbar { display:none; }
  .dec-detail-article {
    width:100%; max-width:640px;
    display:flex; flex-direction:column;
  }

  /* Page body — no drawer chrome */
  .dec-page-body {
    padding:0 !important;
    gap:28px !important;
    overflow:visible !important;
  }
  .dec-page-body .dec-tagro {
    border-radius:12px;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 80%, transparent);
    background:color-mix(in srgb, var(--portal-pill-bg, #f1f3f5) 45%, transparent);
    padding:20px 22px;
  }
  [data-theme="dark"] .dec-page-body .dec-tagro,
  [data-theme="classic-dark"] .dec-page-body .dec-tagro {
    border-color:rgba(255,255,255,.08);
    background:rgba(255,255,255,.04);
  }
  .dec-page-body .dec-tagro-kicker {
    font-size:12px; letter-spacing:var(--ls-body, 0.017em);
    text-transform:none; font-weight:500; color:var(--dec-dark);
  }
  .dec-page-body .dec-tagro-run {
    height:30px; padding:0 12px; border-radius:8px;
    background:transparent;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 90%, transparent);
    color:var(--dec-soft);
    font-size:12px;
  }
  .dec-page-body .dec-tagro-run:hover:not(:disabled) {
    background:var(--portal-row-hover, rgba(241,243,245,.4));
    color:var(--dec-dark);
  }
  .dec-page-body .dec-tagro-text {
    font-size:14px; line-height:1.55; color:var(--dec-dark);
    font-weight:400;
  }
  .dec-page-body .dec-tagro-apply {
    height:30px; border-radius:8px;
    background:transparent;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 90%, transparent);
    color:var(--dec-dark);
    font-size:12px;
  }
  .dec-page-body .dec-tagro-apply:hover { background:var(--portal-row-hover); }

  .dec-page-body .dec-answer-label {
    margin:0 0 4px;
    font-size:14px; font-weight:500;
    text-transform:none; letter-spacing:var(--ls-body, 0.017em);
    color:var(--dec-dark);
  }
  .dec-page-body .dec-options { gap:6px; }
  .dec-page-body .dec-option {
    padding:14px 16px;
    border-radius:10px;
    border:1px solid transparent;
    background:transparent;
    transition:background .14s ease, border-color .14s ease;
  }
  .dec-page-body .dec-option:hover {
    background:var(--portal-row-hover, rgba(241,243,245,.4));
  }
  .dec-page-body .dec-option.on {
    background:var(--glass-nav-active, rgba(0,0,0,.055));
    border-color:color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 90%, transparent);
    box-shadow:none;
  }
  [data-theme="dark"] .dec-page-body .dec-option.on,
  [data-theme="classic-dark"] .dec-page-body .dec-option.on {
    background:rgba(255,255,255,.08);
    border-color:rgba(255,255,255,.1);
  }
  .dec-page-body .dec-option.tagro.on {
    border-color:color-mix(in srgb, var(--portal-btn-primary, #5b647d) 35%, transparent);
  }
  .dec-page-body .dec-option-body strong {
    font-size:14px; color:var(--dec-dark);
  }
  .dec-page-body .dec-note {
    margin-top:4px;
    padding:12px 0;
    border-top:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 60%, transparent);
    font-size:14px; font-weight:400;
  }
  .dec-page-body .dec-answer-actions {
    display:flex; flex-wrap:wrap; gap:8px;
    padding-top:8px;
    border-top:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 60%, transparent);
  }
  .dec-page-body .dec-final {
    border-top:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 60%, transparent);
    padding-top:20px;
  }

  .dec-detail-empty {
    padding:64px 48px; color:var(--dec-soft);
    display:flex; flex-direction:column; align-items:flex-start; gap:16px;
  }

  .dec-drawer-head {
    display:flex; justify-content:space-between; align-items:flex-start;
    padding:18px 22px 10px;
    border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .dec-drawer-meta { display:flex; flex-direction:column; gap:2px; min-width:0; }
  .dec-kicker { font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--dec-soft); }
  .dec-saved { font-size:11px; color:var(--dec-soft); display:inline-flex; align-items:center; gap:4px; }
  .dec-drawer-actions { display:flex; gap:2px; }
  .dec-icon-btn {
    width:28px; height:28px; border:0; background:transparent;
    color:var(--dec-soft); border-radius:7px; cursor:pointer;
    display:inline-flex; align-items:center; justify-content:center;
    transition:background .12s, color .12s;
  }
  .dec-icon-btn:hover { background:var(--surface-2); color:var(--text); }

  .dec-drawer-body {
    flex:1; min-height:0; overflow-y:auto;
    padding:18px 22px 50px;
    display:flex; flex-direction:column; gap:16px;
  }
  .dec-d-title { margin:0; font-size:20px; font-weight:500; color:var(--text); letter-spacing:-.012em; }
  .dec-d-desc { margin:0; font-size:13px; line-height:1.55; color:var(--text); font-weight:500; }
  .dec-d-meta { display:flex; flex-wrap:wrap; gap:6px; }

  .dec-tagro {
    border:1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
    border-radius:14px; padding:14px 16px;
    background:color-mix(in srgb, var(--accent) 4%, transparent);
    display:flex; flex-direction:column; gap:10px;
  }
  .dec-tagro-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
  .dec-tagro-kicker {
    display:inline-flex; align-items:center; gap:5px;
    font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--text);
  }
  .dec-tagro-time { display:block; margin-top:2px; font-size:10.5px; color:var(--dec-soft); }
  .dec-tagro-run {
    display:inline-flex; align-items:center; gap:5px;
    height:26px; padding:0 11px; border-radius:8px;
    background:var(--card); color:var(--text); border:1px solid var(--border);
    font:inherit; font-size:11.5px; font-weight:500; cursor:pointer;
    transition:background .12s; white-space:nowrap;
  }
  .dec-tagro-run:hover:not(:disabled) { background:var(--surface-2); }
  .dec-tagro-run:disabled { opacity:.5; cursor:not-allowed; }
  .dec-tagro-empty { margin:0; font-size:12.5px; color:var(--dec-soft); line-height:1.55; }

  .dec-tagro-rec { display:flex; flex-direction:column; gap:7px; }
  .dec-tagro-pick { font-size:12.5px; color:var(--text); }
  .dec-tagro-pick strong { font-weight:500; color:var(--text); }
  .dec-tagro-text { margin:0; font-size:13px; line-height:1.55; color:var(--text); }
  .dec-tagro-apply {
    align-self:flex-start;
    height:28px; padding:0 12px; border:0; border-radius:8px;
    background:var(--card); color:var(--text); border:1px solid var(--border);
    font:inherit; font-size:11.5px; font-weight:500; cursor:pointer;
  }
  .dec-tagro-apply:hover { background:var(--surface-2); }

  .dec-answer { display:flex; flex-direction:column; gap:9px; }
  .dec-answer-label {
    margin:0; font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--dec-soft);
  }
  /* Notebook-style options: no resting border; the selected state carries the
     affordance via a soft surface tint + an inset accent stripe. */
  .dec-options { display:flex; flex-direction:column; gap:2px; }
  .dec-option {
    display:flex; align-items:flex-start; gap:9px;
    padding:12px 10px; border:0; border-radius:10px;
    cursor:pointer; transition:background .12s, box-shadow .12s;
    position:relative; background:transparent;
  }
  .dec-option:hover { background:color-mix(in srgb, var(--surface-2) 38%, transparent); }
  .dec-option.on {
    background:color-mix(in srgb, var(--surface-2) 62%, transparent);
    box-shadow:inset 3px 0 0 var(--text);
  }
  .dec-option.tagro { box-shadow:inset 3px 0 0 var(--accent); }
  .dec-option input { margin-top:3px; flex-shrink:0; }
  .dec-option-body { display:flex; flex-direction:column; gap:2px; min-width:0; flex:1; }
  .dec-option-body strong { font-size:13px; color:var(--text); font-weight:500; }
  .dec-option-body small { font-size:11.5px; color:var(--dec-soft); }
  .dec-option-tagro {
    display:inline-flex; align-items:center; gap:3px;
    font-size:10px; letter-spacing:.08em; text-transform:uppercase;
    color:var(--accent); align-self:center;
  }

  /* Notepad-style — no box, no underline. */
  .dec-note {
    width:100%; min-height:90px; resize:vertical;
    background:transparent; border:0; border-radius:0;
    padding:6px 0;
    color:var(--text); font:inherit; font-size:13.5px; font-weight:500; line-height:1.6;
    letter-spacing:.017em; outline:0;
  }
  .dec-note::placeholder { color:var(--dec-soft); opacity:.6; }

  .dec-answer-actions { display:flex; gap:8px; align-items:center; }
  .dec-primary {
    display:inline-flex; align-items:center; gap:5px;
    height:34px; padding:0 16px; border-radius:8px;
    background:var(--portal-btn-primary, #5b647d); color:#fff; border:0;
    font:inherit; font-size:13px; font-weight:500; cursor:pointer;
    transition:background .14s ease;
    letter-spacing:var(--ls-body, 0.017em);
  }
  .dec-primary:hover:not(:disabled) { background:color-mix(in srgb, var(--portal-btn-primary, #5b647d) 90%, #000); }
  .dec-primary:active:not(:disabled) { background:color-mix(in srgb, var(--portal-btn-primary, #5b647d) 82%, #000); }
  .dec-primary:disabled { opacity:.4; cursor:not-allowed; }
  .dec-error { margin:0; font-size:12px; color:#ef4444; display:inline-flex; align-items:center; gap:4px; }

  .dec-final {
    border-top:1px solid color-mix(in srgb, var(--border) 50%, transparent);
    padding-top:14px; display:flex; flex-direction:column; gap:6px;
  }
  .dec-final-pick { display:inline-flex; align-items:center; gap:6px; font-size:13.5px; color:var(--text); }
  .dec-final-pick svg { color:#22c55e; }
  .dec-final-note { margin:0; font-size:12.5px; color:var(--text); line-height:1.55; }
  .dec-final-meta { font-size:11px; color:var(--dec-soft); }
  .dec-override-window {
    display:inline-flex; align-items:center; gap:5px;
    color:color-mix(in srgb, #f59e0b 78%, var(--text));
  }
  .dec-override-window.expired { color:var(--dec-soft); }
  .dec-override-window svg { flex:none; }

  /* ── v1 additions: binary / multi / delegate / discuss / clarification ── */
  /* Notebook-style notice: no border, soft tint + left accent only. */
  .dec-clarification {
    border:0;
    background:color-mix(in srgb, #f59e0b 8%, transparent);
    box-shadow:inset 3px 0 0 color-mix(in srgb, #f59e0b 55%, transparent);
    border-radius:8px; padding:12px 14px;
    font-size:12.5px; line-height:1.55; color:var(--text); font-weight:500;
  }

  .dec-binary { display:flex; gap:8px; }
  .dec-binary-btn {
    flex:1; height:46px; padding:0 16px;
    border:1px solid var(--border); border-radius:12px;
    background:var(--card); color:var(--text);
    font:inherit; font-size:14px; font-weight:500;
    cursor:pointer; transition:border-color .12s, background .12s;
  }
  .dec-binary-btn:hover { border-color:color-mix(in srgb, var(--text) 25%, var(--border)); }
  .dec-binary-btn.on {
    border-color:var(--text);
    background:color-mix(in srgb, var(--surface-2) 50%, transparent);
  }

  .dec-rationale { min-height:60px; margin-top:2px; }

  .dec-secondary {
    display:inline-flex; align-items:center; gap:5px;
    height:34px; padding:0 16px; border-radius:8px;
    background:transparent; color:var(--dec-dark);
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 90%, transparent);
    font:inherit; font-size:13px; font-weight:500; cursor:pointer;
    transition:background .14s ease, border-color .14s ease;
    letter-spacing:var(--ls-body, 0.017em);
  }
  .dec-secondary:hover:not(:disabled) {
    background:var(--portal-row-hover, rgba(241,243,245,.4));
    border-color:color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 100%, transparent);
  }
  .dec-secondary:disabled { opacity:.5; cursor:not-allowed; }
  .dec-secondary-quiet {
    background:transparent;
    color:var(--dec-soft);
    border-color:transparent;
  }
  .dec-secondary-quiet:hover:not(:disabled) {
    background:var(--surface-2);
    color:var(--text);
    border-color:var(--border);
  }

  /* Assign-to-teammate dropdown */
  .dec-assign-wrap { position:relative; display:inline-flex; }
  .dec-assign-menu {
    position:absolute; bottom:calc(100% + 8px); right:0; z-index:40;
    min-width:230px; max-height:280px; overflow-y:auto;
    padding:6px; border-radius:14px;
    background:var(--card); border:1px solid var(--border);
    box-shadow:0 18px 44px -18px rgba(0,0,0,.5);
    display:flex; flex-direction:column; gap:2px;
  }
  .dec-assign-head {
    margin:2px 6px 4px; font-size:10.5px; font-weight:500;
    letter-spacing:.08em; text-transform:uppercase; color:var(--dec-soft);
  }
  .dec-assign-opt {
    display:flex; align-items:center; gap:9px;
    padding:8px 9px; border:0; background:transparent; border-radius:10px;
    text-align:left; cursor:pointer; color:var(--text); font:inherit; font-size:12.5px;
  }
  .dec-assign-opt:hover:not(:disabled) { background:var(--surface-2); }
  .dec-assign-opt:disabled { cursor:default; }
  .dec-assign-opt.on { color:var(--text); }
  .dec-assign-av {
    width:24px; height:24px; border-radius:50%; flex:0 0 auto;
    display:inline-flex; align-items:center; justify-content:center; overflow:hidden;
    background:var(--surface-2); color:var(--text-secondary);
    font-size:10px; font-weight:600;
  }
  .dec-assign-av img { width:100%; height:100%; object-fit:cover; display:block; }
  .dec-assign-name { flex:1; min-width:0; display:flex; flex-direction:column; }
  .dec-assign-name small { color:var(--dec-soft); font-size:10.5px; margin-top:1px; }

  .dec-discuss {
    display:flex; flex-direction:column; gap:8px;
    padding-top:6px;
  }
  .dec-discuss-actions { display:flex; justify-content:flex-end; }

  .dec-final-multi { display:flex; flex-direction:column; gap:5px; }
  .dec-final-text {
    margin:0; padding:10px 12px;
    border:1px solid var(--border); border-radius:10px;
    background:color-mix(in srgb, var(--surface-2) 30%, transparent);
    font-size:13px; color:var(--text); line-height:1.55; font-weight:500;
    white-space:pre-wrap;
  }
  .dec-delegation-reason {
    display:flex; align-items:flex-start; gap:6px;
    color:var(--dec-soft); font-style:italic;
  }
  .dec-delegation-reason svg { margin-top:3px; flex-shrink:0; color:var(--accent); }

  @media (max-width: 1400px) {
    .dec-static-top { padding:36px 40px 0; }
    .dec-scroll-body { padding:20px 40px 60px; }
  }
  @media (max-width: 1100px) {
    .dec-static-top { padding:32px 32px 0; }
    .dec-scroll-body { padding:16px 32px 48px; }
  }
  @media (max-width: 900px) {
    .dec-static-top { padding:24px 20px 12px; }
    .dec-scroll-body { padding:8px 20px 40px; }
    .dec-card { flex-direction:column; gap:20px; padding:18px 12px; align-items:stretch; }
    .dec-card-left, .dec-card-mid, .dec-card-meta, .dec-card-actions { width:100%; }
    .dec-card-meta { gap:24px; flex-direction:row; }
    .dec-card-actions { flex-direction:row; flex-wrap:wrap; gap:8px; align-items:stretch; }
    .dec-card-actions > button, .dec-card-actions > a { width:auto; flex:1; min-width:80px; }
    .dec-detail-hero { padding:20px 20px 18px; }
    .dec-detail-page { padding:24px 20px 48px; }
    .dec-detail-title { font-size:26px; }
    .dec-detail-subtitle { font-size:15px; }
    .dec-detail-toolbar { margin-bottom:20px; }
    .dec-detail-loading { padding:32px 20px; }
    .dec-detail-empty { padding:48px 20px; }
    .dec-hero-title { font-size:30px; }
    .dec-hero-sub p { font-size:18px; }
    .dec-panel { width:100vw; }
    .dec-answer-actions { flex-direction:column; align-items:stretch; }
    .dec-answer-actions > button { width:100%; justify-content:center; }
    .dec-binary-btn { height:52px; font-size:15px; }
  }
  @media (max-width: 768px) {
    .dec-hero { display:none; }
  }
`
