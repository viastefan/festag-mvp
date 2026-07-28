/** Shared Codex mobile list-page chrome — matches /projects + /decisions. */

/** Festag content-container page header — reuse on new list/detail shells.
 *  Title: Aeonik Regular (400), 29px, letter-spacing -0.5px.
 *  Desktop lead: 17px soft copy only (no dynamic count line under the title).
 *  Mobile: grey subtitle span inside h1 (.festag-m-sub / .pjm-t / .dec-m-sub). */
export const FESTAG_CONTENT_HEAD_CSS = `
  .festag-page-title,
  .dec-os .dec-page-title,
  .pj2-page .pj2-page-title,
  .set-codex .set-page-title {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
    font-weight: 400 !important;
    font-size: 29px !important;
    letter-spacing: -0.5px !important;
    line-height: 1.02 !important;
  }
  .festag-page-title span,
  .dec-os .dec-page-title span,
  .pj2-page .pj2-page-title span,
  .set-codex .set-page-title span {
    font-weight: 400 !important;
    font-family: inherit !important;
    letter-spacing: inherit !important;
  }
  .festag-page-lead-line,
  .dec-page-lead-line,
  .dec-page-lead p,
  .pj2-page-lead-line {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 17px;
    font-weight: 400;
    line-height: 1.35;
    letter-spacing: 0;
  }
  /* Festag sentence headline — title + lead one line, same 29px Aeonik Regular */
  .festag-page-lead-strong {
    color: var(--dec-dark, var(--portal-text, #0f0f10));
  }
  .festag-page-lead-muted {
    color: var(--dec-soft, var(--portal-muted, #86868b));
    font-size: inherit !important;
    font-weight: 400 !important;
    letter-spacing: inherit !important;
    line-height: inherit !important;
    font-family: inherit !important;
  }
  @media (min-width: 769px) {
    .dec-page-head-copy:has(.festag-page-lead-strong) .dec-page-lead,
    .dec-page-head-copy:has(.festag-page-lead-strong) .dec-m-lead,
    .dec-page-head-copy:has(.festag-page-lead-strong) .dec-m-lead--legacy {
      display: none !important;
    }
  }

  @media (max-width: 768px) {
    .dec-page-head-copy:has(.festag-page-lead-strong) .dec-dt {
      display: none !important;
    }
    .dec-page-head-copy:has(.festag-page-lead-strong) .dec-m-lead--legacy {
      display: none !important;
    }
    .dec-page-head-copy:has(.festag-page-lead-strong) .dec-m-t {
      display: inline !important;
    }
    .dec-page-head-copy .dec-m-t .festag-page-lead-strong,
    .dec-page-head-copy .dec-m-t .festag-page-lead-muted {
      font-size: inherit !important;
      font-weight: 400 !important;
      letter-spacing: inherit !important;
      line-height: inherit !important;
      font-family: inherit !important;
    }
    .dec-page-head-copy .dec-m-t .festag-page-lead-muted {
      color: var(--dec-soft, #86868b);
    }
    [data-theme="dark"] .dec-page-head-copy .dec-m-t .festag-page-lead-muted,
    [data-theme="classic-dark"] .dec-page-head-copy .dec-m-t .festag-page-lead-muted {
      color: var(--dec-soft, #9aa0ac);
    }
  }
  .festag-page-kicker {
    display: none;
    margin: 0;
    padding-top: 6px;
  }
  @media (min-width: 769px) {
    .st-page-head .dec-page-head-copy {
      gap: 4px;
    }
  }
  .festag-page-head-copy,
  .dec-page-head-copy,
  .pj2-page-head-copy {
    gap: 4px;
  }
`

