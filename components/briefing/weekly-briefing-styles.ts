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
  padding: 32px;
  border-radius: 32px;
  border-width: 0.5px;
  border-color: transparent;
  justify-content: center;
  overflow: visible;
}
.festag-modal-surface--briefing .festag-modal-head {
  margin: -32px -32px 0;
  padding: 24px 36px 20px 32px;
  border-radius: 32px 32px 0 0;
  background: #ececee;
  border-bottom: 0.5px solid rgba(24, 24, 27, 0.08);
}
.wsb-headline {
  margin: 0;
  font-size: 22px;
  font-weight: 400;
  line-height: 1.28;
  letter-spacing: -0.02em;
}
.wsb-headline-strong {
  color: #18181b;
  font-weight: 500;
}
.wsb-headline-muted {
  color: #71717a;
  font-weight: 400;
}
.festag-modal-surface--briefing .festag-modal-close {
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  position: absolute;
  top: 16px;
  right: 16px;
  left: auto;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px !important;
  color: var(--fp-muted, var(--text-muted));
}
.festag-modal-surface--briefing .festag-modal-close svg {
  width: 12px;
  height: 12px;
}
@media (min-width: 769px) {
  .festag-modal-host:has(.festag-modal-surface--briefing) {
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .festag-modal-surface--briefing .festag-popup-drag-area {
    display: none !important;
  }
}
.festag-modal-surface--briefing .festag-modal-body {
  padding: 0;
}
.wsb-shell {
  position: relative;
  display: flex;
  flex-direction: column;
}
.wsb-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}
.wsb-picker-wrap {
  position: relative;
}
.wsb-picker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 12px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(0,0,0,.1)) 100%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--fp-pill, rgba(0,0,0,.04)) 100%, transparent);
  color: var(--fp-text, #18181b);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.wsb-picker:hover {
  background: color-mix(in srgb, var(--fp-pill, rgba(0,0,0,.06)) 100%, transparent);
}
.wsb-picker svg:last-child {
  opacity: 0.55;
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
  text-align: left;
  cursor: pointer;
}
.wsb-picker-menu button:hover,
.wsb-picker-menu button.on {
  background: color-mix(in srgb, var(--fp-pill, rgba(0,0,0,.06)) 100%, transparent);
}
.wsb-host {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}
.wsb-audio-card {
  position: relative;
  margin-top: 20px;
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
  gap: 10px;
  width: 100%;
  margin-top: 24px;
  padding-bottom: 52px;
}
.wsb-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 44px;
  min-height: 44px;
  margin-top: 0;
  border: 1px solid var(--festag-elev-border, rgba(0, 0, 0, 0.08));
  border-radius: 999px;
  background: var(--festag-elev-bg, #ffffff);
  color: var(--fp-text, var(--text, #18181B));
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.012em;
  cursor: pointer;
  box-shadow: var(--festag-elev-shadow, 0 1px 2px rgba(15, 23, 42, 0.05));
  transition: background 0.15s, box-shadow 0.15s, border-color 0.15s;
}
.wsb-btn-primary:hover:not(:disabled) {
  background: var(--festag-elev-bg, #ffffff);
  box-shadow: var(--festag-elev-shadow-hover, 0 2px 3px rgba(15, 23, 42, 0.07));
  transform: none;
}
.wsb-btn-primary:active:not(:disabled) {
  background: var(--festag-elev-active-bg, #f5f5f7);
  box-shadow: var(--festag-elev-shadow, 0 1px 2px rgba(15, 23, 42, 0.05));
}
.wsb-btn-primary:disabled { opacity: 0.55; cursor: default; }
.wsb-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 44px;
  min-height: 44px;
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
  margin: 16px 0 0;
  font-size: 15px;
  line-height: 1.65;
  color: var(--fp-text, var(--text));
  white-space: pre-wrap;
}
.wsb-tagro-fab.festag-content-fab--absolute {
  right: 4px;
  bottom: 4px;
  z-index: 4;
}

/* Light theme */
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
[data-theme="light"] .festag-modal-surface--briefing .festag-modal-head,
[data-theme="read"] .festag-modal-surface--briefing .festag-modal-head,
[data-theme="pure-light"] .festag-modal-surface--briefing .festag-modal-head {
  background: #ececee;
  border-bottom-color: rgba(24, 24, 27, 0.08);
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
[data-theme="light"] .wsb-picker-menu,
[data-theme="read"] .wsb-picker-menu,
[data-theme="pure-light"] .wsb-picker-menu {
  background: #ffffff;
  --fp-text: #18181b;
}

/* Dark theme */
[data-theme="dark"] .festag-modal-surface--briefing .festag-modal-head,
[data-theme="classic-dark"] .festag-modal-surface--briefing .festag-modal-head {
  background: #1c1c1e;
  border-bottom-color: rgba(255, 255, 255, 0.08);
}
[data-theme="dark"] .wsb-headline-strong,
[data-theme="classic-dark"] .wsb-headline-strong {
  color: #f4f4f5;
}
[data-theme="dark"] .wsb-headline-muted,
[data-theme="classic-dark"] .wsb-headline-muted {
  color: #8e8e93;
}
[data-theme="dark"] .festag-modal-host:has(.festag-modal-surface--briefing),
[data-theme="classic-dark"] .festag-modal-host:has(.festag-modal-surface--briefing) {
  background: rgba(0, 0, 0, 0.72);
}
[data-theme="dark"] .festag-modal-surface--briefing,
[data-theme="classic-dark"] .festag-modal-surface--briefing {
  background: var(--festag-black-popup, #121214);
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.06),
    0 24px 56px rgba(0, 0, 0, 0.45);
}
[data-theme="dark"] .wsb-picker-menu,
[data-theme="classic-dark"] .wsb-picker-menu {
  background: var(--festag-black-popup, #121214);
  --fp-text: #f4f4f5;
}

@media (min-width: 769px) and (max-width: 1024px) {
  .festag-modal-host:has(.festag-modal-surface--briefing) {
    padding: 0;
  }
  .festag-modal-surface--briefing {
    max-width: min(480px, calc(100vw - 40px)) !important;
    margin: 20px 0 !important;
    padding: 32px !important;
  }
  .festag-modal-surface--briefing .festag-modal-head {
    margin: -32px -32px 0;
    padding: 24px 36px 20px 32px;
  }
  .wsb-headline {
    font-size: 20px;
  }
}

@media (max-width: 768px) {
  .festag-modal-host:has(.festag-modal-surface--briefing) {
    align-items: flex-end;
    justify-content: flex-start;
    padding: 0;
    backdrop-filter: blur(var(--modal-backdrop-blur, 6px)) saturate(115%);
    -webkit-backdrop-filter: blur(var(--modal-backdrop-blur, 6px)) saturate(115%);
  }
  .festag-modal-surface--briefing,
  .festag-modal-surface--briefing-mobile {
    width: 100% !important;
    max-width: 100% !important;
    height: auto;
    max-height: min(72dvh, 520px);
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 28px 28px 0 0 !important;
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
    flex-shrink: 0;
    padding: 10px 0 6px;
  }
  .festag-modal-surface--briefing .festag-modal-head {
    margin: 0;
    padding: 0 16px 10px;
    border-radius: 0;
  }
  .festag-modal-surface--briefing .festag-modal-body {
    padding: 0 0 calc(env(safe-area-inset-bottom, 0px));
  }
  .wsb-head-mobile {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .wsb-headline--mobile {
    font-size: 15px;
    line-height: 1.35;
    letter-spacing: -0.015em;
  }
  .wsb-headline--mobile .wsb-headline-muted {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    line-height: 1.3;
    letter-spacing: 0;
  }
  .wsb-headline-clamp {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .wsb-filter-row--mobile {
    margin-top: 0;
    gap: 6px;
    flex-wrap: nowrap;
    width: 100%;
  }
  .wsb-picker--compact {
    height: 30px;
    padding: 0 8px;
    gap: 5px;
    font-size: 12px;
    border-radius: 10px;
    max-width: calc(50% - 3px);
    flex: 1 1 0;
    min-width: 0;
  }
  .wsb-filter-row--mobile .wsb-picker-wrap {
    flex: 1 1 0;
    min-width: 0;
  }
  .wsb-filter-row--mobile .wsb-picker {
    width: 100%;
    max-width: none;
  }
  .wsb-picker-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1 1 auto;
    text-align: left;
  }
  .wsb-shell--mobile {
    padding: 0 16px calc(12px + env(safe-area-inset-bottom, 0px));
  }
  .wsb-shell--mobile .wsb-audio-card {
    margin-top: 12px;
    min-height: 132px;
    padding: 22px 18px 18px;
    border-radius: 20px;
    gap: 12px;
  }
  .wsb-shell--mobile .wsb-wave {
    height: 52px;
    max-width: 260px;
    gap: 3px;
  }
  .wsb-shell--mobile .wsb-wave span {
    width: 2.5px;
  }
  .wsb-shell--mobile .wsb-duration {
    font-size: 12px;
  }
  .wsb-actions--mobile {
    margin-top: 14px;
    padding-bottom: 0;
    gap: 8px;
  }
  .wsb-actions--mobile .wsb-btn-primary {
    height: 42px;
    min-height: 42px;
    font-size: 14px;
  }
  .wsb-mobile-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
  .wsb-mobile-row .wsb-btn-secondary {
    flex: 1 1 auto;
    min-width: 0;
    height: 40px;
    min-height: 40px;
    font-size: 13px;
  }
  .wsb-tagro-mobile {
    flex-shrink: 0;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    min-height: 40px !important;
    padding: 0 !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .wsb-shell--mobile .wsb-summary {
    margin-top: 8px;
    font-size: 14px;
    line-height: 1.55;
    max-height: 36dvh;
    overflow-y: auto;
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
