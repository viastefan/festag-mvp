/**
 * Shared Overview story panels — mobile stack + desktop right canvas.
 */

export const FESTAG_OVERVIEW_PANEL_STYLES = `
.osp-stack,
.osp-rail {
  --fos-ink: #1A1917;
  --fos-muted: #8A8680;
  --fos-primary: #5B647D;
  --fos-sheet: #FFFFFF;
  --fos-ease: cubic-bezier(0.22, 1, 0.36, 1);
  display: flex;
  flex-direction: column;
  gap: 0;
}
.osp-rail {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 4px;
}

.fos-panel {
  margin-top: 8px;
  padding: 22px 20px 20px;
  border-radius: 16px;
  background: var(--fos-sheet);
  border: 1px solid rgba(26, 25, 23, 0.05);
  box-shadow: 0 18px 48px rgba(20, 20, 20, 0.06), 0 2px 8px rgba(20, 20, 20, 0.03);
  animation: ospPanelIn 0.65s var(--fos-ease) both;
}
.osp-rail .fos-panel:first-child { margin-top: 0; }
.fos-panel.is-tagro {
  margin-top: 14px;
  animation-delay: 0.08s;
}
@keyframes ospPanelIn {
  from { opacity: 0; transform: translateY(14px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
.osp-rail .fos-panel {
  animation: ospRailPanelIn 0.62s var(--fos-ease) both;
}
.osp-rail .fos-panel.is-tagro {
  animation-delay: 0.1s;
}
@keyframes ospRailPanelIn {
  from { opacity: 0; transform: translateX(18px); filter: blur(2px); }
  to { opacity: 1; transform: none; filter: blur(0); }
}

.fos-panel-label {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.2;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fos-primary);
  font-weight: 400;
}
.fos-panel-title {
  margin: 0 0 20px;
  font-size: clamp(22px, 2.2vw, 28px);
  line-height: 1.22;
  letter-spacing: -0.03em;
  font-weight: 400;
  color: var(--fos-ink);
}

.fos-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fos-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100% !important;
  min-height: 52px !important;
  height: auto !important;
  padding: 14px 16px !important;
  border-radius: 12px !important;
  border: 1px solid rgba(26, 25, 23, 0.07) !important;
  background: transparent !important;
  box-shadow: none !important;
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: background 0.2s var(--fos-ease), border-color 0.2s var(--fos-ease);
}
.fos-option.is-on {
  background: rgba(91, 100, 125, 0.05) !important;
  border-color: rgba(91, 100, 125, 0.22) !important;
}
.fos-option-label {
  font-size: 17px;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--fos-ink);
}
.fos-option-hint {
  font-size: 13px;
  line-height: 1.35;
  color: var(--fos-muted);
}
.fos-option.is-rec .fos-option-label { color: var(--fos-primary); }

.fos-tagro-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  letter-spacing: -0.01em;
  color: var(--fos-muted);
}
.fos-tagro-head svg { color: var(--fos-primary); opacity: 0.85; }
.fos-tagro-pick {
  margin: 0 0 16px;
  font-size: clamp(24px, 2.4vw, 30px);
  line-height: 1.15;
  letter-spacing: -0.035em;
  color: var(--fos-primary);
}
.fos-tagro-why {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--fos-muted);
  letter-spacing: -0.01em;
}
.fos-tagro-reasons {
  list-style: none;
  margin: 0 0 18px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fos-tagro-reasons li {
  position: relative;
  padding-left: 18px;
  font-size: 15px;
  line-height: 1.45;
  color: var(--fos-muted);
}
.fos-tagro-reasons li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--fos-primary);
  opacity: 0.55;
}
.fos-tagro-error {
  margin: 0 0 12px;
  font-size: 14px;
  color: #C45B52;
}

.fos-btn-primary {
  width: 100% !important;
  height: 46px !important;
  border-radius: 10px !important;
  border: 1px solid rgba(30, 30, 32, 0.08) !important;
  background: #ffffff !important;
  color: #1e1e20 !important;
  font-size: 15px !important;
  letter-spacing: -0.015em;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  cursor: pointer;
  margin-bottom: 8px;
  font: inherit;
}
.fos-btn-primary:hover:not(:disabled) { background: #fafafa !important; }
.fos-btn-primary:disabled { opacity: 0.45; cursor: default; }

.fos-text-action {
  display: block;
  width: 100% !important;
  height: auto !important;
  min-height: 40px;
  padding: 8px 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  font-size: 15px;
  letter-spacing: -0.01em;
  color: var(--fos-primary);
  cursor: pointer;
  text-align: center;
  font: inherit;
}
`.trim()