/** Mobile list headers — 1:1 Inbox/Entscheidungen: Aeonik Regular 26px, schwarz + grau. */
export const FESTAG_MOBILE_HEAD_CSS = `
  @media (max-width: 768px) {
    .mcl-head-copy h1,
    .festag-m-head h1,
    .pj2-page .pj2-page-head-copy h1.pj2-page-title,
    .dec-page-head-copy.dec-m-title h1,
    .dec-os .dec-page-title,
    .set-codex .set-page-title,
    .ds-mobile-title,
    .dms-title {
      font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
      font-weight: 400 !important;
      font-size: 26px !important;
      letter-spacing: -0.5px !important;
      line-height: 1.02 !important;
      color: #0F0F10 !important;
      margin: 0 !important;
    }
    .ds-mobile-title,
    .dms-title {
      font-size: 28px !important;
      font-weight: 500 !important;
      letter-spacing: -0.03em !important;
      line-height: 1.15 !important;
    }
    .mcl-head-copy h1 span,
    .festag-m-head h1 .pjm-t,
    .dec-m-title h1 .dec-m-t {
      font-size: inherit !important;
      font-weight: 400 !important;
      color: inherit !important;
      letter-spacing: inherit !important;
      line-height: inherit !important;
      font-family: inherit !important;
    }
    .mcl-page-sub,
    .festag-m-lead,
    .dec-m-lead,
    .dec-m-subline,
    .pj2-m-lead,
    .set-page-lead,
    .festag-page-lead {
      display: none !important;
    }
    .mcl-page-sub span,
    .festag-m-lead span,
    .dec-m-lead .dec-m-t,
    .dec-m-subline .dec-m-t,
    .pj2-m-lead span {
      display: none !important;
    }
    .festag-m-head .pjm-t--new,
    .festag-m-head .pj2-m-lead--new { display: none !important; }
    body[data-npm-sheet] .festag-m-head .pjm-t--list,
    body[data-npm-sheet] .festag-m-head .pj2-m-lead--list { display: none !important; }
    body[data-npm-sheet] .festag-m-head .pjm-t--new,
    body[data-npm-sheet] .festag-m-head .pj2-m-lead--new { display: inline !important; }
    [data-theme="dark"] .mcl-head-copy h1,
    [data-theme="classic-dark"] .mcl-head-copy h1,
    [data-theme="dark"] .festag-m-head h1,
    [data-theme="classic-dark"] .festag-m-head h1,
    [data-theme="dark"] .pj2-page .pj2-page-head-copy h1,
    [data-theme="classic-dark"] .pj2-page .pj2-page-head-copy h1,
    [data-theme="dark"] .dec-m-title h1,
    [data-theme="classic-dark"] .dec-m-title h1,
    [data-theme="dark"] .set-codex .set-page-title,
    [data-theme="classic-dark"] .set-codex .set-page-title,
    [data-theme="dark"] .ds-mobile-title,
    [data-theme="classic-dark"] .ds-mobile-title,
    [data-theme="dark"] .dms-title,
    [data-theme="classic-dark"] .dms-title {
      color: #f4f4f4 !important;
    }

    /* Cursor nav row — orbs above title (Projekte, Entscheidungen, Portal headers) */
    .pj2-page-head,
    .dec-page-head {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 0 !important;
    }
    .pjm-head-actions,
    .dec-m-head-actions {
      order: -1 !important;
      align-self: flex-end !important;
      margin-bottom: 14px !important;
      padding-top: 0 !important;
    }
  }
`

export const FESTAG_CONTENT_HEAD_CSS_WITH_MOBILE = `
${FESTAG_CONTENT_HEAD_CSS}
${FESTAG_MOBILE_HEAD_CSS}
`

