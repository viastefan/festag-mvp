/** Festag legal pages — BlogShell-aligned docs layout. */

export const LEGAL_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }

  .legal-root {
    min-height: 100dvh;
    background: var(--legal-bg);
    color: var(--legal-text);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-weight: 500;
    letter-spacing: 0.012em;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
    --legal-bg: #FCFCFD;
    --legal-bg-soft: #F5F5F7;
    --legal-surface: #ffffff;
    --legal-text: #1A1F2C;
    --legal-text-secondary: #4E5567;
    --legal-text-muted: #8A93A4;
    --legal-accent: #5B647D;
    --legal-border: rgba(15, 23, 42, 0.08);
    --legal-border-strong: rgba(15, 23, 42, 0.14);
    --legal-link: #1A1F2C;
    --legal-hover: rgba(15, 23, 42, 0.04);
  }
  [data-theme="dark"] .legal-root,
  [data-theme="classic-dark"] .legal-root {
    --legal-bg: #000000;
    --legal-bg-soft: #0C0C0E;
    --legal-surface: #121214;
    --legal-text: #E8EBF1;
    --legal-text-secondary: #A8B0BD;
    --legal-text-muted: #6B7488;
    --legal-border: rgba(255, 255, 255, 0.08);
    --legal-border-strong: rgba(255, 255, 255, 0.14);
    --legal-link: #E8EBF1;
    --legal-hover: rgba(255, 255, 255, 0.05);
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

  .legal-nav {
    position: sticky; top: 0; z-index: 50;
    background: color-mix(in srgb, var(--legal-bg) 88%, transparent);
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    border-bottom: 1px solid var(--legal-border);
    padding: 14px clamp(20px, 4vw, 40px);
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px;
  }
  .legal-logo {
    font-family: 'Qurova DEMO', serif;
    font-size: 22px; font-weight: 500;
    color: var(--legal-text);
    text-decoration: none;
    letter-spacing: -0.2px;
    transition: opacity .15s;
    flex-shrink: 0;
  }
  .legal-logo:hover { opacity: .72; }
  .legal-nav-right {
    display: flex; align-items: center; gap: 14px;
  }
  .legal-nav-links {
    display: flex; align-items: center; gap: 4px;
  }
  .legal-nav-pill {
    padding: 6px 12px;
    border-radius: 999px;
    color: var(--legal-text-muted);
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.012em;
    transition: background .12s ease, color .12s ease;
    white-space: nowrap;
  }
  .legal-nav-pill:hover {
    background: var(--legal-hover);
    color: var(--legal-text);
  }
  .legal-nav-pill[aria-current="page"] {
    background: var(--legal-hover);
    color: var(--legal-text);
    box-shadow: inset 0 0 0 1px var(--legal-border);
  }

  .legal-shell {
    max-width: 1080px;
    margin: 0 auto;
    padding: 40px clamp(20px, 4vw, 40px) 88px;
  }
  .legal-back {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12.5px; font-weight: 500;
    color: var(--legal-text-muted);
    margin-bottom: 36px;
    letter-spacing: 0.012em;
    transition: color .15s, background .15s;
    border: 1px solid var(--legal-border);
    background: var(--legal-surface);
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
    font-family: inherit;
  }
  .legal-back:hover {
    color: var(--legal-text);
    border-color: var(--legal-border-strong);
  }

  .legal-doc.has-toc {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 210px;
    gap: clamp(28px, 4vw, 56px);
    align-items: start;
  }
  .legal-article { min-width: 0; max-width: 680px; }
  .legal-doc.has-toc .legal-article { max-width: none; }

  .legal-head { margin-bottom: 40px; }
  .legal-title {
    margin: 0;
    font-size: clamp(28px, 3.2vw, 36px);
    font-weight: 500;
    line-height: 1.12;
    letter-spacing: -0.02em;
    color: var(--legal-text);
  }
  .legal-lead {
    margin: 14px 0 0;
    font-size: clamp(15px, 1.4vw, 17px);
    line-height: 1.58;
    color: var(--legal-text-secondary);
    max-width: 580px;
  }
  .legal-head-meta {
    margin: 16px 0 0;
    font-size: 12px;
    color: var(--legal-text-muted);
  }

  .legal-toc-wrap {
    position: sticky;
    top: 84px;
    max-height: calc(100dvh - 100px);
    overflow-y: auto;
    padding-right: 4px;
    scrollbar-width: thin;
  }
  .legal-toc-wrap::-webkit-scrollbar { width: 4px; }
  .legal-toc-wrap::-webkit-scrollbar-thumb {
    background: var(--legal-border);
    border-radius: 999px;
  }
  .legal-toc-label {
    margin: 0 0 10px;
    color: var(--legal-text);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.01em;
  }
  .legal-toc-link {
    display: block;
    padding: 5px 10px;
    margin-left: -10px;
    border-radius: 8px;
    color: var(--legal-text-muted);
    text-decoration: none;
    font-size: 12.5px;
    line-height: 1.4;
    transition: background .12s ease, color .12s ease;
  }
  .legal-toc-link:hover {
    background: var(--legal-hover);
    color: var(--legal-text);
  }
  .legal-toc-link.active {
    background: var(--legal-hover);
    color: var(--legal-text);
  }

  .legal-toc-mobile {
    display: none;
    margin-bottom: 28px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--legal-border);
  }
  .legal-toc-mobile-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
  }
  .legal-toc-mobile-scroll::-webkit-scrollbar { display: none; }
  .legal-toc-chip {
    flex-shrink: 0;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--legal-border);
    background: var(--legal-surface);
    color: var(--legal-text-secondary);
    text-decoration: none;
    font-size: 12px;
    white-space: nowrap;
    transition: border-color .12s, color .12s, background .12s;
  }
  .legal-toc-chip:hover,
  .legal-toc-chip.active {
    border-color: var(--legal-border-strong);
    color: var(--legal-text);
    background: var(--legal-hover);
  }

  .legal h2 {
    scroll-margin-top: 88px;
    font-size: 16px; font-weight: 500;
    margin: 0;
    padding-top: 44px;
    color: var(--legal-text);
    letter-spacing: 0.012em;
  }
  .legal h2:first-of-type { padding-top: 0; }
  .legal h2 + p,
  .legal h2 + ul,
  .legal h2 + ol,
  .legal h2 + div { margin-top: 12px; }
  .legal h3 {
    font-size: 14px; font-weight: 500;
    margin: 24px 0 8px;
    color: var(--legal-text);
    letter-spacing: 0.012em;
  }
  .legal p, .legal li {
    font-size: 14px;
    line-height: 1.72;
    font-weight: 500;
    letter-spacing: 0.012em;
    color: var(--legal-text-secondary);
  }
  .legal p { margin: 0 0 12px; }
  .legal ul, .legal ol { padding-left: 22px; margin: 8px 0 14px; }
  .legal li { margin: 5px 0; }
  .legal li::marker { color: var(--legal-text-muted); }
  .legal strong { color: var(--legal-text); font-weight: 500; }
  .legal a {
    color: var(--legal-link);
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-color: color-mix(in srgb, var(--legal-link) 34%, transparent);
  }
  .legal a:hover {
    text-decoration-color: var(--legal-link);
  }
  .legal code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12.5px;
    padding: 1px 6px;
    border-radius: 6px;
    background: var(--legal-bg-soft);
    border: 1px solid var(--legal-border);
  }
  .legal hr {
    border: none;
    height: 1px;
    background: var(--legal-border);
    margin: 44px 0;
  }
  .legal-box {
    background: var(--legal-bg-soft);
    border: 1px solid var(--legal-border);
    border-radius: 14px;
    padding: 18px 20px;
    margin: 14px 0;
  }
  .legal-box p { margin: 0; }
  .legal-note {
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--legal-text-muted);
    margin-top: 8px;
  }
  .legal-meta {
    display: inline-flex;
    margin-top: 48px;
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid var(--legal-border);
    background: var(--legal-surface);
    font-size: 12px;
    color: var(--legal-text-muted);
    letter-spacing: 0.02em;
  }

  .legal-footer {
    border-top: 1px solid var(--legal-border);
    padding: 28px clamp(20px, 4vw, 40px);
    text-align: center;
    color: var(--legal-text-muted);
    font-size: 12px;
    letter-spacing: 0.02em;
  }
  .legal-footer strong { color: var(--legal-text-secondary); font-weight: 500; }
  .legal-footer p { margin: 0; line-height: 1.6; }
  .legal-footer p + p { margin-top: 6px; }
  .legal-footer-links {
    display: flex; flex-wrap: wrap; justify-content: center;
    gap: 6px 10px; margin-bottom: 16px;
  }
  .legal-footer-pill {
    padding: 5px 11px;
    border-radius: 999px;
    color: var(--legal-text-muted);
    text-decoration: none;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.012em;
    border: 1px solid transparent;
    transition: color .15s, background .15s, border-color .15s;
  }
  .legal-footer-pill:hover {
    color: var(--legal-text);
    background: var(--legal-hover);
    border-color: var(--legal-border);
  }
  .legal-footer-pill[aria-current="page"] {
    color: var(--legal-text);
    background: var(--legal-hover);
    border-color: var(--legal-border);
  }

  @media (max-width: 900px) {
    .legal-doc.has-toc { grid-template-columns: 1fr; }
    .legal-toc-wrap { display: none; }
    .legal-toc-mobile { display: block; }
  }
  @media (max-width: 720px) {
    .legal-nav { flex-wrap: wrap; }
    .legal-nav-right {
      width: 100%;
      justify-content: space-between;
    }
    .legal-nav-links {
      gap: 2px;
      overflow-x: auto;
      scrollbar-width: none;
      max-width: calc(100% - 120px);
    }
    .legal-nav-links::-webkit-scrollbar { display: none; }
    .legal-nav-pill { font-size: 12px; padding: 5px 10px; }
    .legal-shell { padding-top: 24px; padding-bottom: 64px; }
    .legal-back { margin-bottom: 28px; }
  }
`
