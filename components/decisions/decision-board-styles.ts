/**
 * Decisions board — the visual law for /decisions.
 *
 * Built to the supplied FESTAG reference: warm cream canvas, editorial serif
 * headline and decision titles, muted blue-gray secondary text, hairline
 * separators instead of cards, and a fixed action column whose buttons are
 * identical in width and height regardless of label length.
 *
 * Layout is a CSS grid with a fixed action column, so the board reflows with
 * the shell instead of scrolling sideways. No card surfaces, no badges, no
 * charts — the calm is the design.
 */

export const DECISION_BOARD_CSS = `
.dcb {
  --dcb-canvas: #FAF7F2;
  --dcb-ink: #1B2233;
  --dcb-soft: #5A6274;
  --dcb-muted: #8A93A5;
  --dcb-faint: #A8AFBD;
  --dcb-line: rgba(27, 34, 51, 0.09);
  --dcb-hair: rgba(27, 34, 51, 0.06);
  --dcb-red: #A8434A;
  --dcb-green: #4A7A5C;
  --dcb-navy: #16202F;
  --dcb-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --dcb-action-w: 192px;

  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  box-sizing: border-box;
  /* Left padding clears the expanded floating sidebar; the shell overlays it. */
  padding: clamp(28px, 4.5vh, 52px) clamp(24px, 3vw, 48px) clamp(72px, 12vh, 120px);
  color: var(--dcb-ink);
  font-family: var(--font-ui, 'Aeonik', system-ui, sans-serif);
  font-weight: 400;
}

/* ── Header row: headline left, controls right ── */
.dcb-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: clamp(24px, 4vh, 40px);
}
/* Sized so each clause holds one line on desktop — the sentence is the design,
   a mid-clause wrap breaks it. */
.dcb-h1 {
  margin: 0;
  max-width: min(880px, 100%);
  font-family: var(--font-editorial, 'Editors Note', Georgia, serif);
  font-weight: 400;
  font-size: clamp(21px, 1.95vw, 28px);
  line-height: 1.36;
  letter-spacing: -0.008em;
  color: var(--dcb-ink);
  text-wrap: balance;
}
.dcb-h1-line { display: block; }
.dcb-h1-muted { color: var(--dcb-faint); }

.dcb-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 4px;
}
.dcb-tool {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 15px;
  border: 1px solid var(--dcb-line);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.62);
  color: var(--dcb-soft);
  font-family: inherit;
  font-size: 13.5px;
  letter-spacing: 0.004em;
  cursor: pointer;
  transition: background 0.16s var(--dcb-ease), color 0.16s var(--dcb-ease), border-color 0.16s var(--dcb-ease);
}
.dcb-tool:hover { background: #FFFFFF; color: var(--dcb-ink); }
.dcb-tool.is-on { border-color: rgba(27, 34, 51, 0.24); color: var(--dcb-ink); }
.dcb-tool--icon { width: 38px; padding: 0; justify-content: center; }
.dcb-tool-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 17px; height: 17px; padding: 0 5px;
  border-radius: 5px;
  background: var(--dcb-navy); color: #FFF;
  font-size: 11px; line-height: 1;
}

/* ── Section labels ── */
.dcb-label {
  margin: 0 0 14px;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--dcb-muted);
}
.dcb-rule { height: 1px; background: var(--dcb-line); margin: 0 0 4px; }

/* ── Decision row ── */
.dcb-row {
  display: grid;
  grid-template-columns: 30px 52px minmax(210px, 1.15fr) minmax(250px, 1.35fr) minmax(170px, 0.8fr) var(--dcb-action-w);
  align-items: start;
  gap: 0 24px;
  padding: 30px 0 32px;
  border-bottom: 1px solid var(--dcb-hair);
  animation: dcbIn 0.4s var(--dcb-ease) both;
}
.dcb-row:last-child { border-bottom: none; }
@keyframes dcbIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

/* Resolving: the row leaves to the left, the list closes behind it. */
.dcb-row.is-resolving {
  animation: dcbOut 0.42s var(--dcb-ease) forwards;
  pointer-events: none;
}
@keyframes dcbOut {
  to { opacity: 0; transform: translateX(-26px); }
}

.dcb-num {
  margin: 0;
  padding-top: 15px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--dcb-faint);
  letter-spacing: 0.02em;
}

.dcb-icon {
  width: 52px; height: 52px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--dcb-line);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.5);
  color: var(--dcb-soft);
  margin-top: 4px;
}

.dcb-title {
  margin: 0 0 7px;
  font-family: var(--font-editorial, 'Editors Note', Georgia, serif);
  font-weight: 400;
  font-size: 19.5px;
  line-height: 1.32;
  letter-spacing: -0.004em;
  color: var(--dcb-ink);
  padding-top: 6px;
}
.dcb-project {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--dcb-muted);
}
.dcb-state {
  margin: 9px 0 0;
  font-size: 12.5px;
  color: var(--dcb-soft);
}
.dcb-state.is-red { color: var(--dcb-red); }

/* ── Tagro recommendation column ── */
.dcb-rec { padding-top: 6px; min-width: 0; }
.dcb-rec-label {
  margin: 0 0 8px;
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--dcb-muted);
}
.dcb-rec-name {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 9px;
  font-family: var(--font-editorial, 'Editors Note', Georgia, serif);
  font-weight: 400;
  font-size: 21px;
  line-height: 1.25;
  letter-spacing: -0.006em;
  color: var(--dcb-ink);
}
.dcb-rec-why {
  margin: 0;
  max-width: 40ch;
  font-size: 13.5px;
  line-height: 1.62;
  color: var(--dcb-soft);
}
.dcb-rec-none {
  margin: 0;
  max-width: 40ch;
  font-size: 13.5px;
  line-height: 1.62;
  color: var(--dcb-muted);
}

/* ── Meta column ── */
.dcb-meta {
  padding-top: 6px;
  padding-left: 26px;
  border-left: 1px solid var(--dcb-hair);
  min-height: 74px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.dcb-meta-time {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  color: var(--dcb-soft);
}
.dcb-meta-key {
  margin: 0 0 3px;
  font-size: 12.5px;
  color: var(--dcb-muted);
}
.dcb-meta-val {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--dcb-ink);
}
.dcb-meta-val.is-red { color: var(--dcb-red); }

/* ── Action column: fixed width, identical buttons ── */
.dcb-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: var(--dcb-action-w);
  padding-top: 4px;
}
.dcb-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  height: 40px;
  padding: 0 16px;
  border: 1px solid var(--dcb-line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.55);
  color: var(--dcb-soft);
  font-family: inherit;
  font-weight: 400;
  font-size: 13.5px;
  letter-spacing: 0.004em;
  cursor: pointer;
  transition: background 0.16s var(--dcb-ease), border-color 0.16s var(--dcb-ease), color 0.16s var(--dcb-ease), opacity 0.16s var(--dcb-ease);
}
.dcb-btn:hover:not(:disabled) { background: #FFFFFF; color: var(--dcb-ink); }
.dcb-btn:focus-visible { outline: 2px solid rgba(27, 34, 51, 0.35); outline-offset: 2px; }
.dcb-btn:disabled { opacity: 0.5; cursor: default; }
.dcb-btn--primary {
  background: var(--dcb-navy);
  border-color: var(--dcb-navy);
  color: #FFFFFF;
}
.dcb-btn--primary:hover:not(:disabled) { background: #0D1622; border-color: #0D1622; color: #FFFFFF; }
/* The arrow sits at the right edge without shifting the centred label. */
.dcb-btn-arrow {
  position: absolute;
  right: 14px;
  display: inline-flex;
  transition: transform 0.2s var(--dcb-ease);
}
.dcb-btn--primary:hover:not(:disabled) .dcb-btn-arrow { transform: translateX(2px); }

/* ── Automatic decisions footer ── */
.dcb-auto { margin-top: clamp(30px, 5vh, 46px); }
.dcb-auto-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 4px 0;
  font-size: 13.5px;
  color: var(--dcb-soft);
}
.dcb-auto-check {
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(74, 122, 92, 0.35);
  color: var(--dcb-green);
  flex-shrink: 0;
}
.dcb-auto-link {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--dcb-soft);
  cursor: pointer;
}
.dcb-auto-link:hover { color: var(--dcb-ink); }
.dcb-auto-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 11px;
  animation: dcbIn 0.3s var(--dcb-ease) both;
}
.dcb-auto-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--dcb-muted);
  min-width: 0;
}
.dcb-auto-item-title { color: var(--dcb-ink); }
.dcb-auto-item button {
  appearance: none; border: none; background: transparent; padding: 0;
  font: inherit; color: var(--dcb-soft); cursor: pointer; text-align: left;
}
.dcb-auto-item button:hover { color: var(--dcb-ink); }

/* ── States ── */
.dcb-empty { padding: clamp(40px, 8vh, 76px) 0; max-width: 44ch; }
.dcb-empty-title {
  margin: 0 0 10px;
  font-family: var(--font-editorial, 'Editors Note', Georgia, serif);
  font-weight: 400;
  font-size: 24px;
  line-height: 1.35;
  color: var(--dcb-ink);
}
.dcb-empty-copy { margin: 0; font-size: 14.5px; line-height: 1.65; color: var(--dcb-muted); }

.dcb-skeleton { padding: 30px 0 32px; border-bottom: 1px solid var(--dcb-hair); }
.dcb-skeleton-bar {
  height: 13px;
  border-radius: 4px;
  background: rgba(27, 34, 51, 0.055);
  animation: dcbPulse 1.5s ease-in-out infinite;
}
.dcb-skeleton-bar + .dcb-skeleton-bar { margin-top: 11px; }
@keyframes dcbPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

.dcb-error {
  margin: 16px 0 0;
  display: flex; align-items: center; gap: 12px;
  font-size: 13.5px; color: var(--dcb-red);
}
.dcb-error button {
  appearance: none; border: 1px solid var(--dcb-line); border-radius: 7px;
  background: transparent; height: 30px; padding: 0 12px;
  font: inherit; font-size: 13px; color: var(--dcb-soft); cursor: pointer;
}
.dcb-error button:hover { color: var(--dcb-ink); }

/* A resolved decision confirms once, quietly, then the row leaves. */
.dcb-toast {
  position: fixed;
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  z-index: 90;
  display: flex; align-items: center; gap: 10px;
  padding: 11px 18px;
  border-radius: 10px;
  background: var(--dcb-navy);
  color: #F2F4F7;
  font-size: 13.5px;
  letter-spacing: 0.004em;
  box-shadow: 0 12px 34px rgba(15, 20, 30, 0.28);
  animation: dcbToast 0.32s var(--dcb-ease) both;
}
@keyframes dcbToast {
  from { opacity: 0; transform: translate(-50%, 8px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
.dcb-toast-sub { color: rgba(242, 244, 247, 0.62); }

/* ── Brand marks — always subordinate to the text ──
   Desaturated by default: a single full-colour vendor logo would be the only
   saturated pixel on a warm monochrome page and would out-shout the decision
   it belongs to. Colour returns on hover, when the row has the user's focus. */
.dbm { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; }
.dbm-img {
  width: 15px; height: 15px;
  object-fit: contain;
  display: block;
  filter: grayscale(1);
  opacity: 0.5;
  transition: filter 0.2s var(--dcb-ease), opacity 0.2s var(--dcb-ease);
}
.dcb-row:hover .dbm-img,
.drs-option:hover .dbm-img { filter: none; opacity: 0.95; }
html[data-theme="dark"] .dbm-img,
html[data-theme="classic-dark"] .dbm-img { opacity: 0.62; }

/* ── Tablet ── */
@media (max-width: 1180px) {
  .dcb { --dcb-action-w: 176px; }
  .dcb-row { grid-template-columns: 26px 48px minmax(160px, 1fr) minmax(200px, 1.35fr) var(--dcb-action-w); gap: 0 20px; }
  /* Meta folds under the recommendation rather than squeezing to nothing. */
  .dcb-meta {
    grid-column: 4 / 5;
    border-left: none;
    padding-left: 0;
    padding-top: 16px;
    min-height: 0;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px 26px;
  }
}

/* ── Mobile: deliberate vertical flow, not a squeezed table ── */
@media (max-width: 760px) {
  .dcb {
    --dcb-action-w: 100%;
    padding: 22px 18px 96px;
  }
  .dcb-top { flex-direction: column; align-items: stretch; gap: 18px; margin-bottom: 26px; }
  .dcb-h1 { max-width: none; font-size: 25px; line-height: 1.34; }
  .dcb-tools { padding-top: 0; }
  .dcb-tool { flex: 1 1 auto; justify-content: center; }
  .dcb-tool--icon { flex: 0 0 42px; }

  .dcb-row {
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 0 14px;
    padding: 26px 0 28px;
  }
  .dcb-num { grid-column: 1 / 2; padding-top: 0; }
  .dcb-icon { display: none; }
  .dcb-head-m { grid-column: 2 / 3; }
  .dcb-title { padding-top: 0; font-size: 20px; }
  .dcb-rec { grid-column: 1 / 3; padding-top: 20px; }
  .dcb-rec-why, .dcb-rec-none { max-width: none; }
  .dcb-meta {
    grid-column: 1 / 3;
    border-left: none;
    padding: 18px 0 0;
    min-height: 0;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px 28px;
  }
  .dcb-actions { grid-column: 1 / 3; width: 100%; padding-top: 22px; gap: 9px; }
  .dcb-btn { height: 46px; font-size: 14.5px; }
  .dcb-toast { left: 16px; right: 16px; bottom: 20px; transform: none; justify-content: center; }
  @keyframes dcbToast { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
}

/* ── Festag Night ── */
html[data-theme="dark"] .dcb,
html[data-theme="classic-dark"] .dcb {
  --dcb-canvas: #0C0D12;
  --dcb-ink: #E8EAF0;
  --dcb-soft: #A9B0BF;
  --dcb-muted: #838B9C;
  --dcb-faint: #6B7385;
  --dcb-line: rgba(255, 255, 255, 0.09);
  --dcb-hair: rgba(255, 255, 255, 0.06);
  --dcb-red: #E0787E;
  --dcb-green: #78B090;
  --dcb-navy: #F0F2F5;
}
html[data-theme="dark"] .dcb-tool,
html[data-theme="classic-dark"] .dcb-tool,
html[data-theme="dark"] .dcb-btn,
html[data-theme="classic-dark"] .dcb-btn,
html[data-theme="dark"] .dcb-icon,
html[data-theme="classic-dark"] .dcb-icon { background: rgba(255, 255, 255, 0.04); }
html[data-theme="dark"] .dcb-tool:hover,
html[data-theme="classic-dark"] .dcb-tool:hover,
html[data-theme="dark"] .dcb-btn:hover:not(:disabled),
html[data-theme="classic-dark"] .dcb-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.08); color: var(--dcb-ink); }
/* Dark primary is soft cool-white on dark ink — never a colored fill. */
html[data-theme="dark"] .dcb-btn--primary,
html[data-theme="classic-dark"] .dcb-btn--primary {
  background: #F0F2F5; border-color: #F0F2F5; color: #1A1A1E;
}
html[data-theme="dark"] .dcb-btn--primary:hover:not(:disabled),
html[data-theme="classic-dark"] .dcb-btn--primary:hover:not(:disabled) {
  background: #FFFFFF; border-color: #FFFFFF; color: #1A1A1E;
}
html[data-theme="dark"] .dcb-tool-count,
html[data-theme="classic-dark"] .dcb-tool-count { background: #F0F2F5; color: #1A1A1E; }
html[data-theme="dark"] .dcb-toast,
html[data-theme="classic-dark"] .dcb-toast { background: #1A1A1E; color: #E8EAF0; }
html[data-theme="dark"] .dcb-toast-sub,
html[data-theme="classic-dark"] .dcb-toast-sub { color: rgba(232, 234, 240, 0.55); }
html[data-theme="dark"] .dbm-mono,
html[data-theme="classic-dark"] .dbm-mono { background: rgba(255, 255, 255, 0.09); }
html[data-theme="dark"] .dcb-skeleton-bar,
html[data-theme="classic-dark"] .dcb-skeleton-bar { background: rgba(255, 255, 255, 0.06); }

@media (prefers-reduced-motion: reduce) {
  .dcb-row, .dcb-auto-list, .dcb-toast { animation: none !important; }
  .dcb-row.is-resolving { animation: none !important; opacity: 0; }
  .dcb-btn-arrow { transition: none !important; }
}
`.trim()