/** Shared list-row hover — Projekte, Entscheidungen, künftige Inhaltscontainer. */
export const FESTAG_LIST_ROW_HOVER_CSS = `
  .pj2-page,
  .dec-os,
  .mcl-page {
    --festag-list-row-hover-bg: rgba(15, 23, 42, 0.04);
    --festag-list-row-inset-x: 24px;
  }
  [data-theme="dark"] .pj2-page,
  [data-theme="classic-dark"] .pj2-page,
  [data-theme="dark"] .dec-os,
  [data-theme="classic-dark"] .dec-os,
  [data-theme="dark"] .mcl-page,
  [data-theme="classic-dark"] .mcl-page {
    --festag-list-row-hover-bg: rgba(255, 255, 255, 0.045);
  }

  .festag-list-row,
  .pj2-item,
  .dec-card,
  button.dec-card,
  .act-row {
    border: 1px solid transparent;
    border-radius: 12px;
    transition:
      background .18s ease,
      box-shadow .18s ease,
      border-color .18s ease,
      transform .18s ease,
      backdrop-filter .18s ease;
    -webkit-tap-highlight-color: transparent;
  }

  button.dec-card {
    margin: 0;
    width: 100%;
    box-sizing: border-box;
    border-radius: 12px !important;
    background: transparent;
    font: inherit;
    font-weight: inherit;
    letter-spacing: inherit;
    text-align: left;
    color: inherit;
    appearance: none;
    -webkit-appearance: none;
  }

  .dec-card-left,
  .dec-card-mid,
  .dec-card-meta,
  .dec-card-actions,
  .dec-card-title-block,
  .dec-card-section {
    align-items: flex-start;
    text-align: left;
  }

  @media (hover: hover) and (min-width: 769px) {
    .festag-list-row:hover,
    .pj2-item:hover,
    .dec-card:hover,
    button.dec-card:hover,
    .act-row:hover {
      background: var(--festag-list-row-hover-bg) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      border-color: transparent !important;
      box-shadow: none !important;
      transform: none !important;
    }
  }

  @media (hover: none) and (min-width: 769px) {
    .festag-list-row:hover,
    .pj2-item:hover,
    .dec-card:hover,
    button.dec-card:hover,
    .act-row:hover {
      background: transparent !important;
      box-shadow: none !important;
    }
  }

  @media (max-width: 768px) and (hover: hover) {
    .pj2-row.pj2-item:hover,
    .dec-card:hover,
    button.dec-card:hover,
    .act-row:hover {
      background: var(--festag-list-row-hover-bg, rgba(15, 23, 42, 0.04)) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      border-color: transparent !important;
      box-shadow: none !important;
      transform: none !important;
    }
    [data-theme="dark"] .pj2-row.pj2-item:hover,
    [data-theme="classic-dark"] .pj2-row.pj2-item:hover,
    [data-theme="dark"] .dec-card:hover,
    [data-theme="classic-dark"] .dec-card:hover,
    [data-theme="dark"] button.dec-card:hover,
    [data-theme="classic-dark"] button.dec-card:hover,
    [data-theme="dark"] .act-row:hover,
    [data-theme="classic-dark"] .act-row:hover {
      background: var(--festag-list-row-hover-bg, rgba(255, 255, 255, 0.045)) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      border-color: transparent !important;
      box-shadow: none !important;
      transform: none !important;
    }
  }

  @media (max-width: 768px) {
    .festag-list-row,
    .pj2-item,
    .dec-card,
    button.dec-card,
    .act-row {
      border-radius: 0 !important;
      border: none !important;
      box-shadow: none !important;
    }
    button.dec-card {
      border-radius: 0 !important;
    }
  }
`

