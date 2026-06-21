import { FESTAG_CONTENT_HEAD_CSS } from '@/components/mobile/mobile-codex-list-styles'

export const SETTINGS_CODEX_CSS = `
${FESTAG_CONTENT_HEAD_CSS}

.set-codex {
  --set-row-pad-y: 14px;
  --set-row-pad-x: 0px;
}
.set-codex[data-density="compact"] {
  --set-row-pad-y: 10px;
}
.set-codex[data-density="compact"] .set-row { padding-top: var(--set-row-pad-y); padding-bottom: var(--set-row-pad-y); }
.set-codex[data-density="compact"] .set-main { padding-top: 36px; }

.set-codex-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}
.set-codex-head-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.set-page-title {
  margin: 0;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
  font-weight: 400 !important;
  font-size: 29px !important;
  letter-spacing: -0.5px !important;
  line-height: 1.02 !important;
  color: var(--text);
}
.set-page-lead {
  margin: 0;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.35;
  color: var(--text-secondary);
  max-width: 52ch;
}

.set-dt { display: flex; }
.set-m { display: none; }

.set-m-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
}
.set-m-back:hover { color: var(--text); }
.set-m-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.set-m-section-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  background: var(--surface);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.set-m-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 140;
  border: 0;
  background: rgba(8, 10, 14, 0.42);
  backdrop-filter: blur(4px);
}
.set-m-section-sheet {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  z-index: 141;
  max-height: min(68dvh, 520px);
  overflow: auto;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 14px 10px 10px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
}
.set-m-sheet-title {
  margin: 0 0 10px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.set-m-sheet-group { margin-bottom: 8px; }
.set-m-sheet-group-label {
  margin: 0;
  padding: 6px 8px 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.set-m-sheet-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
}
.set-m-sheet-item:hover { background: var(--surface-2); color: var(--text); }
.set-m-sheet-item.on {
  background: var(--nav-on, var(--surface-2));
  color: var(--nav-on-text, var(--text));
}

.set-invalid-banner {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, #c0362e 25%, var(--border));
  background: rgba(192, 54, 46, 0.06);
  color: #c0362e;
  font-size: 13px;
  line-height: 1.45;
}
.set-invalid-banner a { color: inherit; font-weight: 500; }

.set-loading {
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: set-load-in 0.2s ease both;
}
@keyframes set-load-in { from { opacity: 0; } to { opacity: 1; } }
.set-load-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.set-load-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--text) 6%, transparent) 0%, color-mix(in srgb, var(--text) 12%, transparent) 50%, color-mix(in srgb, var(--text) 6%, transparent) 100%);
  background-size: 200% 100%;
  animation: set-shimmer 1.2s ease-in-out infinite;
}
.set-load-line.w40 { width: 40%; }
.set-load-line.w55 { width: 55%; }
.set-load-line.w70 { width: 70%; }
.set-load-line.w100 { width: 100%; height: 44px; }
@keyframes set-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.set-segment-btn,
.set-segment button {
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.017em;
  color: var(--set-text-secondary, var(--text-secondary));
  padding: 6px 14px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.set-segment-btn:hover,
.set-segment button:hover { color: var(--set-text, var(--text)); }
.set-segment-btn.on,
.set-segment button.on {
  background: var(--set-card, var(--surface));
  color: var(--set-text, var(--text));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.set-insight-card {
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: color-mix(in srgb, var(--surface) 88%, var(--bg) 12%);
}
.set-insight-card strong {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}
.set-insight-card p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-muted);
}

.set-kbd-grid {
  display: grid;
  gap: 0;
}
.set-kbd-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 28%, transparent);
}
.set-kbd-row:last-child { border-bottom: 0; }
.set-kbd-label { font-size: 13.5px; font-weight: 500; }
.set-kbd-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.set-kbd-keys {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.set-kbd-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  padding: 3px 7px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.set-preview-frame {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
  background: var(--bg);
}
.set-preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-muted);
}
.set-preview-body {
  padding: 16px 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.set-preview-pill {
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  background: color-mix(in srgb, var(--text) 8%, transparent);
}
.set-preview-line {
  height: 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--text) 10%, transparent);
}
.set-preview-line.short { width: 55%; }
.set-preview-line.mid { width: 78%; }

@media (max-width: 768px) {
  .set-dt { display: none !important; }
  .set-m { display: flex !important; }
  .set-codex-head { margin-bottom: 18px; }
  .set-page-title { font-size: 24px !important; letter-spacing: -0.6px !important; }
  .set-page-lead.set-m-lead { font-size: 14px; color: var(--text-muted); }
  .set-main { padding-top: 8px !important; }
}
`
