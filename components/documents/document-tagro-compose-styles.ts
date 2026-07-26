/** Floating Tagro compose bar inside document editor. */
export const DOCUMENT_TAGRO_COMPOSE_CSS = `
  .dtcb-root {
    --dtcb-accent: #5B647D;
    --dtcb-accent-hover: #4d5569;
    --dtcb-accent-soft: rgba(91, 100, 125, 0.18);
    --dtcb-accent-glow: rgba(91, 100, 125, 0.32);
    position: absolute;
    left: var(--festag-content-pad-x, 56px);
    right: var(--festag-content-pad-x, 56px);
    bottom: 24px;
    z-index: 12;
    pointer-events: none;
  }
  .dtcb-shell {
    pointer-events: auto;
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 18px;
    border: none;
    outline: none;
    background: var(--festag-glass-bg-strong, rgba(255, 255, 255, 0.72));
    box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
  }
  html[data-theme="dark"] .dtcb-shell,
  html[data-theme="classic-dark"] .dtcb-shell {
    background: var(--surface-1, #2c2c2e);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
  }
  .dtcb-root.is-focused .dtcb-shell {
    box-shadow: 0 16px 44px rgba(15, 23, 42, 0.16);
  }
  html[data-theme="dark"] .dtcb-root.is-focused .dtcb-shell,
  html[data-theme="classic-dark"] .dtcb-root.is-focused .dtcb-shell {
    background: #323234;
    box-shadow: 0 18px 52px rgba(0, 0, 0, 0.52);
  }
  .dtcb-input-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 34px;
    display: flex;
    align-items: center;
    border-radius: 12px;
    padding: 0 4px;
    background: transparent;
    border: none;
    outline: none;
  }
  .dtcb-ghost {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 6px;
    pointer-events: none;
    z-index: 1;
    overflow: hidden;
  }
  .dtcb-ghost-text {
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    color: var(--dec-soft, #8f93a4);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0;
    transform: translateY(5px);
    transition: opacity .28s ease, transform .28s ease;
  }
  .dtcb-ghost.is-visible .dtcb-ghost-text {
    opacity: 1;
    transform: translateY(0);
  }
  html[data-theme="dark"] .dtcb-ghost-text,
  html[data-theme="classic-dark"] .dtcb-ghost-text {
    color: rgba(255, 255, 255, 0.42);
  }
  .dtcb-cursor {
    width: 1px;
    height: 16px;
    margin-left: 1px;
    background: var(--dtcb-accent);
    animation: dtcbBlink 1s step-end infinite;
    flex-shrink: 0;
  }
  @keyframes dtcbBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  .dtcb-input {
    position: relative;
    z-index: 2;
    width: 100%;
    border: 0;
    background: transparent;
    resize: none;
    font: inherit;
    font-size: 14px;
    line-height: 1.45;
    color: var(--dec-dark);
    padding: 6px 2px;
    max-height: 96px;
    caret-color: var(--dtcb-accent);
  }
  .dtcb-root.is-ghosting .dtcb-input {
    color: transparent;
  }
  .dtcb-root.is-ghosting .dtcb-input::selection {
    background: rgba(91, 100, 125, 0.28);
    color: var(--dec-dark);
  }
  html[data-theme="dark"] .dtcb-input,
  html[data-theme="classic-dark"] .dtcb-input {
    color: #f5f5f7;
  }
  html[data-theme="dark"] .dtcb-root.is-ghosting .dtcb-input,
  html[data-theme="classic-dark"] .dtcb-root.is-ghosting .dtcb-input {
    color: transparent;
  }
  .dtcb-input:focus { outline: none; box-shadow: none; }
  .dtcb-input::placeholder { color: var(--dec-soft); }
  .dtcb-send {
    flex-shrink: 0;
    height: 34px;
    padding: 0 14px;
    border: none;
    border-radius: 999px;
    background: var(--dtcb-accent);
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity .12s, background .12s;
  }
  .dtcb-send:hover:not(:disabled) { background: var(--dtcb-accent-hover); opacity: 0.92; }
  .dtcb-send:disabled { opacity: .38; cursor: not-allowed; box-shadow: none; }
  .dtcb-root.is-busy .dtcb-send { opacity: .7; }

  .doc-ed-shell {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .doc-ed-body.dec-scroll-body {
    padding-bottom: calc(var(--festag-content-pad-bottom, 88px) + 72px);
  }

  @media (prefers-reduced-motion: reduce) {
    .dtcb-cursor { animation: none; }
    .dtcb-ghost { transition: none; }
  }
`
