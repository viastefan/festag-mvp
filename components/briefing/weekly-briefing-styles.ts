export const WEEKLY_BRIEFING_CSS = `
/* ── Weekly Status Briefing — wide player shell ── */

.festag-modal-host:has(.festag-modal-surface--briefing) {
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(8px) saturate(115%);
  -webkit-backdrop-filter: blur(8px) saturate(115%);
}

.festag-modal-surface--briefing {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(720px, calc(100vw - 48px)) !important;
  max-width: min(720px, calc(100vw - 48px)) !important;
  height: auto !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 32px !important;
  overflow: hidden;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(24,24,27,.08)) 100%, transparent);
  background: var(--fp-bg, #fff);
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  box-shadow:
    0 0 0 0.5px rgba(24, 24, 27, 0.05),
    0 28px 72px -28px rgba(0, 0, 0, 0.35);
}

.festag-modal-surface--briefing .festag-popup-drag-area {
  display: none;
}

.festag-modal-surface--briefing .festag-modal-body {
  padding: 0;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

.wsb-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 420px;
  padding: 36px 40px 32px;
  color: var(--fp-text, #18181b);
  overflow: hidden;
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

/* Intro — exits upward when playing */
.wsb-intro {
  flex-shrink: 0;
  padding-right: 36px;
  transform-origin: center top;
  transition:
    transform 0.55s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.45s ease,
    max-height 0.55s cubic-bezier(0.16, 1, 0.3, 1),
    margin 0.55s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 280px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 88%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 88%, transparent 100%);
}

.wsb-shell--playing .wsb-intro,
.wsb-shell--summary .wsb-intro {
  transform: translateY(-48px);
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
  pointer-events: none;
}

.wsb-title {
  margin: 0 0 12px;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: clamp(26px, 3vw, 32px);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.08;
  color: var(--fp-text, #18181b);
}

.wsb-metrics {
  margin: 0 0 10px;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.45;
  color: var(--fp-muted, #71717a);
}

.wsb-teaser {
  margin: 0 0 16px;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.55;
  letter-spacing: -0.015em;
  color: var(--fp-text, #18181b);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wsb-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.wsb-picker-wrap { position: relative; }
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
  z-index: 30;
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

/* Center stage — wave or lyrics */
.wsb-stage {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  margin: 8px 0 20px;
  transition: min-height 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.wsb-shell--playing .wsb-stage {
  min-height: 260px;
  margin-top: 0;
}

.wsb-idle-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
}

.wsb-wave {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 72px;
  width: 100%;
  max-width: 360px;
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
  margin: 0;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 13px;
  font-weight: 400;
  color: var(--fp-muted, #71717a);
  letter-spacing: 0.02em;
}

/* Spotify-style lyrics */
.wsb-lyrics-mask {
  width: 100%;
  height: 100%;
  min-height: 240px;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
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
  padding: 48px 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.wsb-line {
  margin: 0;
  max-width: 92%;
  text-align: center;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: clamp(17px, 2.2vw, 22px);
  font-weight: 400;
  line-height: 1.45;
  letter-spacing: -0.02em;
  color: color-mix(in srgb, var(--fp-text, #18181b) 20%, transparent);
  transition: color 0.45s ease, opacity 0.45s ease, transform 0.45s ease;
  transform: scale(0.96);
  opacity: 0.4;
}
.wsb-line.near {
  color: color-mix(in srgb, var(--fp-text, #18181b) 48%, transparent);
  opacity: 0.72;
  transform: scale(0.98);
}
.wsb-line.on {
  color: var(--fp-text, #18181b);
  opacity: 1;
  transform: scale(1);
  font-size: clamp(20px, 2.6vw, 28px);
  font-weight: 400;
}
.wsb-line.past { opacity: 0.28; }
.wsb-line.future { opacity: 0.24; }

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

/* Toolbar */
.wsb-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
}

.wsb-tool {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.1)) 100%, transparent);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--fp-muted, #71717a);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.wsb-tool:hover { color: var(--fp-text, #18181b); }
.wsb-tool[aria-pressed="true"] {
  color: var(--fp-text, #18181b);
  background: color-mix(in srgb, var(--fp-pill, rgba(0,0,0,.05)) 100%, transparent);
}

.wsb-btn-play {
  flex: 1 1 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
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
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}
.wsb-btn-play:hover:not(:disabled) {
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.08);
}
.wsb-btn-play:disabled { opacity: 0.5; cursor: default; }

.wsb-btn-ghost {
  flex-shrink: 0;
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
  white-space: nowrap;
}
.wsb-btn-ghost:hover {
  background: color-mix(in srgb, var(--fp-pill, rgba(0,0,0,.04)) 100%, transparent);
}

.wsb-tagro-fab.festag-content-fab--absolute {
  right: 28px;
  bottom: 28px;
  z-index: 4;
}

.wsb-tagro-mobile {
  flex-shrink: 0;
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  padding: 0 !important;
}

/* Light theme */
[data-theme="light"] .festag-modal-host:has(.festag-modal-surface--briefing),
[data-theme="read"] .festag-modal-host:has(.festag-modal-surface--briefing),
[data-theme="pure-light"] .festag-modal-host:has(.festag-modal-surface--briefing) {
  background: rgba(15, 18, 24, 0.38);
}
[data-theme="light"] .festag-modal-surface--briefing,
[data-theme="read"] .festag-modal-surface--briefing,
[data-theme="pure-light"] .festag-modal-surface--briefing {
  background: #ffffff;
  --fp-text: #18181b;
  --fp-muted: #71717a;
}

/* Dark theme */
[data-theme="dark"] .festag-modal-surface--briefing,
[data-theme="classic-dark"] .festag-modal-surface--briefing {
  background: var(--festag-black-popup, #121214);
  --fp-text: #f4f4f5;
  --fp-muted: #8e8e93;
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
    background: rgba(0, 0, 0, 0.55);
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
    min-height: 0;
    padding: 0 16px calc(14px + env(safe-area-inset-bottom, 0px));
    max-height: min(78dvh, 560px);
  }
  .wsb-close { display: none; }
  .wsb-intro {
    padding-right: 0;
    max-height: 200px;
  }
  .wsb-title {
    font-size: 22px;
    margin-bottom: 8px;
  }
  .wsb-metrics { font-size: 12px; margin-bottom: 6px; }
  .wsb-teaser {
    font-size: 15px;
    -webkit-line-clamp: 2;
    margin-bottom: 10px;
  }
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
  .wsb-stage {
    min-height: 160px;
    margin: 4px 0 12px;
  }
  .wsb-shell--playing .wsb-stage { min-height: 200px; }
  .wsb-lyrics { height: 200px; min-height: 200px; }
  .wsb-lyrics-mask { min-height: 200px; }
  .wsb-wave { height: 56px; max-width: 280px; }
  .wsb-toolbar--mobile {
    gap: 8px;
  }
  .wsb-btn-play {
    font-size: 14px;
    height: 42px;
    min-height: 42px;
  }
  .wsb-btn-ghost {
    font-size: 13px;
    padding: 0 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wsb-wave span { animation: none; opacity: 0.55; }
  .wsb-intro,
  .wsb-line { transition: none; }
  .wsb-shell--playing .wsb-intro { transform: none; opacity: 0; }
}
`
