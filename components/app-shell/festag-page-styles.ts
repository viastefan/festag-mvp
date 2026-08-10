/**
 * Shared shell for the "utility" pages (Team, Documents, Activity, Decisions,
 * Risks, Reports) — same warm canvas, same hairline-list grammar as the
 * Overview inbox, same check/dot mark language. One system, several pages.
 *
 * Mobile-first: the list frame, padding and type scale all step down at the
 * 720px/480px breakpoints rather than needing a second, story-style layout —
 * these are plain lists, not the Dashboard's editorial narrative.
 */

import { FESTAG_SAND } from '@/lib/design-tokens/sand-read'

export const FESTAG_PAGE_STYLES = `
.fps {
  --fps-ink: #1E1E20;
  --fps-soft: #5c5c62;
  --fps-muted: #8891a0;
  --fps-line: rgba(15, 15, 18, 0.08);
  --fps-blue: #3B6FD4;
  --fps-red: #C43C3C;
  --fps-green: #2E9B52;
  --fps-amber: #C9932B;
  --fps-canvas: ${FESTAG_SAND.canvas};
  --fps-ease: cubic-bezier(0.16, 1, 0.3, 1);

  width: 100%;
  min-height: calc(100dvh - var(--fas-topbar-h, 68px));
  max-width: min(760px, 100%);
  margin: 0 auto;
  box-sizing: border-box;
  padding: clamp(40px, 6vh, 72px) clamp(20px, 4vw, 40px) clamp(60px, 10vh, 96px);
  color: var(--fps-ink);
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  animation: fpsIn 0.36s var(--fps-ease) both;
}
@keyframes fpsIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.fps-head {
  margin-bottom: clamp(28px, 5vh, 44px);
}
.fps-title {
  margin: 0 0 8px;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: clamp(32px, 4.4vw, 46px);
  line-height: 1.08;
  letter-spacing: -0.026em;
  color: var(--fps-ink);
}
.fps-stat-line {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--fps-soft);
}
.fps-stat-line strong {
  font-weight: 500;
  color: var(--fps-ink);
}

/* ── The list frame — identical grammar to the Overview inbox. ── */
.fps-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 5px;
  border: 1px solid var(--fps-line);
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025), 0 14px 32px -12px rgba(15, 23, 42, 0.09);
}
html[data-theme="dark"] .fps-list,
html[data-theme="classic-dark"] .fps-list {
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03) inset;
}

.fps-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  padding: 16px 14px;
  border-bottom: 1px solid var(--fps-line);
  border-radius: 10px;
}
.fps-list > .fps-row:last-child,
.fps-list > a.fps-row:last-child,
.fps-list > button.fps-row:last-child { border-bottom: none; }

button.fps-row {
  border: 0;
  border-bottom: 1px solid var(--fps-line);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.16s var(--fps-ease);
}
a.fps-row {
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--fps-line);
  transition: background 0.16s var(--fps-ease);
}
button.fps-row:hover, a.fps-row:hover { background: rgba(30, 30, 32, 0.035); }
button.fps-row:focus-visible, a.fps-row:focus-visible {
  outline: 2px solid rgba(59, 111, 212, 0.4);
  outline-offset: -2px;
}

.fps-row-body {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.fps-row-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(30, 30, 32, 0.06);
  color: var(--fps-ink);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
  overflow: hidden;
}
.fps-row-avatar img { width: 100%; height: 100%; object-fit: cover; }

.fps-row-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fps-row-title {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.012em;
  color: var(--fps-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fps-row-sub {
  font-size: 13px;
  letter-spacing: -0.005em;
  color: var(--fps-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fps-row-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.fps-row-meta {
  font-size: 13px;
  letter-spacing: -0.006em;
  color: rgba(30, 30, 32, 0.42);
  white-space: nowrap;
}
.fps-row-meta.is-blue  { color: var(--fps-blue); }
.fps-row-meta.is-red   { color: var(--fps-red); }
.fps-row-meta.is-green { color: var(--fps-green); }
.fps-row-meta.is-amber { color: var(--fps-amber); }

.fps-row-tag {
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(30, 30, 32, 0.05);
  color: rgba(30, 30, 32, 0.55);
  font-size: 12px;
  white-space: nowrap;
}

.fps-chev { color: rgba(30, 30, 32, 0.26); flex-shrink: 0; }
.fps-row:hover .fps-chev { color: rgba(30, 30, 32, 0.45); }

/* Same mark language as the dashboard: check = calm, dot = worth a look. */
.fps-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  border-radius: 50%;
  color: rgba(30, 30, 32, 0.34);
  box-shadow: 0 0 0 1px rgba(30, 30, 32, 0.14) inset;
}
.fps-mark-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.fps-mark.is-attn { color: rgba(30, 30, 32, 0.5); }
.fps-mark.is-attn.is-green { color: var(--fps-green); box-shadow: 0 0 0 1px rgba(46, 155, 82, 0.22) inset; }
.fps-mark.is-attn.is-red   { color: var(--fps-red); box-shadow: 0 0 0 1px rgba(196, 60, 60, 0.22) inset; }

.fps-empty {
  padding: 28px 14px;
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--fps-muted);
  max-width: 40ch;
}

.fps-section + .fps-section { margin-top: clamp(28px, 5vh, 44px); }
.fps-section-title {
  margin: 0 0 12px;
  font-size: 13px;
  letter-spacing: 0.01em;
  color: var(--fps-muted);
}

.fps-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 18px;
}
.fps-filter {
  padding: 6px 13px;
  border: 1px solid var(--fps-line);
  border-radius: 999px;
  background: transparent;
  color: var(--fps-soft);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.16s var(--fps-ease), color 0.16s var(--fps-ease), border-color 0.16s var(--fps-ease);
}
.fps-filter:hover { background: rgba(30, 30, 32, 0.035); }
.fps-filter.is-on {
  background: var(--fps-ink);
  border-color: var(--fps-ink);
  color: #FFFFFF;
}

@media (max-width: 720px) {
  .fps { padding: clamp(28px, 5vh, 40px) 16px clamp(48px, 8vh, 64px); }
  .fps-title { font-size: clamp(28px, 8vw, 34px); }
  .fps-row { padding: 14px 10px; gap: 10px; }
  .fps-row-avatar { width: 30px; height: 30px; font-size: 12px; }
  .fps-row-title { font-size: 14.5px; }
  .fps-row-sub, .fps-row-meta, .fps-row-tag { font-size: 12px; }
}

@media (max-width: 480px) {
  .fps-row-right { gap: 6px; }
  .fps-row-tag { display: none; }
  /* Long titles (activity sentences) wrap instead of truncating — a name
     can afford a single line, a whole event can't. */
  .fps-row { align-items: flex-start; flex-wrap: wrap; }
  .fps-row-title { white-space: normal; overflow: visible; text-overflow: clip; }
  .fps-row-right { padding-top: 2px; }
}

html[data-theme="dark"] .fps,
html[data-theme="classic-dark"] .fps {
  --fps-ink: #F5F4F1; --fps-soft: #B8B6B0; --fps-muted: #8891a0;
  --fps-line: rgba(255, 255, 255, 0.09); --fps-canvas: #0C0D12;
}
html[data-theme="dark"] .fps-row-avatar,
html[data-theme="classic-dark"] .fps-row-avatar { background: rgba(255, 255, 255, 0.08); }
html[data-theme="dark"] .fps-row-tag,
html[data-theme="classic-dark"] .fps-row-tag { background: rgba(255, 255, 255, 0.08); color: rgba(230, 230, 234, 0.65); }
html[data-theme="dark"] button.fps-row:hover,
html[data-theme="dark"] a.fps-row:hover,
html[data-theme="classic-dark"] button.fps-row:hover,
html[data-theme="classic-dark"] a.fps-row:hover { background: rgba(255, 255, 255, 0.045); }
html[data-theme="dark"] .fps-filter.is-on,
html[data-theme="classic-dark"] .fps-filter.is-on { background: #F5F4F1; border-color: #F5F4F1; color: #14151B; }
html[data-theme="dark"] .fps-mark,
html[data-theme="classic-dark"] .fps-mark { color: rgba(245, 245, 247, 0.4); box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16) inset; }

@media (prefers-reduced-motion: reduce) {
  .fps { animation: none !important; }
}
`.trim()
