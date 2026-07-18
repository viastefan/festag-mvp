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
    letter-spacing: -0.01em;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
    --legal-bg: #ffffff;
    --legal-bg-soft: #f5f5f7;
    --legal-surface: #ffffff;
    --legal-text: #1e1e20;
    --legal-text-secondary: #4a4a4f;
    --legal-text-muted: #86868b;
    --legal-border: rgba(15, 23, 42, 0.08);
    --legal-border-strong: rgba(15, 23, 42, 0.14);
    --legal-link: #1e1e20;
    --legal-hover: rgba(15, 23, 42, 0.04);
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
    border-bottom: 1px solid transparent;
    padding: max(12px, env(safe-area-inset-top)) clamp(18px, 4vw, 40px) 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .legal-wordmark {
    flex-shrink: 0;
    font-family: inherit;
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.03em;
    line-height: 1.2;
    color: var(--legal-text);
    text-decoration: none;
    max-width: min(52vw, 280px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 2px 0 3px;
    transition: opacity .15s ease;
  }
  .legal-wordmark:hover { opacity: 0.72; }

  .legal-nav-right {
    display: flex;
    align-items: center;
    gap: 2px;
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
    color: #6e6e73;
    cursor: pointer;
    box-shadow: none;
    outline: none;
    flex-shrink: 0;
    line-height: 0;
    transition: color .15s ease, opacity .15s ease;
  }
  .legal-icon-btn:hover,
  .legal-icon-btn:focus-visible,
  .legal-icon-btn[aria-expanded="true"] {
    color: #1e1e20;
    background: transparent;
  }

  .legal-menu-pop {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 60;
    min-width: 168px;
    width: max-content;
    max-width: min(240px, calc(100vw - 32px));
    padding: 6px;
    border-radius: 12px;
    border: 1px solid var(--legal-border);
    background: #ffffff;
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04);
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
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 400;
    letter-spacing: -0.01em;
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
    font-weight: 500;
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
    margin: 0 0 clamp(36px, 6vw, 52px);
    text-align: left;
  }
  .legal-title {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: clamp(32px, 4.2vw, 44px) !important;
    font-weight: 500 !important;
    line-height: 1.12;
    letter-spacing: -0.035em;
    color: var(--legal-text);
  }

  /* Quiet TOC — only for long docs, desktop */
  .legal-toc-wrap {
    display: none;
  }
  .legal-toc-mobile {
    display: none;
    margin: 0 0 32px;
    padding: 0 0 20px;
    border-bottom: 1px solid var(--legal-border);
  }
  .legal-toc-mobile-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .legal-toc-mobile-scroll::-webkit-scrollbar { display: none; }
  .legal-toc-chip {
    flex-shrink: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--legal-text-muted);
    text-decoration: none;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: -0.01em;
    white-space: nowrap;
    transition: color .12s ease;
  }
  .legal-toc-chip:hover,
  .legal-toc-chip.active {
    color: var(--legal-text);
  }
  .legal-toc-chip + .legal-toc-chip::before {
    content: '';
  }

  .legal h2 {
    scroll-margin-top: 88px;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 20px;
    font-weight: 500;
    line-height: 1.3;
    letter-spacing: -0.022em;
    margin: 0;
    padding-top: clamp(36px, 5vw, 48px);
    color: var(--legal-text);
  }
  .legal h2:first-of-type { padding-top: 0; }
  .legal h2 + p,
  .legal h2 + ul,
  .legal h2 + ol,
  .legal h2 + div { margin-top: 14px; }
  .legal h3 {
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 16px;
    font-weight: 500;
    line-height: 1.35;
    letter-spacing: -0.018em;
    margin: 28px 0 10px;
    color: var(--legal-text);
  }
  .legal p, .legal li {
    font-size: 16px;
    line-height: 1.7;
    font-weight: 400;
    letter-spacing: 0.002em;
    color: var(--legal-text-secondary);
  }
  .legal p { margin: 0 0 16px; }
  .legal ul, .legal ol {
    padding-left: 1.35em;
    margin: 10px 0 18px;
  }
  .legal li { margin: 6px 0; }
  .legal li::marker { color: var(--legal-text-muted); }
  .legal strong {
    color: var(--legal-text);
    font-weight: 500;
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
    padding: 1px 6px;
    border-radius: 6px;
    background: var(--legal-bg-soft);
    border: 1px solid var(--legal-border);
  }
  .legal hr {
    border: none;
    height: 1px;
    background: var(--legal-border);
    margin: 48px 0;
  }

  .legal-box {
    background: var(--legal-bg-soft);
    border: 1px solid var(--legal-border);
    border-radius: 16px;
    padding: 20px 22px;
    margin: 18px 0;
  }
  .legal-box p { margin: 0; }
  .legal-note {
    font-size: 14px;
    line-height: 1.6;
    color: var(--legal-text-muted);
    margin-top: 10px;
    letter-spacing: 0.002em;
  }
  .legal-stand {
    margin: 48px 0 0;
    padding-top: 24px;
    border-top: 1px solid var(--legal-border);
    font-size: 13px;
    line-height: 1.5;
    font-weight: 400;
    color: var(--legal-text-muted);
    letter-spacing: 0.002em;
  }

  /* ── Footer ─────────────────────────────────────────────────── */
  .legal-footer {
    border-top: 1px solid var(--legal-border);
    padding:
      28px clamp(18px, 4vw, 40px)
      max(28px, env(safe-area-inset-bottom));
    text-align: center;
    color: var(--legal-text-muted);
    font-size: 12.5px;
    letter-spacing: -0.01em;
  }
  .legal-footer strong {
    color: var(--legal-text-secondary);
    font-weight: 500;
  }
  .legal-footer p { margin: 0; line-height: 1.55; font-weight: 400; }
  .legal-footer p + p { margin-top: 6px; }
  .legal-footer-links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px 16px;
    margin-bottom: 18px;
  }
  .legal-footer-links a {
    color: var(--legal-text-muted);
    text-decoration: none;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: -0.01em;
    transition: color .15s ease;
  }
  .legal-footer-links a:hover { color: var(--legal-text); }
  .legal-footer-links a[aria-current="page"] { color: var(--legal-text); }

  @media (min-width: 1100px) {
    .legal-doc.has-toc {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 168px;
      gap: 48px;
      align-items: start;
      max-width: 920px;
      margin: 0 auto;
    }
    .legal-doc.has-toc .legal-article {
      margin: 0;
      max-width: var(--legal-measure);
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
      background: var(--legal-border);
      border-radius: 999px;
    }
    .legal-toc-link {
      display: block;
      padding: 5px 0;
      color: var(--legal-text-muted);
      text-decoration: none;
      font-size: 12.5px;
      line-height: 1.4;
      letter-spacing: -0.01em;
      transition: color .12s ease;
    }
    .legal-toc-link:hover,
    .legal-toc-link.active {
      color: var(--legal-text);
    }
  }

  @media (max-width: 1099px) {
    .legal-doc.has-toc .legal-toc-mobile { display: block; }
  }

  @media (max-width: 720px) {
    .legal-nav {
      gap: 12px;
    }
    .legal-wordmark { font-size: 20px; max-width: calc(100% - 84px); }
    .legal-shell {
      padding-top: 32px;
      padding-bottom: 72px;
    }
    .legal-title { font-size: 32px !important; }
    .legal p, .legal li { font-size: 15.5px; letter-spacing: 0.002em; }
    .legal h2 { font-size: 18px; }
  }
`
