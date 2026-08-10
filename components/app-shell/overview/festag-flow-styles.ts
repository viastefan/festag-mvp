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
  /* Canvas behind the flow — the rail-punch ring around each node dot. */
  --ffl-canvas: ${FESTAG_SAND.canvas};
  --ffl-btn: #FFFFFF;
  --ffl-pad-x: clamp(24px, 4.5vw, 64px);
  --ffl-read: 0;

  position: relative;
  display: grid;
  grid-template-columns: minmax(280px, 1.05fr) minmax(0, 1.05fr);
  gap: clamp(24px, 3.5vw, 56px);
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: min(1240px, 100%);
  margin: 0 auto;
  box-sizing: border-box;
  min-height: calc(100dvh - var(--fas-topbar-h, 68px));
  padding:
    clamp(56px, 7vh, 80px)
    var(--ffl-pad-x)
    clamp(28px, 4vh, 56px);
  background: ${FESTAG_SAND.canvas};
  color: var(--ffl-ink);
  transition: grid-template-columns 0.42s var(--ffl-ease), max-width 0.42s var(--ffl-ease), gap 0.35s var(--ffl-ease);
  overflow-x: clip;
}
.ffl.is-reading {
  gap: clamp(18px, 2.8vw, 44px);
  transition: gap 0.45s var(--ffl-ease);
}
/* The detail column only exists once something is in focus — no reserved gap. */
.ffl.has-detail {
  max-width: min(1380px, 100%);
  grid-template-columns: minmax(280px, 1.15fr) minmax(0, 1fr) minmax(0, 0.82fr);
  align-items: start;
}
.ffl.has-detail .ffl-report,
.ffl.has-detail .ffl-stage {
  position: sticky;
  top: clamp(16px, 2.4vh, 28px);
  align-self: start;
  max-height: calc(100dvh - var(--fas-topbar-h, 52px) - 24px);
  z-index: 2;
}
.ffl.has-detail .ffl-report {
  display: flex;
  align-items: center;
  min-height: calc(100dvh - var(--fas-topbar-h, 52px) - 48px);
}
.ffl.has-detail .ffl-stage {
  overflow: visible;
}
.ffl.is-view-list {
  grid-template-columns: 1fr;
  justify-items: center;
  max-width: min(720px, 100%);
}
/* Bericht: same read width as Fluss — only centers optically above mid */
.ffl.is-view-report {
  grid-template-columns: 1fr;
  justify-items: center;
  align-content: center;
  max-width: min(1240px, 100%);
  padding-top: clamp(48px, 7vh, 88px);
  padding-bottom: clamp(96px, 16vh, 168px);
  transition:
    grid-template-columns 0.55s var(--ffl-ease),
    padding 0.55s var(--ffl-ease),
    gap 0.45s var(--ffl-ease);
}

.ffl h1, .ffl h2, .ffl h3 {
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
}
.ffl h1.ffl-greet {
  font-family: 'Editors Note', Georgia, 'Times New Roman', serif;
  font-weight: 500;
}

