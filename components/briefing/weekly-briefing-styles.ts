export const WEEKLY_BRIEFING_CSS = `
.festag-modal-host:has(.festag-modal-surface--briefing) {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: rgba(0, 0, 0, 0.8);
}
.festag-modal-surface--briefing {
  position: relative;
  width: fit-content;
  height: fit-content;
  max-width: min(480px, calc(100vw - 64px));
  margin: 0;
  padding: 24px;
  border-radius: 32px;
  border-width: 0.5px;
  border-color: transparent;
}
.festag-modal-surface--briefing .festag-modal-head {
  padding: 0 52px 12px 0;
}
.festag-modal-surface--briefing .festag-modal-title {
  font-size: 25px;
  font-weight: 400;
}
.wsb-headline {
  margin: 0;
  font-size: 25px;
  font-weight: 400;
  line-height: 1.25;
  letter-spacing: -0.02em;
}
.wsb-headline-strong {
  color: var(--fp-text, var(--text));
}
.wsb-headline-muted {
  color: var(--fp-muted, var(--text-muted));
}
.festag-modal-surface--briefing .festag-modal-close {
  width: fit-content;
  height: fit-content;
  padding: 12px;
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  border-radius: 999px !important;
}
@media (min-width: 769px) {
  .festag-modal-host:has(.festag-modal-surface--briefing) {
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .festag-modal-surface--briefing .festag-popup-drag-area {
    display: none !important;
  }
}
.festag-modal-surface--briefing .festag-modal-body {
  padding: 12px;
}
.wsb-host {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 4px 0 0;
}
.wsb-audio-card {
  position: relative;
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
.wsb-wave.playing span {
  animation-play-state: running;
  opacity: 1;
}
.wsb-wave.paused span {
  animation-play-state: paused;
  opacity: 0.38;
}
@keyframes wsbWave {
  0%, 100% { transform: scaleY(0.22); opacity: 0.38; }
  50% { transform: scaleY(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .wsb-wave span { animation: none; opacity: 0.55; }
}
.wsb-duration {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--fp-muted, var(--text-muted));
  letter-spacing: 0.02em;
}
.wsb-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 24px;
  width: 100%;
  margin-top: 8px;
}
.wsb-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 60px;
  margin-top: 24px;
  border: 0;
  border-radius: 999px;
  background: var(--portal-btn-primary, #1D1D1F);
  color: var(--portal-btn-primary-text, #fff);
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.012em;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
}
.wsb-btn-primary:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}
.wsb-btn-primary:disabled { opacity: 0.55; cursor: default; }
.wsb-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 44px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--fp-text, var(--text));
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.012em;
  cursor: pointer;
}
.wsb-btn-secondary:hover { background: color-mix(in srgb, var(--fp-pill) 80%, transparent); }
.wsb-summary {
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  color: var(--fp-text, var(--text));
  white-space: pre-wrap;
}
[data-theme="light"] .festag-modal-host:has(.festag-modal-surface--briefing),
[data-theme="read"] .festag-modal-host:has(.festag-modal-surface--briefing),
[data-theme="pure-light"] .festag-modal-host:has(.festag-modal-surface--briefing) {
  background: rgba(15, 18, 24, 0.42);
}
[data-theme="light"] .festag-modal-surface--briefing,
[data-theme="read"] .festag-modal-surface--briefing,
[data-theme="pure-light"] .festag-modal-surface--briefing {
  background: #ffffff;
  box-shadow:
    0 0 0 0.5px rgba(24, 24, 27, 0.06),
    0 1px 2px rgba(24, 24, 27, 0.04),
    0 24px 56px rgba(24, 24, 27, 0.14);
}
[data-theme="light"] .wsb-headline-strong,
[data-theme="read"] .wsb-headline-strong,
[data-theme="pure-light"] .wsb-headline-strong {
  color: #18181b;
}
[data-theme="light"] .wsb-headline-muted,
[data-theme="read"] .wsb-headline-muted,
[data-theme="pure-light"] .wsb-headline-muted {
  color: #71717a;
}
[data-theme="light"] .festag-modal-surface--briefing .festag-modal-close,
[data-theme="read"] .festag-modal-surface--briefing .festag-modal-close,
[data-theme="pure-light"] .festag-modal-surface--briefing .festag-modal-close {
  color: #71717a;
}
[data-theme="light"] .festag-modal-surface--briefing .festag-modal-close:hover,
[data-theme="read"] .festag-modal-surface--briefing .festag-modal-close:hover,
[data-theme="pure-light"] .festag-modal-surface--briefing .festag-modal-close:hover {
  background: rgba(24, 24, 27, 0.06);
  color: #18181b;
}
[data-theme="light"] .wsb-audio-card,
[data-theme="read"] .wsb-audio-card,
[data-theme="pure-light"] .wsb-audio-card {
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(24, 24, 27, 0.04), transparent 62%),
    #f4f4f5;
  border-color: rgba(24, 24, 27, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
[data-theme="light"] .wsb-audio-card::before,
[data-theme="read"] .wsb-audio-card::before,
[data-theme="pure-light"] .wsb-audio-card::before {
  background: radial-gradient(ellipse at center, rgba(24, 24, 27, 0.05), transparent 72%);
  opacity: 0.7;
}
[data-theme="light"] .wsb-wave span,
[data-theme="read"] .wsb-wave span,
[data-theme="pure-light"] .wsb-wave span {
  background: #5b647d;
}
[data-theme="light"] .wsb-duration,
[data-theme="read"] .wsb-duration,
[data-theme="pure-light"] .wsb-duration {
  color: #71717a;
}
[data-theme="light"] .wsb-btn-secondary,
[data-theme="read"] .wsb-btn-secondary,
[data-theme="pure-light"] .wsb-btn-secondary {
  color: #18181b;
}
[data-theme="light"] .wsb-btn-secondary:hover,
[data-theme="read"] .wsb-btn-secondary:hover,
[data-theme="pure-light"] .wsb-btn-secondary:hover {
  background: rgba(24, 24, 27, 0.05);
}
[data-theme="dark"] .festag-modal-host:has(.festag-modal-surface--briefing),
[data-theme="classic-dark"] .festag-modal-host:has(.festag-modal-surface--briefing) {
  background: rgba(0, 0, 0, 0.8);
}
[data-theme="dark"] .festag-modal-surface--briefing,
[data-theme="classic-dark"] .festag-modal-surface--briefing {
  background: var(--festag-black-popup, #121214);
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.06),
    0 24px 56px rgba(0, 0, 0, 0.48);
}
[data-theme="dark"] .wsb-headline-strong,
[data-theme="classic-dark"] .wsb-headline-strong {
  color: #ffffff;
}
[data-theme="dark"] .wsb-headline-muted,
[data-theme="classic-dark"] .wsb-headline-muted {
  color: #8e8e93;
}
[data-theme="dark"] .wsb-audio-card,
[data-theme="classic-dark"] .wsb-audio-card {
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,.06), transparent 62%),
    rgba(255,255,255,.04);
  border-color: rgba(255,255,255,.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
}
[data-theme="dark"] .wsb-audio-card::before,
[data-theme="classic-dark"] .wsb-audio-card::before {
  background: radial-gradient(ellipse at center, rgba(255,255,255,.08), transparent 72%);
}
[data-theme="dark"] .wsb-wave span,
[data-theme="classic-dark"] .wsb-wave span {
  background: #AEAEB2;
}

@media (max-width: 768px) {
  .festag-modal-host:has(.festag-modal-surface--briefing) {
    align-items: flex-end;
    justify-content: flex-start;
    padding: 0;
    backdrop-filter: blur(var(--modal-backdrop-blur, 6px)) saturate(115%);
    -webkit-backdrop-filter: blur(var(--modal-backdrop-blur, 6px)) saturate(115%);
  }
  .festag-modal-surface--briefing {
    width: 100% !important;
    max-width: 100% !important;
    height: auto;
    max-height: min(88dvh, 720px);
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 32px 32px 0 0 !important;
    border-bottom: none !important;
    justify-content: flex-start;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    box-shadow:
      0 -1px 2px rgba(0, 0, 0, 0.12),
      0 -24px 56px -20px rgba(0, 0, 0, 0.28);
  }
  .festag-modal-surface--briefing .festag-modal-close {
    display: none !important;
  }
  .festag-modal-surface--briefing .festag-popup-drag-area {
    display: flex !important;
    padding: 10px 0 8px;
  }
  .festag-modal-surface--briefing .festag-modal-head {
    padding: 0 16px 12px;
  }
  .festag-modal-surface--briefing .festag-modal-body {
    padding: 0 0 calc(env(safe-area-inset-bottom, 0px));
  }
  .wsb-host {
    padding: 0 16px 16px;
  }
  .wsb-audio-card {
    border-radius: 24px;
  }
  [data-theme="light"] .festag-modal-host:has(.festag-modal-surface--briefing),
  [data-theme="read"] .festag-modal-host:has(.festag-modal-surface--briefing),
  [data-theme="pure-light"] .festag-modal-host:has(.festag-modal-surface--briefing) {
    background: var(--modal-backdrop, rgba(15, 18, 24, 0.22));
  }
  [data-theme="light"] .festag-modal-surface--briefing,
  [data-theme="read"] .festag-modal-surface--briefing,
  [data-theme="pure-light"] .festag-modal-surface--briefing {
    background: #ffffff;
    box-shadow:
      0 -1px 2px rgba(24, 24, 27, 0.06),
      0 -24px 56px -20px rgba(24, 24, 27, 0.14);
  }
  [data-theme="dark"] .festag-modal-host:has(.festag-modal-surface--briefing),
  [data-theme="classic-dark"] .festag-modal-host:has(.festag-modal-surface--briefing) {
    background: rgba(0, 0, 0, 0.72);
  }
  [data-theme="dark"] .festag-modal-surface--briefing,
  [data-theme="classic-dark"] .festag-modal-surface--briefing {
    background: var(--festag-black-popup, #121214);
    box-shadow:
      0 -1px 2px rgba(0, 0, 0, 0.28),
      0 -24px 56px -20px rgba(0, 0, 0, 0.55);
  }
  [data-theme="light"] .festag-modal-surface--briefing .festag-popup-drag-handle,
  [data-theme="read"] .festag-modal-surface--briefing .festag-popup-drag-handle,
  [data-theme="pure-light"] .festag-modal-surface--briefing .festag-popup-drag-handle {
    background: rgba(24, 24, 27, 0.14);
    opacity: 1;
  }
}
`
