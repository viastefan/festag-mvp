/**
 * Vercel-inspired mobile Projects home — header, search row, Recents card,
 * project cards, floating Find | Menü bar.
 */

export const PROJECTS_MOBILE_HOME_CSS = `
  .pmh {
    display: none;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    box-sizing: border-box;
    background: #fafafa;
    color: #171717;
    font-family: var(--font-aeonik-face, var(--font-aeonik), 'Aeonik', system-ui, sans-serif);
    -webkit-font-smoothing: antialiased;
  }

  @media (max-width: 768px) {
    .pmh {
      display: flex !important;
    }
  }

  html[data-theme="dark"] .pmh,
  html[data-theme="classic-dark"] .pmh {
    background: var(--festag-black-canvas, #000);
    color: rgba(245, 245, 247, 0.92);
  }

  .pmh-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: calc(12px + env(safe-area-inset-top, 0px)) 16px calc(96px + env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
  }

  /* ── Top bar: centered app selector + grid menu ── */
  .pmh-top {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    min-height: 36px;
  }
  .pmh-top-spacer { min-width: 0; }
  .pmh-app {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin: 0 auto;
    padding: 6px 10px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.01em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .pmh-app:active { opacity: 0.72; }
  .pmh-app-mark {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #00c389;
    flex-shrink: 0;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
  }
  .pmh-app-name {
    max-width: 46vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pmh-app-caret {
    color: #8a8f98;
    flex-shrink: 0;
  }
  .pmh-grid {
    justify-self: end;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #171717;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .pmh-grid:active { opacity: 0.7; }
  html[data-theme="dark"] .pmh-grid,
  html[data-theme="classic-dark"] .pmh-grid {
    color: rgba(245, 245, 247, 0.88);
  }

  /* ── Search + filter + add ── */
  .pmh-tools {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }
  .pmh-search {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.10);
    background: #fff;
    box-sizing: border-box;
  }
  html[data-theme="dark"] .pmh-search,
  html[data-theme="classic-dark"] .pmh-search {
    background: var(--festag-black-content, #0c0c0e);
    border-color: rgba(255, 255, 255, 0.10);
  }
  .pmh-search-icon {
    color: #8a8f98;
    flex-shrink: 0;
  }
  .pmh-search-input {
    flex: 1 1 auto;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 15px;
    letter-spacing: -0.01em;
  }
  .pmh-search-input::placeholder {
    color: #8a8f98;
  }
  .pmh-icon-btn {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.10);
    background: #fff;
    color: #171717;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .pmh-icon-btn.on,
  .pmh-icon-btn.has-active {
    border-color: rgba(0, 0, 0, 0.18);
    background: #f4f4f5;
  }
  .pmh-icon-btn--add {
    background: #171717;
    border-color: #171717;
    color: #fff;
  }
  .pmh-icon-btn--add:active {
    transform: scale(0.97);
  }
  html[data-theme="dark"] .pmh-icon-btn,
  html[data-theme="classic-dark"] .pmh-icon-btn {
    background: var(--festag-black-content, #0c0c0e);
    border-color: rgba(255, 255, 255, 0.10);
    color: rgba(245, 245, 247, 0.88);
  }
  html[data-theme="dark"] .pmh-icon-btn--add,
  html[data-theme="classic-dark"] .pmh-icon-btn--add {
    background: #fff;
    border-color: #fff;
    color: #171717;
  }

  /* ── Recents card ── */
  .pmh-recents {
    position: relative;
    margin-bottom: 28px;
    border-radius: 14px;
    border: 1px solid rgba(0, 0, 0, 0.10);
    background: #fff;
    overflow: visible;
  }
  html[data-theme="dark"] .pmh-recents,
  html[data-theme="classic-dark"] .pmh-recents {
    background: var(--festag-black-content, #0c0c0e);
    border-color: rgba(255, 255, 255, 0.10);
  }
  .pmh-tabs {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 10px 10px 0;
  }
  .pmh-tab {
    height: 30px;
    padding: 0 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #666;
    font: inherit;
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: -0.01em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .pmh-tab.on {
    background: #f2f2f3;
    color: #171717;
  }
  html[data-theme="dark"] .pmh-tab.on,
  html[data-theme="classic-dark"] .pmh-tab.on {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(245, 245, 247, 0.92);
  }
  .pmh-recent-list {
    display: flex;
    flex-direction: column;
    padding: 6px 0 18px;
  }
  .pmh-recent-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    text-decoration: none;
    color: inherit;
    -webkit-tap-highlight-color: transparent;
  }
  .pmh-recent-row:active {
    background: rgba(0, 0, 0, 0.03);
  }
  .pmh-recent-avatars {
    position: relative;
    width: 34px;
    height: 28px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .pmh-recent-av {
    position: absolute;
    top: 0;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid #fff;
    background: #e8eaed;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: 10px;
    font-weight: 600;
    color: #555;
  }
  html[data-theme="dark"] .pmh-recent-av,
  html[data-theme="classic-dark"] .pmh-recent-av {
    border-color: var(--festag-black-content, #0c0c0e);
    background: rgba(255, 255, 255, 0.12);
    color: rgba(245, 245, 247, 0.8);
  }
  .pmh-recent-av:nth-child(1) { left: 0; z-index: 2; }
  .pmh-recent-av:nth-child(2) { left: 12px; z-index: 1; }
  .pmh-recent-av img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .pmh-recent-body {
    flex: 1 1 auto;
    min-width: 0;
  }
  .pmh-recent-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pmh-recent-title {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 14.5px;
    font-weight: 500;
    letter-spacing: -0.015em;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pmh-recent-more {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #8a8f98;
    cursor: pointer;
  }
  .pmh-recent-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
  }
  .pmh-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #fafafa;
    color: #555;
    font-size: 11.5px;
    font-weight: 500;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }
  html[data-theme="dark"] .pmh-chip,
  html[data-theme="classic-dark"] .pmh-chip {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.10);
    color: rgba(245, 245, 247, 0.65);
  }
  .pmh-chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .pmh-recent-empty {
    padding: 18px 14px 8px;
    color: #8a8f98;
    font-size: 13.5px;
  }
  .pmh-expand {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translate(-50%, 50%);
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.10);
    background: #fff;
    color: #555;
    cursor: pointer;
    z-index: 2;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  html[data-theme="dark"] .pmh-expand,
  html[data-theme="classic-dark"] .pmh-expand {
    background: var(--festag-black-popup, #121214);
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(245, 245, 247, 0.7);
  }

  /* ── Projects section ── */
  .pmh-section-title {
    margin: 8px 2px 12px;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.025em;
    line-height: 1.2;
  }
  .pmh-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .pmh-card {
    display: block;
    padding: 14px 14px 12px;
    border-radius: 14px;
    border: 1px solid rgba(0, 0, 0, 0.10);
    background: #fff;
    text-decoration: none;
    color: inherit;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }
  .pmh-card:active {
    background: #fafafa;
  }
  html[data-theme="dark"] .pmh-card,
  html[data-theme="classic-dark"] .pmh-card {
    background: var(--festag-black-content, #0c0c0e);
    border-color: rgba(255, 255, 255, 0.10);
  }
  html[data-theme="dark"] .pmh-card:active,
  html[data-theme="classic-dark"] .pmh-card:active {
    background: rgba(255, 255, 255, 0.04);
  }
  .pmh-card-top {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .pmh-card-logo {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    letter-spacing: -0.02em;
  }
  .pmh-card-identity {
    flex: 1 1 auto;
    min-width: 0;
  }
  .pmh-card-name {
    display: block;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pmh-card-host {
    display: block;
    margin-top: 2px;
    font-size: 12.5px;
    color: #8a8f98;
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pmh-card-aside {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .pmh-status-ring {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #0070f3;
  }
  .pmh-card-more {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #8a8f98;
    cursor: pointer;
  }
  .pmh-card-commit {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    font-size: 13px;
    color: #444;
    letter-spacing: -0.01em;
  }
  html[data-theme="dark"] .pmh-card-commit,
  html[data-theme="classic-dark"] .pmh-card-commit {
    color: rgba(245, 245, 247, 0.7);
  }
  .pmh-card-commit-icon {
    color: #8a8f98;
    flex-shrink: 0;
  }
  .pmh-card-commit-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pmh-card-foot {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    font-size: 12.5px;
    color: #8a8f98;
  }
  .pmh-card-foot-left {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
  }
  .pmh-card-foot-left span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pmh-card-time {
    flex-shrink: 0;
  }
  .pmh-empty {
    padding: 28px 8px;
    text-align: center;
    color: #8a8f98;
    font-size: 14px;
  }

  /* ── Filter sheet backdrop ── */
  .pmh-sheet-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    border: none;
    background: rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .pmh-sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 61;
    padding: 10px 16px calc(18px + env(safe-area-inset-bottom, 0px));
    border-radius: 18px 18px 0 0;
    background: #fff;
    box-shadow: 0 -8px 32px rgba(24, 24, 27, 0.12);
  }
  html[data-theme="dark"] .pmh-sheet,
  html[data-theme="classic-dark"] .pmh-sheet {
    background: var(--festag-black-popup, #121214);
  }
  .pmh-sheet-grip {
    width: 40px;
    height: 4px;
    margin: 0 auto 14px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.12);
  }
  html[data-theme="dark"] .pmh-sheet-grip,
  html[data-theme="classic-dark"] .pmh-sheet-grip {
    background: rgba(255, 255, 255, 0.16);
  }
  .pmh-sheet-title {
    margin: 0 0 10px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .pmh-sheet-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 48px;
    padding: 0 4px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 15px;
    text-align: left;
    cursor: pointer;
  }
  .pmh-sheet-item.on {
    font-weight: 500;
  }
  .pmh-sheet-check {
    color: #0070f3;
  }

  /* Row menu */
  .pmh-row-menu {
    position: absolute;
    right: 8px;
    top: 36px;
    z-index: 5;
    min-width: 220px;
    padding: 6px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #fff;
    box-shadow: 0 8px 28px rgba(24, 24, 27, 0.14);
  }
  html[data-theme="dark"] .pmh-row-menu,
  html[data-theme="classic-dark"] .pmh-row-menu {
    background: var(--festag-black-popup, #121214);
    border-color: rgba(255, 255, 255, 0.10);
  }
  .pmh-row-menu button {
    display: block;
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }
  .pmh-row-menu button:active {
    background: rgba(0, 0, 0, 0.04);
  }
  .pmh-card-wrap {
    position: relative;
  }

  /* ── Floating Find | Menü ── */
  .pmh-findbar {
    position: fixed;
    left: 50%;
    bottom: calc(18px + env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    z-index: 50;
    display: inline-flex;
    align-items: center;
    gap: 0;
    height: 44px;
    padding: 0 6px 0 14px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #fff;
    box-shadow:
      0 1px 2px rgba(24, 24, 27, 0.04),
      0 8px 24px rgba(24, 24, 27, 0.10);
  }
  html[data-theme="dark"] .pmh-findbar,
  html[data-theme="classic-dark"] .pmh-findbar {
    background: var(--festag-black-popup, #121214);
    border-color: rgba(255, 255, 255, 0.10);
  }
  .pmh-find-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 10px 0 2px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: #171717;
    font: inherit;
    font-size: 14.5px;
    font-weight: 500;
    letter-spacing: -0.01em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  html[data-theme="dark"] .pmh-find-btn,
  html[data-theme="classic-dark"] .pmh-find-btn {
    color: rgba(245, 245, 247, 0.92);
  }
  .pmh-find-sep {
    width: 1px;
    height: 18px;
    background: rgba(0, 0, 0, 0.10);
    flex-shrink: 0;
  }
  html[data-theme="dark"] .pmh-find-sep,
  html[data-theme="classic-dark"] .pmh-find-sep {
    background: rgba(255, 255, 255, 0.12);
  }
  .pmh-find-menu {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 36px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: #171717;
    cursor: pointer;
  }
  html[data-theme="dark"] .pmh-find-menu,
  html[data-theme="classic-dark"] .pmh-find-menu {
    color: rgba(245, 245, 247, 0.92);
  }
`