/* ── View menu (canvas, not header) ── */
.ffl-view-menu {
  position: absolute;
  top: clamp(12px, 2vh, 20px);
  right: clamp(16px, 2.2vw, 28px);
  z-index: 4;
}
.ffl-view-trigger {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(30, 30, 32, 0.08);
  border-radius: 10px;
  background: color-mix(in srgb, var(--ffl-paper, #F8F6F2) 72%, transparent);
  color: var(--ffl-muted);
  cursor: pointer;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: background 0.16s var(--ffl-ease), color 0.16s var(--ffl-ease), border-color 0.16s var(--ffl-ease);
}
.ffl-view-trigger:hover,
.ffl-view-trigger.is-on {
  color: var(--ffl-ink);
  border-color: rgba(30, 30, 32, 0.12);
  background: color-mix(in srgb, var(--ffl-paper, #F8F6F2) 88%, transparent);
}
.ffl-view-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 148px;
  padding: 6px;
  border-radius: 10px;
  background: var(--ffl-btn, #fff);
  border: 1px solid rgba(30, 30, 32, 0.08);
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.10), 0 1px 2px rgba(0, 0, 0, 0.04);
}
.ffl-view-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--ffl-soft, #5c5c62);
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease, color 0.12s ease;
}
.ffl-view-option:hover {
  background: rgba(15, 15, 18, 0.045);
  color: var(--ffl-ink);
}
.ffl-view-option.is-on {
  background: rgba(15, 15, 18, 0.06);
  color: var(--ffl-ink);
}
html[data-theme="dark"] .ffl-view-trigger,
html[data-theme="classic-dark"] .ffl-view-trigger {
  background: rgba(26, 26, 30, 0.72);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(230, 232, 238, 0.62);
}
html[data-theme="dark"] .ffl-view-popover,
html[data-theme="classic-dark"] .ffl-view-popover {
  background: #1A1A1E;
  border-color: rgba(255, 255, 255, 0.08);
}
html[data-theme="dark"] .ffl-view-option.is-on,
html[data-theme="classic-dark"] .ffl-view-option.is-on {
  background: rgba(255, 255, 255, 0.08);
}

/* ── Report column — Figma editorial read stack ── */
.ffl-report {
  min-width: 0;
  width: 100%;
  display: flex;
  align-items: center;
  align-self: center;
  min-height: calc(100dvh - var(--fas-topbar-h, 52px) - 96px);
}
.ffl.has-detail .ffl-report {
  align-self: start;
}
.ffl-report.is-centered {
  width: 100%;
  max-width: min(56ch, 100%);
  text-align: left;
  justify-content: flex-start;
  align-items: stretch;
  align-self: center;
  min-height: 0;
  padding-top: 0;
}
.ffl-report.is-centered:has(.ffl-read.is-plain) {
  max-width: min(72ch, 100%);
}
@keyframes fflReportIn {
  from {
    opacity: 0.88;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.ffl.is-view-report .ffl-read {
  max-width: min(56ch, 100%);
  margin-inline: auto;
  justify-content: flex-start;
}
.ffl.is-view-report .ffl-read.is-plain {
  max-width: min(68ch, 100%);
}
.ffl.is-view-report .ffl-read-scroll {
  max-width: 100%;
  max-height: min(58vh, 540px);
}
.ffl.is-view-report .ffl-read.is-plain .ffl-read-scroll {
  max-height: min(72vh, 720px);
}
.ffl.is-view-report .ffl-read-line {
  max-width: 100%;
}

.ffl-read {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  max-width: min(56ch, 100%);
  transition: max-width 0.4s var(--ffl-ease);
}
.ffl-read.is-plain {
  max-width: min(68ch, 100%);
}
.ffl-greet {
  margin: 0 0 8px;
  min-height: 2.5em;
  font-family: 'Editors Note', Georgia, 'Times New Roman', serif;
  font-weight: 500;
  font-style: normal;
  font-size: clamp(30px, 3.4vw, 44px);
  line-height: 1.2;
  letter-spacing: -0.016em;
  color: #2F3544;
  width: 100%;
  max-width: min(40ch, 100%);
  text-wrap: balance;
  transform: none;
  opacity: 1;
}
.ffl-greet.is-promoted {
  font-weight: 500;
}
.ffl.is-view-report .ffl-greet {
  margin-bottom: 8px;
  max-width: min(58ch, 100%);
}
.ffl-read.is-plain .ffl-greet {
  font-size: clamp(34px, 4.2vw, 54px);
  max-width: min(58ch, 100%);
  margin-bottom: 16px;
  min-height: 0;
}
.ffl-greet-lead { color: #3A4254; }
.ffl-greet-rest { color: #8891a0; }
.ffl-read-scroll {
  position: relative;
  width: 100%;
  max-width: min(52ch, 100%);
  max-height: min(46vh, 360px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  /* Idle: sharp top — only a soft bottom hint that more text waits */
  -webkit-mask-image: linear-gradient(
    to bottom,
    #000 0%,
    #000 72%,
    rgba(0, 0, 0, 0.55) 88%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    #000 0%,
    #000 72%,
    rgba(0, 0, 0, 0.55) 88%,
    transparent 100%
  );
  overscroll-behavior: contain;
  transition: max-width 0.2s var(--ffl-ease);
}
/* Top fade only after the user has scrolled */
.ffl-read-scroll.is-scrolled {
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.45) 6%,
    #000 16%,
    #000 72%,
    rgba(0, 0, 0, 0.55) 88%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.45) 6%,
    #000 16%,
    #000 72%,
    rgba(0, 0, 0, 0.55) 88%,
    transparent 100%
  );
}
.ffl-read-scroll.is-end:not(.is-scrolled) {
  -webkit-mask-image: none;
  mask-image: none;
}
.ffl-read-scroll.is-scrolled.is-end {
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.5) 7%,
    #000 16%,
    #000 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.5) 7%,
    #000 16%,
    #000 100%
  );
}
.ffl-read.is-plain .ffl-read-scroll,
.ffl-read.is-plain .ffl-read-scroll.is-scrolled,
.ffl-read.is-plain .ffl-read-scroll.is-end {
  -webkit-mask-image: none;
  mask-image: none;
  max-width: 100%;
  max-height: min(72vh, 720px);
}
.ffl-read.is-plain .ffl-read-line {
  color: #8A919E;
  font-size: clamp(18px, 1.65vw, 21px);
  line-height: 1.7;
  max-width: min(62ch, 100%);
}
.ffl-read.is-plain .ffl-read-scroll-pad {
  height: 32px;
}
.ffl-read-scroll::-webkit-scrollbar { display: none; }
.ffl-read-scroll-pad {
  height: min(22vh, 140px);
  pointer-events: none;
}
.ffl-read-line {
  margin: 0 0 1.1em;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: clamp(17px, 1.45vw, 19.5px);
  line-height: 1.72;
  letter-spacing: 0.005em;
  color: #A7ADB8;
  max-width: min(52ch, 100%);
  text-wrap: pretty;
}
.ffl-read-line.is-flow {
  margin: 0 0 1.15em;
}
.ffl-read-line:last-of-type { margin-bottom: 8px; }
.ffl-read-sent {
  transition: color 0.25s var(--ffl-ease), background 0.25s var(--ffl-ease);
  border-radius: 3px;
}
.ffl-read-sent.is-live {
  color: var(--ffl-ink);
  background: rgba(91, 100, 125, 0.10);
}

/* Body marks — word + tiny round edit chip; hover opens a side popover */
.ffl-mark-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  vertical-align: baseline;
  white-space: nowrap;
}
.ffl-mark-word {
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  line-height: inherit;
}
.ffl-mark-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 999px;
  flex-shrink: 0;
  cursor: pointer;
  vertical-align: middle;
  transform: translateY(-0.5px);
  transition: transform 0.14s var(--ffl-ease), background 0.14s var(--ffl-ease), box-shadow 0.14s var(--ffl-ease);
}
.ffl-mark-edit svg {
  display: block;
}
.ffl-mark-edit.is-decision {
  color: #2E9B52;
  background: rgba(46, 155, 82, 0.14);
  box-shadow: inset 0 0 0 1px rgba(46, 155, 82, 0.18);
}
.ffl-mark-edit.is-risk {
  color: #C43C3C;
  background: rgba(196, 60, 60, 0.12);
  box-shadow: inset 0 0 0 1px rgba(196, 60, 60, 0.16);
}
.ffl-mark-edit.is-efficiency {
  color: #B8862F;
  background: rgba(201, 147, 43, 0.14);
  box-shadow: inset 0 0 0 1px rgba(201, 147, 43, 0.18);
}
.ffl-mark-wrap:hover .ffl-mark-edit,
.ffl-mark-wrap.is-open .ffl-mark-edit,
.ffl-mark-edit:hover {
  transform: translateY(-0.5px) scale(1.06);
}
.ffl-mark-tip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  width: max-content;
  min-width: 168px;
  max-width: min(240px, 70vw);
  padding: 6px;
  border-radius: 12px;
  background: #FFFFFF;
  border: 1px solid rgba(30, 30, 32, 0.08);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 12px 28px rgba(15, 23, 42, 0.10);
  pointer-events: auto;
  text-align: left;
  animation: fflMarkTipIn 0.14s var(--ffl-ease) both;
}
.ffl-mark-tip::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 50%;
  width: 8px;
  height: 8px;
  margin-top: -4px;
  background: inherit;
  border-left: 1px solid rgba(30, 30, 32, 0.08);
  border-bottom: 1px solid rgba(30, 30, 32, 0.08);
  transform: rotate(45deg);
}
@keyframes fflMarkTipIn {
  from { opacity: 0; transform: translateY(-50%) translateX(4px); }
  to { opacity: 1; transform: translateY(-50%) translateX(0); }
}
.ffl-mark-tip-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ffl-mark-tip-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  margin: 0;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: background 0.12s ease;
}
.ffl-mark-tip-item:hover {
  background: rgba(15, 15, 18, 0.045);
}
.ffl-mark-tip-item.is-empty {
  cursor: pointer;
}
.ffl-mark-tip-title {
  display: block;
  margin: 0;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.35;
  color: #3A4254;
}
.ffl-mark-tip-hint {
  display: block;
  margin: 0;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-size: 11.5px;
  line-height: 1.35;
  color: #8891a0;
}
.ffl-read-ack {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 4px;
  padding: 8px 0 4px;
  color: var(--ffl-soft, #5c5c62);
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-size: 13.5px;
  letter-spacing: -0.01em;
  animation: fflAckIn 0.36s var(--ffl-ease) both;
}
@keyframes fflAckIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
.ffl-read-ack-mark {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(46, 155, 82, 0.12);
  color: #2E9B52;
  flex-shrink: 0;
}
.ffl-read-ack-label {
  color: var(--ffl-ink, #1E1E20);
}
.ffl-read-ack-date {
  color: var(--ffl-muted, #8891a0);
}

.ffl.is-reading .ffl-stage .ffl-node.is-dim {
  opacity: 0.22;
}
.ffl.is-reading.has-detail .ffl-detail {
  opacity: 0.94;
}

/* Sidebar open → slightly tighter read column so the page stays balanced */
.fas-root.is-sidebar-expanded .ffl-read {
  max-width: min(52ch, 100%);
}
.fas-root.is-sidebar-expanded .ffl-greet {
  max-width: min(36ch, 100%);
}
.fas-root.is-sidebar-expanded .ffl-read-scroll,
.fas-root.is-sidebar-expanded .ffl-read-line {
  max-width: min(48ch, 100%);
}
/* Sidebar collapsed → fuller editorial width */
.fas-root.is-sidebar-collapsed .ffl-read {
  max-width: min(56ch, 100%);
}
.fas-root.is-sidebar-collapsed .ffl-greet {
  max-width: min(40ch, 100%);
}
.fas-root.is-sidebar-collapsed .ffl-read-scroll,
.fas-root.is-sidebar-collapsed .ffl-read-line {
  max-width: min(52ch, 100%);
}
.ffl-read-body {
  margin: 0;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: clamp(16px, 1.35vw, 18.5px);
  line-height: 1.55;
  letter-spacing: 0.02em;
  color: #A7ADB8;
  max-width: 34ch;
}
/* Hint and toolbar stack on the text's own left edge — the whole read column
   shares one x-axis, so the controls line up with T1 rather than floating. */
.ffl-read-foot {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  margin-top: 14px;
}
.ffl-read-hint {
  margin: 0;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: 12px;
  line-height: 1.35;
  letter-spacing: 0.01em;
  color: #C4C8D0;
  transition: opacity 0.25s var(--ffl-ease), max-width 0.35s var(--ffl-ease);
  flex: none;
  min-width: 0;
}
.ffl-read.is-audio .ffl-read-hint {
  max-width: calc(100% - 12px);
}
.ffl-read-hint.is-hidden {
  opacity: 0;
  pointer-events: none;
}
.ffl-read-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  transition: transform 0.35s var(--ffl-ease);
}
.ffl-read-actions.is-audio-open {
  /* Dock grows left — toolbar shifts slightly with the new play control */
  transform: translateX(-2px);
}
.ffl-audio-dock {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-direction: row;
}
.ffl-audio-play {
  width: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  transform: translateX(8px) scale(0.86);
  transition:
    width 0.34s var(--ffl-ease),
    min-width 0.34s var(--ffl-ease),
    opacity 0.28s var(--ffl-ease),
    transform 0.34s var(--ffl-ease),
    background 0.18s var(--ffl-ease),
    color 0.18s var(--ffl-ease);
}
.ffl-audio-play.is-shown {
  width: 32px !important;
  min-width: 32px !important;
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0) scale(1);
}
.ffl-icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #A0A7B5;
  cursor: pointer;
  transition: background 0.18s var(--ffl-ease), color 0.18s var(--ffl-ease);
}
.ffl-icon-btn:hover {
  background: rgba(15, 15, 18, 0.05);
  color: var(--ffl-ink);
}
.ffl-icon-btn.is-on {
  background: rgba(15, 15, 18, 0.07);
  color: var(--ffl-ink);
}

