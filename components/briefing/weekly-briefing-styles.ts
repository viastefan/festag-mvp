export const WEEKLY_BRIEFING_CSS = `
/* ── Tagro Briefing Center — floating glass executive panel ── */

.festag-modal-host:has(.festag-modal-surface--briefing-center) {
  align-items: center;
  justify-content: center;
  padding: clamp(16px, 3vw, 32px);
  background: rgba(8, 10, 14, 0.44);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
}

.festag-modal-surface--briefing-center {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(88vw, 1600px) !important;
  max-width: min(88vw, 1600px) !important;
  height: min(90vh, 960px) !important;
  max-height: min(90vh, 960px) !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 28px !important;
  overflow: hidden;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.1)) 80%, transparent);
  background:
  linear-gradient(145deg, color-mix(in srgb, var(--fp-bg, #121214) 92%, #fff 8%), var(--fp-bg, #121214));
  box-shadow:
    0 0 0 0.5px color-mix(in srgb, var(--fp-text, #fff) 6%, transparent),
    0 32px 80px -24px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 color-mix(in srgb, #fff 8%, transparent);
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
}

.festag-modal-surface--briefing-center .festag-popup-drag-area {
  display: none;
}

.tbc-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--fp-text, #f4f4f5);
}

/* Header */
.tbc-head {
  flex-shrink: 0;
  padding: clamp(20px, 2.5vw, 28px) clamp(20px, 3vw, 32px) 16px;
  border-bottom: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.08)) 100%, transparent);
  background: color-mix(in srgb, var(--fp-bg, #121214) 88%, #fff 12%);
}
.tbc-head-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
.tbc-head-copy {
  min-width: 0;
  flex: 1 1 auto;
}
.tbc-kicker {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fp-muted, #8e8e93);
}
.tbc-title {
  margin: 0 0 14px;
  font-size: clamp(26px, 3vw, 34px);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: var(--fp-text, #fff);
}
.tbc-time-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tbc-time-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--fp-muted, #8e8e93);
  letter-spacing: 0.02em;
}
.tbc-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tbc-pill {
  height: 30px;
  padding: 0 12px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.1)) 100%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.04)) 100%, transparent);
  color: var(--fp-muted, #a1a1aa);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.tbc-pill:hover {
  color: var(--fp-text, #fff);
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.06)) 100%, transparent);
}
.tbc-pill.on {
  background: color-mix(in srgb, #5b647d 88%, #fff 12%);
  border-color: transparent;
  color: #fff;
}

.tbc-head-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.tbc-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.1)) 100%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.04)) 100%, transparent);
  color: var(--fp-text, #f4f4f5);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease;
}
.tbc-action:hover:not(:disabled) {
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.08)) 100%, transparent);
}
.tbc-action:disabled { opacity: 0.45; cursor: default; }
.tbc-action--icon { width: 34px; padding: 0; justify-content: center; }
.tbc-close {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.06)) 100%, transparent);
  color: var(--fp-muted, #a1a1aa);
  cursor: pointer;
}
.tbc-close:hover {
  color: var(--fp-text, #fff);
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.1)) 100%, transparent);
}

.tbc-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}
.tbc-scope-wrap { position: relative; }
.tbc-scope {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.12)) 100%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.05)) 100%, transparent);
  color: var(--fp-text, #fff);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.tbc-scope-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 20;
  min-width: 220px;
  padding: 6px;
  border-radius: 14px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.1)) 100%, transparent);
  background: var(--festag-black-popup, #121214);
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.5);
}
.tbc-scope-menu button {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--fp-text, #f4f4f5);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.tbc-scope-menu button:hover,
.tbc-scope-menu button.on {
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.08)) 100%, transparent);
}
.tbc-edit-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--fp-muted, #a1a1aa);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.tbc-edit-link:hover { color: var(--fp-text, #fff); }

.tbc-menu-wrap { position: relative; }
.tbc-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 30;
  min-width: 180px;
  padding: 6px;
  border-radius: 14px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.1)) 100%, transparent);
  background: var(--festag-black-popup, #121214);
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.5);
}
.tbc-menu button {
  display: block;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--fp-text, #f4f4f5);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.tbc-menu button:hover {
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.08)) 100%, transparent);
}

/* Body layout */
.tbc-body {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) min(280px, 26%);
  gap: 0;
  overflow: hidden;
}
.tbc-main {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: clamp(16px, 2.5vw, 28px);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
.tbc-block { margin-bottom: clamp(24px, 3vw, 36px); }
.tbc-block:last-child { margin-bottom: 0; }
.tbc-block-title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--fp-text, #fff);
}

/* Executive hero */
.tbc-hero {
  padding: clamp(20px, 2.5vw, 28px);
  border-radius: 20px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.08)) 100%, transparent);
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, #5b647d 18%, transparent), transparent 55%),
    color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.03)) 100%, transparent);
}
.tbc-hero-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.tbc-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 12px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--fp-bg, #121214) 70%, transparent);
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.06)) 100%, transparent);
}
.tbc-stat-num {
  font-size: clamp(28px, 3vw, 36px);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--fp-text, #fff);
  font-variant-numeric: tabular-nums;
}
.tbc-stat--health .tbc-stat-num {
  color: color-mix(in srgb, #34c759 80%, #fff 20%);
}
.tbc-stat-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--fp-muted, #8e8e93);
  line-height: 1.3;
}
.tbc-hero-copy {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: color-mix(in srgb, var(--fp-text, #fff) 78%, transparent);
}

/* Audio player */
.tbc-player-block {
  padding: 20px;
  border-radius: 20px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.08)) 100%, transparent);
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.02)) 100%, transparent);
}
.tbc-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.tbc-player-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.tbc-ctrl {
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.06)) 100%, transparent);
  color: var(--fp-text, #f4f4f5);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.12s ease;
}
.tbc-ctrl:hover:not(:disabled) {
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.1)) 100%, transparent);
}
.tbc-ctrl:disabled { opacity: 0.35; cursor: default; }
.tbc-ctrl--play {
  width: 56px;
  height: 56px;
  background: #5b647d;
  color: #fff;
}
.tbc-ctrl--play:hover:not(:disabled) {
  background: color-mix(in srgb, #5b647d 90%, #fff 10%);
}
.tbc-player-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  font-size: 12px;
  color: var(--fp-muted, #8e8e93);
}
.tbc-rate {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.05)) 100%, transparent);
  color: var(--fp-muted, #a1a1aa);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.tbc-rate:hover { color: var(--fp-text, #fff); }
.tbc-voice-wrap { position: relative; }
.tbc-voice-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  min-width: 180px;
  max-height: 180px;
  overflow-y: auto;
  padding: 6px;
  border-radius: 12px;
  background: var(--festag-black-popup, #121214);
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.1)) 100%, transparent);
  box-shadow: 0 12px 32px -8px rgba(0,0,0,.5);
}
.tbc-voice-menu button {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--fp-text, #f4f4f5);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.tbc-voice-menu button:hover {
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.08)) 100%, transparent);
}

/* Live transcript — Spotify lyrics */
.tbc-transcript-mask {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%);
}
.tbc-transcript {
  height: clamp(160px, 22vh, 240px);
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  scrollbar-width: none;
}
.tbc-transcript::-webkit-scrollbar { display: none; }
.tbc-flow {
  padding: 28px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tbc-line {
  margin: 0;
  text-align: center;
  font-size: clamp(17px, 2vw, 22px);
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: -0.01em;
  color: color-mix(in srgb, var(--fp-text, #fff) 18%, transparent);
  transition: color 0.45s ease, opacity 0.45s ease, transform 0.45s ease;
  transform: scale(0.96);
  opacity: 0.45;
}
.tbc-line.near {
  color: color-mix(in srgb, var(--fp-text, #fff) 42%, transparent);
  opacity: 0.65;
  transform: scale(0.98);
}
.tbc-line.on {
  color: var(--fp-text, #fff);
  opacity: 1;
  transform: scale(1);
  font-size: clamp(19px, 2.2vw, 26px);
  font-weight: 400;
}
.tbc-line.past {
  opacity: 0.32;
}
.tbc-line.future {
  opacity: 0.28;
}

/* Insights */
.tbc-insights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.tbc-insight {
  padding: 14px 16px;
  border-radius: 14px;
  border: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.08)) 100%, transparent);
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.03)) 100%, transparent);
}
.tbc-insight--positive { border-color: color-mix(in srgb, #34c759 30%, transparent); }
.tbc-insight--warning { border-color: color-mix(in srgb, #ff9f0a 35%, transparent); }
.tbc-insight--action { border-color: color-mix(in srgb, #5b647d 40%, transparent); }
.tbc-insight-title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--fp-text, #fff);
  line-height: 1.35;
}
.tbc-insight-detail {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--fp-muted, #8e8e93);
}

/* Decisions */
.tbc-decisions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tbc-decision {
  height: 36px;
  padding: 0 14px;
  border: 0.5px solid color-mix(in srgb, #5b647d 50%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, #5b647d 16%, transparent);
  color: var(--fp-text, #fff);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}
.tbc-decision:hover {
  background: color-mix(in srgb, #5b647d 28%, transparent);
}

/* Timeline sidebar */
.tbc-timeline {
  min-height: 0;
  overflow-y: auto;
  padding: clamp(16px, 2.5vw, 24px);
  border-left: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.08)) 100%, transparent);
  background: color-mix(in srgb, var(--fp-bg, #121214) 94%, #fff 6%);
  -webkit-overflow-scrolling: touch;
}
.tbc-timeline-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tbc-timeline-list li {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}
.tbc-timeline-time {
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--fp-muted, #8e8e93);
}
.tbc-timeline-label {
  font-size: 13px;
  line-height: 1.45;
  color: var(--fp-text, #f4f4f5);
}

/* Edit slide-over */
.tbc-shell--edit .tbc-main,
.tbc-shell--edit .tbc-timeline {
  filter: brightness(0.72);
}
.tbc-edit {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(360px, 92vw);
  z-index: 40;
  display: flex;
  flex-direction: column;
  border-left: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.1)) 100%, transparent);
  background: var(--festag-black-popup, #121214);
  box-shadow: -24px 0 48px -20px rgba(0, 0, 0, 0.45);
  animation: tbcSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes tbcSlideIn {
  from { transform: translateX(24px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.tbc-edit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 18px 14px;
  border-bottom: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.08)) 100%, transparent);
}
.tbc-edit-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--fp-text, #fff);
}
.tbc-edit-head button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.06)) 100%, transparent);
  color: var(--fp-muted, #a1a1aa);
  cursor: pointer;
}
.tbc-edit-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tbc-edit-body button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--fp-text, #f4f4f5);
  font: inherit;
  font-size: 14px;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
}
.tbc-edit-body button:hover {
  background: color-mix(in srgb, var(--fp-pill, rgba(255,255,255,.06)) 100%, transparent);
}

/* Light theme */
[data-theme="light"] .festag-modal-host:has(.festag-modal-surface--briefing-center),
[data-theme="read"] .festag-modal-host:has(.festag-modal-surface--briefing-center),
[data-theme="pure-light"] .festag-modal-host:has(.festag-modal-surface--briefing-center) {
  background: rgba(15, 18, 24, 0.32);
}
[data-theme="light"] .festag-modal-surface--briefing-center,
[data-theme="read"] .festag-modal-surface--briefing-center,
[data-theme="pure-light"] .festag-modal-surface--briefing-center {
  background:
    linear-gradient(145deg, #ffffff 0%, #f8f8fa 100%);
  border-color: rgba(24, 24, 27, 0.08);
  box-shadow:
    0 0 0 0.5px rgba(24, 24, 27, 0.06),
    0 32px 80px -24px rgba(24, 24, 27, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  --fp-text: #18181b;
  --fp-muted: #71717a;
  --fp-divider: rgba(24, 24, 27, 0.08);
  --fp-pill: rgba(24, 24, 27, 0.04);
  --fp-bg: #ffffff;
}
[data-theme="light"] .tbc-head,
[data-theme="read"] .tbc-head,
[data-theme="pure-light"] .tbc-head {
  background: rgba(255, 255, 255, 0.72);
  border-bottom-color: rgba(24, 24, 27, 0.08);
}
[data-theme="light"] .tbc-stat,
[data-theme="read"] .tbc-stat,
[data-theme="pure-light"] .tbc-stat {
  background: #fff;
  border-color: rgba(24, 24, 27, 0.06);
}
[data-theme="light"] .tbc-hero,
[data-theme="read"] .tbc-hero,
[data-theme="pure-light"] .tbc-hero {
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(91, 100, 125, 0.08), transparent 55%),
    #f4f4f5;
  border-color: rgba(24, 24, 27, 0.08);
}
[data-theme="light"] .tbc-timeline,
[data-theme="read"] .tbc-timeline,
[data-theme="pure-light"] .tbc-timeline {
  background: #fafafa;
  border-left-color: rgba(24, 24, 27, 0.08);
}
[data-theme="light"] .tbc-line,
[data-theme="read"] .tbc-line,
[data-theme="pure-light"] .tbc-line {
  color: rgba(24, 24, 27, 0.2);
}
[data-theme="light"] .tbc-line.on,
[data-theme="read"] .tbc-line.on,
[data-theme="pure-light"] .tbc-line.on {
  color: #18181b;
}

/* Mobile fullscreen sheet */
@media (max-width: 768px) {
  .festag-modal-host:has(.festag-modal-surface--briefing-center) {
    align-items: flex-end;
    padding: 0;
    background: rgba(0, 0, 0, 0.55);
  }
  .festag-modal-surface--briefing-center {
    width: 100% !important;
    max-width: 100% !important;
    height: 100dvh !important;
    max-height: 100dvh !important;
    border-radius: 0 !important;
    border: none;
  }
  .festag-modal-surface--briefing-center .festag-popup-drag-area {
    display: flex !important;
    padding: 10px 0 6px;
    flex-shrink: 0;
  }
  .tbc-head {
    padding: 0 16px 12px;
  }
  .tbc-head-main {
    flex-direction: column;
    gap: 12px;
  }
  .tbc-head-actions {
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
    flex-wrap: nowrap;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .tbc-head-actions::-webkit-scrollbar { display: none; }
  .tbc-close { margin-left: auto; }
  .tbc-pills {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .tbc-pills::-webkit-scrollbar { display: none; }
  .tbc-pill { flex-shrink: 0; }
  .tbc-filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  .tbc-edit-link { align-self: flex-start; }
  .tbc-mobile-tabs {
    display: flex;
    gap: 4px;
    padding: 0 12px 10px;
    overflow-x: auto;
    scrollbar-width: none;
    border-bottom: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.08)) 100%, transparent);
  }
  .tbc-mobile-tabs::-webkit-scrollbar { display: none; }
  .tbc-mobile-tabs button {
    flex-shrink: 0;
    height: 32px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--fp-muted, #8e8e93);
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }
  .tbc-mobile-tabs button.on {
    background: color-mix(in srgb, #5b647d 88%, #fff 12%);
    color: #fff;
  }
  .tbc-body {
    grid-template-columns: 1fr;
  }
  .tbc-main {
    padding: 12px 16px calc(120px + env(safe-area-inset-bottom, 0px));
  }
  .tbc-hero-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .tbc-insights {
    grid-template-columns: 1fr;
  }
  .tbc-timeline {
    border-left: none;
    border-top: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.08)) 100%, transparent);
    padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
  }
  .tbc-player-block .tbc-player-controls {
    display: none;
  }
  .tbc-mobile-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 0.5px solid color-mix(in srgb, var(--fp-divider, rgba(255,255,255,.1)) 100%, transparent);
    background: color-mix(in srgb, var(--fp-bg, #121214) 92%, transparent);
    backdrop-filter: blur(16px) saturate(140%);
    -webkit-backdrop-filter: blur(16px) saturate(140%);
  }
  .tbc-mobile-active-line {
    margin-bottom: 10px;
    font-size: 14px;
    line-height: 1.45;
    text-align: center;
    color: var(--fp-text, #fff);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .tbc-mobile-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .tbc-edit {
    width: 100%;
  }
}

@media (min-width: 769px) and (max-width: 1100px) {
  .tbc-hero-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .tbc-insights {
    grid-template-columns: 1fr;
  }
  .tbc-body {
    grid-template-columns: minmax(0, 1fr) 240px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tbc-line { transition: none; }
  .tbc-edit { animation: none; }
}
`
