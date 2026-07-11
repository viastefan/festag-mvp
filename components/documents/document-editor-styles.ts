import { DECISION_CSS } from '@/components/decisions/decisions-styles'

export const DOCUMENT_EDITOR_CSS = `
${DECISION_CSS}

.doc-ed-os {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  box-sizing: border-box;
}

.doc-ed {
  --de-surface: var(--festag-glass-bg-soft, rgba(255, 255, 255, 0.42));
  --de-surface-hover: var(--festag-glass-bg, rgba(255, 255, 255, 0.58));
  --de-ink: #1d1d1f;
  --de-muted: #6e6e73;
  --de-border: rgba(0,0,0,0.08);
  --de-canvas: transparent;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
  color: var(--portal-text, #1d1d1f);
  overflow: hidden;
  padding: 0;
  box-sizing: border-box;
}

.doc-ed-shell.dec-m-shell {
  flex: 1;
  min-height: 0;
}

.doc-ed-page-head.dec-page-head {
  padding-bottom: 28px;
}

.doc-ed-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 13px;
  font-weight: 400;
  color: var(--dec-soft, var(--portal-muted));
  cursor: pointer;
  text-decoration: none;
  transition: color .12s;
}
.doc-ed-kicker:hover { color: var(--dec-dark, var(--portal-text)); }

.doc-ed-page-actions.dec-page-actions {
  flex-wrap: wrap;
  row-gap: 8px;
}

.doc-ed-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  border: 0;
  background: var(--dec-cta-bg, #2d2e2c);
  color: var(--dec-cta-text, #fafafa);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: background .14s, opacity .12s;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.12), 0 2px 8px rgba(15,23,42,.12);
}
.doc-ed-cta:hover { background: var(--dec-cta-hover, #000); }
.doc-ed-cta.ghost {
  background: var(--festag-elev-bg, #fff);
  color: var(--dec-dark, #0f0f10);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  box-shadow: var(--festag-elev-shadow, 0 2px 6px rgba(15,23,42,.06));
}
.doc-ed-cta.ghost:hover {
  background: var(--festag-elev-active-bg, #f5f5f7);
}
.doc-ed-cta:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.doc-ed-saving-inline {
  color: var(--dec-soft);
}
.doc-ed-body.dec-scroll-body {
  padding-top: 0;
}
.doc-ed--wysiwyg .doc-ed-body {
  background: transparent;
}
.doc-ed-hint { display: none; }
.doc-ed-sheet {
  margin: 0 0 28px;
  border: 1px solid var(--festag-glass-border, rgba(255,255,255,0.62));
  border-radius: 20px;
  background: var(--festag-glass-bg, rgba(255,255,255,0.58));
  box-shadow: var(--festag-glass-shadow-soft);
  backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
  -webkit-backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
  overflow: hidden;
}
html[data-theme="dark"] .doc-ed-sheet,
html[data-theme="classic-dark"] .doc-ed-sheet {
  background: var(--portal-card, #0c0c0e);
  border-color: rgba(255,255,255,0.08);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.doc-ed-sheet-inner { padding: 24px 28px 28px; }

.doc-ed-head-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 28px;
  margin-bottom: 24px;
}
.doc-ed-issuer {
  padding: 16px 18px;
  border-radius: 12px;
  background: var(--de-surface);
  color: var(--de-ink);
}
html[data-theme="dark"] .doc-ed-issuer,
html[data-theme="classic-dark"] .doc-ed-issuer {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text, #f5f5f7);
}
.doc-ed-issuer-label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--de-muted);
}
.doc-ed-issuer-name {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 500;
}
.doc-ed-issuer-lines {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--de-muted);
  white-space: pre-wrap;
}
.doc-ed-issuer-edit {
  margin-top: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--portal-text, #1d1d1f);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.doc-ed-meta { display: flex; flex-direction: column; gap: 10px; }
.doc-ed-meta-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px;
  align-items: center;
}
.doc-ed-meta-label {
  font-size: 12px;
  color: var(--de-muted);
}
.doc-ed-meta-value {
  font-size: 14px;
  font-weight: 500;
}

.doc-ed-section {
  margin-top: 22px;
  padding-top: 22px;
  border-top: 1px solid var(--de-border);
}
.doc-ed-section-title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 500;
}
.doc-ed-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
}
.doc-ed-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.doc-ed-field > span {
  font-size: 11px;
  font-weight: 500;
  color: var(--de-muted);
}
.doc-ed-input {
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--de-border);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 14.5px;
  padding: 6px 0;
}
.doc-ed-input:focus {
  outline: none;
  border-bottom-color: color-mix(in srgb, currentColor 35%, var(--de-border));
}
.doc-ed-input:disabled { opacity: 0.65; }
select.doc-ed-input { cursor: pointer; }
.doc-ed-area { min-height: 72px; resize: vertical; line-height: 1.5; }

.doc-ed-pos-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.doc-ed-pos-table {
  width: 100%;
  border-collapse: collapse;
}
.doc-ed-pos-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 500;
  color: var(--de-muted);
  padding: 0 8px 8px 0;
  border-bottom: 1px solid var(--de-border);
}
.doc-ed-pos-table td {
  padding: 8px 8px 8px 0;
  vertical-align: top;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.doc-ed-pos-table .num { width: 72px; }
.doc-ed-pos-table .price { width: 110px; }
.doc-ed-pos-table .actions { width: 36px; text-align: right; }
.doc-ed-pos-del {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--de-muted);
  cursor: pointer;
}
.doc-ed-pos-del:hover { background: var(--de-surface); color: inherit; }
.doc-ed-pos-total {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
  font-size: 14px;
}
.doc-ed-pos-total strong { font-size: 16px; font-weight: 500; }

.doc-ed-error {
  margin: 12px 22px 0;
  font-size: 13px;
  color: #c0362e;
}
.doc-ed-saving {
  font-size: 12px;
  color: var(--de-muted);
}
.doc-ed-saved {
  color: #16a34a;
}

.doc-ed-preview-frame {
  width: 100%;
  min-height: min(78vh, 920px);
  border: 0;
  background: #ececee;
  display: block;
}

.doc-ed--loading .doc-ed-body--loading {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  background: transparent;
}
.doc-ed-skel {
  border-radius: 12px;
  background: linear-gradient(90deg, #f0f0f2 0%, #fafafa 50%, #f0f0f2 100%);
  background-size: 200% 100%;
  animation: doc-ed-shimmer 1.2s ease-in-out infinite;
}
.doc-ed-skel-back,
.doc-ed-skel-kicker {
  width: 108px;
  height: 14px;
  border-radius: 6px;
}
.doc-ed-skel-title {
  width: min(320px, 70%);
  height: 32px;
  border-radius: 8px;
}
.doc-ed-skel-lead {
  width: min(480px, 90%);
  height: 18px;
  border-radius: 6px;
  margin-top: 4px;
}
.doc-ed-skel-sheet {
  width: min(210mm, 100%);
  min-height: 420px;
  border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
}
@keyframes doc-ed-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

html[data-theme="dark"] .doc-ed,
html[data-theme="classic-dark"] .doc-ed {
  --de-surface: rgba(255,255,255,0.06);
  --de-surface-hover: rgba(255,255,255,0.1);
  --de-ink: #f5f5f7;
  --de-muted: #a1a1a6;
  --de-border: rgba(255,255,255,0.1);
  --de-canvas: transparent;
  background: transparent;
}
html[data-theme="dark"] .doc-ed-cta.ghost,
html[data-theme="classic-dark"] .doc-ed-cta.ghost {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.1);
  box-shadow: none;
}
html[data-theme="dark"] .doc-ed-skel,
html[data-theme="classic-dark"] .doc-ed-skel {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 200% 100%;
}

.doc-ed-top-actions--m { display: none; }

@media (max-width: 900px) {
  .doc-ed { padding: 0; }
  .doc-ed-head-grid { grid-template-columns: 1fr; }
  .doc-ed-grid-2 { grid-template-columns: 1fr; }
  .doc-ed-sheet { margin: 0 0 110px; }
  .doc-ed-sheet-inner { padding: 18px 16px 20px; }
  .doc-ed--wysiwyg .doc-ed-body { padding-bottom: 110px; }
}
`
