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
  gap: calc(clamp(24px, 3.5vw, 56px) - var(--ffl-read) * 12px);
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
  animation: fflReportIn 0.55s var(--ffl-ease) both;
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
.ffl.is-view-report .ffl-greet {
  max-width: min(40ch, 100%);
}
.ffl.is-view-report .ffl-read-scroll {
  max-width: 100%;
  max-height: min(58vh, 540px);
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
  transition: max-width 0.45s var(--ffl-ease);
}
.ffl-greet {
  margin: 0 0 calc(18px - var(--ffl-read) * 2px);
  font-family: 'Editors Note', Georgia, 'Times New Roman', serif;
  font-weight: 500;
  font-style: normal;
  font-size: clamp(
    32px,
    calc(3.7vw - var(--ffl-read) * 0.15vw),
    calc(48px - var(--ffl-read) * 3px)
  );
  line-height: 1.18;
  letter-spacing: -0.016em;
  color: #2F3544;
  width: 100%;
  max-width: min(40ch, 100%);
  text-wrap: balance;
  transform-origin: left top;
  transform: scale(calc(1 - var(--ffl-read) * 0.02));
  opacity: 1;
  transition:
    font-size 0.22s var(--ffl-ease),
    max-width 0.22s var(--ffl-ease),
    transform 0.22s var(--ffl-ease),
    margin 0.22s var(--ffl-ease),
    opacity 0.22s ease;
}
.ffl-greet.is-out {
  opacity: 0;
  transform: translateY(6px) scale(calc(1 - var(--ffl-read) * 0.02));
}
.ffl-greet.is-in {
  opacity: 1;
}
.ffl-greet.is-promoted {
  font-weight: 500;
  font-size: clamp(
    30px,
    calc(3.4vw - var(--ffl-read) * 0.12vw),
    calc(44px - var(--ffl-read) * 2.5px)
  );
}
.ffl-greet-lead { color: #2F3544; }
.ffl-greet-rest { color: #8891a0; }
.ffl-greet .ffl-mark {
  font: inherit;
  letter-spacing: inherit;
  line-height: inherit;
}
.ffl-greet-lead .ffl-mark { color: inherit; }
.ffl-greet-lead .ffl-mark.is-risk,
.ffl-greet-rest .ffl-mark.is-risk {
  color: var(--ffl-red);
  background: rgba(196, 60, 60, 0.08);
  box-shadow: inset 0 -2px 0 rgba(196, 60, 60, 0.55);
}
.ffl-greet-lead .ffl-mark.is-decision,
.ffl-greet-rest .ffl-mark.is-decision {
  color: var(--ffl-green);
  background: rgba(46, 155, 82, 0.08);
  box-shadow: inset 0 -2px 0 rgba(46, 155, 82, 0.55);
}
.ffl-greet-lead .ffl-mark.is-efficiency,
.ffl-greet-rest .ffl-mark.is-efficiency {
  color: var(--ffl-amber);
  background: rgba(201, 147, 43, 0.10);
  box-shadow: inset 0 -2px 0 rgba(201, 147, 43, 0.55);
}
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
  max-height: min(62vh, 620px);
}
.ffl-read.is-plain .ffl-read-line {
  color: #6B7280;
}
.ffl-read.is-plain .ffl-read-scroll-pad {
  height: 24px;
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
  transition: opacity 0.45s var(--ffl-ease), color 0.45s var(--ffl-ease), background 0.25s var(--ffl-ease);
  border-radius: 3px;
}
.ffl-read-sent.is-up {
  opacity: 0.18;
  color: #C5CAD3;
}
.ffl-read-sent.is-live {
  color: var(--ffl-ink);
  background: rgba(91, 100, 125, 0.10);
  opacity: 1;
}
.ffl-read.is-plain .ffl-read-sent.is-up {
  opacity: 1;
  color: inherit;
}

/* Marks only appear in the H1 when promoted — underline invites click */
.ffl-mark-wrap {
  position: relative;
  display: inline-block;
  max-width: 100%;
  vertical-align: baseline;
}
.ffl-mark {
  background: transparent;
  color: inherit;
  font-style: normal;
  border-radius: 3px;
  padding: 0 2px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
button.ffl-mark {
  display: inline;
  margin: 0;
  padding: 0 2px;
  border: none;
  font: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  cursor: pointer;
  vertical-align: baseline;
  transition: background 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;
}
button.ffl-mark:hover {
  filter: brightness(0.96);
}
button.ffl-mark.is-risk:hover {
  background: rgba(196, 60, 60, 0.14);
  box-shadow: inset 0 -2px 0 rgba(196, 60, 60, 0.7);
}
button.ffl-mark.is-decision:hover {
  background: rgba(46, 155, 82, 0.14);
  box-shadow: inset 0 -2px 0 rgba(46, 155, 82, 0.7);
}
button.ffl-mark.is-efficiency:hover {
  background: rgba(201, 147, 43, 0.16);
  box-shadow: inset 0 -2px 0 rgba(201, 147, 43, 0.7);
}
.ffl-mark-tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translateX(-50%);
  z-index: 12;
  width: max-content;
  min-width: 148px;
  max-width: min(260px, 70vw);
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--ffl-paper, #F8F6F2) 92%, #fff);
  border: 1px solid rgba(30, 30, 32, 0.08);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 10px 28px rgba(15, 23, 42, 0.10);
  pointer-events: none;
  text-align: left;
  animation: fflMarkTipIn 0.16s var(--ffl-ease) both;
}
.ffl-mark-tip::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  margin-top: -4px;
  background: inherit;
  border-right: 1px solid rgba(30, 30, 32, 0.08);
  border-bottom: 1px solid rgba(30, 30, 32, 0.08);
  transform: rotate(45deg);
}
@keyframes fflMarkTipIn {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.ffl-mark-tip-title {
  display: block;
  margin: 0;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-size: 13.5px;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.35;
  color: var(--ffl-ink);
}
.ffl-mark-tip-hint {
  display: block;
  margin: 5px 0 0;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-size: 12px;
  line-height: 1.4;
  color: var(--ffl-muted);
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
  opacity: calc(0.22 + (1 - var(--ffl-read)) * 0.12);
}
.ffl.is-reading.has-detail .ffl-detail {
  opacity: calc(1 - var(--ffl-read) * 0.06);
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
.ffl-read-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
  transition: opacity 0.25s var(--ffl-ease);
  flex: 1;
  min-width: 0;
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

/* ── Stage ── */
.ffl-stage {
  position: relative;
  height: 100%;
  min-height: 620px;
  width: 100%;
  transform: translate3d(calc(var(--ffl-read) * 42px), 0, 0);
  opacity: 1;
  filter: none;
  transition:
    transform 0.55s var(--ffl-ease),
    opacity 0.5s var(--ffl-ease),
    filter 0.5s var(--ffl-ease);
  will-change: transform, opacity, filter;
}
.ffl.has-detail .ffl-stage {
  transform: translate3d(calc(var(--ffl-read) * 56px), 0, 0);
}
/* Bericht: flow slides out right with soft glass blur */
.ffl-stage.is-report-exit {
  position: absolute;
  right: clamp(8px, 2vw, 28px);
  top: 50%;
  width: min(520px, 44vw);
  min-height: 520px;
  margin: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transform: translate3d(64px, -50%, 0) scale(0.96);
  filter: blur(16px) saturate(1.08) brightness(1.04);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
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
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  cursor: pointer; white-space: nowrap;
  z-index: 3;
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
.ffl-node-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
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
.ffl-node-label {
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: 16.5px;
  letter-spacing: -0.012em;
  color: var(--ffl-ink);
}
.ffl-node-meta {
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: 14.5px;
  color: var(--ffl-muted);
  letter-spacing: -0.005em;
}
.ffl-node-meta.is-red { color: var(--ffl-red); }
.ffl-node-meta.is-green { color: var(--ffl-green); }
.ffl-node-meta.is-blue { color: var(--ffl-blue); }
.ffl-node-line {
  max-width: 22ch;
  white-space: normal;
  text-align: left;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 1.35;
  letter-spacing: -0.014em;
  color: var(--ffl-ink);
}

.ffl-node.is-focus {
  transform: translate(-50%, -50%) scale(1.04);
  z-index: 5;
  white-space: normal;
}
.ffl-node.is-focus .ffl-node-orb {
  border-color: rgba(30, 30, 32, 0.22);
  box-shadow: 0 0 0 6px rgba(30, 30, 32, 0.04);
}
.ffl-node.is-dim { opacity: 0.34; filter: saturate(0.6); }

/* ── Detail ── */
.ffl-detail {
  position: relative;
  align-self: start;
  display: flex; flex-direction: column; gap: 8px;
  padding: 4px 0 4px clamp(18px, 2.2vw, 32px);
  border-left: 1px solid rgba(15, 15, 18, 0.045);
  max-height: none;
  overflow: visible;
  z-index: 4;
  transform: translate3d(calc(var(--ffl-read) * 72px), 0, 0);
  transition: transform 0.2s var(--ffl-ease), opacity 0.2s var(--ffl-ease);
  will-change: transform;
  animation: fflDetailIn 0.42s var(--ffl-ease) both;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
}
.ffl-detail::-webkit-scrollbar { display: none; }
@keyframes fflDetailIn {
  from { opacity: 0; transform: translate3d(calc(18px + var(--ffl-read) * 72px), 0, 0); }
  to { opacity: 1; transform: translate3d(calc(var(--ffl-read) * 72px), 0, 0); }
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

.ffl-detail-head { display: flex; align-items: center; gap: 10px; padding-right: 40px; margin-bottom: 4px; }
.ffl-detail-title {
  margin: 0;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: 24px;
  letter-spacing: -0.022em;
  color: var(--ffl-ink);
}

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
  .ffl.has-detail .ffl-report,
  .ffl.has-detail .ffl-stage {
    position: static;
    max-height: none;
    min-height: 0;
  }
  .ffl-bridge { display: none; }
  .ffl-stage { min-height: 440px; }
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
html[data-theme="dark"] .ffl-mark-tip,
html[data-theme="classic-dark"] .ffl-mark-tip {
  background: #1A1A1E;
  border-color: rgba(255, 255, 255, 0.10);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}
html[data-theme="dark"] .ffl-mark-tip-title,
html[data-theme="classic-dark"] .ffl-mark-tip-title { color: #E6E6EA; }
html[data-theme="dark"] .ffl-mark-tip-hint,
html[data-theme="classic-dark"] .ffl-mark-tip-hint { color: rgba(245, 245, 247, 0.55); }

@media (prefers-reduced-motion: reduce) {
  .ffl, .ffl-node, .ffl-node-orb, .ffl-cta, .ffl-detail, .ffl-lyric, .ffl-report, .ffl-stage, .ffl-greet, .ffl-read {
    transition: none !important; animation: none !important;
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
