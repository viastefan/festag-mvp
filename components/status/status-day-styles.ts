/** Status day ritual — calm, addictive, one hero report. */
export const STATUS_DAY_CSS = `
.st-day {
  --st-day-ink: #1e1e20;
  --st-day-muted: #8891a0;
  --st-day-soft: #6e6e73;
  --st-day-line: rgba(15, 23, 42, 0.08);
  --st-day-surface: #ffffff;
  --st-day-canvas: transparent;
  --st-day-hover: rgba(15, 23, 42, 0.04);
  --st-day-pad-x: clamp(24px, 8vw, 120px);
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: auto;
  overflow-x: hidden;
  padding: clamp(40px, 5vh, 64px) var(--st-day-pad-x) clamp(56px, 8vh, 96px);
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--st-day-ink);
  background: var(--st-day-canvas);
}

.st-day-inner {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.st-day-mobile-chrome,
.st-day-mobile-head { display: none; }

.st-day-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  position: relative;
  z-index: 4;
}

.st-day-context {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.st-day-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--st-day-line);
  background: transparent;
  color: var(--st-day-ink);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.st-day-pill:hover,
.st-day-pill.on {
  background: var(--st-day-hover);
  border-color: rgba(15, 23, 42, 0.12);
}
.st-day-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.st-day-refresh {
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 0;
  background: transparent;
  color: var(--st-day-muted);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s ease, background 0.12s ease;
}
.st-day-refresh:hover:not(:disabled) {
  color: var(--st-day-ink);
  background: var(--st-day-hover);
}
.st-day-refresh:disabled { opacity: 0.5; cursor: default; }

.st-day-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  border: 0;
  background: transparent;
  cursor: default;
}

.st-day-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 30;
  min-width: 220px;
  max-width: min(320px, 80vw);
  max-height: min(360px, 50vh);
  overflow: auto;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid var(--st-day-line);
  background: var(--st-day-surface);
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.10);
}
.st-day-menu--period { left: auto; }
.st-day-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 34px;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--st-day-ink);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.st-day-menu-item:hover,
.st-day-menu-item.on { background: var(--st-day-hover); }
.st-day-menu-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Hero — the daily click ── */
.st-day-hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 22px 22px 18px;
  border-radius: 14px;
  border: 1px solid var(--st-day-line);
  background: var(--st-day-surface);
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03);
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: border-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
}
.st-day-hero:hover {
  border-color: rgba(15, 23, 42, 0.14);
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}
.st-day-hero:active { transform: none; }
.st-day-hero:disabled { opacity: 0.72; cursor: default; transform: none; }

.st-day-hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
.st-day-hero-date {
  margin: 0;
  font-size: 12.5px;
  color: var(--st-day-muted);
  font-weight: 400;
}
.st-day-hero-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  background: rgba(46, 155, 82, 0.1);
  color: #248A44;
  font-size: 11.5px;
  font-weight: 500;
}
.st-day-hero-title {
  margin: 2px 0 0;
  font-size: 28px;
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: var(--st-day-ink);
}
.st-day-hero-sub {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--st-day-soft);
  max-width: 36em;
}
.st-day-hero-lines {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.st-day-hero-lines li {
  position: relative;
  padding-left: 14px;
  font-size: 14px;
  line-height: 1.45;
  color: var(--st-day-ink);
}
.st-day-hero-lines li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--st-day-ink) 28%, transparent);
}
.st-day-hero-empty {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--st-day-muted);
}

.st-day-hero-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  width: 100%;
}
.st-day-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.st-day-btn--ghost {
  background: transparent;
  border-color: var(--st-day-line);
  color: var(--st-day-ink);
}
.st-day-btn--ghost:hover:not(:disabled) {
  background: var(--st-day-hover);
}
.st-day-btn--primary {
  background: var(--festag-btn-dark-bg, #ffffff);
  color: var(--festag-btn-dark-fg, #1e1e20);
  border-color: var(--festag-btn-dark-border, rgba(30, 30, 32, 0.1));
  margin-left: auto;
}
.st-day-btn--primary:hover:not(:disabled) {
  background: var(--festag-btn-dark-bg-hover, #fafafa);
}
.st-day-btn:disabled { opacity: 0.45; cursor: default; }

/* ── Signals ── */
.st-day-signals {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border: 1px solid var(--st-day-line);
  border-radius: 12px;
  background: var(--st-day-surface);
  overflow: hidden;
}
.st-day-signal {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 12px 14px;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--st-day-line);
  transition: background 0.12s ease;
}
.st-day-signal:last-child { border-bottom: 0; }
.st-day-signal:hover { background: var(--st-day-hover); }
.st-day-signal-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--st-day-hover);
  color: var(--st-day-soft);
  flex-shrink: 0;
}
.st-day-signal-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.st-day-signal-label {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--st-day-ink);
}
.st-day-signal-hint {
  font-size: 12.5px;
  color: var(--st-day-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-day-signal-badge {
  flex-shrink: 0;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--st-day-hover);
  color: var(--st-day-ink);
  font-size: 11.5px;
  font-weight: 500;
}
.st-day-signal-arrow {
  flex-shrink: 0;
  color: var(--st-day-muted);
  opacity: 0.7;
}

/* ── Tagro ask ── */
.st-day-ask {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--st-day-line);
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: border-color 0.14s ease, background 0.14s ease;
}
.st-day-ask:hover {
  background: var(--st-day-surface);
  border-color: rgba(15, 23, 42, 0.12);
}
.st-day-ask-mark {
  display: inline-flex;
  color: var(--st-day-muted);
  flex-shrink: 0;
}
.st-day-ask-placeholder {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  color: var(--st-day-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-day-ask-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: #1e1e20;
  color: #f5f5f7;
  flex-shrink: 0;
}

/* ── Dark — Festag Night ── */
html[data-theme="dark"] .st-day,
html[data-theme="classic-dark"] .st-day {
  --st-day-ink: var(--festag-night-ink, #E8EAF0);
  --st-day-muted: var(--festag-night-ink-3, rgba(228, 228, 234, 0.40));
  --st-day-soft: var(--festag-night-ink-2, rgba(228, 228, 234, 0.58));
  --st-day-line: var(--festag-night-line, rgba(255, 255, 255, 0.065));
  --st-day-surface: var(--festag-black-content, #111318);
  --st-day-hover: var(--festag-night-fill, rgba(255, 255, 255, 0.055));
}
html[data-theme="dark"] .st-day-hero,
html[data-theme="classic-dark"] .st-day-hero {
  box-shadow: none;
}
html[data-theme="dark"] .st-day-hero:hover,
html[data-theme="classic-dark"] .st-day-hero:hover {
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.32);
  border-color: var(--festag-night-line-strong, rgba(255, 255, 255, 0.10));
}
html[data-theme="dark"] .st-day-btn--primary,
html[data-theme="classic-dark"] .st-day-btn--primary {
  background: var(--festag-btn-dark-bg, #5B647D);
  color: var(--festag-btn-dark-fg, #E8EAF0);
}
html[data-theme="dark"] .st-day-btn--primary:hover:not(:disabled),
html[data-theme="classic-dark"] .st-day-btn--primary:hover:not(:disabled) {
  background: var(--festag-btn-dark-bg-hover, #6A738C);
}
html[data-theme="dark"] .st-day-ask-send,
html[data-theme="classic-dark"] .st-day-ask-send {
  background: var(--festag-btn-dark-bg, #5B647D);
  color: var(--festag-btn-dark-fg, #E8EAF0);
}
html[data-theme="dark"] .st-day-menu,
html[data-theme="classic-dark"] .st-day-menu {
  background: var(--festag-black-popup, #1C2028);
  border-color: var(--festag-night-line, rgba(255, 255, 255, 0.065));
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.48);
}
html[data-theme="dark"] .st-day-hero-badge,
html[data-theme="classic-dark"] .st-day-hero-badge {
  background: var(--green-bg, rgba(75, 201, 142, 0.12));
  color: var(--success-text, #A8E4C4);
}

/* Light primary — white fill (Festag light CTA rule) */
html[data-theme="light"] .st-day-btn--primary,
html[data-theme="read"] .st-day-btn--primary,
html[data-theme="pure-light"] .st-day-btn--primary {
  background: #ffffff;
  color: #1e1e20;
  border-color: rgba(30, 30, 32, 0.1);
}
html[data-theme="light"] .st-day-ask-send,
html[data-theme="read"] .st-day-ask-send,
html[data-theme="pure-light"] .st-day-ask-send {
  background: #1e1e20;
  color: #f5f5f7;
}

@media (max-width: 768px) {
  .st-day {
    padding: 0 16px max(120px, calc(96px + env(safe-area-inset-bottom, 0px)));
  }
  .st-day-mobile-chrome { display: block; }
  .st-day-mobile-head {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0 0 12px;
    padding: calc(14px + env(safe-area-inset-top, 0px)) 0 0;
    position: sticky;
    top: 0;
    z-index: 4;
    background: transparent;
  }
  .st-day-mobile-nav {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-height: 36px;
  }
  .st-day-mobile-nav-spacer { flex: 1; }
  .st-day-mobile-title {
    margin: 8px 0 0;
    font-size: 26px;
    font-weight: 400;
    letter-spacing: -0.5px;
    line-height: 1.02;
    color: var(--st-day-ink);
  }
  .st-day-hero-title { font-size: 22px; }
  .st-day-hero { padding: 18px 16px 16px; border-radius: 12px; }
  .st-day-top { margin-top: 4px; }
}

@media (prefers-reduced-motion: reduce) {
  .st-day-hero,
  .st-day-signal,
  .st-day-ask,
  .st-day-pill { transition: none; }
  .st-day-hero:hover { transform: none; }
}
`
