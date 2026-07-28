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
      --dms-sheet-shadow: 0 -8px 32px rgba(24, 24, 27, 0.10);
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
      --dms-bg: var(--festag-black-canvas, #070708);
      --dms-text: var(--festag-night-ink, #E8EAF0);
      --dms-text-dim: rgba(232, 232, 238, 0.14);
      --dms-text-near: rgba(232, 232, 238, 0.36);
      --dms-text-far: rgba(232, 232, 238, 0.10);
      --dms-wave: rgba(232, 232, 238, 0.32);
      --dms-sheet-bg: var(--festag-black-popup, #1A1A1E);
      --dms-row-title: var(--festag-night-ink, #E8EAF0);
      --dms-row-link: var(--festag-night-ink-3, rgba(232, 232, 238, 0.38));
      --dms-sheet-shadow: 0 -12px 40px rgba(0, 0, 0, 0.62);
      --dms-fade-bg: #070708;
    }

    .dms-top {
      flex-shrink: 0;
      padding:
        calc(16px + env(safe-area-inset-top, 0px))
        20px
        8px;
      background: var(--dms-bg);
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
      font-size: 28px;
      font-weight: 500;
      letter-spacing: -0.03em;
      line-height: 1.15;
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

    .dms-lyrics-host {
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      --wsb-shell-bg: var(--dms-fade-bg);
      --wsb-prose-size: 20px;
      --wsb-line-height: 1.45;
      --wsb-lines-visible: 6;
      --wsb-prose-max-width: min(100%, 340px);
      --wsb-viewport-height: calc(var(--wsb-prose-size) * var(--wsb-line-height) * var(--wsb-lines-visible));
    }

    .dms-empty-btn {
      width: 100%;
      border: 0;
      background: transparent;
      padding: 24px 8px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      font: inherit;
      color: inherit;
    }
    .dms-empty-btn:disabled {
      cursor: default;
    }

    .dms .wsb-lyrics-mask {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dms .wsb-lyrics-stage {
      position: relative;
      width: var(--wsb-prose-max-width);
      max-width: 100%;
      height: var(--wsb-viewport-height);
      overflow: hidden;
      -webkit-mask-image: linear-gradient(
        180deg,
        transparent 0%,
        rgba(0, 0, 0, 0.35) 8%,
        #000 22%,
        #000 78%,
        rgba(0, 0, 0, 0.4) 92%,
        transparent 100%
      );
      mask-image: linear-gradient(
        180deg,
        transparent 0%,
        rgba(0, 0, 0, 0.35) 8%,
        #000 22%,
        #000 78%,
        rgba(0, 0, 0, 0.4) 92%,
        transparent 100%
      );
      overscroll-behavior: contain;
    }

    .dms .wsb-lyrics-stage--manual {
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .dms .wsb-lyrics-stage--manual::-webkit-scrollbar { display: none; }

    .dms .wsb-lyrics-stage::before,
    .dms .wsb-lyrics-stage::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      z-index: 2;
      pointer-events: none;
    }
    .dms .wsb-lyrics-stage::before {
      top: 0;
      height: 48%;
      background: linear-gradient(
        180deg,
        var(--wsb-shell-bg) 0%,
        color-mix(in srgb, var(--wsb-shell-bg) 72%, transparent) 40%,
        transparent 100%
      );
    }
    .dms .wsb-lyrics-stage::after {
      bottom: 0;
      height: 28%;
      background: linear-gradient(
        0deg,
        var(--wsb-shell-bg) 0%,
        color-mix(in srgb, var(--wsb-shell-bg) 55%, transparent) 55%,
        transparent 100%
      );
    }

    .dms .wsb-lyrics-track {
      width: 100%;
      padding: calc(var(--wsb-viewport-height) * 0.2) 0 calc(var(--wsb-viewport-height) * 1.35) 0;
      box-sizing: border-box;
      will-change: transform;
      transition: transform 0.78s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .dms .wsb-prose {
      margin: 0 auto;
      width: 100%;
      text-align: center;
      font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
      font-size: var(--wsb-prose-size);
      font-weight: 400;
      line-height: var(--wsb-line-height);
      letter-spacing: -0.02em;
      color: var(--dms-text);
      -webkit-font-smoothing: antialiased;
    }

    .dms .wsb-prose-word {
      display: inline;
      color: var(--dms-text-near);
      transition:
        opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1),
        color 0.38s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .dms .wsb-lyrics-stage--idle .wsb-prose-word--lead {
      color: var(--dms-text);
      opacity: 0.82;
    }
    .dms .wsb-lyrics-stage--idle .wsb-prose-word--future {
      color: var(--dms-text-dim);
      opacity: 0.55;
    }
    .dms .wsb-prose-word--future,
    .dms .wsb-prose-word--adjacent {
      color: var(--dms-text-dim);
      opacity: 0.42;
    }
    .dms .wsb-prose-word--past {
      color: var(--dms-text-near);
      opacity: 0.55;
    }
    .dms .wsb-prose-word--active.wsb-prose-word--pending {
      color: var(--dms-text-dim);
      opacity: 0.48;
    }
    .dms .wsb-prose-word--active.wsb-prose-word--spoken,
    .dms .wsb-prose-word--active.wsb-prose-word--current {
      color: var(--dms-text);
      opacity: 1;
    }
    .dms .wsb-lyrics-stage--live .wsb-prose-word--past {
      color: var(--dms-text-near);
      opacity: 0.5;
    }

    .dms-empty {
      margin: 0;
      padding: 32px 8px;
      text-align: center;
      font-size: 18px;
      line-height: 1.45;
      letter-spacing: -0.02em;
      color: var(--dms-text-near);
    }

    .dms-sheet {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
      background: var(--dms-sheet-bg);
      border-radius: var(--festag-sheet-radius, 18px) var(--festag-sheet-radius, 18px) 0 0;
      box-shadow: var(--dms-sheet-shadow);
      border-top: 1px solid rgba(15, 23, 42, 0.04);
      padding: 10px 16px calc(16px + env(safe-area-inset-bottom, 0px));
    }
    [data-theme='dark'] .dms-sheet,
    [data-theme='classic-dark'] .dms-sheet {
      border-top-color: rgba(255, 255, 255, 0.05);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.04),
        0 -12px 40px rgba(0, 0, 0, 0.62);
    }

    .dms-grip {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 28px;
      margin: 0 0 8px;
      padding: 10px 0 6px;
      box-sizing: border-box;
      border-radius: 0;
      background: transparent;
      flex-shrink: 0;
      cursor: grab;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
    }
    .dms-grip::after {
      content: '';
      width: 40px;
      height: 4px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.12);
    }
    [data-theme='dark'] .dms-grip::after,
    [data-theme='classic-dark'] .dms-grip::after {
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
      border: 1px solid rgba(30, 30, 32, 0.08);
      background: #ffffff;
      color: #1e1e20;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease, color 0.15s ease;
    }
    .dms-ctrl:active {
      transform: scale(0.98);
      box-shadow: none;
      background: #f5f5f6;
    }
    .dms-ctrl:disabled { opacity: 0.45; cursor: not-allowed; }

    .dms-ctrl--filter {
      width: 52px;
      height: 52px;
      border-radius: var(--festag-control-radius, 8px);
      background: #f5f5f7;
      color: #8e8e93;
    }
    .dms-ctrl--filter.on {
      background: #ffffff;
      color: #1e1e20;
      border-color: rgba(30, 30, 32, 0.08);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .dms-ctrl--play {
      width: 52px;
      height: 52px;
      border-radius: var(--festag-control-radius, 8px);
      background: #ffffff;
      color: #1e1e20;
      border-color: rgba(30, 30, 32, 0.08);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .dms-ctrl--mute {
      width: 36px;
      height: 36px;
      border-radius: var(--festag-control-radius, 8px);
      background: transparent;
      border-color: transparent;
      box-shadow: none;
      color: #8e8e93;
    }
    .dms-ctrl--mute:active {
      background: rgba(15, 23, 42, 0.04);
    }

    .dms-volume {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      height: 52px;
      padding: 0 10px 0 4px;
      border-radius: var(--festag-control-radius, 8px);
      background: #f5f5f7;
      border: 1px solid rgba(30, 30, 32, 0.08);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .dms-volume-slider {
      flex: 1 1 auto;
      min-width: 0;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(30, 30, 32, 0.14);
      border-radius: 999px;
      outline: none;
    }
    .dms-volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #1e1e20;
      border: 0;
      cursor: pointer;
    }
    .dms-volume-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #1e1e20;
      border: 0;
      cursor: pointer;
    }

    [data-theme='dark'] .dms-ctrl,
    [data-theme='classic-dark'] .dms-ctrl {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.07);
      color: var(--festag-night-ink-2, rgba(232, 232, 238, 0.55));
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    }
    [data-theme='dark'] .dms-ctrl:active,
    [data-theme='classic-dark'] .dms-ctrl:active {
      background: rgba(255, 255, 255, 0.08);
      box-shadow: none;
    }
    [data-theme='dark'] .dms-ctrl--filter.on,
    [data-theme='classic-dark'] .dms-ctrl--filter.on {
      background: var(--festag-btn-dark-bg, #F0F2F5);
      color: var(--festag-btn-dark-fg, #1A1A1E);
      border-color: transparent;
      box-shadow: none;
    }
    [data-theme='dark'] .dms-ctrl--play,
    [data-theme='classic-dark'] .dms-ctrl--play {
      background: var(--festag-btn-dark-bg, #F0F2F5);
      color: var(--festag-btn-dark-fg, #1A1A1E);
      border-color: transparent;
      box-shadow: none;
    }
    [data-theme='dark'] .dms-ctrl--mute,
    [data-theme='classic-dark'] .dms-ctrl--mute {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
      color: var(--festag-night-ink-3, rgba(232, 232, 238, 0.38));
    }
    [data-theme='dark'] .dms-volume,
    [data-theme='classic-dark'] .dms-volume {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.07);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    }
    [data-theme='dark'] .dms-volume-slider,
    [data-theme='classic-dark'] .dms-volume-slider {
      background: rgba(255, 255, 255, 0.14);
    }
    [data-theme='dark'] .dms-volume-slider::-webkit-slider-thumb,
    [data-theme='classic-dark'] .dms-volume-slider::-webkit-slider-thumb,
    [data-theme='dark'] .dms-volume-slider::-moz-range-thumb,
    [data-theme='classic-dark'] .dms-volume-slider::-moz-range-thumb {
      background: #E8EAF0;
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
      border-radius: var(--festag-sheet-radius, 18px) var(--festag-sheet-radius, 18px) 0 0;
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
    .dms-wave-bars span,
    .dms .wsb-lyrics-track,
    .dms .wsb-prose-word {
      transition: none;
      animation: none !important;
    }
  }
`