.ffl-node.is-filter-dim {
  opacity: 0.28;
  filter: saturate(0.5);
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

/* ── Stage ── a quiet list of small containers ──
   No graph, no canvas — a table read top to bottom, kept at the same visual
   weight as the read column so it sits beside T1 rather than under it. */
.ffl-stage {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 380px;
  margin-inline: auto;
  transform: none;
  opacity: 1;
  filter: none;
  transition:
    transform 0.5s var(--ffl-ease),
    opacity 0.5s var(--ffl-ease),
    filter 0.5s var(--ffl-ease);
  will-change: transform, opacity, filter;
}
.ffl.has-detail .ffl-stage {
  transform: none;
}
/* Bericht: the list slides out right with soft glass blur */
.ffl-stage.is-report-exit {
  position: absolute;
  right: clamp(8px, 2vw, 28px);
  top: 50%;
  width: min(420px, 40vw);
  margin: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transform: translate3d(64px, -50%, 0) scale(0.96);
  filter: blur(16px) saturate(1.08) brightness(1.04);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

/* ── Inbox — the running activity feed that replaces the category rows ──
   Categories now live in the sidebar; the right column's job is simpler:
   show what actually happened, quietly, in one soft-framed group. */
.ffl-inbox {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 16px 18px 6px;
  border: 1px solid var(--ffl-line);
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025), 0 14px 32px -12px rgba(15, 23, 42, 0.09);
}
html[data-theme="dark"] .ffl-inbox,
html[data-theme="classic-dark"] .ffl-inbox {
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03) inset;
}

