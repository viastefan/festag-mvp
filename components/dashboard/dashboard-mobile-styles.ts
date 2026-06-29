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
      --dms-text-dim: rgba(15, 15, 16, 0.14);
      --dms-text-near: rgba(15, 15, 16, 0.28);
      --dms-text-far: rgba(15, 15, 16, 0.1);
      --dms-wave: #cacfd4;
      --dms-sheet-bg: var(--raised, #FAFAFA);
      --dms-row-title: #0f0f10;
      --dms-row-link: #90959f;
      --dms-sheet-shadow: 0 -8px 32px rgba(144, 149, 159, 0.14);
      --dms-fade-bg: #fcfcfc;

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
      --dms-bg: var(--festag-black-canvas, #000000);
      --dms-text: #ffffff;
      --dms-text-dim: rgba(255, 255, 255, 0.14);
      --dms-text-near: rgba(255, 255, 255, 0.32);
      --dms-text-far: rgba(255, 255, 255, 0.08);
      --dms-wave: rgba(255, 255, 255, 0.35);
      --dms-sheet-bg: #1c1c1e;
      --dms-row-title: #ffffff;
      --dms-row-link: #8e8e93;
      --dms-sheet-shadow: 0 -8px 32px rgba(0, 0, 0, 0.48);
      --dms-fade-bg: #000000;
    }

    .dms-top {
      flex-shrink: 0;
      padding:
        calc(16px + env(safe-area-inset-top, 0px))
        20px
        8px;
    }

    .dms-head {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
    }

    .dms-nav-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 14px;
    }

    .dms-nav-spacer {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
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
      display: none;
    }

    .dms-stage {
      flex: 1 1 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 8px 28px 12px;
    }

    .dms-wave {
      flex-shrink: 0;
      width: min(100%, 280px);
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.72;
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0%,
        #000 18%,
        #000 82%,
        transparent 100%
      );
      mask-image: linear-gradient(
        to right,
        transparent 0%,
        #000 18%,
        #000 82%,
        transparent 100%
      );
    }

    .dms-wave-bars {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      width: 100%;
      height: 100%;
    }

    .dms-wave-bars span {
      display: block;
      width: 2px;
      height: calc(6px + (var(--i, 0) % 5) * 3px);
      border-radius: 999px;
      background: var(--dms-wave);
      transform-origin: center bottom;
      transition: height 0.24s ease, opacity 0.24s ease;
    }

    .dms-wave--live .dms-wave-bars span {
      animation: dmsWavePulse 1.1s ease-in-out infinite;
      animation-delay: calc(var(--i, 0) * 0.04s);
    }

    @keyframes dmsWavePulse {
      0%, 100% { transform: scaleY(0.55); opacity: 0.45; }
      50% { transform: scaleY(1.35); opacity: 1; }
    }

    .dms-lyrics-btn {
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
      max-height: 220px;
      border: 0;
      background: transparent;
      padding: 0;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      font: inherit;
      color: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dms-lyrics-btn:disabled {
      cursor: default;
    }

    .dms-prompter {
      position: relative;
      width: 100%;
      height: 100%;
      max-height: 200px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .dms-prompter-fade {
      position: absolute;
      left: 0;
      right: 0;
      height: 42%;
      pointer-events: none;
      z-index: 2;
    }

    .dms-prompter-fade--top {
      top: 0;
      background: linear-gradient(
        to bottom,
        var(--dms-fade-bg) 0%,
        color-mix(in srgb, var(--dms-fade-bg) 88%, transparent) 28%,
        color-mix(in srgb, var(--dms-fade-bg) 42%, transparent) 62%,
        transparent 100%
      );
    }

    .dms-prompter-fade--bottom {
      bottom: 0;
      background: linear-gradient(
        to top,
        var(--dms-fade-bg) 0%,
        color-mix(in srgb, var(--dms-fade-bg) 88%, transparent) 28%,
        color-mix(in srgb, var(--dms-fade-bg) 42%, transparent) 62%,
        transparent 100%
      );
    }

    .dms-lyrics {
      position: relative;
      z-index: 1;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: none;
      scroll-behavior: smooth;
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        rgba(0, 0, 0, 0.35) 10%,
        #000 36%,
        #000 64%,
        rgba(0, 0, 0, 0.35) 90%,
        transparent 100%
      );
      mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        rgba(0, 0, 0, 0.35) 10%,
        #000 36%,
        #000 64%,
        rgba(0, 0, 0, 0.35) 90%,
        transparent 100%
      );
    }
    .dms-lyrics::-webkit-scrollbar {
      display: none;
    }

    .dms-flow {
      padding: 48px 4px;
    }

    .dms-line {
      margin: 0;
      padding: 6px 0;
      text-align: center;
      font-size: 18px;
      font-weight: 400;
      line-height: 1.42;
      letter-spacing: -0.02em;
      color: var(--dms-text-dim);
      opacity: 0;
      transform: scale(0.97);
      transition:
        color 0.4s ease,
        opacity 0.4s ease,
        transform 0.4s ease,
        font-size 0.35s ease;
    }
    .dms-line.out {
      opacity: 0;
      max-height: 0;
      padding: 0;
      margin: 0;
      overflow: hidden;
      pointer-events: none;
    }
    .dms-line.far {
      opacity: 0.22;
      color: var(--dms-text-far);
      transform: scale(0.98);
    }
    .dms-line.near {
      opacity: 0.48;
      color: var(--dms-text-near);
      transform: scale(0.99);
    }
    .dms-line.on {
      opacity: 1;
      font-size: 22px;
      line-height: 1.38;
      letter-spacing: -0.025em;
      color: var(--dms-text);
      transform: scale(1);
    }

    .dms-empty {
      margin: 0;
      padding: 32px 8px;
      text-align: center;
      font-size: 20px;
      line-height: 1.42;
      letter-spacing: -0.02em;
      color: var(--dms-text-near);
    }

    .dms-sheet {
      flex: 0 0 auto;
      min-height: 0;
      max-height: min(48vh, 380px);
      display: flex;
      flex-direction: column;
      background: var(--dms-sheet-bg);
      border-radius: 36px 36px 0 0;
      box-shadow: var(--dms-sheet-shadow);
      overflow: hidden;
    }

    .dms-sheet .mpd-root {
      display: flex !important;
      position: relative !important;
      bottom: auto !important;
      left: auto !important;
      right: auto !important;
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
    }

    .dms-sheet .dms-dock-shell {
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding:
        12px 16px
        calc(16px + env(safe-area-inset-bottom, 0px));
    }

    .dms-sheet .mpd-grip {
      width: 36px;
      height: 5px;
      margin-bottom: 20px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.14);
      flex-shrink: 0;
    }

    [data-theme='dark'] .dms-sheet .mpd-grip,
    [data-theme='classic-dark'] .dms-sheet .mpd-grip {
      background: rgba(255, 255, 255, 0.24);
    }

    .dms-rows {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 0 4px 18px;
      margin-bottom: 4px;
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

    .dms-sheet .mpd-row {
      flex-shrink: 0;
    }

    body.festag-dashboard-mobile .portal-app-main-col {
      margin-left: 0 !important;
      padding: 0 !important;
    }
    body.festag-dashboard-mobile .portal-app-main {
      border-radius: 0 !important;
      border: 0 !important;
      background: transparent !important;
    }
    body.festag-dashboard-mobile .dash-calm {
      background: transparent !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dms-line,
    .dms-wave-bars span {
      transition: none;
      animation: none !important;
    }
    .dms-lyrics {
      scroll-behavior: auto;
    }
  }
`