/**
 * The focused resolve surface + filter popover.
 *
 * Steps move horizontally: the current one leaves left, the next enters from
 * the right. That is the only place spatial motion is used here — it says
 * "deeper into this decision", not "look, an animation".
 */
export const DECISION_SHEET_CSS = `
.drs-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(20, 22, 28, 0.32);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  animation: drsFade 0.2s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes drsFade { from { opacity: 0; } to { opacity: 1; } }

.drs-panel {
  position: relative;
  width: min(468px, 100%);
  max-height: min(82vh, 720px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 30px 30px 26px;
  border-radius: 16px;
  background: #FDFBF7;
  border: 1px solid rgba(27, 34, 51, 0.08);
  box-shadow: 0 24px 64px rgba(15, 20, 30, 0.2), 0 2px 6px rgba(15, 20, 30, 0.05);
  font-family: var(--font-ui, 'Aeonik', system-ui, sans-serif);
  color: #1B2233;
  animation: drsEnter 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes drsEnter {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to   { opacity: 1; transform: none; }
}
.drs-panel:focus { outline: none; }
/* Held in place (state is preserved) but out of sight while the guided-setup
   modal owns the screen. */
.drs-panel.is-behind { opacity: 0; pointer-events: none; }

/* Each step arrives from the right — the spatial "one level deeper" cue. */
.drs-step { animation: drsStep 0.26s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes drsStep {
  from { opacity: 0; transform: translateX(18px); }
  to   { opacity: 1; transform: none; }
}

.drs-close {
  position: absolute; top: 16px; right: 16px;
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 7px;
  background: transparent; color: #8A93A5; cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease;
}
.drs-close:hover { background: rgba(27, 34, 51, 0.05); color: #1B2233; }

.drs-back {
  appearance: none; border: none; background: transparent; padding: 0;
  display: inline-flex; align-items: center; gap: 6px;
  margin: 0 0 16px;
  font: inherit; font-size: 13px; color: #8A93A5; cursor: pointer;
}
.drs-back:hover { color: #1B2233; }

.drs-kicker {
  margin: 0 0 10px;
  font-size: 11px; letter-spacing: 0.11em; text-transform: uppercase;
  color: #8A93A5;
}
.drs-title {
  margin: 0 0 12px;
  font-family: var(--font-editorial, 'Editors Note', Georgia, serif);
  font-weight: 400; font-size: 23px; line-height: 1.3;
  letter-spacing: -0.006em; color: #1B2233;
}
.drs-lead { margin: 0 0 10px; font-size: 14.5px; line-height: 1.6; color: #5A6274; }
.drs-em { color: #1B2233; }
.drs-body { margin: 0 0 10px; font-size: 13.5px; line-height: 1.62; color: #8A93A5; }
.drs-consequence {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-radius: 9px;
  background: rgba(27, 34, 51, 0.04);
  font-size: 13.5px; line-height: 1.55; color: #5A6274;
}

.drs-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 24px; }
.drs-btn {
  appearance: none;
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  width: 100%; height: 42px; padding: 0 18px;
  border: 1px solid rgba(27, 34, 51, 0.1);
  border-radius: 9px;
  background: transparent; color: #5A6274;
  font-family: inherit; font-weight: 400; font-size: 14px;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease, opacity 0.16s ease;
}
.drs-btn:hover:not(:disabled) { background: rgba(27, 34, 51, 0.045); color: #1B2233; }
.drs-btn:disabled { opacity: 0.5; cursor: default; }
.drs-btn--primary { background: #16202F; border-color: #16202F; color: #FFF; }
.drs-btn--primary:hover:not(:disabled) { background: #0D1622; border-color: #0D1622; color: #FFF; }
.drs-btn-arrow { position: absolute; right: 16px; }

.drs-options { list-style: none; margin: 18px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.drs-option {
  appearance: none;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  width: 100%; padding: 14px 15px;
  border: 1px solid rgba(27, 34, 51, 0.09);
  border-radius: 11px;
  background: transparent; text-align: left; cursor: pointer;
  font-family: inherit;
  transition: background 0.16s ease, border-color 0.16s ease;
}
.drs-option:hover { background: rgba(27, 34, 51, 0.035); }
.drs-option.is-picked { border-color: rgba(27, 34, 51, 0.28); }
.drs-option-main { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.drs-option-name {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 15px; color: #1B2233;
}
.drs-option-rec {
  font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: #8A93A5;
}
.drs-option-desc { font-size: 13px; line-height: 1.55; color: #8A93A5; }
.drs-option-check { color: #1B2233; flex-shrink: 0; margin-top: 3px; }

.drs-reasons { display: flex; flex-wrap: wrap; gap: 7px; margin: 18px 0 14px; }
.drs-reason {
  appearance: none; height: 34px; padding: 0 13px;
  border: 1px solid rgba(27, 34, 51, 0.1); border-radius: 8px;
  background: transparent; color: #5A6274;
  font-family: inherit; font-size: 13px; cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
}
.drs-reason:hover { background: rgba(27, 34, 51, 0.04); }
.drs-reason.is-on { background: #16202F; border-color: #16202F; color: #FFF; }

.drs-note {
  width: 100%; box-sizing: border-box; resize: vertical;
  padding: 12px 13px;
  border: 1px solid rgba(27, 34, 51, 0.1); border-radius: 9px;
  background: transparent; color: #1B2233;
  font-family: inherit; font-size: 14px; line-height: 1.55;
}
.drs-note::placeholder { color: #A8AFBD; }
.drs-note:focus { outline: none; border-color: rgba(27, 34, 51, 0.28); }

.drs-error {
  margin: 16px 0 0;
  display: flex; align-items: center; flex-wrap: wrap; gap: 10px;
  font-size: 13px; color: #A8434A;
}
.drs-error button {
  appearance: none; height: 30px; padding: 0 11px;
  border: 1px solid rgba(27, 34, 51, 0.12); border-radius: 7px;
  background: transparent; font: inherit; font-size: 12.5px; color: #5A6274; cursor: pointer;
}

/* ── Filter popover ── */
.dcf-overlay { position: fixed; inset: 0; z-index: 110; }
.dcf-pop {
  position: absolute;
  width: min(300px, calc(100vw - 32px));
  padding: 16px;
  border-radius: 13px;
  background: #FDFBF7;
  border: 1px solid rgba(27, 34, 51, 0.08);
  box-shadow: 0 18px 48px rgba(15, 20, 30, 0.16), 0 1px 3px rgba(15, 20, 30, 0.05);
  font-family: var(--font-ui, 'Aeonik', system-ui, sans-serif);
  color: #1B2233;
  animation: drsEnter 0.2s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.dcf-group + .dcf-group { margin-top: 16px; }
.dcf-group-label {
  margin: 0 0 8px;
  font-size: 10.5px; letter-spacing: 0.11em; text-transform: uppercase; color: #8A93A5;
}
.dcf-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dcf-chip {
  appearance: none; height: 30px; padding: 0 11px;
  border: 1px solid rgba(27, 34, 51, 0.1); border-radius: 7px;
  background: transparent; color: #5A6274;
  font-family: inherit; font-size: 12.5px; cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dcf-chip:hover { background: rgba(27, 34, 51, 0.04); }
.dcf-chip.is-on { background: #16202F; border-color: #16202F; color: #FFF; }
.dcf-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-top: 18px; padding-top: 14px;
  border-top: 1px solid rgba(27, 34, 51, 0.07);
}
.dcf-clear {
  appearance: none; border: none; background: transparent; padding: 0;
  font: inherit; font-size: 12.5px; color: #8A93A5; cursor: pointer;
}
.dcf-clear:hover { color: #1B2233; }
.dcf-done {
  appearance: none; height: 32px; padding: 0 14px;
  border: 1px solid #16202F; border-radius: 8px;
  background: #16202F; color: #FFF;
  font: inherit; font-size: 12.5px; cursor: pointer;
}

@media (max-width: 760px) {
  .drs-overlay { align-items: flex-end; padding: 0; }
  .drs-panel {
    width: 100%;
    max-height: 88vh;
    border-radius: 18px 18px 0 0;
    padding: 26px 20px calc(24px + env(safe-area-inset-bottom, 0px));
    animation: drsSheet 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes drsSheet { from { transform: translateY(100%); } to { transform: none; } }
  .drs-btn { height: 46px; font-size: 14.5px; }
  .dcf-pop { position: fixed; left: 16px; right: 16px; bottom: 16px; top: auto; width: auto; }
}

html[data-theme="dark"] .drs-panel,
html[data-theme="classic-dark"] .drs-panel,
html[data-theme="dark"] .dcf-pop,
html[data-theme="classic-dark"] .dcf-pop {
  background: #1A1A1E;
  border-color: rgba(255, 255, 255, 0.08);
  color: #E8EAF0;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}
html[data-theme="dark"] .drs-title,
html[data-theme="classic-dark"] .drs-title,
html[data-theme="dark"] .drs-em,
html[data-theme="classic-dark"] .drs-em,
html[data-theme="dark"] .drs-option-name,
html[data-theme="classic-dark"] .drs-option-name,
html[data-theme="dark"] .drs-note,
html[data-theme="classic-dark"] .drs-note { color: #E8EAF0; }
html[data-theme="dark"] .drs-lead,
html[data-theme="classic-dark"] .drs-lead,
html[data-theme="dark"] .drs-consequence,
html[data-theme="classic-dark"] .drs-consequence { color: #A9B0BF; }
html[data-theme="dark"] .drs-consequence,
html[data-theme="classic-dark"] .drs-consequence { background: rgba(255, 255, 255, 0.05); }
html[data-theme="dark"] .drs-btn,
html[data-theme="classic-dark"] .drs-btn,
html[data-theme="dark"] .drs-option,
html[data-theme="classic-dark"] .drs-option,
html[data-theme="dark"] .drs-reason,
html[data-theme="classic-dark"] .drs-reason,
html[data-theme="dark"] .dcf-chip,
html[data-theme="classic-dark"] .dcf-chip,
html[data-theme="dark"] .drs-note,
html[data-theme="classic-dark"] .drs-note { border-color: rgba(255, 255, 255, 0.1); color: #A9B0BF; }
html[data-theme="dark"] .drs-btn:hover:not(:disabled),
html[data-theme="classic-dark"] .drs-btn:hover:not(:disabled),
html[data-theme="dark"] .drs-option:hover,
html[data-theme="classic-dark"] .drs-option:hover,
html[data-theme="dark"] .dcf-chip:hover,
html[data-theme="classic-dark"] .dcf-chip:hover { background: rgba(255, 255, 255, 0.06); color: #E8EAF0; }
html[data-theme="dark"] .drs-btn--primary,
html[data-theme="classic-dark"] .drs-btn--primary,
html[data-theme="dark"] .drs-reason.is-on,
html[data-theme="classic-dark"] .drs-reason.is-on,
html[data-theme="dark"] .dcf-chip.is-on,
html[data-theme="classic-dark"] .dcf-chip.is-on,
html[data-theme="dark"] .dcf-done,
html[data-theme="classic-dark"] .dcf-done {
  background: #F0F2F5; border-color: #F0F2F5; color: #1A1A1E;
}
html[data-theme="dark"] .drs-btn--primary:hover:not(:disabled),
html[data-theme="classic-dark"] .drs-btn--primary:hover:not(:disabled) {
  background: #FFFFFF; border-color: #FFFFFF; color: #1A1A1E;
}
html[data-theme="dark"] .drs-overlay,
html[data-theme="classic-dark"] .drs-overlay { background: rgba(0, 0, 0, 0.5); }

@media (prefers-reduced-motion: reduce) {
  .drs-overlay, .drs-panel, .drs-step, .dcf-pop { animation: none !important; }
}
`.trim()
