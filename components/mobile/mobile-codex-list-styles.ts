/** Shared Codex mobile list-page chrome — matches /projects + /decisions. */

/** Festag content-container page header — reuse on new list/detail shells.
 *  Title: Aeonik Regular (400), 29px, letter-spacing -1px.
 *  Desktop lead: 17px soft copy only (no dynamic count line under the title).
 *  Mobile: grey subtitle span inside h1 (.festag-m-sub / .pjm-t / .dec-m-sub). */
export const FESTAG_CONTENT_HEAD_CSS = `
  .festag-page-title,
  .dec-os .dec-page-title,
  .pj2-page .pj2-page-title {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
    font-weight: 400 !important;
    font-size: 29px !important;
    letter-spacing: -1px !important;
    line-height: 1.02 !important;
  }
  .festag-page-title span,
  .dec-os .dec-page-title span,
  .pj2-page .pj2-page-title span {
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
  .festag-page-head-copy,
  .dec-page-head-copy,
  .pj2-page-head-copy {
    gap: 4px;
  }
  @media (max-width: 768px) {
    .festag-m-sub,
    .dec-m-sub,
    .pj2-page .pj2-page-title .pjm-t {
      display: block !important;
      font-weight: 400 !important;
      color: #90959F !important;
      letter-spacing: -0.5px !important;
    }
    [data-theme="dark"] .festag-m-sub,
    [data-theme="classic-dark"] .festag-m-sub,
    [data-theme="dark"] .dec-m-sub,
    [data-theme="classic-dark"] .dec-m-sub,
    [data-theme="dark"] .pj2-page .pj2-page-title .pjm-t,
    [data-theme="classic-dark"] .pj2-page .pj2-page-title .pjm-t {
      color: #9aa0ac !important;
    }
  }
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
  .dec-card {
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

  @media (hover: hover) and (min-width: 769px) {
    .festag-list-row:hover,
    .pj2-item:hover,
    .dec-card:hover {
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
    .dec-card:hover {
      background: transparent !important;
      box-shadow: none !important;
    }
  }

  @media (max-width: 768px) and (hover: hover) {
    .pj2-row.pj2-item:hover,
    .dec-card:hover {
      background: rgba(255, 255, 255, 0.72) !important;
      backdrop-filter: blur(18px) saturate(175%) !important;
      -webkit-backdrop-filter: blur(18px) saturate(175%) !important;
      border-color: rgba(255, 255, 255, 0.95) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 1),
        0 12px 32px -12px rgba(15, 23, 42, 0.14),
        0 4px 10px rgba(144, 149, 159, 0.1) !important;
      transform: translateY(-1px);
    }
    [data-theme="dark"] .pj2-row.pj2-item:hover,
    [data-theme="classic-dark"] .pj2-row.pj2-item:hover,
    [data-theme="dark"] .dec-card:hover,
    [data-theme="classic-dark"] .dec-card:hover {
      background: rgba(255, 255, 255, 0.09) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      border-color: rgba(255, 255, 255, 0.14) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.08),
        0 4px 10px rgba(0, 0, 0, 0.32) !important;
      transform: translateY(-1px);
    }
  }
`

