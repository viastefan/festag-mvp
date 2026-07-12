import { FESTAG_CONTENT_HEAD_CSS } from '@/components/mobile/mobile-codex-list-styles'
import { SETTINGS_PAGE_CSS } from '@/components/settings/settings-page-styles'

export const SETTINGS_CODEX_CSS = `
${FESTAG_CONTENT_HEAD_CSS}

${SETTINGS_PAGE_CSS}

/* ── Vercel-style settings chrome ── */
.set-codex {
  --set-row-pad-y: 16px;
}
.set-codex[data-density="compact"] {
  --set-row-pad-y: 12px;
}
.set-codex[data-density="compact"] .set-row {
  padding-top: var(--set-row-pad-y);
  padding-bottom: var(--set-row-pad-y);
}

.set-codex-frame {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  padding: 32px 24px 80px;
  background: transparent;
}

.set-breadcrumb {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 20px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-muted);
}
.set-breadcrumb a {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.12s;
}
.set-breadcrumb a:hover { color: var(--text); }
.set-breadcrumb-sep { color: var(--text-muted); opacity: 0.55; }
.set-breadcrumb-current {
  color: var(--text);
  font-weight: 500;
}

.set-codex-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.set-codex-head.set-dt {
  flex-direction: column;
  align-items: stretch;
  gap: 0;
}
.set-codex-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}
.set-codex-head-copy {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}
.set-page-title {
  margin: 0;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
  font-weight: 500 !important;
  font-size: 24px !important;
  letter-spacing: -0.02em !important;
  line-height: 1.15 !important;
  color: var(--text);
}

.set-dt { display: flex; flex-direction: column; }
.set-m { display: none; }
.set-m .set-breadcrumb { justify-content: flex-start; margin-bottom: 12px; }

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
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
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
  background: var(--modal-backdrop, rgba(0, 0, 0, 0.72));
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.set-m-section-sheet {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  z-index: 141;
  max-height: min(68dvh, 520px);
  overflow: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 14px 10px 10px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
}
.set-m-sheet-title {
  margin: 0 0 10px;
  padding: 0 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}
.set-m-sheet-group { margin-bottom: 8px; }
.set-m-sheet-group-label {
  margin: 0;
  padding: 8px 8px 4px;
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted);
}
.set-m-sheet-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  text-align: left;
  cursor: pointer;
}
.set-m-sheet-item:hover {
  background: color-mix(in srgb, var(--text) 5%, transparent);
  color: var(--text);
}
.set-m-sheet-item.on {
  background: color-mix(in srgb, var(--text) 8%, transparent);
  color: var(--text);
}

.set-invalid-banner {
  margin: 0;
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, #e5484d 35%, var(--border));
  background: color-mix(in srgb, #e5484d 8%, transparent);
  color: #e5484d;
  font-size: 13px;
  line-height: 1.45;
}
.set-invalid-banner a { color: inherit; font-weight: 500; }

.set-loading {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 24px;
  animation: set-load-in 0.2s ease both;
}
@keyframes set-load-in { from { opacity: 0; } to { opacity: 1; } }
.set-load-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
}
.set-load-block:last-child { border-bottom: 0; }
.set-load-line {
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--text) 6%, transparent) 0%,
    color-mix(in srgb, var(--text) 12%, transparent) 50%,
    color-mix(in srgb, var(--text) 6%, transparent) 100%
  );
  background-size: 200% 100%;
  animation: set-shimmer 1.2s ease-in-out infinite;
}
.set-load-line.w40 { width: 40%; }
.set-load-line.w55 { width: 55%; }
.set-load-line.w70 { width: 70%; }
.set-load-line.w100 { width: 100%; height: 40px; }
@keyframes set-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.set-segment-btn,
.set-segment button {
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--set-text-muted, var(--text-muted));
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.set-segment-btn:hover,
.set-segment button:hover { color: var(--set-text, var(--text)); }
.set-segment-btn.on,
.set-segment button.on {
  background: var(--set-surface, var(--surface));
  color: var(--set-text, var(--text));
}

.set-insight-card {
  margin: 0;
  padding: 16px 24px;
  border-radius: 0;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  background: transparent;
}
.set-insight-card strong {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text);
}
.set-insight-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-muted);
}
.set-insight-card a {
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.set-kbd-grid { display: grid; gap: 0; }
.set-kbd-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 14px 24px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
}
.set-kbd-row:last-child { border-bottom: 0; }
.set-kbd-label { font-size: 13px; font-weight: 500; }
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
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  background: var(--bg);
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.set-preview-frame {
  width: 100%;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  overflow: hidden;
  background: var(--bg);
}
.set-preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
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
  border-radius: 4px;
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

.set-doc-form .set-section-title { padding-top: 24px; }

@media (max-width: 768px) {
  .set-dt { display: none !important; }
  .set-m { display: flex !important; flex-direction: row; }
  .set-codex-frame { padding: 16px 16px 100px; max-width: none; }
  .set-codex-head { margin-bottom: 16px; }
  .set-page-title { font-size: 22px !important; }
  .set-kbd-row { padding: 14px 16px; }
  .set-insight-card { padding: 16px; }
}

/* Dokumente — Rechnungssteller status */
.set-doc-form[aria-busy="true"] .set-input,
.set-doc-form[aria-busy="true"] .set-input:disabled {
  opacity: 0.72;
}
.set-doc-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #9a6700;
  background: rgba(154, 103, 0, 0.1);
  border: 1px solid color-mix(in srgb, #9a6700 25%, transparent);
  white-space: nowrap;
  justify-self: end;
}
.set-doc-status.is-ready {
  color: #1f7a45;
  background: rgba(31, 122, 69, 0.1);
  border-color: color-mix(in srgb, #1f7a45 25%, transparent);
}
html[data-theme="dark"] .set-doc-status,
html[data-theme="classic-dark"] .set-doc-status {
  color: #f5d565;
  background: rgba(245, 213, 101, 0.12);
}
html[data-theme="dark"] .set-doc-status.is-ready,
html[data-theme="classic-dark"] .set-doc-status.is-ready {
  color: #86efac;
  background: rgba(134, 239, 172, 0.12);
}
.set-doc-missing {
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}
`
