/** Shared Codex mobile list-page chrome — matches /projects + /decisions. */
export const MOBILE_CODEX_LIST_CSS = `
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
  }
`
