/**
 * Desktop Overview OS — Read Mode three-column layout styles.
 * Canvas · Knowledge Map · Inspector (reference dashboard).
 */

import { FESTAG_CANVAS_STYLES } from '@/components/festag-canvas/festag-canvas-styles'

export const FESTAG_OVERVIEW_OS_STYLES = `
${FESTAG_CANVAS_STYLES}

/* ── Desktop OS shell ── */
.fas-wb-os {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.fas-wb-os-canvas {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* ── Header ── */
.fas-wb-os-head {
  position: relative;
  z-index: 4;
  flex-shrink: 0;
  padding: 28px 36px 12px;
}
.fas-wb-os-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.22;
  letter-spacing: -0.03em;
  font-weight: 400;
  color: var(--wb-ink);
}
.fas-wb-os-calm {
  margin: 6px 0 0;
  font-size: 15px;
  line-height: 1.45;
  color: var(--wb-muted);
  letter-spacing: -0.01em;
}
.fas-wb-os-waiting {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 9px 16px;
  border-radius: 999px;
  border: 1px solid rgba(26, 25, 23, 0.08);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  color: var(--wb-ink);
  font: inherit;
  font-size: 13.5px;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background 0.2s var(--wb-ease), border-color 0.2s var(--wb-ease);
}
.fas-wb-os-waiting:hover {
  background: #ffffff;
  border-color: rgba(26, 25, 23, 0.12);
}
.fas-wb-os-waiting-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--wb-primary);
  flex-shrink: 0;
}
.fas-wb-os-waiting-chev {
  color: var(--wb-muted);
  margin-left: 2px;
}

/* ── Knowledge map ── */
.fas-wb-os-map {
  position: relative;
  flex: 1;
  min-height: 280px;
  overflow: hidden;
}
.fas-wb-os-grid {
  inset: -40%;
  background-image:
    radial-gradient(circle at center, rgba(26, 25, 23, 0.12) 1px, transparent 1px),
    linear-gradient(to right, rgba(26, 25, 23, 0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(26, 25, 23, 0.045) 1px, transparent 1px);
  background-size: 48px 48px, 64px 64px, 64px 64px;
  opacity: 0.85;
}

.fas-wb-os-path {
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  z-index: 1;
}

/* ── Map nodes ── */
.fas-wb-os-node {
  position: absolute !important;
  z-index: 2;
  transform: translate(-50%, -50%);
  display: flex !important;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: auto !important;
  height: auto !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 6px 8px !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  cursor: pointer;
  color: var(--wb-ink);
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}
.fas-wb-os-node-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  pointer-events: none;
  text-align: center;
}
.fas-wb-os-node-label {
  font-size: 10px;
  line-height: 1.2;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(138, 134, 128, 0.95);
  font-weight: 400;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fas-wb-os-node-meta {
  font-size: 10px;
  line-height: 1.25;
  letter-spacing: 0.02em;
  text-transform: none;
  color: rgba(138, 134, 128, 0.72);
}
.fas-wb-os-node-dot {
  position: relative;
  z-index: 1;
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
  background: rgba(107, 104, 98, 0.55);
  flex-shrink: 0;
}
.fas-wb-os-node-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.5s var(--wb-ease), width 0.5s var(--wb-ease), height 0.5s var(--wb-ease);
}
.fas-wb-os-node.is-center .fas-wb-os-node-label {
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--wb-primary);
}
.fas-wb-os-node.is-center .fas-wb-os-node-dot {
  width: 14px !important;
  height: 14px !important;
  background: var(--wb-primary);
}
.fas-wb-os-node.is-center.is-active .fas-wb-os-node-glow {
  width: 140px;
  height: 140px;
  opacity: 1;
  background: radial-gradient(
    circle,
    rgba(91, 100, 125, 0.32) 0%,
    rgba(91, 100, 125, 0.12) 42%,
    rgba(91, 100, 125, 0) 72%
  );
}
.fas-wb-os-node.is-task .fas-wb-os-node-dot { background: rgba(95, 107, 90, 0.7); }
.fas-wb-os-node.is-risk .fas-wb-os-node-dot { background: rgba(196, 91, 82, 0.75); }
.fas-wb-os-node.is-resource .fas-wb-os-node-dot { background: rgba(107, 98, 128, 0.7); }

/* Decision prompt on map */
.fas-wb-os-decision {
  position: absolute;
  z-index: 3;
  transform: translate(-50%, 0);
  max-width: min(340px, 42vw);
  text-align: center;
  pointer-events: none;
}
.fas-wb-os-decision-k {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wb-primary);
}
.fas-wb-os-decision-q {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.45;
  letter-spacing: -0.02em;
  color: var(--wb-ink);
}
.fas-wb-os-decision-q::after {
  content: '';
  display: block;
  width: 48px;
  height: 2px;
  margin: 10px auto 0;
  background: var(--wb-primary);
  border-radius: 1px;
  opacity: 0.55;
}

/* ── Voice dock ── */
.fas-wb-os-voice {
  position: relative;
  z-index: 4;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 36px 22px;
  border-top: 1px solid rgba(26, 25, 23, 0.06);
}
.fas-wb-os-wave {
  display: flex;
  align-items: center;
  gap: 2px;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  justify-content: center;
}
.fas-wb-os-wave span {
  display: block;
  width: 2px;
  height: 4px;
  border-radius: 1px;
  background: rgba(91, 100, 125, 0.35);
  animation: fasOsWaveIdle 2.4s var(--wb-ease) infinite;
  animation-delay: calc(var(--i, 0) * 0.08s);
}
.fas-wb-os-wave.is-on span {
  background: var(--wb-primary);
  animation: fasOsWaveSpeak 0.55s var(--wb-ease) infinite alternate;
  animation-delay: calc(var(--i, 0) * 0.05s);
}
@keyframes fasOsWaveIdle {
  0%, 100% { height: 4px; opacity: 0.45; }
  50% { height: 8px; opacity: 0.75; }
}
@keyframes fasOsWaveSpeak {
  from { height: 4px; }
  to { height: 16px; }
}
.fas-wb-os-voice-text {
  margin: 0;
  flex: 1;
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--wb-muted);
  letter-spacing: -0.01em;
}
.fas-wb-os-word.is-current {
  color: var(--wb-ink);
}
.fas-wb-os-word.is-past {
  color: rgba(138, 134, 128, 0.55);
}

/* ── Inspector ── */
.fas-wb-os-inspector {
  width: min(400px, 34vw);
  flex-shrink: 0;
  border-left: 1px solid rgba(26, 25, 23, 0.08);
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(12px);
  overflow-y: auto;
  animation: fasOsInspIn 0.55s var(--wb-ease) both;
}
@keyframes fasOsInspIn {
  from { opacity: 0; transform: translateX(12px); }
  to { opacity: 1; transform: none; }
}
.fas-wb-os-inspector-inner {
  padding: 32px 28px 36px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.fas-wb-os-insp-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wb-primary);
  font-weight: 400;
}
.fas-wb-os-insp-pick {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
  letter-spacing: -0.03em;
  color: var(--wb-ink);
}
.fas-wb-os-insp-sub {
  margin: 6px 0 20px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--wb-muted);
}
.fas-wb-os-insp-reasons {
  margin: 0 0 24px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.fas-wb-os-insp-reasons li {
  position: relative;
  padding-left: 22px;
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: -0.01em;
  color: var(--wb-ink);
}
.fas-wb-os-insp-reasons li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.45em;
  width: 10px;
  height: 6px;
  border-left: 1.5px solid var(--wb-primary);
  border-bottom: 1.5px solid var(--wb-primary);
  transform: rotate(-45deg);
  opacity: 0.85;
}

.fas-wb-os-choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}
.fas-wb-os-choice {
  display: block;
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid rgba(26, 25, 23, 0.08);
  background: rgba(255, 255, 255, 0.5);
  color: var(--wb-ink);
  font: inherit;
  font-size: 14px;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: border-color 0.2s var(--wb-ease), background 0.2s var(--wb-ease);
}
.fas-wb-os-choice.is-on {
  border-color: rgba(91, 100, 125, 0.45);
  background: rgba(91, 100, 125, 0.06);
}
.fas-wb-os-choice:hover {
  background: rgba(255, 255, 255, 0.85);
}

.fas-wb-os-alt {
  margin-bottom: 24px;
}
.fas-wb-os-alt-k {
  margin: 0 0 6px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wb-muted);
}
.fas-wb-os-alt-label {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--wb-muted);
}

.fas-wb-os-error {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--wb-risk);
}

.fas-wb-os-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
}
.fas-wb-os-btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 44px;
  border-radius: 4px;
  border: 1px solid rgba(30, 30, 32, 0.08);
  background: #ffffff;
  color: #1e1e20;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  font: inherit;
  font-size: 14.5px;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background 0.2s var(--wb-ease);
}
.fas-wb-os-btn-primary:hover:not(:disabled) {
  background: #fafafa;
}
.fas-wb-os-btn-primary:disabled {
  opacity: 0.6;
  cursor: wait;
}
.fas-wb-os-btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px;
  border-radius: 4px;
  border: 1px solid rgba(26, 25, 23, 0.1);
  background: transparent;
  color: var(--wb-muted);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s var(--wb-ease), color 0.2s var(--wb-ease);
}
.fas-wb-os-btn-ghost:hover {
  background: rgba(255, 255, 255, 0.6);
  color: var(--wb-ink);
}

/* Dark mode */
html[data-theme="dark"] .fas-wb-os-inspector,
html[data-theme="classic-dark"] .fas-wb-os-inspector {
  background: rgba(21, 21, 24, 0.92);
  border-left-color: rgba(255, 255, 255, 0.06);
}
html[data-theme="dark"] .fas-wb-os-waiting,
html[data-theme="classic-dark"] .fas-wb-os-waiting {
  background: rgba(26, 26, 30, 0.88);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(245, 245, 247, 0.88);
}
html[data-theme="dark"] .fas-wb-os-btn-primary,
html[data-theme="classic-dark"] .fas-wb-os-btn-primary {
  background: rgba(240, 242, 245, 0.95);
  color: #1a1a1e;
}
html[data-theme="dark"] .fas-wb-os-choice,
html[data-theme="classic-dark"] .fas-wb-os-choice {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(245, 245, 247, 0.88);
}
`.trim()