.ffl-inbox-status {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--ffl-line);
  font-size: 12.5px;
  letter-spacing: -0.005em;
  color: rgba(30, 30, 32, 0.42);
}
html[data-theme="dark"] .ffl-inbox-status,
html[data-theme="classic-dark"] .ffl-inbox-status { color: rgba(230, 230, 234, 0.42); }

/* A quiet breathing dot — Tagro is running, not "loading". Serious, not busy. */
.ffl-inbox-pulse {
  position: relative;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(46, 155, 82, 0.55);
  flex-shrink: 0;
}
.ffl-inbox-pulse::after {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  background: rgba(46, 155, 82, 0.28);
  animation: fflPulseBreathe 2.6s var(--ffl-ease) infinite;
}
@keyframes fflPulseBreathe {
  0%, 100% { transform: scale(0.6); opacity: 0.55; }
  50% { transform: scale(1.4); opacity: 0; }
}

.ffl-inbox-list {
  display: flex;
  flex-direction: column;
}
.ffl-inbox-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 0;
  border-bottom: 1px solid var(--ffl-line);
}
.ffl-inbox-list > .ffl-inbox-row:last-child { border-bottom: none; }
.ffl-inbox-row-title {
  font-size: 14.5px;
  font-weight: 400;
  letter-spacing: -0.012em;
  color: var(--ffl-ink);
  min-width: 0;
}
.ffl-inbox-row-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-shrink: 0;
  font-size: 12.5px;
  color: rgba(30, 30, 32, 0.4);
}
html[data-theme="dark"] .ffl-inbox-row-meta,
html[data-theme="classic-dark"] .ffl-inbox-row-meta { color: rgba(230, 230, 234, 0.42); }
.ffl-inbox-row-project {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(30, 30, 32, 0.05);
  color: rgba(30, 30, 32, 0.55);
  white-space: nowrap;
}
html[data-theme="dark"] .ffl-inbox-row-project,
html[data-theme="classic-dark"] .ffl-inbox-row-project {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(230, 230, 234, 0.6);
}
.ffl-inbox-row-time { white-space: nowrap; }
.ffl-inbox .ffl-empty { padding: 4px 0 18px; }

