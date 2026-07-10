export const BENACHRICHTIGUNGEN_CSS = `
  .bn-root {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid #f3f4f6;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    color: #111827;
  }

  [data-theme="dark"] .bn-root,
  [data-theme="classic-dark"] .bn-root {
    background: var(--portal-card, #0c0c0e);
    border-color: rgba(255, 255, 255, 0.08);
    color: var(--portal-text, #f4f4f4);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
  }

  .bn-list {
    width: 300px;
    flex-shrink: 0;
    border-right: 1px solid #f3f4f6;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  [data-theme="dark"] .bn-list,
  [data-theme="classic-dark"] .bn-list {
    border-right-color: rgba(255, 255, 255, 0.08);
  }

  .bn-list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid #f3f4f6;
    flex-shrink: 0;
  }

  [data-theme="dark"] .bn-list-head,
  [data-theme="classic-dark"] .bn-list-head {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .bn-list-title {
    font-size: 13px;
    font-weight: 500;
    color: #111827;
  }

  [data-theme="dark"] .bn-list-title,
  [data-theme="classic-dark"] .bn-list-title {
    color: var(--portal-text, #f4f4f4);
  }

  .bn-list-tools {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bn-icon-btn {
    padding: 4px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    color: #9ca3af;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s ease;
  }

  .bn-icon-btn:hover {
    background: #f3f4f6;
  }

  [data-theme="dark"] .bn-icon-btn:hover,
  [data-theme="classic-dark"] .bn-icon-btn:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .bn-mark-all {
    border: none;
    background: transparent;
    font: inherit;
    font-size: 10.5px;
    color: #9ca3af;
    cursor: pointer;
    padding: 0;
    transition: color 0.12s ease;
  }

  .bn-mark-all:hover { color: #374151; }

  [data-theme="dark"] .bn-mark-all:hover,
  [data-theme="classic-dark"] .bn-mark-all:hover {
    color: var(--portal-text, #f4f4f4);
  }

  .bn-tabs {
    display: flex;
    gap: 4px;
    padding: 8px 12px;
    border-bottom: 1px solid #f3f4f6;
    overflow-x: auto;
    scrollbar-width: none;
    flex-shrink: 0;
  }

  .bn-tabs::-webkit-scrollbar { display: none; }

  [data-theme="dark"] .bn-tabs,
  [data-theme="classic-dark"] .bn-tabs {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .bn-tab {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    border: none;
    cursor: pointer;
    background: transparent;
    color: #6b7280;
    transition: background 0.12s ease, color 0.12s ease;
    font-family: inherit;
  }

  .bn-tab:hover { background: #f3f4f6; }

  [data-theme="dark"] .bn-tab:hover,
  [data-theme="classic-dark"] .bn-tab:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .bn-tab.on {
    background: #111827;
    color: #fff;
  }

  [data-theme="dark"] .bn-tab.on,
  [data-theme="classic-dark"] .bn-tab.on {
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
  }

  .bn-rows {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  .bn-empty-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 7px;
    color: #9ca3af;
    padding: 52px 24px 24px;
  }

  .bn-empty-title {
    font-size: 14px;
    font-weight: 400;
    color: #52525b;
    margin: 6px 0 0;
  }

  .bn-empty-sub {
    font-size: 13px;
    line-height: 1.55;
    color: #9ca3af;
    max-width: 320px;
    margin: 0;
    font-weight: 400;
  }

  .bn-empty-visual {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    color: #9ca3af;
    margin-bottom: 20px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }

  .bn-empty-visual--sm {
    width: 56px;
    height: 56px;
    margin-bottom: 14px;
  }

  [data-theme="dark"] .bn-empty-visual,
  [data-theme="classic-dark"] .bn-empty-visual {
    background: rgba(255, 255, 255, 0.07);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .bn-detail-empty {
    align-items: center;
    justify-content: center;
  }

  .bn-empty-detail {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 32px 40px;
    max-width: 400px;
  }

  .bn-empty-detail .bn-empty-title {
    font-size: 17px;
    font-weight: 400;
    color: #111827;
    margin: 0 0 8px;
  }

  [data-theme="dark"] .bn-empty-detail .bn-empty-title,
  [data-theme="classic-dark"] .bn-empty-detail .bn-empty-title {
    color: var(--portal-text, #f4f4f4);
  }

  .bn-empty-detail .bn-empty-sub {
    font-size: 14px;
    line-height: 1.6;
    max-width: 300px;
    margin: 0 0 24px;
  }

  .bn-empty-hints {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    max-width: 320px;
  }

  .bn-empty-hint {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 28px;
    padding: 0 11px;
    border-radius: 999px;
    background: #f3f4f6;
    color: #9ca3af;
    font-size: 11.5px;
    font-weight: 400;
  }

  .bn-empty-hint svg {
    flex-shrink: 0;
    opacity: 0.75;
  }

  [data-theme="dark"] .bn-empty-hint,
  [data-theme="classic-dark"] .bn-empty-hint {
    background: rgba(255, 255, 255, 0.07);
  }

  .bn-row {
    width: 100%;
    text-align: left;
    display: flex;
    gap: 10px;
    padding: 12px 14px;
    border: none;
    border-bottom: 1px solid #f9fafb;
    background: transparent;
    cursor: pointer;
    font: inherit;
    color: inherit;
    transition: background 0.12s ease;
  }

  .bn-row:last-child { border-bottom: 0; }
  .bn-row:hover { background: #f9fafb; }
  .bn-row.on { background: #f3f4f6; }

  [data-theme="dark"] .bn-row:hover,
  [data-theme="classic-dark"] .bn-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  [data-theme="dark"] .bn-row.on,
  [data-theme="classic-dark"] .bn-row.on {
    background: rgba(255, 255, 255, 0.07);
  }

  .bn-dot-wrap {
    flex-shrink: 0;
    margin-top: 5px;
  }

  .bn-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: transparent;
    transition: background 0.12s ease;
  }

  .bn-dot.unread { background: #1f2937; }

  [data-theme="dark"] .bn-dot.unread,
  [data-theme="classic-dark"] .bn-dot.unread {
    background: #e5e7eb;
  }

  .bn-row-body {
    flex: 1 1 auto;
    min-width: 0;
  }

  .bn-row-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .bn-row-title {
    font-size: 12.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bn-row-title.unread {
    font-weight: 500;
    color: #111827;
  }

  .bn-row-title.read {
    font-weight: 400;
    color: #6b7280;
  }

  [data-theme="dark"] .bn-row-title.unread,
  [data-theme="classic-dark"] .bn-row-title.unread {
    color: var(--portal-text, #f4f4f4);
  }

  .bn-row-time {
    font-size: 10.5px;
    color: #9ca3af;
    flex-shrink: 0;
  }

  .bn-row-preview {
    margin: 2px 0 0;
    font-size: 11.5px;
    color: #9ca3af;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bn-row-tag {
    display: inline-block;
    margin-top: 4px;
    font-size: 10px;
    color: #9ca3af;
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 6px;
  }

  [data-theme="dark"] .bn-row-tag,
  [data-theme="classic-dark"] .bn-row-tag {
    background: rgba(255, 255, 255, 0.07);
  }

  .bn-detail {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .bn-detail-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #f3f4f6;
    flex-shrink: 0;
  }

  [data-theme="dark"] .bn-detail-head,
  [data-theme="classic-dark"] .bn-detail-head {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .bn-detail-kicker {
    margin: 0 0 4px;
    font-size: 11px;
    color: #9ca3af;
  }

  .bn-detail-title {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    color: #111827;
    line-height: 1.35;
  }

  [data-theme="dark"] .bn-detail-title,
  [data-theme="classic-dark"] .bn-detail-title {
    color: var(--portal-text, #f4f4f4);
  }

  .bn-detail-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }

  .bn-detail-tag {
    font-size: 10px;
    color: #9ca3af;
    background: #f3f4f6;
    padding: 2px 8px;
    border-radius: 6px;
  }

  [data-theme="dark"] .bn-detail-tag,
  [data-theme="classic-dark"] .bn-detail-tag {
    background: rgba(255, 255, 255, 0.07);
  }

  .bn-detail-date {
    font-size: 10.5px;
    color: #9ca3af;
  }

  .bn-close {
    padding: 6px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    color: #9ca3af;
    flex-shrink: 0;
    margin-left: 16px;
    display: inline-flex;
    transition: background 0.12s ease;
  }

  .bn-close:hover { background: #f3f4f6; }

  .bn-detail-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .bn-block {
    border-radius: 12px;
    padding: 16px;
  }

  .bn-block.muted {
    background: #f9fafb;
  }

  [data-theme="dark"] .bn-block.muted,
  [data-theme="classic-dark"] .bn-block.muted {
    background: rgba(255, 255, 255, 0.04);
  }

  .bn-block.outline {
    border: 1px solid #f3f4f6;
    background: transparent;
  }

  [data-theme="dark"] .bn-block.outline,
  [data-theme="classic-dark"] .bn-block.outline {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .bn-block-label {
    margin: 0 0 8px;
    font-size: 10px;
    font-weight: 500;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .bn-block-label-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }

  .bn-tagro-dot {
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: #22c55e;
    flex-shrink: 0;
  }

  .bn-block-text {
    margin: 0;
    font-size: 13px;
    color: #1f2937;
    line-height: 1.6;
  }

  [data-theme="dark"] .bn-block-text,
  [data-theme="classic-dark"] .bn-block-text {
    color: var(--portal-text, #e5e7eb);
  }

  .bn-block-text.tagro {
    font-size: 12.5px;
    color: #6b7280;
    font-style: italic;
  }

  .bn-hint {
    margin: 0;
    font-size: 11px;
    color: #9ca3af;
    padding: 0 4px;
  }

  .bn-doc-pdf {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 14px;
    border: 1px solid #e5e7eb;
    border-radius: 32px;
    background: #fff;
    color: #111;
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
  }
  .bn-doc-pdf:disabled { opacity: 0.55; cursor: not-allowed; }

  .bn-composer {
    border-top: 1px solid #f3f4f6;
    padding: 12px;
    flex-shrink: 0;
  }

  [data-theme="dark"] .bn-composer,
  [data-theme="classic-dark"] .bn-composer {
    border-top-color: rgba(255, 255, 255, 0.08);
  }

  .bn-composer-box {
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    overflow: hidden;
  }

  [data-theme="dark"] .bn-composer-box,
  [data-theme="classic-dark"] .bn-composer-box {
    border-color: rgba(255, 255, 255, 0.12);
  }

  .bn-composer-input {
    width: 100%;
    padding: 12px 16px 4px;
    font-size: 13px;
    color: #111827;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    font-family: inherit;
    box-sizing: border-box;
  }

  .bn-composer-input::placeholder { color: #9ca3af; }

  [data-theme="dark"] .bn-composer-input,
  [data-theme="classic-dark"] .bn-composer-input {
    color: var(--portal-text, #f4f4f4);
  }

  .bn-composer-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 12px 10px;
  }

  .bn-composer-note {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10.5px;
    color: #9ca3af;
  }

  .bn-send {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    border: none;
    background: #111827;
    color: #fff;
    font: inherit;
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s ease, opacity 0.12s ease;
  }

  .bn-send:hover:not(:disabled) { background: #374151; }
  .bn-send:disabled { opacity: 0.4; cursor: not-allowed; }

  @media (max-width: 768px) {
    .bn-root {
      flex-direction: column;
      border-radius: 0;
      border: 0;
      box-shadow: none;
    }

    .bn-list {
      width: 100%;
      border-right: 0;
      max-height: 45vh;
    }

    .bn-detail { min-height: 40vh; }
  }
`
