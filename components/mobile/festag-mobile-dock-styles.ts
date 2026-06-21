/** Shared bottom dock — segmented tabs + optional primary action pill. */
export const FESTAG_MOBILE_DOCK_CSS = `
  .fmd-root {
    display: none;
    align-items: center;
    gap: 10px;
    position: fixed;
    left: 14px;
    right: 14px;
    bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    z-index: 190;
    pointer-events: auto;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .fmd-root.fmd-root--on { display: flex; }

  :global(body.chat-composer-focused) .fmd-root {
    transform: translateY(140%);
    transition: transform .2s ease;
  }

  .fmd-segment {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: stretch;
    gap: 2px;
    height: 58px;
    padding: 4px;
    border-radius: 999px;
    background: var(--fmd-segment-bg, #f2f2f7);
    box-shadow: inset 0 0 0 1px var(--fmd-segment-border, rgba(0, 0, 0, 0.06));
  }
  .fmd-tab {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    height: 50px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--fmd-tab-muted, #8e8e93);
    text-decoration: none;
    cursor: pointer;
    padding: 0 4px;
    -webkit-tap-highlight-color: transparent;
    transition: background .14s ease, color .14s ease, box-shadow .14s ease, transform .14s ease;
  }
  .fmd-tab:active { transform: scale(0.96); }
  .fmd-tab.on {
    background: var(--fmd-tab-active-bg, #ffffff);
    color: var(--fmd-tab-active, #000000);
    box-shadow:
      0 1px 3px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.85);
  }
  .fmd-tab-label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.01em;
    line-height: 1;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fmd-primary {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    height: 58px;
    padding: 0 22px;
    border: 0;
    border-radius: 999px;
    background: var(--fmd-primary-bg, #000000);
    color: var(--fmd-primary-text, #ffffff);
    font: inherit;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.005em;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    -webkit-tap-highlight-color: transparent;
    transition: transform .14s ease, opacity .14s ease;
  }
  .fmd-primary:active { transform: scale(0.985); opacity: 0.9; }
  .fmd-primary-icon { width: 20px; height: 20px; flex-shrink: 0; }

  [data-theme='dark'] .fmd-segment,
  [data-theme='classic-dark'] .fmd-segment {
    --fmd-segment-bg: rgba(255, 255, 255, 0.08);
    --fmd-segment-border: rgba(255, 255, 255, 0.08);
  }
  [data-theme='dark'] .fmd-tab,
  [data-theme='classic-dark'] .fmd-tab {
    --fmd-tab-muted: #8e8e93;
  }
  [data-theme='dark'] .fmd-tab.on,
  [data-theme='classic-dark'] .fmd-tab.on {
    --fmd-tab-active-bg: rgba(255, 255, 255, 0.14);
    --fmd-tab-active: #ffffff;
    box-shadow: none;
  }
  [data-theme='dark'] .fmd-primary,
  [data-theme='classic-dark'] .fmd-primary {
    --fmd-primary-bg: #ffffff;
    --fmd-primary-text: #000000;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.42);
  }

  body.festag-dev-dock .app-workspace-inner {
    padding-bottom: calc(110px + env(safe-area-inset-bottom, 0px)) !important;
  }

  @media (max-width: 380px) {
    .fmd-tab-label { display: none; }
    .fmd-primary {
      width: 58px;
      padding: 0;
      gap: 0;
    }
    .fmd-primary > span:not(.fmd-primary-icon) { display: none; }
  }
`
