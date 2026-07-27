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
      --dms-bg: var(--festag-portal-canvas, #FCFCFC);
      --dms-text: #0f0f10;
      --dms-text-dim: rgba(15, 15, 16, 0.14);
      --dms-text-near: rgba(15, 15, 16, 0.28);
      --dms-text-far: rgba(15, 15, 16, 0.1);
      --dms-wave: #cacfd4;
      --dms-sheet-bg: var(--festag-portal-sheet, var(--raised, #FAFAFA));
      --dms-row-title: #0f0f10;
      --dms-row-link: #90959f;
      --dms-sheet-shadow: 0 -8px 32px rgba(144, 149, 159, 0.14);
      --dms-fade-bg: var(--festag-portal-canvas, #FCFCFC);

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
      --dms-bg: var(--festag-black-canvas, #0B0F0D);
      --dms-text: var(--festag-night-ink, #F5F8F6);
      --dms-text-dim: rgba(232, 232, 238, 0.14);
      --dms-text-near: rgba(232, 232, 238, 0.36);
      --dms-text-far: rgba(232, 232, 238, 0.10);
      --dms-wave: rgba(232, 232, 238, 0.32);
      --dms-sheet-bg: var(--festag-black-popup, #1A2521);
      --dms-row-title: var(--festag-night-ink, #F5F8F6);
      --dms-row-link: var(--festag-night-ink-3, rgba(232, 232, 238, 0.38));
      --dms-sheet-shadow: 0 -12px 40px rgba(0, 0, 0, 0.62);
      --dms-fade-bg: #0B0F0D;
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
      width: var(--festag-mobile-control-height-compact, 44px);
      height: var(--festag-mobile-control-height-compact, 44px);
      flex-shrink: 0;
    }

    .dms-title {
      margin: 0;
      font-size: 26px;
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
      max-height: none;
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
      max-height: none;
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
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--dms-sheet-bg);
      border-radius: 18px 18px 0 0;
      box-shadow: var(--dms-sheet-shadow);
      padding:
        10px 16px
        calc(14px + env(safe-area-inset-bottom, 0px));
    }

    .dms-grip {
      width: 36px;
      height: 4px;
      margin-bottom: 14px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.12);
      flex-shrink: 0;
      cursor: grab;
      touch-action: none;
    }
    [data-theme='dark'] .dms-grip,
    [data-theme='classic-dark'] .dms-grip {
      background: rgba(255, 255, 255, 0.16);
    }

    .dms-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }

    .dms-ctrl {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: #f5f5f7;
      color: #5c5c62;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s ease, transform 0.12s ease, color 0.15s ease;
    }
    .dms-ctrl:active { transform: scale(0.96); }
    .dms-ctrl:disabled { opacity: 0.45; cursor: not-allowed; }

    .dms-ctrl--filter {
      width: 48px;
      height: 48px;
      border-radius: 12px;
    }
    .dms-ctrl--filter.on {
      background: #0f0f10;
      color: #f5f5f7;
      border-color: transparent;
    }

    .dms-ctrl--play {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #0f0f10;
      color: #f5f5f7;
      border-color: transparent;
      box-shadow: 0 4px 16px rgba(15, 15, 16, 0.22);
    }

    .dms-ctrl--mute {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: transparent;
      border-color: transparent;
      color: #8a8f9a;
    }

    .dms-volume {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      height: 48px;
      padding: 0 8px 0 4px;
      border-radius: 12px;
      background: #f5f5f7;
      border: 1px solid rgba(15, 23, 42, 0.08);
    }

    .dms-volume-slider {
      flex: 1 1 auto;
      min-width: 0;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(15, 15, 16, 0.14);
      border-radius: 999px;
      outline: none;
    }
    .dms-volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #0f0f10;
      border: 0;
      cursor: pointer;
    }
    .dms-volume-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #0f0f10;
      border: 0;
      cursor: pointer;
    }

    [data-theme='dark'] .dms-ctrl,
    [data-theme='classic-dark'] .dms-ctrl {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.08);
      color: var(--festag-night-ink-2, rgba(232, 232, 238, 0.55));
    }
    [data-theme='dark'] .dms-ctrl--filter.on,
    [data-theme='classic-dark'] .dms-ctrl--filter.on {
      background: #2E9B52;
      color: #FFFFFF;
      border-radius: 999px;
      border-color: transparent;
    }
    [data-theme='dark'] .dms-ctrl--play,
    [data-theme='classic-dark'] .dms-ctrl--play {
      background: #2E9B52;
      color: #FFFFFF;
      border-radius: 999px;
      box-shadow: none;
    }
    [data-theme='dark'] .dms-ctrl--mute,
    [data-theme='classic-dark'] .dms-ctrl--mute {
      background: transparent;
      border-color: transparent;
      color: var(--festag-night-ink-3, rgba(232, 232, 238, 0.38));
    }
    [data-theme='dark'] .dms-volume,
    [data-theme='classic-dark'] .dms-volume {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.07);
    }
    [data-theme='dark'] .dms-volume-slider,
    [data-theme='classic-dark'] .dms-volume-slider {
      background: rgba(255, 255, 255, 0.14);
    }
    [data-theme='dark'] .dms-volume-slider::-webkit-slider-thumb,
    [data-theme='classic-dark'] .dms-volume-slider::-webkit-slider-thumb,
    [data-theme='dark'] .dms-volume-slider::-moz-range-thumb,
    [data-theme='classic-dark'] .dms-volume-slider::-moz-range-thumb {
      background: #F5F8F6;
    }

    .dms-filter {
      position: fixed;
      inset: 0;
      z-index: 600;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    .dms-filter-backdrop {
      position: absolute;
      inset: 0;
      border: 0;
      background: rgba(0, 0, 0, 0.55);
      cursor: pointer;
    }
    .dms-filter-sheet {
      position: relative;
      z-index: 1;
      max-height: min(72vh, 560px);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      background: var(--dms-sheet-bg);
      border-radius: 18px 18px 0 0;
      padding:
        18px 18px
        calc(20px + env(safe-area-inset-bottom, 0px));
      box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.35);
    }
    .dms-filter-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }
    .dms-filter-title {
      margin: 0;
      font-size: 26px;
      font-weight: 400;
      letter-spacing: -0.5px;
      line-height: 1.1;
      color: var(--dms-text);
    }
    .dms-filter-close {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 12px;
      background: rgba(15, 15, 16, 0.06);
      color: var(--dms-text);
      cursor: pointer;
    }
    [data-theme='dark'] .dms-filter-close,
    [data-theme='classic-dark'] .dms-filter-close {
      background: rgba(255, 255, 255, 0.06);
    }
    .dms-filter-label {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: -0.01em;
      color: var(--dms-text-near);
    }
    .dms-filter-list {
      list-style: none;
      margin: 0 0 20px;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .dms-filter-item {
      width: 100%;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border: 0;
      border-radius: 12px;
      background: transparent;
      color: var(--dms-text);
      font: inherit;
      font-size: 16px;
      letter-spacing: -0.015em;
      text-align: left;
      cursor: pointer;
    }
    .dms-filter-item:hover,
    .dms-filter-item.on {
      background: rgba(15, 15, 16, 0.05);
    }
    [data-theme='dark'] .dms-filter-item:hover,
    [data-theme='classic-dark'] .dms-filter-item:hover,
    [data-theme='dark'] .dms-filter-item.on,
    [data-theme='classic-dark'] .dms-filter-item.on {
      background: rgba(255, 255, 255, 0.06);
    }
    .dms-filter-item-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
    body.festag-dashboard-mobile .st-day-desktop {
      display: none !important;
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
