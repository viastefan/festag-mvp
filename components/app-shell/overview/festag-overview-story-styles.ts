/**
 * Festag Overview Story — mobile living canvas styles.
 * Read Mode paper · Knowledge Grid · Path · editorial panels.
 */

import { FESTAG_CANVAS_STYLES } from '@/components/festag-canvas/festag-canvas-styles'

export const FESTAG_OVERVIEW_STORY_STYLES = `
${FESTAG_CANVAS_STYLES}
/* ── Mobile story canvas ── */
.fos {
  --fos-paper: #F8F6F2;
  --fos-ink: #1A1917;
  --fos-muted: #8A8680;
  --fos-primary: #5B647D;
  --fos-primary-soft: rgba(91, 100, 125, 0.12);
  --fos-sheet: #FFFFFF;
  --fos-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --fos-ease-slow: cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  min-height: calc(100dvh - var(--fas-topbar-h, 56px));
  height: calc(100dvh - var(--fas-topbar-h, 56px));
  margin: -16px -16px -12px;
  background: var(--fos-paper);
  background-image: radial-gradient(ellipse 85% 55% at 50% 12%, rgba(255,255,255,0.5) 0%, transparent 70%);
  color: var(--fos-ink);
  font-family: 'Aeonik', system-ui, sans-serif;
  overflow: hidden;
}

.fas-root:has(.fos) {
  --fas-canvas: #F8F6F2;
  --fas-main-bg: transparent;
  background: #F8F6F2 !important;
}
.fas-root:has(.fos) .fas-main-col,
.fas-root:has(.fos) .fas-content,
.fas-root:has(.fos) .fas-topbar {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.fas-root:has(.fos) .fas-content { padding: 0 !important; }

.fos-invites {
  position: absolute;
  z-index: 40;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: min(420px, calc(100% - 32px));
  pointer-events: none;
}
.fos-invites > * { pointer-events: auto; }

/* Knowledge grid */
.fos-grid {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}
.fos-grid-dot {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: rgba(26, 25, 23, 0.14);
  opacity: 0.85;
  animation: fosDotBreathe 6s var(--fos-ease) infinite;
  animation-delay: calc(var(--i, 0) * 0.08s);
}
.fos-grid-dot.is-anchor {
  background: rgba(26, 25, 23, 0.2);
  z-index: 2;
}
.fos-grid-dot.is-pulse {
  background: var(--fos-primary);
  box-shadow: 0 0 0 6px var(--fos-primary-soft);
  animation: fosDotPulse 1.8s var(--fos-ease) infinite;
}

@keyframes fosDotBreathe {
  0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.95; transform: translate(-50%, -50%) scale(1.08); }
}
@keyframes fosDotPulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(91, 100, 125, 0.08); }
  50% { box-shadow: 0 0 0 10px rgba(91, 100, 125, 0.16); }
}

/* Path styles live in festag-canvas-styles.ts (.fos-path aliases) */
.fos-path {
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  z-index: 2;
}

/* Body — editorial center */
.fos-body {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;
  min-height: 100%;
  padding: 72px 28px calc(120px + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
}
.fos-body > * { pointer-events: auto; }

.fos-greeting {
  margin: auto 0 0;
  padding-bottom: 28px;
  text-align: left;
  animation: fosFadeUp 0.7s var(--fos-ease) both;
}
.fos-greeting-line {
  margin: 0;
  font-size: clamp(28px, 7.5vw, 36px);
  line-height: 1.18;
  letter-spacing: -0.035em;
  font-weight: 400;
  color: var(--fos-ink);
}
.fos-greeting-calm {
  margin: 14px 0 0;
  font-size: clamp(17px, 4.5vw, 20px);
  line-height: 1.45;
  letter-spacing: -0.02em;
  color: var(--fos-muted);
  max-width: 18em;
}

/* Floating paper panels — hairline only, sand canvas shows through. */
.fos-panel {
  margin-top: 8px;
  padding: 22px 20px 20px;
  border-radius: 16px;
  background: transparent;
  border: 1px solid rgba(26, 25, 23, 0.08);
  box-shadow: none;
  animation: fosPanelEmerge 0.65s var(--fos-ease) both;
}
.fos-panel.is-tagro {
  margin-top: 14px;
  animation-delay: 0.08s;
}

@keyframes fosFadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
@keyframes fosPanelEmerge {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

.fos-panel-label {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.2;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fos-primary);
  font-weight: 400;
}
.fos-panel-title {
  margin: 0 0 20px;
  font-size: clamp(22px, 5.8vw, 28px);
  line-height: 1.22;
  letter-spacing: -0.03em;
  font-weight: 400;
  color: var(--fos-ink);
}

.fos-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fos-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100% !important;
  min-height: 52px !important;
  height: auto !important;
  padding: 14px 16px !important;
  border-radius: 12px !important;
  border: 1px solid rgba(26, 25, 23, 0.07) !important;
  background: transparent !important;
  box-shadow: none !important;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s var(--fos-ease), border-color 0.2s var(--fos-ease);
}
.fos-option.is-on {
  background: rgba(91, 100, 125, 0.05) !important;
  border-color: rgba(91, 100, 125, 0.22) !important;
}
.fos-option-label {
  font-size: 17px;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--fos-ink);
}
.fos-option-hint {
  font-size: 13px;
  line-height: 1.35;
  color: var(--fos-muted);
}
.fos-option.is-rec .fos-option-label { color: var(--fos-primary); }

.fos-tagro-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  letter-spacing: -0.01em;
  color: var(--fos-muted);
}
.fos-tagro-head svg { color: var(--fos-primary); opacity: 0.85; }
.fos-tagro-pick {
  margin: 0 0 16px;
  font-size: clamp(24px, 6.2vw, 30px);
  line-height: 1.15;
  letter-spacing: -0.035em;
  color: var(--fos-primary);
}
.fos-tagro-why {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--fos-muted);
  letter-spacing: -0.01em;
}
.fos-tagro-reasons {
  list-style: none;
  margin: 0 0 18px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fos-tagro-reasons li {
  position: relative;
  padding-left: 18px;
  font-size: 15px;
  line-height: 1.45;
  color: var(--fos-muted);
}
.fos-tagro-reasons li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--fos-primary);
  opacity: 0.55;
}
.fos-tagro-error {
  margin: 0 0 12px;
  font-size: 14px;
  color: #C45B52;
}

.fos-btn-primary {
  width: 100% !important;
  height: 46px !important;
  border-radius: 10px !important;
  border: 1px solid rgba(30, 30, 32, 0.08) !important;
  background: #ffffff !important;
  color: #1e1e20 !important;
  font-size: 15px !important;
  letter-spacing: -0.015em;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  cursor: pointer;
  margin-bottom: 8px;
}
.fos-btn-primary:hover { background: #fafafa !important; }
.fos-btn-primary:disabled { opacity: 0.45; cursor: default; }

.fos-text-action {
  display: block;
  width: 100% !important;
  height: auto !important;
  min-height: 40px;
  padding: 8px 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  font-size: 15px;
  letter-spacing: -0.01em;
  color: var(--fos-primary);
  cursor: pointer;
  text-align: center;
}

/* Explain branch — grows from path */
.fos-explain {
  position: absolute;
  z-index: 20;
  top: 38%;
  right: 24px;
  width: min(240px, calc(100% - 48px));
  padding: 16px 16px 14px;
  border-radius: 14px;
  background: transparent;
  border: 1px solid rgba(26, 25, 23, 0.08);
  box-shadow: none;
  animation: fosPanelEmerge 0.5s var(--fos-ease) both;
}
.fos-explain-title {
  margin: 0 0 12px;
  font-size: 12px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--fos-primary);
}
.fos-explain-steps {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
}
.fos-explain-steps li {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 4px 8px;
  padding: 6px 0;
  font-size: 14px;
  line-height: 1.35;
  color: var(--fos-ink);
}
.fos-explain-n {
  color: var(--fos-primary);
  font-size: 13px;
}
.fos-explain-arrow {
  grid-column: 2;
  color: var(--fos-muted);
  font-size: 12px;
  line-height: 1;
  padding-left: 2px;
}

/* Voice dock — lyrics */
.fos-voice {
  position: absolute;
  z-index: 10;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px 28px calc(20px + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
}
.fos-wave {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 18px;
  margin-bottom: 12px;
  opacity: 0.35;
  transition: opacity 0.4s var(--fos-ease);
}
.fos-wave.is-on { opacity: 0.75; }
.fos-wave span {
  width: 2px;
  height: 6px;
  border-radius: 2px;
  background: var(--fos-primary);
  animation: fosWave 1.2s var(--fos-ease) infinite;
  animation-delay: calc(var(--i, 0) * 0.07s);
}
.fos-wave.is-on span { animation-play-state: running; }
.fos-wave:not(.is-on) span { animation-play-state: paused; }

@keyframes fosWave {
  0%, 100% { height: 5px; opacity: 0.35; }
  50% { height: 14px; opacity: 0.9; }
}

.fos-voice-line {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  letter-spacing: -0.01em;
  color: var(--fos-muted);
  text-align: center;
}
.fos-word.is-past { color: rgba(138, 134, 128, 0.55); }
.fos-word.is-current { color: var(--fos-primary); }
.fos-word.is-future { color: rgba(138, 134, 128, 0.35); }

/* Focus mode — hide chrome while story speaks / flows */
@media (max-width: 768px) {
  html.festag-story-focus .fas-sidebar,
  html.festag-story-focus .fas-sidebar-spacer,
  html.festag-story-focus .fas-topbar {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.45s var(--fos-ease);
  }
}

html[data-theme="dark"] .fos,
html[data-theme="classic-dark"] .fos {
  --fos-paper: #070708;
  --fos-ink: #E6E6EA;
  --fos-muted: rgba(230, 230, 234, 0.55);
  --fos-sheet: #1A1A1E;
  background-image: radial-gradient(ellipse 85% 55% at 50% 12%, rgba(255,255,255,0.03) 0%, transparent 70%);
}
html[data-theme="dark"] .fos-grid-dot,
html[data-theme="classic-dark"] .fos-grid-dot {
  background: rgba(230, 230, 234, 0.12);
}
html[data-theme="dark"] .fos-btn-primary,
html[data-theme="classic-dark"] .fos-btn-primary {
  background: rgba(240, 242, 245, 0.92) !important;
  color: #1A1A1E !important;
}

@media (prefers-reduced-motion: reduce) {
  .fos-grid-dot,
  .fos-path-flow,
  .fos-panel,
  .fos-greeting,
  .fos-wave span { animation: none !important; transition: none !important; }
}
`.trim()
