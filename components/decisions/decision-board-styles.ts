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
  /* Festag Primary Blue — attention only, and a primary action is attention. */
  --dcb-primary: #5B647D;
  --dcb-primary-hover: #4A5268;
  --dcb-primary-soft: #E8ECF5;
  --dcb-primary-edge: rgba(91, 100, 125, 0.20);
  --dcb-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --dcb-action-w: 196px;
  --dcb-path-w: 30px;

  width: 100%;
  box-sizing: border-box;
  color: var(--dcb-ink);
  font-family: var(--font-ui, 'Aeonik', system-ui, sans-serif);
  font-weight: 400;
}

/* The measure lives on an inner rail so the page can be centred in whatever
   space the shell leaves, and grow on large displays instead of stranding the
   content on the left. */
.dcb-inner {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  box-sizing: border-box;
  /* Top padding lives on the sticky header instead, so pinning it at 0 does not
     make the page jump by the padding amount. */
  padding: 0 clamp(20px, 3vw, 48px) clamp(72px, 12vh, 120px);
}

/* Centre on the screen, not in the leftover column.
   The shell reserves a 220px spacer for the collapsed sidebar, which pushes the
   content box right and makes a centred rail sit half a spacer off. Shifting
   the rail with a transform only clips it — .fas-content hides overflow-x. So
   the reservation itself is dropped on this route and the rail centres against
   the real viewport. The collapsed sidebar is a 56px-tall floating chip and the
   headline starts below it, so nothing is covered.
   :has() is a progressive enhancement: without it the spacer stays and the
   board simply sits where it did before. */
html body .fas-root:has(.dcb) .fas-sidebar-spacer { display: none; }
html body .fas-root:has(.dcb) .fas-content {
  scrollbar-gutter: auto;
  /* The shell pads the scroll container by 8px. A sticky child pins to the
     padding box, leaving an 8px band above it where rows scroll through in
     plain sight. The board owns its own top spacing, so drop it here. */
  padding-top: 0;
}

/* Expanded, the panel is wider than the old reservation — hold the rail clear
   of it so the board never slides underneath. */
/* Expanded: clear the panel on the outer box, then let the rail centre itself
   in what is left. Padding the rail directly moved the content twice as far. */
@media (min-width: 1100px) {
  html body .fas-root.is-sidebar-expanded:has(.dcb) .dcb {
    padding-left: calc(var(--fas-sidebar-w, 268px) + var(--fas-sidebar-float-inset, 12px));
  }
}
html body .fas-root:has(.dcb) .dcb {
  transition: padding-left 0.34s var(--dcb-ease);
}

/* Large displays: more measure, not more emptiness. */
@media (min-width: 1500px) {
  .dcb-inner { max-width: 1360px; }
  .dcb { --dcb-action-w: 208px; }
}
@media (min-width: 1800px) {
  .dcb-inner { max-width: 1480px; }
}

/* ── Sticky header ──
   The headline and the lifecycle bar hold their place; only the list travels.
   The fade appears the moment something scrolls under it, so rows dissolve
   into the header instead of colliding with it. */
.dcb-head {
  position: sticky;
  top: 0;
  z-index: 30;
  margin: 0 0 4px;
  /* Carries the page's own top padding, so nothing shifts when it pins. */
  padding-top: clamp(28px, 4.5vh, 56px);
  /* The shell owns the canvas colour — matching it exactly is what keeps rows
     from showing through. A near-miss reads as a tinted pane. */
  background: var(--fas-canvas, #FBF7EE);
  will-change: transform;
}
.dcb-head-fade {
  position: absolute;
  left: 0; right: 0; top: 100%;
  height: 34px;
  pointer-events: none;
  background: linear-gradient(180deg, var(--fas-canvas, #FBF7EE) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.28s var(--dcb-ease);
}
.dcb-head[data-scrolled="true"] .dcb-head-fade { opacity: 1; }
.dcb-head[data-scrolled="true"] { box-shadow: 0 1px 0 var(--dcb-hair); }

/* ── Header ── */
.dcb-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: clamp(20px, 3vh, 32px);
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

/* ── Lifecycle bar: tabs left, filter as plain text right ──
   No button chrome on either. A container around a funnel icon reads as a
   control panel; this has to read as a page. */
.dcb-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin: 0 0 6px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dcb-line);
}
.dcb-views {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-left: calc(var(--dcb-path-w) * -0.25);
}
.dcb-view {
  appearance: none;
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  border: none;
  background: transparent;
  padding: 6px 10px;
  border-radius: 7px;
  font-family: inherit;
  font-size: 14px;
  letter-spacing: 0.002em;
  color: var(--dcb-muted);
  cursor: pointer;
  transition: color 0.16s var(--dcb-ease), background 0.16s var(--dcb-ease);
}
.dcb-view:hover { color: var(--dcb-ink); background: rgba(27, 34, 51, 0.035); }
.dcb-view.is-on { color: var(--dcb-ink); }
/* Empty states stay reachable but recede — present, not advertised. */
.dcb-view.is-empty { color: var(--dcb-faint); }
.dcb-view.is-empty .dcb-view-count { opacity: 0.55; }
.dcb-view.is-empty:hover { color: var(--dcb-muted); }
/* The active tab is marked by the primary path colour, not a filled pill. */
.dcb-view.is-on .dcb-view-count {
  background: var(--dcb-primary);
  color: #FFFFFF;
}
.dcb-view-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 6px;
  background: rgba(27, 34, 51, 0.06);
  color: var(--dcb-muted);
  font-size: 11.5px; line-height: 1;
  font-variant-numeric: tabular-nums;
  transition: background 0.16s var(--dcb-ease), color 0.16s var(--dcb-ease);
}

