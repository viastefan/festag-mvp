export const WEEKLY_BRIEFING_CSS = `
.festag-modal-host:has(.festag-modal-surface--briefing) {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: rgba(0, 0, 0, 0.8);
}
.festag-modal-surface--briefing {
  width: fit-content;
  height: fit-content;
  max-width: min(480px, calc(100vw - 64px));
  margin: 32px 0;
  padding: 24px;
  border-radius: 32px;
  border-width: 0.5px;
  border-color: transparent;
}
.festag-modal-surface--briefing .festag-modal-head {
  position: relative;
  padding: 0 0 6px;
}
.festag-modal-surface--briefing .festag-modal-title {
  font-size: 25px;
  font-weight: 400;
}
.festag-modal-surface--briefing .festag-modal-subtitle {
  font-size: 25px;
  font-weight: 400;
  line-height: 1;
}
.festag-modal-surface--briefing .festag-modal-close {
  width: fit-content;
  height: fit-content;
  padding: 12px;
  position: absolute;
  top: 0;
  right: 0;
  border-radius: 999px !important;
}
.festag-modal-surface--briefing .festag-modal-body {
  padding: 12px;
}
.wsb-host {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 8px 4px 4px;
}
.wsb-kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fp-muted, var(--text-muted));
}
.wsb-lead {
  margin: 8px 0 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--fp-muted, var(--text-muted));
  max-width: 42ch;
}
.wsb-audio-card {
  position: relative;
  border-radius: 32px;
  background: color-mix(in srgb, var(--fp-pill, rgba(0,0,0,.04)) 55%, transparent);
  border: 1px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.08)) 80%, transparent);
  padding: 32px 28px 28px;
  overflow: hidden;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}
.wsb-wave {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 72px;
  width: 100%;
  max-width: 320px;
}
.wsb-wave span {
  display: block;
  width: 4px;
  border-radius: 999px;
  background: var(--dc-slate, #5B647D);
  animation: wsbWave 1.4s ease-in-out infinite;
  transform-origin: center bottom;
}
.wsb-wave span:nth-child(1) { height: 18px; animation-delay: 0s; }
.wsb-wave span:nth-child(2) { height: 32px; animation-delay: 0.08s; }
.wsb-wave span:nth-child(3) { height: 48px; animation-delay: 0.16s; }
.wsb-wave span:nth-child(4) { height: 64px; animation-delay: 0.24s; }
.wsb-wave span:nth-child(5) { height: 52px; animation-delay: 0.32s; }
.wsb-wave span:nth-child(6) { height: 38px; animation-delay: 0.4s; }
.wsb-wave span:nth-child(7) { height: 56px; animation-delay: 0.48s; }
.wsb-wave span:nth-child(8) { height: 42px; animation-delay: 0.56s; }
.wsb-wave span:nth-child(9) { height: 28px; animation-delay: 0.64s; }
.wsb-wave span:nth-child(10) { height: 44px; animation-delay: 0.72s; }
.wsb-wave span:nth-child(11) { height: 36px; animation-delay: 0.8s; }
.wsb-wave span:nth-child(12) { height: 20px; animation-delay: 0.88s; }
.wsb-wave.playing span { animation-play-state: running; }
.wsb-wave.paused span { animation-play-state: paused; opacity: 0.45; }
@keyframes wsbWave {
  0%, 100% { transform: scaleY(0.25); opacity: 0.45; }
  50% { transform: scaleY(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .wsb-wave span { animation: none; opacity: 0.6; }
}
.wsb-duration {
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
  gap: 12px;
  width: 100%;
}
.wsb-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 999px;
  background: var(--portal-btn-primary, #1D1D1F);
  color: var(--portal-btn-primary-text, #fff);
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.012em;
  cursor: pointer;
  transition: opacity 0.15s;
}
.wsb-btn-primary:hover:not(:disabled) { opacity: 0.9; }
.wsb-btn-primary:disabled { opacity: 0.55; cursor: default; }
.wsb-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 60px;
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
[data-theme="dark"] .wsb-audio-card,
[data-theme="classic-dark"] .wsb-audio-card {
  background: rgba(255,255,255,.04);
  border-color: rgba(255,255,255,.08);
}
[data-theme="dark"] .wsb-wave span,
[data-theme="classic-dark"] .wsb-wave span {
  background: #AEAEB2;
}
`
