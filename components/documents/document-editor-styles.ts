export const DOCUMENT_EDITOR_CSS = `
.doc-ed {
  --de-surface: #f5f5f7;
  --de-surface-hover: #ebebed;
  --de-ink: #1d1d1f;
  --de-muted: #6e6e73;
  --de-border: rgba(0,0,0,0.08);
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--portal-bg, #fff);
  color: var(--text, #111);
}

.doc-ed-top {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--de-border);
  background: color-mix(in srgb, var(--portal-bg, #fff) 92%, transparent);
  backdrop-filter: blur(12px);
}
.doc-ed-top-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.doc-ed-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 10px;
  background: var(--de-surface);
  color: inherit;
  cursor: pointer;
}
.doc-ed-back:hover { background: var(--de-surface-hover); }
.doc-ed-title-wrap { min-width: 0; }
.doc-ed-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.doc-ed-sub {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--de-muted);
}
.doc-ed-status {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--de-surface);
  font-size: 12px;
  font-weight: 500;
  color: var(--de-ink);
}
.doc-ed-top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.doc-ed-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: var(--de-surface);
  color: inherit;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.doc-ed-btn:hover { background: var(--de-surface-hover); }
.doc-ed-btn.primary {
  background: var(--dec-cta-bg, #1d1d1f);
  color: #fff;
}
.doc-ed-btn.primary:hover { opacity: 0.92; }
.doc-ed-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.doc-ed-body {
  flex: 1;
  padding: 20px;
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
}
.doc-ed--wysiwyg .doc-ed-body {
  max-width: none;
  padding: 16px 20px 32px;
  background: #ececee;
}
html[data-theme="dark"] .doc-ed--wysiwyg .doc-ed-body,
html[data-theme="classic-dark"] .doc-ed--wysiwyg .doc-ed-body {
  background: #000;
}
.doc-ed--wysiwyg .doc-ed-sub {
  display: none;
}
.doc-ed-hint {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--de-muted);
}
.doc-ed-sheet {
  border: 1px solid var(--de-border);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  overflow: hidden;
}
html[data-theme="dark"] .doc-ed-sheet,
html[data-theme="classic-dark"] .doc-ed-sheet {
  background: var(--portal-card, #0c0c0e);
  border-color: rgba(255,255,255,0.08);
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
  background: rgba(255,255,255,0.06);
  color: var(--text, #f5f5f7);
}
.doc-ed-issuer-label {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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
  color: var(--dec-cta-bg, #1d1d1f);
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

.doc-ed-positions { margin-top: 8px; }
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
  margin: 12px 0 0;
  font-size: 13px;
  color: #c0362e;
}
.doc-ed-saving {
  font-size: 12px;
  color: var(--de-muted);
}

.doc-ed-preview-frame {
  width: 100%;
  min-height: 70vh;
  border: 0;
  background: #f4f4f4;
}

html[data-theme="dark"] .doc-ed,
html[data-theme="classic-dark"] .doc-ed {
  --de-surface: rgba(255,255,255,0.06);
  --de-surface-hover: rgba(255,255,255,0.1);
  --de-ink: #f5f5f7;
  --de-muted: #a1a1a6;
  --de-border: rgba(255,255,255,0.1);
}

@media (max-width: 900px) {
  .doc-ed-head-grid { grid-template-columns: 1fr; }
  .doc-ed-grid-2 { grid-template-columns: 1fr; }
  .doc-ed-top { flex-wrap: wrap; padding: 12px 14px; }
  .doc-ed-top-actions { width: 100%; justify-content: flex-end; flex-wrap: wrap; }
  .doc-ed-sheet-inner { padding: 18px 16px 20px; }
  .doc-ed-body { padding: 12px 12px 100px; }
}
`