.dcb-filter {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: none;
  background: transparent;
  padding: 6px 2px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--dcb-muted);
  cursor: pointer;
  transition: color 0.16s var(--dcb-ease);
}
.dcb-filter:hover { color: var(--dcb-ink); }
.dcb-filter.is-on { color: var(--dcb-primary); }
.dcb-filter-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 17px; height: 17px; padding: 0 5px;
  border-radius: 5px;
  background: var(--dcb-primary); color: #FFFFFF;
  font-size: 11px; line-height: 1;
}

/* ── Decision row ── */
.dcb-list { position: relative; }

.dcb-row {
  display: grid;
  grid-template-columns: var(--dcb-path-w) 22px minmax(210px, 1.12fr) minmax(250px, 1.4fr) minmax(168px, 0.78fr) var(--dcb-action-w);
  align-items: start;
  gap: 0 20px;
  padding: 28px 0 30px;
  border-bottom: 1px solid var(--dcb-hair);
  animation: dcbIn 0.4s var(--dcb-ease) both;
}
.dcb-row:last-child { border-bottom: none; }
@keyframes dcbIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

/* ── The running path ──
   One line through every open decision, a node per row. The line is the Flow
   path from the design constitution: one path, Primary Blue, retracting when
   the work is done. */
.dcb-path {
  position: relative;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  /* Cancel the row's own padding so the line runs edge to edge and joins the
     next row's segment — otherwise the path breaks at every gap. */
  margin: -30px 0 -32px;
}
.dcb-path-line {
  width: 1.5px;
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--dcb-primary) 32%, transparent),
    color-mix(in srgb, var(--dcb-primary) 22%, transparent));
  flex: 0 0 auto;
}
.dcb-path-line--up { flex: 0 0 48px; }
.dcb-path-line--down { flex: 1 1 auto; min-height: 20px; }
/* The path starts at the first node and ends at the last — no loose ends. */
.dcb-path-first .dcb-path-line--up,
.dcb-path-single .dcb-path-line--up { background: none; }
.dcb-path-last .dcb-path-line--down,
.dcb-path-single .dcb-path-line--down { background: none; }

.dcb-path-node {
  position: relative;
  width: 20px; height: 20px;
  flex: 0 0 auto;
  display: inline-flex; align-items: center; justify-content: center;
  appearance: none; border: none; background: none; padding: 0;
  cursor: pointer;
  transition: transform 0.2s var(--dcb-ease);
}
.dcb-path-node:disabled { cursor: default; }
.dcb-path-node:not(:disabled):hover { transform: scale(1.12); }
.dcb-path-node:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--dcb-primary) 65%, transparent);
  outline-offset: 3px; border-radius: 50%;
}

/* Hover tells you what the ring does — a control with no label is decoration. */
.dcb-path-tip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(-4px);
  z-index: 30;
  white-space: nowrap;
  padding: 6px 10px;
  border-radius: 7px;
  background: var(--dcb-ink);
  color: #FFFFFF;
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.004em;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s var(--dcb-ease), transform 0.18s var(--dcb-ease);
}
.dcb-path-node:not(:disabled):hover .dcb-path-tip,
.dcb-path-node:focus-visible .dcb-path-tip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}
.dcb-path-svg { width: 20px; height: 20px; overflow: visible; }

/* Waiting: an outline on the line. No fill, no glyph, nothing to decode. */
.dcb-path-rim {
  stroke: color-mix(in srgb, var(--dcb-primary) 32%, transparent);
  fill: none;
  transition: stroke 0.35s var(--dcb-ease);
}
.dcb-path-node.is-urgent .dcb-path-rim { stroke: color-mix(in srgb, var(--dcb-primary) 68%, transparent); }
.dcb-path-node.is-overdue .dcb-path-rim { stroke: color-mix(in srgb, var(--dcb-red) 62%, transparent); }
.dcb-row:hover .dcb-path-rim { stroke: color-mix(in srgb, var(--dcb-primary) 78%, transparent); }

