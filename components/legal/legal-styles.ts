/** Festag legal pages — editorial article layout (always-light white reading surface). */

export const LEGAL_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }

  html:has(.legal-root),
  body:has(.legal-root) {
    background: #ffffff !important;
    color-scheme: light;
  }

  .legal-root {
    min-height: 100dvh;
    background: #ffffff;
    color: #1e1e20;
    color-scheme: light;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-weight: 400;
    letter-spacing: -0.011em;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
    --legal-bg: #ffffff;
    --legal-bg-soft: #f5f5f7;
    --legal-surface: #ffffff;
    --legal-text: #1e1e20;
    --legal-text-secondary: #3a3a3e;
    --legal-text-muted: #86868b;
    --legal-link: #1e1e20;
    --legal-hover: rgba(15, 23, 42, 0.045);
    --legal-measure: 65ch;
  }

  /* ── Header: wordmark + transparent icon actions ────────────── */
  .legal-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: color-mix(in srgb, #ffffff 86%, transparent);
    backdrop-filter: blur(16px) saturate(150%);
    -webkit-backdrop-filter: blur(16px) saturate(150%);
    padding: max(10px, env(safe-area-inset-top)) clamp(16px, 4vw, 36px) 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .legal-wordmark {
    flex-shrink: 0;
    font-family: inherit;
    font-size: 22px;
    font-weight: 400;
    letter-spacing: -0.028em;
    line-height: 1.2;
    color: var(--legal-text);
    text-decoration: none;
    max-width: min(52vw, 280px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 4px 0;
    transition: opacity .15s ease;
  }
  .legal-wordmark:hover { opacity: 0.72; }

  .legal-nav-right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .legal-menu-wrap {
    position: relative;
    flex-shrink: 0;
  }
  .legal-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    padding: 0;
    margin: 0;
    border: 0 !important;
    border-radius: 999px;
    background: transparent;
    color: #6e6e73;
    cursor: pointer;
    box-shadow: none;
    outline: none;
    flex-shrink: 0;
    line-height: 0;
    transition: color .15s ease, background .15s ease;
  }
  .legal-icon-btn svg {
    display: block;
    width: 20px;
    height: 20px;
  }
  .legal-icon-btn:hover,
  .legal-icon-btn:focus-visible,
  .legal-icon-btn[aria-expanded="true"] {
    color: #1e1e20;
    background: var(--legal-hover);
  }

  .legal-menu-pop {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    z-index: 60;
    min-width: 188px;
    width: max-content;
    max-width: min(260px, calc(100vw - 32px));
    padding: 8px;
    border-radius: 16px;
    border: none;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(18px) saturate(155%);
    -webkit-backdrop-filter: blur(18px) saturate(155%);
    box-shadow:
      0 16px 40px rgba(15, 23, 42, 0.1),
      0 2px 8px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
    gap: 2px;
    opacity: 0;
    transform: translateY(6px) scale(0.98);
    transform-origin: top right;
    pointer-events: none;
    transition: opacity .2s ease, transform .2s cubic-bezier(.16,1,.3,1);
  }
  .legal-menu-pop.is-visible {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
  .legal-menu-pop a {
    display: block;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: -0.012em;
    color: var(--legal-text-secondary);
    text-decoration: none;
    white-space: nowrap;
    transition: background .12s ease, color .12s ease;
  }
  .legal-menu-pop a:hover {
    background: var(--legal-hover);
    color: var(--legal-text);
  }
  .legal-menu-pop a[aria-current="page"] {
    color: var(--legal-text);
    background: var(--legal-hover);
  }

  /* ── Article column (centered editorial measure) ────────────── */
  .legal-shell {
    width: 100%;
    max-width: 920px;
    margin: 0 auto;
    padding:
      clamp(40px, 8vw, 72px)
      clamp(20px, 5vw, 28px)
      clamp(64px, 10vw, 112px);
  }

  .legal-doc.has-toc {
    display: block;
  }
  .legal-article {
    min-width: 0;
    max-width: var(--legal-measure);
    margin: 0 auto;
  }

  .legal-head {
    margin: 0 0 clamp(40px, 7vw, 64px);
    text-align: left;
  }
  /* Aeonik Regular only — beat global h1 Medium (500) */
  .legal-root h1,
  .legal-root .legal-title,
  .legal-root h1.legal-title {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: clamp(32px, 4.2vw, 44px) !important;
    font-weight: 400 !important;
    line-height: 1.14;
    letter-spacing: -0.028em;
    color: var(--legal-text);
  }

  /* Quiet left TOC — desktop only; no mobile pill strip */
  .legal-toc-wrap {
    display: none;
  }
  .legal-toc-link {
    display: block;
    padding: 7px 0;
    color: var(--legal-text-muted);
    text-decoration: none;
    font-size: 13px;
    line-height: 1.4;
    font-weight: 400;
    letter-spacing: -0.01em;
    transition: color .12s ease;
  }
  .legal-toc-link:hover,
  .legal-toc-link.active {
    color: var(--legal-text);
  }

  .legal h2 {
    scroll-margin-top: 88px;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 20px;
    font-weight: 400;
    line-height: 1.32;
    letter-spacing: -0.02em;
    margin: 0;
    padding-top: clamp(44px, 6.5vw, 60px);
    color: var(--legal-text);
  }
  .legal h2:first-of-type { padding-top: 0; }
  .legal h2 + p,
  .legal h2 + ul,
  .legal h2 + ol,
  .legal h2 + div { margin-top: 22px; }
  .legal h3 {
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.38;
    letter-spacing: -0.015em;
    margin: 36px 0 16px;
    color: var(--legal-text);
  }
  .legal h3 + p,
  .legal h3 + ul,
  .legal h3 + ol { margin-top: 0; }
  .legal p, .legal li {
    font-size: 16px;
    line-height: 1.75;
    font-weight: 400;
    letter-spacing: -0.006em;
    color: var(--legal-text-secondary);
  }
  .legal p { margin: 0 0 18px; }
  .legal ul, .legal ol {
    padding-left: 1.35em;
    margin: 12px 0 22px;
  }
  .legal li { margin: 8px 0; }
  .legal li::marker { color: var(--legal-text-muted); }
  .legal strong {
    color: var(--legal-text);
    font-weight: 400;
  }
  .legal a {
    color: var(--legal-link);
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 1px;
    text-decoration-color: color-mix(in srgb, var(--legal-link) 28%, transparent);
    transition: text-decoration-color .15s ease;
  }
  .legal a:hover {
    text-decoration-color: var(--legal-link);
  }
  .legal code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.86em;
    padding: 2px 7px;
    border-radius: 6px;
    background: var(--legal-bg-soft);
    border: none;
    font-weight: 400;
  }
  .legal hr {
    display: none;
  }

  .legal-box {
    background: var(--legal-bg-soft);
    border: none;
    border-radius: 18px;
    padding: 22px 24px;
    margin: 22px 0 28px;
  }
  .legal-box p { margin: 0; }
  .legal-note {
    font-size: 14px;
    line-height: 1.65;
    color: var(--legal-text-muted);
    margin-top: 14px;
    letter-spacing: -0.004em;
  }
  .legal-stand {
    margin: 56px 0 0;
    padding-top: 0;
    font-size: 13px;
    line-height: 1.55;
    font-weight: 400;
    color: var(--legal-text-muted);
    letter-spacing: -0.004em;
  }

  /* ── Footer ─────────────────────────────────────────────────── */
  .legal-footer {
    padding:
      48px clamp(18px, 4vw, 40px)
      max(36px, env(safe-area-inset-bottom));
    text-align: center;
    color: var(--legal-text-muted);
    font-size: 13px;
    font-weight: 400;
    letter-spacing: -0.01em;
  }
  .legal-footer-brand {
    margin: 0 0 20px;
    font-size: 15px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--legal-text);
  }
  .legal-footer-links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0 0 28px;
  }
  .legal-footer-links a {
    color: var(--legal-text-muted);
    text-decoration: none;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: -0.01em;
    padding: 7px 12px;
    border-radius: 999px;
    background: transparent;
    transition: color .15s ease, background .15s ease;
  }
  .legal-footer-links a:hover {
    color: var(--legal-text);
    background: var(--legal-bg-soft);
  }
  .legal-footer-links a[aria-current="page"] {
    color: var(--legal-text);
    background: var(--legal-bg-soft);
  }
  .legal-footer-meta {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    font-weight: 400;
    color: var(--legal-text-muted);
  }

  /* ── Mobile dock: TOC sheet + Tagro composer ────────────────── */
  .legal-mdock {
    display: none;
  }

  /*
   * Desktop: TOC inset inside centered shell (not flush to viewport),
   * article in reading measure — same balance as before flush-left.
   */
  @media (min-width: 1100px) {
    .legal-shell {
      max-width: 1120px;
    }
    .legal-doc.has-toc {
      display: grid;
      grid-template-columns: 188px minmax(0, 1fr);
      gap: clamp(36px, 5vw, 56px);
      align-items: start;
      max-width: 100%;
      margin: 0 auto;
    }
    .legal-doc.has-toc .legal-article {
      margin: 0;
      max-width: var(--legal-measure);
      justify-self: center;
      width: 100%;
    }
    .legal-toc-wrap {
      display: block;
      position: sticky;
      top: 88px;
      max-height: calc(100dvh - 108px);
      overflow-y: auto;
      padding-top: 4px;
      scrollbar-width: thin;
    }
    .legal-toc-wrap::-webkit-scrollbar { width: 3px; }
    .legal-toc-wrap::-webkit-scrollbar-thumb {
      background: rgba(15, 23, 42, 0.12);
      border-radius: 999px;
    }
  }

  @media (max-width: 1099px) {
    .legal-doc.has-toc {
      padding-bottom: 96px;
    }
    .legal-mdock {
      display: flex;
      align-items: center;
      gap: 10px;
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      z-index: 60;
      pointer-events: none;
    }
    .legal-mdock > * { pointer-events: auto; }
    .legal-mdock-toc {
      flex-shrink: 0;
      width: 52px;
      height: 52px;
      border: none;
      border-radius: 999px;
      background: #ffffff;
      color: #1e1e20;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow:
        0 10px 28px rgba(15, 23, 42, 0.1),
        0 2px 8px rgba(15, 23, 42, 0.04);
      -webkit-tap-highlight-color: transparent;
    }
    .legal-mdock-toc:active { transform: scale(0.97); }
    .legal-mdock-tagro {
      flex: 1;
      min-width: 0;
      --bg: #ffffff;
      --text: #1e1e20;
      --text-secondary: #4a4a4f;
      --text-muted: #86868b;
      --border: rgba(15, 23, 42, 0.08);
      --surface: #ffffff;
      --surface-2: #f5f5f7;
    }
    .legal-mdock-tagro .tagro-composer { width: 100%; }
    .legal-mdock-tagro .tagro-composer-bar {
      min-height: 52px;
      border-radius: 999px;
      padding: 6px 8px 6px 16px;
      background: rgba(255, 255, 255, 0.96);
      border: none;
      box-shadow:
        0 10px 28px rgba(15, 23, 42, 0.1),
        0 2px 8px rgba(15, 23, 42, 0.04);
    }
    .legal-mdock-tagro .tagro-composer-input {
      font-family: var(--font-aeonik, 'Aeonik'), Inter, sans-serif;
      font-weight: 400;
      font-size: 15px;
      letter-spacing: -0.01em;
      height: 28px;
      padding-top: 2px;
    }
    .legal-mdock-tagro .tagro-composer-send {
      width: 40px;
      height: 40px;
    }

    .legal-toc-sheet {
      position: fixed;
      inset: 0;
      z-index: 70;
      pointer-events: none;
    }
    .legal-toc-sheet.is-visible { pointer-events: auto; }
    .legal-toc-sheet-backdrop {
      position: absolute;
      inset: 0;
      border: 0;
      padding: 0;
      background: rgba(15, 23, 42, 0.28);
      opacity: 0;
      transition: opacity .2s ease;
      cursor: pointer;
    }
    .legal-toc-sheet.is-visible .legal-toc-sheet-backdrop { opacity: 1; }
    .legal-toc-sheet-panel {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      max-height: min(72dvh, 520px);
      padding: 10px 18px calc(20px + env(safe-area-inset-bottom, 0px));
      border-radius: 28px 28px 0 0;
      background: #ffffff;
      box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.12);
      transform: translateY(12px);
      opacity: 0;
      transition: transform .22s cubic-bezier(.16,1,.3,1), opacity .2s ease;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .legal-toc-sheet.is-visible .legal-toc-sheet-panel {
      transform: none;
      opacity: 1;
    }
    .legal-toc-sheet-grip {
      width: 40px;
      height: 4px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.12);
      margin: 4px auto 14px;
      flex-shrink: 0;
    }
    .legal-toc-sheet-title {
      margin: 0 0 10px;
      font-size: 15px;
      font-weight: 400;
      letter-spacing: -0.02em;
      color: #1e1e20;
    }
    .legal-toc-sheet-nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .legal-toc-sheet-link {
      display: block;
      width: 100%;
      text-align: left;
      border: 0;
      background: transparent;
      border-radius: 12px;
      padding: 12px 12px;
      font: inherit;
      font-size: 15px;
      font-weight: 400;
      letter-spacing: -0.01em;
      color: #4a4a4f;
      cursor: pointer;
    }
    .legal-toc-sheet-link:hover,
    .legal-toc-sheet-link.active {
      color: #1e1e20;
      background: #f5f5f7;
    }
  }

  @media (max-width: 720px) {
    .legal-nav {
      gap: 12px;
    }
    .legal-wordmark { font-size: 20px; max-width: calc(100% - 96px); }
    .legal-shell {
      padding-top: 32px;
      padding-bottom: 72px;
    }
    .legal-title {
      font-size: 32px !important;
      letter-spacing: -0.026em;
    }
    .legal p, .legal li {
      font-size: 15.5px;
      letter-spacing: -0.005em;
    }
    .legal h2 { font-size: 18px; }
    .legal-footer-links { gap: 6px; }
  }
`
