/** Global Tagro focus compose bar — Cursor Design-Mode style pill. */
export const TAGRO_FOCUS_COMPOSE_CSS = `
  .tfc-root {
    --tfc-accent: #5B647D;
    --tfc-accent-soft: rgba(91, 100, 125, 0.16);
    position: fixed;
    left: 50%;
    bottom: max(28px, env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%) translateY(12px);
    z-index: 240;
    width: min(560px, calc(100vw - 32px));
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition: opacity .18s ease, transform .22s cubic-bezier(.16,1,.3,1), visibility .18s;
  }
  .tfc-root.is-open {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
  }
  .tfc-shell {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    padding: 8px 10px 8px 12px;
    border-radius: 999px;
    background: #0c0c0e;
    color: #f5f5f7;
    box-shadow:
      0 1px 0 rgba(255,255,255,0.08) inset,
      0 18px 48px rgba(0, 0, 0, 0.38);
  }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .tfc-shell {
    background: rgba(18, 18, 20, 0.94);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
  }
  .tfc-context {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    max-width: 34%;
    min-width: 0;
    padding: 6px 10px 6px 8px;
    border-radius: 999px;
    background: rgba(91, 100, 125, 0.22);
    color: #9aa3b8;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 1;
  }
  .tfc-context-icon {
    display: grid;
    place-items: center;
    color: #c5cad6;
    flex-shrink: 0;
  }
  .tfc-context-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #d7dbe5;
  }
  .tfc-input-wrap {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
  }
  .tfc-input {
    width: 100%;
    border: 0;
    outline: none;
    background: transparent;
    color: #f5f5f7;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, sans-serif;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: -0.01em;
    line-height: 1.35;
    padding: 0;
  }
  .tfc-input::placeholder {
    color: rgba(245, 245, 247, 0.42);
  }
  .tfc-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .tfc-translate {
    height: 34px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: #f5f5f7;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: -0.01em;
    cursor: pointer;
    white-space: nowrap;
    transition: background .15s ease, opacity .15s ease;
  }
  .tfc-translate:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.14);
  }
  .tfc-translate:disabled,
  .tfc-mic:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .tfc-mic {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: #f5f5f7;
    color: #0c0c0e;
    cursor: pointer;
    flex-shrink: 0;
    transition: transform .12s ease, background .15s ease, color .15s ease;
  }
  .tfc-mic:hover:not(:disabled) {
    transform: scale(1.03);
  }
  .tfc-mic.is-listening {
    background: var(--tfc-accent);
    color: #fff;
    box-shadow: 0 0 0 4px var(--tfc-accent-soft);
  }
  .tfc-status {
    position: absolute;
    left: 18px;
    right: 18px;
    bottom: calc(100% + 8px);
    padding: 8px 12px;
    border-radius: 14px;
    background: rgba(12, 12, 14, 0.92);
    color: rgba(245, 245, 247, 0.72);
    font-family: var(--font-aeonik, 'Aeonik'), Inter, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    letter-spacing: -0.01em;
    box-shadow: 0 10px 28px rgba(0,0,0,0.28);
  }
  .tfc-status strong {
    color: #f5f5f7;
    font-weight: 500;
  }
  @media (max-width: 768px) {
    .tfc-root {
      bottom: max(96px, calc(env(safe-area-inset-bottom, 0px) + 84px));
      width: min(100vw - 24px, 520px);
    }
    .tfc-translate { display: none; }
    .tfc-context { max-width: 28%; }
  }
`
