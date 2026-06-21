import { MOBILE_PAGE_DOCK_CSS } from '@/components/mobile/mobile-page-dock-styles'
import { CODEX_ORB_CSS } from '@/components/mobile/codex-mobile-styles'

/** Mobile Statusabfrage — Figma 252:59 (Gesamtbericht / Startbildschirm). */
export const DASHBOARD_MOBILE_CSS = `
  ${CODEX_ORB_CSS}
  ${MOBILE_PAGE_DOCK_CSS}

  .dms {
    display: none;
  }

  @media (max-width: 768px) {
    .dms {
      --dms-bg: #fcfcfc;
      --dms-text: #0f0f10;
      --dms-text-dim: rgba(15, 15, 16, 0.22);
      --dms-text-near: rgba(15, 15, 16, 0.38);
      --dms-dot: #cacfd4;
      --dms-sheet-bg: #ffffff;
      --dms-row-title: #0f0f10;
      --dms-row-link: #90959f;
      --dms-sheet-shadow: 0 -8px 32px rgba(144, 149, 159, 0.14);

      display: flex;
      flex-direction: column;
      position: fixed;
      inset: 0;
      z-index: 500;
      width: 100%;
      max-width: 430px;
      margin: 0 auto;
      background: var(--dms-bg);
      color: var(--dms-text);
      font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
      overflow: hidden;
    }

    [data-theme='dark'] .dms,
    [data-theme='classic-dark'] .dms {
      --dms-bg: var(--portal-bg, #0d0d0f);
      --dms-text: #f4f4f4;
      --dms-text-dim: rgba(255, 255, 255, 0.22);
      --dms-text-near: rgba(255, 255, 255, 0.42);
      --dms-dot: rgba(255, 255, 255, 0.35);
      --dms-sheet-bg: #1c1c1e;
      --dms-row-title: #f4f4f4;
      --dms-row-link: #9aa0ac;
      --dms-sheet-shadow: 0 -8px 32px rgba(0, 0, 0, 0.42);
    }

    .dms-top {
      flex-shrink: 0;
      padding:
        calc(20px + env(safe-area-inset-top, 0px))
        20px
        12px;
    }

    .dms-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .dms-title {
      margin: 0;
      font-size: 29px;
      font-weight: 400;
      letter-spacing: -0.5px;
      line-height: 1.02;
      color: var(--dms-text);
    }

    .dms-head-actions {
      flex-shrink: 0;
      padding-top: 2px;
    }

    .dms .cx-action-pill {
      background: #ffffff !important;
      border: 1px solid rgba(0, 0, 0, 0.07) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 1),
        0 1px 0 rgba(0, 0, 0, 0.04),
        0 4px 10px rgba(144, 149, 159, 0.16) !important;
    }

    [data-theme='dark'] .dms .cx-action-pill,
    [data-theme='classic-dark'] .dms .cx-action-pill {
      background: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
    }

    .dms-stage {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      padding: 0 24px 16px;
    }

    .dms-lyrics-btn {
      width: 100%;
      border: 0;
      background: transparent;
      padding: 0;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      font: inherit;
      color: inherit;
    }
    .dms-lyrics-btn:disabled {
      cursor: default;
    }

    .dms-lyrics-mask {
      width: 100%;
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        #000 20%,
        #000 80%,
        transparent 100%
      );
      mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        #000 20%,
        #000 80%,
        transparent 100%
      );
    }

    .dms-lyrics {
      height: 108px;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: none;
      scroll-behavior: smooth;
    }
    .dms-lyrics::-webkit-scrollbar {
      display: none;
    }

    .dms-flow {
      padding: 24px 8px;
    }

    .dms-line {
      margin: 0;
      text-align: center;
      font-size: 20px;
      font-weight: 400;
      line-height: 1.45;
      letter-spacing: -0.01em;
      color: var(--dms-text-dim);
      transition: color 0.35s ease;
    }
    .dms-line.near {
      color: var(--dms-text-near);
    }
    .dms-line.on {
      color: var(--dms-text);
    }

    .dms-empty {
      margin: 0;
      padding: 20px 12px;
      text-align: center;
      font-size: 18px;
      line-height: 1.45;
      letter-spacing: -0.01em;
      color: var(--dms-text-near);
    }

    .dms-sheet {
      position: relative;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      background: var(--dms-sheet-bg);
      border-radius: 36px 36px 0 0;
      box-shadow: var(--dms-sheet-shadow);
      padding: 10px 16px 16px;
      padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }

    .dms-sheet .mpd-grip {
      align-self: center;
      margin-bottom: 18px;
    }

    .dms-rows {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 0 4px 20px;
    }

    .dms-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dms-row-title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      letter-spacing: -0.01em;
      line-height: 1.3;
      color: var(--dms-row-title);
    }

    .dms-row-link {
      font-size: 14px;
      font-weight: 400;
      letter-spacing: 0.005em;
      color: var(--dms-row-link);
      text-decoration: none;
    }

    .dms-row-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 4px 0 2px;
    }

    .dms-row-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-decoration: none;
      color: inherit;
    }

    .dms-row-item-title {
      font-size: 13px;
      color: var(--dms-text);
      line-height: 1.35;
    }

    .dms-row-item-meta {
      font-size: 11px;
      color: var(--dms-row-link);
    }

    .dms-activity-line {
      margin: 0;
      font-size: 13px;
      line-height: 1.45;
      color: var(--dms-row-link);
    }

    .dms-dock-wrap {
      position: relative;
    }

    .dms-drag-hint {
      position: absolute;
      right: 6px;
      bottom: calc(100% + 10px);
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1.5px dashed rgba(0, 0, 0, 0.16);
      border-radius: 999px;
      background: transparent;
      color: #90959f;
      padding: 0;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    [data-theme='dark'] .dms-drag-hint,
    [data-theme='classic-dark'] .dms-drag-hint {
      border-color: rgba(255, 255, 255, 0.22);
      color: #9aa0ac;
    }

    .dms-sheet .mpd-row {
      position: relative;
    }

    .dms-menu-backdrop {
      position: fixed;
      inset: 0;
      z-index: 520;
      background: rgba(0, 0, 0, 0.35);
      border: 0;
      padding: 0;
      cursor: default;
    }

    .dms-menu {
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 60px);
      right: 20px;
      z-index: 521;
      min-width: 220px;
      padding: 8px;
      border-radius: 16px;
      background: var(--dms-sheet-bg);
      box-shadow: 0 16px 48px rgba(15, 23, 42, 0.18);
      font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    }

    .dms-menu-head {
      margin: 6px 10px 4px;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--dms-row-link);
    }

    .dms-menu-item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-height: 40px;
      padding: 0 12px;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--dms-text);
      font: inherit;
      font-size: 14px;
      font-weight: 400;
      text-align: left;
      cursor: pointer;
    }
    .dms-menu-item.on {
      background: rgba(15, 15, 16, 0.06);
    }
    [data-theme='dark'] .dms-menu-item.on,
    [data-theme='classic-dark'] .dms-menu-item.on {
      background: rgba(255, 255, 255, 0.08);
    }
    .dms-menu-item:active {
      background: rgba(15, 15, 16, 0.06);
    }

    .dms .mpd-root {
      display: none !important;
    }

    body.festag-portal-dock .dms {
      padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
    }
    body.festag-portal-dock .dms-sheet {
      padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dms-line {
      transition: none;
    }
    .dms-lyrics {
      scroll-behavior: auto;
    }
  }
`
