/**
 * Overview flow — warm ivory, white surfaces, no black fills.
 * Focusing a node lifts it and quiets everything around it.
 */

export const FESTAG_FLOW_STYLES = `
.ffl {
  --ffl-ink: #1E1E20;
  --ffl-soft: #5c5c62;
  --ffl-muted: #8891a0;
  --ffl-line: rgba(15, 15, 18, 0.08);
  --ffl-blue: #3B6FD4;
  --ffl-red: #C43C3C;
  --ffl-green: #2E9B52;
  --ffl-ease: cubic-bezier(0.16, 1, 0.3, 1);

  position: relative;
  display: grid;
  grid-template-columns: minmax(280px, 0.82fr) minmax(360px, 1fr) minmax(300px, 0.82fr);
  gap: clamp(16px, 2.2vw, 40px);
  align-items: center;
  min-height: calc(100dvh - var(--fas-topbar-h, 52px));
  padding: clamp(24px, 4vh, 56px) clamp(24px, 3vw, 56px);
  background: #FBF7EE;
  color: var(--ffl-ink);
}

/* ── Report ── */
.ffl-greet {
  margin: 0 0 16px;
  font-size: clamp(30px, 3.1vw, 46px);
  line-height: 1.1;
  letter-spacing: -0.03em;
  font-weight: 400;
}
.ffl-line {
  margin: 0;
  font-size: 17px;
  line-height: 1.6;
  color: var(--ffl-soft);
  max-width: 34ch;
}

.ffl-kpis {
  display: flex;
  flex-wrap: wrap;
  gap: 22px 26px;
  margin-top: 34px;
  padding-top: 26px;
  border-top: 1px solid var(--ffl-line);
}
.ffl-kpi { display: flex; flex-direction: column; gap: 5px; }
.ffl-kpi-top { display: inline-flex; align-items: center; gap: 8px; }
.ffl-kpi-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ffl-kpi-dot.is-red { background: var(--ffl-red); }
.ffl-kpi-dot.is-green { background: var(--ffl-green); }
.ffl-kpi-dot.is-blue { background: var(--ffl-blue); }
.ffl-kpi-dot.is-ink { background: rgba(58, 58, 66, 0.35); }
.ffl-kpi-v {
  font-size: 20px; line-height: 1; letter-spacing: -0.015em;
  font-variant-numeric: tabular-nums;
}
.ffl-kpi-l { font-size: 15px; color: var(--ffl-muted); }

.ffl-cta {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 46px;
  margin-top: 28px;
  padding: 0 20px;
  border-radius: 8px;
  background: #FFFFFF;
  color: var(--ffl-ink);
  border: 1px solid rgba(30, 30, 32, 0.10);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  font: inherit;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.18s var(--ffl-ease), transform 0.18s var(--ffl-ease);
}
.ffl-cta:hover { background: #FCFBF8; transform: translateY(-1px); }
.ffl-cta svg { color: var(--ffl-green); }
.ffl-cta-quiet { background: transparent; box-shadow: none; color: var(--ffl-soft); }
.ffl-cta-quiet:hover { background: rgba(255, 255, 255, 0.7); color: var(--ffl-ink); }

.ffl-intel { margin-top: 26px; max-width: 340px; }

/* ── Stage ── */
.ffl-stage { position: relative; height: 100%; min-height: 520px; }
.ffl-edges {
  position: absolute; inset: 0; width: 100%; height: 100%;
  pointer-events: none;
}
.ffl-edges path {
  fill: none;
  stroke: rgba(30, 30, 32, 0.13);
  stroke-width: 1;
  stroke-linecap: round;
  transition: stroke 0.4s var(--ffl-ease);
}
.ffl.is-focused .ffl-edges path { stroke: rgba(30, 30, 32, 0.07); }

.ffl-node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 6px;
  border: none;
  background: transparent;
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition:
    transform 0.45s var(--ffl-ease),
    opacity 0.35s var(--ffl-ease),
    filter 0.35s var(--ffl-ease);
}
.ffl-node-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #FFFFFF;
  border: 1px solid var(--ffl-line);
  box-shadow: 0 2px 10px rgba(20, 20, 20, 0.06);
  transition: box-shadow 0.35s var(--ffl-ease), transform 0.35s var(--ffl-ease);
}
.ffl-node.is-blue .ffl-node-orb { color: var(--ffl-blue); }
.ffl-node.is-red .ffl-node-orb { color: var(--ffl-red); }
.ffl-node.is-green .ffl-node-orb { color: var(--ffl-green); }
.ffl-node.is-ink .ffl-node-orb { color: #3A3A42; }

.ffl-node:hover .ffl-node-orb { transform: scale(1.06); }
.ffl-node.is-blue:hover .ffl-node-orb { box-shadow: 0 0 0 6px rgba(59, 111, 212, 0.09); }
.ffl-node.is-red:hover .ffl-node-orb { box-shadow: 0 0 0 6px rgba(196, 60, 60, 0.09); }
.ffl-node.is-green:hover .ffl-node-orb { box-shadow: 0 0 0 6px rgba(46, 155, 82, 0.09); }

.ffl-node-copy { display: flex; flex-direction: column; gap: 2px; text-align: left; }
.ffl-node-label { font-size: 17px; letter-spacing: -0.01em; }
.ffl-node-meta { font-size: 15px; color: var(--ffl-muted); }
.ffl-node-meta.is-red { color: var(--ffl-red); }
.ffl-node-meta.is-green { color: var(--ffl-green); }
.ffl-node-meta.is-blue { color: var(--ffl-blue); }

/* Focus — the chosen node lifts, the rest steps back. */
.ffl-node.is-focus {
  transform: translate(-50%, -50%) scale(1.12);
  z-index: 3;
}
.ffl-node.is-focus .ffl-node-orb {
  box-shadow: 0 8px 26px rgba(20, 20, 20, 0.12);
}
.ffl-node.is-dim { opacity: 0.34; filter: saturate(0.6); }

/* ── Detail ── */
.ffl-detail {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: clamp(16px, 2vw, 32px);
  border-left: 1px solid var(--ffl-line);
  max-height: calc(100dvh - var(--fas-topbar-h, 52px) - 96px);
  overflow-y: auto;
  scrollbar-width: none;
}
.ffl-detail::-webkit-scrollbar { display: none; }
.ffl-detail-head { display: flex; align-items: center; gap: 10px; }
.ffl-detail-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.ffl-detail-dot.is-red { background: var(--ffl-red); }
.ffl-detail-dot.is-green { background: var(--ffl-green); }
.ffl-detail-dot.is-blue { background: var(--ffl-blue); }
.ffl-detail-dot.is-ink { background: rgba(58, 58, 66, 0.5); }
.ffl-detail-title {
  margin: 0; font-size: 26px; font-weight: 400; letter-spacing: -0.022em;
}
.ffl-detail-count { margin: 0; font-size: 16px; color: var(--ffl-soft); }

.ffl-item {
  display: flex; flex-direction: column; gap: 7px;
  padding: 16px 0;
  border-top: 1px solid var(--ffl-line);
}
.ffl-item-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ffl-item-title { font-size: 17px; }
.ffl-item-body { margin: 0; font-size: 15px; line-height: 1.5; color: var(--ffl-soft); }
.ffl-item-foot {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 15px; color: var(--ffl-muted); margin-top: 2px;
}

.ffl-chip {
  padding: 3px 10px; border-radius: 5px; font-size: 14px; flex-shrink: 0;
}
.ffl-chip.is-high { background: rgba(196, 60, 60, 0.09); color: var(--ffl-red); }
.ffl-chip.is-mid { background: rgba(201, 147, 43, 0.11); color: #C9932B; }
.ffl-chip.is-quiet { background: rgba(15, 15, 18, 0.05); color: var(--ffl-soft); }

.ffl-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 11px 0; border-top: 1px solid var(--ffl-line);
}
.ffl-row-name { font-size: 16px; }
.ffl-row-meta { font-size: 15px; color: var(--ffl-muted); }

.ffl-empty, .ffl-hint {
  margin: 0; font-size: 16px; line-height: 1.55; color: var(--ffl-muted); max-width: 30ch;
}
.ffl-hint { align-self: center; }

@media (max-width: 1180px) {
  .ffl { grid-template-columns: 1fr; align-items: start; }
  .ffl-stage { min-height: 460px; }
  .ffl-detail { border-left: none; padding-left: 0; border-top: 1px solid var(--ffl-line); padding-top: 20px; max-height: none; }
}

html[data-theme="dark"] .ffl,
html[data-theme="classic-dark"] .ffl {
  background: #0C0D12;
  --ffl-ink: #F5F4F1;
  --ffl-soft: #B8B6B0;
  --ffl-line: rgba(255, 255, 255, 0.09);
}
html[data-theme="dark"] .ffl-node-orb,
html[data-theme="dark"] .ffl-cta,
html[data-theme="classic-dark"] .ffl-node-orb,
html[data-theme="classic-dark"] .ffl-cta {
  background: #1A1A1E;
  border-color: rgba(255, 255, 255, 0.10);
  color: #F5F4F1;
}

@media (prefers-reduced-motion: reduce) {
  .ffl-node, .ffl-node-orb, .ffl-cta { transition: none !important; }
}
`.trim()
