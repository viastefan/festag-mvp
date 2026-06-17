/** Shared inbox design system — mirrors .dec-os portal patterns. */
export const INBOX_CSS = `
  .inb-os {
    --inb-soft: var(--portal-muted, #8f93a4);
    --inb-dark: var(--portal-text, #0f0f10);
    --inb-card-bg: var(--portal-card, #fff);
    --inb-muted: var(--portal-muted, #90959F);
    --inb-pill-surface: var(--portal-pill-bg, #f1f3f5);
    --inb-cta-bg: var(--portal-btn-primary, #5b647d);
    --inb-cta-text: #fff;
    --inb-cta-hover: color-mix(in srgb, var(--portal-btn-primary, #5b647d) 88%, #000);
    --inb-row-hover-bg: color-mix(in srgb, var(--portal-row-hover, rgba(241,243,245,.4)) 72%, transparent);
    --inb-row-hover-inset: rgba(255,255,255,.65);
    --inb-row-hover-ring: rgba(15,23,42,.06);
    --inb-slate: var(--portal-btn-primary, #5b647d);
    width:100%; height:100%; min-height:0; color:var(--inb-dark);
    display:flex; flex-direction:column; overflow:hidden;
    letter-spacing:0;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-weight:400;
    position:relative;
  }
  [data-theme="dark"] .inb-os,
  [data-theme="classic-dark"] .inb-os {
    --inb-soft: var(--portal-muted, #9aa0ac);
    --inb-muted: var(--portal-muted, #9aa0ac);
    --inb-pill-surface: rgba(255,255,255,.07);
    --inb-cta-bg: #ffffff;
    --inb-cta-text: #121214;
    --inb-cta-hover: #f0f0f2;
    --inb-row-hover-bg: color-mix(in srgb, var(--surface-2, #131922) 34%, transparent);
    --inb-row-hover-inset: rgba(255,255,255,.05);
    --inb-row-hover-ring: rgba(255,255,255,.07);
  }

  .inb-static-top {
    flex:0 0 auto; position:relative; z-index:8;
    background:var(--inb-card-bg);
    padding:clamp(48px, 6vh, 72px) var(--festag-content-pad-x, 56px) 0;
    box-sizing:border-box;
    border-bottom:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 55%, transparent);
  }
  [data-theme="dark"] .inb-static-top,
  [data-theme="classic-dark"] .inb-static-top {
    border-bottom-color:rgba(255,255,255,.07);
  }

  .inb-page-head {
    display:flex; align-items:flex-start; justify-content:space-between;
    gap:24px; padding-bottom:22px;
    max-width:var(--festag-content-max, 1080px);
    margin:0 auto;
    width:100%;
    box-sizing:border-box;
  }
  .inb-page-head-copy { flex:1; min-width:0; display:flex; flex-direction:column; gap:8px; }
  .inb-page-title {
    margin:0; font-size:32px; font-weight:400; color:var(--inb-dark);
    letter-spacing:var(--ls-header, 0.012em); line-height:1.15;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .inb-page-lead p {
    margin:0; font-size:17px; font-weight:400; color:var(--inb-soft);
    line-height:1.5; letter-spacing:0;
  }
  .inb-page-actions {
    display:flex; align-items:center; gap:8px; flex-shrink:0; padding-top:6px;
  }
  .inb-page-actions-group { display:flex; gap:6px; align-items:center; }

  .inb-head-tool {
    width:32px; height:32px; min-width:32px; min-height:32px;
    padding:0; flex-shrink:0; box-sizing:border-box;
    border:1px solid rgba(15,23,42,.09);
    border-radius:50%;
    background:#fff;
    color:#6e717e;
    display:inline-flex; align-items:center; justify-content:center;
    cursor:pointer;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,1),
      0 1px 0 rgba(15,23,42,.03),
      0 2px 5px -1px rgba(15,23,42,.11),
      0 5px 12px -4px rgba(15,23,42,.09);
    transition:background .12s, box-shadow .12s, color .12s, transform .1s, border-color .12s;
  }
  .inb-head-tool svg { width:15px; height:15px; flex-shrink:0; }
  .inb-head-tool:hover {
    color:#2a3032; background:#fafafa; border-color:rgba(15,23,42,.11);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,1),
      0 2px 6px -1px rgba(15,23,42,.12),
      0 6px 14px -4px rgba(15,23,42,.11);
  }
  .inb-head-tool:active {
    transform:translateY(1px);
    box-shadow:
      inset 0 1px 2px rgba(15,23,42,.09),
      0 1px 2px -1px rgba(15,23,42,.06);
  }
  .inb-head-tool.on {
    color:var(--inb-dark);
    border-color:color-mix(in srgb, var(--portal-btn-primary, #5b647d) 35%, transparent);
    background:color-mix(in srgb, var(--portal-btn-primary, #5b647d) 8%, #fff);
  }
  [data-theme="dark"] .inb-head-tool,
  [data-theme="classic-dark"] .inb-head-tool {
    background:rgba(255,255,255,.06);
    border-color:rgba(255,255,255,.10);
    color:#9aa0ac;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.07),
      0 2px 6px -2px rgba(0,0,0,.28),
      0 6px 14px -6px rgba(0,0,0,.24);
  }
  [data-theme="dark"] .inb-head-tool:hover,
  [data-theme="classic-dark"] .inb-head-tool:hover {
    background:rgba(255,255,255,.09); color:#f4f4f4; border-color:rgba(255,255,255,.14);
  }
  [data-theme="dark"] .inb-head-tool.on,
  [data-theme="classic-dark"] .inb-head-tool.on {
    color:#f4f4f4; background:rgba(255,255,255,.1); border-color:rgba(255,255,255,.16);
  }

  .inb-filter-wrap { position:relative; display:inline-flex; }
  .inb-filter-menu {
    position:absolute; top:calc(100% + 8px); right:0; z-index:30;
    min-width:280px; max-width:340px; padding:6px;
    background:var(--inb-card-bg);
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 80%, transparent);
    border-radius:12px;
    box-shadow:0 1px 2px rgba(15,23,42,.08), 0 18px 44px rgba(15,23,42,.16);
    display:flex; flex-direction:column; gap:2px;
    animation:inbMenuIn .14s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes inbMenuIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
  [data-theme="dark"] .inb-filter-menu,
  [data-theme="classic-dark"] .inb-filter-menu {
    border-color:rgba(255,255,255,.1);
    box-shadow:0 1px 2px rgba(0,0,0,.4), 0 22px 52px rgba(0,0,0,.42);
  }
  .inb-filter-menu-label {
    margin:6px 10px 4px; font-size:11px; font-weight:400; letter-spacing:.06em;
    text-transform:uppercase; color:var(--inb-muted);
  }
  .inb-filter-menu-item {
    display:grid; grid-template-columns:16px 1fr auto auto;
    gap:9px; align-items:center;
    width:100%; padding:9px 10px;
    border:0; background:transparent; border-radius:10px !important;
    color:var(--inb-dark); font-family:inherit; font-size:13px; font-weight:400;
    letter-spacing:0; cursor:pointer; text-align:left;
    transition:background .1s;
  }
  .inb-filter-menu-item > svg { color:var(--inb-muted); }
  .inb-filter-menu-item.on > svg { color:var(--inb-dark); }
  .inb-filter-menu-item:hover { background:var(--inb-row-hover-bg); }
  .inb-filter-menu-item.on { background:color-mix(in srgb, var(--inb-pill-surface) 90%, transparent); }
  .inb-filter-menu-item-main { display:flex; flex-direction:column; gap:1px; min-width:0; }
  .inb-filter-menu-item-main strong { font-size:13px; font-weight:400; color:var(--inb-dark); }
  .inb-filter-menu-item-main small {
    font-size:11px; font-weight:400; color:var(--inb-muted);
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:220px;
  }
  .inb-filter-count {
    display:inline-flex; align-items:center; justify-content:center;
    min-width:18px; height:18px; padding:0 6px; border-radius:999px;
    background:color-mix(in srgb, var(--inb-slate) 14%, transparent);
    color:var(--inb-slate); font-size:10px; font-weight:500;
  }
  .inb-filter-check { font-size:12px; color:var(--inb-muted); }

  /* ── Split body (client master-detail) ── */
  .inb-body {
    flex:1 1 auto; min-height:0;
    display:grid;
    grid-template-columns:minmax(300px, 380px) minmax(0, 1fr);
    overflow:hidden;
  }
  .inb-list-col {
    display:flex; flex-direction:column; min-height:0; min-width:0;
    border-right:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 55%, transparent);
    background:var(--inb-card-bg);
  }
  [data-theme="dark"] .inb-list-col,
  [data-theme="classic-dark"] .inb-list-col {
    border-right-color:rgba(255,255,255,.07);
  }
  .inb-list-toolbar {
    display:flex; align-items:center; justify-content:space-between; gap:8px;
    padding:12px 20px 10px;
    flex-shrink:0;
  }
  .inb-list-toolbar-label {
    font-size:13px; font-weight:400; color:var(--inb-muted);
  }
  .inb-list-scroll {
    flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden;
    padding:4px 12px 24px;
    scrollbar-width:none;
  }
  .inb-list-scroll::-webkit-scrollbar { display:none; }

  .inb-row {
    display:flex; align-items:stretch; gap:10px;
    width:100%; border:0; background:transparent;
    padding:12px 14px; text-align:left;
    border-radius:12px; cursor:pointer;
    font-family:inherit; color:var(--inb-dark);
    transition:background .14s ease, box-shadow .14s ease;
    box-shadow:inset 0 1px 0 transparent, 0 0 0 1px transparent;
  }
  .inb-row:hover {
    background:var(--inb-row-hover-bg);
    box-shadow:
      inset 0 1px 0 var(--inb-row-hover-inset),
      0 0 0 1px var(--inb-row-hover-ring);
  }
  .inb-row.on {
    background:color-mix(in srgb, var(--inb-pill-surface) 85%, transparent);
    box-shadow:
      inset 0 1px 0 var(--inb-row-hover-inset),
      0 0 0 1px var(--inb-row-hover-ring);
  }
  .inb-row-marker {
    width:3px; min-width:3px; border-radius:2px; align-self:stretch; flex-shrink:0;
  }
  .inb-row-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; }
  .inb-row-head {
    display:flex; align-items:center; gap:7px;
    font-size:12px; font-weight:400; color:var(--inb-muted); line-height:1.3;
  }
  .inb-row-source { color:var(--inb-soft); }
  .inb-row-tag {
    font-size:11px; padding:2px 7px; border-radius:999px;
    background:var(--inb-pill-surface); color:var(--inb-muted);
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:130px;
  }
  .inb-row-time { margin-left:auto; font-size:11px; color:var(--inb-muted); flex-shrink:0; }
  .inb-row-title {
    font-size:15px; font-weight:400; color:var(--inb-dark); line-height:1.35;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .inb-row:not(.unread) .inb-row-title { color:var(--inb-soft); }
  .inb-row-preview {
    font-size:13px; color:var(--inb-muted); line-height:1.4; font-weight:400;
    overflow:hidden; text-overflow:ellipsis;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  }
  .inb-row-actionable {
    display:inline-flex; align-items:center; gap:4px; margin-top:2px;
    font-size:11px; font-weight:400; color:var(--inb-slate);
  }

  .inb-detail-col {
    display:flex; flex-direction:column; min-height:0; min-width:0;
    overflow-y:auto; background:var(--inb-card-bg);
    scrollbar-width:none;
  }
  .inb-detail-col::-webkit-scrollbar { display:none; }
  .inb-detail-inner {
    width:100%; max-width:680px; margin:0 auto;
    padding:clamp(32px, 5vh, 56px) clamp(24px, 4vw, 48px) 64px;
    box-sizing:border-box;
    display:flex; flex-direction:column; gap:24px;
  }
  .inb-detail-back {
    display:none; align-items:center; gap:6px;
    border:0; background:transparent; padding:0;
    font-family:inherit; font-size:13px; font-weight:400;
    color:var(--inb-muted); cursor:pointer;
  }
  .inb-detail-back:hover { color:var(--inb-dark); }
  .inb-detail-tags { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
  .inb-type-badge {
    display:inline-flex; align-items:center;
    height:24px; padding:0 10px; border-radius:999px;
    font-size:12px; font-weight:400;
    background:var(--inb-pill-surface); color:var(--inb-muted);
  }
  .inb-detail-project { font-size:13px; color:var(--inb-muted); font-weight:400; }
  .inb-detail-title {
    margin:0; font-size:28px; font-weight:400; color:var(--inb-dark);
    letter-spacing:0; line-height:1.25;
  }
  .inb-detail-meta {
    display:flex; align-items:center; gap:6px; flex-wrap:wrap;
    font-size:14px; color:var(--inb-muted); margin-top:-8px;
  }
  .inb-detail-body {
    font-size:16px; line-height:1.7; color:var(--inb-soft); font-weight:400;
  }
  .inb-detail-body p { margin:0; white-space:pre-wrap; }

  .inb-video {
    display:flex; align-items:center; gap:14px;
    padding:14px 16px; border-radius:12px; text-decoration:none;
    background:var(--inb-pill-surface);
    transition:background .12s ease;
  }
  .inb-video:hover { background:color-mix(in srgb, var(--inb-pill-surface) 70%, var(--inb-row-hover-bg)); }
  .inb-video-play {
    width:36px; height:36px; flex-shrink:0; border-radius:10px;
    display:flex; align-items:center; justify-content:center;
    background:var(--inb-slate); color:#fff;
  }
  .inb-video strong { display:block; font-size:14px; font-weight:400; color:var(--inb-dark); }
  .inb-video small { display:block; margin-top:2px; font-size:12px; color:var(--inb-muted); }

  .inb-detail-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; padding-top:4px; }

  /* ── Feed rows (dev / list-only) ── */
  .inb-scroll-body {
    flex:1 1 auto; min-height:0;
    overflow-y:auto; overflow-x:hidden;
    width:100%;
    max-width:var(--festag-content-max, 1080px);
    margin:0 auto;
    padding:20px var(--festag-content-pad-x, 56px) var(--festag-content-pad-bottom, 88px);
    box-sizing:border-box;
    overscroll-behavior:contain;
    scrollbar-width:none;
  }
  .inb-scroll-body::-webkit-scrollbar { display:none; }

  .inb-feed { display:flex; flex-direction:column; gap:4px; }
  .inb-feed-row {
    display:grid; grid-template-columns:36px 1fr auto; gap:16px; align-items:flex-start;
    padding:16px 20px; width:100%;
    border-radius:12px; border:0; background:transparent;
    color:var(--inb-dark); text-decoration:none; cursor:pointer;
    font-family:inherit; text-align:left;
    transition:background .14s ease, box-shadow .14s ease;
    box-shadow:inset 0 1px 0 transparent, 0 0 0 1px transparent;
  }
  .inb-feed-row:hover {
    background:var(--inb-row-hover-bg);
    box-shadow:
      inset 0 1px 0 var(--inb-row-hover-inset),
      0 0 0 1px var(--inb-row-hover-ring);
  }
  .inb-feed-row.read { opacity:.58; }
  .inb-feed-icon {
    width:36px; height:36px; border-radius:10px;
    display:inline-flex; align-items:center; justify-content:center;
    background:var(--inb-pill-surface); color:var(--inb-muted); flex-shrink:0;
  }
  .inb-feed-row.tone-good .inb-feed-icon { background:color-mix(in srgb, var(--green-dark, #1a7f4b) 14%, transparent); color:var(--green-dark, #1a7f4b); }
  .inb-feed-row.tone-warn .inb-feed-icon { background:color-mix(in srgb, var(--amber, #d97706) 14%, transparent); color:var(--amber, #d97706); }
  .inb-feed-row.tone-risk .inb-feed-icon { background:color-mix(in srgb, var(--red, #dc2626) 14%, transparent); color:var(--red, #dc2626); }
  .inb-feed-row.tone-accent .inb-feed-icon { background:color-mix(in srgb, var(--accent, #6366f1) 14%, transparent); color:var(--accent, #6366f1); }
  .inb-feed-main { min-width:0; display:flex; flex-direction:column; gap:6px; }
  .inb-feed-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; row-gap:4px; }
  .inb-feed-badge {
    display:inline-flex; align-items:center; height:22px; padding:0 9px; border-radius:999px;
    font-size:11px; font-weight:400; letter-spacing:.04em;
    background:var(--inb-pill-surface); color:var(--inb-muted);
  }
  .inb-feed-badge.tone-good { color:var(--green-dark, #1a7f4b); background:color-mix(in srgb, var(--green-dark, #1a7f4b) 12%, transparent); }
  .inb-feed-badge.tone-warn { color:var(--amber, #d97706); background:color-mix(in srgb, var(--amber, #d97706) 12%, transparent); }
  .inb-feed-badge.tone-risk { color:var(--red, #dc2626); background:color-mix(in srgb, var(--red, #dc2626) 12%, transparent); }
  .inb-feed-badge.tone-accent { color:var(--accent, #6366f1); background:color-mix(in srgb, var(--accent, #6366f1) 12%, transparent); }
  .inb-feed-project {
    display:inline-flex; align-items:center; gap:5px;
    font-size:12px; color:var(--inb-muted); font-weight:400;
    max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .inb-feed-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .inb-feed-unread { width:7px; height:7px; border-radius:50%; background:var(--inb-slate); flex-shrink:0; }
  .inb-feed-time { font-size:12px; color:var(--inb-muted); font-weight:400; }
  .inb-feed-title { margin:0; font-size:16px; font-weight:400; color:var(--inb-dark); line-height:1.42; }
  .inb-feed-body {
    margin:0; font-size:14px; line-height:1.5; color:var(--inb-muted); font-weight:400;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  }
  .inb-feed-action { font-size:12px; font-weight:400; color:var(--inb-slate); margin-top:2px; }
  .inb-feed-side { display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0; padding-top:2px; }

  .inb-divider {
    height:1px; margin:8px 0;
    background:linear-gradient(90deg, transparent, color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 70%, transparent), transparent);
  }
  [data-theme="dark"] .inb-divider,
  [data-theme="classic-dark"] .inb-divider {
    background:linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent);
  }

  .inb-empty, .inb-empty-detail {
    display:flex; flex-direction:column; align-items:center;
    text-align:center; gap:8px; color:var(--inb-muted);
    padding:48px 24px;
  }
  .inb-empty-title { font-size:15px; font-weight:400; color:var(--inb-soft); margin:4px 0 0; }
  .inb-empty-sub { font-size:14px; line-height:1.55; color:var(--inb-muted); max-width:360px; margin:0; }
  .inb-loading { color:var(--inb-muted); font-size:14px; padding:12px 4px; }

  .inb-foot {
    display:flex; align-items:flex-start; gap:8px;
    margin:16px 0 0; padding-top:16px;
    border-top:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 50%, transparent);
    font-size:13px; line-height:1.55; color:var(--inb-muted); max-width:720px;
  }
  [data-theme="dark"] .inb-foot,
  [data-theme="classic-dark"] .inb-foot {
    border-top-color:rgba(255,255,255,.07);
  }
  .inb-foot svg { flex-shrink:0; margin-top:2px; }

  /* Dev shell variant — fills workspace */
  .festag-app-shell .inb-os--dev {
    height:100%; min-height:0;
  }
  .festag-app-shell .inb-os--dev .inb-static-top {
    padding:clamp(32px, 4vh, 48px) clamp(24px, 4vw, 40px) 0;
    border-bottom:1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }
  .festag-app-shell .inb-os--dev .inb-scroll-body {
    padding:16px clamp(24px, 4vw, 40px) 48px;
    max-width:1180px;
  }

  @media (max-width: 900px) {
    .inb-static-top { padding:20px 20px 0; }
    .inb-page-head { flex-direction:column; gap:14px; padding-bottom:16px; }
    .inb-page-title { font-size:26px; }
    .inb-page-lead p { font-size:15px; }
    .inb-body { grid-template-columns:1fr; }
    .inb-detail-col { display:none; }
    .inb-detail-col.inb-detail-col--open {
      display:flex; position:fixed; inset:0; z-index:90;
      background:var(--inb-card-bg);
    }
    .inb-detail-back { display:inline-flex; }
    .inb-list-col.inb-list-col--hidden { display:none; }
    .inb-filter-menu { right:auto; left:0; }
  }
`
