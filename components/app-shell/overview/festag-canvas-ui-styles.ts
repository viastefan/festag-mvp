/**
 * Festag Overview Canvas — warm ivory light theme.
 * Same surface language as the login panels: #FBF7EE ground, white controls,
 * hairline borders, Aeonik at a readable size. No micro-type anywhere.
 */

export const FESTAG_CANVAS_UI_STYLES = `
.fcv {
  --fcv-bg: #FBF7EE;
  --fcv-ink: #1E1E20;
  --fcv-soft: #5c5c62;
  --fcv-muted: #8891a0;
  --fcv-line: rgba(15, 15, 18, 0.08);
  --fcv-ease: cubic-bezier(0.16, 1, 0.3, 1);

  position: relative;
  display: grid;
  grid-template-columns: minmax(320px, 0.86fr) 1.14fr;
  gap: clamp(24px, 3vw, 56px);
  align-items: center;
  min-height: calc(100dvh - var(--fas-topbar-h, 52px));
  padding: clamp(32px, 5vh, 72px) clamp(28px, 4vw, 72px);
  background: var(--fcv-bg);
  color: var(--fcv-ink);
  animation: fcvIn 0.7s var(--fcv-ease) both;
}
@keyframes fcvIn { from { opacity: 0; } to { opacity: 1; } }

/* ── Left column ── */
.fcv-copy { max-width: 46ch; }
.fcv-greet {
  margin: 0 0 20px;
  font-size: clamp(28px, 3vw, 44px);
  line-height: 1.14;
  letter-spacing: -0.028em;
  font-weight: 400;
  color: var(--fcv-ink);
  text-wrap: balance;
}
.fcv-body {
  margin: 0;
  font-size: 17px;
  line-height: 1.72;
  color: var(--fcv-soft);
}

.fcv-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 30px; }
.fcv-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 46px;
  padding: 0 20px;
  border-radius: 8px;
  font: inherit;
  font-size: 15px;
  letter-spacing: -0.008em;
  cursor: pointer;
  transition: background 0.18s var(--fcv-ease), transform 0.18s var(--fcv-ease),
    border-color 0.18s var(--fcv-ease);
}
.fcv-btn:hover { transform: translateY(-1px); }
.fcv-btn-dark {
  background: #1E1E20;
  color: #FAF8F3;
  border: 1px solid #1E1E20;
  box-shadow: 0 2px 10px rgba(20, 20, 20, 0.14);
}
.fcv-btn-dark:hover { background: #101012; }
.fcv-btn-white {
  background: #FFFFFF;
  color: var(--fcv-ink);
  border: 1px solid rgba(30, 30, 32, 0.10);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.fcv-btn-white:hover { background: #FCFBF8; border-color: rgba(30, 30, 32, 0.16); }

.fcv-intel { margin-top: 26px; max-width: 360px; }

/* ── Stage ── */
.fcv-stage { position: relative; width: 100%; height: 100%; min-height: 460px; }
.fcv-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }

/* ── Team card ── */
.fcv-team {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 268px;
  padding: 18px 20px;
  border-radius: 14px;
  background: #FFFFFF;
  border: 1px solid var(--fcv-line);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03), 0 18px 44px rgba(20, 20, 20, 0.07);
  animation: fcvCard 0.75s var(--fcv-ease) 0.12s both;
}
@keyframes fcvCard {
  from { opacity: 0; transform: translateY(-46%); }
  to { opacity: 1; transform: translateY(-50%); }
}
.fcv-team-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.fcv-team-title { font-size: 16px; color: var(--fcv-ink); }
.fcv-team-meta { font-size: 14px; color: var(--fcv-muted); }
.fcv-team-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 0;
}
.fcv-team-dots { display: inline-flex; gap: 3px; flex-shrink: 0; }
.fcv-team-dots i {
  width: 5px; height: 5px; border-radius: 50%; display: block;
}
.fcv-team-role { flex: 1; font-size: 15px; color: var(--fcv-soft); }
.fcv-team-n {
  font-size: 15px; color: var(--fcv-ink); font-variant-numeric: tabular-nums;
}

/* ── Decision panel ── */
.fcv-scrim {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(251, 247, 238, 0.55);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  animation: fcvFade 0.28s var(--fcv-ease) both;
}
@keyframes fcvFade { from { opacity: 0; } to { opacity: 1; } }
.fcv-panel {
  position: fixed;
  z-index: 70;
  top: 50%;
  right: clamp(24px, 4vw, 64px);
  transform: translateY(-50%);
  width: min(420px, 40vw);
  max-height: 84vh;
  overflow-y: auto;
  padding: 22px;
  border-radius: 16px;
  background: #FFFFFF;
  border: 1px solid var(--fcv-line);
  box-shadow: 0 24px 70px rgba(24, 24, 27, 0.16);
  animation: fcvPanel 0.4s var(--fcv-ease) both;
  scrollbar-width: none;
}
.fcv-panel::-webkit-scrollbar { display: none; }
@keyframes fcvPanel {
  from { opacity: 0; transform: translate(18px, -50%); }
  to { opacity: 1; transform: translate(0, -50%); }
}

@media (max-width: 1100px) {
  .fcv { grid-template-columns: 1fr; align-items: start; }
  .fcv-stage { min-height: 380px; }
  .fcv-team { position: static; transform: none; width: 100%; margin-top: 16px; animation: none; }
  .fcv-panel { right: 0; left: 0; margin: 0 auto; width: min(460px, 92vw); }
}

@media (prefers-reduced-motion: reduce) {
  .fcv, .fcv-team, .fcv-panel, .fcv-scrim { animation: none !important; }
  .fcv-btn:hover { transform: none; }
}
`.trim()