/* The five-second sweep, and the check that lands inside it. */
.dcb-path-sweep {
  stroke: var(--dcb-primary);
  fill: none;
  stroke-linecap: round;
  stroke-dasharray: 69.1;
  stroke-dashoffset: 69.1;
  transform: rotate(-90deg);
  transform-origin: 14px 14px;
  opacity: 0;
}
.dcb-path-tick {
  stroke: var(--dcb-primary);
  fill: none;
  stroke-dasharray: 15;
  stroke-dashoffset: 15;
  opacity: 0;
}

.dcb-row.is-done .dcb-path-sweep {
  opacity: 1;
  animation: dcbSweep 5s cubic-bezier(0.33, 0, 0.2, 1) forwards,
             dcbFadeOut 0.8s var(--dcb-ease) 4.5s forwards;
}
.dcb-row.is-done .dcb-path-tick {
  opacity: 1;
  animation: dcbTick 0.42s var(--dcb-ease) 0.15s forwards,
             dcbFadeOut 0.8s var(--dcb-ease) 4.5s forwards;
}
.dcb-row.is-done .dcb-path-rim { stroke: color-mix(in srgb, var(--dcb-primary) 16%, transparent); }
@keyframes dcbSweep { to { stroke-dashoffset: 0; } }
@keyframes dcbTick { to { stroke-dashoffset: 0; } }
@keyframes dcbFadeOut { to { opacity: 0; } }

/* Held for the beat, then the row retracts and the list closes behind it. */
.dcb-row.is-done {
  animation: dcbIn 0.4s var(--dcb-ease) both, dcbSettle 0.6s var(--dcb-ease) 4.4s forwards;
  pointer-events: none;
}
.dcb-row.is-done .dcb-title,
.dcb-row.is-done .dcb-project,
.dcb-row.is-done .dcb-rec,
.dcb-row.is-done .dcb-meta,
.dcb-row.is-done .dcb-actions,
.dcb-row.is-done .dcb-icon {
  transition: opacity 0.4s var(--dcb-ease);
  opacity: 0.4;
}
@keyframes dcbSettle {
  to { opacity: 0; transform: translateY(-6px); }
}

.dcb-icon {
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none;
  background: none;
  color: var(--dcb-faint);
  /* Optically level with the title's cap height, not its box. */
  margin-top: 11px;
  transition: color 0.24s var(--dcb-ease);
}
.dcb-icon svg { width: 18px; height: 18px; }
.dcb-row:hover .dcb-icon { color: var(--dcb-muted); }

.dcb-title {
  margin: 0 0 6px;
  font-family: var(--font-ui, 'Aeonik', system-ui, sans-serif);
  font-weight: 400;
  font-size: 17px;
  line-height: 1.38;
  letter-spacing: -0.008em;
  color: var(--dcb-ink);
  padding-top: 7px;
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
.dcb-state.is-alert {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 10px;
  padding: 4px 9px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--dcb-red) 11%, transparent);
  color: var(--dcb-red);
  font-size: 12px;
}
.dcb-state.is-alert::before {
  content: ''; width: 5px; height: 5px; border-radius: 50%;
  background: var(--dcb-red); flex-shrink: 0;
}

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
  margin: 0 0 8px;
  font-family: var(--font-ui, 'Aeonik', system-ui, sans-serif);
  font-weight: 500;
  font-size: 16px;
  line-height: 1.35;
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
  height: 41px;
  padding: 0 16px;
  border: 1px solid var(--dcb-line);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.62);
  color: var(--dcb-soft);
  font-family: inherit;
  font-weight: 400;
  font-size: 13.5px;
  letter-spacing: 0.004em;
  cursor: pointer;
  transition: background 0.18s var(--dcb-ease), border-color 0.18s var(--dcb-ease),
              color 0.18s var(--dcb-ease), box-shadow 0.18s var(--dcb-ease),
              transform 0.18s var(--dcb-ease), opacity 0.16s var(--dcb-ease);
}
.dcb-btn:hover:not(:disabled) {
  background: #FFFFFF;
  border-color: color-mix(in srgb, var(--dcb-primary) 30%, transparent);
  color: var(--dcb-ink);
}
.dcb-btn:active:not(:disabled) { transform: translateY(0.5px); }
.dcb-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--dcb-primary) 65%, transparent);
  outline-offset: 2px;
}
.dcb-btn:disabled { opacity: 0.45; cursor: default; }

