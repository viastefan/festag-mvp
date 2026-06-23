export const WEEKLY_BRIEFING_CSS = `
/* ── Weekly Status Briefing — Apple-clean player ── */

.festag-modal-host:has(.festag-modal-surface--briefing) {
  background: rgba(0, 0, 0, 0.8) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.festag-modal-surface--briefing {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(720px, calc(100vw - 96px)) !important;
  max-width: min(720px, calc(100vw - 96px)) !important;
  height: auto !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 32px !important;
  overflow: visible;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(24,24,27,.08)) 100%, transparent);
  background: var(--fp-bg, #fff);
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  box-shadow:
    0 0 0 0.5px rgba(24, 24, 27, 0.05),
    0 28px 72px -28px rgba(0, 0, 0, 0.4);
}

.festag-modal-surface--briefing .festag-popup-drag-area {
  display: none;
}

.festag-modal-surface--briefing .festag-modal-body {
  padding: 0;
  overflow: visible;
}

.wsb-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 36px 40px 28px;
  color: var(--fp-text, #18181b);
  overflow: visible;
}

.wsb-close {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 6;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--fp-muted, #71717a);
  cursor: pointer;
}
.wsb-close:hover { color: var(--fp-text, #18181b); }

/* Intro — smooth exit upward */
.wsb-intro {
  flex-shrink: 0;
  padding-right: 36px;
  transform-origin: center top;
  overflow: visible;
  transition:
    transform 0.75s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.65s cubic-bezier(0.22, 1, 0.36, 1),
    max-height 0.75s cubic-bezier(0.22, 1, 0.36, 1);
  max-height: 220px;
}

.wsb-shell--playing .wsb-intro,
.wsb-shell--summary .wsb-intro {
  transform: translateY(-40px);
  opacity: 0;
  filter: blur(6px);
  max-height: 0;
  margin: 0;
  pointer-events: none;
}

.wsb-headline {
  margin: 0 0 16px;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 25px;
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: -0.02em;
}
.wsb-headline-strong {
  color: var(--fp-text, #18181b);
  font-weight: 400;
}
.wsb-headline-muted {
  color: var(--fp-muted, #71717a);
  font-weight: 400;
}

.wsb-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 20;
}
.wsb-picker-wrap {
  position: relative;
  z-index: 25;
}
.wsb-picker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 11px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.1)) 100%, transparent);
  border-radius: 10px;
  background: transparent;
  color: var(--fp-text, #18181b);
  font-family: inherit;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
}
.wsb-picker:hover {
  background: color-mix(in srgb, var(--fp-pill, rgba(0,0,0,.04)) 100%, transparent);
}
.wsb-picker svg:last-child { opacity: 0.5; }
.wsb-picker-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}
.wsb-picker-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  min-width: 200px;
  padding: 6px;
  border-radius: 14px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.1)) 100%, transparent);
  background: var(--festag-black-popup, #fff);
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.18);
}
.wsb-picker-menu button {
  display: block;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--fp-text, #18181b);
  font: inherit;
  font-size: 13px;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
}
.wsb-picker-menu button:hover,
.wsb-picker-menu button.on {
  background: color-mix(in srgb, var(--fp-pill, rgba(0,0,0,.06)) 100%, transparent);
}

/* Stage */
.wsb-stage {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 12px 0 20px;
  transition: margin 0.65s cubic-bezier(0.22, 1, 0.36, 1);
}

.wsb-shell--playing .wsb-stage {
  margin: 0 0 16px;
  flex: 1 1 auto;
  min-height: 240px;
}

/* Gray audio card */
.wsb-audio-card {
  position: relative;
  width: 100%;
  border-radius: 32px;
  background:
    radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--fp-text, #18181B) 4%, transparent), transparent 62%),
    color-mix(in srgb, var(--fp-pill, rgba(0,0,0,.04)) 48%, transparent);
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.08)) 65%, transparent);
  padding: 36px 28px 30px;
  overflow: hidden;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 55%, transparent);
}
.wsb-audio-card::before {
  content: '';
  position: absolute;
  inset: 18% 12% auto;
  height: 56%;
  border-radius: 999px;
  background: radial-gradient(ellipse at center, color-mix(in srgb, var(--fp-text, #18181B) 7%, transparent), transparent 72%);
  pointer-events: none;
  opacity: 0.55;
}

.wsb-wave {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 72px;
  width: 100%;
  max-width: 320px;
}
.wsb-wave span {
  display: block;
  width: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dc-slate, #5B647D) 88%, var(--fp-text, #18181B));
  animation: wsbWave 1.55s ease-in-out infinite;
  transform-origin: center bottom;
  opacity: 0.42;
}
.wsb-wave span:nth-child(1) { height: 16px; animation-delay: 0s; }
.wsb-wave span:nth-child(2) { height: 28px; animation-delay: 0.07s; }
.wsb-wave span:nth-child(3) { height: 44px; animation-delay: 0.14s; }
.wsb-wave span:nth-child(4) { height: 60px; animation-delay: 0.21s; }
.wsb-wave span:nth-child(5) { height: 48px; animation-delay: 0.28s; }
.wsb-wave span:nth-child(6) { height: 34px; animation-delay: 0.35s; }
.wsb-wave span:nth-child(7) { height: 52px; animation-delay: 0.42s; }
.wsb-wave span:nth-child(8) { height: 38px; animation-delay: 0.49s; }
.wsb-wave span:nth-child(9) { height: 24px; animation-delay: 0.56s; }
.wsb-wave span:nth-child(10) { height: 40px; animation-delay: 0.63s; }
.wsb-wave span:nth-child(11) { height: 32px; animation-delay: 0.7s; }
.wsb-wave span:nth-child(12) { height: 18px; animation-delay: 0.77s; }
.wsb-wave.playing span { animation-play-state: running; opacity: 1; }
.wsb-wave.paused span { animation-play-state: paused; opacity: 0.38; }
@keyframes wsbWave {
  0%, 100% { transform: scaleY(0.22); opacity: 0.38; }
  50% { transform: scaleY(1); opacity: 1; }
}

.wsb-duration {
  position: relative;
  z-index: 1;
  margin: 0;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 13px;
  font-weight: 400;
  color: var(--fp-muted, #71717a);
  letter-spacing: 0.02em;
}

/* Spotify lyrics — word-by-word */
.wsb-lyrics-mask {
  width: 100%;
  min-height: 240px;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%);
}

.wsb-lyrics {
  height: 240px;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  scrollbar-width: none;
}
.wsb-lyrics::-webkit-scrollbar { display: none; }

.wsb-flow {
  padding: 52px 12px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}

.wsb-line {
  margin: 0;
  max-width: 94%;
  text-align: center;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: clamp(18px, 2.4vw, 24px);
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: -0.02em;
  transition:
    transform 0.75s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.75s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.75s cubic-bezier(0.22, 1, 0.36, 1);
}

.wsb-line--future {
  opacity: 0;
  transform: translateY(18px);
  filter: blur(3px);
}
.wsb-line--near {
  opacity: 0.45;
  transform: translateY(6px);
  filter: blur(1px);
  font-size: clamp(17px, 2.1vw, 21px);
}
.wsb-line--on {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
  font-size: clamp(21px, 2.8vw, 30px);
}
.wsb-line--past {
  opacity: 0;
  transform: translateY(-22px);
  filter: blur(4px);
}

.wsb-word {
  display: inline;
}

.wsb-line--on .wsb-word {
  display: inline-block;
  animation: wsbWordIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes wsbWordIn {
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

.wsb-summary {
  margin: 0;
  padding: 0 4px;
  max-height: 280px;
  overflow-y: auto;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: -0.015em;
  color: var(--fp-text, #18181b);
}

/* Footer controls */
.wsb-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.wsb-back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px 0 8px;
  margin-bottom: 2px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--fp-muted, #71717a);
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  animation: wsbFadeIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.wsb-back:hover { color: var(--fp-text, #18181b); }

@keyframes wsbFadeIn {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}

.wsb-btn-play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 44px;
  min-height: 44px;
  padding: 0 20px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.1)) 100%, transparent);
  border-radius: 999px;
  background: var(--festag-elev-bg, #fff);
  color: var(--fp-text, #18181b);
  font-family: inherit;
  font-size: 15px;
  font-weight: 400;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}
.wsb-btn-play:hover:not(:disabled) {
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.08);
}
.wsb-btn-play:disabled { opacity: 0.5; cursor: default; }

.wsb-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 36px;
  min-width: 36px;
  padding: 0 12px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.1)) 100%, transparent);
  border-radius: 999px;
  background: transparent;
  color: var(--fp-muted, #71717a);
  font-family: inherit;
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.wsb-tool:hover { color: var(--fp-text, #18181b); }
.wsb-tool[aria-pressed="true"] {
  color: var(--fp-text, #18181b);
  background: color-mix(in srgb, var(--fp-pill, rgba(0,0,0,.05)) 100%, transparent);
}
.wsb-tool--inline {
  flex-shrink: 0;
  width: 36px;
  min-width: 36px;
  padding: 0;
}

.wsb-btn-ghost {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--fp-text, #18181b);
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  text-align: center;
}
.wsb-btn-ghost:hover {
  background: color-mix(in srgb, var(--fp-pill, rgba(0,0,0,.04)) 100%, transparent);
}

.wsb-volume-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 2px 0 0;
  color: var(--fp-muted, #71717a);
}
.wsb-volume-slider {
  flex: 1 1 auto;
  height: 4px;
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 999px;
  background: color-mix(in srgb, var(--fp-pill, rgba(0,0,0,.12)) 100%, transparent);
  cursor: pointer;
}
.wsb-volume-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.12)) 100%, transparent);
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
.wsb-volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.12)) 100%, transparent);
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
.wsb-volume-value {
  flex-shrink: 0;
  min-width: 2.5em;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 12px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  color: var(--fp-muted, #71717a);
  text-align: right;
}

/* Tagro on backdrop — outside popup */
.wsb-tagro-backdrop {
  position: fixed !important;
  right: 28px !important;
  bottom: 28px !important;
  z-index: 10050 !important;
  width: 56px !important;
  height: 56px !important;
  min-width: 56px !important;
  min-height: 56px !important;
  padding: 0 !important;
  border-radius: 9999px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.12),
    0 8px 28px -4px rgba(0, 0, 0, 0.45) !important;
}

/* Light theme */
[data-theme="light"] .festag-modal-host:has(.festag-modal-surface--briefing),
[data-theme="read"] .festag-modal-host:has(.festag-modal-surface--briefing),
[data-theme="pure-light"] .festag-modal-host:has(.festag-modal-surface--briefing) {
  background: rgba(0, 0, 0, 0.8) !important;
}
[data-theme="light"] .festag-modal-surface--briefing,
[data-theme="read"] .festag-modal-surface--briefing,
[data-theme="pure-light"] .festag-modal-surface--briefing {
  background: #ffffff;
  --fp-text: #18181b;
  --fp-muted: #71717a;
}

/* Dark theme */
[data-theme="dark"] .festag-modal-host:has(.festag-modal-surface--briefing),
[data-theme="classic-dark"] .festag-modal-host:has(.festag-modal-surface--briefing) {
  background: rgba(0, 0, 0, 0.8) !important;
}
[data-theme="dark"] .festag-modal-surface--briefing,
[data-theme="classic-dark"] .festag-modal-surface--briefing {
  background: var(--festag-black-popup, #121214);
  --fp-text: #f4f4f5;
  --fp-muted: #8e8e93;
}
[data-theme="dark"] .wsb-audio-card,
[data-theme="classic-dark"] .wsb-audio-card {
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 8%, transparent);
}
[data-theme="dark"] .wsb-picker-menu,
[data-theme="classic-dark"] .wsb-picker-menu {
  background: var(--festag-black-popup, #121214);
}

@media (min-width: 769px) {
  .festag-modal-host:has(.festag-modal-surface--briefing) {
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .festag-modal-host:has(.festag-modal-surface--briefing) {
    align-items: flex-end;
    padding: 0;
    background: rgba(0, 0, 0, 0.8) !important;
  }
  .festag-modal-surface--briefing,
  .festag-modal-surface--briefing-mobile {
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 28px 28px 0 0 !important;
    border-bottom: none;
  }
  .festag-modal-surface--briefing .festag-popup-drag-area {
    display: flex !important;
    flex-shrink: 0;
    padding: 10px 0 6px;
  }
  .wsb-shell--mobile {
    padding: 0 16px calc(14px + env(safe-area-inset-bottom, 0px));
    max-height: min(78dvh, 580px);
  }
  .wsb-close { display: none; }
  .wsb-intro { padding-right: 0; max-height: 200px; }
  .wsb-headline { font-size: 22px; margin-bottom: 12px; }
  .wsb-filter-row--mobile {
    flex-wrap: nowrap;
    gap: 6px;
  }
  .wsb-filter-row--mobile .wsb-picker-wrap {
    flex: 1 1 0;
    min-width: 0;
  }
  .wsb-picker--compact {
    width: 100%;
    height: 30px;
    font-size: 12px;
  }
  .wsb-picker--compact .wsb-picker-label { max-width: none; flex: 1; }
  .wsb-audio-card {
    min-height: 160px;
    padding: 28px 20px 24px;
    border-radius: 24px;
  }
  .wsb-wave { height: 56px; max-width: 280px; }
  .wsb-lyrics, .wsb-lyrics-mask { min-height: 200px; height: 200px; }
  .wsb-tagro-backdrop {
    right: 16px !important;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
    width: 52px !important;
    height: 52px !important;
    min-width: 52px !important;
    min-height: 52px !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wsb-wave span { animation: none; opacity: 0.55; }
  .wsb-intro, .wsb-line, .wsb-line--on .wsb-word { transition: none; animation: none; }
  .wsb-shell--playing .wsb-intro { transform: none; opacity: 0; filter: none; }
}
`