/* ── The list: one soft frame around the group, flat hairlines inside ──
   No fill to speak of — border + a whisper of shadow is what grounds the
   list as one object, not a card. Rows keep the hairline rhythm inside it. */
.ffl-node-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 5px;
  border: 1px solid var(--ffl-line);
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025), 0 14px 32px -12px rgba(15, 23, 42, 0.09);
}
.ffl-node-list > .ffl-node:last-child { border-bottom: none; }

/* ── A row: label left, value + chevron right ──
   The chevron is always on — an affordance you can see at rest, not one you
   have to discover by hovering. A left accent bar is the only way to tell
   "open" from "hovered": hover is a hint, is-focus is a fact. */
.ffl-node {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  margin: 0;
  padding: 17px 10px 17px 14px;
  border: 0;
  border-bottom: 1px solid var(--ffl-line);
  border-radius: 10px;
  outline: none;
  background: transparent;
  box-shadow: none;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  cursor: pointer;
  text-align: left;
  z-index: 3;
  animation: fflNodeIn 0.4s var(--ffl-ease) both;
  transition: background 0.16s var(--ffl-ease), opacity 0.3s var(--ffl-ease);
}
@keyframes fflNodeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
.ffl-node-list > .ffl-node:nth-child(1) { animation-delay: 0ms; }
.ffl-node-list > .ffl-node:nth-child(2) { animation-delay: 35ms; }
.ffl-node-list > .ffl-node:nth-child(3) { animation-delay: 70ms; }
.ffl-node-list > .ffl-node:nth-child(4) { animation-delay: 105ms; }
.ffl-node-list > .ffl-node:nth-child(5) { animation-delay: 140ms; }
.ffl-node-list > .ffl-node:nth-child(6) { animation-delay: 175ms; }
.ffl-node::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 10px;
  bottom: 10px;
  width: 2px;
  border-radius: 2px;
  background: transparent;
  transition: background 0.18s var(--ffl-ease);
}
.ffl-node:hover { background: rgba(30, 30, 32, 0.04); }
.ffl-node:hover .ffl-node-label { color: var(--ffl-ink); }
.ffl-node:focus-visible {
  outline: 2px solid rgba(59, 111, 212, 0.4);
  outline-offset: -2px;
}
.ffl-node.is-focus {
  background: rgba(30, 30, 32, 0.045);
}
.ffl-node.is-focus::before {
  background: rgba(30, 30, 32, 0.55);
}
.ffl-node.is-dim { opacity: 0.45; }