/* Primary Blue carries the one action that matters — never black. */
.dcb-btn--primary {
  background: var(--dcb-primary);
  border-color: var(--dcb-primary);
  color: #FFFFFF;
  box-shadow: 0 1px 1px rgba(27, 34, 51, 0.04);
}
.dcb-btn--primary:hover:not(:disabled) {
  background: var(--dcb-primary-hover);
  border-color: var(--dcb-primary-hover);
  color: #FFFFFF;
  box-shadow: 0 1px 2px rgba(27, 34, 51, 0.07);
}
/* The third action is a text button — three equal boxes is a toolbar, not a
   decision. Same width and height, so the column still aligns. */
.dcb-btn--ghost {
  background: transparent;
  border-color: transparent;
  color: var(--dcb-muted);
}
.dcb-btn--ghost:hover:not(:disabled) {
  background: rgba(27, 34, 51, 0.04);
  border-color: transparent;
  color: var(--dcb-ink);
}

.dcb-btn-arrow {
  position: absolute;
  right: 14px;
  display: inline-flex;
  transition: transform 0.2s var(--dcb-ease);
}
.dcb-btn--primary:hover:not(:disabled) .dcb-btn-arrow { transform: translateX(2px); }

/* ── "Warum?" — the grounds, always one click away ── */
.dcb-why {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  margin: 12px 0 0;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  max-width: 100%;
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1.5;
  text-align: left;
  color: var(--dcb-primary);
  cursor: pointer;
  border-bottom: 1px solid color-mix(in srgb, var(--dcb-primary) 26%, transparent);
  transition: color 0.16s var(--dcb-ease), border-color 0.16s var(--dcb-ease);
}
.dcb-why:hover {
  color: var(--dcb-primary-hover);
  border-bottom-color: color-mix(in srgb, var(--dcb-primary) 55%, transparent);
}

