/**
 * Shared Overview story panels — mobile stack + desktop right canvas.
 * Editorial Aeonik Regular, constellation marks, quiet hairlines — no card chrome.
 */

export const FESTAG_OVERVIEW_PANEL_STYLES = `
.osp-stack,
.osp-rail {
  --fos-ink: #1E1E20;
  --fos-muted: #8891a0;
  --fos-primary: #C9932B;
  --fos-line: rgba(15, 15, 18, 0.07);
  --fos-ease: cubic-bezier(0.22, 1, 0.36, 1);
  display: flex;
  flex-direction: column;
  gap: 0;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
}
.osp-rail {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 4px;
}

.fos-panel {
  margin: 0;
  padding: 6px 0 22px;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  animation: ospRailPanelIn 0.55s var(--fos-ease) both;
}
.fos-panel + .fos-panel {
  margin-top: 6px;
  padding-top: 20px;
  border-top: 1px solid var(--fos-line);
}
@keyframes ospRailPanelIn {
  from { opacity: 0; transform: translateX(12px); }
  to { opacity: 1; transform: none; }
}
.osp-rail .fos-panel.is-tagro {
  animation-delay: 0.08s;
}

.fos-panel-title {
  margin: 0 0 18px;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: clamp(18px, 1.7vw, 22px);
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--fos-ink);
  max-width: 28ch;
}

.fos-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.fos-option {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  width: 100% !important;
  min-height: 44px !important;
  height: auto !important;
  padding: 10px 4px !important;
  border-radius: 0 !important;
  border: none !important;
  border-bottom: 1px solid transparent !important;
  background: transparent !important;
  box-shadow: none !important;
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: background 0.18s var(--fos-ease);
}
.fos-option:hover {
  background: rgba(15, 15, 18, 0.025) !important;
}
.fos-option.is-on {
  background: transparent !important;
}
.fos-option-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.fos-option-label {
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 1.3;
  letter-spacing: -0.015em;
  color: var(--fos-ink);
}
.fos-option.is-on .fos-option-label {
  color: var(--fos-ink);
}
.fos-option.is-rec .fos-option-label {
  color: var(--fos-primary);
}
.fos-option-hint {
  font-size: 13px;
  line-height: 1.35;
  color: var(--fos-muted);
}

.fos-tagro-lead {
  margin: 0 0 16px;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: clamp(18px, 1.7vw, 22px);
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--fos-ink);
  max-width: 28ch;
}
.fos-tagro-lead em {
  font-style: normal;
  color: var(--fos-primary);
}
.fos-tagro-reasons {
  list-style: none;
  margin: 0 0 18px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fos-tagro-reasons li {
  position: relative;
  padding-left: 14px;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: 14.5px;
  line-height: 1.5;
  color: var(--fos-muted);
  max-width: 32ch;
}
.fos-tagro-reasons li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(58, 58, 66, 0.35);
}
.fos-tagro-error {
  margin: 0 0 12px;
  font-size: 14px;
  color: #C45B52;
}

.fos-btn-primary {
  width: auto !important;
  min-width: 0;
  height: 40px !important;
  padding: 0 16px !important;
  border-radius: 8px !important;
  border: 1px solid rgba(30, 30, 32, 0.08) !important;
  background: #FFFFFF !important;
  color: #1e1e20 !important;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif !important;
  font-weight: 400 !important;
  font-size: 14.5px !important;
  letter-spacing: -0.01em;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  cursor: pointer;
  margin-bottom: 0;
  transition: background 0.2s var(--fos-ease);
}
.fos-btn-primary:hover:not(:disabled) { background: #fafafa !important; }
.fos-btn-primary:disabled { opacity: 0.4; cursor: default; }

.fos-text-action {
  display: inline-block;
  width: auto !important;
  height: auto !important;
  min-height: 0;
  margin-top: 14px;
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  font-size: 14.5px;
  letter-spacing: -0.01em;
  color: var(--fos-muted);
  cursor: pointer;
  text-align: left;
}
.fos-text-action:hover { color: var(--fos-ink); }

html[data-theme="dark"] .osp-stack,
html[data-theme="dark"] .osp-rail,
html[data-theme="classic-dark"] .osp-stack,
html[data-theme="classic-dark"] .osp-rail {
  --fos-ink: #E6E6EA;
  --fos-muted: rgba(245, 245, 247, 0.55);
  --fos-line: rgba(255, 255, 255, 0.08);
}
html[data-theme="dark"] .fos-btn-primary,
html[data-theme="classic-dark"] .fos-btn-primary {
  background: rgba(186, 194, 210, 0.08) !important;
  color: rgba(245, 245, 247, 0.88) !important;
  border-color: rgba(255, 255, 255, 0.06) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12) !important;
}
html[data-theme="dark"] .fos-btn-primary:hover:not(:disabled),
html[data-theme="classic-dark"] .fos-btn-primary:hover:not(:disabled) {
  background: rgba(186, 194, 210, 0.12) !important;
}
`.trim()