.ffl-node-body {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

/* ── The mark: a quiet, typographic status language, not a to-do checkbox ──
   Check = calm, resolved by Tagro. A small dot = the one place worth a look.
   Grayscale by default — the dot is the only place colour is allowed in. */
.ffl-node-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  border-radius: 50%;
  color: rgba(30, 30, 32, 0.34);
  box-shadow: 0 0 0 1px rgba(30, 30, 32, 0.14) inset;
  transition: color 0.2s var(--ffl-ease), box-shadow 0.2s var(--ffl-ease);
}
.ffl-node-mark.is-idle {
  box-shadow: 0 0 0 1px rgba(30, 30, 32, 0.1) inset;
}
.ffl-node-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.ffl-node-mark.is-attn {
  color: rgba(30, 30, 32, 0.5);
  box-shadow: 0 0 0 1px rgba(30, 30, 32, 0.16) inset;
}
.ffl-node-mark.is-attn.is-green { color: rgba(46, 155, 82, 0.85); box-shadow: 0 0 0 1px rgba(46, 155, 82, 0.22) inset; }
.ffl-node-mark.is-attn.is-red   { color: rgba(196, 60, 60, 0.85); box-shadow: 0 0 0 1px rgba(196, 60, 60, 0.22) inset; }
.ffl-node.is-focus .ffl-node-mark,
.ffl-node:hover .ffl-node-mark { color: rgba(30, 30, 32, 0.5); }
.ffl-node.is-focus .ffl-node-mark.is-attn.is-green,
.ffl-node:hover .ffl-node-mark.is-attn.is-green { color: rgba(46, 155, 82, 0.95); }
.ffl-node.is-focus .ffl-node-mark.is-attn.is-red,
.ffl-node:hover .ffl-node-mark.is-attn.is-red { color: rgba(196, 60, 60, 0.95); }

.ffl-node-label {
  font-size: 14.5px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.012em;
  color: var(--ffl-ink);
}
.ffl-node-meta {
  font-size: 13px;
  line-height: 1.2;
  letter-spacing: -0.006em;
  color: rgba(30, 30, 32, 0.42);
  white-space: nowrap;
  flex-shrink: 0;
}
.ffl-node-meta.is-blue  { color: rgba(59, 111, 212, 0.92); }
.ffl-node-meta.is-red   { color: rgba(196, 60, 60, 0.92); }
.ffl-node-meta.is-green { color: rgba(46, 155, 82, 0.92); }

.ffl-node-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
/* Always on — the row reads as a control before you ever touch it. */
.ffl-node-chev {
  color: rgba(30, 30, 32, 0.22);
  transition: color 0.18s var(--ffl-ease), transform 0.18s var(--ffl-ease);
}
.ffl-node:hover .ffl-node-chev { color: rgba(30, 30, 32, 0.4); transform: translateX(1px); }
.ffl-node.is-focus .ffl-node-chev { color: rgba(30, 30, 32, 0.55); transform: rotate(90deg); }

/* ── Queue (list view) ── */
.ffl-q-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 12.5px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(30, 30, 32, 0.38);
}
.ffl-q-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(30, 30, 32, 0.07);
  font-size: 11px;
  letter-spacing: 0;
  color: rgba(30, 30, 32, 0.6);
}

.ffl-q-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* An item is a row, not a card. Tone is a hairline on the leading edge — it
   reads at a glance without adding a coloured object to the page. */
