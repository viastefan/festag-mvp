/**
 * Shared Festag Path + Knowledge edge styles (Read Mode canvas).
 * Used by mobile story (.fos-path) and desktop board (.fas-wb-path).
 */

export const FESTAG_CANVAS_STYLES = `
/* ── Festag Path (one active ink line) ── */
.festag-path,
.fos-path,
.fas-wb-path {
  position: absolute;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.5s var(--festag-canvas-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
.festag-path.is-always,
.fas-wb-path.is-always { opacity: 1; }
.festag-path.is-on,
.fos-path.is-on,
.fas-wb-path.is-on { opacity: 1; }
.festag-path.is-out,
.fos-path.is-out,
.fas-wb-path.is-out {
  opacity: 0;
  transition-duration: 0.45s;
}

.festag-path-track,
.fos-path-track,
.fas-wb-path-track {
  fill: none;
  stroke: rgba(91, 100, 125, 0.08);
  stroke-width: 1.2;
  stroke-linecap: round;
}
.festag-path-flow,
.fos-path-flow,
.fas-wb-path-flow {
  fill: none;
  stroke: var(--festag-canvas-primary, #5B647D);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-dasharray: 160;
  stroke-dashoffset: 160;
  transition: stroke-dashoffset var(--festag-path-draw-duration, 1.1s)
    var(--festag-canvas-ease-slow, cubic-bezier(0.16, 1, 0.3, 1));
  transition-delay: var(--festag-path-draw-delay, 0ms);
}
.festag-path.is-on .festag-path-flow,
.fos-path.is-on .fos-path-flow,
.fas-wb-path.is-on .fas-wb-path-flow,
.festag-path.is-always .festag-path-flow,
.fas-wb-path.is-always .fas-wb-path-flow {
  stroke-dashoffset: 0;
}
.festag-path.has-draw-delay.is-always .festag-path-start,
.fas-wb-path.has-draw-delay.is-always .fas-wb-path-start {
  transition-delay: calc(var(--festag-path-draw-delay, 0ms) + 80ms);
}
.festag-path.has-draw-delay.is-always .festag-path-end,
.fas-wb-path.has-draw-delay.is-always .fas-wb-path-end {
  transition-delay: calc(var(--festag-path-draw-delay, 0ms) + var(--festag-path-draw-duration, 1.1s) * 0.72);
}
.festag-path.is-out .festag-path-flow,
.fos-path.is-out .fos-path-flow,
.fas-wb-path.is-out .fas-wb-path-flow {
  stroke-dashoffset: 120;
  transition-duration: 0.5s;
}

.festag-path-start,
.festag-path-end,
.fos-path-start,
.fos-path-end,
.fas-wb-path-start,
.fas-wb-path-end {
  fill: var(--festag-canvas-primary, #5B647D);
  opacity: 0;
  transition: opacity 0.4s var(--festag-canvas-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
.festag-path.is-on .festag-path-start,
.fos-path.is-on .fos-path-start,
.fas-wb-path.is-on .fas-wb-path-start,
.festag-path.is-always .festag-path-start,
.fas-wb-path.is-always .fas-wb-path-start { opacity: 0.85; }
.festag-path.is-on .festag-path-end,
.fos-path.is-on .fos-path-end,
.fas-wb-path.is-on .fas-wb-path-end,
.festag-path.is-always .festag-path-end,
.fas-wb-path.is-always .fas-wb-path-end {
  opacity: 1;
  transition-delay: 0.85s;
}

/* Knowledge edges — faint, static */
.festag-knowledge-edges,
.fas-wb-knowledge-edges {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  display: block !important;
  overflow: visible;
  pointer-events: none;
  z-index: 0;
}
.festag-knowledge-edge {
  fill: none;
  stroke-linecap: round;
}
.festag-knowledge-edge.is-spoke {
  stroke: rgba(26, 25, 23, 0.18);
  stroke-width: 0.22;
}
.festag-knowledge-edge.is-cross {
  stroke: rgba(26, 25, 23, 0.07);
  stroke-width: 0.14;
}

/* Desktop project rail path */
.fas-wb-path {
  left: 15px;
  top: 18px;
  bottom: 28px;
  width: 32px;
  height: auto;
  opacity: 1;
}
`.trim()
