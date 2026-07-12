export const INVOICE_WYSIWYG_CSS = `
.iwy-stage {
  padding: 24px 20px 40px;
}
.iwy-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}
.iwy-sheet {
  position: relative;
  width: min(210mm, 100%);
  min-height: 297mm;
  background: #fff;
  color: #111;
  padding: 16mm 18mm 18mm;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 10.5pt;
  line-height: 1.45;
}
.iwy-sheet.doc-sheet--dark {
  background: #111114;
  color: #f5f5f7;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}
html[data-theme="dark"] .iwy-sheet.doc-sheet--light,
html[data-theme="classic-dark"] .iwy-sheet.doc-sheet--light {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}
html[data-theme="dark"] .iwy-sheet.doc-sheet--dark,
html[data-theme="classic-dark"] .iwy-sheet.doc-sheet--dark {
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.52);
}

.iwy-draft { display: none; }

.iwy-runhead {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  font-size: 9pt;
  letter-spacing: -0.01em;
  color: #6e6e73;
  margin-bottom: 18mm;
}
.iwy-runhead .mark { font-weight: 500; max-width: 48%; color: #111; }
.iwy-runhead .topic { text-align: right; max-width: 48%; }

.iwy-hero-title {
  font-size: clamp(28pt, 6vw, 38pt);
  font-weight: 400;
  letter-spacing: -0.04em;
  margin: 0 0 2mm;
  line-height: 0.95;
}
.iwy-hero-number {
  font-size: 11pt;
  margin-bottom: 10mm;
}
.iwy-hero-input {
  display: block;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 2px 4px;
  margin: 0 -4px;
}
.iwy-hero-input.iwy-hero-title {
  font-size: clamp(28pt, 6vw, 38pt);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 0.95;
}
.iwy-hero-input.iwy-hero-number {
  font-size: 11pt;
  margin-bottom: 10mm;
}
.iwy-hero-input:focus {
  outline: none;
  background: #eef3ff;
  border-color: #c5d9f8;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.08);
}
.iwy-hero-input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.iwy-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10mm 16mm;
  margin-bottom: 12mm;
  max-width: 120mm;
}
.iwy-meta-grid--3 {
  grid-template-columns: repeat(3, 1fr);
  max-width: none;
}
.iwy-meta-label {
  display: block;
  font-size: 9pt;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #6e6e73;
  margin-bottom: 2.5mm;
}
.iwy-meta-value {
  font-size: 10.5pt;
}

.iwy-party-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12mm;
  margin-bottom: 12mm;
}
.iwy-party-label {
  font-size: 9pt;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #6e6e73;
  margin-bottom: 3.5mm;
}
.iwy-party strong { font-weight: 600; }
.iwy-party p { margin: 0 0 1.5mm; }
.iwy-party .contact { color: #333; }
.iwy-party-field {
  display: block;
  margin-bottom: 2.5mm;
}
.iwy-party-field-label {
  display: block;
  font-size: 8pt;
  font-weight: 500;
  color: #9a9aa0;
  margin-bottom: 1mm;
}
.iwy-party-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 10.5pt;
  line-height: 1.45;
  padding: 3px 6px;
  margin: 0 -6px;
}
.iwy-party-input:focus {
  outline: none;
  background: #eef3ff;
  border-color: #c5d9f8;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.08);
}
.iwy-party-input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.iwy-party-input::placeholder { color: #9a9aa0; }
.iwy-party-row {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 8px;
}
.iwy-kv-fields {
  display: flex;
  flex-direction: column;
  gap: 2mm;
}
.iwy-vat-label {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.iwy-vat-rate {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 9pt;
  font-weight: 400;
  color: #6e6e73;
}
.iwy-vat-rate input {
  width: 44px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 9pt;
  text-align: right;
  padding: 2px 4px;
}
.iwy-vat-rate input:focus {
  outline: none;
  background: #eef3ff;
  border-color: #c5d9f8;
}
.iwy-vat-rate-read {
  font-size: 9pt;
  font-weight: 400;
  color: #6e6e73;
}
.iwy-party-edit {
  margin-top: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #111;
  font: inherit;
  font-size: 9.5pt;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.iwy-client-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10mm;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f5f5f7;
}
html[data-theme="dark"] .iwy-client-bar,
html[data-theme="classic-dark"] .iwy-client-bar {
  background: rgba(255, 255, 255, 0.06);
}
.iwy-client-bar label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #6e6e73;
}

.iwy-field input,
.iwy-field textarea,
.iwy-field select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: inherit;
  line-height: 1.45;
  padding: 4px 6px;
  margin: -4px -6px;
  transition: background 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease;
}
.iwy-field textarea {
  resize: vertical;
  min-height: 52px;
}
.iwy-field input:focus,
.iwy-field textarea:focus,
.iwy-field select:focus {
  outline: none;
  background: #eef3ff;
  border-color: #c5d9f8;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.08);
}
.iwy-field input:disabled,
.iwy-field textarea:disabled,
.iwy-field select:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.iwy-field input::placeholder,
.iwy-field textarea::placeholder {
  color: #9a9aa0;
}
.iwy-pos-input,
.iwy-pos-input:focus {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 10.5pt;
  line-height: 1.5;
  padding: 4px 6px;
  margin: 0;
  resize: vertical;
  min-height: 40px;
}
.iwy-pos-input:focus {
  outline: none;
  background: #eef3ff;
  border-color: #c5d9f8;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.08);
}
.iwy-client-bar select {
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
  border-radius: 8px;
  padding: 8px 10px;
  margin: 0;
  font-size: 13px;
  letter-spacing: 0;
  text-transform: none;
  color: #111;
}
html[data-theme="dark"] .iwy-client-bar select,
html[data-theme="classic-dark"] .iwy-client-bar select {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text, #f5f5f7);
}

.iwy-items {
  width: 100%;
  border-collapse: collapse;
  margin-top: 4mm;
}
.iwy-items thead th {
  font-size: 9pt;
  letter-spacing: -0.01em;
  text-align: left;
  font-weight: 500;
  color: #6e6e73;
  padding: 0 0 3mm;
  border-bottom: 1px solid #111;
}
.iwy-items thead th.qty,
.iwy-items thead th.amt { text-align: right; }
.iwy-items tbody td {
  padding: 3mm 0;
  vertical-align: top;
  border-bottom: 1px solid #e8e8e8;
}
.iwy-items .pos-no { width: 10mm; font-size: 10pt; }
.iwy-items .pos-desc { padding-right: 8mm; }
.iwy-items .pos-qty { width: 16mm; text-align: right; }
.iwy-items .pos-price { width: 20mm; text-align: right; }
.iwy-items .pos-qty input,
.iwy-items .pos-price input {
  width: 100%;
  max-width: 88px;
  margin-left: auto;
  display: block;
  text-align: right;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 10.5pt;
  padding: 4px 6px;
}
.iwy-items .pos-qty input:focus,
.iwy-items .pos-price input:focus {
  outline: none;
  background: #eef3ff;
  border-color: #c5d9f8;
}
.iwy-items .pos-amt { width: 24mm; text-align: right; white-space: nowrap; }
.iwy-items .pos-del {
  width: 28px;
  border: 0;
  background: transparent;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
}
.iwy-items .pos-del:hover { color: #111; }
.iwy-add-row {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: #f5f5f7;
  color: #111;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.iwy-add-row:hover { background: #ebebed; }

.iwy-totals {
  width: 100%;
  border-collapse: collapse;
  margin-top: 2mm;
}
.iwy-totals td { padding: 2.5mm 0; border: 0; }
.iwy-totals .label { text-align: right; padding-right: 8mm; }
.iwy-totals .val { text-align: right; width: 24mm; white-space: nowrap; }
.iwy-totals .sub td { font-size: 9pt; color: #444; }
.iwy-totals .grand td {
  padding-top: 4mm;
  font-weight: 600;
  border-top: 1px solid #111;
}

.iwy-page-foot {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  margin-top: 18mm;
  padding-top: 3mm;
  border-top: 1px solid #111;
  font-size: 8pt;
  letter-spacing: -0.01em;
  color: #6e6e73;
}
.iwy-page-foot .pagenum { letter-spacing: 0; white-space: nowrap; }

.iwy-pay-hero { margin-bottom: 8mm; }
.iwy-pay-hero h2 {
  font-size: clamp(22pt, 5vw, 28pt);
  font-weight: 400;
  letter-spacing: -0.03em;
  margin: 0 0 2mm;
}
.iwy-pay-hero p { margin: 0; font-size: 11pt; }
.iwy-pay-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14mm;
}
.iwy-pay-section-label {
  font-size: 9pt;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #6e6e73;
  margin-bottom: 4mm;
}
.iwy-kv { width: 100%; border-collapse: collapse; }
.iwy-kv td { padding: 1.5mm 0; vertical-align: top; font-size: 10pt; }
.iwy-kv td:first-child { width: 34mm; color: #333; }
.iwy-ref-box {
  margin-top: 3mm;
  padding: 4mm 5mm;
  background: #f5f5f7;
  border-left: 3px solid #111;
}
.iwy-ref-box .ref-label {
  font-size: 9pt;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #6e6e73;
  margin-bottom: 2mm;
}
.iwy-legal {
  margin-top: 12mm;
  padding-top: 4mm;
  border-top: 1px solid #e5e5e5;
  font-size: 8.5pt;
  color: #444;
  line-height: 1.55;
}

@media (max-width: 768px) {
  .iwy-sheet { padding: 14mm 12mm 16mm; min-height: auto; }
  .iwy-party-grid,
  .iwy-pay-grid,
  .iwy-meta-grid,
  .iwy-meta-grid--3,
  .iwy-client-bar { grid-template-columns: 1fr; gap: 8mm; }
  .iwy-runhead { font-size: 8pt; }
  .iwy-items thead { display: none; }
  .iwy-items tbody tr { display: block; border-bottom: 1px solid #e8e8e8; padding: 8px 0; }
  .iwy-items tbody td { display: block; width: 100%; text-align: left !important; border: 0; padding: 4px 0; }
}

.iwy-sheet.doc-sheet--dark .iwy-runhead,
.iwy-sheet.doc-sheet--dark .iwy-meta-label,
.iwy-sheet.doc-sheet--dark .iwy-party-label,
.iwy-sheet.doc-sheet--dark .iwy-pay-section-label,
.iwy-sheet.doc-sheet--dark .iwy-page-foot,
.iwy-sheet.doc-sheet--dark .iwy-ref-box .ref-label {
  color: #a1a1a6;
}
.iwy-sheet.doc-sheet--dark .iwy-runhead .mark,
.iwy-sheet.doc-sheet--dark .iwy-hero-title,
.iwy-sheet.doc-sheet--dark .iwy-pay-hero h2 {
  color: #f5f5f7;
}
.iwy-sheet.doc-sheet--dark .iwy-items thead th {
  color: #a1a1a6;
  border-bottom-color: rgba(255, 255, 255, 0.14);
}
.iwy-sheet.doc-sheet--dark .iwy-items tbody td {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}
.iwy-sheet.doc-sheet--dark .iwy-items .pos-del {
  color: #8e8e93;
}
.iwy-sheet.doc-sheet--dark .iwy-items .pos-del:hover {
  color: #f5f5f7;
}
.iwy-sheet.doc-sheet--dark .iwy-add-row {
  background: rgba(255, 255, 255, 0.08);
  color: #f5f5f7;
}
.iwy-sheet.doc-sheet--dark .iwy-add-row:hover {
  background: rgba(255, 255, 255, 0.12);
}
.iwy-sheet.doc-sheet--dark .iwy-totals .sub td {
  color: #c7c7cc;
}
.iwy-sheet.doc-sheet--dark .iwy-totals .grand td {
  border-top-color: rgba(255, 255, 255, 0.18);
}
.iwy-sheet.doc-sheet--dark .iwy-page-foot {
  border-top-color: rgba(255, 255, 255, 0.14);
}
.iwy-sheet.doc-sheet--dark .iwy-ref-box {
  background: rgba(255, 255, 255, 0.06);
  border-left-color: rgba(255, 255, 255, 0.28);
}
.iwy-sheet.doc-sheet--dark .iwy-legal {
  border-top-color: rgba(255, 255, 255, 0.1);
  color: #c7c7cc;
}
.iwy-sheet.doc-sheet--dark .iwy-kv td:first-child {
  color: #c7c7cc;
}
.iwy-sheet.doc-sheet--dark .iwy-field input,
.iwy-sheet.doc-sheet--dark .iwy-field textarea,
.iwy-sheet.doc-sheet--dark .iwy-field select,
.iwy-sheet.doc-sheet--dark .iwy-meta-value,
.iwy-sheet.doc-sheet--dark .iwy-party-input,
.iwy-sheet.doc-sheet--dark .iwy-hero-input,
.iwy-sheet.doc-sheet--dark .iwy-client-bar select {
  color: #f5f5f7;
  background: transparent;
}
.iwy-sheet.doc-sheet--dark .iwy-hero-input:focus,
.iwy-sheet.doc-sheet--dark .iwy-party-input:focus,
.iwy-sheet.doc-sheet--dark .iwy-field input:focus,
.iwy-sheet.doc-sheet--dark .iwy-field textarea:focus,
.iwy-sheet.doc-sheet--dark .iwy-meta-value:focus {
  background: rgba(91, 100, 125, 0.22);
  border-color: rgba(91, 100, 125, 0.45);
  box-shadow: none;
}
.iwy-sheet.doc-sheet--dark .iwy-party-field-label {
  color: #8e8e93;
}
.iwy-sheet.doc-sheet--dark .iwy-party-edit {
  color: #d1d1d6;
}
`