/* ── Automatic decisions footer ── */
.dcb-auto {
  margin-top: clamp(34px, 5vh, 52px);
  padding: 20px 24px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--dcb-primary) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--dcb-primary) 12%, transparent);
}
.dcb-auto-row {
  display: flex;
  align-items: center;
  gap: 13px;
  flex-wrap: wrap;
  font-size: 14px;
  color: var(--dcb-soft);
}
.dcb-auto-row > span:not(.dcb-auto-check) { flex: 1 1 auto; min-width: 0; }
.dcb-auto-check {
  width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  border: none;
  background: color-mix(in srgb, var(--dcb-primary) 16%, transparent);
  color: var(--dcb-primary);
  flex-shrink: 0;
}
.dcb-auto-link {
  appearance: none;
  border: 1px solid color-mix(in srgb, var(--dcb-primary) 22%, transparent);
  border-radius: 8px;
  background: transparent;
  padding: 7px 13px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--dcb-soft);
  cursor: pointer;
}
.dcb-auto-link:hover { color: var(--dcb-ink); background: color-mix(in srgb, var(--dcb-primary) 10%, transparent); }
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
  background: var(--dcb-primary);
  color: #FFFFFF;
  font-size: 13.5px;
  letter-spacing: 0.004em;
  box-shadow: 0 12px 34px rgba(15, 20, 30, 0.28);
  animation: dcbToast 0.32s var(--dcb-ease) both;
}
@keyframes dcbToast {
  from { opacity: 0; transform: translate(-50%, 8px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
.dcb-toast-copy { display: inline-flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.dcb-toast-sub { color: rgba(255, 255, 255, 0.66); }
/* Undo lives in the toast for exactly as long as the row is still on screen. */
.dcb-toast-undo {
  appearance: none;
  margin-left: 6px;
  padding: 5px 11px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 7px;
  background: transparent;
  color: #FFFFFF;
  font: inherit; font-size: 13px; cursor: pointer;
  transition: background 0.16s var(--dcb-ease), border-color 0.16s var(--dcb-ease);
  flex-shrink: 0;
}
.dcb-toast-undo:hover:not(:disabled) { background: rgba(255, 255, 255, 0.16); border-color: rgba(255, 255, 255, 0.55); }
.dcb-toast-undo:disabled { opacity: 0.6; cursor: default; }

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
  --dcb-primary: #98A2BE;
  --dcb-primary-hover: #AEB7CE;
  --dcb-primary-soft: rgba(152, 162, 190, 0.16);
  --dcb-primary-edge: rgba(152, 162, 190, 0.26);
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
/* Dark keeps Primary Blue, lifted so it carries on a dark canvas. */
html[data-theme="dark"] .dcb-btn--primary,
html[data-theme="classic-dark"] .dcb-btn--primary {
  background: var(--dcb-primary); border-color: var(--dcb-primary); color: #14151B;
}
html[data-theme="dark"] .dcb-btn--primary:hover:not(:disabled),
html[data-theme="classic-dark"] .dcb-btn--primary:hover:not(:disabled) {
  background: var(--dcb-primary-hover); border-color: var(--dcb-primary-hover); color: #14151B;
}
html[data-theme="dark"] .dcb-tool-count,
html[data-theme="classic-dark"] .dcb-tool-count { background: #98A2BE; color: #14151B; }
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
  width: min(660px, 100%);
  max-height: min(82vh, 720px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 36px 40px 30px;
  border-radius: 16px;
  background: #FDFBF7;
  border: 1px solid rgba(27, 34, 51, 0.08);
  box-shadow: 0 18px 48px -20px rgba(15, 20, 30, 0.28), 0 1px 2px rgba(15, 20, 30, 0.04);
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
  appearance: none;
  display: inline-flex; align-items: center; gap: 7px;
  margin: 0 0 20px;
  height: 30px; padding: 0 12px 0 9px;
  border: 1px solid rgba(27, 34, 51, 0.1);
  border-radius: 8px;
  background: transparent;
  font: inherit; font-size: 13px; color: #5A6274; cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;
}
.drs-back:hover {
  background: rgba(91, 100, 125, 0.08);
  border-color: rgba(91, 100, 125, 0.3);
  color: #1B2233;
}

/* The headline IS the content: one or two sentences that say everything.
   The second sentence carries the consequence, set muted so the ask stays
   first — but at the same size, because it is the same statement. */
.drs-title {
  margin: 0 0 22px;
  font-family: var(--font-editorial, 'Editors Note', Georgia, serif);
  font-weight: 400; font-size: clamp(22px, 2.2vw, 27px); line-height: 1.34;
  letter-spacing: -0.008em; color: #1B2233;
  text-wrap: balance;
}
.drs-title-second { color: #8A93A5; }

/* ── Tagro's proposal, clearly marked ──
   Everything Tagro authored lives in this one pale blue field, so the reader
   never has to guess which words are the machine's. */
.drs-tagro {
  margin: 0 0 24px;
  padding: 16px 18px 15px;
  border-radius: 13px;
  background: #E8ECF5;
  border: 1px solid rgba(91, 100, 125, 0.20);
}
.drs-tagro-head {
  margin: 0 0 7px;
  font-size: 15px; line-height: 1.4; color: #3E465C;
}
.drs-tagro-head svg { color: #5B647D; flex-shrink: 0; }
.drs-tagro-body {
  margin: 0;
  font-size: 14.5px; line-height: 1.6; color: #5A6274;
}
.drs-tagro-why {
  appearance: none; border: none; background: transparent; padding: 0;
  margin: 12px 0 0;
  display: inline-flex; align-items: center; gap: 5px;
  font: inherit; font-size: 13.5px; color: #5B647D; cursor: pointer;
}
.drs-tagro-why:hover { color: #3E465C; }
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
.drs-btn--primary { background: #5B647D; border-color: #5B647D; color: #FFF;
  box-shadow: 0 1px 2px rgba(27,34,51,.08), 0 8px 20px -12px rgba(91,100,125,.85); }
.drs-btn--primary:hover:not(:disabled) { background: #4A5268; border-color: #4A5268; color: #FFF; }
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
.drs-option.is-picked {
  border-color: color-mix(in srgb, #5B647D 55%, transparent);
  background: rgba(91, 100, 125, 0.06);
}
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
.drs-reason.is-on { background: #5B647D; border-color: #5B647D; color: #FFF; }

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
.dcf-chip.is-on { background: #5B647D; border-color: #5B647D; color: #FFF; }
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
  border: 1px solid #5B647D; border-radius: 8px;
  background: #5B647D; color: #FFF;
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
  background: #98A2BE; border-color: #98A2BE; color: #14151B;
}
html[data-theme="dark"] .drs-btn--primary:hover:not(:disabled),
html[data-theme="classic-dark"] .drs-btn--primary:hover:not(:disabled) {
  background: #AEB7CE; border-color: #AEB7CE; color: #14151B;
}
html[data-theme="dark"] .drs-overlay,
html[data-theme="classic-dark"] .drs-overlay { background: rgba(0, 0, 0, 0.5); }

@media (prefers-reduced-motion: reduce) {
  .drs-overlay, .drs-panel, .drs-step, .dcf-pop { animation: none !important; }
}

/* ── Grounds ("Warum Tagro das vorschlägt") ── */
.drs-why { display: flex; flex-direction: column; gap: 18px; margin: 4px 0 0; }
.drs-why-block { }
.drs-why-label {
  margin: 0 0 5px;
  font-size: 13px; color: #5B647D;
}
.drs-why-body {
  margin: 0;
  font-size: 15px; line-height: 1.6; color: #1B2233;
}
.drs-why-detail {
  list-style: none; margin: 9px 0 0; padding: 0;
  display: flex; flex-direction: column; gap: 5px;
}
.drs-why-detail li {
  position: relative; padding-left: 14px;
  font-size: 13.5px; line-height: 1.55; color: #8A93A5;
}
.drs-why-detail li::before {
  content: ''; position: absolute; left: 0; top: 8px;
  width: 4px; height: 4px; border-radius: 50%;
  background: rgba(91, 100, 125, 0.5);
}
.drs-why-foot {
  margin: 22px 0 0; padding-top: 16px;
  border-top: 1px solid rgba(27, 34, 51, 0.07);
  font-size: 13.5px; line-height: 1.55; color: #8A93A5;
}

html[data-theme="dark"] .drs-tagro,
html[data-theme="classic-dark"] .drs-tagro {
  background: rgba(152, 162, 190, 0.14);
  border-color: rgba(152, 162, 190, 0.22);
}
html[data-theme="dark"] .drs-tagro-head,
html[data-theme="classic-dark"] .drs-tagro-head { color: #E8EAF0; }
html[data-theme="dark"] .drs-tagro-head svg,
html[data-theme="classic-dark"] .drs-tagro-head svg,
html[data-theme="dark"] .drs-tagro-why,
html[data-theme="classic-dark"] .drs-tagro-why,
html[data-theme="dark"] .drs-why-label,
html[data-theme="classic-dark"] .drs-why-label { color: #AEB7CE; }
html[data-theme="dark"] .drs-tagro-body,
html[data-theme="classic-dark"] .drs-tagro-body { color: #A9B0BF; }
html[data-theme="dark"] .drs-title-second,
html[data-theme="classic-dark"] .drs-title-second,
html[data-theme="dark"] .drs-why-detail li,
html[data-theme="classic-dark"] .drs-why-detail li,
html[data-theme="dark"] .drs-why-foot,
html[data-theme="classic-dark"] .drs-why-foot { color: #838B9C; }
html[data-theme="dark"] .drs-why-body,
html[data-theme="classic-dark"] .drs-why-body { color: #E8EAF0; }

/* ── Detail page ──
   One centred reading column. The board is a table and uses the full rail; a
   single decision is prose and gets a measure, centred in whatever space the
   shell leaves. */
.dcd {
  max-width: 860px;
  margin-left: auto;
  margin-right: auto;
}

   Same canvas and measure as the board; the difference is depth, not style.
   Type is a step larger throughout because this page is read, not scanned. */
.dcd-loading { font-size: 15px; color: var(--dcb-muted); padding: 8px 0; }

.dcd-back {
  appearance: none; border: none; background: transparent; padding: 0;
  display: inline-flex; align-items: center; gap: 7px;
  margin: 0 0 clamp(22px, 3.5vh, 36px);
  font-family: inherit; font-size: 13.5px; color: var(--dcb-muted); cursor: pointer;
  transition: color 0.16s var(--dcb-ease);
}
.dcd-back:hover { color: var(--dcb-ink); }
.dcd-back-cta { width: auto; max-width: 240px; margin-top: 20px; }

.dcd-h1 {
  margin: 0 0 16px;
  max-width: 18ch;
  font-family: var(--font-editorial, 'Editors Note', Georgia, serif);
  font-weight: 400;
  /* A headline, not a poster. Long client titles must stay readable. */
  font-size: clamp(26px, 2.6vw, 36px);
  line-height: 1.26;
  letter-spacing: -0.012em;
  color: var(--dcb-ink);
  text-wrap: balance;
}
.dcd-h1-second { color: var(--dcb-faint); }
.dcd-lead { margin: 0; font-size: 16px; line-height: 1.6; color: var(--dcb-soft); }
.dcd-context {
  margin: 0 0 clamp(26px, 4vh, 40px);
  font-size: 14px; color: var(--dcb-muted);
}

/* Tagro's field — same pale blue as the sheet, so the source is unmistakable. */
.dcd-tagro {
  margin: 0 0 32px;
  padding: 32px;
  border-radius: 15px;
  background: var(--dcb-primary-soft);
  border: 1px solid var(--dcb-primary-edge);
  max-width: none;
}
.dcd-tagro-head {
  margin: 0 0 10px;
  font-size: 13.5px; letter-spacing: 0.01em;
  color: color-mix(in srgb, var(--dcb-primary) 88%, var(--dcb-ink));
}
.dcd-tagro-head svg { color: var(--dcb-primary); }
.dcd-tagro-pick {
  display: flex; align-items: center; gap: 10px;
  margin: 0 0 12px;
  font-family: var(--font-editorial, 'Editors Note', Georgia, serif);
  font-weight: 400; font-size: clamp(23px, 2.4vw, 30px); line-height: 1.24;
  letter-spacing: -0.008em; color: var(--dcb-ink);
}
.dcd-tagro-why {
  margin: 0; max-width: 56ch;
  font-size: 15.5px; line-height: 1.62; color: var(--dcb-soft);
}
.dcd-tagro-confidence {
  display: flex; align-items: center; gap: 10px;
  margin: 16px 0 0;
  font-size: 13px; color: var(--dcb-muted);
}
.dcd-meter {
  position: relative; width: 78px; height: 3px;
  border-radius: 2px; overflow: hidden;
  background: color-mix(in srgb, var(--dcb-primary) 22%, transparent);
}
.dcd-meter span {
  position: absolute; inset: 0 auto 0 0;
  border-radius: 2px; background: var(--dcb-primary);
}

.dcd-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px 32px;
  max-width: none;
  margin: 0 0 32px;
  padding: 24px 0;
  border-top: 1px solid var(--dcb-line);
  border-bottom: 1px solid var(--dcb-line);
}
.dcd-fact-key {
  margin: 0 0 6px;
  font-size: 12.5px; color: var(--dcb-muted);
}
.dcd-fact-val {
  display: flex; align-items: center; gap: 7px;
  margin: 0;
  font-size: 16px; line-height: 1.4; color: var(--dcb-ink);
}
.dcd-fact-val.is-red { color: var(--dcb-red); }

.dcd-actions {
  display: flex; align-items: center; flex-wrap: wrap; gap: 12px;
  margin: 0 0 48px;
}
.dcd-cta { width: auto; min-width: 190px; height: 46px; font-size: 14.5px; }
.dcd-note { margin: 0; font-size: 13.5px; color: var(--dcb-muted); }

.dcd-section {
  margin: 0 0 48px;
}
.dcd-h2 {
  margin: 0 0 18px;
  font-family: var(--font-editorial, 'Editors Note', Georgia, serif);
  font-weight: 400; font-size: clamp(19px, 1.9vw, 24px); line-height: 1.3;
  letter-spacing: -0.006em; color: var(--dcb-ink);
}

.dcd-grounds { display: flex; flex-direction: column; gap: 22px; }
.dcd-ground-key { margin: 0 0 6px; font-size: 13.5px; color: var(--dcb-primary); }
.dcd-ground-body { margin: 0; font-size: 16px; line-height: 1.62; color: var(--dcb-ink); }
.dcd-ground-detail {
  list-style: none; margin: 10px 0 0; padding: 0;
  display: flex; flex-direction: column; gap: 6px;
}
.dcd-ground-detail li {
  position: relative; padding-left: 16px;
  font-size: 14.5px; line-height: 1.55; color: var(--dcb-muted);
}
.dcd-ground-detail li::before {
  content: ''; position: absolute; left: 0; top: 9px;
  width: 4px; height: 4px; border-radius: 50%;
  background: color-mix(in srgb, var(--dcb-primary) 55%, transparent);
}

.dcd-tasks, .dcd-trail { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.dcd-task {
  display: flex; align-items: baseline; gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid var(--dcb-hair);
  font-size: 15.5px; line-height: 1.5; color: var(--dcb-muted);
}
.dcd-task:last-child { border-bottom: none; }
.dcd-task-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--dcb-muted); flex-shrink: 0; transform: translateY(-2px);
}
.dcd-task.is-blocked .dcd-task-dot { background: var(--dcb-primary); }
.dcd-task-name { color: var(--dcb-ink); flex: 1 1 auto; min-width: 0; }
.dcd-task-kind { font-size: 13px; flex-shrink: 0; }

.dcd-trail-item { display: flex; align-items: flex-start; gap: 12px; padding: 11px 0; }
.dcd-trail-dot {
  width: 5px; height: 5px; border-radius: 50%; margin-top: 8px;
  background: color-mix(in srgb, var(--dcb-primary) 45%, transparent); flex-shrink: 0;
}
.dcd-trail-item:first-child .dcd-trail-dot { background: var(--dcb-primary); }
.dcd-trail-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dcd-trail-title { font-size: 15px; line-height: 1.45; color: var(--dcb-ink); }
.dcd-trail-meta { font-size: 13px; color: var(--dcb-muted); }

.dcd-fab { position: fixed; right: 28px; bottom: 28px; z-index: 40; }

@media (max-width: 760px) {
  .dcd-h1 { font-size: 27px; max-width: none; }
  .dcd-tagro-pick { font-size: 22px; }
  .dcd-facts { grid-template-columns: 1fr 1fr; gap: 16px 20px; }
  .dcd-cta { width: 100%; min-width: 0; height: 48px; }
  .dcd-actions { gap: 9px; }
  .dcd-fab { right: 16px; bottom: 88px; }
}
@media (max-width: 420px) {
  .dcd-facts { grid-template-columns: 1fr; }
}

/* ── Mobile: the path stays, everything else stacks ── */
@media (max-width: 760px) {
  .dcb-bar { gap: 10px; padding-bottom: 10px; }
  .dcb-views { gap: 2px; overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
  .dcb-views::-webkit-scrollbar { display: none; }
  .dcb-view { flex: 0 0 auto; padding: 6px 8px; font-size: 13.5px; }
  .dcb-filter { flex: 0 0 auto; }

  .dcb-row {
    grid-template-columns: var(--dcb-path-w) minmax(0, 1fr);
    gap: 0 12px;
    padding: 24px 0 26px;
  }
  .dcb-path { margin: -24px 0 -26px; }
  .dcb-path-line--up { flex: 0 0 34px; }
  .dcb-icon { display: none; }
  .dcb-head-m { grid-column: 2 / 3; }
  .dcb-title { padding-top: 0; font-size: 20px; }
  .dcb-rec { grid-column: 2 / 3; padding-top: 18px; }
  .dcb-rec-why, .dcb-rec-none { max-width: none; }
  .dcb-meta {
    grid-column: 2 / 3;
    border-left: none; padding: 16px 0 0; min-height: 0;
    flex-direction: row; flex-wrap: wrap; gap: 10px 24px;
  }
  .dcb-actions { grid-column: 2 / 3; width: 100%; padding-top: 20px; gap: 9px; }
  .dcb-btn { height: 46px; font-size: 14.5px; }

  .dcb-toast {
    left: 14px; right: 14px; bottom: 16px; transform: none;
    flex-wrap: wrap; justify-content: flex-start;
  }
  .dcb-toast-undo { margin-left: auto; }
}

/* ── Festag Night: the path and the blue field ── */
html[data-theme="dark"] .dcb-path-node,
html[data-theme="classic-dark"] .dcb-path-node { background: var(--dcb-canvas); }
html[data-theme="dark"] .dcb-view-count,
html[data-theme="classic-dark"] .dcb-view-count { background: rgba(255, 255, 255, 0.08); }
html[data-theme="dark"] .dcb-view:hover,
html[data-theme="classic-dark"] .dcb-view:hover { background: rgba(255, 255, 255, 0.05); }
html[data-theme="dark"] .dcb-view.is-on .dcb-view-count,
html[data-theme="classic-dark"] .dcb-view.is-on .dcb-view-count,
html[data-theme="dark"] .dcb-filter-count,
html[data-theme="classic-dark"] .dcb-filter-count { background: var(--dcb-primary); color: #14151B; }
html[data-theme="dark"] .dcb-btn--primary,
html[data-theme="classic-dark"] .dcb-btn--primary,
html[data-theme="dark"] .dcd-cta,
html[data-theme="classic-dark"] .dcd-cta { color: #14151B; box-shadow: none; }
html[data-theme="dark"] .dcb-btn--primary:hover:not(:disabled),
html[data-theme="classic-dark"] .dcb-btn--primary:hover:not(:disabled) { color: #14151B; box-shadow: none; }
html[data-theme="dark"] .dcb-btn--ghost:hover:not(:disabled),
html[data-theme="classic-dark"] .dcb-btn--ghost:hover:not(:disabled) { background: rgba(255, 255, 255, 0.06); }
html[data-theme="dark"] .dcb-toast,
html[data-theme="classic-dark"] .dcb-toast { background: #1F2129; color: #E8EAF0; }
html[data-theme="dark"] .dcb-toast-undo,
html[data-theme="classic-dark"] .dcb-toast-undo { border-color: rgba(255, 255, 255, 0.24); color: #E8EAF0; }
html[data-theme="dark"] .dcd-tagro,
html[data-theme="classic-dark"] .dcd-tagro {
  background: rgba(152, 162, 190, 0.13);
  border-color: rgba(152, 162, 190, 0.24);
}
html[data-theme="dark"] .dcd-tagro-head,
html[data-theme="classic-dark"] .dcd-tagro-head { color: #C4CBDD; }
html[data-theme="dark"] .dcd-ground-key,
html[data-theme="classic-dark"] .dcd-ground-key { color: #AEB7CE; }
html[data-theme="dark"] .dcd-meter,
html[data-theme="classic-dark"] .dcd-meter { background: rgba(152, 162, 190, 0.25); }
`.trim()