.ffl-q-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 13px 12px 13px 16px;
  border: 0;
  border-radius: 11px;
  outline: none;
  background: transparent;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s var(--ffl-ease);
}
.ffl-q-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 13px;
  bottom: 13px;
  width: 2px;
  border-radius: 2px;
  background: rgba(30, 30, 32, 0.22);
  transition: background 0.2s var(--ffl-ease);
}
.ffl-q-item.is-green::before { background: #25A55B; }
.ffl-q-item.is-red::before { background: #E14B4B; }
.ffl-q-item:hover { background: rgba(30, 30, 32, 0.035); }
.ffl-q-item.is-focus { background: rgba(30, 30, 32, 0.05); }
.ffl-q-item:focus-visible {
  outline: 2px solid rgba(59, 111, 212, 0.4);
  outline-offset: -2px;
}

.ffl-q-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.ffl-q-title {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: -0.014em;
  color: var(--ffl-ink);
}
.ffl-q-sub {
  font-size: 12.5px;
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: rgba(30, 30, 32, 0.45);
}

/* The action stays visible — a hover-only affordance is invisible on touch. */
.ffl-q-cta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 13px;
  letter-spacing: -0.008em;
  color: rgba(30, 30, 32, 0.5);
  transition: color 0.2s var(--ffl-ease), transform 0.2s var(--ffl-ease);
}
.ffl-q-item:hover .ffl-q-cta { color: var(--ffl-ink); transform: translateX(2px); }

.ffl-q-empty {
  margin: 0;
  max-width: 34ch;
  font-size: 15px;
  line-height: 1.5;
  letter-spacing: -0.014em;
  color: rgba(30, 30, 32, 0.55);
}
.ffl-q-ambient {
  margin: 2px 0 0;
  font-size: 12.5px;
  line-height: 1.45;
  letter-spacing: -0.005em;
  color: rgba(30, 30, 32, 0.36);
}
.ffl-q-dot { color: rgba(30, 30, 32, 0.24); }

/* ── Detail ── */
.ffl-detail {
  position: relative;
  align-self: start;
  display: flex; flex-direction: column; gap: 8px;
  padding: 42px 0 4px clamp(18px, 2.2vw, 32px);
  border-left: 1px solid rgba(15, 15, 18, 0.045);
  max-height: none;
  overflow: visible;
  z-index: 4;
  transform: none;
  transition: opacity 0.35s var(--ffl-ease);
  animation: fflDetailIn 0.42s var(--ffl-ease) both;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
}
.ffl-detail::-webkit-scrollbar { display: none; }
@keyframes fflDetailIn {
  from { opacity: 0; transform: translate3d(14px, 0, 0); }
  to { opacity: 1; transform: none; }
}

/* Bridge lines — node → detail cards (under text, above canvas) */
.ffl-bridge {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  pointer-events: none;
  z-index: 2;
  overflow: visible;
}
.ffl-bridge-path {
  fill: none;
  stroke-width: 1;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1.6 5.5;
  opacity: 0;
  animation: fflBridgeIn 0.55s var(--ffl-ease) forwards;
}
.ffl-bridge-dot {
  opacity: 0;
  animation: fflBridgeIn 0.4s var(--ffl-ease) forwards;
}
@keyframes fflBridgeIn {
  to { opacity: 1; }
}
[data-ffl-bridge-target] {
  position: relative;
}
.ffl-detail-close {
  position: absolute; top: 0; right: 0;
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--ffl-line); background: var(--ffl-btn);
  color: var(--ffl-muted); cursor: pointer;
}
.ffl-detail-close:hover { color: var(--ffl-ink); background: #FCFBF8; }

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
/* A pickable row — the Projekt station's project switcher. */
.ffl-row.is-pick {
  width: 100%;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s var(--ffl-ease), color 0.18s var(--ffl-ease);
}
.ffl-row.is-pick:hover { background: rgba(30, 30, 32, 0.035); }
.ffl-row.is-pick:focus-visible {
  outline: 2px solid rgba(59, 111, 212, 0.4);
  outline-offset: -2px;
}
.ffl-row.is-pick.is-active .ffl-row-name { font-weight: 500; }
.ffl-row.is-pick.is-active .ffl-row-meta { color: var(--ffl-ink); }

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
  .ffl.has-detail .ffl-report,
  .ffl.has-detail .ffl-stage {
    position: static;
    max-height: none;
    min-height: 0;
  }
  /* Stacked: the report's desktop min-height (near-full-viewport, meant to
     vertically centre it beside the stage) just leaves a dead gap above the
     inbox here — the column should be exactly as tall as its text. */
  .ffl-report, .ffl.has-detail .ffl-report {
    min-height: 0;
    align-items: flex-start;
  }
  .ffl-bridge { display: none; }
  /* Single column: the map must not grow into the full text width — its fixed
     ratio would turn a 680px stage into a 888px-tall one. */
  .ffl-stage { max-width: min(460px, 100%); }
  .ffl-read,
  .fas-root.is-sidebar-collapsed .ffl-read,
  .fas-root.is-sidebar-expanded .ffl-read {
    max-width: min(42ch, 100%);
  }
  .ffl-greet,
  .fas-root.is-sidebar-collapsed .ffl-greet,
  .fas-root.is-sidebar-expanded .ffl-greet {
    max-width: min(28ch, 100%);
  }
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

  .ffl-node { padding: 12px 14px; }
  .ffl-node-label { font-size: 13.5px; }
  .ffl-node-meta { font-size: 12px; }
}

