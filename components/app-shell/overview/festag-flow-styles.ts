/**
 * Overview — warm ivory canvas, no white stage plates.
 * White fills only on CTAs / active view chip. Hierarchy via type + space.
 */

import { FESTAG_SAND } from '@/lib/design-tokens/sand-read'

export const FESTAG_FLOW_STYLES = `
.ffl {
  --ffl-ink: #1E1E20;
  --ffl-soft: #5c5c62;
  --ffl-muted: #8891a0;
  --ffl-line: rgba(15, 15, 18, 0.08);
  --ffl-blue: #3B6FD4;
  --ffl-red: #C43C3C;
  --ffl-green: #2E9B52;
  --ffl-amber: #C9932B;
  --ffl-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --ffl-surface: transparent;
  --ffl-btn: #FFFFFF;
  --ffl-pad-x: clamp(24px, 4.5vw, 64px);

  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: clamp(24px, 3.5vw, 56px);
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: min(1180px, 100%);
  margin: 0 auto;
  box-sizing: border-box;
  min-height: calc(100dvh - var(--fas-topbar-h, 52px));
  padding:
    clamp(56px, 7vh, 80px)
    var(--ffl-pad-x)
    clamp(28px, 4vh, 56px);
  background: ${FESTAG_SAND.canvas};
  color: var(--ffl-ink);
  transition: grid-template-columns 0.42s var(--ffl-ease), max-width 0.42s var(--ffl-ease);
}
/* The detail column only exists once something is in focus — no reserved gap. */
.ffl.has-detail {
  max-width: min(1320px, 100%);
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 0.85fr);
}
.ffl.is-view-report,
.ffl.is-view-list {
  grid-template-columns: 1fr;
  justify-items: center;
  max-width: min(720px, 100%);
}

.ffl h1, .ffl h2, .ffl h3 {
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
}
.ffl h1.ffl-greet {
  font-family: 'Editors Note', Georgia, 'Times New Roman', serif;
  font-weight: 400;
}

/* ── View switch ── */
.ffl-views {
  position: absolute;
  top: clamp(16px, 2.4vh, 28px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: rgba(15, 15, 18, 0.045);
  z-index: 4;
}
.ffl-view {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 15px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--ffl-muted);
  font: inherit;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s var(--ffl-ease), color 0.2s var(--ffl-ease);
}
.ffl-view:hover { color: var(--ffl-soft); }
.ffl-view.is-on {
  background: var(--ffl-btn);
  color: var(--ffl-ink);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* ── Report column — Figma editorial read stack ── */
.ffl-report { min-width: 0; width: 100%; }
.ffl-report.is-centered {
  max-width: 62ch;
  width: 100%;
  text-align: left;
  animation: fflCenter 0.5s var(--ffl-ease) both;
}
@keyframes fflCenter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

.ffl-read {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 34ch;
  width: 100%;
}
.ffl-greet {
  margin: 0 0 22px;
  font-family: 'Editors Note', Georgia, 'Times New Roman', serif;
  font-weight: 400;
  font-style: normal;
  font-size: clamp(34px, 3.6vw, 48px);
  line-height: 1.12;
  letter-spacing: -0.018em;
  color: #2F3544;
}
.ffl-read-scroll {
  position: relative;
  width: 100%;
  max-height: min(38vh, 280px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(to bottom, #000 42%, transparent 96%);
  mask-image: linear-gradient(to bottom, #000 42%, transparent 96%);
}
.ffl-read-scroll::-webkit-scrollbar { display: none; }
.ffl-read-scroll.is-end {
  -webkit-mask-image: none;
  mask-image: none;
}
.ffl-read-body {
  margin: 0;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: clamp(16px, 1.35vw, 18.5px);
  line-height: 1.55;
  letter-spacing: -0.01em;
  color: #A7ADB8;
  max-width: 34ch;
}
.ffl-read-hint {
  margin: 18px 0 0;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: 12px;
  line-height: 1.3;
  letter-spacing: 0.01em;
  color: #C4C8D0;
  transition: opacity 0.25s var(--ffl-ease);
}
.ffl-read-hint.is-hidden {
  opacity: 0;
  pointer-events: none;
}
.ffl-line {
  margin: 0;
  font-size: 17px;
  line-height: 1.6;
  color: var(--ffl-soft);
  max-width: 34ch;
}

/* ── Sidequests — editorial facts, not KPIs ── */
.ffl-sq {
  margin-top: 36px;
  max-width: 36ch;
}
.ffl-sq-title {
  margin: 0 0 22px;
  font-size: 22px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--ffl-ink);
  text-align: left;
}
.ffl-sq-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.ffl-sq-item { margin: 0; }
.ffl-sq-line {
  margin: 0;
  font-size: 16.5px;
  line-height: 1.55;
  letter-spacing: -0.01em;
  color: #6B768E;
}
.ffl-sq-mention {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 2px;
  vertical-align: baseline;
}
.ffl-sq-mention strong {
  font-weight: 600;
  color: #3A4254;
  letter-spacing: -0.015em;
}
.ffl-sq-avatar {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  object-fit: cover;
  border: 1.5px solid #7BC9A6;
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}
.ffl-sq-avatar.is-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: #3A4254;
  background: rgba(123, 201, 166, 0.18);
  border-color: #7BC9A6;
}
.ffl-sq-action {
  display: inline-block;
  margin: 6px 0 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #A0A7B5;
  font: inherit;
  font-size: 13.5px;
  letter-spacing: -0.005em;
  cursor: pointer;
}
.ffl-sq-action:hover { color: var(--ffl-soft); }

.ffl-cta {
  display: inline-flex; align-items: center; gap: 9px;
  height: 46px; margin-top: 26px; padding: 0 20px;
  border-radius: 8px; background: var(--ffl-btn); color: var(--ffl-ink);
  border: 1px solid rgba(30, 30, 32, 0.10);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  font: inherit; font-size: 15px; cursor: pointer;
  transition: background 0.18s var(--ffl-ease), transform 0.18s var(--ffl-ease);
}
.ffl-cta:hover { background: #FCFBF8; transform: translateY(-1px); }
.ffl-cta svg { color: var(--ffl-green); }
.ffl-cta-quiet { background: transparent; box-shadow: none; color: var(--ffl-soft); }
.ffl-cta-quiet:hover { background: rgba(30, 30, 32, 0.04); color: var(--ffl-ink); }

/* ── Spoken report ── */
.ffl-play {
  display: inline-flex; align-items: center; gap: 9px;
  height: 42px; padding: 0 18px; margin-bottom: 30px;
  border-radius: 999px; background: var(--ffl-btn); color: var(--ffl-ink);
  border: 1px solid rgba(30, 30, 32, 0.10);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  font: inherit; font-size: 15px; cursor: pointer;
}
.ffl-play:hover { background: #FCFBF8; }
.ffl-play svg { color: var(--ffl-green); }

.ffl-lyric-lines { display: flex; flex-direction: column; gap: 18px; }
.ffl-lyric {
  margin: 0;
  font-size: clamp(22px, 2.5vw, 34px);
  line-height: 1.34;
  letter-spacing: -0.022em;
  color: rgba(30, 30, 32, 0.24);
  transition: color 0.5s var(--ffl-ease), transform 0.5s var(--ffl-ease);
}
.ffl-lyric.is-past { color: rgba(30, 30, 32, 0.3); }
.ffl-lyric.is-now { color: var(--ffl-ink); transform: translateX(3px); }

.ffl-inline { margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--ffl-line); }
.ffl-inline-k { margin: 0 0 12px; font-size: 15px; color: var(--ffl-muted); }
.ffl-inline-card {
  padding: 20px; border-radius: 12px; background: transparent;
  border: 1px solid var(--ffl-line); box-shadow: none;
}
.ffl-inline-title { margin: 0 0 16px; font-size: 19px; line-height: 1.35; }
.ffl-inline-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.ffl-inline-error { margin: 12px 0 0; font-size: 15px; color: var(--ffl-red); }

.ffl-btn-primary, .ffl-btn-quiet {
  height: 44px; padding: 0 18px; border-radius: 8px;
  font: inherit; font-size: 15px; cursor: pointer;
}
.ffl-btn-primary {
  background: var(--ffl-btn); color: var(--ffl-ink);
  border: 1px solid rgba(30, 30, 32, 0.10);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.ffl-btn-primary:hover:not(:disabled) { background: #FCFBF8; }
.ffl-btn-primary:disabled { opacity: 0.5; cursor: default; }
.ffl-btn-quiet { background: transparent; color: var(--ffl-soft); border: 1px solid var(--ffl-line); }
.ffl-btn-quiet:hover { color: var(--ffl-ink); }

/* ── List ── */
.ffl-list {
  width: 100%; max-width: 62ch;
  display: flex; flex-direction: column;
  animation: fflCenter 0.45s var(--ffl-ease) both;
}
.ffl-lrow {
  display: flex; align-items: center; gap: 14px;
  width: 100%; padding: 20px 4px;
  border: none; border-bottom: 1px solid var(--ffl-line);
  background: transparent; font: inherit; text-align: left;
}
.ffl-lrow.is-action { cursor: pointer; }
.ffl-lrow.is-action:hover { background: rgba(30, 30, 32, 0.035); }
.ffl-lrow-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ffl-lrow-dot.is-red { background: var(--ffl-red); }
.ffl-lrow-dot.is-green { background: var(--ffl-green); }
.ffl-lrow-dot.is-blue { background: var(--ffl-blue); }
.ffl-lrow-dot.is-ink { background: rgba(58, 58, 66, 0.35); }
.ffl-lrow-v { font-size: 22px; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; min-width: 2.2ch; }
.ffl-lrow-l { flex: 1; font-size: 17px; color: var(--ffl-soft); }
.ffl-lrow svg { color: var(--ffl-muted); }

/* ── Stage ── */
.ffl-stage { position: relative; height: 100%; min-height: 620px; width: 100%; }
.ffl-edges { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.ffl-edges path {
  fill: none; stroke: rgba(30, 30, 32, 0.11); stroke-width: 1.1; stroke-linecap: round;
  transition: stroke 0.4s var(--ffl-ease);
}
.ffl.has-detail .ffl-edges path { stroke: rgba(30, 30, 32, 0.06); }

.ffl-node {
  position: absolute; transform: translate(-50%, -50%);
  display: flex; align-items: center; gap: 14px;
  padding: 4px; border: none; background: transparent;
  font: inherit; cursor: pointer; white-space: nowrap;
  transition: transform 0.45s var(--ffl-ease), opacity 0.35s var(--ffl-ease), filter 0.35s var(--ffl-ease);
}
.ffl-node-orb {
  display: flex; align-items: center; justify-content: center;
  width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
  background: transparent;
  border: 1.5px solid rgba(30, 30, 32, 0.12);
  box-shadow: none;
  transition: box-shadow 0.35s var(--ffl-ease), transform 0.35s var(--ffl-ease), border-color 0.35s var(--ffl-ease);
}
.ffl-node.is-blue .ffl-node-orb { color: var(--ffl-blue); }
.ffl-node.is-red .ffl-node-orb { color: var(--ffl-red); }
.ffl-node.is-green .ffl-node-orb { color: var(--ffl-green); }
.ffl-node.is-ink .ffl-node-orb { color: #2C2C32; }
.ffl-node:hover .ffl-node-orb { transform: scale(1.05); border-color: rgba(30, 30, 32, 0.2); }
.ffl-node.is-blue:hover .ffl-node-orb { box-shadow: 0 0 0 6px rgba(59, 111, 212, 0.08); }
.ffl-node.is-red:hover .ffl-node-orb { box-shadow: 0 0 0 6px rgba(196, 60, 60, 0.08); }
.ffl-node.is-green:hover .ffl-node-orb { box-shadow: 0 0 0 6px rgba(46, 155, 82, 0.08); }

.ffl-node-copy { display: flex; flex-direction: column; gap: 3px; text-align: left; }
.ffl-node-label { font-size: 16.5px; letter-spacing: -0.012em; color: var(--ffl-ink); }
.ffl-node-meta { font-size: 14.5px; color: var(--ffl-muted); letter-spacing: -0.005em; }
.ffl-node-meta.is-red { color: var(--ffl-red); }
.ffl-node-meta.is-green { color: var(--ffl-green); }
.ffl-node-meta.is-blue { color: var(--ffl-blue); }

.ffl-node.is-focus { transform: translate(-50%, -50%) scale(1.12); z-index: 3; }
.ffl-node.is-focus .ffl-node-orb {
  border-color: rgba(30, 30, 32, 0.22);
  box-shadow: 0 0 0 6px rgba(30, 30, 32, 0.04);
}
.ffl-node.is-dim { opacity: 0.34; filter: saturate(0.6); }

/* ── Detail ── */
.ffl-detail {
  position: relative;
  align-self: stretch;
  display: flex; flex-direction: column; gap: 12px;
  padding: 4px 0 4px clamp(16px, 2vw, 30px);
  border-left: 1px solid var(--ffl-line);
  max-height: calc(100dvh - var(--fas-topbar-h, 52px) - 110px);
  overflow-y: auto; scrollbar-width: none;
  animation: fflDetailIn 0.42s var(--ffl-ease) both;
}
.ffl-detail::-webkit-scrollbar { display: none; }
@keyframes fflDetailIn {
  from { opacity: 0; transform: translateX(14px); }
  to { opacity: 1; transform: none; }
}
.ffl-detail-close {
  position: absolute; top: 0; right: 0;
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--ffl-line); background: var(--ffl-btn);
  color: var(--ffl-muted); cursor: pointer;
}
.ffl-detail-close:hover { color: var(--ffl-ink); background: #FCFBF8; }

.ffl-detail-head { display: flex; align-items: center; gap: 10px; padding-right: 40px; }
.ffl-detail-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.ffl-detail-dot.is-red { background: var(--ffl-red); }
.ffl-detail-dot.is-green { background: var(--ffl-green); }
.ffl-detail-dot.is-blue { background: var(--ffl-blue); }
.ffl-detail-dot.is-ink { background: rgba(58, 58, 66, 0.5); }
.ffl-detail-title { margin: 0; font-size: 26px; letter-spacing: -0.022em; }

.ffl-item { display: flex; flex-direction: column; gap: 7px; padding: 16px 0; border-top: 1px solid var(--ffl-line); }
.ffl-item-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ffl-item-title { font-size: 17px; }
.ffl-item-body { margin: 0; font-size: 15px; line-height: 1.5; color: var(--ffl-soft); }
.ffl-item-foot { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; color: var(--ffl-muted); }

.ffl-chip { padding: 3px 10px; border-radius: 5px; font-size: 14px; flex-shrink: 0; }
.ffl-chip.is-high { background: rgba(196, 60, 60, 0.09); color: var(--ffl-red); }
.ffl-chip.is-mid { background: rgba(201, 147, 43, 0.11); color: var(--ffl-amber); }
.ffl-chip.is-quiet { background: rgba(15, 15, 18, 0.05); color: var(--ffl-soft); }

.ffl-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 11px 0; border-top: 1px solid var(--ffl-line);
}
.ffl-row-name { font-size: 16px; }
.ffl-row-meta { font-size: 15px; color: var(--ffl-muted); }
.ffl-empty { margin: 0; font-size: 16px; line-height: 1.55; color: var(--ffl-muted); max-width: 30ch; }

@media (max-width: 1180px) {
  .ffl, .ffl.has-detail {
    grid-template-columns: 1fr;
    align-items: start;
    max-width: min(720px, 100%);
    gap: 28px;
  }
  .ffl-stage { min-height: 440px; }
  .ffl-detail {
    border-left: none; padding-left: 0;
    border-top: 1px solid var(--ffl-line); padding-top: 20px; max-height: none;
  }
}

@media (max-width: 900px) {
  .ffl {
    --ffl-pad-x: 20px;
    padding-top: 64px;
  }
  .ffl-greet { font-size: clamp(28px, 7vw, 36px); }
  .ffl-stage { min-height: 400px; }
}

html[data-theme="dark"] .ffl,
html[data-theme="classic-dark"] .ffl {
  background: #0C0D12;
  --ffl-ink: #F5F4F1; --ffl-soft: #B8B6B0; --ffl-line: rgba(255, 255, 255, 0.09);
}
html[data-theme="dark"] .ffl-node-orb,
html[data-theme="dark"] .ffl-cta,
html[data-theme="dark"] .ffl-play,
html[data-theme="dark"] .ffl-view.is-on,
html[data-theme="classic-dark"] .ffl-node-orb,
html[data-theme="classic-dark"] .ffl-cta,
html[data-theme="classic-dark"] .ffl-play,
html[data-theme="classic-dark"] .ffl-view.is-on {
  background: #1A1A1E; border-color: rgba(255, 255, 255, 0.10); color: #F5F4F1;
}
html[data-theme="dark"] .ffl-lyric,
html[data-theme="classic-dark"] .ffl-lyric { color: rgba(245, 244, 241, 0.26); }
html[data-theme="dark"] .ffl-lyric.is-now,
html[data-theme="classic-dark"] .ffl-lyric.is-now { color: #F5F4F1; }

@media (prefers-reduced-motion: reduce) {
  .ffl, .ffl-node, .ffl-node-orb, .ffl-cta, .ffl-detail, .ffl-lyric, .ffl-report {
    transition: none !important; animation: none !important;
  }
}
`.trim()