export const MOBILE_CODEX_LIST_CSS = `
${FESTAG_LIST_ROW_HOVER_CSS}
  .mcl-dt,
  .mcl-page-sub,
  .mcl-head,
  .mcl-head-actions,
  .mcl-actions,
  .mcl-sheet-backdrop,
  .mcl-sheet-title { display: none; }

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
      background: #FCFCFC !important;
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
      --mcl-white-border: 1px solid rgba(255, 255, 255, 0.14);
      background: var(--portal-bg, #0d0d0f) !important;
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
      align-items: flex-start !important;
      justify-content: space-between !important;
      gap: 12px !important;
      margin-bottom: 28px !important;
      flex-wrap: nowrap !important;
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
    .mcl-head-copy h1 {
      font-size: 29px !important;
      letter-spacing: -0.5px !important;
      line-height: 1.02 !important;
      color: #0F0F10 !important;
    }
    .mcl-page-sub,
    .mcl-head-copy p {
      display: flex !important;
      width: fit-content !important;
      font-size: 29px !important;
      letter-spacing: -0.5px !important;
      line-height: 1.02 !important;
      color: #90959F !important;
      margin-top: -2px !important;
    }
    .mcl-head-copy .mcl-m {
      font-size: inherit !important;
      font-weight: 400 !important;
      color: inherit !important;
      letter-spacing: inherit !important;
      line-height: inherit !important;
    }
    .mcl-head-actions {
      display: flex !important;
      align-items: flex-start !important;
      flex-shrink: 0 !important;
      padding-top: 2px !important;
    }
    .mcl-page .cx-action-pill {
      background: #FFFFFF !important;
      border: var(--mcl-white-border) !important;
      box-shadow: var(--mcl-white-elev) !important;
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
      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;
      min-height: 36px !important;
      border: 0 !important;
      border-radius: 999px !important;
      background: var(--portal-btn-primary, #5b647d) !important;
      color: #ffffff !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      padding: 0 !important;
      flex-shrink: 0 !important;
      box-shadow:
        0 2px 10px rgba(91, 100, 125, 0.32),
        0 1px 3px rgba(46, 47, 51, 0.14) !important;
      -webkit-tap-highlight-color: transparent;
    }
    .mcl-add-btn:active {
      transform: scale(0.96);
      background: color-mix(in srgb, var(--portal-btn-primary, #5b647d) 88%, #000) !important;
    }
    .mcl-ctl {
      position: relative !important;
      width: 36px !important;
      min-width: 36px !important;
      height: 36px !important;
      min-height: 36px !important;
      border: var(--mcl-white-border) !important;
      border-radius: 999px !important;
      background: #FFFFFF !important;
      color: #1C1C1E !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      cursor: pointer !important;
      flex-shrink: 0 !important;
      box-shadow: var(--mcl-white-elev) !important;
      -webkit-tap-highlight-color: transparent;
    }
    .mcl-ctl.on { background: #F8F8F8 !important; }
    .mcl-ctl.has-active::after {
      content: '' !important;
      position: absolute !important;
      top: 7px !important;
      right: 7px !important;
      width: 5px !important;
      height: 5px !important;
      border-radius: 50% !important;
      background: var(--portal-btn-primary, #5b647d) !important;
      box-shadow: 0 0 0 1.5px #ffffff !important;
    }
    .mcl-ctl:active {
      transform: scale(0.96);
      background: #FAFAFA !important;
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
      background: #fff !important;
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
      background: rgba(15, 15, 16, 0.28) !important;
      cursor: default !important;
    }

    .mcl-body {
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
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
    [data-theme="dark"] .mcl-page .cx-action-pill,
    [data-theme="classic-dark"] .mcl-page .cx-action-pill,
    [data-theme="dark"] .mcl-ctl,
    [data-theme="classic-dark"] .mcl-ctl {
      background: rgba(255, 255, 255, 0.11) !important;
      border: var(--mcl-white-border) !important;
      color: rgba(255, 255, 255, 0.92) !important;
      box-shadow: var(--mcl-white-elev) !important;
    }
    [data-theme="dark"] .mcl-ctl.has-active::after,
    [data-theme="classic-dark"] .mcl-ctl.has-active::after {
      background: #ffffff !important;
      box-shadow: 0 0 0 1.5px #141416 !important;
    }
    [data-theme="dark"] .mcl-add-btn,
    [data-theme="classic-dark"] .mcl-add-btn {
      background: #ffffff !important;
      color: #121214 !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.92),
        0 2px 6px rgba(0, 0, 0, 0.36) !important;
    }
    [data-theme="dark"] .mcl-sheet-backdrop,
    [data-theme="classic-dark"] .mcl-sheet-backdrop {
      background: rgba(0, 0, 0, 0.52) !important;
    }
    [data-theme="dark"] .mcl-filter-menu,
    [data-theme="classic-dark"] .mcl-filter-menu {
      background: #1c1c1e !important;
    }
    [data-theme="dark"] .mcl-filter-item,
    [data-theme="classic-dark"] .mcl-filter-item {
      color: #f4f4f4 !important;
    }
  }
`
