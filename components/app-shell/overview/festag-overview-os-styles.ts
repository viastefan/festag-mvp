/**
 * Desktop Overview OS — reference dashboard (map column + right rail).
 */

import { FESTAG_CANVAS_STYLES } from '@/components/festag-canvas/festag-canvas-styles'

export const FESTAG_OVERVIEW_OS_STYLES = `
${FESTAG_CANVAS_STYLES}

/* ── Canvas shell ── */
.fas-wb-os {
  display: block;
  position: relative;
}
.fas-wb-os-canvas {
  position: relative;
  min-height: calc(100dvh - var(--fas-topbar-h, 52px));
  height: calc(100dvh - var(--fas-topbar-h, 52px));
  background:
    radial-gradient(ellipse 88% 62% at 42% 14%, rgba(255, 255, 255, 0.62) 0%, transparent 58%),
    radial-gradient(ellipse 50% 44% at 78% 88%, rgba(91, 100, 125, 0.035) 0%, transparent 52%),
    var(--wb-paper, #F8F6F2);
  animation: fasOsCanvasIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes fasOsCanvasIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ── Stage: full map + floating panel ── */
.fas-wb-os-stage {
  position: relative;
  height: 100%;
  min-height: inherit;
}
.fas-wb-os-map {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  isolation: isolate;
}
.fas-wb-os.has-rail .fas-wb-os-map::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(
    ellipse 68% 72% at 34% 46%,
    transparent 0%,
    rgba(248, 246, 242, 0) 38%,
    rgba(248, 246, 242, 0.42) 100%
  );
  transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}
.fas-wb-os.is-decision-focus.has-rail .fas-wb-os-map::after {
  opacity: 1;
}

/* Greeting overlay — inside map, top-left */
.fas-wb-os-map-head {
  position: absolute;
  z-index: 8;
  top: 0;
  left: 0;
  right: 0;
  padding: 28px 32px 0;
  pointer-events: none;
  animation: fasOsHeadIn 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.06s both;
}
@keyframes fasOsHeadIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
.fas-wb-os.is-decision-focus .fas-wb-os-map-head {
  opacity: 0.55;
  transform: translateY(-2px);
  transition: opacity 0.6s var(--wb-ease), transform 0.6s var(--wb-ease);
}
.fas-wb-os-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.2;
  letter-spacing: -0.034em;
  font-weight: 400;
  color: var(--wb-ink);
}
.fas-wb-os-calm {
  margin: 6px 0 0;
  font-size: 14.5px;
  line-height: 1.42;
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
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  color: var(--wb-ink);
  font: inherit;
  font-size: 13px;
  letter-spacing: -0.01em;
  cursor: pointer;
  pointer-events: auto;
  transition: background 0.2s var(--wb-ease), transform 0.2s var(--wb-ease);
}
.fas-wb-os-waiting:hover {
  background: #fff;
  transform: translateY(-1px);
}
.fas-wb-os-waiting-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--wb-primary);
  box-shadow: 0 0 0 4px rgba(91, 100, 125, 0.12);
  animation: fasOsWaitPulse 2.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
@keyframes fasOsWaitPulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(91, 100, 125, 0.1); }
  50% { box-shadow: 0 0 0 7px rgba(91, 100, 125, 0.05); }
}
.fas-wb-os-waiting-chev { color: var(--wb-muted); font-size: 12px; }

/* ── Camera world ── */
.fas-wb-os-world {
  position: absolute;
  inset: 0;
  bottom: 72px;
  transform-origin: 0 0;
  will-change: transform;
  backface-visibility: hidden;
}
.fas-wb-os-world.is-camera-moving .fas-wb-os-mesh-dot {
  animation-play-state: paused;
}
.fas-wb-os.is-decision-focus .fas-wb-os-mesh {
  opacity: 0.68;
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.fas-wb-os.is-decision-focus .fas-wb-os-knowledge-edges {
  opacity: 0.48;
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ── Mesh ── */
.fas-wb-os-mesh {
  position: absolute;
  inset: -3%;
  z-index: 0;
  pointer-events: none;
  animation: fasOsMeshDrift 36s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
}
@keyframes fasOsMeshDrift {
  from { transform: translate3d(-0.5%, -0.35%, 0); }
  to { transform: translate3d(0.55%, 0.4%, 0); }
}
.fas-wb-os-mesh-line {
  stroke: rgba(26, 25, 23, 0.09);
  stroke-width: 0.28;
  stroke-linecap: round;
}
.fas-wb-os-mesh-dot {
  fill: rgba(26, 25, 23, 0.16);
  animation: fasOsMeshBreathe 7s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  animation-delay: calc(var(--mesh-i, 0) * 0.11s);
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
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.85; }
}

.fas-wb-os-knowledge-edges { z-index: 1; }
.fas-wb-os-knowledge-edges .festag-knowledge-edge.is-spoke {
  stroke: rgba(26, 25, 23, 0.12);
  stroke-width: 0.26;
}
.fas-wb-os-knowledge-edges .festag-knowledge-edge.is-cross {
  stroke: rgba(26, 25, 23, 0.05);
  stroke-width: 0.16;
}

/* ── Path ── */
.fas-wb-os-path {
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  z-index: 2;
}
.fas-wb-os-path .festag-path-track {
  stroke: rgba(91, 100, 125, 0.05);
  stroke-width: 1.8;
}
.fas-wb-os-path .festag-path-flow {
  stroke-width: 2.25;
  stroke: var(--wb-primary);
  stroke-dasharray: 240;
  stroke-dashoffset: 240;
  filter: drop-shadow(0 0 5px rgba(91, 100, 125, 0.42));
}
.fas-wb-os-path.is-always .festag-path-flow,
.fas-wb-os-path.is-on .festag-path-flow {
  stroke-dashoffset: 0;
}
.fas-wb-os-path .festag-path-start,
.fas-wb-os-path .festag-path-end {
  filter: drop-shadow(0 0 5px rgba(91, 100, 125, 0.5));
}

/* ── Nodes — label beside dot (reference) ── */
.fas-wb-os-node {
  position: absolute !important;
  z-index: 3;
  transform: translate(-50%, -50%);
  display: flex !important;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  width: auto !important;
  height: auto !important;
  margin: 0 !important;
  padding: 6px !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  cursor: pointer;
  font: inherit;
  transition:
    opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.fas-wb-os-node.is-anchor-e {
  flex-direction: row;
  transform: translate(0, -50%);
}
.fas-wb-os-node.is-anchor-w {
  flex-direction: row-reverse;
  transform: translate(-100%, -50%);
}
.fas-wb-os-node.is-anchor-s {
  flex-direction: column;
  align-items: flex-start;
  transform: translate(-50%, 0);
  gap: 5px;
}
.fas-wb-os-node.is-anchor-n {
  flex-direction: column-reverse;
  align-items: flex-start;
  transform: translate(-50%, -100%);
  gap: 5px;
}
.fas-wb-os-node.is-anchor-ne,
.fas-wb-os-node.is-anchor-nw {
  flex-direction: column;
  align-items: flex-start;
  transform: translate(-50%, 0);
  gap: 6px;
}
.fas-wb-os-node.is-anchor-nw { align-items: flex-end; }
.fas-wb-os-node.is-center {
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  gap: 0;
}
.fas-wb-os-node-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
  pointer-events: none;
  text-align: left;
  min-width: 0;
}
.fas-wb-os-node.is-center .fas-wb-os-node-copy {
  text-align: center;
  margin-top: 8px;
}
.fas-wb-os-node.is-center.is-active .fas-wb-os-node-copy {
  opacity: 0;
  visibility: hidden;
  height: 0;
  margin: 0;
  overflow: hidden;
}
.fas-wb-os-node-label {
  font-size: 9px;
  line-height: 1.15;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(138, 134, 128, 0.9);
  font-weight: 400;
  white-space: nowrap;
}
.fas-wb-os-node-meta {
  font-size: 8.5px;
  line-height: 1.2;
  letter-spacing: 0.01em;
  color: rgba(138, 134, 128, 0.58);
  text-transform: none;
  white-space: nowrap;
}
.fas-wb-os-node-orb {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
}
.fas-wb-os-node.is-center .fas-wb-os-node-orb {
  width: 18px;
  height: 18px;
}
.fas-wb-os-node-dot {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 6px !important;
  height: 6px !important;
  border-radius: 50% !important;
  background: rgba(107, 104, 98, 0.48);
  transition: transform 0.35s var(--wb-ease), box-shadow 0.35s var(--wb-ease);
}
.fas-wb-os-node-glow,
.fas-wb-os-node-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  pointer-events: none;
  opacity: 0;
}
.fas-wb-os-node-glow {
  transform: translate(-50%, -50%) scale(0.5);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition:
    opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.95s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.95s cubic-bezier(0.16, 1, 0.3, 1),
    height 0.95s cubic-bezier(0.16, 1, 0.3, 1);
}
.fas-wb-os-node-ring {
  transform: translate(-50%, -50%) scale(0.45);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(91, 100, 125, 0.32);
  transition: opacity 0.6s var(--wb-ease), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.fas-wb-os-node.is-center .fas-wb-os-node-label {
  font-size: 9.5px;
  color: var(--wb-primary);
}
.fas-wb-os-node.is-center .fas-wb-os-node-dot {
  width: 14px !important;
  height: 14px !important;
  background: var(--wb-primary);
  box-shadow: 0 0 0 7px rgba(91, 100, 125, 0.16);
}
.fas-wb-os-node.is-center.is-active .fas-wb-os-node-glow {
  width: 220px;
  height: 220px;
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
  background: radial-gradient(
    circle,
    rgba(91, 100, 125, 0.38) 0%,
    rgba(91, 100, 125, 0.14) 40%,
    rgba(91, 100, 125, 0) 72%
  );
  animation: fasOsGlowPulse 3s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
.fas-wb-os-node.is-center.is-active .fas-wb-os-node-ring {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
  width: 48px;
  height: 48px;
  border: 2px solid rgba(255, 255, 255, 0.95);
  box-shadow:
    0 0 0 1px rgba(91, 100, 125, 0.12),
    0 8px 28px rgba(20, 20, 20, 0.08);
  animation: fasOsRingPulse 2.6s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
@keyframes fasOsGlowPulse {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}
@keyframes fasOsRingPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
}
.fas-wb-os-node.is-center.is-active .fas-wb-os-node-dot {
  animation: fasOsCenterDot 2.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
@keyframes fasOsCenterDot {
  0%, 100% { box-shadow: 0 0 0 7px rgba(91, 100, 125, 0.14); }
  50% { box-shadow: 0 0 0 12px rgba(91, 100, 125, 0.07); }
}
.fas-wb-os-node.is-path-end .fas-wb-os-node-dot {
  background: var(--wb-primary);
  box-shadow: 0 0 0 4px rgba(91, 100, 125, 0.12);
  animation: fasOsPathEndIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.85s;
}
@keyframes fasOsPathEndIn {
  from { transform: scale(0.35); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.fas-wb-os-node.is-task .fas-wb-os-node-dot { background: rgba(95, 107, 90, 0.62); }
.fas-wb-os-node.is-risk .fas-wb-os-node-dot { background: rgba(196, 91, 82, 0.68); }
.fas-wb-os-node.is-resource .fas-wb-os-node-dot { background: rgba(107, 98, 128, 0.62); }

.fas-wb-os.is-decision-focus .fas-wb-os-node:not(.is-center):not(.is-path-end) {
  opacity: 0.32;
  filter: blur(0.15px);
}

/* Decision block — beside center node (reference) */
.fas-wb-os-decision {
  position: absolute;
  z-index: 4;
  transform: translate(0, -50%);
  max-width: min(300px, 32vw);
  text-align: left;
  pointer-events: none;
  opacity: 0;
}
.fas-wb-os-decision.is-beside .fas-wb-os-decision-q {
  margin-inline: 0;
  max-width: 22ch;
}
.fas-wb-os-decision.is-visible {
  animation: fasOsDecisionIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes fasOsDecisionIn {
  from { opacity: 0; transform: translate(8px, -50%); filter: blur(2px); }
  to { opacity: 1; transform: translate(0, -50%); filter: blur(0); }
}
.fas-wb-os-decision-ctx {
  margin: 0;
  font-size: 9px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(138, 134, 128, 0.88);
}
.fas-wb-os-decision-pill {
  display: inline-block;
  margin-top: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(91, 100, 125, 0.18);
  background: rgba(255, 255, 255, 0.92);
  font-size: 8.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wb-primary);
}
.fas-wb-os-decision-k {
  margin: 0;
  font-size: 9px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--wb-primary);
}
.fas-wb-os-decision-q {
  margin: 10px 0 0;
  font-size: 15.5px;
  line-height: 1.38;
  letter-spacing: -0.026em;
  color: var(--wb-ink);
  font-weight: 400;
  max-width: 24ch;
  margin-inline: 0;
}
.fas-wb-os-decision-arr {
  display: inline-block;
  margin-left: 4px;
  color: var(--wb-muted);
}
.fas-wb-os-decision-q::after {
  display: none;
}

/* ── Floating decision panel (reference) ── */
.fas-wb-os-rail {
  position: absolute;
  z-index: 12;
  top: 20px;
  right: 22px;
  bottom: 20px;
  width: min(400px, 34vw);
  min-width: 320px;
  display: flex;
  flex-direction: column;
  padding: 22px 22px 20px;
  border-radius: 14px;
  border: 1px solid rgba(26, 25, 23, 0.07);
  background: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.85) inset,
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 16px 48px rgba(20, 20, 20, 0.09);
  overflow-y: auto;
}
.fas-wb-os-canvas-rail {
  display: flex;
  flex-direction: column;
  padding: 18px 16px 16px;
  background: transparent;
  border: none;
  box-shadow: none;
}
.fas-wb-os-canvas-rail .fas-wb-os-rail-close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
}
.fas-wb-os-canvas-rail .osp-rail {
  padding-top: 28px;
}
.fas-wb-os-canvas-rail .fos-panel {
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.85) inset,
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 16px 44px rgba(20, 20, 20, 0.08);
}
.fas-wb-os-rail.is-in {
  animation: fasOsRailIn 0.72s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.fas-wb-os-rail.is-out {
  animation: fasOsRailOut 0.38s cubic-bezier(0.4, 0, 0.2, 1) both;
  pointer-events: none;
}
@keyframes fasOsRailIn {
  from {
    opacity: 0;
    transform: translateX(16px);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: blur(0);
  }
}
@keyframes fasOsRailOut {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateX(10px); }
}
.fas-wb-os-rail-dec {
  margin-bottom: 16px;
}
.fas-wb-os-rail-dec-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.fas-wb-os-rail-dec-k {
  margin: 0;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--wb-muted);
}
.fas-wb-os-rail-dec-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.18;
  letter-spacing: -0.032em;
  font-weight: 400;
  color: var(--wb-ink);
}
.fas-wb-os-rail-dec-sub {
  margin: 6px 0 0;
  font-size: 13.5px;
  line-height: 1.42;
  color: var(--wb-muted);
}
.fas-wb-os-opt-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.fas-wb-os-opt-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(26, 25, 23, 0.08);
  background: rgba(255, 255, 255, 0.9);
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: border-color 0.2s var(--wb-ease), box-shadow 0.2s var(--wb-ease);
}
.fas-wb-os-opt-card:hover {
  border-color: rgba(91, 100, 125, 0.22);
}
.fas-wb-os-opt-card.is-on {
  border-color: rgba(91, 100, 125, 0.35);
  box-shadow: 0 0 0 1px rgba(91, 100, 125, 0.08);
}
.fas-wb-os-opt-thumb {
  flex-shrink: 0;
  width: 52px;
  height: 40px;
  border-radius: 6px;
  background: linear-gradient(145deg, #eceae6 0%, #d8d4cc 100%);
}
.fas-wb-os-opt-thumb.is-b {
  background: linear-gradient(145deg, #e4e2de 0%, #c9c5bc 100%);
}
.fas-wb-os-opt-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fas-wb-os-opt-label {
  font-size: 13.5px;
  line-height: 1.3;
  letter-spacing: -0.012em;
  color: var(--wb-ink);
}
.fas-wb-os-opt-hint {
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--wb-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fas-wb-os-opt-mark {
  flex-shrink: 0;
  display: flex;
  color: var(--wb-muted);
}
.fas-wb-os-opt-card.is-on .fas-wb-os-opt-mark {
  color: var(--wb-primary);
}
.fas-wb-os-rail-tagro {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(91, 100, 125, 0.12);
  background: rgba(91, 100, 125, 0.05);
}
.fas-wb-os-rail-tagro-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 7px;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--wb-primary);
}
.fas-wb-os-rail-tagro-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.48;
  color: var(--wb-ink);
  letter-spacing: -0.01em;
}
.fas-wb-os-rail-reasons-k,
.fas-wb-os-rail-actions-k {
  margin: 0 0 8px;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--wb-muted);
}
.fas-wb-os-rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}
.fas-wb-os-rail-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--wb-primary);
}
.fas-wb-os-rail-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--wb-muted);
  cursor: pointer;
  transition: background 0.2s var(--wb-ease), color 0.2s var(--wb-ease);
}
.fas-wb-os-rail-close:hover {
  background: rgba(26, 25, 23, 0.05);
  color: var(--wb-ink);
}
.fas-wb-os-rail-title {
  margin: 0;
  font-size: 26px;
  line-height: 1.22;
  letter-spacing: -0.032em;
  font-weight: 400;
  color: var(--wb-ink);
}
.fas-wb-os-rail-sub {
  margin: 5px 0 22px;
  font-size: 13.5px;
  line-height: 1.4;
  color: var(--wb-muted);
}
.fas-wb-os-rail-reasons {
  margin: 0 0 22px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.fas-wb-os-rail-reasons li {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}
.fas-wb-os-rail-check {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border-radius: 50%;
  background: rgba(91, 100, 125, 0.1);
  color: var(--wb-primary);
}
.fas-wb-os-rail-reason-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.fas-wb-os-rail-reason-lead {
  font-size: 13.5px;
  line-height: 1.42;
  letter-spacing: -0.012em;
  color: var(--wb-ink);
}
.fas-wb-os-rail-reason-detail {
  font-size: 12.5px;
  line-height: 1.44;
  color: var(--wb-muted);
}
.fas-wb-os-rail-alt {
  margin-bottom: 22px;
  padding-top: 4px;
}
.fas-wb-os-rail-alt-k {
  margin: 0 0 5px;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--wb-muted);
}
.fas-wb-os-rail-alt-v {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.42;
  color: var(--wb-muted);
}
.fas-wb-os-rail-alt-h {
  margin: 3px 0 0;
  font-size: 12.5px;
  line-height: 1.4;
  color: rgba(138, 134, 128, 0.75);
}
.fas-wb-os-error {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--wb-risk);
}
.fas-wb-os-rail-actions {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: auto;
  padding-top: 8px;
}
.fas-wb-os-btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  border-radius: 4px;
  border: 1px solid rgba(30, 30, 32, 0.08);
  background: #ffffff;
  color: #1e1e20;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  font: inherit;
  font-size: 14px;
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
  font-size: 13.5px;
  cursor: pointer;
  transition: background 0.2s var(--wb-ease), color 0.2s var(--wb-ease);
}
.fas-wb-os-btn-ghost:hover {
  background: rgba(255, 255, 255, 0.8);
  color: var(--wb-ink);
}
.fas-wb-os-btn-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: center;
  margin-top: 2px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: var(--wb-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  letter-spacing: -0.01em;
}
.fas-wb-os-btn-ghost span {
  margin-left: 4px;
}
.fas-wb-os-btn-link:hover { text-decoration: underline; }

/* ── Voice bar — full width at map bottom ── */
.fas-wb-os-voice {
  position: relative;
  z-index: 9;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 24px 18px;
  padding: 10px 18px 10px 12px;
  border-radius: 999px;
  border: 1px solid rgba(26, 25, 23, 0.06);
  background: rgba(255, 255, 255, 0.88);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 6px 20px rgba(20, 20, 20, 0.04);
  backdrop-filter: blur(10px);
  animation: fasOsHeadIn 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.14s both;
}
.fas-wb-os-wave {
  display: flex;
  align-items: center;
  gap: 2px;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(26, 25, 23, 0.08);
  background: rgba(255, 255, 255, 0.9);
}
.fas-wb-os-wave span {
  display: block;
  width: 2px;
  height: 4px;
  border-radius: 1px;
  background: rgba(91, 100, 125, 0.32);
  animation: fasOsWaveIdle 2.4s var(--wb-ease) infinite;
  animation-delay: calc(var(--i, 0) * 0.08s);
}
.fas-wb-os-wave.is-on span {
  background: var(--wb-primary);
  animation: fasOsWaveSpeak 0.5s var(--wb-ease) infinite alternate;
  animation-delay: calc(var(--i, 0) * 0.05s);
}
@keyframes fasOsWaveIdle {
  0%, 100% { height: 4px; opacity: 0.4; }
  50% { height: 7px; opacity: 0.7; }
}
@keyframes fasOsWaveSpeak {
  from { height: 4px; }
  to { height: 13px; }
}
.fas-wb-os-voice-copy {
  flex: 0 1 auto;
  min-width: 0;
}
.fas-wb-os-voice-text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.42;
  color: var(--wb-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}
.fas-wb-os-voice-meta {
  margin: 1px 0 0;
  font-size: 10.5px;
  line-height: 1.3;
  color: rgba(138, 134, 128, 0.65);
}
.fas-wb-os-word.is-current { color: var(--wb-ink); }
.fas-wb-os-word.is-past { color: rgba(138, 134, 128, 0.48); }
.fas-wb-os-voice-rail {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  height: 26px;
  min-width: 80px;
  opacity: 0.5;
  mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);
}
.fas-wb-os-voice-rail span {
  display: block;
  width: 2px;
  height: calc(3px + (var(--i, 0) % 7) * 1.8px);
  border-radius: 1px;
  background: rgba(138, 134, 128, 0.32);
  animation: fasOsRail 2.6s var(--wb-ease) infinite;
  animation-delay: calc(var(--i, 0) * 0.035s);
}
@keyframes fasOsRail {
  0%, 100% { transform: scaleY(0.55); opacity: 0.3; }
  50% { transform: scaleY(1); opacity: 0.65; }
}

/* Focus: soften shell chrome */
.fas-root:has(.fas-wb-os.is-decision-focus) .fas-topbar {
  opacity: 0.72;
  transition: opacity 0.5s var(--wb-ease);
}

/* Dark mode */
html[data-theme="dark"] .fas-wb-os-rail,
html[data-theme="classic-dark"] .fas-wb-os-rail {
  background: rgba(26, 26, 30, 0.97);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
}
html[data-theme="dark"] .fas-wb-os-opt-card,
html[data-theme="classic-dark"] .fas-wb-os-opt-card {
  background: rgba(14, 14, 16, 0.92);
  border-color: rgba(255, 255, 255, 0.08);
}
html[data-theme="dark"] .fas-wb-os-rail-tagro,
html[data-theme="classic-dark"] .fas-wb-os-rail-tagro {
  background: rgba(91, 100, 125, 0.1);
  border-color: rgba(255, 255, 255, 0.08);
}
html[data-theme="dark"] .fas-wb-os-voice,
html[data-theme="classic-dark"] .fas-wb-os-voice {
  background: rgba(26, 26, 30, 0.9);
  border-color: rgba(255, 255, 255, 0.08);
}
html[data-theme="dark"] .fas-wb-os-waiting,
html[data-theme="classic-dark"] .fas-wb-os-waiting {
  background: rgba(26, 26, 30, 0.92);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(245, 245, 247, 0.88);
}
html[data-theme="dark"] .fas-wb-os-mesh-line,
html[data-theme="classic-dark"] .fas-wb-os-mesh-line {
  stroke: rgba(255, 255, 255, 0.06);
}
html[data-theme="dark"] .fas-wb-os-mesh-dot,
html[data-theme="classic-dark"] .fas-wb-os-mesh-dot {
  fill: rgba(255, 255, 255, 0.11);
}
html[data-theme="dark"] .fas-wb-os.has-rail .fas-wb-os-map::after,
html[data-theme="classic-dark"] .fas-wb-os.has-rail .fas-wb-os-map::after {
  background: radial-gradient(
    ellipse 68% 72% at 34% 46%,
    transparent 0%,
    rgba(7, 7, 8, 0) 38%,
    rgba(7, 7, 8, 0.5) 100%
  );
}

@media (prefers-reduced-motion: reduce) {
  .fas-wb-os-world,
  .fas-wb-os-rail,
  .fas-wb-os-decision,
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
