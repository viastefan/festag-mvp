import {
  FESTAG_CONTENT_HEAD_CSS,
  FESTAG_LIST_ROW_HOVER_CSS,
  FESTAG_MOBILE_HEAD_CSS,
  FESTAG_SCROLL_FADE_CSS,
} from '@/components/mobile/mobile-codex-list-styles'

export const DECISION_CSS = `
${FESTAG_CONTENT_HEAD_CSS}
${FESTAG_MOBILE_HEAD_CSS}
${FESTAG_LIST_ROW_HOVER_CSS}
${FESTAG_SCROLL_FADE_CSS}
  .dec-os {
    --dec-soft: var(--portal-muted, #8f93a4);
    --dec-dark: var(--portal-text, #0f0f10);
    --dec-card-bg: var(--portal-card, #F7F7F8);
    --dec-muted: var(--portal-muted, #71717A);
    --dec-pill-surface: var(--portal-pill-bg, #E4E4E7);
    --dec-cta-bg: var(--portal-btn-primary, #18181B);
    --dec-cta-text: var(--portal-btn-primary-text, #FAFAFA);
    --dec-cta-hover: color-mix(in srgb, var(--portal-btn-primary, #18181B) 88%, #000);
    --dec-row-hover-bg: color-mix(in srgb, var(--portal-row-hover, rgba(241,243,245,.4)) 72%, transparent);
    --dec-row-hover-inset: rgba(255,255,255,.65);
    --dec-row-hover-ring: rgba(15,23,42,.06);
    width:100%; height:100%; min-height:0; color:var(--dec-dark);
    display:flex; flex-direction:column;     overflow:hidden;
    position:relative;
    letter-spacing:0;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-weight:400;
    position:relative;
  }
  [data-theme="dark"] .dec-os,
  [data-theme="classic-dark"] .dec-os {
    --dec-soft: var(--portal-muted, #9aa0ac);
    --dec-muted: var(--portal-muted, #9aa0ac);
    --dec-pill-surface: rgba(255,255,255,.07);
    --dec-cta-bg: #ffffff;
    --dec-cta-text: #121214;
    --dec-cta-hover: #f0f0f2;
    --dec-row-hover-bg: color-mix(in srgb, var(--surface-2, #131922) 34%, transparent);
    --dec-row-hover-inset: rgba(255,255,255,.05);
    --dec-row-hover-ring: rgba(255,255,255,.07);
  }
  .dec-hero-bg {
    display:none;
  }
  .dec-hero-bg img { width:100%; height:100%; object-fit:cover; display:block; }
  .dec-hero-bg-top { top:0; height:255px; }
  .dec-hero-bg-bottom { bottom:0; height:129px; }

  .dec-m-t,
  .dec-m-sub,
  .dec-m-head-actions,
  .dec-m-actions,
  .dec-m-sheet-backdrop { display: none; }
  .dec-m-sheet-title { display: none; }

  .dec-fab-desktop {
    position:fixed;
    right:32px;
    bottom:32px;
    z-index:14;
    pointer-events:none;
  }
  .dec-fab-desktop .festag-content-fab {
    position:static;
    right:auto;
    bottom:auto;
    pointer-events:auto;
  }

  .dec-m-shell {
    display:flex; flex-direction:column; flex:1 1 auto; min-height:0;
  }
  .dec-static-top, .dec-scroll-body { position:relative; z-index:1; }

  .dec-static-top {
    flex:0 0 auto; position:sticky; top:0; z-index:8;
    background:var(--dec-card-bg);
    width:100%;
    max-width:var(--festag-content-max, 1080px);
    margin:0 auto;
    padding:clamp(64px, 7vh, 88px) var(--festag-content-pad-x, 56px) 0;
    box-sizing:border-box;
  }
  .dec-page-head {
    display:flex; align-items:flex-start; justify-content:space-between;
    gap:24px; padding-bottom:28px;
  }
  .dec-page-head-copy { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
  .dec-os .dec-page-title,
  .dec-os .dec-m-title h1 {
    color:var(--dec-dark);
  }
  .dec-os .dec-page-title .dec-dt,
  .dec-os .dec-m-title h1 .dec-dt,
  .dec-os header.dec-page-head .dec-page-head-copy.dec-m-title h1.dec-page-title > span.dec-dt {
    letter-spacing:-1px !important;
  }
  .dec-os .dec-page-head-copy.dec-m-title > p,
  .dec-os .dec-m-title > p {
    margin:0;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size:17px;
    font-weight:400;
    color:var(--dec-soft);
    line-height:1.5;
    letter-spacing:-1px;
  }
  .dec-os .dec-page-head-copy.dec-m-title > p .dec-dt,
  .dec-os .dec-m-title > p .dec-dt {
    font-weight:400;
    letter-spacing:-1px;
  }
  .dec-m-subline { display:none; margin:0; }
  .dec-m-lead { display: none; margin: 0; }
  .dec-page-lead { display:flex; flex-direction:column; max-width:680px; }
  .dec-page-lead-line,
  .dec-page-lead p {
    margin:0;
    color:var(--dec-soft);
  }
  .dec-page-actions {
    display:flex; align-items:center; gap:8px; flex-shrink:0;
    padding-top:6px;
  }
  .dec-page-actions-group { display:flex; gap:6px; align-items:center; }
  /* dec-head-tool base styles live in globals.css (Codex elev orbs) */

  .dec-filter-wrap,
  .dec-risks-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .dec-filter-menu {
    position: absolute; top: calc(100% + 8px); right: 0; z-index: 30;
    min-width: 220px; width: max-content; max-width: min(280px, 90vw);
    padding: 4px;
    border-radius: 10px;
    border: 1px solid rgba(15,23,42,.08);
    background: var(--portal-card, #fff);
    box-shadow:
      0 4px 14px rgba(15,23,42,.07),
      0 16px 36px -12px rgba(15,23,42,.14);
    display: flex; flex-direction: column; gap: 1px;
    animation: decMenuIn .16s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes decMenuIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: none; }
  }
  [data-theme="dark"] .dec-filter-menu,
  [data-theme="classic-dark"] .dec-filter-menu {
    background: var(--portal-card, #141416);
    border: none;
    box-shadow: 0 16px 40px -12px rgba(0,0,0,.45);
  }
  .dec-filter-menu-label {
    margin: 6px 10px 4px;
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 11px; font-weight: 400; letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--dec-soft);
  }
  .dec-filter-menu-item {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    width: 100%; min-height: 36px; padding: 0 10px;
    border: 0;
    border-radius: 8px !important;
    border-top-left-radius: 8px !important;
    border-top-right-radius: 8px !important;
    border-bottom-right-radius: 8px !important;
    border-bottom-left-radius: 8px !important;
    background: transparent;
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 14px; font-weight: 400; letter-spacing: 0;
    color: var(--dec-dark); text-align: left; cursor: pointer;
    white-space: nowrap;
    transition: background .12s ease, color .12s ease;
  }
  .dec-filter-menu-item:hover { background: rgba(15,23,42,.04); }
  .dec-filter-menu-item.on { background: rgba(15,23,42,.055); }
  .dec-filter-check { font-size: 13px; color: var(--dec-soft); flex-shrink: 0; }
  [data-theme="dark"] .dec-filter-menu-item:hover,
  [data-theme="classic-dark"] .dec-filter-menu-item:hover {
    background: rgba(255,255,255,.06);
  }
  [data-theme="dark"] .dec-filter-menu-item.on,
  [data-theme="classic-dark"] .dec-filter-menu-item.on {
    background: rgba(255,255,255,.08);
  }

  .dec-head-tool-ico {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 15px;
    height: 15px;
  }
  .dec-risks-badge {
    position: absolute;
    top: -7px;
    right: -9px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 10px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -.01em;
    color: #fff;
    background: linear-gradient(145deg, #ff5a4f 0%, #e8382c 100%);
    border: 1.5px solid var(--portal-bg, #f6f6f7);
    box-shadow:
      0 2px 8px -2px rgba(232,56,44,.55),
      0 0 0 1px rgba(232,56,44,.12);
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  .dec-risks-badge--pulse {
    animation: decRisksPulse 2.4s ease-in-out infinite;
  }
  @keyframes decRisksPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 2px 8px -2px rgba(232,56,44,.55), 0 0 0 1px rgba(232,56,44,.12); }
    50% { transform: scale(1.06); box-shadow: 0 3px 12px -2px rgba(232,56,44,.7), 0 0 0 3px rgba(232,56,44,.14); }
  }
  [data-theme="dark"] .dec-risks-badge,
  [data-theme="classic-dark"] .dec-risks-badge {
    border-color: var(--portal-bg, #0d0d0f);
  }
  .dec-head-tool--risks.on {
    color: var(--festag-elev-icon);
    border-color: var(--festag-elev-border);
    background: var(--festag-elev-on-bg);
    box-shadow: var(--festag-elev-shadow);
  }
  [data-theme="dark"] .dec-head-tool--risks.on,
  [data-theme="classic-dark"] .dec-head-tool--risks.on {
    color: var(--festag-elev-icon);
    background: var(--festag-elev-on-bg);
    border-color: var(--festag-elev-border);
  }

  .dec-risks-popover.festag-popup-surface {
    position: absolute;
    top: calc(100% + 10px);
    right: -4px;
    z-index: 40;
    width: min(300px, calc(100vw - 32px));
    padding: 6px;
    border-radius: 16px;
    overflow: hidden;
    animation: decRisksIn .16s cubic-bezier(.16, 1, .3, 1) both;
    transform-origin: top right;
  }
  @keyframes decRisksIn {
    from { opacity: 0; transform: translateY(4px) scale(.985); }
    to { opacity: 1; transform: none; }
  }
  .dec-risks-popover-head,
  .dec-risks-popover-body,
  .dec-risks-popover-foot {
    position: relative;
  }
  .dec-risks-popover-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px 4px;
  }
  .dec-risks-popover-title-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .dec-risks-popover-title {
    margin: 0;
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--fp-text);
    line-height: 1.35;
  }
  .dec-risks-popover-sub {
    margin: 0;
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 12px;
    font-weight: 400;
    color: var(--fp-muted);
    line-height: 1.45;
    letter-spacing: 0;
  }
  .dec-risks-popover-body {
    max-height: min(52vh, 360px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 2px 6px 4px;
    scrollbar-width: thin;
  }
  .dec-risks-empty {
    margin: 0;
    padding: 6px 10px 8px;
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 13px;
    font-weight: 400;
    color: var(--fp-muted);
    line-height: 1.5;
  }
  .dec-risks-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .dec-risks-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 8px !important;
    background: transparent;
    text-align: left;
    cursor: pointer;
    font: inherit;
    transition: background .12s ease;
  }
  .dec-risks-item:hover {
    background: var(--fp-hover);
  }
  .dec-risks-sev {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .dec-risks-sev--critical {
    color: #dc6b6b;
    background: rgba(220,107,107,.1);
  }
  .dec-risks-sev--high {
    color: #c9953a;
    background: rgba(201,149,58,.1);
  }
  .dec-risks-sev--medium {
    color: #7a8494;
    background: rgba(122,132,148,.1);
  }
  .dec-risks-item-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .dec-risks-item-title {
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 1.35;
    color: var(--fp-text);
  }
  .dec-risks-item-meta {
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.45;
    letter-spacing: 0;
    color: var(--fp-muted);
  }
  .dec-risks-project,
  .dec-risks-detail {
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.45;
    letter-spacing: 0;
    color: var(--fp-muted);
    opacity: 1;
  }
  .dec-risks-divider {
    height: 1px;
    margin: 4px 10px;
    background: var(--fp-divider);
  }
  .dec-risks-popover-foot {
    padding: 0 6px 6px;
  }
  .dec-risks-tagro-btn {
    width: 100%;
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    padding: 8px 10px;
    border: none;
    border-radius: 8px !important;
    background: transparent;
    color: var(--fp-text);
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 13.5px;
    font-weight: 400;
    letter-spacing: 0;
    line-height: 1.35;
    cursor: pointer;
    transition: background .12s ease;
  }
  .dec-risks-tagro-btn .tagro-logo .tagro-anim {
    animation: none;
  }
  .dec-risks-tagro-btn:hover {
    background: var(--fp-hover);
  }

  .dec-hero { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; padding-bottom:24px; }
  .dec-hero-text { max-width:600px; flex:1; min-width:0; }
  .dec-hero-title {
    margin:0; font-size:30px; font-weight:400; color:var(--dec-dark);
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
    height: 1px;
    width: 100%;
    background: linear-gradient(90deg,
      transparent 0%,
      color-mix(in srgb, #e3e8ef 38%, transparent) 14%,
      color-mix(in srgb, #e3e8ef 78%, transparent) 50%,
      color-mix(in srgb, #e3e8ef 38%, transparent) 86%,
      transparent 100%
    );
  }
  [data-theme="dark"] .dec-divider-gradient,
  [data-theme="classic-dark"] .dec-divider-gradient {
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.035) 14%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.035) 86%,
      transparent 100%
    );
  }

  .dec-spin { animation:decSpin 1s linear infinite; }
  @keyframes decSpin { from { transform:rotate(0); } to { transform:rotate(360deg); } }

  .dec-scroll-body {
    flex:1 1 auto; min-height:0;
    overflow-y:auto; overflow-x:hidden;
    width:100%;
    max-width:var(--festag-content-max, 1080px);
    margin:0 auto;
    padding:28px var(--festag-content-pad-x, 56px) var(--festag-content-pad-bottom, 88px);
    box-sizing:border-box;
    overscroll-behavior:contain;
    scrollbar-width:none;
  }
  .dec-scroll-body::-webkit-scrollbar { display:none; }

  /* ── Decision card rows (Figma) ── */
  .dec-card {
    display:flex; gap:56px; align-items:center;
    padding:18px var(--festag-list-row-inset-x, 20px); width:100%;
    background:transparent;
    cursor:pointer;
  }
  .dec-card:focus-visible {
    outline:2px solid color-mix(in srgb, var(--portal-btn-primary, #18181B) 55%, transparent);
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
    margin:0; font-size:14px; font-weight:400; color:var(--dec-muted);
    letter-spacing:0;
  }
  .dec-card-type-pill {
    display:inline-flex; align-items:center; gap:7px;
    padding:6px 12px 6px 10px; border-radius:999px;
    background:color-mix(in srgb, var(--dec-dot-color, #8E8E93) 11%, var(--dec-pill-surface));
    color:var(--dec-dark);
    font-size:12px; font-weight:500; letter-spacing:0;
    width:fit-content;
  }
  .dec-card-dot {
    width:8px; height:8px; border-radius:50%; flex-shrink:0;
    background:var(--dec-dot-color, #8E8E93);
    box-shadow:0 0 0 3px color-mix(in srgb, var(--dec-dot-color, #8E8E93) 24%, transparent);
  }
  .dec-card-dot--prio { width:7px; height:7px; box-shadow:0 0 0 2.5px color-mix(in srgb, var(--dec-dot-color, #8E8E93) 24%, transparent); }

  .dec-card-mid { width:298px; flex-shrink:0; display:flex; flex-direction:column; gap:16px; }
  .dec-card-section { display:flex; flex-direction:column; gap:4px; }
  .dec-card-label {
    margin:0; font-size:14px; font-weight:500; color:var(--dec-dark);
    letter-spacing:0;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .dec-card-muted {
    margin:0; font-size:13px; font-weight:400; color:var(--dec-muted);
    line-height:1.45; letter-spacing:0;
  }

  .dec-card-meta { width:93px; flex-shrink:0; display:flex; flex-direction:column; gap:16px; justify-content:flex-start; }
  .dec-card-prio-pill {
    display:inline-flex; align-items:center; gap:7px;
    padding:6px 12px 6px 10px; border-radius:999px;
    background:color-mix(in srgb, var(--dec-dot-color, #8E8E93) 11%, var(--dec-pill-surface));
    color:var(--dec-dark);
    font-size:12px; font-weight:500; letter-spacing:0;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    width:fit-content;
  }
  .dec-card-prio-warn { color:#FF3B30; flex-shrink:0; margin-left:-2px; }

  [data-theme="dark"] .dec-card-type-pill,
  [data-theme="classic-dark"] .dec-card-type-pill,
  [data-theme="dark"] .dec-card-prio-pill,
  [data-theme="classic-dark"] .dec-card-prio-pill {
    background:color-mix(in srgb, var(--dec-dot-color, #8E8E93) 18%, rgba(255,255,255,.06));
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
    min-width:248px; width:max-content; max-width:min(320px, 90vw);
    padding:4px;
    border-radius:10px;
    border:1px solid rgba(15,23,42,.08);
    background:var(--portal-card, #fff);
    box-shadow:
      0 4px 14px rgba(15,23,42,.07),
      0 16px 36px -12px rgba(15,23,42,.14);
    display:flex; flex-direction:column; gap:1px;
  }
  [data-theme="dark"] .dec-card-menu,
  [data-theme="classic-dark"] .dec-card-menu {
    background:var(--portal-card, #141416);
    border:none;
    box-shadow:0 16px 40px -12px rgba(0,0,0,.45);
  }
  .dec-card-menu-item {
    display:flex; align-items:center; gap:10px;
    width:100%; min-height:38px; padding:0 12px;
    border:0; border-radius:6px !important; background:transparent;
    font:inherit;
    color:var(--dec-dark); text-align:left; cursor:pointer;
    white-space:nowrap;
    transition:background .12s ease, color .12s ease;
  }
  .dec-card-menu-item:hover:not(:disabled) {
    background:rgba(15,23,42,.04);
  }
  .dec-card-menu-item:disabled { opacity:.5; cursor:not-allowed; }
  .dec-card-menu-item.is-danger { color:#FF3B30; }
  .dec-card-menu-item.is-danger:hover:not(:disabled) {
    background:rgba(255,59,48,.08);
  }
  .dec-card-menu-icon {
    width:16px; display:inline-flex; align-items:center; justify-content:center;
    color:var(--dec-muted); flex-shrink:0;
  }
  .dec-card-menu-label {
    flex:1; min-width:0; white-space:nowrap;
    margin:0;
    font-size:14px; font-weight:500; color:var(--dec-dark);
    letter-spacing:0; line-height:1.35;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .dec-card-menu-item.is-danger .dec-card-menu-label { color:#FF3B30; }
  .dec-card-menu-item.is-danger .dec-card-menu-icon { color:#FF3B30; }
  [data-theme="dark"] .dec-card-menu-item:hover:not(:disabled),
  [data-theme="classic-dark"] .dec-card-menu-item:hover:not(:disabled) {
    background:rgba(255,255,255,.06);
  }
  [data-theme="dark"] .dec-card-menu-icon,
  [data-theme="classic-dark"] .dec-card-menu-icon {
    color:var(--dec-muted);
  }
  [data-theme="dark"] .dec-card-menu-label,
  [data-theme="classic-dark"] .dec-card-menu-label {
    color:var(--dec-dark);
  }
  .dec-card-actions .fui-pill-btn {
    height:40px; min-height:40px; font-size:13px; width:100%;
    text-decoration:none;
    box-sizing:border-box;
  }
  .dec-card-actions a.fui-pill-btn {
    display:inline-flex;
    align-items:center;
    justify-content:center;
  }
  [data-theme="dark"] .dec-card-actions .fui-pill-btn:not(.fui-pill-btn--primary),
  [data-theme="classic-dark"] .dec-card-actions .fui-pill-btn:not(.fui-pill-btn--primary),
  [data-theme="dark"] .dec-card-actions a.fui-pill-btn,
  [data-theme="classic-dark"] .dec-card-actions a.fui-pill-btn {
    background:rgba(255,255,255,.06);
    border:none;
    color:#e4e4e8;
    box-shadow:none;
  }
  [data-theme="dark"] .dec-card:hover .fui-pill-btn:not(.fui-pill-btn--primary),
  [data-theme="classic-dark"] .dec-card:hover .fui-pill-btn:not(.fui-pill-btn--primary) {
    background:rgba(255,255,255,.08);
  }
  [data-theme="dark"] .dec-card-actions .fui-pill-btn:not(.fui-pill-btn--primary):hover:not(:disabled),
  [data-theme="classic-dark"] .dec-card-actions .fui-pill-btn:not(.fui-pill-btn--primary):hover:not(:disabled) {
    background:rgba(255,255,255,.1);
    color:#f4f4f4;
  }
  .dec-card-actions .fui-pill-btn--primary {
    border: none;
    background: var(--dec-cta-bg);
    color: var(--dec-cta-text);
    background-image: none;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.12),
      0 1px 2px rgba(15,23,42,.08),
      0 2px 8px -2px rgba(91,100,125,.22);
  }
  .dec-card-actions .fui-pill-btn--primary:hover:not(:disabled) {
    background: var(--dec-cta-hover);
    background-image: none;
    border: none;
    color: var(--dec-cta-text);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.14),
      0 2px 6px -1px rgba(15,23,42,.1),
      0 4px 12px -2px rgba(91,100,125,.26);
  }
  .dec-card-actions .fui-pill-btn--primary:active:not(:disabled) {
    background: var(--dec-cta-hover);
    background-image: none;
    box-shadow:
      inset 0 1px 2px rgba(15,23,42,.12),
      0 1px 2px rgba(15,23,42,.06);
  }
  [data-theme="dark"] .dec-os .dec-card-actions .fui-pill-btn--primary,
  [data-theme="classic-dark"] .dec-os .dec-card-actions .fui-pill-btn--primary {
    background: var(--dec-cta-bg);
    color: var(--dec-cta-text);
    border: none;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,1),
      0 1px 2px rgba(0,0,0,.28),
      0 6px 16px -4px rgba(0,0,0,.42);
  }
  [data-theme="dark"] .dec-os .dec-card-actions .fui-pill-btn--primary:hover:not(:disabled),
  [data-theme="classic-dark"] .dec-os .dec-card-actions .fui-pill-btn--primary:hover:not(:disabled) {
    background: var(--dec-cta-hover);
    color: var(--dec-cta-text);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,1),
      0 2px 6px -1px rgba(0,0,0,.32),
      0 8px 20px -6px rgba(0,0,0,.48);
  }
  [data-theme="dark"] .dec-os .dec-card-actions .fui-pill-btn--primary:active:not(:disabled),
  [data-theme="classic-dark"] .dec-os .dec-card-actions .fui-pill-btn--primary:active:not(:disabled) {
    background: #e8e8ec;
    color: var(--dec-cta-text);
    box-shadow:
      inset 0 1px 2px rgba(0,0,0,.12),
      0 1px 2px rgba(0,0,0,.2);
  }

  .dec-empty {
    padding:48px 6px; color:var(--dec-soft);
    font-size:14px; text-align:center;
    display:flex; flex-direction:column; align-items:center; gap:8px;
  }
  .dec-empty svg { color:var(--dec-soft); }
  .dec-empty p { margin:0; }
  .dec-empty small { font-size:13px; opacity:.75; max-width:420px; line-height:1.5; }

  .dec-demo-banner {
    display:flex; flex-direction:column; gap:4px;
    margin-bottom:20px; padding:12px 14px;
    border-radius:12px;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 60%, transparent);
    background:color-mix(in srgb, var(--dec-pill-surface) 80%, transparent);
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .dec-demo-banner span {
    font-size:13px; font-weight:400; color:var(--dec-dark);
    letter-spacing:-0.01em;
  }
  .dec-demo-banner small {
    font-size:12px; line-height:1.45; color:var(--dec-soft);
  }
  .dec-demo-banner code {
    font-size:11px; padding:1px 5px; border-radius:4px;
    background:rgba(15,23,42,.05);
  }
  [data-theme="dark"] .dec-demo-banner,
  [data-theme="classic-dark"] .dec-demo-banner {
    background:rgba(255,255,255,.05);
    border:none;
  }
  [data-theme="dark"] .dec-demo-banner code,
  [data-theme="classic-dark"] .dec-demo-banner code {
    background:rgba(255,255,255,.08);
  }

  /* Shared elements used by Drawer */
  .dec-tagro-cta {
    display:inline-flex; align-items:center; gap:6px;
    height:30px; padding:0 14px; border-radius:8px;
    background:var(--portal-btn-primary, #18181B); color:#fff; border:0;
    font:inherit; font-size:12px; font-weight:500; letter-spacing:.005em;
    cursor:pointer; transition:background .14s ease;
  }
  .dec-tagro-cta:hover { background:color-mix(in srgb, var(--portal-btn-primary, #18181B) 88%, #000); }
  .dec-tagro-cta:active { background:color-mix(in srgb, var(--portal-btn-primary, #18181B) 80%, #000); }
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
    --accent: var(--portal-btn-primary, #18181B);
    --btn-prim: var(--portal-btn-primary, #18181B);
    --btn-prim-text: #fff;
    display:flex; flex-direction:column; overflow:hidden;
    height:100%; min-height:0;
    letter-spacing:0;
    background:var(--dec-card-bg);
  }

  .dec-detail-hero {
    flex:0 0 auto;
    width:100%;
    max-width:var(--festag-content-max, 1080px);
    margin:0 auto;
    padding:clamp(64px, 7vh, 88px) var(--festag-content-pad-x, 56px) 28px;
    border-bottom:0;
    position:relative; z-index:2;
    background:var(--dec-card-bg);
    box-sizing:border-box;
  }
  .dec-detail-hero--loading {
    flex:1; display:flex; align-items:center; justify-content:center;
    padding:48px 24px;
  }
  [data-theme="dark"] .dec-detail-hero,
  [data-theme="classic-dark"] .dec-detail-hero {
    background:var(--dec-card-bg);
  }

  .dec-detail-toolbar {
    display:flex; align-items:center; justify-content:flex-start;
    gap:16px; margin-bottom:28px;
  }
  .dec-detail-col {
    width:100%;
    margin:0 auto;
  }
  .dec-detail-back {
    display:inline-flex; align-items:center; gap:7px;
    width:fit-content;
    height:fit-content;
    padding:8px 12px !important;
    vertical-align:middle;
    font-size:14px; font-weight:400; color:var(--dec-soft); text-decoration:none;
    transition:background .14s ease, color .14s ease, border-color .14s ease, box-shadow .14s ease;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    letter-spacing:-0.01em;
    cursor:pointer;
    box-sizing:border-box;
  }
  button.dec-detail-back,
  button.dec-detail-back.dec-detail-back-pill {
    border:0;
    background:transparent;
    appearance:none;
    -webkit-appearance:none;
    padding:8px 12px !important;
  }
  .dec-detail-back-pill {
    border-radius:6px !important;
    background:var(--dec-pill-surface);
    border:none;
    box-shadow:none;
  }
  .dec-detail-back-pill:hover {
    color:var(--dec-dark);
    background:color-mix(in srgb, var(--dec-pill-surface) 72%, #fff);
  }
  .dec-detail-back-pill:active {
    transform:translateY(1px);
  }
  [data-theme="dark"] .dec-detail-back-pill,
  [data-theme="classic-dark"] .dec-detail-back-pill {
    background:rgba(255,255,255,.06);
    border:none;
    color:#9aa0ac;
    box-shadow:none;
  }
  [data-theme="dark"] .dec-detail-back-pill:hover,
  [data-theme="classic-dark"] .dec-detail-back-pill:hover {
    background:rgba(255,255,255,.1);
    color:#f4f4f4;
  }
  .dec-detail-back-desktop { display:inline-flex; }

  .dec-detail-hero-main { margin-bottom:18px; }
  .dec-detail-hero-text {
    display:flex; flex-direction:column; gap:10px;
    width:100%;
  }
  .dec-detail-title {
    margin:0;
    font-size:36px; font-weight:400; color:var(--dec-dark);
    letter-spacing:-0.02em; line-height:1.1;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .dec-detail-subtitle {
    margin:0;
    font-size:18px; font-weight:400; color:var(--dec-soft);
    line-height:1.45; letter-spacing:-0.01em;
    max-width:640px;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }

  .dec-detail-meta-row {
    display:flex; flex-wrap:wrap; align-items:center; gap:8px;
    width:100%;
  }
  .dec-detail-meta-chip {
    display:inline-flex; align-items:center; gap:6px;
    height:28px; padding:0 10px; border-radius:6px;
    font-size:12px; font-weight:500; color:var(--dec-soft);
    background:var(--dec-pill-surface);
    border:0;
  }
  [data-theme="dark"] .dec-detail-meta-chip,
  [data-theme="classic-dark"] .dec-detail-meta-chip {
    background:rgba(255,255,255,.06);
    color:var(--dec-soft);
  }
  .dec-detail-meta-chip--type .dec-detail-project-dot {
    width:6px; height:6px;
    background:var(--dec-dot-color, #8E8E93);
  }
  .dec-detail-meta-chip--amber { color:#b98700; background:rgba(185,135,0,.1); }
  .dec-detail-meta-chip--red { color:#d14343; background:rgba(209,67,67,.1); }
  .dec-detail-meta-chip--good { color:#28a745; background:rgba(52,199,89,.1); }
  .dec-detail-meta-chip--muted { color:var(--dec-soft); }
  .dec-detail-meta-chip--time {
    gap: 6px;
    height: auto;
    min-height: 28px;
    padding: 4px 0;
    background: transparent;
    white-space: nowrap;
    flex-shrink: 0;
    box-sizing: border-box;
  }
  [data-theme="dark"] .dec-detail-meta-chip--time,
  [data-theme="classic-dark"] .dec-detail-meta-chip--time {
    background: transparent;
  }
  .dec-detail-project-dot {
    width:7px; height:7px; border-radius:50%; flex-shrink:0;
  }

  .dec-detail-brief {
    margin-top:28px;
    padding:20px 22px;
    border-radius:6px;
    background:color-mix(in srgb, var(--dec-pill-surface) 55%, transparent);
    display:flex; flex-direction:column; gap:20px;
  }
  [data-theme="dark"] .dec-detail-brief,
  [data-theme="classic-dark"] .dec-detail-brief {
    background:rgba(255,255,255,.04);
  }
  .dec-detail-brief-grid {
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));
    gap:16px 24px;
  }
  .dec-detail-brief-cell {
    display:flex; flex-direction:column; gap:6px; min-width:0;
  }
  .dec-detail-brief-label {
    margin:0;
    font-size:11px; font-weight:500; letter-spacing:0.02em;
    text-transform:uppercase; color:var(--dec-soft);
    opacity:.85;
  }
  .dec-detail-brief-value {
    margin:0;
    font-size:14px; font-weight:400; color:var(--dec-dark);
    letter-spacing:-0.01em; line-height:1.35;
  }
  .dec-detail-brief-prio {
    display:inline-flex; align-items:center; gap:7px;
    width:fit-content;
  }
  .dec-detail-brief-dot {
    width:7px; height:7px; border-radius:50%; flex-shrink:0;
    background:var(--dec-dot-color, #8E8E93);
  }
  .dec-detail-brief-prio-warn {
    color:#FF453A; flex-shrink:0;
  }
  .dec-detail-brief-due {
    display:flex; flex-wrap:wrap; align-items:center; gap:6px;
  }
  .dec-detail-brief-due-src {
    font-size:12px; color:var(--dec-soft); opacity:.8;
  }
  .dec-detail-brief-due-src::before {
    content:'·'; margin-right:6px; opacity:.5;
  }
  .dec-detail-brief-esc {
    display:inline-flex; align-items:center; gap:7px;
    color:#FF453A;
  }
  .dec-detail-brief-copy {
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));
    gap:20px 28px;
    padding-top:4px;
    border-top:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 40%, transparent);
  }
  [data-theme="dark"] .dec-detail-brief-copy,
  [data-theme="classic-dark"] .dec-detail-brief-copy {
    border-top-color:rgba(255,255,255,.06);
  }
  .dec-detail-brief-block {
    display:flex; flex-direction:column; gap:8px; min-width:0;
  }
  .dec-detail-brief-text {
    margin:0;
    font-size:15px; line-height:1.5; color:var(--dec-dark);
    letter-spacing:-0.01em;
  }
  .dec-detail-brief-risk {
    padding:12px 14px;
    border-radius:6px;
    background:rgba(255,69,58,.08);
  }
  .dec-detail-brief-risk--high {
    background:rgba(255,149,0,.08);
  }
  .dec-detail-brief-risk--medium {
    background:rgba(255,255,255,.04);
  }
  [data-theme="dark"] .dec-detail-brief-risk,
  [data-theme="classic-dark"] .dec-detail-brief-risk {
    background:rgba(255,69,58,.12);
  }
  [data-theme="dark"] .dec-detail-brief-risk--high,
  [data-theme="classic-dark"] .dec-detail-brief-risk--high {
    background:rgba(255,149,0,.1);
  }
  .dec-detail-brief-risk-reason {
    margin:0 0 2px;
    font-size:13px; font-weight:500; color:var(--dec-dark);
  }
  .dec-detail-brief-risk-detail {
    margin:0;
    font-size:13px; line-height:1.45; color:var(--dec-soft);
  }

  .dec-detail-loading {
    padding:0; color:var(--dec-soft); font-size:15px;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .dec-detail-page {
    flex:1; min-height:0; overflow-y:auto;
    width:100%;
    max-width:var(--festag-content-max, 1080px);
    margin:0 auto;
    padding:8px var(--festag-content-pad-x, 56px) var(--festag-content-pad-bottom, 88px);
    overscroll-behavior:contain;
    scrollbar-width:none;
    background:var(--dec-card-bg);
    box-sizing:border-box;
  }
  .dec-detail-page::-webkit-scrollbar { display:none; }
  .dec-detail-article {
    width:100%;
    display:flex; flex-direction:column;
    margin:0;
  }

  .dec-detail-m-head,
  .dec-detail-m-brief { display:none; }
  .dec-detail-m-shell {
    flex:1 1 auto;
    min-height:0;
    display:flex;
    flex-direction:column;
    overflow:hidden;
  }

  /* Page body — no drawer chrome */
  .dec-page-body {
    padding:0 !important;
    gap:32px !important;
    overflow:visible !important;
  }
  .dec-page-body .dec-tagro {
    border-radius:6px;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 55%, transparent);
    background:#FAFAFA;
    padding:22px 24px;
    box-shadow:none;
  }
  [data-theme="dark"] .dec-page-body .dec-tagro,
  [data-theme="classic-dark"] .dec-page-body .dec-tagro {
    background:rgba(255,255,255,.04);
    border:none;
    box-shadow:none;
  }
  .dec-page-body .dec-tagro-kicker {
    font-size:13px; letter-spacing:0;
    text-transform:none; font-weight:500; color:var(--dec-dark);
  }
  .dec-page-body .dec-tagro-run {
    height:32px; padding:0 12px; border-radius:6px;
    background:#fff;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 70%, transparent);
    color:var(--dec-soft);
    font-size:13px;
    box-shadow:none;
  }
  .dec-page-body .dec-tagro-run:hover:not(:disabled) {
    background:#F8F8F8;
    color:var(--dec-dark);
  }
  [data-theme="dark"] .dec-page-body .dec-tagro-run,
  [data-theme="classic-dark"] .dec-page-body .dec-tagro-run {
    background:rgba(255,255,255,.07);
    border:none;
    color:#9aa0ac;
    box-shadow:none;
  }
  [data-theme="dark"] .dec-page-body .dec-tagro-run:hover:not(:disabled),
  [data-theme="classic-dark"] .dec-page-body .dec-tagro-run:hover:not(:disabled) {
    background:rgba(255,255,255,.11);
    color:#f4f4f4;
  }
  .dec-page-body .dec-tagro-text {
    font-size:15px; line-height:1.55; color:var(--dec-dark);
    font-weight:400;
  }
  .dec-page-body .dec-tagro-apply {
    height:32px; border-radius:6px;
    background:#fff;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 70%, transparent);
    color:var(--dec-dark);
    font-size:13px;
    box-shadow:none;
  }
  .dec-page-body .dec-tagro-apply:hover { background:#F8F8F8; }
  [data-theme="dark"] .dec-page-body .dec-tagro-apply,
  [data-theme="classic-dark"] .dec-page-body .dec-tagro-apply {
    background:#fff;
    color:#121214;
    border-color:rgba(255,255,255,.14);
  }
  [data-theme="dark"] .dec-page-body .dec-tagro-apply:hover,
  [data-theme="classic-dark"] .dec-page-body .dec-tagro-apply:hover {
    background:#f0f0f2;
  }

  .dec-page-body .dec-answer-label {
    margin:0 0 8px;
    font-size:15px; font-weight:500;
    text-transform:none; letter-spacing:0;
    color:var(--dec-dark);
  }
  .dec-page-body .dec-options { gap:8px; }
  .dec-page-body .dec-option {
    padding:16px 18px;
    border-radius:6px;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 50%, transparent);
    background:#FAFAFA;
    transition:background .14s ease, box-shadow .14s ease, border-color .14s ease;
    box-shadow:none;
  }
  .dec-page-body .dec-option:hover {
    background:#F4F4F5;
  }
  .dec-page-body .dec-option.on {
    background:#fff;
    box-shadow:0 0 0 2px rgba(0,122,255,.35), 0 2px 10px rgba(0,0,0,.06);
  }
  [data-theme="dark"] .dec-page-body .dec-option,
  [data-theme="classic-dark"] .dec-page-body .dec-option {
    background:rgba(255,255,255,.04);
    border:none;
    box-shadow:none;
  }
  [data-theme="dark"] .dec-page-body .dec-option:hover,
  [data-theme="classic-dark"] .dec-page-body .dec-option:hover {
    background:rgba(255,255,255,.07);
  }
  [data-theme="dark"] .dec-page-body .dec-option.on,
  [data-theme="classic-dark"] .dec-page-body .dec-option.on {
    background:rgba(255,255,255,.09);
    border:none;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);
  }
  .dec-page-body .dec-option.tagro.on {
    box-shadow:0 0 0 2px rgba(0,122,255,.35), 0 2px 10px rgba(0,0,0,.06);
  }
  .dec-page-body .dec-option-body strong {
    font-size:15px; color:var(--dec-dark);
  }
  .dec-page-body .dec-note {
    margin-top:8px;
    padding:14px 0 0;
    border-top:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 55%, transparent);
    font-size:15px; font-weight:400;
  }
  [data-theme="dark"] .dec-page-body .dec-note,
  [data-theme="classic-dark"] .dec-page-body .dec-note {
    border-top-color:rgba(255,255,255,.08);
    color:#f4f4f4;
  }
  .dec-page-body .dec-answer-actions {
    display:flex; flex-wrap:wrap; gap:10px;
    padding-top:16px;
    border-top:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 55%, transparent);
  }
  [data-theme="dark"] .dec-page-body .dec-answer-actions,
  [data-theme="classic-dark"] .dec-page-body .dec-answer-actions {
    border-top-color:rgba(255,255,255,.08);
  }
  .dec-page-body .dec-final {
    border-top:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 55%, transparent);
    padding-top:24px;
  }
  [data-theme="dark"] .dec-page-body .dec-final,
  [data-theme="classic-dark"] .dec-page-body .dec-final {
    border-top-color:rgba(255,255,255,.08);
  }

  .dec-os-detail .dec-page-body .dec-primary {
    height:36px;
    padding:0 16px;
    border-radius:6px;
    background:var(--dec-cta-bg);
    color:var(--dec-cta-text);
    font-size:14px;
    font-weight:400;
    letter-spacing:-0.01em;
    border:none;
  }
  .dec-os-detail .dec-page-body .dec-primary:hover:not(:disabled) {
    background:var(--dec-cta-hover);
  }
  .dec-os-detail .dec-page-body .dec-secondary {
    height:36px;
    padding:0 16px;
    border-radius:6px;
    font-size:14px;
    font-weight:400;
    letter-spacing:-0.01em;
    border:none;
  }
  [data-theme="dark"] .dec-os-detail .dec-page-body .dec-secondary,
  [data-theme="classic-dark"] .dec-os-detail .dec-page-body .dec-secondary {
    background:rgba(255,255,255,.07);
    border:none;
    color:#f4f4f4;
  }
  [data-theme="dark"] .dec-os-detail .dec-page-body .dec-secondary:hover:not(:disabled),
  [data-theme="classic-dark"] .dec-os-detail .dec-page-body .dec-secondary:hover:not(:disabled) {
    background:rgba(255,255,255,.11);
    border:none;
    color:#f4f4f4;
  }
  [data-theme="dark"] .dec-os-detail .dec-page-body .dec-secondary-quiet,
  [data-theme="classic-dark"] .dec-os-detail .dec-page-body .dec-secondary-quiet {
    background:transparent;
    border:none;
    color:#9aa0ac;
  }
  [data-theme="dark"] .dec-os-detail .dec-page-body .dec-secondary-quiet:hover:not(:disabled),
  [data-theme="classic-dark"] .dec-os-detail .dec-page-body .dec-secondary-quiet:hover:not(:disabled) {
    background:rgba(255,255,255,.06);
    color:#f4f4f4;
  }

  .dec-os-detail .dec-page-body .dec-binary-btn {
    height:40px;
    border-radius:6px;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 55%, transparent);
    background:#FAFAFA;
    box-shadow:none;
  }
  [data-theme="dark"] .dec-os-detail .dec-page-body .dec-binary-btn,
  [data-theme="classic-dark"] .dec-os-detail .dec-page-body .dec-binary-btn {
    background:rgba(255,255,255,.06);
    border:none;
    color:#f4f4f4;
  }
  [data-theme="dark"] .dec-os-detail .dec-page-body .dec-binary-btn:hover,
  [data-theme="classic-dark"] .dec-os-detail .dec-page-body .dec-binary-btn:hover {
    background:rgba(255,255,255,.09);
  }
  [data-theme="dark"] .dec-os-detail .dec-page-body .dec-binary-btn.on,
  [data-theme="classic-dark"] .dec-os-detail .dec-page-body .dec-binary-btn.on {
    background:rgba(255,255,255,.12);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);
  }

  .dec-detail-empty {
    flex:1;
    width:100%;
    max-width:var(--festag-content-max, 1080px);
    margin:0 auto;
    padding:64px var(--festag-content-pad-x, 56px);
    color:var(--dec-soft);
    display:flex; flex-direction:column; align-items:flex-start; justify-content:center;
    gap:12px;
    box-sizing:border-box;
  }
  .dec-detail-empty-title {
    margin:0; font-size:24px; font-weight:400; color:var(--dec-dark);
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .dec-detail-empty-copy {
    margin:0; font-size:15px; line-height:1.5; color:var(--dec-soft);
    max-width:420px;
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
    background:var(--portal-btn-primary, #18181B); color:#fff; border:0;
    font:inherit; font-size:13px; font-weight:500; cursor:pointer;
    transition:background .14s ease;
    letter-spacing:var(--ls-body, 0.017em);
  }
  .dec-primary:hover:not(:disabled) { background:color-mix(in srgb, var(--portal-btn-primary, #18181B) 90%, #000); }
  .dec-primary:active:not(:disabled) { background:color-mix(in srgb, var(--portal-btn-primary, #18181B) 82%, #000); }
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
    .dec-static-top { padding-top:clamp(56px, 6.5vh, 72px); }
    .dec-scroll-body { padding-bottom:72px; }
    .dec-detail-hero { padding-top:clamp(56px, 6.5vh, 72px); }
  }
  @media (max-width: 1100px) {
    .dec-static-top { padding-top:clamp(52px, 6vh, 64px); }
    .dec-scroll-body { padding-bottom:64px; }
    .dec-detail-hero { padding-top:clamp(52px, 6vh, 64px); }
  }
  @media (max-width: 900px) {
    .dec-static-top { padding-top:var(--festag-content-pad-y, 24px); }
    .dec-scroll-body { padding-bottom:var(--festag-content-pad-bottom, 64px); }
    .dec-page-title { font-size:29px; letter-spacing:-1px; line-height:1.02; }
    .dec-m-title h1 { font-size:29px; letter-spacing:-1px; line-height:1.02; }
    .dec-page-lead-line,
    .dec-page-lead p { font-size:15px; }
    .dec-panel { width:100vw; }
    .dec-card { flex-direction:column; gap:20px; padding:18px 12px; align-items:stretch; }
    .dec-card-left, .dec-card-mid, .dec-card-meta, .dec-card-actions { width:100%; }
    .dec-card-meta { gap:24px; flex-direction:row; }
    .dec-card-actions { flex-direction:row; flex-wrap:wrap; gap:8px; align-items:stretch; }
    .dec-card-actions > button, .dec-card-actions > a { width:auto; flex:1; min-width:80px; }
    .dec-detail-hero {
      padding:var(--festag-content-pad-y, 24px) var(--festag-content-pad-x, 20px) 20px;
    }
    .dec-detail-back-desktop { display:none !important; }
    .dec-detail-page {
      padding:8px var(--festag-content-pad-x, 20px) var(--festag-content-pad-bottom, 64px);
    }
    .dec-detail-title { font-size:28px; font-weight:400; }
    .dec-detail-subtitle { font-size:17px; }
    .dec-detail-kicker { font-size:13px; }
    .dec-detail-toolbar { margin-bottom:0; }
    .dec-detail-meta-row { margin-top:16px; }
    .dec-detail-loading { padding:32px 20px; }
    .dec-detail-empty { padding:48px var(--festag-content-pad-x, 20px); }
    .dec-page-head { display:none; }
    .dec-hero { display:none; }
    .dec-answer-actions { flex-direction:column; align-items:stretch; }
    .dec-answer-actions > button { width:100%; justify-content:center; }
    .dec-binary-btn { height:52px; font-size:15px; }
  }
  @media (max-width: 768px) {
    .dec-dt { display: none !important; }
    .dec-m-t { display: inline !important; }

    .dec-os {
      --dec-m-white-elev:
        inset 0 1px 0 rgba(255, 255, 255, 1),
        0 1px 0 rgba(0, 0, 0, 0.04),
        0 4px 10px rgba(144, 149, 159, 0.16);
      --dec-m-white-border: none;
      background: #FCFCFC !important;
      overflow-x: hidden !important;
    }
    [data-theme="dark"] .dec-os,
    [data-theme="classic-dark"] .dec-os {
      --dec-m-white-elev:
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.42);
      --dec-m-white-border: none;
      background: var(--portal-bg, #0d0d0f) !important;
    }

    :global(.mcd) { display: none !important; }
    .dec-legacy-mph,
    .dec-legacy-mph .mph { display: none !important; }
    .dec-fab-desktop { display: none !important; }
    .dec-hero-bg { display: none !important; }

    .dec-m-shell {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      padding: calc(20px + env(safe-area-inset-top, 0px)) 20px 160px !important;
      box-sizing: border-box !important;
      -webkit-overflow-scrolling: touch;
    }

    .dec-static-top {
      flex: 0 0 auto !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }
    .dec-page-head {
      display: flex !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      gap: 12px !important;
      padding-bottom: 0 !important;
      margin-bottom: 28px !important;
      flex-wrap: nowrap !important;
    }
    /* ── Mobile header: 1:1 Projekte (.pj2-title / .pjm-sub) ── */
    .dec-m-title {
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
    }
    .dec-page-head-copy.dec-m-title {
      gap: 0 !important;
    }
    .dec-m-title h1,
    .dec-m-title p {
      font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
      font-weight: 400 !important;
      margin: 0 !important;
    }
    .dec-m-subline {
      display:flex !important;
      width:fit-content !important;
      margin-top:-2px !important;
    }
    .dec-m-title .dec-m-t {
      font-size: inherit !important;
      font-weight: 400 !important;
      letter-spacing: inherit !important;
      line-height: inherit !important;
      font-family: inherit !important;
    }
    .dec-m-lead {
      display: block !important;
    }
    .dec-page-lead { display: none !important; }
    .dec-m-head-actions {
      display: flex !important;
      align-items: flex-start !important;
      flex-shrink: 0 !important;
      padding-top: 2px !important;
    }
    .dec-os .cx-action-pill {
      background: var(--portal-raised, #FAFAFA) !important;
      border: var(--dec-m-white-border) !important;
      box-shadow: var(--dec-m-white-elev) !important;
    }

    .dec-m-actions {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      margin-bottom: 32px !important;
      position: relative !important;
    }
    .dec-m-risks-btn {
      position: relative !important;
      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;
      min-height: 36px !important;
      border: var(--dec-m-white-border) !important;
      border-radius: 999px !important;
      background: var(--portal-raised, #FAFAFA) !important;
      color: #1C1C1E !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 5px !important;
      cursor: pointer !important;
      padding: 0 !important;
      flex-shrink: 0 !important;
      box-shadow: var(--dec-m-white-elev) !important;
      -webkit-tap-highlight-color: transparent;
      transition: background .12s ease, transform .12s ease, box-shadow .12s ease;
    }
    .dec-m-risks-btn.has-count {
      width: auto !important;
      min-width: 36px !important;
      padding: 0 11px 0 10px !important;
    }
    .dec-m-risks-btn.on { background: #F8F8F8 !important; }
    .dec-m-risks-btn:active {
      transform: scale(0.96);
      background: #FAFAFA !important;
    }
    .dec-m-risks-count {
      font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      font-variant-numeric: tabular-nums !important;
      letter-spacing: -0.02em !important;
      line-height: 1 !important;
      color: #1C1C1E !important;
    }
    .dec-m-risks-count--pulse {
      color: #FF3B30 !important;
    }
    .dec-m-actions-group {
      display: inline-flex !important;
      align-items: center !important;
      gap: 8px !important;
    }
    .dec-m-ctl {
      position: relative !important;
      width: 36px !important;
      min-width: 36px !important;
      height: 36px !important;
      min-height: 36px !important;
      border: var(--dec-m-white-border) !important;
      border-radius: 999px !important;
      background: var(--portal-raised, #FAFAFA) !important;
      color: #1C1C1E !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      cursor: pointer !important;
      flex-shrink: 0 !important;
      box-shadow: var(--dec-m-white-elev) !important;
      -webkit-tap-highlight-color: transparent;
      transition: background .12s ease, transform .12s ease, box-shadow .12s ease;
    }
    .dec-m-ctl.on { background: #F8F8F8 !important; }
    .dec-m-ctl.has-active::after {
      content: '' !important;
      position: absolute !important;
      top: 7px !important;
      right: 7px !important;
      width: 5px !important;
      height: 5px !important;
      border-radius: 50% !important;
      background: var(--portal-btn-primary, #18181B) !important;
      box-shadow: 0 0 0 1.5px #ffffff !important;
    }
    .dec-m-ctl:active {
      transform: scale(0.96);
      background: #FAFAFA !important;
    }

    .dec-m-sheet-title {
      display: block !important;
      margin: 0 0 4px !important;
      padding: 4px 16px 8px !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      letter-spacing: 0.02em !important;
      color: #90959F !important;
    }
    .dec-m-sheet-backdrop {
      display: block !important;
      position: absolute !important;
      inset: 0 !important;
      z-index: 90 !important;
      border: 0 !important;
      padding: 0 !important;
      background: rgba(15, 15, 16, 0.28) !important;
      cursor: default !important;
      animation: decMFadeIn .18s ease both !important;
    }
    @keyframes decMFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dec-filter-wrap { position: relative !important; }
    .dec-m-actions .dec-filter-menu {
      position: fixed !important;
      top: auto !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 100 !important;
      min-width: 0 !important;
      width: 100% !important;
      border-radius: 20px 20px 0 0 !important;
      padding: 8px 16px calc(8px + env(safe-area-inset-bottom, 0px)) !important;
      box-shadow: 0 -4px 24px rgba(15,23,42,0.12) !important;
      animation: decMSlideUp .22s cubic-bezier(.16,1,.3,1) both !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
      background: var(--portal-raised, #FAFAFA) !important;
      border: 0 !important;
    }
    .dec-m-actions .dec-filter-menu-item {
      height: 44px !important;
      font-size: 15px !important;
      padding: 0 16px !important;
      border-radius: 8px !important;
    }
    .dec-m-actions .dec-filter-menu-label { display: none !important; }
    @keyframes decMSlideUp {
      from { opacity: 0; transform: translateY(100%); }
      to { opacity: 1; transform: none; }
    }

    .dec-m-risks-wrap { position: relative !important; }
    .dec-m-actions .dec-risks-popover.festag-popup-surface {
      position: fixed !important;
      top: auto !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      max-width: none !important;
      z-index: 100 !important;
      padding: 6px 8px calc(8px + env(safe-area-inset-bottom, 0px)) !important;
      border-radius: 20px 20px 0 0 !important;
      border-bottom: none !important;
      animation: festagPopupSheetIn .26s cubic-bezier(.16, 1, .3, 1) both !important;
      transform-origin: bottom center !important;
    }

    .dec-scroll-body {
      flex: 0 0 auto !important;
      min-height: 0 !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 4px 0 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
      overflow: visible !important;
      background: transparent !important;
    }
    .dec-divider-gradient { display: none !important; }

    .dec-card {
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 14px !important;
      width: 100% !important;
      box-sizing: border-box !important;
      padding: 18px 16px !important;
      border-radius: 14px !important;
      background: var(--portal-raised, #FAFAFA) !important;
      border: none !important;
      box-shadow: var(--dec-m-white-elev) !important;
      margin: 0 !important;
      -webkit-tap-highlight-color: transparent;
      transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
    }
    .dec-card:active {
      transform: scale(0.995);
      background: rgba(255, 255, 255, 0.92) !important;
      box-shadow: 0 1px 3px rgba(144, 149, 159, 0.12) !important;
    }
    .dec-card-left,
    .dec-card-mid,
    .dec-card-meta,
    .dec-card-actions {
      width: 100% !important;
      flex-shrink: 1 !important;
    }
    .dec-card-left {
      gap: 12px !important;
      flex-direction: row !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
    }
    .dec-card-title-block { flex: 1 1 auto !important; min-width: 0 !important; gap: 4px !important; }
    .dec-card-title {
      font-size: 20px !important;
      font-weight: 400 !important;
      letter-spacing: -0.02em !important;
      line-height: 1.2 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .dec-card-project {
      font-size: 15px !important;
      font-weight: 400 !important;
      letter-spacing: -0.01em !important;
      line-height: 1.25 !important;
      color: #90959F !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .dec-card-type-pill {
      flex-shrink: 0 !important;
      font-size: 12px !important;
      padding: 5px 10px !important;
      gap: 5px !important;
    }
    .dec-card-type-pill .dec-card-dot {
      width: 6px !important;
      height: 6px !important;
      box-shadow: none !important;
    }
    .dec-card-mid { gap: 10px !important; }
    .dec-card-mid .dec-card-section:last-child { display: none !important; }
    .dec-card-label { display: none !important; }
    .dec-card-mid .dec-card-muted {
      font-size: 15px !important;
      line-height: 1.45 !important;
      letter-spacing: -0.01em !important;
      color: #4E5567 !important;
    }
    .dec-card-meta {
      flex-direction: row !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 10px !important;
      margin-top: 2px !important;
    }
    .dec-card-meta .dec-card-section:first-child { display: none !important; }
    .dec-card-prio-pill {
      font-size: 13px !important;
      font-weight: 500 !important;
      padding: 5px 11px 5px 9px !important;
      gap: 5px !important;
    }
    .dec-card-prio-pill .dec-card-dot--prio {
      width: 6px !important;
      height: 6px !important;
      box-shadow: none !important;
    }
    .dec-card-prio-warn {
      width: 12px !important;
      height: 12px !important;
      margin: 0 !important;
      color: #FF3B30 !important;
    }
    .dec-card-actions {
      flex-direction: column !important;
      flex-wrap: nowrap !important;
      gap: 8px !important;
      align-items: stretch !important;
      margin-top: 4px !important;
    }
    .dec-card-dots { display: none !important; }
    .dec-card-actions > button,
    .dec-card-actions > a {
      flex: 0 0 auto !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 44px !important;
      font-size: 15px !important;
    }

    .dec-demo-banner {
      border-radius: 12px !important;
      margin-bottom: 8px !important;
      padding: 10px 12px !important;
      background: rgba(144, 149, 159, 0.08) !important;
      border: 0 !important;
      gap: 2px !important;
    }
    .dec-demo-banner span {
      font-size: 14px !important;
      font-weight: 400 !important;
      letter-spacing: -0.01em !important;
    }
    .dec-demo-banner small {
      font-size: 13px !important;
      line-height: 1.4 !important;
      opacity: 0.85 !important;
    }
    .dec-empty {
      padding: 32px 16px !important;
      border-radius: 12px !important;
      background: var(--portal-raised, #FAFAFA) !important;
      box-shadow: 0 2px 4px rgba(144, 149, 159, 0.07) !important;
    }

    [data-theme="dark"] .dec-m-title h1,
    [data-theme="classic-dark"] .dec-m-title h1 {
      color: #f4f4f4 !important;
      font-size: 29px !important;
      font-weight: 400 !important;
    }
    [data-theme="dark"] .dec-m-title p,
    [data-theme="classic-dark"] .dec-m-title p,
    [data-theme="dark"] .dec-m-lead,
    [data-theme="classic-dark"] .dec-m-lead {
      color: #9aa0ac !important;
    }
    [data-theme="dark"] .dec-os .cx-action-pill,
    [data-theme="classic-dark"] .dec-os .cx-action-pill {
      background: rgba(255, 255, 255, 0.11) !important;
      border: var(--dec-m-white-border) !important;
      box-shadow: var(--dec-m-white-elev) !important;
    }
    [data-theme="dark"] .dec-m-risks-btn,
    [data-theme="classic-dark"] .dec-m-risks-btn {
      background: rgba(255, 255, 255, 0.11) !important;
      border: var(--dec-m-white-border) !important;
      color: rgba(255, 255, 255, 0.92) !important;
      box-shadow: var(--dec-m-white-elev) !important;
    }
    [data-theme="dark"] .dec-m-risks-btn.on,
    [data-theme="classic-dark"] .dec-m-risks-btn.on {
      background: rgba(255, 255, 255, 0.14) !important;
    }
    [data-theme="dark"] .dec-m-risks-count,
    [data-theme="classic-dark"] .dec-m-risks-count {
      color: rgba(255, 255, 255, 0.92) !important;
    }
    [data-theme="dark"] .dec-m-risks-count--pulse,
    [data-theme="classic-dark"] .dec-m-risks-count--pulse {
      color: #FF6B6B !important;
    }
    [data-theme="dark"] .dec-m-ctl,
    [data-theme="classic-dark"] .dec-m-ctl {
      background: rgba(255, 255, 255, 0.11) !important;
      border: var(--dec-m-white-border) !important;
      color: rgba(255, 255, 255, 0.92) !important;
      box-shadow: var(--dec-m-white-elev) !important;
    }
    [data-theme="dark"] .dec-m-ctl.has-active::after,
    [data-theme="classic-dark"] .dec-m-ctl.has-active::after {
      background: #ffffff !important;
      box-shadow: 0 0 0 1.5px #141416 !important;
    }
    [data-theme="dark"] .dec-card,
    [data-theme="classic-dark"] .dec-card {
      background: rgba(255, 255, 255, 0.06) !important;
      border: none !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        0 2px 4px rgba(0, 0, 0, 0.28) !important;
    }
    [data-theme="dark"] .dec-m-actions .dec-filter-menu,
    [data-theme="classic-dark"] .dec-m-actions .dec-filter-menu {
      background: var(--festag-black-popup, #121214) !important;
      border: 1px solid rgba(255,255,255,.1) !important;
      border-bottom: none !important;
      box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.45) !important;
    }
    [data-theme="dark"] .dec-m-actions .dec-filter-menu-item,
    [data-theme="classic-dark"] .dec-m-actions .dec-filter-menu-item {
      color: #f4f4f4 !important;
    }
    [data-theme="dark"] .dec-m-sheet-backdrop,
    [data-theme="classic-dark"] .dec-m-sheet-backdrop {
      background: rgba(0, 0, 0, 0.52) !important;
    }
    [data-theme="dark"] .dec-empty,
    [data-theme="classic-dark"] .dec-empty {
      background: rgba(255, 255, 255, 0.06) !important;
      color: #9aa0ac !important;
    }
    [data-theme="dark"] .dec-card-title,
    [data-theme="classic-dark"] .dec-card-title {
      color: #f4f4f4 !important;
    }
    [data-theme="dark"] .dec-card-project,
    [data-theme="classic-dark"] .dec-card-project {
      color: #9aa0ac !important;
    }

    /* ── Detail sub-page mobile (Codex) ── */
    .dec-os-detail {
      height: 100% !important;
      min-height: 0 !important;
      overflow-x: hidden !important;
    }
    .dec-os-detail--dock .dec-detail-m-shell {
      padding-bottom: calc(160px + env(safe-area-inset-bottom, 0px)) !important;
    }
    .dec-detail-hero-desktop { display: none !important; }
    .dec-detail-m-head {
      display: flex !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      gap: 12px !important;
      margin-bottom: 24px !important;
      flex-wrap: nowrap !important;
    }
    .dec-detail-m-copy {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
    }
    .dec-detail-m-copy h1,
    .dec-detail-m-copy p {
      font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
      font-weight: 400 !important;
      margin: 0 !important;
    }
    .dec-detail-m-copy h1 {
      font-size: 29px !important;
      letter-spacing: -0.5px !important;
      line-height: 1.02 !important;
      color: #0F0F10 !important;
    }
    .dec-detail-m-copy p {
      font-size: 29px !important;
      letter-spacing: -0.5px !important;
      line-height: 1.02 !important;
      color: #90959F !important;
      margin-top: -2px !important;
    }
    .dec-detail-m-head-actions {
      display: flex !important;
      align-items: flex-start !important;
      flex-shrink: 0 !important;
      padding-top: 2px !important;
    }
    .dec-detail-m-brief {
      display: block !important;
      margin-bottom: 16px !important;
    }
    .dec-detail-m-brief .dec-detail-brief {
      padding: 16px !important;
      border-radius: 14px !important;
      background: var(--portal-raised, #FAFAFA) !important;
      box-shadow: var(--dec-m-white-elev) !important;
      border: none !important;
    }
    .dec-detail-m-shell {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      padding: calc(20px + env(safe-area-inset-top, 0px)) 20px 48px !important;
      box-sizing: border-box !important;
      -webkit-overflow-scrolling: touch;
    }
    .dec-detail-page {
      padding: 0 !important;
      max-width: none !important;
      overflow: visible !important;
      background: transparent !important;
    }
    .dec-detail-lead {
      font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
      font-size: 16px !important;
      line-height: 1.45 !important;
      color: #3C3C43 !important;
      margin: 0 0 4px !important;
    }
    .dec-os-detail .dec-page-body {
      gap: 12px !important;
    }
    .dec-page-body--mobile-dock .dec-answer-actions--desktop {
      display: none !important;
    }
    .dec-os-detail .dec-page-body .dec-tagro,
    .dec-os-detail .dec-page-body .dec-answer,
    .dec-os-detail .dec-page-body .dec-final,
    .dec-os-detail .dec-page-body .dec-clarification {
      border-radius: 14px !important;
      background: var(--portal-raised, #FAFAFA) !important;
      border: none !important;
      box-shadow: var(--dec-m-white-elev) !important;
      padding: 18px 16px !important;
    }
    .dec-os-detail .dec-page-body .dec-clarification {
      font-size: 14px !important;
      line-height: 1.45 !important;
      color: #6e717e !important;
    }
    .dec-os-detail .dec-page-body .dec-answer-actions {
      border-top: 0 !important;
      padding-top: 0 !important;
    }
    .dec-os-detail .dec-page-body .dec-final {
      border-top: 0 !important;
      padding-top: 0 !important;
    }
    .dec-os-detail .dec-page-body .dec-option {
      background: #F8F8FA !important;
      border: none !important;
    }
    .dec-os-detail .dec-page-body .dec-option.on {
      background: #fff !important;
      box-shadow: inset 0 0 0 2px rgba(0, 122, 255, 0.35) !important;
    }
    .dec-detail-empty {
      padding: 32px 0 !important;
    }
    .dec-detail-loading {
      padding: 32px 0 !important;
    }
    [data-theme="dark"] .dec-detail-m-copy h1,
    [data-theme="classic-dark"] .dec-detail-m-copy h1 {
      color: #f4f4f4 !important;
    }
    [data-theme="dark"] .dec-detail-m-copy p,
    [data-theme="classic-dark"] .dec-detail-m-copy p {
      color: #9aa0ac !important;
    }
    [data-theme="dark"] .dec-detail-m-brief .dec-detail-brief,
    [data-theme="classic-dark"] .dec-detail-m-brief .dec-detail-brief,
    [data-theme="dark"] .dec-os-detail .dec-page-body .dec-tagro,
    [data-theme="classic-dark"] .dec-os-detail .dec-page-body .dec-tagro,
    [data-theme="dark"] .dec-os-detail .dec-page-body .dec-answer,
    [data-theme="classic-dark"] .dec-os-detail .dec-page-body .dec-answer,
    [data-theme="dark"] .dec-os-detail .dec-page-body .dec-final,
    [data-theme="classic-dark"] .dec-os-detail .dec-page-body .dec-final,
    [data-theme="dark"] .dec-os-detail .dec-page-body .dec-clarification,
    [data-theme="classic-dark"] .dec-os-detail .dec-page-body .dec-clarification {
      background: rgba(255, 255, 255, 0.06) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        0 2px 4px rgba(0, 0, 0, 0.28) !important;
    }
    [data-theme="dark"] .dec-detail-lead,
    [data-theme="classic-dark"] .dec-detail-lead {
      color: #c7c7cc !important;
    }
  }

  /* ── External handoff modal (Stripe, Vercel, …) — portaled to body ── */
  .dec-handoff-overlay {
    position: fixed;
    inset: 0;
    z-index: 9000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: max(20px, env(safe-area-inset-top, 0px)) 20px max(20px, env(safe-area-inset-bottom, 0px));
    background: rgba(8, 10, 14, 0.42);
    backdrop-filter: blur(10px) saturate(130%);
    -webkit-backdrop-filter: blur(10px) saturate(130%);
    animation: decHandoffIn .2s cubic-bezier(.16, 1, .3, 1) both;
  }
  [data-theme="dark"] .dec-handoff-overlay,
  [data-theme="classic-dark"] .dec-handoff-overlay {
    background: rgba(0, 0, 0, 0.62);
    backdrop-filter: blur(14px) saturate(120%);
    -webkit-backdrop-filter: blur(14px) saturate(120%);
  }
  @keyframes decHandoffIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .dec-handoff-modal {
    width: min(480px, 100%);
    max-height: min(calc(100dvh - 40px), 640px);
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: var(--portal-raised, #FAFAFA);
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 24px 64px -16px rgba(15, 23, 42, 0.22);
    overflow: hidden;
    animation: decHandoffModalIn .24s cubic-bezier(.16, 1, .3, 1) both;
  }
  @keyframes decHandoffModalIn {
    from { opacity: 0; transform: translateY(8px) scale(0.985); }
    to { opacity: 1; transform: none; }
  }
  [data-theme="dark"] .dec-handoff-modal,
  [data-theme="classic-dark"] .dec-handoff-modal {
    background: #1c1c1e;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.06) inset,
      0 32px 80px -24px rgba(0, 0, 0, 0.72);
  }
  .dec-handoff-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 22px 22px 18px;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  }
  [data-theme="dark"] .dec-handoff-head,
  [data-theme="classic-dark"] .dec-handoff-head {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }
  .dec-handoff-head-copy { flex: 1; min-width: 0; }
  .dec-handoff-kicker {
    margin: 0 0 8px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 11px;
    font-weight: 500;
    color: #8e8e93;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .dec-handoff-title {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 20px;
    font-weight: 400;
    line-height: 1.25;
    letter-spacing: -0.02em;
    color: #0f0f10;
  }
  [data-theme="dark"] .dec-handoff-title,
  [data-theme="classic-dark"] .dec-handoff-title {
    color: #f4f4f4;
  }
  .dec-handoff-sub {
    margin: 6px 0 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 13px;
    font-weight: 400;
    color: #8e8e93;
  }
  .dec-handoff-close {
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #8e8e93;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background .12s ease, color .12s ease;
  }
  .dec-handoff-close:hover {
    background: rgba(15, 23, 42, 0.06);
    color: #0f0f10;
  }
  [data-theme="dark"] .dec-handoff-close:hover,
  [data-theme="classic-dark"] .dec-handoff-close:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #f4f4f4;
  }
  .dec-handoff-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 18px 22px 8px;
    scrollbar-width: thin;
  }
  .dec-handoff-lead {
    margin: 0 0 18px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.55;
    color: #4e5567;
  }
  [data-theme="dark"] .dec-handoff-lead,
  [data-theme="classic-dark"] .dec-handoff-lead {
    color: #aeaeb2;
  }
  .dec-handoff-steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    border-top: 1px solid rgba(15, 23, 42, 0.06);
  }
  [data-theme="dark"] .dec-handoff-steps,
  [data-theme="classic-dark"] .dec-handoff-steps {
    border-top-color: rgba(255, 255, 255, 0.08);
  }
  .dec-handoff-step {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 14px 0;
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  }
  [data-theme="dark"] .dec-handoff-step,
  [data-theme="classic-dark"] .dec-handoff-step {
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }
  .dec-handoff-step:last-child { border-bottom: 0; }
  .dec-handoff-step-num {
    width: 22px;
    height: 22px;
    border-radius: 999px;
    flex-shrink: 0;
    margin-top: 1px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.05);
    color: #6e717e;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 11px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  [data-theme="dark"] .dec-handoff-step-num,
  [data-theme="classic-dark"] .dec-handoff-step-num {
    background: rgba(255, 255, 255, 0.08);
    color: #aeaeb2;
  }
  .dec-handoff-step-copy { flex: 1; min-width: 0; }
  .dec-handoff-step-copy strong {
    display: block;
    margin-bottom: 3px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 14px;
    font-weight: 500;
    color: #0f0f10;
  }
  [data-theme="dark"] .dec-handoff-step-copy strong,
  [data-theme="classic-dark"] .dec-handoff-step-copy strong {
    color: #f4f4f4;
  }
  .dec-handoff-step-copy p {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 13px;
    font-weight: 400;
    line-height: 1.5;
    color: #8e8e93;
  }
  .dec-handoff-note {
    margin: 16px 0 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 12px;
    line-height: 1.45;
    color: #8e8e93;
  }
  .dec-handoff-foot {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px 22px 20px;
    border-top: 1px solid rgba(15, 23, 42, 0.06);
    background: rgba(15, 23, 42, 0.02);
  }
  [data-theme="dark"] .dec-handoff-foot,
  [data-theme="classic-dark"] .dec-handoff-foot {
    border-top-color: rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
  }
  .dec-handoff-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .dec-handoff-open,
  .dec-handoff-confirm {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 42px;
    padding: 0 16px;
    border-radius: 999px;
    border: 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0;
    cursor: pointer;
    transition: background .14s ease, border-color .14s ease, transform .1s ease;
  }
  .dec-handoff-open {
    background: transparent;
    border: 1px solid rgba(15, 23, 42, 0.1);
    color: #0f0f10;
  }
  .dec-handoff-open:hover {
    background: rgba(15, 23, 42, 0.04);
    border-color: rgba(15, 23, 42, 0.14);
  }
  [data-theme="dark"] .dec-handoff-open,
  [data-theme="classic-dark"] .dec-handoff-open {
    border-color: rgba(255, 255, 255, 0.12);
    color: #f4f4f4;
  }
  [data-theme="dark"] .dec-handoff-open:hover,
  [data-theme="classic-dark"] .dec-handoff-open:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.16);
  }
  .dec-handoff-confirm {
    background: #0f0f10;
    color: #ffffff;
    box-shadow: none;
  }
  .dec-handoff-confirm:hover:not(:disabled) {
    background: #2a2a2c;
  }
  .dec-handoff-confirm:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  [data-theme="dark"] .dec-handoff-confirm,
  [data-theme="classic-dark"] .dec-handoff-confirm {
    background: var(--portal-raised, #FAFAFA);
    color: #121214;
  }
  [data-theme="dark"] .dec-handoff-confirm:hover:not(:disabled),
  [data-theme="classic-dark"] .dec-handoff-confirm:hover:not(:disabled) {
    background: #f0f0f2;
  }
  .dec-handoff-hint {
    margin: 0;
    text-align: center;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 11px;
    color: #8e8e93;
    line-height: 1.45;
  }
`
