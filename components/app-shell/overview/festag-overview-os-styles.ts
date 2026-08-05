/**
 * Desktop Overview OS — reference dashboard (camera + floating popup).
 */

import { FESTAG_CANVAS_STYLES } from '@/components/festag-canvas/festag-canvas-styles'

export const FESTAG_OVERVIEW_OS_STYLES = `
${FESTAG_CANVAS_STYLES}

/* ── Shell: full-width canvas ── */
.fas-wb-os {
  display: block;
  position: relative;
}
.fas-wb-os-canvas {
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: calc(100dvh - var(--fas-topbar-h, 56px));
  height: calc(100dvh - var(--fas-topbar-h, 56px));
  background:
    radial-gradient(ellipse 90% 70% at 48% 18%, rgba(255, 255, 255, 0.55) 0%, transparent 62%),
    radial-gradient(ellipse 60% 50% at 80% 80%, rgba(91, 100, 125, 0.04) 0%, transparent 55%),
    var(--wb-paper, #F8F6F2);
  animation: fasOsCanvasIn 1.1s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes fasOsCanvasIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.fas-wb-os-head-copy {
  pointer-events: auto;
  animation: fasOsHeadIn 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both;
}
@keyframes fasOsHeadIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}

/* ── Header ── */
.fas-wb-os-head {
  position: relative;
  z-index: 8;
  flex-shrink: 0;
  padding: 24px 40px 8px;
  pointer-events: none;
}
.fas-wb-os-title {
  margin: 0;
  font-size: 32px;
  line-height: 1.18;
  letter-spacing: -0.038em;
  font-weight: 400;
  color: var(--wb-ink);
}
.fas-wb-os-calm {
  margin: 8px 0 0;
  font-size: 15px;
  line-height: 1.45;
  color: var(--wb-muted);
  letter-spacing: -0.01em;
}
.fas-wb-os-waiting {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-top: 16px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(26, 25, 23, 0.09);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  color: var(--wb-ink);
  font: inherit;
  font-size: 13.5px;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background 0.22s var(--wb-ease), transform 0.22s var(--wb-ease);
}
.fas-wb-os-waiting:hover {
  background: #ffffff;
  transform: translateY(-1px);
}
.fas-wb-os-waiting-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--wb-primary);
  box-shadow: 0 0 0 4px rgba(91, 100, 125, 0.14);
  animation: fasOsWaitPulse 2.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
@keyframes fasOsWaitPulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(91, 100, 125, 0.12); transform: scale(1); }
  50% { box-shadow: 0 0 0 8px rgba(91, 100, 125, 0.06); transform: scale(1.06); }
}
.fas-wb-os-waiting-chev { color: var(--wb-muted); }

/* ── Map + camera world ── */
.fas-wb-os-map {
  position: relative;
  flex: 1;
  min-height: 320px;
  overflow: hidden;
  isolation: isolate;
}
.fas-wb-os-map-vignette {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(
    ellipse 72% 68% at 36% 50%,
    transparent 0%,
    rgba(248, 246, 242, 0) 42%,
    rgba(248, 246, 242, 0.35) 100%
  );
  transition: opacity 1s cubic-bezier(0.16, 1, 0.3, 1);
}
.fas-wb-os.is-decision-focus .fas-wb-os-map-vignette {
  opacity: 1;
}
.fas-wb-os-map-grain {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.fas-wb-os-world {
  position: absolute;
  inset: 0;
  transform-origin: 0 0;
  will-change: transform;
  backface-visibility: hidden;
}
.fas-wb-os-world.is-camera-moving .fas-wb-os-mesh-dot {
  animation-play-state: paused;
}
.fas-wb-os.is-decision-focus .fas-wb-os-mesh {
  opacity: 0.72;
  transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1);
}
.fas-wb-os.is-decision-focus .fas-wb-os-knowledge-edges {
  opacity: 0.55;
  transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1);
}
.fas-wb-os.is-decision-focus .fas-wb-os-head {
  opacity: 0.68;
  transform: translateY(-2px);
  transition: opacity 0.65s var(--wb-ease), transform 0.65s var(--wb-ease);
}

/* ── Dot mesh ── */
.fas-wb-os-mesh {
  position: absolute;
  inset: -2%;
  z-index: 0;
  pointer-events: none;
  animation: fasOsMeshDrift 32s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
}
@keyframes fasOsMeshDrift {
  from { transform: translate3d(-0.6%, -0.4%, 0); }
  to { transform: translate3d(0.7%, 0.5%, 0); }
}
.fas-wb-os-mesh-line {
  stroke: rgba(26, 25, 23, 0.11);
  stroke-width: 0.32;
  stroke-linecap: round;
}
.fas-wb-os-mesh-dot {
  fill: rgba(26, 25, 23, 0.18);
  animation: fasOsMeshBreathe 6.5s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  animation-delay: calc(var(--mesh-i, 0) * 0.13s);
  transform-origin: center;
}
.fas-wb-os-mesh-svg {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  display: block !important;
}
@keyframes fasOsMeshBreathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.fas-wb-os-knowledge-edges {
  z-index: 1;
}
.fas-wb-os-knowledge-edges .festag-knowledge-edge.is-spoke {
  stroke: rgba(26, 25, 23, 0.14);
  stroke-width: 0.28;
}
.fas-wb-os-knowledge-edges .festag-knowledge-edge.is-cross {
  stroke: rgba(26, 25, 23, 0.06);
  stroke-width: 0.18;
}

.fas-wb-os-path {
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  z-index: 2;
}
.fas-wb-os-path .festag-path-track {
  stroke: rgba(91, 100, 125, 0.06);
  stroke-width: 1.4;
}
.fas-wb-os-path .festag-path-flow {
  stroke-width: 1.75;
  stroke: var(--wb-primary);
  filter: drop-shadow(0 0 3px rgba(91, 100, 125, 0.35));
}
.fas-wb-os-path .festag-path-start,
.fas-wb-os-path .festag-path-end {
  filter: drop-shadow(0 0 4px rgba(91, 100, 125, 0.45));
}

/* ── Nodes ── */
.fas-wb-os-node {
  position: absolute !important;
  z-index: 3;
  transform: translate(-50%, -50%);
  display: flex !important;
  flex-direction: column-reverse;
  align-items: center;
  gap: 10px;
  width: auto !important;
  height: auto !important;
  margin: 0 !important;
  padding: 4px !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  cursor: pointer;
  font: inherit;
  transition:
    opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.75s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}
.fas-wb-os-node:hover:not(.is-center) {
  transform: translate(-50%, -50%) scale(1.04);
}
.fas-wb-os-node-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
  text-align: center;
}
.fas-wb-os-node-label {
  font-size: 9.5px;
  line-height: 1.15;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(138, 134, 128, 0.92);
  font-weight: 400;
  max-width: 130px;
  white-space: nowrap;
}
.fas-wb-os-node-meta {
  font-size: 9px;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: rgba(138, 134, 128, 0.65);
  text-transform: none;
}
.fas-wb-os-node-dot {
  position: relative;
  z-index: 1;
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  background: rgba(107, 104, 98, 0.5);
  flex-shrink: 0;
  transition: transform 0.35s var(--wb-ease), box-shadow 0.35s var(--wb-ease);
}
.fas-wb-os-node-glow {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 20%) scale(0.6);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.95s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.95s cubic-bezier(0.16, 1, 0.3, 1),
    height 0.95s cubic-bezier(0.16, 1, 0.3, 1);
}
.fas-wb-os-node-ring {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 35%) scale(0.5);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(91, 100, 125, 0.35);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.6s var(--wb-ease), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.fas-wb-os-node.is-center .fas-wb-os-node-label {
  font-size: 10px;
  color: var(--wb-primary);
}
.fas-wb-os-node.is-center .fas-wb-os-node-dot {
  width: 16px !important;
  height: 16px !important;
  background: var(--wb-primary);
  box-shadow: 0 0 0 8px rgba(91, 100, 125, 0.18);
}
.fas-wb-os-node.is-center.is-active .fas-wb-os-node-glow {
  width: 200px;
  height: 200px;
  opacity: 1;
  transform: translate(-50%, 20%) scale(1);
  background: radial-gradient(
    circle,
    rgba(91, 100, 125, 0.42) 0%,
    rgba(91, 100, 125, 0.16) 38%,
    rgba(91, 100, 125, 0) 72%
  );
  animation: fasOsGlowPulse 3.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
.fas-wb-os-node.is-center.is-active .fas-wb-os-node-ring {
  opacity: 1;
  transform: translate(-50%, 35%) scale(1);
  animation: fasOsRingPulse 2.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
@keyframes fasOsGlowPulse {
  0%, 100% { opacity: 0.88; }
  50% { opacity: 1; }
}
@keyframes fasOsRingPulse {
  0%, 100% { transform: translate(-50%, 35%) scale(1); opacity: 0.55; }
  50% { transform: translate(-50%, 35%) scale(1.12); opacity: 0.85; }
}
.fas-wb-os-node.is-center.is-active .fas-wb-os-node-dot {
  animation: fasOsCenterDot 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
@keyframes fasOsCenterDot {
  0%, 100% { box-shadow: 0 0 0 8px rgba(91, 100, 125, 0.16); }
  50% { box-shadow: 0 0 0 14px rgba(91, 100, 125, 0.08); }
}
.fas-wb-os-node.is-path-end .fas-wb-os-node-dot {
  background: var(--wb-primary);
  box-shadow: 0 0 0 5px rgba(91, 100, 125, 0.14);
  animation: fasOsPathEndIn 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.9s;
}
@keyframes fasOsPathEndIn {
  from { transform: scale(0.4); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.fas-wb-os-node.is-task .fas-wb-os-node-dot { background: rgba(95, 107, 90, 0.65); }
.fas-wb-os-node.is-risk .fas-wb-os-node-dot { background: rgba(196, 91, 82, 0.7); }
.fas-wb-os-node.is-resource .fas-wb-os-node-dot { background: rgba(107, 98, 128, 0.65); }

.fas-wb-os.is-decision-focus .fas-wb-os-node:not(.is-center):not(.is-path-end) {
  opacity: 0.38;
  filter: blur(0.2px);
}

/* Decision block on map */
.fas-wb-os-decision {
  position: absolute;
  z-index: 4;
  transform: translate(-50%, 12px);
  max-width: min(360px, 38vw);
  text-align: center;
  pointer-events: none;
  opacity: 0;
}
.fas-wb-os-decision.is-visible {
  animation: fasOsDecisionIn 0.85s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes fasOsDecisionIn {
  from { opacity: 0; transform: translate(-50%, 22px); filter: blur(2px); }
  to { opacity: 1; transform: translate(-50%, 0); filter: blur(0); }
}
.fas-wb-os-decision-k {
  margin: 0;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--wb-primary);
}
.fas-wb-os-decision-q {
  margin: 8px 0 0;
  font-size: 17px;
  line-height: 1.38;
  letter-spacing: -0.028em;
  color: var(--wb-ink);
  font-weight: 400;
  max-width: 28ch;
  margin-inline: auto;
}
.fas-wb-os-decision-q::after {
  content: '';
  display: block;
  width: 0;
  height: 2px;
  margin: 12px auto 0;
  background: var(--wb-primary);
  border-radius: 1px;
  opacity: 0.55;
  animation: fasOsDecisionLine 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;
}
@keyframes fasOsDecisionLine {
  from { width: 0; opacity: 0; }
  to { width: 52px; opacity: 0.55; }
}

/* ── Floating popup (reference right card) ── */
.fas-wb-os-popup {
  position: absolute;
  z-index: 12;
  top: 50%;
  right: clamp(20px, 3vw, 40px);
  width: min(380px, calc(100% - 40px));
  max-height: calc(100% - 48px);
  transform: translateY(-50%);
  pointer-events: auto;
}
.fas-wb-os-popup.is-in {
  animation: fasOsPopupIn 0.78s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.fas-wb-os-popup.is-out {
  animation: fasOsPopupOut 0.42s cubic-bezier(0.4, 0, 0.2, 1) both;
  pointer-events: none;
}
@keyframes fasOsPopupIn {
  from {
    opacity: 0;
    transform: translateY(calc(-50% + 20px)) translateX(12px) scale(0.97);
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0) scale(1);
    filter: blur(0);
  }
}
@keyframes fasOsPopupOut {
  from { opacity: 1; transform: translateY(-50%) scale(1); }
  to { opacity: 0; transform: translateY(calc(-50% + 10px)) scale(0.98); }
}
.fas-wb-os-stagger {
  opacity: 0;
  animation: fasOsStaggerIn 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(180ms + var(--stagger, 0) * 55ms);
}
@keyframes fasOsStaggerIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
.fas-wb-os-popup.is-out .fas-wb-os-stagger {
  animation: none;
  opacity: 0;
}
.fas-wb-os-popup-inner {
  padding: 30px 28px 28px;
  border-radius: 16px;
  border: 1px solid rgba(26, 25, 23, 0.06);
  background: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.8) inset,
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 20px 56px rgba(20, 20, 20, 0.08),
    0 4px 16px rgba(91, 100, 125, 0.04);
  display: flex;
  flex-direction: column;
  max-height: inherit;
  overflow-y: auto;
  backdrop-filter: blur(16px);
}
.fas-wb-os-insp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 18px;
}
.fas-wb-os-insp-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--wb-primary);
}
.fas-wb-os-popup-expand {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--wb-muted);
  cursor: pointer;
  transition: background 0.2s var(--wb-ease), color 0.2s var(--wb-ease);
}
.fas-wb-os-popup-expand:hover {
  background: rgba(26, 25, 23, 0.05);
  color: var(--wb-ink);
}
.fas-wb-os-insp-pick {
  margin: 0;
  font-size: 24px;
  line-height: 1.22;
  letter-spacing: -0.03em;
  color: var(--wb-ink);
}
.fas-wb-os-insp-sub {
  margin: 6px 0 18px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--wb-muted);
}
.fas-wb-os-insp-reasons {
  margin: 0 0 20px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.fas-wb-os-insp-reasons li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 13.5px;
  line-height: 1.48;
  letter-spacing: -0.01em;
  color: var(--wb-ink);
}
.fas-wb-os-reason-check {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  border-radius: 50%;
  background: rgba(91, 100, 125, 0.1);
  position: relative;
}
.fas-wb-os-reason-check::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 4px;
  width: 6px;
  height: 4px;
  border-left: 1.5px solid var(--wb-primary);
  border-bottom: 1.5px solid var(--wb-primary);
  transform: rotate(-45deg);
}
.fas-wb-os-reason-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.fas-wb-os-reason-lead {
  display: block;
  color: var(--wb-ink);
  letter-spacing: -0.015em;
}
.fas-wb-os-reason-detail {
  display: block;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--wb-muted);
}
.fas-wb-os-insp-reasons li::before {
  content: none;
}
.fas-wb-os-alt { margin-bottom: 20px; }
.fas-wb-os-alt-k {
  margin: 0 0 5px;
  font-size: 9.5px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--wb-muted);
}
.fas-wb-os-alt-label {
  margin: 0;
  font-size: 13.5px;
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
  margin-top: 4px;
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
.fas-wb-os-btn-primary:hover:not(:disabled) { background: #fafafa; }
.fas-wb-os-btn-primary:disabled { opacity: 0.6; cursor: wait; }
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
  background: rgba(255, 255, 255, 0.7);
  color: var(--wb-ink);
}
.fas-wb-os-btn-link {
  align-self: center;
  margin-top: 4px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: var(--wb-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  letter-spacing: -0.01em;
}
.fas-wb-os-btn-link:hover { text-decoration: underline; }

/* ── Voice dock (reference pill bar) ── */
.fas-wb-os-voice {
  position: relative;
  z-index: 8;
  flex-shrink: 0;
  padding: 8px 28px 16px;
  animation: fasOsHeadIn 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both;
}
.fas-wb-os-voice-shell {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 100%;
  padding: 11px 20px 11px 14px;
  border-radius: 999px;
  border: 1px solid rgba(26, 25, 23, 0.06);
  background: rgba(255, 255, 255, 0.82);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 8px 24px rgba(20, 20, 20, 0.04);
  backdrop-filter: blur(12px);
}
.fas-wb-os-wave {
  display: flex;
  align-items: center;
  gap: 2px;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(26, 25, 23, 0.08);
  background: rgba(255, 255, 255, 0.85);
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
  to { height: 14px; }
}
.fas-wb-os-voice-text {
  margin: 0;
  flex: 0 1 auto;
  max-width: 340px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--wb-muted);
}
.fas-wb-os-word.is-current { color: var(--wb-ink); }
.fas-wb-os-word.is-past { color: rgba(138, 134, 128, 0.5); }
.fas-wb-os-voice-rail {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  height: 28px;
  opacity: 0.55;
  mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent);
}
.fas-wb-os-voice-rail span {
  display: block;
  width: 2px;
  height: calc(4px + (var(--i, 0) % 5) * 2px);
  border-radius: 1px;
  background: rgba(138, 134, 128, 0.35);
  animation: fasOsRail 2.8s var(--wb-ease) infinite;
  animation-delay: calc(var(--i, 0) * 0.04s);
}
@keyframes fasOsRail {
  0%, 100% { transform: scaleY(0.6); opacity: 0.35; }
  50% { transform: scaleY(1); opacity: 0.7; }
}

/* Dark mode */
html[data-theme="dark"] .fas-wb-os-popup-inner,
html[data-theme="classic-dark"] .fas-wb-os-popup-inner {
  background: rgba(26, 26, 30, 0.96);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
}
html[data-theme="dark"] .fas-wb-os-waiting,
html[data-theme="classic-dark"] .fas-wb-os-waiting {
  background: rgba(26, 26, 30, 0.92);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(245, 245, 247, 0.88);
}
html[data-theme="dark"] .fas-wb-os-mesh-line,
html[data-theme="classic-dark"] .fas-wb-os-mesh-line {
  stroke: rgba(255, 255, 255, 0.07);
}
html[data-theme="dark"] .fas-wb-os-mesh-dot,
html[data-theme="classic-dark"] .fas-wb-os-mesh-dot {
  fill: rgba(255, 255, 255, 0.12);
}
html[data-theme="dark"] .fas-wb-os-voice-shell,
html[data-theme="classic-dark"] .fas-wb-os-voice-shell {
  background: rgba(26, 26, 30, 0.88);
  border-color: rgba(255, 255, 255, 0.08);
}

@media (prefers-reduced-motion: reduce) {
  .fas-wb-os-world,
  .fas-wb-os-popup,
  .fas-wb-os-decision,
  .fas-wb-os-stagger,
  .fas-wb-os-mesh-dot,
  .fas-wb-os-waiting-dot,
  .fas-wb-os-node-glow,
  .fas-wb-os-node-ring,
  .festag-path-flow {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}
`.trim()
