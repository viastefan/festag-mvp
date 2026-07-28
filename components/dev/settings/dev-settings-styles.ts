/** Dedicated Settings workspace chrome for /dev/settings. */
export const DEV_SETTINGS_CSS = `
  .ds-root {
    --ds-rail-w: 268px;
    --ds-pad-x: 40px;
    --ds-pad-y: 32px;
    /* Light — settled Execution Settings look (match --dv-* light). */
    --ds-line: var(--dv-line, #e6e6e8);
    --ds-line-soft: var(--dv-line-soft, #eeeef0);
    --ds-text: var(--dv-text, #1e1e20);
    --ds-text-2: var(--dv-text-2, #5c5c62);
    --ds-text-3: var(--dv-text-3, #8e8e93);
    --ds-hover: var(--dv-hover, #ededee);
    --ds-active: var(--dv-active, #e4e4e6);
    --ds-surface: var(--dv-surface, #ffffff);
    --ds-canvas: var(--dv-canvas, #fbfbfb);
    --ds-r: var(--dv-r, 12px);
    --ds-r-sm: var(--dv-r-sm, 8px);
    --ds-fast: 140ms;
    --ds-ease: cubic-bezier(0.16, 1, 0.3, 1);

    position: fixed;
    inset: 0;
    display: grid;
    grid-template-columns: var(--ds-rail-w) minmax(0, 1fr);
    background: var(--ds-canvas);
    color: var(--ds-text);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    z-index: 40;
  }

  html[data-theme='dark'] .ds-root,
  html[data-theme='classic-dark'] .ds-root {
    --ds-line: var(--festag-night-line, rgba(255,255,255,0.065));
    --ds-line-soft: rgba(255,255,255,0.045);
    --ds-text: var(--festag-night-ink, #E8EAF0);
    --ds-text-2: var(--festag-night-ink-2, rgba(228,228,234,0.58));
    --ds-text-3: var(--festag-night-ink-3, rgba(228,228,234,0.40));
    --ds-hover: var(--festag-night-fill, rgba(255,255,255,0.055));
    --ds-active: var(--festag-night-fill-hover, rgba(255,255,255,0.075));
    --ds-surface: var(--festag-black-content, #0E0E10);
    --ds-canvas: var(--festag-black-canvas, #070708);
  }

  /* Mobile-only overlay — must not participate in the desktop 2-col grid. */
  .ds-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 45;
    border: 0;
    padding: 0;
    background: rgba(0,0,0,0.35);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .ds-rail {
    grid-column: 1;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid var(--ds-line-soft);
    background: var(--ds-canvas);
    padding: 14px 12px 16px;
  }
  html[data-theme='dark'] .ds-rail,
  html[data-theme='classic-dark'] .ds-rail {
    /* ChatGPT/OpenAI dark: no hairline between rail and content. */
    border-right: 0;
  }
  .ds-rail-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding: 0 4px;
  }
  .ds-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 10px 0 8px;
    border: 0;
    border-radius: var(--ds-r-sm);
    background: transparent;
    color: var(--ds-text-2);
    font: inherit;
    font-size: 13px;
    text-decoration: none;
    cursor: pointer;
    transition: background var(--ds-fast) var(--ds-ease), color var(--ds-fast) var(--ds-ease);
  }
  .ds-back:hover { background: var(--ds-hover); color: var(--ds-text); }
  .ds-rail-title {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--ds-text);
    letter-spacing: -0.01em;
  }

  .ds-search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    margin: 0 2px 14px;
    padding: 0 11px;
    border: 1px solid var(--ds-line);
    border-radius: var(--ds-r-sm);
    background: transparent;
    transition: border-color var(--ds-fast) ease;
  }
  .ds-search:focus-within { border-color: var(--dv-blue, #4b82f0); }
  .ds-search svg { color: var(--ds-text-3); flex: 0 0 auto; }
  .ds-search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--ds-text);
    font: inherit;
    font-size: 13px;
  }
  .ds-search input::placeholder { color: var(--ds-text-3); }
  .ds-search-kbd {
    font-size: 10.5px;
    color: var(--ds-text-3);
    border: 1px solid var(--ds-line-soft);
    border-radius: 5px;
    padding: 1px 5px;
  }

  .ds-rail-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-bottom: 8px;
  }
  .ds-rail-scroll::-webkit-scrollbar { display: none; }

  .ds-recent-label,
  .ds-group-label {
    margin: 0;
    padding: 0 10px 6px;
    font-size: 11.5px;
    font-weight: 500;
    color: var(--ds-text-3);
  }
  .ds-group-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 0 10px 6px;
    border: 0;
    background: transparent;
    cursor: pointer;
    font: inherit;
    text-align: left;
  }
  .ds-group-toggle .ds-group-label { padding: 0; }
  .ds-group-caret {
    color: var(--ds-text-3);
    transition: transform var(--ds-fast) var(--ds-ease);
  }
  .ds-group-caret.is-collapsed { transform: rotate(-90deg); }
  .ds-group-rows {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .ds-group-rows.is-hidden { display: none; }

  .ds-nav {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 32px;
    padding: 0 10px;
    border-radius: var(--ds-r-sm);
    color: var(--ds-text-2);
    text-decoration: none;
    font-size: 13px;
    font-weight: 400;
    transition: background var(--ds-fast) var(--ds-ease), color var(--ds-fast) var(--ds-ease);
  }
  .ds-nav svg { color: var(--ds-text-3); flex: 0 0 auto; }
  .ds-nav:hover { background: var(--ds-hover); color: var(--ds-text); }
  .ds-nav:hover svg { color: var(--ds-text-2); }
  .ds-nav.is-active {
    background: var(--ds-active);
    color: var(--ds-text);
  }
  .ds-nav.is-active svg { color: var(--ds-text); }
  .ds-nav.is-focused:not(.is-active) {
    box-shadow: inset 0 0 0 1px var(--ds-line);
  }

  .ds-main {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
    min-height: 0;
    overflow: auto;
    background: var(--ds-canvas);
  }
  .ds-main-inner {
    width: min(760px, 100%);
    margin: 0 auto;
    padding: var(--ds-pad-y) var(--ds-pad-x) 80px;
  }
  .ds-crumbs {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 18px;
    font-size: 12.5px;
    color: var(--ds-text-3);
  }
  .ds-crumbs a {
    color: var(--ds-text-3);
    text-decoration: none;
  }
  .ds-crumbs a:hover { color: var(--ds-text-2); }
  .ds-crumbs-sep { opacity: 0.55; }
  .ds-crumbs-current { color: var(--ds-text-2); }

  .ds-page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 28px;
  }
  .ds-page-head h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 500;
    letter-spacing: -0.022em;
    line-height: 1.2;
    color: var(--ds-text);
  }
  .ds-page-desc {
    margin: 8px 0 0;
    max-width: 52ch;
    font-size: 14.5px;
    line-height: 1.55;
    color: var(--ds-text-3);
  }
  .ds-save {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    border-radius: 7px;
    font-size: 12px;
    color: var(--ds-text-3);
    flex-shrink: 0;
  }
  .ds-save.is-saved { color: var(--dv-success, #34c759); }
  .ds-save.is-error { color: var(--dv-error, #ff453a); }

  .ds-section {
    margin-bottom: 28px;
  }
  .ds-section-title {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ds-text);
  }
  .ds-section-card {
    border: 1px solid var(--ds-line-soft);
    border-radius: 14px;
    background: var(--ds-surface);
    overflow: hidden;
  }
  .ds-row {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(140px, 0.8fr);
    gap: 16px;
    align-items: center;
    min-height: 56px;
    padding: 12px 16px;
  }
  .ds-row + .ds-row { border-top: 1px solid var(--ds-line-soft); }
  .ds-row-copy { min-width: 0; }
  .ds-row-title {
    margin: 0;
    font-size: 13.5px;
    font-weight: 500;
    color: var(--ds-text);
  }
  .ds-row-desc {
    margin: 3px 0 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--ds-text-3);
  }
  .ds-row-control {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .ds-toggle {
    position: relative;
    width: 42px;
    height: 26px;
    border: 0;
    border-radius: 999px;
    background: rgba(120,120,128,0.28);
    cursor: pointer;
    transition: background var(--ds-fast) ease;
    flex-shrink: 0;
  }
  .ds-toggle.on { background: var(--dv-blue, #4b82f0); }
  .ds-toggle::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.18);
    transition: transform var(--ds-fast) var(--ds-ease);
  }
  .ds-toggle.on::after { transform: translateX(16px); }

  .ds-input, .ds-select {
    width: 100%;
    max-width: 240px;
    height: 34px;
    padding: 0 11px;
    border: 1px solid var(--ds-line);
    border-radius: var(--ds-r-sm);
    background: transparent;
    color: var(--ds-text);
    font: inherit;
    font-size: 13px;
    outline: none;
  }
  .ds-input:focus, .ds-select:focus { border-color: var(--dv-blue, #4b82f0); }
  .ds-textarea {
    width: 100%;
    min-height: 84px;
    padding: 10px 11px;
    border: 1px solid var(--ds-line);
    border-radius: var(--ds-r-sm);
    background: transparent;
    color: var(--ds-text);
    font: inherit;
    font-size: 13px;
    line-height: 1.5;
    resize: none;
    field-sizing: content;
    max-block-size: 220px;
    outline: none;
  }
  .ds-textarea:focus { border-color: var(--dv-blue, #4b82f0); }

  .ds-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--ds-line);
    border-radius: var(--ds-r-sm);
    background: transparent;
    color: var(--ds-text-2);
    font: inherit;
    font-size: 12.5px;
    text-decoration: none;
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--ds-fast) ease, color var(--ds-fast) ease;
  }
  .ds-btn:hover { background: var(--ds-hover); color: var(--ds-text); }
  .ds-btn-primary {
    background: var(--ds-text);
    color: var(--ds-canvas);
    border-color: transparent;
  }
  html[data-theme='dark'] .ds-btn-primary,
  html[data-theme='classic-dark'] .ds-btn-primary {
    background: #fff;
    color: #111;
  }
  .ds-btn-primary:hover { opacity: 0.92; }

  .ds-seg {
    display: inline-flex;
    border: 1px solid var(--ds-line);
    border-radius: var(--ds-r-sm);
    overflow: hidden;
  }
  .ds-seg button {
    height: 32px;
    padding: 0 12px;
    border: 0;
    border-right: 1px solid var(--ds-line-soft);
    background: transparent;
    color: var(--ds-text-3);
    font: inherit;
    font-size: 12.5px;
    cursor: pointer;
  }
  .ds-seg button:last-child { border-right: 0; }
  .ds-seg button.on {
    background: var(--ds-active);
    color: var(--ds-text);
  }

  .ds-soon {
    margin: 0;
    padding: 14px 16px;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--ds-text-3);
    border-top: 1px solid var(--ds-line-soft);
  }
  .ds-hint {
    margin: 0 0 10px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ds-text-3);
  }
  .ds-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px 0 10px;
  }
  .ds-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid var(--ds-line);
    background: transparent;
    color: var(--ds-text-2);
    font-size: 12px;
  }
  .ds-chip button {
    border: 0;
    background: transparent;
    color: var(--ds-text-3);
    cursor: pointer;
    display: inline-flex;
    padding: 0;
  }

  .ds-empty-search {
    padding: 18px 10px;
    font-size: 13px;
    color: var(--ds-text-3);
  }

  @media (max-width: 900px) {
    .ds-root {
      grid-template-columns: 1fr;
      --ds-pad-x: 20px;
      --ds-pad-y: 20px;
    }
    .ds-rail {
      position: fixed;
      inset: 0 auto 0 0;
      width: min(300px, 86vw);
      z-index: 50;
      transform: translateX(-105%);
      transition: transform 200ms var(--ds-ease);
      background: var(--ds-surface);
      border-right: 1px solid var(--ds-line);
      box-shadow: 24px 0 48px rgba(0,0,0,0.18);
    }
    .ds-root.is-nav-open .ds-rail { transform: translateX(0); }
    .ds-root.is-nav-open .ds-backdrop { display: block; }
    .ds-rail,
    .ds-main {
      grid-column: 1;
      grid-row: auto;
    }
    .ds-mobile-bar {
      display: flex !important;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--ds-line-soft);
      position: sticky;
      top: 0;
      background: var(--ds-canvas);
      z-index: 5;
    }
    .ds-page-head h1 { font-size: 24px; }
    .ds-row {
      grid-template-columns: 1fr;
      gap: 10px;
      padding: 14px;
    }
    .ds-row-control { justify-content: flex-start; }
    .ds-input, .ds-select { max-width: none; }
  }

  .ds-mobile-bar { display: none; }
`
