/** Festag legal pages — editorial article layout (Anthropic-news measure, 100% Festag). */

export const LEGAL_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }

  .legal-root {
    min-height: 100dvh;
    background: var(--legal-bg);
    color: var(--legal-text);
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
  [data-theme="dark"] .legal-root,
  [data-theme="classic-dark"] .legal-root {
    --legal-bg: #000000;
    --legal-bg-soft: #0c0c0e;
    --legal-surface: #121214;
    --legal-text: #f5f5f7;
    --legal-text-secondary: #a1a1a6;
    --legal-text-muted: #6e6e73;
    --legal-border: rgba(255, 255, 255, 0.08);
    --legal-border-strong: rgba(255, 255, 255, 0.14);
    --legal-link: #f5f5f7;
    --legal-hover: rgba(255, 255, 255, 0.06);
  }
  [data-theme="read"] .legal-root {
    --legal-bg: #F7F4EC;
    --legal-bg-soft: #F0EBE0;
    --legal-surface: #FFFDF7;
    --legal-text: #1C1914;
    --legal-text-secondary: #4E493F;
    --legal-text-muted: #8D8678;
    --legal-border: rgba(38, 33, 24, 0.10);
    --legal-border-strong: rgba(38, 33, 24, 0.16);
    --legal-link: #1C1914;
    --legal-hover: rgba(38, 33, 24, 0.05);
  }

  /* ── Header: auth-like wordmark + quiet sibling links ───────── */
  .legal-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: color-mix(in srgb, var(--legal-bg) 86%, transparent);
    backdrop-filter: blur(16px) saturate(150%);
    -webkit-backdrop-filter: blur(16px) saturate(150%);
    border-bottom: 1px solid transparent;
    padding: max(12px, env(safe-area-inset-top)) clamp(18px, 4vw, 40px) 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .legal-nav-left {
    display: flex;
    align-items: center;
    gap: 18px;
    min-width: 0;
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

  .legal-menu {
    display: flex;
    align-items: center;
    gap: 4px 14px;
    min-width: 0;
    flex-wrap: wrap;
  }
  .legal-menu a {
    font-size: 13px;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: var(--legal-text-muted);
    text-decoration: none;
    white-space: nowrap;
    transition: color .15s ease;
  }
  .legal-menu a:hover { color: var(--legal-text); }
  .legal-menu a[aria-current="page"] {
    color: var(--legal-text);
  }

  .legal-nav-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
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
    font-size: clamp(32px, 4.2vw, 44px);
    font-weight: 500;
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
    letter-spacing: -0.011em;
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
  }
  .legal-stand {
    margin: 48px 0 0;
    padding-top: 24px;
    border-top: 1px solid var(--legal-border);
    font-size: 13px;
    line-height: 1.5;
    color: var(--legal-text-muted);
    letter-spacing: -0.01em;
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
  .legal-footer p { margin: 0; line-height: 1.55; }
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
      flex-wrap: wrap;
      gap: 10px 12px;
    }
    .legal-nav-left {
      width: 100%;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
    .legal-menu {
      width: 100%;
      gap: 10px 14px;
      overflow-x: auto;
      flex-wrap: nowrap;
      scrollbar-width: none;
      padding-bottom: 2px;
      -webkit-overflow-scrolling: touch;
    }
    .legal-menu::-webkit-scrollbar { display: none; }
    .legal-nav-right {
      position: absolute;
      top: max(12px, env(safe-area-inset-top));
      right: clamp(18px, 4vw, 40px);
    }
    .legal-wordmark { font-size: 20px; max-width: calc(100% - 88px); }
    .legal-shell {
      padding-top: 32px;
      padding-bottom: 72px;
    }
    .legal-title { font-size: 32px; }
    .legal p, .legal li { font-size: 15.5px; }
    .legal h2 { font-size: 18px; }
  }
`
