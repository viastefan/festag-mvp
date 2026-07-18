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
    color: #1d1d1f;
    color-scheme: light;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-weight: 400;
    letter-spacing: -0.011em;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
    --legal-bg: #ffffff;
    --legal-bg-soft: #f5f5f7;
    --legal-surface: #ffffff;
    --legal-text: #1d1d1f;
    --legal-text-secondary: #1d1d1f;
    --legal-text-muted: #6e6e73;
    --legal-text-faint: #86868b;
    --legal-link: #1d1d1f;
    --legal-hover: rgba(29, 29, 31, 0.05);
    --legal-edge: rgba(29, 29, 31, 0.08);
    --legal-measure: 62ch;
  }

  /* ── Header: wordmark + transparent icon actions ────────────── */
  .legal-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: color-mix(in srgb, #ffffff 88%, transparent);
    backdrop-filter: blur(16px) saturate(150%);
    -webkit-backdrop-filter: blur(16px) saturate(150%);
    padding: max(12px, env(safe-area-inset-top)) clamp(20px, 4.5vw, 44px) 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .legal-wordmark {
    flex-shrink: 0;
    font-family: inherit;
    font-size: 19px;
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
  /* Match login .auth-docs-trigger hit target (28×28); icons read larger */
  .legal-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    max-width: 28px;
    max-height: 28px;
    aspect-ratio: 1;
    padding: 0;
    margin: 0;
    border: 0 !important;
    border-radius: 999px;
    background: transparent;
    color: var(--legal-text);
    cursor: pointer;
    box-shadow: none;
    outline: none;
    flex-shrink: 0;
    line-height: 0;
    opacity: 0.78;
    transition: color .15s ease, opacity .15s ease;
  }
  .legal-icon-btn svg {
    display: block;
  }
  .legal-icon-btn.legal-nav-back svg,
  .legal-icon-btn.legal-toc-back svg {
    width: 20px;
    height: 20px;
  }
  .legal-icon-btn.legal-nav-menu svg {
    width: 18px;
    height: 18px;
  }
  .legal-icon-btn:hover,
  .legal-icon-btn:focus-visible,
  .legal-icon-btn[aria-expanded="true"] {
    color: var(--legal-text);
    background: transparent;
    opacity: 1;
  }
  .legal-toc-back {
    display: none;
    margin: 0 0 14px -4px;
  }

  .legal-menu-pop {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    z-index: 60;
    min-width: 196px;
    width: max-content;
    max-width: min(280px, calc(100vw - 32px));
    padding: 8px;
    border-radius: 14px;
    border: 1px solid var(--legal-edge);
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(18px) saturate(155%);
    -webkit-backdrop-filter: blur(18px) saturate(155%);
    box-shadow:
      0 16px 40px rgba(29, 29, 31, 0.08),
      0 2px 8px rgba(29, 29, 31, 0.04);
    display: flex;
    flex-direction: column;
    gap: 1px;
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
    border-radius: 9px;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: -0.012em;
    color: var(--legal-text-muted);
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
    max-width: 880px;
    margin: 0 auto;
    padding:
      clamp(48px, 9vw, 88px)
      clamp(22px, 5.5vw, 36px)
      clamp(72px, 11vw, 128px);
  }

  .legal-doc.has-aside {
    display: block;
  }
  .legal-article {
    min-width: 0;
    max-width: var(--legal-measure);
    margin: 0 auto;
  }

  .legal-head {
    margin: 0 0 clamp(48px, 8vw, 72px);
    text-align: left;
  }
  /* Aeonik Regular only — beat global h1 Medium (500) */
  .legal-root h1,
  .legal-root .legal-title,
  .legal-root h1.legal-title {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: clamp(34px, 4.6vw, 48px) !important;
    font-weight: 400 !important;
    line-height: 1.1;
    letter-spacing: -0.032em;
    color: var(--legal-text);
  }

  /* Quiet left TOC — desktop only; no mobile pill strip */
  .legal-toc-wrap {
    display: none;
  }
  .legal-toc-link {
    display: block;
    padding: 6px 0 6px 12px;
    margin-left: -12px;
    border-left: 1.5px solid transparent;
    color: var(--legal-text-faint);
    text-decoration: none;
    font-size: 12.5px;
    line-height: 1.35;
    font-weight: 400;
    letter-spacing: -0.008em;
    transition: color .12s ease, border-color .12s ease;
  }
  .legal-toc-link:hover {
    color: var(--legal-text-muted);
  }
  .legal-toc-link.active {
    color: var(--legal-text);
    border-left-color: var(--legal-text);
  }

  .legal h2 {
    scroll-margin-top: 88px;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 21px;
    font-weight: 400;
    line-height: 1.28;
    letter-spacing: -0.022em;
    margin: 0;
    padding-top: clamp(48px, 7vw, 68px);
    color: var(--legal-text);
  }
  .legal h2:first-of-type { padding-top: 0; }
  .legal h2 + p,
  .legal h2 + ul,
  .legal h2 + ol,
  .legal h2 + div { margin-top: 18px; }
  .legal h3 {
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 16.5px;
    font-weight: 400;
    line-height: 1.35;
    letter-spacing: -0.016em;
    margin: 32px 0 12px;
    color: var(--legal-text);
  }
  .legal h3 + p,
  .legal h3 + ul,
  .legal h3 + ol { margin-top: 0; }
  .legal p, .legal li {
    font-size: 16px;
    line-height: 1.68;
    font-weight: 400;
    letter-spacing: -0.008em;
    color: var(--legal-text-secondary);
  }
  .legal p { margin: 0 0 16px; }
  .legal ul, .legal ol {
    padding-left: 1.28em;
    margin: 8px 0 18px;
  }
  .legal li { margin: 6px 0; }
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
    text-decoration-color: color-mix(in srgb, var(--legal-link) 32%, transparent);
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
    color: var(--legal-text);
  }
  .legal hr {
    display: none;
  }

  /* Contact / Verantwortlicher — calm professional card */
  .legal-box {
    background: var(--legal-bg-soft);
    border: 1px solid var(--legal-edge);
    border-radius: 16px;
    padding: 22px 24px;
    margin: 20px 0 28px;
  }
  .legal-box p {
    margin: 0;
    font-size: 15.5px;
    line-height: 1.62;
    letter-spacing: -0.01em;
    color: var(--legal-text);
  }
  .legal-box strong {
    display: inline;
    font-size: inherit;
    letter-spacing: -0.014em;
  }
  .legal-box a {
    color: var(--legal-text);
    text-decoration-color: color-mix(in srgb, var(--legal-text) 28%, transparent);
  }
  .legal-box-org {
    display: block;
    margin-bottom: 2px;
    font-size: 15.5px;
    letter-spacing: -0.014em;
    color: var(--legal-text);
  }
  .legal-box-meta {
    display: block;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--legal-edge);
    font-size: 14.5px;
    line-height: 1.55;
    color: var(--legal-text-muted);
  }
  .legal-box-meta a {
    color: var(--legal-text);
  }
  .legal-note {
    font-size: 14px;
    line-height: 1.6;
    color: var(--legal-text-muted);
    margin-top: 12px;
    letter-spacing: -0.004em;
  }
  .legal-stand {
    margin: 64px 0 0;
    padding-top: 28px;
    border-top: 1px solid var(--legal-edge);
    font-size: 13px;
    line-height: 1.55;
    font-weight: 400;
    color: var(--legal-text-faint);
    letter-spacing: -0.004em;
  }

  /* ── Footer: quiet, complete, no address spam ───────────────── */
  .legal-footer {
    max-width: 880px;
    margin: 0 auto;
    padding:
      40px clamp(22px, 5.5vw, 36px)
      max(40px, env(safe-area-inset-bottom));
    text-align: center;
    color: var(--legal-text-faint);
    font-size: 12.5px;
    font-weight: 400;
    letter-spacing: -0.008em;
    border-top: 1px solid var(--legal-edge);
  }
  .legal-footer-brand {
    margin: 0 0 16px;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: -0.018em;
    color: var(--legal-text);
  }
  .legal-footer-links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 2px;
    margin: 0 0 22px;
  }
  .legal-footer-links a {
    color: var(--legal-text-muted);
    text-decoration: none;
    font-size: 12.5px;
    font-weight: 400;
    letter-spacing: -0.008em;
    padding: 5px 10px;
    border-radius: 6px;
    background: transparent;
    transition: color .15s ease, background .15s ease;
  }
  .legal-footer-links a:hover {
    color: var(--legal-text);
    background: transparent;
  }
  .legal-footer-links a[aria-current="page"] {
    color: var(--legal-text);
    background: transparent;
  }
  .legal-footer-meta {
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
    font-weight: 400;
    color: var(--legal-text-faint);
  }
  .legal-footer-meta a {
    color: var(--legal-text-muted);
    text-decoration: none;
  }
  .legal-footer-meta a:hover {
    color: var(--legal-text);
    text-decoration: underline;
    text-underline-offset: 2px;
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
      max-width: 1080px;
    }
    .legal-footer {
      max-width: 1080px;
    }
    .legal-nav-back {
      display: none;
    }
    .legal-doc.has-aside {
      display: grid;
      grid-template-columns: 176px minmax(0, 1fr);
      gap: clamp(40px, 5.5vw, 64px);
      align-items: start;
      max-width: 100%;
      margin: 0 auto;
    }
    .legal-doc.has-aside .legal-article {
      margin: 0;
      max-width: var(--legal-measure);
      justify-self: center;
      width: 100%;
    }
    .legal-toc-wrap {
      display: block;
      position: sticky;
      top: 92px;
      max-height: calc(100dvh - 112px);
      overflow-y: auto;
      padding-top: 2px;
      scrollbar-width: thin;
    }
    .legal-toc-back {
      display: inline-flex;
    }
    .legal-toc-wrap::-webkit-scrollbar { width: 3px; }
    .legal-toc-wrap::-webkit-scrollbar-thumb {
      background: rgba(29, 29, 31, 0.14);
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
      color: #1d1d1f;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow:
        0 10px 28px rgba(29, 29, 31, 0.1),
        0 2px 8px rgba(29, 29, 31, 0.04);
      -webkit-tap-highlight-color: transparent;
    }
    .legal-mdock-tagro {
      flex: 1;
      min-width: 0;
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
      background: rgba(29, 29, 31, 0.22);
      opacity: 0;
      transition: opacity .28s ease;
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
      box-shadow: 0 -12px 40px rgba(29, 29, 31, 0.1);
      transform: translateY(8px);
      opacity: 0;
      transition:
        transform .28s cubic-bezier(.22, 1, .36, 1),
        opacity .28s ease;
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
      background: rgba(29, 29, 31, 0.12);
      margin: 4px auto 14px;
      flex-shrink: 0;
    }
    .legal-toc-sheet-title {
      margin: 0 0 10px;
      font-size: 15px;
      font-weight: 400;
      letter-spacing: -0.02em;
      color: #1d1d1f;
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
      border-radius: 10px;
      padding: 12px 12px;
      font: inherit;
      font-size: 15px;
      font-weight: 400;
      letter-spacing: -0.01em;
      color: #6e6e73;
      cursor: pointer;
      transition: background .15s ease, color .15s ease;
    }
    .legal-toc-sheet-link:hover {
      color: #1d1d1f;
      background: var(--festag-input-fill, #F5F5F7);
    }
    .legal-toc-sheet-link.active {
      color: #1d1d1f;
      background: var(--festag-input-fill, #F5F5F7);
    }
  }

  @media (max-width: 720px) {
    .legal-nav {
      gap: 12px;
      padding-left: 18px;
      padding-right: 18px;
    }
    .legal-wordmark { font-size: 17px; max-width: calc(100% - 96px); }
    .legal-shell {
      padding-top: 36px;
      padding-bottom: 80px;
    }
    .legal-title {
      font-size: 32px !important;
      letter-spacing: -0.028em;
    }
    .legal p, .legal li {
      font-size: 15.5px;
      line-height: 1.66;
      letter-spacing: -0.006em;
    }
    .legal h2 { font-size: 19px; }
    .legal-box { padding: 18px 18px; border-radius: 14px; }
    .legal-footer-links { gap: 2px; }
  }
`