/** Soft top fade when scroll content passes under sticky page chrome (Codex list pattern). */
export const FESTAG_SCROLL_FADE_CSS = `
  :root {
    --festag-scroll-fade-height: 52px;
  }

  @media (min-width: 769px) {
    .notes-static-top,
    .reports-static-top,
    .caps-top,
    .ix-list-head {
      position: sticky;
      top: 0;
      z-index: 8;
    }
    .notes-static-top,
    .reports-static-top,
    .caps-top {
      background: var(--portal-card, var(--surface, #F7F7F8));
    }
    .festag-mobile-chrome::after {
      display: none;
    }
  }

  .dec-static-top::after,
  .pj2-static-top::after,
  .mb-static-top::after,
  .st-ex-hero::after,
  .festag-mobile-chrome::after,
  .notes-static-top::after,
  .reports-static-top::after,
  .caps-top::after,
  .ix-list-head::after {
    content: '';
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(-1 * var(--festag-scroll-fade-height, 52px));
    height: var(--festag-scroll-fade-height, 52px);
    background: linear-gradient(
      to bottom,
      var(--festag-scroll-fade-bg, var(--portal-card, #F7F7F8)) 0%,
      color-mix(in srgb, var(--festag-scroll-fade-bg, var(--portal-card, #F7F7F8)) 92%, transparent) 26%,
      color-mix(in srgb, var(--festag-scroll-fade-bg, var(--portal-card, #F7F7F8)) 68%, transparent) 56%,
      color-mix(in srgb, var(--festag-scroll-fade-bg, var(--portal-card, #F7F7F8)) 28%, transparent) 78%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 1;
  }

  .dec-static-top { --festag-scroll-fade-bg: var(--dec-card-bg, var(--portal-card, #F7F7F8)); }
  .pj2-static-top { --festag-scroll-fade-bg: var(--portal-card, #F7F7F8); }
  .st-ex-hero { --festag-scroll-fade-bg: var(--portal-card, #F7F7F8); }
  .mb-static-top { --festag-scroll-fade-bg: var(--mb-card-bg, var(--portal-card, #F7F7F8)); }
  .ix-list-head { --festag-scroll-fade-bg: var(--ix-surface, var(--portal-card, #F7F7F8)); }

  /* Scroll panes without overlapping sticky header (detail body, inbox threads). */
  .dec-detail-page,
  .ix-thread-scroll {
    --festag-scroll-fade-bg: var(--dec-card-bg, var(--portal-card, #F7F7F8));
  }
  .ix-thread-scroll {
    --festag-scroll-fade-bg: var(--ix-surface, var(--portal-card, #F7F7F8));
  }

  .dec-detail-page::before,
  .ix-thread-scroll::before {
    content: '';
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    display: block;
    height: var(--festag-scroll-fade-height, 52px);
    margin-bottom: calc(-1 * var(--festag-scroll-fade-height, 52px));
    background: linear-gradient(
      to bottom,
      var(--festag-scroll-fade-bg, var(--portal-card, #F7F7F8)) 0%,
      color-mix(in srgb, var(--festag-scroll-fade-bg, var(--portal-card, #F7F7F8)) 92%, transparent) 26%,
      color-mix(in srgb, var(--festag-scroll-fade-bg, var(--portal-card, #F7F7F8)) 68%, transparent) 56%,
      color-mix(in srgb, var(--festag-scroll-fade-bg, var(--portal-card, #F7F7F8)) 28%, transparent) 78%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 2;
  }

  @media (max-width: 768px) {
    .dec-os,
    .pj2-page,
    .mcl-page,
    .notes-os,
    .reports-intelligence,
    .mb-page,
    .doc-os-page,
    .ix-root {
      --festag-scroll-fade-bg: var(--festag-portal-canvas, #FCFCFC);
    }
    [data-theme="dark"] .dec-os,
    [data-theme="classic-dark"] .dec-os,
    [data-theme="dark"] .pj2-page,
    [data-theme="classic-dark"] .pj2-page,
    [data-theme="dark"] .mcl-page,
    [data-theme="classic-dark"] .mcl-page,
    [data-theme="dark"] .notes-os,
    [data-theme="classic-dark"] .notes-os,
    [data-theme="dark"] .reports-intelligence,
    [data-theme="classic-dark"] .reports-intelligence,
    [data-theme="dark"] .mb-page,
    [data-theme="classic-dark"] .mb-page,
    [data-theme="dark"] .ix-root,
    [data-theme="classic-dark"] .ix-root {
      --festag-scroll-fade-bg: var(--festag-black-canvas, #070708);
    }
    [data-theme="dark"] .doc-os-page,
    [data-theme="classic-dark"] .doc-os-page {
      --festag-scroll-fade-bg: var(--festag-black-canvas, #070708);
    }

    .dec-static-top,
    .pj2-static-top,
    .mb-static-top,
    .festag-mobile-chrome,
    .notes-static-top,
    .reports-static-top,
    .caps-top,
    .ix-list-head,
    .mcl-head {
      position: sticky !important;
      top: env(safe-area-inset-top, 0px) !important;
      z-index: 12 !important;
      flex: 0 0 auto !important;
      background: var(--festag-scroll-fade-bg, var(--festag-portal-canvas, #FCFCFC)) !important;
      isolation: isolate;
    }

    .dec-static-top::before,
    .pj2-static-top::before,
    .mb-static-top::before,
    .festag-mobile-chrome::before,
    .notes-static-top::before,
    .reports-static-top::before,
    .caps-top::before,
    .ix-list-head::before,
    .mcl-head::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 100%;
      height: 100vh;
      background: inherit;
      pointer-events: none;
      z-index: -1;
    }

    .dec-static-top::after,
    .pj2-static-top::after,
    .mb-static-top::after,
    .festag-mobile-chrome::after,
    .notes-static-top::after,
    .reports-static-top::after,
    .caps-top::after,
    .ix-list-head::after,
    .dec-detail-page::before,
    .ix-thread-scroll::before {
      display: none !important;
    }
  }
`

