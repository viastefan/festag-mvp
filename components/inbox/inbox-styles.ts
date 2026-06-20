/**
 * Posteingang — portal-aware styles for the master-detail inbox.
 * Keeps the original ix-* layout; tokens map to PortalAppShell light/dark.
 */
export const INBOX_CSS = `
  .ix-shell {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
  }
  .ix-root--dev {
    flex: 1 1 auto;
    min-height: 0;
  }

  .ix-root {
    --ix-slate: var(--portal-btn-primary, #5b647d);
    --ix-text: var(--portal-text, #0f0f10);
    --ix-muted: var(--portal-muted, #6e717e);
    --ix-soft: var(--portal-soft, #8f93a4);
    --ix-surface: var(--portal-card, #fff);
    --ix-pill: var(--portal-pill-bg, #f1f3f5);
    --ix-border: color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 65%, transparent);
    --ix-hover: var(--portal-row-hover, rgba(241,243,245,.45));
    --ix-divider: color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 55%, transparent);

    display: grid;
    grid-template-columns: minmax(312px, 372px) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    flex: 1 1 auto;
    height: 100%; min-height: 0;
    align-items: stretch;
    background: var(--ix-surface);
    color: var(--ix-text);
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-weight: 400;
    letter-spacing: 0;
  }
  [data-theme="dark"] .ix-root,
  [data-theme="classic-dark"] .ix-root {
    --ix-surface: var(--portal-card, #141416);
    --ix-text: var(--portal-text, #f4f4f4);
    --ix-muted: var(--portal-muted, #9aa0ac);
    --ix-soft: var(--portal-soft, #8f93a4);
    --ix-pill: rgba(255,255,255,.07);
    --ix-border: rgba(255,255,255,.09);
    --ix-hover: rgba(255,255,255,.06);
    --ix-divider: rgba(255,255,255,.08);
    --ix-slate: var(--portal-btn-primary, #7b849c);
  }

  /* Single vertical seam between list and detail */
  .ix-list {
    display: flex; flex-direction: column; min-height: 0;
    height: 100%; align-self: stretch;
    background: var(--ix-surface);
    border-right: 1px solid var(--ix-divider);
  }
  .ix-list-head {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 20px 18px 14px;
    flex-shrink: 0;
  }
  .ix-list-title {
    font-size: 15px; font-weight: 400; color: var(--ix-text);
    letter-spacing: 0;
  }
  .ix-head-tools { display: flex; align-items: center; gap: 6px; }
  .ix-iconbtn {
    width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px; border: none; background: transparent;
    color: var(--ix-muted); cursor: pointer;
    transition: background .12s ease, color .12s ease;
  }
  .ix-iconbtn:hover { background: var(--ix-hover); color: var(--ix-text); }
  .ix-iconbtn.on { background: color-mix(in srgb, var(--ix-pill) 90%, transparent); color: var(--ix-text); }

  .ix-cat { position: relative; }
  .ix-cat-trigger {
    display: inline-flex; align-items: center; gap: 4px;
    width: fit-content; height: 30px; margin: 0; padding: 0 8px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--ix-muted);
    font-family: inherit;
    font-size: 12px; font-weight: 400; letter-spacing: 0;
    cursor: pointer;
    transition: background .12s ease, color .12s ease;
  }
  .ix-cat-trigger:hover, .ix-cat-trigger.on {
    background: var(--ix-hover);
    color: var(--ix-text);
    border: none;
  }
  .ix-cat-trigger > svg { color: currentColor; flex-shrink: 0; }
  .ix-cat-count {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 16px; height: 16px; padding: 0 5px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ix-slate) 16%, transparent);
    color: var(--ix-slate);
    font-size: 10px; font-weight: 500;
  }

  .ix-cat-menu {
    position: absolute; top: calc(100% + 6px); left: 0; z-index: 20;
    min-width: 280px; max-width: 340px; padding: 6px;
    display: flex; flex-direction: column; gap: 2px;
    animation: ixMenuIn .14s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes ixMenuIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }

  .ix-cat-opt {
    display: grid; grid-template-columns: 16px 1fr auto auto;
    gap: 9px; align-items: center;
    width: 100%; padding: 9px 10px;
    border: 0; background: transparent;
    border-radius: 6px !important;
    color: var(--ix-text); font-family: inherit; font-size: 13px; font-weight: 400;
    letter-spacing: 0; cursor: pointer; text-align: left;
    transition: background .1s;
  }
  .ix-cat-opt > svg { color: var(--ix-muted); }
  .ix-cat-opt.on > svg { color: var(--ix-text); }
  .ix-cat-opt:hover { background: var(--fp-hover, var(--ix-hover)); }
  .ix-cat-opt.on { background: color-mix(in srgb, var(--fp-pill, var(--ix-pill)) 95%, transparent); }
  .ix-cat-opt-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .ix-cat-opt-main strong { font-size: 13px; font-weight: 400; color: var(--ix-text); }
  .ix-cat-opt-main small {
    font-size: 11px; font-weight: 400; color: var(--ix-muted);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;
  }

  .ix-thread-scroll {
    flex: 1; min-height: 0; overflow-y: auto; padding: 4px 10px 18px;
    scrollbar-width: none;
  }
  .ix-thread-scroll::-webkit-scrollbar { display: none; }

  .ix-row {
    display: flex; align-items: stretch; gap: 9px;
    width: 100%; border: none; background: transparent;
    padding: 11px 11px 11px 8px;
    text-align: left; border-radius: 8px; cursor: pointer;
    font-family: inherit; color: var(--ix-text);
    transition: background .12s ease;
  }
  .ix-row:hover { background: var(--ix-hover); }
  .ix-row.on { background: color-mix(in srgb, var(--ix-pill) 88%, transparent); }
  .ix-row-marker { width: 3px; min-width: 3px; border-radius: 2px; align-self: stretch; }
  .ix-row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .ix-row-head {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 400; color: var(--ix-muted); line-height: 1.3;
  }
  .ix-row-source { color: var(--ix-soft); }
  .ix-row-tag {
    font-size: 10.5px; padding: 2px 7px; border-radius: 999px;
    background: var(--ix-pill); color: var(--ix-muted);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px;
  }
  .ix-row-time { margin-left: auto; font-size: 10.5px; color: var(--ix-muted); flex-shrink: 0; }
  .ix-row-title {
    font-size: 13px; font-weight: 400; color: var(--ix-text); line-height: 1.35;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ix-row:not(.unread) .ix-row-title { color: var(--ix-soft); }
  .ix-row-preview {
    font-size: 12px; color: var(--ix-muted); line-height: 1.4; font-weight: 400;
    overflow: hidden; text-overflow: ellipsis;
    display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
  }
  .ix-row-actionable {
    display: inline-flex; align-items: center; gap: 4px; margin-top: 3px;
    font-size: 10.5px; font-weight: 400; color: var(--ix-slate);
  }

  .ix-detail {
    display: flex; flex-direction: column;
    min-height: 0; height: 100%; align-self: stretch;
    background: var(--ix-surface);
    overflow-y: auto; scrollbar-width: none;
  }
  .ix-detail::-webkit-scrollbar { display: none; }
  .ix-detail--empty {
    align-items: center; justify-content: center;
    overflow: hidden;
  }
  .ix-detail--filled { align-items: flex-start; justify-content: center; padding: 40px clamp(20px, 4vw, 52px); }

  .ix-detail-card { width: 100%; max-width: 680px; display: flex; flex-direction: column; gap: 20px; }
  .ix-detail-tags { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
  .ix-type-badge {
    display: inline-flex; align-items: center;
    height: 24px; padding: 0 10px; border-radius: 999px;
    font-size: 11px; font-weight: 400;
    background: var(--ix-pill); color: var(--ix-muted);
  }
  .ix-detail-project { font-size: 12px; color: var(--ix-muted); font-weight: 400; }
  .ix-detail-title {
    margin: 0; font-size: 22px; font-weight: 400; color: var(--ix-text);
    letter-spacing: 0; line-height: 1.25;
  }
  .ix-detail-meta {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    font-size: 13px; color: var(--ix-muted); margin-top: -10px;
  }
  .ix-detail-body { font-size: 15px; line-height: 1.7; color: var(--ix-soft); font-weight: 400; }
  .ix-detail-body p { margin: 0; white-space: pre-wrap; }
  .ix-client-preview {
    margin-top: 14px; padding: 12px 14px; border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--ix-slate) 28%, var(--ix-border));
    background: color-mix(in srgb, var(--ix-slate) 6%, transparent);
    font-size: 13px; line-height: 1.55;
  }
  .ix-client-preview strong { display: block; margin-bottom: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--ix-muted); font-weight: 600; }
  .ix-client-preview p { margin: 0; color: var(--ix-text); }

  .ix-video {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 10px; text-decoration: none;
    background: var(--ix-pill);
    transition: background .12s ease;
  }
  .ix-video:hover { background: color-mix(in srgb, var(--ix-pill) 70%, var(--ix-hover)); }
  .ix-video-play {
    width: 32px; height: 32px; flex-shrink: 0; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    background: var(--ix-slate); color: #fff;
  }
  .ix-video strong { display: block; font-size: 13px; font-weight: 400; color: var(--ix-text); }
  .ix-video small { display: block; margin-top: 1px; font-size: 11.5px; color: var(--ix-muted); }

  .ix-detail-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding-top: 4px; }
  .ix-btn {
    display: inline-flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 14px; border-radius: 999px;
    border: 1px solid var(--ix-border); background: transparent;
    font-family: inherit; font-size: 13px; font-weight: 400;
    color: var(--ix-text); cursor: pointer;
    transition: background .12s ease, border-color .12s ease;
  }
  .ix-btn:hover { background: var(--ix-hover); }
  .ix-btn.primary {
    background: var(--ix-slate); color: #fff; border-color: var(--ix-slate);
  }
  .ix-btn.primary:hover { background: color-mix(in srgb, var(--ix-slate) 90%, #000 10%); }
  [data-theme="dark"] .ix-btn.primary,
  [data-theme="classic-dark"] .ix-btn.primary {
    color: #121214;
    background: #fff; border-color: #fff;
  }
  [data-theme="dark"] .ix-btn.primary:hover,
  [data-theme="classic-dark"] .ix-btn.primary:hover {
    background: #f0f0f2;
  }

  .ix-empty-list {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; gap: 7px; color: var(--ix-muted);
    padding: 52px 24px 24px;
  }
  .ix-empty-title { font-size: 14px; font-weight: 400; color: var(--ix-soft); margin: 6px 0 0; }
  .ix-empty-sub { font-size: 13px; line-height: 1.55; color: var(--ix-muted); max-width: 320px; margin: 0; font-weight: 400; }

  /* Right pane — refined empty state */
  .ix-empty-detail {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; gap: 0;
    padding: 32px 40px; max-width: 400px;
  }
  .ix-empty-visual {
    width: 72px; height: 72px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--ix-pill) 80%, transparent);
    color: var(--ix-muted);
    margin-bottom: 20px;
    box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 40%, transparent);
  }
  [data-theme="dark"] .ix-empty-visual,
  [data-theme="classic-dark"] .ix-empty-visual {
    box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
  }
  .ix-empty-detail .ix-empty-title {
    font-size: 17px; font-weight: 400; color: var(--ix-text); margin: 0 0 8px;
  }
  .ix-empty-detail .ix-empty-sub {
    font-size: 14px; line-height: 1.6; max-width: 300px; margin: 0 0 24px;
  }
  .ix-empty-hints {
    display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;
    max-width: 320px;
  }
  .ix-empty-hint {
    display: inline-flex; align-items: center; gap: 5px;
    height: 28px; padding: 0 11px; border-radius: 999px;
    background: var(--ix-pill); color: var(--ix-muted);
    font-size: 11.5px; font-weight: 400;
  }
  .ix-empty-hint svg { flex-shrink: 0; opacity: .75; }

  .ix-detail-back {
    display: none; align-items: center; gap: 5px;
    border: 0; background: transparent; padding: 0 0 16px;
    font-family: inherit; font-size: 13px; font-weight: 400;
    color: var(--ix-muted); cursor: pointer; align-self: flex-start;
  }
  .ix-detail-back:hover { color: var(--ix-text); }

  @media (max-width: 760px) {
    .ix-root { grid-template-columns: 1fr; }
    .ix-list--hidden { display: none; }
    .ix-detail--mobile {
      position: fixed; inset: 0; z-index: 90;
      padding: 20px 18px 88px;
      align-items: flex-start; justify-content: flex-start;
    }
    .ix-detail-back { display: inline-flex; }
    .ix-list-head { padding: 16px 14px 10px; }
    button.ix-cat-trigger { min-height: unset; }
    .ix-row { padding: 13px 10px 13px 8px; min-height: 58px; }
    .ix-thread-scroll { padding: 4px 8px 92px; }
  }
`