html[data-theme="dark"] .ffl,
html[data-theme="classic-dark"] .ffl {
  background: #0C0D12;
  --ffl-ink: #F5F4F1; --ffl-soft: #B8B6B0; --ffl-line: rgba(255, 255, 255, 0.09);
}
html[data-theme="dark"] .ffl,
html[data-theme="classic-dark"] .ffl { --ffl-canvas: #0C0D12; }
html[data-theme="dark"] .ffl-grid-line,
html[data-theme="classic-dark"] .ffl-grid-line { stroke: rgba(255, 255, 255, 0.06); }
html[data-theme="dark"] .ffl-grid-line.is-major,
html[data-theme="classic-dark"] .ffl-grid-line.is-major { stroke: rgba(255, 255, 255, 0.1); }
html[data-theme="dark"] .ffl-node-list,
html[data-theme="classic-dark"] .ffl-node-list {
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03) inset;
}
html[data-theme="dark"] .ffl-node,
html[data-theme="classic-dark"] .ffl-node {
  background: transparent;
  box-shadow: none;
}
html[data-theme="dark"] .ffl-node:hover,
html[data-theme="classic-dark"] .ffl-node:hover {
  background: rgba(255, 255, 255, 0.05);
}
html[data-theme="dark"] .ffl-node.is-focus,
html[data-theme="classic-dark"] .ffl-node.is-focus {
  background: rgba(255, 255, 255, 0.06);
}
html[data-theme="dark"] .ffl-node.is-focus::before,
html[data-theme="classic-dark"] .ffl-node.is-focus::before {
  background: rgba(255, 255, 255, 0.55);
}
html[data-theme="dark"] .ffl-node-chev,
html[data-theme="classic-dark"] .ffl-node-chev {
  color: rgba(255, 255, 255, 0.22);
}
html[data-theme="dark"] .ffl-node:hover .ffl-node-chev,
html[data-theme="classic-dark"] .ffl-node:hover .ffl-node-chev { color: rgba(255, 255, 255, 0.4); }
html[data-theme="dark"] .ffl-node.is-focus .ffl-node-chev,
html[data-theme="classic-dark"] .ffl-node.is-focus .ffl-node-chev { color: rgba(255, 255, 255, 0.6); }
html[data-theme="dark"] .ffl-node-label,
html[data-theme="classic-dark"] .ffl-node-label {
  color: var(--ffl-ink);
}
html[data-theme="dark"] .ffl-node-meta,
html[data-theme="classic-dark"] .ffl-node-meta {
  color: rgba(230, 230, 234, 0.5);
}
html[data-theme="dark"] .ffl-node-meta.is-blue,
html[data-theme="classic-dark"] .ffl-node-meta.is-blue { color: #7FA3E8; }
html[data-theme="dark"] .ffl-node-meta.is-red,
html[data-theme="classic-dark"] .ffl-node-meta.is-red { color: #E28080; }
html[data-theme="dark"] .ffl-node-meta.is-green,
html[data-theme="classic-dark"] .ffl-node-meta.is-green { color: #6FC98C; }
html[data-theme="dark"] .ffl-node-mark,
html[data-theme="classic-dark"] .ffl-node-mark {
  color: rgba(245, 245, 247, 0.4);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16) inset;
}
html[data-theme="dark"] .ffl-node-mark.is-attn.is-green,
html[data-theme="classic-dark"] .ffl-node-mark.is-attn.is-green { color: #6FC98C; box-shadow: 0 0 0 1px rgba(111, 201, 140, 0.3) inset; }
html[data-theme="dark"] .ffl-node-mark.is-attn.is-red,
html[data-theme="classic-dark"] .ffl-node-mark.is-attn.is-red { color: #E28080; box-shadow: 0 0 0 1px rgba(226, 128, 128, 0.3) inset; }
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
html[data-theme="dark"] .ffl-mark-tip,
html[data-theme="classic-dark"] .ffl-mark-tip {
  background: #1A1A1E;
  border-color: rgba(255, 255, 255, 0.10);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}
html[data-theme="dark"] .ffl-mark-tip-item:hover,
html[data-theme="classic-dark"] .ffl-mark-tip-item:hover {
  background: rgba(255, 255, 255, 0.06);
}
html[data-theme="dark"] .ffl-mark-tip-title,
html[data-theme="classic-dark"] .ffl-mark-tip-title { color: #E6E6EA; }
html[data-theme="dark"] .ffl-mark-tip-hint,
html[data-theme="classic-dark"] .ffl-mark-tip-hint { color: rgba(245, 245, 247, 0.55); }
html[data-theme="dark"] .ffl-read.is-plain .ffl-read-line,
html[data-theme="classic-dark"] .ffl-read.is-plain .ffl-read-line {
  color: rgba(230, 230, 234, 0.62);
}

@media (prefers-reduced-motion: reduce) {
  .ffl, .ffl-node, .ffl-node-orb, .ffl-cta, .ffl-detail, .ffl-lyric, .ffl-report, .ffl-stage, .ffl-greet, .ffl-read {
    transition: none !important; animation: none !important;
  }
  .ffl-inbox-pulse::after {
    animation: none !important;
    opacity: 0.4;
  }
  .ffl {
    --ffl-read: 0 !important;
  }
  .ffl-stage,
  .ffl-detail,
  .ffl-greet {
    transform: none !important;
  }
  .ffl-read-scroll {
    scroll-snap-type: none;
  }
  .ffl-read-line.is-sentence {
    scroll-snap-align: none;
    scroll-snap-stop: normal;
  }
  .ffl-read-scroll {
    scroll-snap-type: none;
  }
  .ffl-read-line.is-sentence {
    scroll-snap-align: none;
    scroll-snap-stop: normal;
  }
  .ffl-bridge-path,
  .ffl-bridge-dot {
    animation: none !important;
    opacity: 1 !important;
  }
}
`.trim()
