import {
  MOBILE_WHITE_BORDER,
  MOBILE_WHITE_ELEV,
} from '@/components/mobile/mobile-surface-tokens'

/** Shared mobile nav sheet — portal + dev panels, light + dark. */
export const MOBILE_NAV_SHEET_CSS = `
  .mns-root {
    position: fixed;
    inset: 0;
    z-index: 20000;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    pointer-events: auto;
  }
  .mns-backdrop {
    position: absolute;
    inset: 0;
    z-index: 0;
    border: 0;
    padding: 0;
    margin: 0;
    cursor: default;
    background: var(--modal-backdrop, rgba(10, 10, 12, 0.24));
    backdrop-filter: blur(var(--modal-backdrop-blur, 6px));
    -webkit-backdrop-filter: blur(var(--modal-backdrop-blur, 6px));
    animation: mnsFade 0.22s ease both;
  }
  .mns-sheet {
    --mns-elev: ${MOBILE_WHITE_ELEV};
    --mns-border: ${MOBILE_WHITE_BORDER};

    position: relative;
    z-index: 1;
    width: 100%;
    max-height: min(88dvh, 760px);
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    color-scheme: light;
    background: #ffffff;
    color: #0f0f10;
    border-radius: 28px 28px 0 0;
    padding: 8px 20px calc(18px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -24px 56px -18px rgba(15, 23, 42, 0.32);
    animation: mnsUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .mns-grip,
  .mns-sheet .festag-popup-drag-area {
    width: 40px;
    height: 4px;
    margin: 6px auto 16px;
    border-radius: 999px;
    background: rgba(15, 15, 16, 0.14);
    flex-shrink: 0;
  }
  .mns-sheet .festag-popup-drag-area {
    width: auto;
    height: auto;
    margin: 0 0 8px;
    padding: 8px 0 4px;
    display: flex;
    justify-content: center;
    background: transparent;
    border: 0;
    cursor: grab;
  }
  .mns-sheet .festag-popup-drag-handle {
    width: 40px;
    height: 4px;
    border-radius: 999px;
    background: rgba(15, 15, 16, 0.14);
  }
  .mns-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }
  .mns-kicker {
    margin: 0 0 3px;
    font-size: 10px;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #90959f;
  }
  .mns-title {
    margin: 0;
    font-size: 21px;
    font-weight: 400;
    letter-spacing: -0.02em;
    line-height: 1.08;
    color: #0f0f10;
  }
  .mns-close {
    width: 36px;
    height: 36px;
    border: var(--mns-border);
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    color: #4e5567;
    cursor: pointer;
    box-shadow: var(--mns-elev);
    flex-shrink: 0;
    padding: 0;
  }
  .mns-close:active { transform: scale(0.96); }

  .mns-hero {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
    min-height: 68px;
    padding: 14px 14px 14px 12px;
    margin: 0 0 18px;
    border: 0;
    border-radius: 16px;
    text-decoration: none !important;
    color: #ffffff !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.16),
      0 10px 28px -12px rgba(91, 100, 125, 0.55);
    -webkit-tap-highlight-color: transparent;
  }
  .mns-hero.on {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 0 0 2px rgba(91, 100, 125, 0.28),
      0 10px 28px -12px rgba(91, 100, 125, 0.55);
  }
  .mns-hero:active { transform: scale(0.99); }
  .mns-hero-icon {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.15);
    flex-shrink: 0;
  }
  .mns-hero-copy {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1 1 auto;
    min-width: 0;
  }
  .mns-hero-copy strong {
    display: block;
    font-size: 15px;
    font-weight: 400;
    letter-spacing: 0.005em;
    color: #ffffff;
  }
  .mns-hero-copy small {
    display: block;
    font-size: 12px;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.74);
  }
  .mns-hero-caret {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mns-section {
    margin: 0 0 10px 2px;
    font-size: 10px;
    font-weight: 400;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #90959f;
  }
  .mns-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 18px;
  }
  .mns-tile {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
    min-height: 84px;
    padding: 12px 12px 11px;
    border-radius: 14px;
    border: var(--mns-border);
    background: #ffffff !important;
    color: #0f0f10 !important;
    text-decoration: none !important;
    box-shadow: var(--mns-elev);
    -webkit-tap-highlight-color: transparent;
  }
  .mns-tile:active { transform: scale(0.98); background: #fafafa !important; }
  .mns-tile.on {
    background: #f8f8fa !important;
    box-shadow: var(--mns-elev), inset 0 0 0 1px rgba(91, 100, 125, 0.18);
  }
  .mns-tile-icon {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    color: #2a3032;
  }
  .mns-tile-label {
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0.005em;
    line-height: 1.15;
  }

  .mns-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 14px;
    border-radius: 14px;
    border: var(--mns-border);
    background: #ffffff;
    box-shadow: var(--mns-elev);
    overflow: hidden;
  }
  .mns-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 50px;
    padding: 0 12px 0 10px;
    background: #ffffff !important;
    color: #2a3032 !important;
    text-decoration: none !important;
    -webkit-tap-highlight-color: transparent;
  }
  .mns-row.has-divider {
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }
  .mns-row:active { background: #fafafa !important; }
  .mns-row.on { background: #f8f8fa !important; color: #0f0f10 !important; }
  .mns-row-icon {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    flex-shrink: 0;
    color: #2a3032;
  }
  .mns-row-label {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0.005em;
  }
  .mns-row-caret {
    width: 14px;
    height: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #b8bcc6;
  }

  .mns-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 12px;
    margin-top: 2px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }
  .mns-settings {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 6px 2px;
    color: #6e717e !important;
    text-decoration: none !important;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0.005em;
    flex: 1 1 auto;
    min-width: 0;
  }
  .mns-settings.on { color: #0f0f10 !important; }
  .mns-settings:active { opacity: 0.72; }

  .mns-theme {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    padding: 3px;
    border-radius: 999px;
    border: var(--mns-border);
    background: #ffffff;
    box-shadow: var(--mns-elev);
  }
  .mns-theme button {
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: #90959f;
    cursor: pointer;
    padding: 0;
    transition: background 0.14s ease, color 0.14s ease, box-shadow 0.14s ease;
  }
  .mns-theme button.on {
    background: #f3f4f6;
    color: #2a3032;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 1),
      0 1px 2px rgba(144, 149, 159, 0.14);
  }
  .mns-theme button:active { transform: scale(0.94); }

  [data-theme='dark'] .mns-sheet,
  [data-theme='classic-dark'] .mns-sheet {
    color-scheme: dark;
    --mns-border: 1px solid rgba(255, 255, 255, 0.08);
    --mns-elev: none;
    background: var(--festag-black-popup, #121214);
    color: var(--portal-text, #f4f4f4);
    box-shadow: 0 -24px 56px -18px rgba(0, 0, 0, 0.55);
  }
  [data-theme='dark'] .mns-kicker,
  [data-theme='classic-dark'] .mns-kicker,
  [data-theme='dark'] .mns-section,
  [data-theme='classic-dark'] .mns-section {
    color: #9aa0ac;
  }
  [data-theme='dark'] .mns-title,
  [data-theme='classic-dark'] .mns-title {
    color: #f4f4f4;
  }
  [data-theme='dark'] .mns-close,
  [data-theme='classic-dark'] .mns-close {
    background: rgba(255, 255, 255, 0.06);
    color: #c8ccd4;
    box-shadow: none;
  }
  [data-theme='dark'] .mns-sheet .festag-popup-drag-handle,
  [data-theme='classic-dark'] .mns-sheet .festag-popup-drag-handle,
  [data-theme='dark'] .mns-grip,
  [data-theme='classic-dark'] .mns-grip {
    background: rgba(255, 255, 255, 0.18);
  }
  [data-theme='dark'] .mns-group,
  [data-theme='classic-dark'] .mns-group,
  [data-theme='dark'] .mns-tile,
  [data-theme='classic-dark'] .mns-tile {
    background: rgba(255, 255, 255, 0.04) !important;
    box-shadow: none;
  }
  [data-theme='dark'] .mns-row,
  [data-theme='classic-dark'] .mns-row {
    background: transparent !important;
    color: #e8eaed !important;
  }
  [data-theme='dark'] .mns-row.has-divider,
  [data-theme='classic-dark'] .mns-row.has-divider {
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }
  [data-theme='dark'] .mns-row:active,
  [data-theme='classic-dark'] .mns-row:active,
  [data-theme='dark'] .mns-row.on,
  [data-theme='classic-dark'] .mns-row.on {
    background: rgba(255, 255, 255, 0.06) !important;
  }
  [data-theme='dark'] .mns-row-icon,
  [data-theme='classic-dark'] .mns-row-icon,
  [data-theme='dark'] .mns-tile-icon,
  [data-theme='classic-dark'] .mns-tile-icon {
    background: rgba(255, 255, 255, 0.08);
    color: #f4f4f4;
  }
  [data-theme='dark'] .mns-row-caret,
  [data-theme='classic-dark'] .mns-row-caret {
    color: #6e717e;
  }
  [data-theme='dark'] .mns-foot,
  [data-theme='classic-dark'] .mns-foot {
    border-top-color: rgba(255, 255, 255, 0.08);
  }
  [data-theme='dark'] .mns-settings,
  [data-theme='classic-dark'] .mns-settings {
    color: #9aa0ac !important;
  }
  [data-theme='dark'] .mns-settings.on,
  [data-theme='classic-dark'] .mns-settings.on {
    color: #f4f4f4 !important;
  }
  [data-theme='dark'] .mns-theme,
  [data-theme='classic-dark'] .mns-theme {
    background: rgba(255, 255, 255, 0.06);
    box-shadow: none;
  }
  [data-theme='dark'] .mns-theme button.on,
  [data-theme='classic-dark'] .mns-theme button.on {
    background: rgba(255, 255, 255, 0.12);
    color: #f4f4f4;
    box-shadow: none;
  }

  @keyframes mnsFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes mnsUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`
