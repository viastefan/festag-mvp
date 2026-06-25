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
  background: rgba(0, 0, 0, 0.52) !important;
  backdrop-filter: blur(12px) saturate(120%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(120%) !important;
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
  border-radius: 28px !important;
  overflow: visible !important;
  border: 0.5px solid rgba(0, 0, 0, 0.06);
  background: #ffffff;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  --wsb-accent: #5b647d;
  --wsb-accent-deep: #4f586d;
  --wsb-accent-soft: #f5f5f7;
  --wsb-accent-wave: color-mix(in srgb, #5b647d 34%, transparent);
  --wsb-apple-gray: #f5f5f7;
  --wsb-apple-gray-soft: #f2f2f7;
  --wsb-apple-gray-highlight: #fafafc;
  --wsb-apple-gray-hover: #ebebed;
  --text: #1d1d1f;
  --text-secondary: #86868b;
  --text-muted: #aeaeb2;
  --surface: #ffffff;
  --surface-2: var(--wsb-apple-gray, #f5f5f7);
  --border: rgba(0, 0, 0, 0.06);
  --bg: #ffffff;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.04),
    0 24px 80px -32px rgba(0, 0, 0, 0.28);
}

.wsb-composer {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  max-height: min(90vh, 820px);
  overflow: visible;
}

.wsb-inline-tagro {
  flex-shrink: 0;
  width: 100%;
  margin-top: 14px;
  padding: 0;
  box-sizing: border-box;
}

.wsb-inline-tagro .tagro-composer--briefing {
  width: 100%;
}

.wsb-inline-tagro .tagro-composer--briefing .tagro-composer-bar {
  min-height: 52px;
  padding: 8px 10px 8px 6px;
  gap: 8px;
  border-radius: 999px;
  background: var(--wsb-apple-gray, #f5f5f7);
  border: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
  align-items: center;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.wsb-inline-tagro .tagro-composer--briefing .tagro-composer-bar.is-focused,
.wsb-inline-tagro .tagro-composer--briefing .tagro-composer-bar:focus-within {
  background: #ffffff;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.06),
    0 8px 24px -12px rgba(0, 0, 0, 0.12);
}

.wsb-inline-tagro .btg-plus-wrap {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  align-self: center;
  margin-left: 2px;
}

.wsb-inline-tagro .tagro-composer--briefing .tagro-composer-plus {
  width: 32px;
  height: 32px;
  margin: 0;
  border: none;
  background: transparent;
  color: #86868b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 999px;
  transition: background 0.15s ease, color 0.15s ease;
}

.wsb-inline-tagro .tagro-composer--briefing .tagro-composer-plus:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #1d1d1f;
}

.wsb-inline-tagro .btg-attach-menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 30;
  min-width: 132px;
  padding: 6px;
  border-radius: 14px;
  background: #ffffff;
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.18);
}

.wsb-inline-tagro .btg-attach-menu button {
  display: block;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #1d1d1f;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.wsb-inline-tagro .btg-attach-menu button:hover {
  background: #f5f5f7;
}

.wsb-inline-tagro .btg-attach-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.wsb-inline-tagro .btg-attach-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  height: 28px;
  padding: 0 8px 0 10px;
  border-radius: 999px;
  background: #f5f5f7;
  color: #1d1d1f;
  font-size: 11.5px;
}

.wsb-inline-tagro .btg-attach-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wsb-inline-tagro .btg-attach-chip button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #86868b;
  cursor: pointer;
}

.wsb-inline-tagro .tagro-composer--briefing .tagro-composer-input {
  flex: 1;
  min-width: 0;
  align-self: center;
  font-size: 14px;
  font-weight: 500;
  min-height: 24px;
  max-height: 96px;
  padding: 0;
  line-height: 1.35;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: #1d1d1f;
}

.wsb-inline-tagro .tagro-composer--briefing .tagro-composer-input::placeholder {
  color: #aeaeb2;
}

