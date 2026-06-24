export const WEEKLY_BRIEFING_CSS = `
/* ── Weekly Status Briefing — Apple-clean player ── */

.wsb-close-flyout-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120009;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.8);
}

.wsb-close-flyout {
  position: fixed;
  z-index: 120010;
  pointer-events: none;
  background: var(--fp-bg, #fff);
  box-shadow:
    0 0 0 0.5px rgba(24, 24, 27, 0.05),
    0 20px 48px -20px rgba(0, 0, 0, 0.35);
  transform-origin: center center;
  will-change: transform, opacity;
  backface-visibility: hidden;
}

.festag-modal-host:has(.festag-modal-surface--briefing) {
  background: rgba(0, 0, 0, 0.8) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  --wsb-layout-width: min(720px, calc(100vw - 96px));
  align-items: center !important;
  justify-content: center !important;
  padding: 32px 48px !important;
}

.festag-modal-surface--briefing {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(720px, calc(100vw - 96px)) !important;
  max-width: min(720px, calc(100vw - 96px)) !important;
  height: auto !important;
  max-height: min(90vh, 820px) !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(24,24,27,.08)) 100%, transparent);
  background: #ffffff;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  --wsb-apple-gray: #f5f5f7;
  --wsb-apple-gray-soft: #f2f2f7;
  --wsb-apple-gray-highlight: #fafafc;
  box-shadow:
    0 0 0 0.5px rgba(24, 24, 27, 0.05),
    0 28px 72px -28px rgba(0, 0, 0, 0.4);
}

.wsb-composer {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  max-height: min(90vh, 820px);
  overflow: hidden;
}

.wsb-composer-tray {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 64px;
  padding: 12px 14px 14px 18px;
  border-top: 0.5px solid color-mix(in srgb, #000 5%, var(--wsb-apple-gray, #f5f5f7));
  border-radius: 0 0 12px 12px;
  background:
    radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, #fff 42%, var(--wsb-apple-gray, #f5f5f7)), transparent 58%),
    var(--wsb-apple-gray, #f5f5f7);
}

.wsb-composer-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 40px;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: inherit;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 0.007em;
  color: var(--fp-text, #18181b);
  caret-color: var(--fp-text, #18181b);
}

.wsb-composer-input::placeholder {
  color: var(--fp-muted, #86868b);
}

.wsb-composer-input:focus::placeholder {
  opacity: 0.72;
}

.wsb-composer-send {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--festag-btn-dark, #2d2e2c);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.wsb-composer-send:hover:not(:disabled) {
  background: var(--festag-btn-dark-hover, #000);
}

.wsb-composer-send:disabled {
  opacity: 0.35;
  cursor: default;
}

.festag-modal-surface--briefing .festag-popup-drag-area {
  display: none;
}

.festag-modal-surface--briefing .festag-modal-body {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.wsb-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;
  flex: 1 1 auto;
  min-height: min(420px, calc(78vh - 64px));
  max-height: min(640px, calc(90vh - 64px));
  padding: 16px 28px 20px;
  border-radius: 12px 12px 0 0;
  background: #ffffff;
  color: var(--fp-text, #18181b);
  overflow: hidden;
  box-sizing: border-box;
}

.wsb-shell--playing,
.wsb-shell--summary {
  min-height: min(460px, calc(76vh - 64px));
}

.wsb-close {
  position: absolute;
  top: 14px;
  right: 14px;
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
  font-size: 30px;
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: -0.4px;
}
.wsb-headline-strong {
  color: var(--fp-text, #18181b);
  font-weight: 500;
  letter-spacing: -0.4px;
}
.wsb-headline-muted {
  color: var(--fp-muted, #71717a);
  font-weight: 500;
  letter-spacing: -0.4px;
}

.wsb-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  position: relative;
  z-index: 20;
}

.wsb-meta {
  flex-shrink: 0;
  width: 100%;
  padding: 4px 0 10px;
  box-sizing: border-box;
}

.wsb-meta--mobile .wsb-filter-row {
  gap: 8px;
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
  border-radius: 16px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.1)) 100%, transparent);
  background: var(--festag-black-popup, #fff);
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.18);
}
.wsb-picker-menu button {
  display: block;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: 8px;
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

.wsb-intel-wrap {
  position: relative;
  z-index: 25;
  flex-shrink: 0;
}

/* Stage */
.wsb-stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  margin: 0 0 4px;
  overflow: hidden;
}

.wsb-shell--playing .wsb-stage {
  margin: 0 0 4px;
  flex: 1 1 auto;
  min-height: 0;
}

.wsb-shell--playing .wsb-footer,
.wsb-shell--summary .wsb-footer {
  margin-top: auto;
  width: 100%;
}

/* Gray audio card — flat Apple gray, whisper-soft top sheen */
.wsb-audio-card {
  position: relative;
  width: 100%;
  margin-top: 16px;
  border-radius: 32px;
  background:
    radial-gradient(90% 55% at 50% 0%, color-mix(in srgb, #fff 14%, var(--wsb-apple-gray, #F5F5F7)), transparent 52%),
    var(--wsb-apple-gray, #F5F5F7);
  border: 0.5px solid color-mix(in srgb, #000 4%, var(--wsb-apple-gray, #F5F5F7));
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
  inset: 20% 16% auto;
  height: 48%;
  border-radius: 999px;
  background: radial-gradient(ellipse at center, color-mix(in srgb, #fff 16%, var(--wsb-apple-gray, #F5F5F7)), transparent 70%);
  pointer-events: none;
  opacity: 0.32;
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

/* Spotify-style lyrics — left-aligned sentence stack */
.wsb-lyrics-mask {
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: stretch;
}

.wsb-lyrics-stage {
  position: relative;
  width: 100%;
  flex: 1 1 auto;
  min-height: 220px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(
    180deg,
    transparent 0%,
    #000 6%,
    #000 92%,
    transparent 100%
  );
  mask-image: linear-gradient(
    180deg,
    transparent 0%,
    #000 6%,
    #000 92%,
    transparent 100%
  );
}

.wsb-lyrics-track {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 28px;
  width: 100%;
  padding: 4px 36px 4px 2px;
  will-change: transform;
  transition: transform 0.82s cubic-bezier(0.22, 1, 0.36, 1);
}

.wsb-line-wrap {
  width: 100%;
  display: flex;
  justify-content: flex-start;
}

.wsb-line {
  margin: 0;
  width: 100%;
  max-width: none;
  text-align: left;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: clamp(22px, 3.1vw, 34px);
  font-weight: 700;
  line-height: 1.22;
  letter-spacing: -0.03em;
  transition:
    opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.wsb-line--future,
.wsb-line--adjacent {
  opacity: 0.28;
  color: var(--fp-text, #18181b);
}

.wsb-line--past {
  opacity: 0.44;
  color: var(--fp-text, #18181b);
}

.wsb-line--lead {
  opacity: 0.56;
  color: var(--fp-text, #18181b);
}

.wsb-line--active {
  opacity: 1;
  color: var(--fp-text, #18181b);
  font-size: clamp(26px, 3.6vw, 40px);
  font-weight: 700;
}

.wsb-word {
  display: inline;
  transition:
    color 0.38s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.wsb-line--active .wsb-word--pending {
  color: color-mix(in srgb, var(--fp-text, #18181b) 34%, transparent);
  opacity: 0.55;
}

.wsb-line--active .wsb-word--spoken,
.wsb-line--active .wsb-word--current {
  color: var(--fp-text, #18181b);
  opacity: 1;
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
  position: relative;
  z-index: 4;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  margin-top: auto;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
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
  border: none;
  border-radius: 999px;
  background: var(--festag-btn-dark, #2d2e2c);
  color: #fff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 400;
  cursor: pointer;
  box-shadow: none;
}
.wsb-btn-play:hover:not(:disabled) {
  background: var(--festag-btn-dark-hover, #000);
  box-shadow: none;
}
.wsb-btn-play:disabled { opacity: 0.5; cursor: default; }

/* Tagro composer — fixed dock below centered briefing modal */
.wsb-tagro-dock-wrap {
  position: fixed;
  z-index: 9501;
  left: 50%;
  bottom: max(22px, env(safe-area-inset-bottom, 0px));
  width: min(720px, calc(100vw - 96px));
  transform: translateX(-50%);
  pointer-events: none;
  animation: wsbDockIn 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes wsbDockIn {
  from { opacity: 0; transform: translateX(-50%) translateY(14px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.wsb-tagro-dock {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 52px;
  padding: 0 6px 0 16px;
  border-radius: 28px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.1)) 100%, transparent);
  background: var(--fp-bg, #fff);
  box-shadow:
    0 0 0 0.5px rgba(24, 24, 27, 0.04),
    0 16px 44px -18px rgba(0, 0, 0, 0.28),
    0 4px 14px -6px rgba(0, 0, 0, 0.12);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.wsb-tagro-dock:focus-within {
  border-color: color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.14)) 100%, transparent);
  box-shadow:
    0 0 0 0.5px rgba(24, 24, 27, 0.05),
    0 18px 48px -16px rgba(0, 0, 0, 0.3),
    0 0 0 3px rgba(15, 23, 42, 0.04);
}
.wsb-tagro-dock .wsb-tagro-ask-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.007em;
  color: var(--fp-text, #18181b);
}
.wsb-tagro-dock .wsb-tagro-ask-input::placeholder {
  color: var(--fp-muted, #86868b);
}

.wsb-tagro-ask {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  padding: 0 6px 0 16px;
  border-radius: 999px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.12)) 100%, transparent);
  background: var(--wsb-apple-gray, #f5f5f7);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.wsb-tagro-ask:focus-within {
  background: var(--fp-bg, #fff);
  border-color: color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.14)) 100%, transparent);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.04);
}
.wsb-tagro-ask-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.007em;
  color: var(--fp-text, #18181b);
  pointer-events: auto;
}
.wsb-tagro-ask-input::placeholder {
  color: var(--fp-muted, #86868b);
}
.wsb-tagro-ask-send {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--festag-btn-dark, #2d2e2c);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;
}
.wsb-tagro-ask-send:hover:not(:disabled) {
  background: var(--festag-btn-dark-hover, #000);
}
.wsb-tagro-ask-send:disabled {
  opacity: 0.35;
  cursor: default;
}

.wsb-btn-tagro {
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
  transition: background 0.15s ease, box-shadow 0.15s ease;
}
.wsb-btn-tagro svg {
  display: block;
  flex-shrink: 0;
}
.wsb-btn-tagro:hover {
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.08);
}
.wsb-btn-tagro:active {
  background: var(--festag-elev-active-bg, #F5F5F7);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}

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
  max-width: 36px;
  height: 36px;
  padding: 0;
}
.wsb-tool--inline svg {
  display: block;
  flex-shrink: 0;
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
  transition: background 0.18s ease, box-shadow 0.18s ease;
}
.wsb-btn-ghost:hover {
  background:
    radial-gradient(120% 130% at 50% 0%, color-mix(in srgb, #fff 62%, var(--festag-elev-active-bg, #F5F5F7)), transparent 68%),
    var(--festag-elev-active-bg, #F5F5F7);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 82%, transparent);
}
.wsb-btn-ghost:active {
  background:
    radial-gradient(120% 130% at 50% 0%, color-mix(in srgb, #fff 28%, var(--festag-elev-on-bg, #F2F2F7)), transparent 68%),
    var(--festag-elev-on-bg, #F2F2F7);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 45%, transparent);
}

.wsb-playback-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding-top: 2px;
  box-sizing: border-box;
}
@media (min-width: 520px) {
  .wsb-playback-bar {
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
}
.wsb-transport {
  display: flex;
  align-items: center;
  gap: 6px;
  width: auto;
  flex-shrink: 0;
  flex-wrap: nowrap;
}
.wsb-tool--speed {
  min-width: 52px;
  padding: 0 10px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
}
.wsb-tool:disabled {
  opacity: 0.38;
  cursor: default;
  pointer-events: none;
}
.wsb-volume-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  padding: 0;
  color: var(--fp-muted, #71717a);
  box-sizing: border-box;
}
.wsb-volume-slider {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  max-width: 100%;
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
  background: var(--festag-btn-dark, #2d2e2c) !important;
  color: #fff !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 8px 28px -4px rgba(0, 0, 0, 0.45) !important;
}
.wsb-tagro-backdrop:hover:not(:disabled) {
  background: var(--festag-btn-dark-hover, #000) !important;
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
  --wsb-apple-gray: color-mix(in srgb, var(--festag-black-content, #0c0c0e) 94%, #fff 6%);
  --wsb-apple-gray-soft: color-mix(in srgb, var(--festag-black-content, #0c0c0e) 92%, #fff 8%);
  --wsb-apple-gray-highlight: color-mix(in srgb, var(--festag-black-content, #0c0c0e) 90%, #fff 10%);
}
[data-theme="dark"] .wsb-shell,
[data-theme="classic-dark"] .wsb-shell {
  background: var(--festag-black-popup, #121214);
}
[data-theme="dark"] .wsb-line--lead,
[data-theme="classic-dark"] .wsb-line--lead {
  color: #f4f4f5;
}
[data-theme="dark"] .wsb-composer-tray,
[data-theme="classic-dark"] .wsb-composer-tray {
  border-top-color: rgba(255, 255, 255, 0.06);
  background:
    radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, #fff 4%, var(--wsb-apple-gray, #121214)), transparent 58%),
    var(--wsb-apple-gray, #121214);
}
[data-theme="dark"] .wsb-composer-send:not(:disabled),
[data-theme="classic-dark"] .wsb-composer-send:not(:disabled) {
  background: #fff;
  color: #000;
}
[data-theme="dark"] .wsb-composer-send:hover:not(:disabled),
[data-theme="classic-dark"] .wsb-composer-send:hover:not(:disabled) {
  background: color-mix(in srgb, #fff 92%, #000);
}
[data-theme="dark"] .wsb-audio-card,
[data-theme="classic-dark"] .wsb-audio-card {
  background:
    radial-gradient(90% 50% at 50% 0%, color-mix(in srgb, #fff 5%, var(--wsb-apple-gray, #121214)), transparent 48%),
    var(--wsb-apple-gray, #121214);
  border-color: rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}
[data-theme="dark"] .wsb-audio-card::before,
[data-theme="classic-dark"] .wsb-audio-card::before {
  background: radial-gradient(ellipse at center, color-mix(in srgb, #fff 6%, var(--wsb-apple-gray, #121214)), transparent 68%);
  opacity: 0.14;
}
[data-theme="dark"] .wsb-line--active .wsb-word--pending,
[data-theme="classic-dark"] .wsb-line--active .wsb-word--pending {
  color: rgba(255, 255, 255, 0.34);
  opacity: 0.55;
}
[data-theme="dark"] .wsb-line--active .wsb-word--spoken,
[data-theme="classic-dark"] .wsb-line--active .wsb-word--spoken,
[data-theme="dark"] .wsb-line--active .wsb-word--current,
[data-theme="classic-dark"] .wsb-line--active .wsb-word--current {
  color: #ffffff;
  opacity: 1;
}
[data-theme="dark"] .wsb-line--active .wsb-word--current,
[data-theme="classic-dark"] .wsb-line--active .wsb-word--current {
  text-shadow: 0 0 24px rgba(255, 255, 255, 0.16);
}
[data-theme="dark"] .wsb-line--active,
[data-theme="classic-dark"] .wsb-line--active {
  color: #ffffff;
}
[data-theme="dark"] .wsb-line--adjacent,
[data-theme="classic-dark"] .wsb-line--adjacent,
[data-theme="dark"] .wsb-line--past,
[data-theme="classic-dark"] .wsb-line--past,
[data-theme="dark"] .wsb-line--future,
[data-theme="classic-dark"] .wsb-line--future {
  color: rgba(255, 255, 255, 0.72);
}
[data-theme="dark"] .wsb-picker-menu,
[data-theme="classic-dark"] .wsb-picker-menu {
  background: var(--festag-black-popup, #121214);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.55);
}
[data-theme="dark"] .wsb-picker,
[data-theme="classic-dark"] .wsb-picker {
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--fp-text, #f4f4f5);
}
[data-theme="dark"] .wsb-picker:hover,
[data-theme="classic-dark"] .wsb-picker:hover {
  background: rgba(255, 255, 255, 0.06);
}
[data-theme="dark"] .wsb-btn-play,
[data-theme="classic-dark"] .wsb-btn-play {
  background: var(--festag-btn-dark, #2d2e2c);
  color: #fff;
  border-color: transparent;
  box-shadow: none;
}
[data-theme="dark"] .wsb-btn-play:hover:not(:disabled),
[data-theme="classic-dark"] .wsb-btn-play:hover:not(:disabled) {
  background: var(--festag-btn-dark-hover, #000);
  box-shadow: none;
}
[data-theme="dark"] .wsb-tagro-backdrop,
[data-theme="classic-dark"] .wsb-tagro-backdrop {
  background: var(--festag-btn-dark, #2d2e2c) !important;
  color: #fff !important;
}
[data-theme="dark"] .wsb-tagro-backdrop:hover:not(:disabled),
[data-theme="classic-dark"] .wsb-tagro-backdrop:hover:not(:disabled) {
  background: var(--festag-btn-dark-hover, #000) !important;
}
[data-theme="dark"] .wsb-tagro-ask,
[data-theme="classic-dark"] .wsb-tagro-ask {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
[data-theme="dark"] .wsb-tagro-dock,
[data-theme="classic-dark"] .wsb-tagro-dock {
  background: var(--festag-black-popup, #121214);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.05),
    0 16px 44px -18px rgba(0, 0, 0, 0.55),
    0 4px 14px -6px rgba(0, 0, 0, 0.35);
}
[data-theme="dark"] .wsb-tagro-dock:focus-within,
[data-theme="classic-dark"] .wsb-tagro-dock:focus-within {
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.06),
    0 18px 48px -16px rgba(0, 0, 0, 0.58),
    0 0 0 3px rgba(255, 255, 255, 0.04);
}
[data-theme="dark"] .wsb-tagro-ask:focus-within,
[data-theme="classic-dark"] .wsb-tagro-ask:focus-within {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.04);
}
[data-theme="dark"] .wsb-tagro-ask-send:not(:disabled),
[data-theme="classic-dark"] .wsb-tagro-ask-send:not(:disabled) {
  background: #fff;
  color: #000;
}
[data-theme="dark"] .wsb-tagro-ask-send:hover:not(:disabled),
[data-theme="classic-dark"] .wsb-tagro-ask-send:hover:not(:disabled) {
  background: color-mix(in srgb, #fff 92%, #000);
}
[data-theme="dark"] .wsb-btn-tagro,
[data-theme="classic-dark"] .wsb-btn-tagro {
  background: rgba(255, 255, 255, 0.06);
  color: var(--fp-text, #f4f4f5);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 2px 6px -2px rgba(0, 0, 0, 0.28);
}
[data-theme="dark"] .wsb-btn-tagro:hover,
[data-theme="classic-dark"] .wsb-btn-tagro:hover {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 2px 6px -2px rgba(0, 0, 0, 0.32);
}
[data-theme="dark"] .wsb-btn-tagro:active,
[data-theme="classic-dark"] .wsb-btn-tagro:active {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .wsb-btn-ghost,
[data-theme="classic-dark"] .wsb-btn-ghost {
  color: var(--fp-text, #f4f4f5);
}
[data-theme="dark"] .wsb-btn-ghost:hover,
[data-theme="classic-dark"] .wsb-btn-ghost:hover {
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
}
[data-theme="dark"] .wsb-btn-ghost:active,
[data-theme="classic-dark"] .wsb-btn-ghost:active {
  background: rgba(255, 255, 255, 0.09);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .wsb-tool,
[data-theme="classic-dark"] .wsb-tool {
  border-color: rgba(255, 255, 255, 0.1);
  color: #9aa0ac;
}
[data-theme="dark"] .wsb-tool:hover,
[data-theme="classic-dark"] .wsb-tool:hover,
[data-theme="dark"] .wsb-tool[aria-pressed="true"],
[data-theme="classic-dark"] .wsb-tool[aria-pressed="true"] {
  color: #f4f4f5;
  background: rgba(255, 255, 255, 0.06);
}

@media (min-width: 769px) {
  .festag-modal-host:has(.festag-modal-surface--briefing) {
    align-items: center !important;
    justify-content: center !important;
    padding: 40px 48px !important;
  }
}

@media (max-width: 768px) {
  .festag-modal-host:has(.festag-modal-surface--briefing) {
    align-items: center !important;
    justify-content: center !important;
    padding: 16px !important;
    background: rgba(0, 0, 0, 0.8) !important;
  }
  .festag-modal-surface--briefing,
  .festag-modal-surface--briefing-mobile {
    width: calc(100vw - 32px) !important;
    max-width: calc(100vw - 32px) !important;
    border-radius: 12px !important;
    border-bottom: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.08)) 100%, transparent);
    max-height: min(78dvh, 680px) !important;
  }
  .festag-modal-surface--briefing .festag-popup-drag-area {
    display: flex !important;
    flex-shrink: 0;
    padding: 10px 0 6px;
  }
  .wsb-shell--mobile {
    padding: 12px 18px 16px;
    max-height: none;
    min-height: min(340px, calc(68dvh - 64px));
    overflow: hidden;
  }
  .wsb-composer-tray {
    min-height: 56px;
    padding: 10px 10px 12px 14px;
  }
  .wsb-composer-input {
    height: 36px;
    font-size: 15px;
  }
  .wsb-close { display: none; }
  .wsb-meta {
    padding: 2px 0 8px;
  }
  .wsb-filter-row--mobile {
    flex-wrap: wrap;
    gap: 8px;
  }
  .wsb-filter-row--mobile .wsb-picker-wrap {
    flex: 1 1 calc(50% - 4px);
    min-width: 0;
  }
  .wsb-filter-row--mobile .wsb-intel-wrap {
    flex: 1 1 100%;
    width: 100%;
  }
  .wsb-filter-row--mobile .wsb-intel-wrap .wsb-picker {
    width: 100%;
    max-width: none;
    height: 36px;
    overflow: visible;
    text-overflow: unset;
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
  .wsb-lyrics-stage { min-height: 180px; flex: 1 1 auto; }
  .wsb-lyrics-track { padding: 2px 28px 2px 0; gap: 22px; }
  .wsb-line { font-size: clamp(20px, 5.4vw, 28px); }
  .wsb-line--active { font-size: clamp(24px, 6vw, 32px); }
  .wsb-shell--mobile .wsb-tagro-ask {
    margin-top: 0;
  }
  .wsb-tagro-ask { display: none; }
  .wsb-tagro-backdrop { display: none !important; }
  .wsb-footer--mobile {
    gap: 8px;
  }
  .wsb-footer--mobile .wsb-btn-play,
  .wsb-footer--mobile .wsb-btn-ghost,
  .wsb-footer--mobile .wsb-btn-tagro {
    width: 100%;
    height: 44px;
    min-height: 44px;
    font-size: 15px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wsb-wave span { animation: none; opacity: 0.55; }
  .wsb-intro, .wsb-line, .wsb-lyrics-track { transition: none; }
  .wsb-shell--playing .wsb-intro { transform: none; opacity: 0; filter: none; }
  .wsb-tagro-dock-wrap { animation: none; }
}
`
