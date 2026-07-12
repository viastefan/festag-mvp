/** Floating Tagro compose bar inside document editor. */
export const DOCUMENT_TAGRO_COMPOSE_CSS = `
  .dtcb-root {
    position: absolute;
    left: var(--festag-content-pad-x, 56px);
    right: var(--festag-content-pad-x, 56px);
    bottom: 24px;
    z-index: 12;
    pointer-events: none;
    animation: dtcbIn .32s cubic-bezier(.16, 1, .3, 1) both;
  }
  @keyframes dtcbIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: none; }
  }
  .dtcb-shell {
    pointer-events: auto;
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 10px 12px 10px 14px;
    border-radius: 18px;
    border: 1px solid color-mix(in srgb, var(--dec-dark) 8%, transparent);
    background: color-mix(in srgb, var(--festag-glass-bg-strong, rgba(255,255,255,.72)) 88%, transparent);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.65),
      0 12px 40px rgba(15,23,42,.12),
      0 2px 8px rgba(15,23,42,.06);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
  }
  html[data-theme="dark"] .dtcb-shell,
  html[data-theme="classic-dark"] .dtcb-shell {
    background: color-mix(in srgb, var(--festag-black-popup, #121214) 92%, transparent);
    border-color: rgba(255,255,255,.1);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.06),
      0 16px 48px rgba(0,0,0,.45);
    backdrop-filter: blur(22px) saturate(140%);
    -webkit-backdrop-filter: blur(22px) saturate(140%);
  }
  .dtcb-root.is-focused .dtcb-shell {
    border-color: color-mix(in srgb, #5e6ad2 42%, transparent);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.65),
      0 0 0 1px rgba(94,106,210,.18),
      0 16px 44px rgba(15,23,42,.14);
  }
  .dtcb-mark {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 10px;
    background: rgba(94,106,210,.12);
    color: #5e6ad2;
    cursor: pointer;
  }
  .dtcb-mark:disabled { opacity: .45; cursor: not-allowed; }
  .dtcb-input-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 34px;
    display: flex;
    align-items: center;
  }
  .dtcb-ghost {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 2px;
    pointer-events: none;
    opacity: 0;
    transition: opacity .22s ease;
    overflow: hidden;
  }
  .dtcb-ghost.is-visible { opacity: 1; }
  .dtcb-ghost-text {
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    color: var(--dec-soft, #8f93a4);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dtcb-cursor {
    width: 1px;
    height: 16px;
    margin-left: 1px;
    background: #5e6ad2;
    animation: dtcbBlink 1s step-end infinite;
    flex-shrink: 0;
  }
  @keyframes dtcbBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  .dtcb-input {
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
  }
  .dtcb-input:focus { outline: none; }
  .dtcb-input::placeholder { color: var(--dec-soft); }
  .dtcb-send {
    flex-shrink: 0;
    height: 34px;
    padding: 0 14px;
    border: 0;
    border-radius: 999px;
    background: #5e6ad2;
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity .12s, background .12s;
  }
  .dtcb-send:hover:not(:disabled) { background: #4f5ac4; }
  .dtcb-send:disabled { opacity: .38; cursor: not-allowed; }
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
  .doc-ed-page .dec-static-top::after {
    opacity: 0;
    transition: opacity .22s ease;
  }
  .doc-ed-page[data-doc-scroll-faded="true"] .dec-static-top::after {
    opacity: 1;
  }

  @media (max-width: 768px) {
    .dtcb-root {
      left: 16px;
      right: 16px;
      bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    }
    .doc-ed-body.dec-scroll-body {
      padding-bottom: calc(160px + env(safe-area-inset-bottom, 0px));
    }
  }
`
