/** Floating Statusbericht mini-player + expand sheet. */

import { FESTAG_SHEET_MS } from '@/lib/festag-sheet-motion'

export const STATUS_MINI_PLAYER_CSS = `
.smp-mini {
  position: fixed;
  right: max(20px, env(safe-area-inset-right, 0px));
  bottom: max(20px, env(safe-area-inset-bottom, 0px));
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 220px;
  max-width: min(320px, calc(100vw - 40px));
  height: 64px;
  padding: 0 10px 0 10px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: #ffffff;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 10px 28px rgba(15, 23, 42, 0.08);
  color: #1e1e20;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.18s ease;
}
.smp-mini:hover {
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 14px 32px rgba(15, 23, 42, 0.1);
  transform: translateY(-1px);
}
.smp-mini:active {
  transform: translateY(0);
}

[data-theme='dark'] .smp-mini,
[data-theme='classic-dark'] .smp-mini {
  background: var(--festag-black-popup, #1A1A1E);
  border-color: rgba(255, 255, 255, 0.08);
  color: var(--festag-night-ink, #E8EAF0);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
}

.smp-mini-play {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid rgba(30, 30, 32, 0.08);
  background: #ffffff;
  color: #1e1e20;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.12s ease;
}
.smp-mini-play:hover { background: #fafafa; }
.smp-mini-play:active { background: #f5f5f6; box-shadow: none; }
.smp-mini-play svg { margin-left: 2px; }
.smp-mini-play--pause svg { margin-left: 0; }

[data-theme='dark'] .smp-mini-play,
[data-theme='classic-dark'] .smp-mini-play {
  background: rgba(186, 194, 210, 0.08);
  color: rgba(245, 245, 247, 0.88);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
[data-theme='dark'] .smp-mini-play:hover,
[data-theme='classic-dark'] .smp-mini-play:hover {
  background: rgba(186, 194, 210, 0.09);
}

.smp-mini-copy {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  pointer-events: none;
}
.smp-mini-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 400;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.smp-mini-meta {
  margin: 0;
  font-size: 12px;
  color: #8891a0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
[data-theme='dark'] .smp-mini-meta,
[data-theme='classic-dark'] .smp-mini-meta {
  color: rgba(245, 245, 247, 0.55);
}

.smp-mini-progress {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 0;
  height: 2px;
  border-radius: 999px;
  background: rgba(30, 30, 32, 0.06);
  overflow: hidden;
  pointer-events: none;
}
[data-theme='dark'] .smp-mini-progress,
[data-theme='classic-dark'] .smp-mini-progress {
  background: rgba(255, 255, 255, 0.08);
}
.smp-mini-progress-fill {
  height: 100%;
  background: currentColor;
  opacity: 0.45;
  border-radius: inherit;
  transition: width 0.2s linear;
}

/* Desktop mini only — mobile uses .smp-fab */
@media (max-width: 768px) {
  .smp-mini {
    display: none !important;
  }
}

/* ── Mobile center Play (no frame chrome beyond soft circle) ── */
.smp-fab {
  display: none;
}
@media (max-width: 768px) {
  .smp-fab {
    position: fixed;
    left: 50%;
    bottom: calc(28px + env(safe-area-inset-bottom, 0px));
    z-index: 60;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: #ffffff;
    color: #1e1e20;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 10px 28px rgba(15, 23, 42, 0.12);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transform: translate3d(-50%, 0, 0);
    transition:
      transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.18s ease,
      background 0.12s ease;
  }
  .smp-fab svg { margin-left: 3px; }
  .smp-fab:hover {
    background: #fafafa;
    transform: translate3d(-50%, -1px, 0);
  }
  .smp-fab:active {
    background: #f5f5f6;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    transform: translate3d(-50%, 0, 0) scale(0.97);
  }
  .smp-fab:disabled {
    opacity: 0.45;
    cursor: default;
  }
  [data-theme='dark'] .smp-fab,
  [data-theme='classic-dark'] .smp-fab {
    background: rgba(186, 194, 210, 0.1);
    color: rgba(245, 245, 247, 0.92);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
  }
  [data-theme='dark'] .smp-fab:hover,
  [data-theme='classic-dark'] .smp-fab:hover {
    background: rgba(186, 194, 210, 0.14);
  }

  /* Above page dock when present */
  body:has(.mpd-root) .smp-fab {
    bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  }

  /* Dashboard mobile teleprompter owns the screen */
  body.festag-dashboard-mobile .smp-fab {
    display: none !important;
  }

  /* Yield to open player / Tagro */
  body.festag-status-player-open .smp-fab,
  body.festag-status-player-open .mpd-root,
  body:has(.portal-tagro-fullscreen) .smp-fab {
    display: none !important;
  }
  body.festag-status-player-open .mpd-root {
    pointer-events: none;
    opacity: 0;
  }
}

body:has(.portal-tagro-fullscreen) .smp-mini,
body:has(.portal-tagro-fullscreen) .smp-host,
body:has(.portal-tagro-fullscreen) .smp-fab {
  display: none !important;
}

/* ── Expand sheet (no dark scrim) ── */
.smp-host {
  position: fixed;
  inset: 0;
  z-index: 70;
  pointer-events: none;
}
.smp-host.is-visible {
  pointer-events: auto;
}

.smp-sheet {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: min(720px, 100%);
  max-height: min(92vh, 900px);
  height: min(88vh, 860px);
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 0 0;
  background: var(--festag-plate-bg, #ffffff);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-bottom: 0;
  box-shadow: 0 -16px 48px rgba(15, 23, 42, 0.1);
  transform: translate3d(-50%, 110%, 0);
  opacity: 0.96;
  transition:
    transform ${FESTAG_SHEET_MS}ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity ${FESTAG_SHEET_MS}ms cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  pointer-events: auto;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  color: #1e1e20;
  --wsb-shell-bg: var(--festag-plate-bg, #ffffff);
  --wsb-prose-size: clamp(20px, 2.2vw, 26px);
  --wsb-line-height: 1.45;
  --wsb-lines-visible: 7;
  --wsb-prose-max-width: min(480px, 86vw);
  --wsb-viewport-height: calc(var(--wsb-prose-size) * var(--wsb-line-height) * var(--wsb-lines-visible));
}
.smp-host.is-visible .smp-sheet {
  transform: translate3d(-50%, 0, 0);
  opacity: 1;
}
.smp-host:not(.is-visible) .smp-sheet {
  transition:
    transform ${FESTAG_SHEET_MS}ms cubic-bezier(0.32, 0.72, 0, 1),
    opacity ${FESTAG_SHEET_MS}ms cubic-bezier(0.32, 0.72, 0, 1);
}

[data-theme='dark'] .smp-sheet,
[data-theme='classic-dark'] .smp-sheet {
  background: var(--festag-black-popup, #1A1A1E);
  border-color: rgba(255, 255, 255, 0.08);
  color: var(--festag-night-ink, #E8EAF0);
  box-shadow: 0 -20px 56px rgba(0, 0, 0, 0.55);
  --wsb-shell-bg: var(--festag-black-popup, #1A1A1E);
}

.smp-sheet-grip {
  width: 36px;
  height: 4px;
  margin: 10px auto 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
  cursor: grab;
  touch-action: none;
}
[data-theme='dark'] .smp-sheet-grip,
[data-theme='classic-dark'] .smp-sheet-grip {
  background: rgba(255, 255, 255, 0.16);
}

.smp-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 20px 12px;
  flex-shrink: 0;
}
.smp-sheet-head-copy {
  min-width: 0;
}
.smp-sheet-duration {
  margin: 0;
  font-size: 12.5px;
  color: #8891a0;
}
[data-theme='dark'] .smp-sheet-duration,
[data-theme='classic-dark'] .smp-sheet-duration {
  color: rgba(245, 245, 247, 0.55);
}
.smp-sheet-title {
  margin: 2px 0 0;
  font-size: 17px;
  font-weight: 400;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.smp-sheet-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 0;
  background: transparent;
  color: #8891a0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.smp-sheet-close:hover {
  background: rgba(15, 23, 42, 0.04);
  color: #1e1e20;
}
[data-theme='dark'] .smp-sheet-close:hover,
[data-theme='classic-dark'] .smp-sheet-close:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--festag-night-ink, #E8EAF0);
}

.smp-sheet-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 24px 28px;
  gap: 24px;
}

.smp-sheet-lyrics {
  width: 100%;
  display: flex;
  justify-content: center;
  min-height: 0;
}

.smp-sheet .wsb-lyrics-mask {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.smp-sheet .wsb-lyrics-stage {
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
.smp-sheet .wsb-lyrics-stage--manual {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.smp-sheet .wsb-lyrics-stage--manual::-webkit-scrollbar { display: none; }
.smp-sheet .wsb-lyrics-stage::before,
.smp-sheet .wsb-lyrics-stage::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  z-index: 2;
  pointer-events: none;
}
.smp-sheet .wsb-lyrics-stage::before {
  top: 0;
  height: 48%;
  background: linear-gradient(
    180deg,
    var(--wsb-shell-bg) 0%,
    color-mix(in srgb, var(--wsb-shell-bg) 72%, transparent) 40%,
    transparent 100%
  );
}
.smp-sheet .wsb-lyrics-stage::after {
  bottom: 0;
  height: 28%;
  background: linear-gradient(
    0deg,
    var(--wsb-shell-bg) 0%,
    color-mix(in srgb, var(--wsb-shell-bg) 55%, transparent) 55%,
    transparent 100%
  );
}
.smp-sheet .wsb-lyrics-track {
  width: 100%;
  padding: calc(var(--wsb-viewport-height) * 0.2) 0 calc(var(--wsb-viewport-height) * 1.35) 0;
  box-sizing: border-box;
  will-change: transform;
  transition: transform 0.78s cubic-bezier(0.22, 1, 0.36, 1);
}
.smp-sheet .wsb-prose {
  margin: 0 auto;
  width: 100%;
  text-align: center;
  font-size: var(--wsb-prose-size);
  font-weight: 400;
  line-height: var(--wsb-line-height);
  letter-spacing: -0.5px;
  color: inherit;
  -webkit-font-smoothing: antialiased;
}
.smp-sheet .wsb-prose-word {
  display: inline;
  color: #86868b;
  transition:
    opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}
.smp-sheet .wsb-lyrics-stage--idle .wsb-prose-word--lead {
  color: inherit;
  opacity: 0.82;
}
.smp-sheet .wsb-lyrics-stage--idle .wsb-prose-word--future {
  color: #86868b;
  opacity: 0.48;
}
.smp-sheet .wsb-prose-word--future,
.smp-sheet .wsb-prose-word--adjacent {
  color: #86868b;
  opacity: 0.38;
}
.smp-sheet .wsb-prose-word--past {
  color: #86868b;
  opacity: 0.52;
}
.smp-sheet .wsb-prose-word--active.wsb-prose-word--pending {
  color: #86868b;
  opacity: 0.44;
}
.smp-sheet .wsb-prose-word--active.wsb-prose-word--spoken,
.smp-sheet .wsb-prose-word--active.wsb-prose-word--current {
  color: inherit;
  opacity: 1;
}
.smp-sheet .wsb-lyrics-stage--live .wsb-prose-word--past {
  color: #86868b;
  opacity: 0.5;
}

[data-theme='dark'] .smp-sheet .wsb-prose-word,
[data-theme='classic-dark'] .smp-sheet .wsb-prose-word {
  color: rgba(232, 232, 238, 0.36);
}
[data-theme='dark'] .smp-sheet .wsb-prose-word--active.wsb-prose-word--spoken,
[data-theme='dark'] .smp-sheet .wsb-prose-word--active.wsb-prose-word--current,
[data-theme='classic-dark'] .smp-sheet .wsb-prose-word--active.wsb-prose-word--spoken,
[data-theme='classic-dark'] .smp-sheet .wsb-prose-word--active.wsb-prose-word--current,
[data-theme='dark'] .smp-sheet .wsb-lyrics-stage--idle .wsb-prose-word--lead,
[data-theme='classic-dark'] .smp-sheet .wsb-lyrics-stage--idle .wsb-prose-word--lead {
  color: var(--festag-night-ink, #E8EAF0);
}

.smp-sheet-empty {
  margin: 0;
  text-align: center;
  font-size: 15px;
  line-height: 1.55;
  color: #8891a0;
  max-width: 280px;
}

.smp-sheet-progress {
  width: min(280px, 70vw);
  height: 2px;
  border-radius: 999px;
  background: rgba(30, 30, 32, 0.08);
  overflow: hidden;
  cursor: pointer;
}
[data-theme='dark'] .smp-sheet-progress,
[data-theme='classic-dark'] .smp-sheet-progress {
  background: rgba(255, 255, 255, 0.1);
}
.smp-sheet-progress-fill {
  height: 100%;
  background: currentColor;
  opacity: 0.55;
  border-radius: inherit;
  transition: width 0.2s linear;
}

.smp-sheet-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.smp-sheet-ctrl {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(30, 30, 32, 0.08);
  background: #ffffff;
  color: #1e1e20;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.smp-sheet-ctrl:hover { background: #fafafa; }
.smp-sheet-ctrl:active { background: #f5f5f6; box-shadow: none; }
.smp-sheet-ctrl--play {
  width: 52px;
  height: 52px;
}
.smp-sheet-ctrl--play svg { margin-left: 2px; }
.smp-sheet-ctrl--ghost {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: #8891a0;
}
.smp-sheet-ctrl--ghost:hover {
  background: rgba(15, 23, 42, 0.04);
  color: #1e1e20;
}
[data-theme='dark'] .smp-sheet-ctrl,
[data-theme='classic-dark'] .smp-sheet-ctrl {
  background: rgba(186, 194, 210, 0.08);
  color: rgba(245, 245, 247, 0.88);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
[data-theme='dark'] .smp-sheet-ctrl--ghost,
[data-theme='classic-dark'] .smp-sheet-ctrl--ghost {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  color: rgba(245, 245, 247, 0.55);
}

@media (max-width: 768px) {
  .smp-sheet {
    width: 100%;
    left: 50%;
    border-radius: 18px 18px 0 0;
  }

  /* Peek sheet — page still visible above */
  .smp-sheet--peek {
    height: 72dvh;
    max-height: 72dvh;
  }

  /* Full page handoff — no drag, normal scroll */
  .smp-sheet--fullscreen {
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    box-shadow: none;
  }

  .smp-sheet--dragging {
    transition: none !important;
  }

  .smp-sheet-grip--static {
    opacity: 0;
    pointer-events: none;
    margin: 6px auto 0;
  }

  .smp-sheet-body--scroll {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    justify-content: flex-start;
    padding-top: 12px;
    overscroll-behavior: contain;
  }

  .smp-sheet--fullscreen .wsb-lyrics-stage {
    height: auto;
    max-height: none;
    overflow: visible;
    -webkit-mask-image: none;
    mask-image: none;
  }
  .smp-sheet--fullscreen .wsb-lyrics-stage::before,
  .smp-sheet--fullscreen .wsb-lyrics-stage::after {
    display: none;
  }
  .smp-sheet--fullscreen .wsb-lyrics-track {
    padding: 12px 0 48px;
    transform: none !important;
    transition: none;
  }
  .smp-sheet--fullscreen .wsb-prose-word--future,
  .smp-sheet--fullscreen .wsb-prose-word--adjacent,
  .smp-sheet--fullscreen .wsb-prose-word--past,
  .smp-sheet--fullscreen .wsb-prose-word--active.wsb-prose-word--pending {
    opacity: 0.72;
  }
}

@media (prefers-reduced-motion: reduce) {
  .smp-mini,
  .smp-fab,
  .smp-sheet,
  .smp-sheet .wsb-lyrics-track,
  .smp-sheet .wsb-prose-word,
  .smp-mini-progress-fill,
  .smp-sheet-progress-fill {
    transition: none !important;
  }
}
`