.wsb-inline-tagro .tagro-composer--briefing .tagro-composer-send {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #c7c7cc;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.wsb-inline-tagro .tagro-composer--briefing .tagro-composer-send.is-visible {
  background: color-mix(in srgb, var(--wsb-accent, #5b647d) 42%, #f5f5f7);
  color: #ffffff;
}

.wsb-inline-tagro .tagro-composer--briefing .tagro-composer-send.is-visible:not(:disabled) {
  background: var(--wsb-accent, #5b647d);
  color: #fff;
}

.wsb-inline-tagro .tagro-composer--briefing .tagro-composer-send:disabled {
  opacity: 1;
  cursor: default;
}

.festag-modal-surface--briefing .festag-popup-drag-area {
  display: none;
}

@media (max-width: 768px) {
  .festag-modal-surface--briefing .festag-popup-drag-area {
    display: flex !important;
  }
}

.festag-modal-surface--briefing .festag-modal-body {
  padding: 0;
  overflow: visible;
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
  padding: 36px 40px 32px;
  border-radius: 28px;
  background: #ffffff;
  color: #1d1d1f;
  overflow: visible;
  box-sizing: border-box;
  --wsb-shell-bg: #ffffff;
}

.wsb-shell-kicker {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0 0 10px;
}

.wsb-shell-kicker-label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: #86868b;
}

.wsb-shell--playing,
.wsb-shell--summary {
  min-height: min(460px, calc(76vh - 64px));
}

.wsb-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 6;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--wsb-apple-gray, #f5f5f7);
  color: #86868b;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.wsb-close:hover {
  background: var(--wsb-apple-gray-hover, #ebebed);
  color: #1d1d1f;
}

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
  padding: 0;
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
  gap: 5px;
  height: 30px;
  padding: 0 11px;
  border: none;
  border-radius: 999px;
  background: var(--wsb-apple-gray, #f5f5f7);
  color: #1d1d1f;
  font-family: inherit;
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.15s ease;
}
.wsb-picker:hover {
  background: var(--wsb-apple-gray-hover, #ebebed);
}
.wsb-picker svg:last-child { opacity: 0.42; }
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

.wsb-picker-menu--portal {
  position: fixed;
  max-height: min(280px, calc(100vh - 96px));
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
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

.wsb-intel-wrap .wsb-picker {
  background: var(--wsb-accent, #5b647d);
  color: #ffffff;
  font-weight: 500;
}

.wsb-intel-wrap .wsb-picker:hover {
  background: color-mix(in srgb, var(--wsb-accent, #5b647d) 92%, #fff);
}

.wsb-intel-wrap .wsb-picker svg {
  display: none;
}

/* Stage — see lyrics viewport block below */

.wsb-stage-lead {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-shrink: 0;
  padding: 2px 36px 0 2px;
  transition: opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.wsb-stage-sparkle {
  flex-shrink: 0;
  margin-top: 5px;
  color: var(--wsb-accent, #5b647d);
}

.wsb-stage-lead-text {
  margin: 0;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 24px;
  font-weight: 500;
  line-height: 1.28;
  letter-spacing: -0.028em;
  color: var(--fp-text, #18181b);
}

.wsb-stage-lead--past {
  opacity: 0.72;
}

.wsb-stage-lead--active .wsb-stage-lead-text {
  color: var(--fp-text, #18181b);
}

.wsb-shell--playing .wsb-stage {
  margin: 0 0 12px;
  flex: 1 1 auto;
  min-height: 0;
  justify-content: center;
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

/* Stage — lyrics viewport (~6 lines), centered in shell */
.wsb-stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin: 0 0 12px;
  overflow: hidden;
}

.wsb-lyrics-mask {
  width: 100%;
  max-width: 100%;
  min-height: 0;
  flex: 0 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

.wsb-lyrics-stage {
  --wsb-line-height: 1.45;
  --wsb-prose-size: 24px;
  --wsb-lines-visible: 6;
  --wsb-prose-max-width: 460px;
  --wsb-viewport-height: calc(var(--wsb-prose-size) * var(--wsb-line-height) * var(--wsb-lines-visible));
  position: relative;
  width: var(--wsb-prose-max-width);
  max-width: var(--wsb-prose-max-width);
  min-width: var(--wsb-prose-max-width);
  height: var(--wsb-viewport-height);
  max-height: var(--wsb-viewport-height);
  flex: 0 0 var(--wsb-viewport-height);
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
}

.wsb-lyrics-stage::before,
.wsb-lyrics-stage::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  z-index: 2;
  pointer-events: none;
}

.wsb-lyrics-stage::before {
  top: 0;
  height: 52%;
  background: linear-gradient(
    180deg,
    var(--wsb-shell-bg, #fff) 0%,
    color-mix(in srgb, var(--wsb-shell-bg, #fff) 72%, transparent) 38%,
    transparent 100%
  );
}

.wsb-lyrics-stage::after {
  bottom: 0;
  height: 28%;
  background: linear-gradient(
    0deg,
    var(--wsb-shell-bg, #fff) 0%,
    color-mix(in srgb, var(--wsb-shell-bg, #fff) 55%, transparent) 55%,
    transparent 100%
  );
}

.wsb-lyrics-stage--idle::before {
  height: 38%;
  opacity: 0.85;
}

.wsb-lyrics-track {
  width: var(--wsb-prose-max-width, 460px);
  max-width: var(--wsb-prose-max-width, 460px);
  margin: 0 auto;
  padding: calc(var(--wsb-viewport-height) * 0.22) 0 calc(var(--wsb-viewport-height) * 1.4) 0;
  box-sizing: border-box;
  will-change: transform;
  transition: transform 0.78s cubic-bezier(0.22, 1, 0.36, 1);
}

.festag-modal-surface--briefing .wsb-prose,
.festag-modal-surface--briefing .wsb-prose-word {
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-weight: 400;
  letter-spacing: -0.5px;
}

.wsb-prose {
  margin: 0 auto;
  width: var(--wsb-prose-max-width, 460px);
  max-width: var(--wsb-prose-max-width, 460px);
  min-width: var(--wsb-prose-max-width, 460px);
  text-align: center;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: var(--wsb-prose-size, 25px);
  font-weight: 400;
  font-synthesis: none;
  line-height: var(--wsb-line-height, 1.45);
  letter-spacing: -0.5px;
  color: var(--fp-text, #18181b);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.wsb-prose-word {
  display: inline;
  font-weight: 400;
  letter-spacing: inherit;
  color: #86868b;
  transition:
    opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.wsb-lyrics-stage--idle .wsb-prose-word--lead {
  color: #6e6e73;
  opacity: 0.82;
}

.wsb-lyrics-stage--idle .wsb-prose-word--future {
  color: #aeaeb2;
  opacity: 0.52;
}

.wsb-prose-word--future,
.wsb-prose-word--adjacent {
  color: #aeaeb2;
  opacity: 0.42;
}

.wsb-prose-word--past {
  color: #86868b;
  opacity: 0.58;
}

.wsb-prose-word--lead {
  color: #86868b;
  opacity: 0.55;
}

.wsb-prose-word--active.wsb-prose-word--pending {
  color: #aeaeb2;
  opacity: 0.48;
}

.wsb-prose-word--active.wsb-prose-word--spoken {
  color: #1d1d1f;
  opacity: 0.82;
}

.wsb-prose-word--active.wsb-prose-word--current {
  color: #1d1d1f;
  opacity: 1;
  font-weight: 400;
}

.wsb-lyrics-stage--live .wsb-prose-word--past {
  color: #86868b;
  opacity: 0.5;
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
  gap: 0;
  margin-top: auto;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding-top: 0;
  overflow: visible;
}

.wsb-audio-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.wsb-controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.wsb-controls-row--live {
  animation: wsbControlsIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes wsbControlsIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.wsb-controls-row .wsb-transport {
  flex-shrink: 0;
}

.wsb-controls-row .wsb-volume-row {
  flex: 1 1 auto;
  min-width: 0;
}

.wsb-transport--compact {
  gap: 4px;
}

.wsb-transport--compact .wsb-tool--inline {
  width: 32px;
  min-width: 32px;
  max-width: 32px;
  height: 32px;
}

.wsb-transport--compact .wsb-tool--inline svg {
  width: 16px;
  height: 16px;
}

.wsb-transport--compact .wsb-tool--speed {
  min-width: 44px;
  height: 32px;
  padding: 0 8px;
  font-size: 11px;
}

.wsb-footer-meta {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  width: 100%;
  min-width: 0;
  margin-top: 2px;
  padding-top: 0;
}

.wsb-footer-meta .wsb-filter-row {
  width: 100%;
}

.wsb-footer-meta .wsb-summary-link {
  align-self: flex-start;
  max-width: none;
  padding-left: 2px;
}

.wsb-footer-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
  margin-top: 2px;
  padding-top: 0;
}

.wsb-footer-meta-row .wsb-filter-row {
  flex: 1 1 auto;
  min-width: 0;
}

.wsb-footer-meta-row .wsb-summary-link {
  flex-shrink: 0;
  max-width: min(42%, 240px);
}

.wsb-audio-capsule {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 6px 14px 6px 6px;
  border: 0;
  border-radius: 999px;
  background: var(--wsb-apple-gray, #f5f5f7);
  color: #1d1d1f;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transition: background 0.15s ease, opacity 0.15s ease;
}

.wsb-audio-capsule:hover:not(:disabled) {
  background: var(--wsb-apple-gray-hover, #ebebed);
  box-shadow: none;
}

.wsb-audio-capsule:active:not(:disabled) {
  opacity: 0.92;
}

.wsb-audio-capsule:disabled {
  opacity: 0.45;
  cursor: default;
}

.wsb-audio-capsule--live {
  box-shadow: none;
}

.wsb-audio-capsule--solo {
  margin-top: 4px;
}

.wsb-audio-capsule-play {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: var(--wsb-accent, #5b647d);
  color: #fff;
  box-shadow: none;
}

.wsb-audio-capsule:hover:not(:disabled) .wsb-audio-capsule-play {
  background: color-mix(in srgb, var(--wsb-accent, #5b647d) 92%, #fff);
}

.wsb-audio-capsule-label {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: -0.012em;
  color: #1d1d1f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wsb-audio-capsule-duration {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  color: var(--fp-muted, #86868b);
}

.wsb-capsule-wave {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  width: 88px;
  height: 28px;
  overflow: hidden;
}

.wsb-capsule-wave span {
  display: block;
  width: 2px;
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, #86868b 72%, transparent);
  opacity: 0.45;
  transform-origin: center bottom;
  animation: wsbCapsuleWave 1.35s ease-in-out infinite;
}

.wsb-capsule-wave span:nth-child(1) { height: 10px; animation-delay: 0s; }
.wsb-capsule-wave span:nth-child(2) { height: 16px; animation-delay: 0.04s; }
.wsb-capsule-wave span:nth-child(3) { height: 22px; animation-delay: 0.08s; }
.wsb-capsule-wave span:nth-child(4) { height: 14px; animation-delay: 0.12s; }
.wsb-capsule-wave span:nth-child(5) { height: 24px; animation-delay: 0.16s; }
.wsb-capsule-wave span:nth-child(6) { height: 18px; animation-delay: 0.2s; }
.wsb-capsule-wave span:nth-child(7) { height: 12px; animation-delay: 0.24s; }
.wsb-capsule-wave span:nth-child(8) { height: 20px; animation-delay: 0.28s; }
.wsb-capsule-wave span:nth-child(9) { height: 15px; animation-delay: 0.32s; }
.wsb-capsule-wave span:nth-child(10) { height: 26px; animation-delay: 0.36s; }
.wsb-capsule-wave span:nth-child(11) { height: 17px; animation-delay: 0.4s; }
.wsb-capsule-wave span:nth-child(12) { height: 11px; animation-delay: 0.44s; }
.wsb-capsule-wave span:nth-child(13) { height: 21px; animation-delay: 0.48s; }
.wsb-capsule-wave span:nth-child(14) { height: 13px; animation-delay: 0.52s; }
.wsb-capsule-wave span:nth-child(15) { height: 19px; animation-delay: 0.56s; }
.wsb-capsule-wave span:nth-child(16) { height: 9px; animation-delay: 0.6s; }

.wsb-capsule-wave--live span {
  opacity: 0.92;
  animation-play-state: running;
}

@keyframes wsbCapsuleWave {
  0%, 100% { transform: scaleY(0.35); opacity: 0.38; }
  50% { transform: scaleY(1); opacity: 1; }
}

.wsb-audio-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.wsb-transport--minimal .wsb-tool {
  border: 0;
  background: var(--wsb-apple-gray, #f5f5f7);
  color: var(--fp-muted, #86868b);
}

.wsb-transport--minimal .wsb-tool:hover:not(:disabled) {
  color: var(--fp-text, #18181b);
  background: var(--wsb-apple-gray-hover, #ebebed);
}

.wsb-transport--minimal .wsb-tool--speed {
  background: var(--wsb-apple-gray, #f5f5f7);
  color: var(--fp-text, #18181b);
}

.wsb-volume-mute {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--wsb-apple-gray, #f5f5f7);
  color: var(--fp-muted, #86868b);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.wsb-volume-mute:hover {
  background: var(--wsb-apple-gray-hover, #ebebed);
  color: var(--fp-text, #18181b);
}

.wsb-volume-mute[aria-pressed="true"] {
  color: var(--fp-text, #18181b);
}

.wsb-offline-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  width: 100%;
  padding: 10px 0 0;
}

.wsb-offline-hint-label {
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.01em;
  color: #aeaeb2;
}

.wsb-offline-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 11px;
  border: none;
  border-radius: 999px;
  background: var(--wsb-apple-gray, #f5f5f7);
  color: #1d1d1f;
  font-family: inherit;
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.15s ease;
}

.wsb-offline-chip:hover {
  background: var(--wsb-apple-gray-hover, #ebebed);
}

.wsb-offline-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.wsb-delivery-notice {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(215, 0, 21, 0.08);
  color: #be123c;
  font-size: 12px;
  line-height: 1.4;
}

.wsb-ctx-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9650;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.wsb-ctx-backdrop--mobile {
  align-items: flex-end;
  justify-content: flex-end;
  padding: 0;
}

.wsb-ctx-sheet {
  width: 100%;
  max-width: 420px;
  max-height: min(72vh, 520px);
  display: flex;
  flex-direction: column;
  padding: 18px 18px 14px;
  border-radius: 24px;
  background: #ffffff;
  border: 0.5px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 24px 64px -24px rgba(0, 0, 0, 0.28);
}

.wsb-ctx-sheet--mobile {
  max-width: 100%;
  border-radius: 20px 20px 0 0;
  padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
}

.wsb-ctx-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.wsb-ctx-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #86868b;
}

.wsb-ctx-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #1d1d1f;
}

.wsb-ctx-close {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #f5f5f7;
  color: #86868b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.wsb-ctx-search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 12px;
  margin-bottom: 10px;
  border-radius: 12px;
  background: #f5f5f7;
  color: #86868b;
}

.wsb-ctx-search-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #1d1d1f;
  font: inherit;
  font-size: 14px;
}

.wsb-ctx-results {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.wsb-ctx-group {
  margin-bottom: 8px;
}

.wsb-ctx-group-label {
  margin: 0 0 4px;
  padding: 0 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #86868b;
}

.wsb-ctx-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.wsb-ctx-item:hover,
.wsb-ctx-item.on {
  background: #f5f5f7;
}

.wsb-ctx-item-title {
  font-size: 13px;
  font-weight: 500;
  color: #1d1d1f;
}

.wsb-ctx-item-sub {
  font-size: 11.5px;
  color: #86868b;
}

.wsb-ctx-empty {
  margin: 0;
  padding: 16px 8px;
  font-size: 13px;
  color: #86868b;
  text-align: center;
}

.wsb-offline-chip svg {
  flex-shrink: 0;
}

.wsb-offline-chip svg:not([fill="#25D366"]) {
  color: var(--fp-muted, #86868b);
}

.wsb-connect-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.wsb-connect-backdrop--mobile {
  align-items: flex-end;
  justify-content: flex-end;
  padding: 0;
  background: rgba(0, 0, 0, 0.5);
}

.wsb-connect-sheet {
  width: 100%;
  max-width: 420px;
  padding: 22px 22px 18px;
  border-radius: 24px;
  border: 0.5px solid rgba(0, 0, 0, 0.06);
  background: #ffffff;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.04),
    0 24px 64px -24px rgba(0, 0, 0, 0.28);
}

.wsb-connect-sheet--mobile {
  max-width: 100%;
  border-radius: 20px 20px 0 0;
  border-bottom: none;
  border-left: none;
  border-right: none;
  padding: 22px 20px calc(18px + env(safe-area-inset-bottom, 0px));
  box-shadow:
    0 -1px 2px rgba(0, 0, 0, 0.28),
    0 -24px 56px -20px rgba(0, 0, 0, 0.55);
}

.wsb-connect-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.wsb-connect-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: #1d1d1f;
}

.wsb-connect-sub {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: #86868b;
}

.wsb-connect-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--wsb-apple-gray, #f5f5f7);
  color: var(--fp-muted, #86868b);
  cursor: pointer;
}

.wsb-connect-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.wsb-connect-label {
  font-size: 12px;
  color: var(--fp-muted, #86868b);
}

.wsb-connect-input {
  width: 100%;
  height: 47px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  background: var(--wsb-apple-gray, #f5f5f7);
  color: #1d1d1f;
  font: inherit;
  font-size: 14px;
  font-weight: 400;
  box-sizing: border-box;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.wsb-connect-input:focus {
  outline: none;
  background: #ffffff;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.06),
    0 8px 24px -12px rgba(0, 0, 0, 0.12);
}

.wsb-connect-input::placeholder {
  color: #aeaeb2;
}

.wsb-connect-segment {
  display: inline-flex;
  gap: 4px;
  margin-bottom: 12px;
  padding: 3px;
  border-radius: 999px;
  background: var(--wsb-apple-gray, #f5f5f7);
}

.wsb-connect-segment button {
  height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--fp-muted, #86868b);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.wsb-connect-segment button.on {
  background: #fff;
  color: var(--fp-text, #18181b);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.wsb-connect-error {
  margin: 0 0 10px;
  font-size: 12px;
  color: #d70015;
}

.wsb-connect-submit {
  width: 100%;
  height: 47px;
  border: 0.7px solid #e7ebf0;
  border-radius: 32px;
  background: #ffffff;
  color: #202532;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  transition: background 0.15s ease, border-color 0.15s ease;
}

.wsb-connect-submit:hover:not(:disabled) {
  background: #f7f8fb;
  border-color: #dce1ea;
}

.wsb-connect-submit:disabled {
  opacity: 0.55;
  cursor: default;
}

[data-theme="dark"] .wsb-connect-sheet,
[data-theme="classic-dark"] .wsb-connect-sheet {
  background: var(--festag-black-content, #0c0c0e);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .wsb-connect-input,
[data-theme="classic-dark"] .wsb-connect-input {
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: #f4f4f5;
  box-shadow: none;
}

[data-theme="dark"] .wsb-connect-input:focus,
[data-theme="classic-dark"] .wsb-connect-input:focus {
  background: rgba(255, 255, 255, 0.09);
  box-shadow: none;
}

[data-theme="dark"] .wsb-connect-segment,
[data-theme="classic-dark"] .wsb-connect-segment {
  background: rgba(255, 255, 255, 0.06);
}

[data-theme="dark"] .wsb-connect-segment button.on,
[data-theme="classic-dark"] .wsb-connect-segment button.on {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  box-shadow: none;
}

[data-theme="dark"] .wsb-connect-submit,
[data-theme="classic-dark"] .wsb-connect-submit {
  background: #ffffff;
  color: #000000;
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: none;
}

[data-theme="dark"] .wsb-connect-submit:hover:not(:disabled),
[data-theme="classic-dark"] .wsb-connect-submit:hover:not(:disabled) {
  background: #f2f2f2;
}

[data-theme="dark"] .wsb-connect-title,
[data-theme="classic-dark"] .wsb-connect-title {
  color: #f4f4f5;
}

[data-theme="dark"] .wsb-connect-sub,
[data-theme="classic-dark"] .wsb-connect-sub {
  color: #9a9aa0;
}

.wsb-summary-link {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: min(44%, 200px);
  padding: 0;
  border: 0;
  background: transparent;
  color: #86868b;
  font-family: inherit;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
  cursor: pointer;
  text-align: right;
  transition: color 0.15s ease;
}

.wsb-summary-link span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wsb-summary-link:hover {
  color: #1d1d1f;
}

.wsb-summary-link svg {
  flex-shrink: 0;
  opacity: 0.55;
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
  width: 100%;
  padding: 0;
}

.wsb-tagro-dock .tagro-composer,
.wsb-tagro-dock-composer {
  width: 100%;
}

.wsb-tagro-dock .tagro-composer-bar,
.wsb-tagro-dock-composer .tagro-composer-bar {
  min-height: 58px;
  padding: 8px 10px 8px 14px;
  border-radius: 28px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.1)) 100%, transparent);
  background: var(--fp-bg, #fff);
  box-shadow:
    0 0 0 0.5px rgba(24, 24, 27, 0.04),
    0 22px 54px -14px rgba(0, 0, 0, 0.32),
    0 10px 28px -10px rgba(0, 0, 0, 0.18),
    0 2px 8px -2px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.wsb-tagro-dock .tagro-composer-bar:focus-within,
.wsb-tagro-dock-composer .tagro-composer-bar:focus-within {
  border-color: color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.14)) 100%, transparent);
  box-shadow:
    0 0 0 0.5px rgba(24, 24, 27, 0.05),
    0 26px 60px -14px rgba(0, 0, 0, 0.34),
    0 12px 32px -10px rgba(0, 0, 0, 0.2),
    0 0 0 3px rgba(15, 23, 42, 0.04);
}

.wsb-tagro-dock .tagro-composer-input {
  font-size: 15px;
  font-weight: 500;
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
  padding-top: 0;
  box-sizing: border-box;
  animation: wsbFadeIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
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
  --wsb-accent: #5b647d;
  --wsb-accent-deep: #4f586d;
  --wsb-accent-soft: color-mix(in srgb, #5b647d 16%, var(--festag-black-popup, #121214));
  --wsb-accent-wave: color-mix(in srgb, #5b647d 48%, transparent);
  --wsb-apple-gray: color-mix(in srgb, var(--festag-black-content, #0c0c0e) 94%, #fff 6%);
  --wsb-apple-gray-soft: color-mix(in srgb, var(--festag-black-content, #0c0c0e) 92%, #fff 8%);
  --wsb-apple-gray-highlight: color-mix(in srgb, var(--festag-black-content, #0c0c0e) 90%, #fff 10%);
}
[data-theme="dark"] .wsb-shell,
[data-theme="classic-dark"] .wsb-shell {
  background: var(--festag-black-popup, #121214);
  --wsb-shell-bg: var(--festag-black-popup, #121214);
}
[data-theme="dark"] .wsb-line--lead,
[data-theme="classic-dark"] .wsb-line--lead {
  color: #f4f4f5;
}
[data-theme="dark"] .wsb-audio-capsule,
[data-theme="classic-dark"] .wsb-audio-capsule {
  background: rgba(255, 255, 255, 0.06);
  box-shadow: none;
}
[data-theme="dark"] .wsb-audio-capsule:hover:not(:disabled),
[data-theme="classic-dark"] .wsb-audio-capsule:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: none;
}
[data-theme="dark"] .wsb-audio-capsule-play,
[data-theme="classic-dark"] .wsb-audio-capsule-play {
  background: var(--wsb-accent, #5b647d);
  color: #fff;
  box-shadow: none;
}
[data-theme="dark"] .wsb-audio-capsule:hover:not(:disabled) .wsb-audio-capsule-play,
[data-theme="classic-dark"] .wsb-audio-capsule:hover:not(:disabled) .wsb-audio-capsule-play {
  background: color-mix(in srgb, var(--wsb-accent, #5b647d) 92%, #fff);
}
[data-theme="dark"] .wsb-shell-kicker-label,
[data-theme="classic-dark"] .wsb-shell-kicker-label {
  color: #8e8e93;
}
[data-theme="dark"] .wsb-audio-capsule-label,
[data-theme="classic-dark"] .wsb-audio-capsule-label {
  color: var(--fp-text, #f4f4f5);
}
[data-theme="dark"] .wsb-footer-meta,
[data-theme="classic-dark"] .wsb-footer-meta,
[data-theme="dark"] .wsb-footer-meta-row,
[data-theme="classic-dark"] .wsb-footer-meta-row {
  border-top-color: rgba(255, 255, 255, 0.08);
}
[data-theme="dark"] .wsb-close,
[data-theme="classic-dark"] .wsb-close {
  background: rgba(255, 255, 255, 0.08);
  color: #8e8e93;
}
[data-theme="dark"] .wsb-close:hover,
[data-theme="classic-dark"] .wsb-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #f4f4f5;
}
[data-theme="dark"] .wsb-picker,
[data-theme="classic-dark"] .wsb-picker {
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: var(--fp-text, #f4f4f5);
}
[data-theme="dark"] .wsb-picker:hover,
[data-theme="classic-dark"] .wsb-picker:hover {
  background: rgba(255, 255, 255, 0.1);
}
[data-theme="dark"] .wsb-offline-chip,
[data-theme="classic-dark"] .wsb-offline-chip {
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
}
[data-theme="dark"] .wsb-stage-lead-text,
[data-theme="classic-dark"] .wsb-stage-lead-text {
  color: var(--fp-text, #f4f4f5);
}
[data-theme="dark"] .wsb-inline-tagro .tagro-composer-bar,
[data-theme="classic-dark"] .wsb-inline-tagro .tagro-composer-bar {
  background:
    radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, #fff 6%, var(--wsb-apple-gray, #121214)), transparent 58%),
    var(--wsb-apple-gray, #121214);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
[data-theme="dark"] .wsb-tagro-dock .tagro-composer-bar,
[data-theme="classic-dark"] .wsb-tagro-dock .tagro-composer-bar,
[data-theme="dark"] .wsb-tagro-dock-composer .tagro-composer-bar,
[data-theme="classic-dark"] .wsb-tagro-dock-composer .tagro-composer-bar {
  background: var(--festag-black-popup, #121214);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.05),
    0 22px 54px -14px rgba(0, 0, 0, 0.55),
    0 10px 28px -10px rgba(0, 0, 0, 0.38);
}
[data-theme="dark"] .wsb-tagro-dock .tagro-composer-send:not(:disabled),
[data-theme="classic-dark"] .wsb-tagro-dock .tagro-composer-send:not(:disabled),
[data-theme="dark"] .wsb-inline-tagro .tagro-composer-send:not(:disabled),
[data-theme="classic-dark"] .wsb-inline-tagro .tagro-composer-send:not(:disabled) {
  background: #fff;
  color: #000;
}
[data-theme="dark"] .wsb-tagro-dock .tagro-composer-send:hover:not(:disabled),
[data-theme="classic-dark"] .wsb-tagro-dock .tagro-composer-send:hover:not(:disabled),
[data-theme="dark"] .wsb-inline-tagro .tagro-composer-send:hover:not(:disabled),
[data-theme="classic-dark"] .wsb-inline-tagro .tagro-composer-send:hover:not(:disabled) {
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
[data-theme="dark"] .wsb-transport--minimal .wsb-tool,
[data-theme="classic-dark"] .wsb-transport--minimal .wsb-tool,
[data-theme="dark"] .wsb-volume-mute,
[data-theme="classic-dark"] .wsb-volume-mute,
[data-theme="dark"] .wsb-offline-chip,
[data-theme="classic-dark"] .wsb-offline-chip {
  background: rgba(255, 255, 255, 0.06);
}
[data-theme="dark"] .wsb-transport--minimal .wsb-tool:hover:not(:disabled),
[data-theme="classic-dark"] .wsb-transport--minimal .wsb-tool:hover:not(:disabled),
[data-theme="dark"] .wsb-volume-mute:hover,
[data-theme="classic-dark"] .wsb-volume-mute:hover,
[data-theme="dark"] .wsb-offline-chip:hover,
[data-theme="classic-dark"] .wsb-offline-chip:hover {
  background: rgba(255, 255, 255, 0.1);
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
  .festag-modal-host:has(.festag-modal-surface--briefing),
  .festag-modal-host--sheet:has(.festag-modal-surface--briefing) {
    align-items: flex-end !important;
    justify-content: flex-end !important;
    padding: 0 !important;
    background: rgba(0, 0, 0, 0.52) !important;
    backdrop-filter: blur(12px) saturate(120%) !important;
    -webkit-backdrop-filter: blur(12px) saturate(120%) !important;
  }
  .festag-modal-surface--briefing.festag-popup-mobile-sheet,
  .festag-modal-surface--briefing-mobile {
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    animation: none !important;
    border-radius: 20px 20px 0 0 !important;
    border-bottom: none !important;
    border-left: none !important;
    border-right: none !important;
    max-height: min(88dvh, 720px) !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    padding-bottom: env(safe-area-inset-bottom, 0px) !important;
    box-shadow:
      0 -1px 2px rgba(0, 0, 0, 0.28),
      0 -24px 56px -20px rgba(0, 0, 0, 0.55);
  }
  .festag-modal-surface--briefing .festag-popup-drag-area {
    display: flex !important;
    flex-shrink: 0;
    padding: 10px 0 6px;
  }
  .wsb-shell--mobile {
    padding: 12px 20px calc(14px + env(safe-area-inset-bottom, 0px));
    max-height: none;
    min-height: min(340px, calc(68dvh - 48px));
    overflow: hidden;
    border-radius: 0;
  }
  .wsb-shell-kicker {
    padding-bottom: 8px;
  }
  .wsb-inline-tagro {
    margin-top: 14px;
  }
  .wsb-inline-tagro .tagro-composer-bar {
    min-height: 52px;
    border-radius: 999px;
  }
  .wsb-prose {
    font-size: 22px;
    letter-spacing: -0.5px;
    width: min(460px, calc(100vw - 48px));
    max-width: min(460px, calc(100vw - 48px));
    min-width: 0;
  }
  .wsb-audio-capsule {
    min-height: 52px;
    padding: 5px 14px 5px 5px;
  }
  .wsb-audio-capsule-play {
    width: 40px;
    height: 40px;
  }
  .wsb-capsule-wave {
    width: 64px;
  }
  .wsb-stage {
    margin-bottom: 10px;
  }
  .wsb-lyrics-stage {
    --wsb-prose-size: 22px;
    --wsb-lines-visible: 5;
    --wsb-prose-max-width: min(460px, calc(100vw - 48px));
    width: min(460px, calc(100vw - 48px));
    max-width: min(460px, calc(100vw - 48px));
    min-width: 0;
  }
  .wsb-lyrics-track {
    width: min(460px, calc(100vw - 48px));
    max-width: min(460px, calc(100vw - 48px));
    padding-bottom: calc(var(--wsb-viewport-height) * 1.2);
  }
  .wsb-footer-meta--mobile {
    gap: 8px;
  }
  .wsb-footer-meta--mobile .wsb-summary-link {
    align-self: flex-start;
    max-width: none;
  }
  .wsb-controls-row {
    gap: 8px;
  }
  .wsb-close { display: none; }
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
  .wsb-lyrics-stage { min-height: unset; flex: 0 0 var(--wsb-viewport-height); }
  .wsb-shell--mobile .wsb-tagro-ask {
    margin-top: 0;
  }
  .wsb-tagro-ask { display: none; }
  .wsb-tagro-backdrop { display: none !important; }
  .wsb-footer--mobile {
    gap: 10px;
  }
  .wsb-footer--mobile .wsb-audio-capsule,
  .wsb-footer--mobile .wsb-audio-capsule--solo {
    width: 100%;
  }
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
