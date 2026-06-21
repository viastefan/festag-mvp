import {
  MOBILE_DOCK_SHELL_SHADOW,
  MOBILE_PRIMARY_ELEV,
  MOBILE_WHITE_BORDER,
  MOBILE_WHITE_ELEV,
} from '@/components/mobile/mobile-surface-tokens'

/** Global dock styles — unscoped so they apply reliably on every page shell. */
export const MOBILE_PAGE_DOCK_CSS = `
  .mpd-root {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    pointer-events: auto;
  }
  .mpd-shell {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    background: #ffffff;
    border-radius: 32px 32px 0 0;
    box-shadow: ${MOBILE_DOCK_SHELL_SHADOW};
    padding: 10px 16px 16px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }
  .mpd-grip {
    width: 40px;
    height: 4px;
    margin-bottom: 14px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.12);
    flex-shrink: 0;
    cursor: grab;
    touch-action: none;
  }
  .mpd-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }
  .mpd-ghost {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 54px;
    padding: 0 20px;
    border: ${MOBILE_WHITE_BORDER};
    border-radius: 999px;
    background: #f2f2f7;
    color: #8e8e93;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 16px;
    font-weight: 400 !important;
    letter-spacing: 0.005em;
    cursor: pointer;
    box-shadow: ${MOBILE_WHITE_ELEV};
    -webkit-tap-highlight-color: transparent;
  }
  .mpd-ghost:active {
    background: #e5e5ea;
    transform: scale(0.985);
  }
  .mpd-ghost--disabled,
  .mpd-ghost:disabled {
    opacity: 0.52;
    cursor: not-allowed;
    pointer-events: none;
  }
  .mpd-ghost-icon {
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #8e8e93;
    pointer-events: none;
  }
  .mpd-ghost-icon svg {
    width: 14px;
    height: 14px;
  }
  .mpd-ghost-label {
    width: 100%;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
    font-weight: 400 !important;
    letter-spacing: 0.005em;
  }
  .mpd-ghost--plain {
    padding: 0 20px;
  }
  .mpd-primary {
    width: 54px !important;
    height: 54px !important;
    min-width: 54px !important;
    flex-shrink: 0;
    border: 0 !important;
    border-radius: 999px !important;
    background: var(--btn-prim, #000) !important;
    color: var(--btn-prim-text, #fff) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer;
    padding: 0 !important;
    box-shadow: ${MOBILE_PRIMARY_ELEV} !important;
    -webkit-tap-highlight-color: transparent;
  }
  .mpd-primary svg {
    width: 20px !important;
    height: 20px !important;
    color: var(--btn-prim-text, #fff) !important;
    fill: currentColor;
  }
  .mpd-primary:active {
    transform: scale(0.97);
    opacity: 0.9;
  }

  [data-theme='dark'] .mpd-shell,
  [data-theme='classic-dark'] .mpd-shell {
    background: #1c1c1e;
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.48);
  }
  [data-theme='dark'] .mpd-grip,
  [data-theme='classic-dark'] .mpd-grip {
    background: rgba(255, 255, 255, 0.22);
  }
  [data-theme='dark'] .mpd-ghost,
  [data-theme='classic-dark'] .mpd-ghost {
    background: #2c2c2e;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #8e8e93;
    box-shadow: none;
  }
  [data-theme='dark'] .mpd-ghost-icon,
  [data-theme='classic-dark'] .mpd-ghost-icon {
    color: #8e8e93;
  }
  [data-theme='dark'] .mpd-primary,
  [data-theme='classic-dark'] .mpd-primary {
    background: #ffffff !important;
    color: #000000 !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.42) !important;
  }
  [data-theme='dark'] .mpd-primary svg,
  [data-theme='classic-dark'] .mpd-primary svg {
    color: #000000 !important;
  }

  @media (max-width: 768px) {
    .mpd-root {
      display: flex;
    }
  }

  /* Page actions float above shell dock — no duplicate white sheet */
  body.festag-portal-dock .mpd-root {
    bottom: calc(82px + env(safe-area-inset-bottom, 0px));
    z-index: 189;
  }
  body.festag-portal-dock .mpd-shell {
    background: transparent;
    box-shadow: none;
    border-radius: 0;
    padding: 0 0 6px;
  }
  body.festag-portal-dock .mpd-grip {
    display: none;
  }
  body.festag-dev-dock .mpd-root {
    bottom: calc(82px + env(safe-area-inset-bottom, 0px));
    z-index: 189;
  }
`