export const MOBILE_CODEX_LIST_CSS = `
${FESTAG_LIST_ROW_HOVER_CSS}
${FESTAG_MOBILE_HEAD_CSS}
${FESTAG_SCROLL_FADE_CSS}
  .mcl-dt,
  .mcl-page-sub,
  .mcl-head-actions,
  .mcl-actions,
  .mcl-sheet-backdrop,
  .mcl-sheet-title { display: none; }

  .mcl-head { display: none; }

  .mcl-shell {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
  }

  @media (max-width: 768px) {
    .mcl-dt { display: none !important; }
    .mcl-m { display: inline !important; }

    .mcl-page {
      --mcl-white-elev:
        inset 0 1px 0 rgba(255, 255, 255, 1),
        0 1px 0 rgba(0, 0, 0, 0.04),
        0 4px 10px rgba(144, 149, 159, 0.16);
      --mcl-white-border: 1px solid rgba(0, 0, 0, 0.07);
      background: var(--festag-portal-canvas, #FCFCFC) !important;
      overflow-x: hidden !important;
      min-height: 100%;
      display: flex !important;
      flex-direction: column !important;
    }
    [data-theme="dark"] .mcl-page,
    [data-theme="classic-dark"] .mcl-page {
      --mcl-white-elev:
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.42);
      --mcl-white-border: 1px solid rgba(255, 255, 255, 0.08);
      --festag-scroll-fade-bg: var(--festag-portal-canvas, #070708);
      background: var(--festag-portal-canvas, var(--festag-black-canvas, #070708)) !important;
    }

    :global(.mcd) { display: none !important; }
    .mcl-legacy-mph,
    .mcl-legacy-mph .mph { display: none !important; }

    .mcl-shell {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      padding: calc(20px + env(safe-area-inset-top, 0px)) 20px 160px !important;
      box-sizing: border-box !important;
      -webkit-overflow-scrolling: touch;
    }

    .mcl-head {
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 0 !important;
      margin-bottom: 24px !important;
      position: relative;
    }
    .mcl-nav-row {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      width: 100% !important;
      margin-bottom: 14px !important;
    }
    .mcl-nav-spacer {
      width: var(--festag-mobile-control-height-compact, 44px) !important;
      height: var(--festag-mobile-control-height-compact, 44px) !important;
      flex-shrink: 0 !important;
    }
    .mcl-head-copy {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
    }
    .mcl-head-copy h1,
    .mcl-head-copy p {
      font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
      font-weight: 400 !important;
      margin: 0 !important;
    }
    .mcl-head-copy .mcl-m {
      font-size: inherit !important;
      font-weight: 400 !important;
      color: inherit !important;
      letter-spacing: inherit !important;
      line-height: inherit !important;
    }
    .mcl-head-actions {
      display: none !important;
    }

    .mcl-actions {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      margin-bottom: 32px !important;
      position: relative !important;
    }
    .mcl-actions-group {
      display: inline-flex !important;
      align-items: center !important;
      gap: 8px !important;
    }
    .mcl-add-btn {
      position: relative !important;
      width: var(--festag-mobile-control-height-compact, 44px) !important;
      height: var(--festag-mobile-control-height-compact, 44px) !important;
      min-width: var(--festag-mobile-control-height-compact, 44px) !important;
      min-height: var(--festag-mobile-control-height-compact, 44px) !important;
      border: var(--mcl-white-border) !important;
      border-radius: var(--festag-mobile-control-radius, 12px) !important;
      background: var(--festag-btn-dark-bg, #ffffff) !important;
      color: var(--festag-btn-dark-fg, #1e1e20) !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      padding: 0 !important;
      flex-shrink: 0 !important;
      box-shadow: var(--festag-mobile-control-shadow, 0 1px 2px rgba(0, 0, 0, 0.04)) !important;
      transition: background 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .mcl-add-btn:active {
      transform: scale(0.985);
      background: var(--festag-btn-dark-bg-active, #f5f5f6) !important;
      box-shadow: none !important;
    }
    .mcl-ctl {
      position: relative !important;
      width: var(--festag-mobile-control-height-compact, 44px) !important;
      min-width: var(--festag-mobile-control-height-compact, 44px) !important;
      height: var(--festag-mobile-control-height-compact, 44px) !important;
      min-height: var(--festag-mobile-control-height-compact, 44px) !important;
      border: var(--mcl-white-border) !important;
      border-radius: var(--festag-mobile-control-radius, 12px) !important;
      background: #FFFFFF !important;
      color: var(--festag-elev-icon, #1D1D1F) !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      cursor: pointer !important;
      flex-shrink: 0 !important;
      box-shadow: var(--festag-mobile-control-shadow, 0 1px 2px rgba(0, 0, 0, 0.04)) !important;
      transition: background 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .mcl-ctl.on { background: var(--festag-elev-on-bg, #F2F2F7) !important; }
    .mcl-ctl.has-active::after {
      content: '' !important;
      position: absolute !important;
      top: 7px !important;
      right: 7px !important;
      width: 5px !important;
      height: 5px !important;
      border-radius: 50% !important;
      background: var(--portal-btn-primary, #2d2e2c) !important;
      box-shadow: 0 0 0 1.5px #FFFFFF !important;
    }
    .mcl-ctl:active {
      transform: scale(0.985);
      background: var(--festag-elev-active-bg, #F5F5F7) !important;
      box-shadow: none !important;
    }

    .mcl-sheet-title {
      display: block !important;
      margin: 0 0 4px !important;
      padding: 4px 16px 8px !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      letter-spacing: 0.02em !important;
      color: #90959F !important;
    }
    .mcl-filter-menu {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 100 !important;
      padding: 8px 16px calc(8px + env(safe-area-inset-bottom)) !important;
      border-radius: 20px 20px 0 0 !important;
      background: var(--festag-portal-sheet, var(--portal-raised, #FAFAFA)) !important;
      box-shadow: 0 -4px 24px rgba(15, 23, 42, 0.12) !important;
    }
    .mcl-filter-item {
      display: flex !important;
      width: 100% !important;
      align-items: center !important;
      min-height: 48px !important;
      padding: 0 12px !important;
      border: 0 !important;
      border-radius: 12px !important;
      background: transparent !important;
      color: #2a3032 !important;
      font: inherit !important;
      font-size: 15px !important;
      cursor: pointer !important;
      text-align: left !important;
    }
    .mcl-filter-item.on {
      background: #f8f8fa !important;
      font-weight: 500 !important;
    }
    .mcl-sheet-backdrop {
      display: block !important;
      position: fixed !important;
      inset: 0 !important;
      z-index: 90 !important;
      border: 0 !important;
      padding: 0 !important;
      background: var(--modal-backdrop, rgba(245, 245, 247, 0.72)) !important;
      cursor: default !important;
    }

    .mcl-body {
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
    }

    [data-theme="dark"] .mcl-head-copy h1,
    [data-theme="classic-dark"] .mcl-head-copy h1 {
      color: #f4f4f4 !important;
    }
    [data-theme="dark"] .mcl-page-sub,
    [data-theme="classic-dark"] .mcl-page-sub,
    [data-theme="dark"] .mcl-head-copy p,
    [data-theme="classic-dark"] .mcl-head-copy p {
      color: #9aa0ac !important;
    }
    [data-theme="dark"] .mcl-page .cx-orb,
    [data-theme="classic-dark"] .mcl-page .cx-orb,
    [data-theme="dark"] .mcl-ctl,
    [data-theme="classic-dark"] .mcl-ctl {
      background: var(--festag-black-popup, #1A1A1E) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      color: rgba(255, 255, 255, 0.92) !important;
      box-shadow: var(--festag-mobile-control-shadow-dark, 0 1px 2px rgba(0, 0, 0, 0.32)) !important;
    }
    [data-theme="dark"] .mcl-ctl.has-active::after,
    [data-theme="classic-dark"] .mcl-ctl.has-active::after {
      background: #ffffff !important;
      box-shadow: 0 0 0 1.5px #141416 !important;
    }
    [data-theme="dark"] .mcl-add-btn,
    [data-theme="classic-dark"] .mcl-add-btn {
      background: #ffffff !important;
      color: #121218 !important;
      box-shadow: var(--festag-mobile-control-shadow-dark, 0 1px 2px rgba(0, 0, 0, 0.32)) !important;
    }
    [data-theme="dark"] .mcl-sheet-backdrop,
    [data-theme="classic-dark"] .mcl-sheet-backdrop {
      background: var(--modal-backdrop, rgba(0, 0, 0, 0.22)) !important;
    }
    [data-theme="dark"] .mcl-filter-menu,
    [data-theme="classic-dark"] .mcl-filter-menu {
      background: var(--festag-black-popup, #1A1A1E) !important;
    }
    [data-theme="dark"] .mcl-filter-item,
    [data-theme="classic-dark"] .mcl-filter-item {
      color: #f4f4f4 !important;
    }
  }
`
