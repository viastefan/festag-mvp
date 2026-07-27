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
    background: var(--portal-raised, var(--raised, #FAFAFA));
    border-radius: var(--festag-sheet-radius, 18px) var(--festag-sheet-radius, 18px) 0 0;
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
    /* Enter settle — shared festagSheetGripIn in festag-popup-styles.css */
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
    height: 52px;
    padding: 0 20px;
    border: ${MOBILE_WHITE_BORDER};
    border-radius: var(--festag-control-radius, 8px);
    background: #f5f5f7;
    color: #8e8e93;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 16px;
    font-weight: 400 !important;
    letter-spacing: 0.005em;
    cursor: pointer;
    box-shadow: ${MOBILE_WHITE_ELEV};
    transition: background 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .mpd-ghost:active {
    background: #ececf0;
    transform: scale(0.99);
    box-shadow: none;
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
    width: 52px !important;
    height: 52px !important;
    min-width: 52px !important;
    flex-shrink: 0;
    border: ${MOBILE_WHITE_BORDER} !important;
    border-radius: var(--festag-control-radius, 8px) !important;
    background: var(--festag-btn-dark-bg, #ffffff) !important;
    color: var(--festag-btn-dark-fg, #1e1e20) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer;
    padding: 0 !important;
    box-shadow: ${MOBILE_PRIMARY_ELEV} !important;
    transition: background 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .mpd-primary svg {
    width: 20px !important;
    height: 20px !important;
    color: var(--festag-btn-dark-fg, #1e1e20) !important;
    fill: currentColor;
  }
  .mpd-primary:active {
    transform: scale(0.99);
    background: var(--festag-btn-dark-bg-active, #f5f5f6) !important;
    box-shadow: none !important;
  }
  .mpd-primary--disabled,
  .mpd-primary:disabled {
    opacity: 0.48;
    cursor: not-allowed;
    pointer-events: none;
  }

  [data-theme='dark'] .mpd-shell,
  [data-theme='classic-dark'] .mpd-shell {
    background: var(--festag-black-popup, #121218);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 -12px 40px rgba(0, 0, 0, 0.62);
  }
  [data-theme='dark'] .mpd-grip,
  [data-theme='classic-dark'] .mpd-grip {
    background: rgba(255, 255, 255, 0.16);
  }
  [data-theme='dark'] .mpd-ghost,
  [data-theme='classic-dark'] .mpd-ghost {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.07);
    color: var(--festag-night-ink-2, rgba(232, 232, 238, 0.55));
    box-shadow: var(--festag-mobile-control-shadow-dark, 0 1px 2px rgba(0, 0, 0, 0.4));
  }
  [data-theme='dark'] .mpd-ghost-icon,
  [data-theme='classic-dark'] .mpd-ghost-icon {
    color: var(--festag-night-ink-3, rgba(232, 232, 238, 0.38));
  }
  [data-theme='dark'] .mpd-primary,
  [data-theme='classic-dark'] .mpd-primary {
    background: #F0F2F5 !important;
    color: #1A1A1E !important;
    border-color: transparent !important;
    box-shadow: var(--festag-mobile-control-shadow-dark, 0 1px 2px rgba(0, 0, 0, 0.4)) !important;
  }
  [data-theme='dark'] .mpd-primary svg,
  [data-theme='classic-dark'] .mpd-primary svg {
    color: #1A1A1E !important;
  }

  @media (max-width: 768px) {
    .mpd-root {
      display: flex;
    }
  }
`
