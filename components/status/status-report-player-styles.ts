/** Status Report Player — Tagro Experience Engine home surface. */

export const STATUS_REPORT_PLAYER_CSS = `
.srp {
  --srp-ink: #1e1e20;
  --srp-muted: #8891a0;
  --srp-soft: #86868b;
  --srp-line: rgba(15, 23, 42, 0.08);
  --srp-hover: rgba(15, 23, 42, 0.04);
  --srp-shell-bg: transparent;
  --wsb-shell-bg: var(--festag-plate-bg, #ffffff);
  --wsb-prose-size: clamp(22px, 2.4vw, 28px);
  --wsb-line-height: 1.45;
  --wsb-lines-visible: 7;
  --wsb-prose-max-width: min(520px, 86vw);
  --wsb-viewport-height: calc(var(--wsb-prose-size) * var(--wsb-line-height) * var(--wsb-lines-visible));
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--srp-ink);
  background: var(--srp-shell-bg);
}

[data-theme='dark'] .srp,
[data-theme='classic-dark'] .srp {
  --srp-ink: var(--festag-night-ink, #E8EAF0);
  --srp-muted: rgba(245, 245, 247, 0.55);
  --srp-soft: rgba(232, 232, 238, 0.42);
  --srp-line: rgba(255, 255, 255, 0.08);
  --srp-hover: rgba(255, 255, 255, 0.05);
  --wsb-shell-bg: var(--festag-plate-bg, #0E0E10);
}

.srp-top {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  padding: clamp(28px, 4vh, 48px) clamp(24px, 6vw, 64px) 0;
}

.srp-context {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.srp-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--srp-line);
  background: transparent;
  color: var(--srp-ink);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.srp-pill:hover,
.srp-pill.on {
  background: var(--srp-hover);
  border-color: rgba(15, 23, 42, 0.12);
}
[data-theme='dark'] .srp-pill:hover,
[data-theme='dark'] .srp-pill.on,
[data-theme='classic-dark'] .srp-pill:hover,
[data-theme='classic-dark'] .srp-pill.on {
  border-color: rgba(255, 255, 255, 0.12);
}

.srp-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.srp-refresh {
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 0;
  background: transparent;
  color: var(--srp-muted);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s ease, background 0.12s ease;
}
.srp-refresh:hover:not(:disabled) {
  color: var(--srp-ink);
  background: var(--srp-hover);
}
.srp-refresh:disabled { opacity: 0.5; cursor: default; }

.srp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 5;
  border: 0;
  background: transparent;
  cursor: default;
}
.srp-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 6;
  min-width: 200px;
  max-width: min(280px, 70vw);
  padding: 6px;
  border-radius: 10px;
  border: 1px solid var(--srp-line);
  background: var(--wsb-shell-bg, #fff);
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
[data-theme='dark'] .srp-menu,
[data-theme='classic-dark'] .srp-menu {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}
.srp-menu--period { left: auto; }
.srp-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 34px;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--srp-ink);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.srp-menu-item:hover { background: var(--srp-hover); }
.srp-menu-item.on { background: var(--srp-hover); }
.srp-menu-label { flex: 1; min-width: 0; }

.srp-stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px clamp(20px, 5vw, 48px) 120px;
  position: relative;
}

.srp-idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  text-align: center;
  max-width: 420px;
}

.srp-idle-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.srp-idle-project {
  margin: 0;
  font-size: 15px;
  color: var(--srp-muted);
  letter-spacing: -0.01em;
}

.srp-idle-duration {
  margin: 0;
  font-size: 13px;
  color: var(--srp-soft);
}

.srp-play {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 1px solid rgba(30, 30, 32, 0.08);
  background: #ffffff;
  color: #1e1e20;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.14s ease, transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}
.srp-play:hover:not(:disabled) {
  background: #fafafa;
  transform: scale(1.03);
}
.srp-play:active:not(:disabled) {
  background: #f5f5f6;
  box-shadow: none;
  transform: scale(0.98);
}
.srp-play:disabled {
  opacity: 0.45;
  cursor: default;
}
.srp-play svg { margin-left: 3px; }

[data-theme='dark'] .srp-play,
[data-theme='classic-dark'] .srp-play {
  background: rgba(186, 194, 210, 0.08);
  color: rgba(245, 245, 247, 0.88);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
[data-theme='dark'] .srp-play:hover:not(:disabled),
[data-theme='classic-dark'] .srp-play:hover:not(:disabled) {
  background: rgba(186, 194, 210, 0.09);
}
[data-theme='dark'] .srp-play:active:not(:disabled),
[data-theme='classic-dark'] .srp-play:active:not(:disabled) {
  background: rgba(186, 194, 210, 0.11);
  box-shadow: none;
}

.srp-idle-hint {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--srp-muted);
  max-width: 280px;
}

.srp-live {
  width: 100%;
  max-width: var(--wsb-prose-max-width);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  min-height: 0;
  flex: 1 1 auto;
  justify-content: center;
}

.srp-lyrics {
  width: 100%;
  display: flex;
  justify-content: center;
  min-height: 0;
}

/* Lyrics engine (shared class names with BriefingLyricsFlow) */
.srp .wsb-lyrics-mask {
  width: 100%;
  max-width: 100%;
  min-height: 0;
  flex: 0 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

.srp .wsb-lyrics-stage {
  position: relative;
  width: var(--wsb-prose-max-width);
  max-width: var(--wsb-prose-max-width);
  min-width: min(100%, var(--wsb-prose-max-width));
  height: var(--wsb-viewport-height);
  max-height: var(--wsb-viewport-height);
  flex: 0 0 var(--wsb-viewport-height);
  overflow: hidden;
  -webkit-mask-image: linear-gradient(
    180deg,
    transparent 0%,
    rgba(0, 0, 0, 0.35) 8%,
    #000 22%,
    #000 78%,
    rgba(0, 0, 0, 0.4) 92%,
    transparent 100%
  );
  mask-image: linear-gradient(
    180deg,
    transparent 0%,
    rgba(0, 0, 0, 0.35) 8%,
    #000 22%,
    #000 78%,
    rgba(0, 0, 0, 0.4) 92%,
    transparent 100%
  );
  overscroll-behavior: contain;
}

.srp .wsb-lyrics-stage--manual {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.srp .wsb-lyrics-stage--manual::-webkit-scrollbar { display: none; }

.srp .wsb-lyrics-stage::before,
.srp .wsb-lyrics-stage::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  z-index: 2;
  pointer-events: none;
}
.srp .wsb-lyrics-stage::before {
  top: 0;
  height: 52%;
  background: linear-gradient(
    180deg,
    var(--wsb-shell-bg, #fff) 0%,
    color-mix(in srgb, var(--wsb-shell-bg, #fff) 72%, transparent) 38%,
    transparent 100%
  );
}
.srp .wsb-lyrics-stage::after {
  bottom: 0;
  height: 28%;
  background: linear-gradient(
    0deg,
    var(--wsb-shell-bg, #fff) 0%,
    color-mix(in srgb, var(--wsb-shell-bg, #fff) 55%, transparent) 55%,
    transparent 100%
  );
}
.srp .wsb-lyrics-stage--idle::before {
  height: 38%;
  opacity: 0.85;
}

.srp .wsb-lyrics-track {
  width: 100%;
  max-width: var(--wsb-prose-max-width, 520px);
  margin: 0 auto;
  padding: calc(var(--wsb-viewport-height) * 0.22) 0 calc(var(--wsb-viewport-height) * 1.4) 0;
  box-sizing: border-box;
  will-change: transform;
  transition: transform 0.78s cubic-bezier(0.22, 1, 0.36, 1);
}

.srp .wsb-prose {
  margin: 0 auto;
  width: 100%;
  max-width: var(--wsb-prose-max-width, 520px);
  text-align: center;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: var(--wsb-prose-size, 25px);
  font-weight: 400;
  font-synthesis: none;
  line-height: var(--wsb-line-height, 1.45);
  letter-spacing: -0.5px;
  color: var(--srp-ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.srp .wsb-prose-word {
  display: inline;
  font-weight: 400;
  letter-spacing: inherit;
  color: var(--srp-soft);
  transition:
    opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.srp .wsb-lyrics-stage--idle .wsb-prose-word--lead {
  color: var(--srp-ink);
  opacity: 0.82;
}
.srp .wsb-lyrics-stage--idle .wsb-prose-word--future {
  color: var(--srp-soft);
  opacity: 0.48;
}
.srp .wsb-prose-word--future,
.srp .wsb-prose-word--adjacent {
  color: var(--srp-soft);
  opacity: 0.38;
}
.srp .wsb-prose-word--past {
  color: var(--srp-soft);
  opacity: 0.52;
}
.srp .wsb-prose-word--lead {
  color: var(--srp-ink);
  opacity: 0.68;
}
.srp .wsb-prose-word--active.wsb-prose-word--pending {
  color: var(--srp-soft);
  opacity: 0.44;
}
.srp .wsb-prose-word--active.wsb-prose-word--spoken {
  color: var(--srp-ink);
  opacity: 0.94;
}
.srp .wsb-prose-word--active.wsb-prose-word--current {
  color: var(--srp-ink);
  opacity: 1;
}
.srp .wsb-lyrics-stage--live .wsb-prose-word--past {
  color: var(--srp-soft);
  opacity: 0.5;
}

.srp-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex-shrink: 0;
}

.srp-ctrl {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(30, 30, 32, 0.08);
  background: #ffffff;
  color: #1e1e20;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.12s ease;
}
.srp-ctrl:hover { background: #fafafa; }
.srp-ctrl:active { background: #f5f5f6; box-shadow: none; }
.srp-ctrl--play {
  width: 52px;
  height: 52px;
}
.srp-ctrl--play svg { margin-left: 2px; }
.srp-ctrl--ghost {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--srp-muted);
}
.srp-ctrl--ghost:hover {
  background: var(--srp-hover);
  color: var(--srp-ink);
}

[data-theme='dark'] .srp-ctrl,
[data-theme='classic-dark'] .srp-ctrl {
  background: rgba(186, 194, 210, 0.08);
  color: rgba(245, 245, 247, 0.88);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
[data-theme='dark'] .srp-ctrl:hover,
[data-theme='classic-dark'] .srp-ctrl:hover {
  background: rgba(186, 194, 210, 0.09);
}
[data-theme='dark'] .srp-ctrl--ghost,
[data-theme='classic-dark'] .srp-ctrl--ghost {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

.srp-progress {
  width: min(280px, 70vw);
  height: 2px;
  border-radius: 999px;
  background: rgba(30, 30, 32, 0.08);
  overflow: hidden;
  cursor: pointer;
}
[data-theme='dark'] .srp-progress,
[data-theme='classic-dark'] .srp-progress {
  background: rgba(255, 255, 255, 0.1);
}
.srp-progress-fill {
  height: 100%;
  background: var(--srp-ink);
  opacity: 0.55;
  border-radius: inherit;
  transition: width 0.2s linear;
}

@media (prefers-reduced-motion: reduce) {
  .srp .wsb-lyrics-track,
  .srp .wsb-prose-word,
  .srp-play,
  .srp-progress-fill {
    transition: none !important;
  }
}
`
