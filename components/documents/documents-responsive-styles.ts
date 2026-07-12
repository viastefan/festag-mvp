/** Tablet + mobile polish for Dokumente list and editor. */
export const DOCUMENTS_RESPONSIVE_CSS = `
  /* ── Tablet (769–1024) ── */
  @media (min-width: 769px) and (max-width: 1024px) {
    .doc-os-page .doc-static-top,
    .doc-ed-page .dec-static-top {
      padding-top: clamp(36px, 5vh, 56px);
      padding-left: clamp(24px, 4vw, 40px);
      padding-right: clamp(24px, 4vw, 40px);
    }
    .doc-os-page .dec-scroll-body,
    .doc-ed-page .dec-scroll-body {
      padding-left: clamp(24px, 4vw, 40px);
      padding-right: clamp(24px, 4vw, 40px);
    }
    .doc-create-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .doc-create-grid .doc-create-tile:last-child:nth-child(odd) {
      grid-column: 1 / -1;
      max-width: calc(50% - 6px);
    }
    .doc-ed-page-head .festag-page-title {
      font-size: clamp(24px, 3.2vw, 29px) !important;
      line-height: 1.12 !important;
    }
    .dtcb-root {
      left: clamp(24px, 4vw, 40px);
      right: clamp(24px, 4vw, 40px);
    }
  }

  /* ── Mobile (≤768) — list page ── */
  @media (max-width: 768px) {
    .doc-os-page .dec-scroll-body {
      padding-bottom: calc(168px + env(safe-area-inset-bottom, 0px));
    }

    .doc-os-page .doc-static-top .dec-page-head {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      padding-bottom: 20px;
    }
    .doc-os-page .dec-page-head-copy {
      max-width: none;
      padding-right: 0;
    }
    .doc-os-page .dec-page-head-copy .festag-page-title {
      padding-right: 4px;
      line-height: 1.08 !important;
      letter-spacing: -0.45px !important;
    }
    .doc-os-page .dec-page-head-copy .dec-m-t .festag-page-lead-muted {
      color: var(--dec-soft, #86868b);
    }

    /* Template tiles — horizontal snap carousel */
    .doc-templates {
      margin-bottom: 18px;
    }
    .doc-create-grid {
      display: flex;
      flex-direction: row;
      gap: 10px;
      margin: 0 -20px;
      padding: 2px 20px 8px;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .doc-create-grid::-webkit-scrollbar {
      display: none;
    }
    .doc-create-tile {
      flex: 0 0 min(268px, 82vw);
      scroll-snap-align: start;
      min-height: 108px;
      border-radius: 14px !important;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .doc-create-tile:active {
      transform: scale(0.985);
    }

    .doc-issuer-card {
      margin-bottom: 14px;
      padding: 18px;
      border-radius: 18px;
    }
    .doc-issuer-btn {
      align-self: stretch;
      justify-content: center;
      min-height: 44px;
      border-radius: 12px;
    }

    .doc-inbox-hint {
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 8px;
    }

    .dec-scroll-body .dec-empty.doc-empty--linear {
      padding: 40px 20px 56px;
      max-width: none;
    }
    .doc-empty-actions {
      flex-direction: column;
      width: 100%;
      max-width: min(320px, 100%);
      gap: 10px;
    }
    .doc-empty-btn {
      width: 100%;
      min-height: 48px;
      height: auto;
      padding: 12px 18px;
      font-size: 15px;
      border-radius: 14px;
      -webkit-tap-highlight-color: transparent;
    }
    .doc-empty-lead {
      font-size: 14px;
      line-height: 1.55;
      max-width: none;
    }

    .doc-card-actions {
      gap: 8px;
    }
    .doc-card-actions .fui-pill-btn,
    .doc-card-actions .festag-pill-btn {
      min-height: 40px;
      flex: 1 1 auto;
    }
  }

  /* ── Mobile (≤768) — editor ── */
  @media (max-width: 768px) {
    .doc-ed-page .dec-static-top {
      padding-top: calc(16px + env(safe-area-inset-top, 0px));
    }
    .doc-ed-page .dec-page-head.doc-ed-page-head {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      padding-bottom: 18px;
    }
    .doc-ed-page .dec-page-head-copy {
      max-width: none;
      min-width: 0;
    }
    .doc-ed-page .dec-page-head-copy .festag-page-title {
      line-height: 1.08 !important;
      letter-spacing: -0.45px !important;
    }
    .doc-ed-page .dec-page-head-copy .dec-m-t .festag-page-lead-muted {
      color: var(--dec-soft, #86868b);
    }
    .doc-ed-page .dec-m-lead {
      display: none !important;
    }
    .doc-ed-page .doc-ed-page-actions {
      display: none !important;
    }
    .doc-ed-page .dec-m-head-actions {
      margin-bottom: 12px !important;
    }

    .doc-ed-page .dec-scroll-body {
      padding-left: 20px;
      padding-right: 20px;
      padding-bottom: calc(196px + env(safe-area-inset-bottom, 0px));
    }

    .doc-ed-sheet {
      margin: 0 0 24px;
      border-radius: 18px;
    }
    .doc-ed-sheet-inner {
      padding: 16px 16px 20px;
    }

    .doc-ed-section {
      margin-top: 18px;
      padding-top: 18px;
    }
    .doc-ed-section-title {
      font-size: 16px;
      margin-bottom: 12px;
    }
    .doc-ed-input,
    .doc-ed-area {
      font-size: 16px;
      min-height: 44px;
      padding: 10px 0;
    }
    .doc-ed-issuer {
      border-radius: 14px;
      padding: 14px 16px;
    }

    /* Positions — card rows instead of cramped table */
    .doc-ed-pos-table {
      display: block;
    }
    .doc-ed-pos-table thead {
      display: none;
    }
    .doc-ed-pos-table tbody {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .doc-ed-pos-table tbody tr {
      display: grid;
      grid-template-columns: 1fr auto auto;
      grid-template-areas:
        "desc desc del"
        "qty price price";
      gap: 10px 12px;
      padding: 14px;
      border-radius: 14px;
      background: var(--de-surface, rgba(255, 255, 255, 0.06));
      border-bottom: 0;
    }
    html[data-theme="light"] .doc-ed-pos-table tbody tr,
    html[data-theme="read"] .doc-ed-pos-table tbody tr {
      background: rgba(0, 0, 0, 0.03);
    }
    .doc-ed-pos-table tbody td {
      padding: 0;
      border: 0;
    }
    .doc-ed-pos-table tbody td:first-child {
      grid-area: desc;
    }
    .doc-ed-pos-table tbody td.num {
      grid-area: qty;
    }
    .doc-ed-pos-table tbody td.price {
      grid-area: price;
    }
    .doc-ed-pos-table tbody td.actions {
      grid-area: del;
      align-self: start;
      justify-self: end;
    }
    .doc-ed-pos-table tbody td.num::before,
    .doc-ed-pos-table tbody td.price::before {
      display: block;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--de-muted);
      margin-bottom: 4px;
    }
    .doc-ed-pos-table tbody td.num::before { content: 'Menge'; }
    .doc-ed-pos-table tbody td.price::before { content: 'Preis'; }
    .doc-ed-pos-head {
      margin-bottom: 12px;
    }
    .doc-ed-pos-head .doc-ed-btn {
      min-height: 40px;
      padding: 0 14px;
      border-radius: 999px;
    }
    .doc-ed-pos-del {
      width: 36px;
      height: 36px;
    }
    .doc-ed-pos-total {
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid var(--de-border);
      font-size: 15px;
    }
    .doc-ed-pos-total strong {
      font-size: 18px;
    }

    /* Tagro compose — floating sheet above dock */
    .dtcb-root {
      left: 12px;
      right: 12px;
      bottom: calc(78px + env(safe-area-inset-bottom, 0px));
    }
    .dtcb-root.is-focused {
      bottom: calc(78px + env(safe-area-inset-bottom, 0px));
    }
    .dtcb-shell {
      border-radius: 20px;
      padding: 12px 12px 12px 14px;
      gap: 8px;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
    }
    html[data-theme="dark"] .dtcb-shell,
    html[data-theme="classic-dark"] .dtcb-shell {
      box-shadow: 0 24px 56px rgba(0, 0, 0, 0.55);
    }
    .dtcb-input {
      font-size: 16px;
      padding: 8px 2px;
    }
    .dtcb-send {
      height: 40px;
      min-width: 44px;
      padding: 0 16px;
      font-size: 14px;
    }
    .dtcb-ghost-text {
      font-size: 15px;
    }

    /* Invoice WYSIWYG stage */
    .doc-ed--wysiwyg .doc-ed-body {
      padding-left: 12px;
      padding-right: 12px;
      padding-bottom: calc(196px + env(safe-area-inset-bottom, 0px));
    }
    .iwy-stage {
      padding: 12px 8px 24px;
    }
    .iwy-sheet {
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
    }
  }

  /* ── Narrow phones ── */
  @media (max-width: 380px) {
    .doc-create-tile {
      flex-basis: min(252px, 88vw);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .doc-create-tile:active {
      transform: none;
    }
    .doc-empty-sheet {
      animation: none;
    }
  }
`
