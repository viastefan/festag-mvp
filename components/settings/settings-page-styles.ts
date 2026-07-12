/** Page-level settings layout — Vercel-style cards, rows, controls. */
export const SETTINGS_PAGE_CSS = `
.set {
  --set-bg: var(--bg);
  --set-surface: var(--festag-content-panel, var(--surface));
  --set-card: var(--festag-content-panel, var(--surface));
  --set-border: var(--border);
  --set-stroke: var(--festag-content-panel-border, color-mix(in srgb, var(--border) 88%, transparent));
  --set-text: var(--text);
  --set-text-secondary: var(--text-secondary);
  --set-text-muted: var(--text-muted);
  background: transparent;
  color: var(--set-text);
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-weight: 400;
  letter-spacing: 0;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
}
.set, .set * { letter-spacing: 0; }

html[data-theme="dark"] .set,
html[data-theme="classic-dark"] .set {
  --set-stroke: var(--festag-content-panel-border, rgba(255, 255, 255, 0.12));
}

.set-main {
  width: 100%;
  max-width: none;
  margin: 0;
  background: var(--festag-content-panel, var(--set-surface));
  border: 1px solid var(--festag-content-panel-border, var(--set-stroke));
  border-radius: 8px;
  padding: 0;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}
.set-main > .set-error,
.set-main > .set-invalid-banner {
  margin: 16px 24px 0;
}
.set-saved {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border: 1px solid var(--set-stroke);
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  font-weight: 400;
  color: var(--set-text-muted);
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}
.set-saved.show { opacity: 1; }

.set-section-title {
  margin: 0;
  padding: 24px 24px 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--set-text);
}
.set-section-title:not(:first-of-type) {
  border-top: 1px solid var(--set-stroke);
  margin-top: 4px;
  padding-top: 28px;
}
.set-section-title:first-of-type { padding-top: 24px; }

.set-card {
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 0 24px 12px;
  margin: 0;
  box-shadow: none;
}
.set-card + .set-card {
  padding-top: 0;
  border-top: 0;
}

.set-profile-layout {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.set-side-stack {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid var(--set-stroke);
  padding: 24px;
  margin-top: 4px;
}
.set-mini-card {
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 0;
}
.set-mini-card + .set-mini-card {
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid var(--set-stroke);
}
.set-mini-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
}
.set-mini-copy {
  font-size: 13px;
  line-height: 1.55;
  color: var(--set-text-muted);
  margin: 0;
}
.set-progress {
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--set-text) 10%, transparent);
  overflow: hidden;
  margin: 14px 0 12px;
}
.set-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--set-text);
}
.set-meta-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}
.set-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--set-text-muted);
}
.set-meta-row strong {
  color: var(--set-text-secondary);
  font-size: 13px;
  font-weight: 500;
  text-align: right;
}

.set-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  align-items: start;
  padding: 16px 24px;
  border-bottom: 1px solid var(--set-stroke);
}
.set-row:last-child { border-bottom: none; }
.set-row:has(.set-toggle),
.set-row:has(.set-btn:not(.set-btn-primary)),
.set-row:has(.set-value),
.set-row:has(.set-doc-status),
.set-row:has(.set-provider),
.set-row:has(.set-color-row),
.set-row:has(.set-segment) {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
}
.set-row-stack { align-items: flex-start; }
.set-row-stack:has(.set-input),
.set-row-stack:has(textarea) {
  grid-template-columns: 1fr;
}
.set-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--set-text);
}
.set-label-sub {
  font-size: 13px;
  font-weight: 400;
  color: var(--set-text-muted);
  margin-top: 4px;
  line-height: 1.5;
  max-width: 52ch;
}
.set-value {
  font-size: 13px;
  font-weight: 400;
  color: var(--set-text-secondary);
  text-align: right;
}
.set-row > *:last-child { justify-self: stretch; text-align: left; min-width: 0; }
.set-row:has(.set-toggle) > *:last-child,
.set-row:has(.set-value) > *:last-child,
.set-row:has(.set-doc-status) > *:last-child {
  justify-self: end;
  text-align: right;
}
.set-row > .set-input,
.set-row > .set-select,
.set-row > textarea.set-input,
.set-row > .set-field-stack {
  justify-self: stretch;
  text-align: left;
}
.set-field-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.set-field-note {
  color: var(--set-text-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
}

.set-input, .set-select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--bg);
  border: 1px solid var(--set-stroke);
  color: var(--set-text);
  font-family: inherit;
  font-size: 13px;
  font-weight: 400;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.set-input:focus, .set-select:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--set-text) 28%, var(--set-stroke));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--set-text) 28%, var(--set-stroke));
}
.set-input::placeholder { color: var(--set-text-muted); }

.set-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--set-text) 12%, transparent);
  color: var(--set-text);
  font-size: 16px;
  font-weight: 500;
  flex-shrink: 0;
}

.set-toggle {
  width: 40px;
  height: 24px;
  border-radius: 999px;
  border: 0;
  background: color-mix(in srgb, var(--set-text) 18%, transparent);
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}
.set-toggle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--set-bg);
  transform: translateY(-50%);
  transition: left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.set-toggle.on { background: var(--set-text); }
.set-toggle.on::after { left: 19px; background: var(--set-bg); }

.set-btn {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--set-stroke);
  background: transparent;
  color: var(--set-text);
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}
.set-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--set-text) 6%, transparent);
}
.set-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.set-btn-primary {
  background: var(--set-text);
  color: var(--set-bg);
  border: 1px solid var(--set-text);
  border-radius: 6px;
  padding: 8px 14px;
  box-shadow: none;
  font-weight: 500;
}
.set-btn-primary:hover:not(:disabled) {
  opacity: 0.92;
  transform: none;
  box-shadow: none;
}
.set-btn-primary:active:not(:disabled) { opacity: 0.86; }

.set-btn-danger {
  color: #e5484d;
  border-color: color-mix(in srgb, #e5484d 35%, var(--set-stroke));
}
.set-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, #e5484d 8%, transparent);
}

.ws-mode-switch { display: grid; gap: 8px; width: 100%; }
.ws-mode-opt {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  padding: 14px 16px;
  border-radius: 6px;
  border: 1px solid var(--set-stroke);
  background: transparent;
  color: var(--set-text);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.ws-mode-opt:hover:not(:disabled):not(.on) {
  background: color-mix(in srgb, var(--set-text) 4%, transparent);
}
.ws-mode-opt.on {
  cursor: default;
  border-color: color-mix(in srgb, var(--set-text) 35%, var(--set-stroke));
  background: color-mix(in srgb, var(--set-text) 5%, transparent);
}
.ws-mode-opt:disabled:not(.on) { opacity: 0.5; cursor: default; }
.ws-mode-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ws-mode-name { font-size: 13px; font-weight: 500; color: var(--set-text); }
.ws-mode-desc { font-size: 13px; line-height: 1.5; color: var(--set-text-muted); }
.ws-mode-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--set-text);
  background: color-mix(in srgb, var(--set-text) 12%, transparent);
  border: 1px solid var(--set-stroke);
}
.ws-mode-go { font-size: 12px; font-weight: 400; color: var(--set-text-muted); }

.ws-switch-lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; color: var(--text-secondary); }
.ws-switch-list { margin: 0 0 14px; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
.ws-switch-list li { font-size: 13px; line-height: 1.5; color: var(--text-secondary); }
.ws-switch-from {
  margin: 0;
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid var(--set-stroke);
  background: transparent;
  font-size: 13px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}
.ws-switch-from span { color: var(--text); font-weight: 500; }

.set-segment {
  display: inline-flex;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid var(--set-stroke);
  background: var(--bg);
  gap: 2px;
}
.set-segment button {
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--set-text-muted);
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.set-segment button:hover { color: var(--set-text); }
.set-segment button.on {
  background: var(--set-surface);
  color: var(--set-text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.set-color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}
.set-color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s, border-color 0.15s;
}
.set-color-swatch:hover { transform: scale(1.06); }
.set-color-swatch.on {
  border-color: var(--set-text);
  box-shadow: 0 0 0 2px var(--set-bg);
}

.set-theme-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
}
.set-theme-card {
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--set-stroke);
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: inherit;
  transition: border-color 0.15s;
}
.set-theme-card:hover:not(.selected) { border-color: color-mix(in srgb, var(--set-text) 22%, var(--set-stroke)); }
.set-theme-card.selected {
  border-color: var(--set-text);
  border-width: 1px;
  padding: 12px;
}
.set-theme-preview {
  width: 100%;
  aspect-ratio: 1.7/1;
  border-radius: 4px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 10px;
  gap: 4px;
}
.set-theme-preview-bar { height: 4px; border-radius: 2px; }
.preview-light { background: #ffffff; }
.preview-light .set-theme-preview-bar.long { background: #1c1914; width: 70%; }
.preview-light .set-theme-preview-bar.short { background: rgba(28, 25, 20, 0.15); width: 40%; }
.preview-read { background: #efe7d2; }
.preview-read .set-theme-preview-bar.long { background: #6f6248; width: 70%; }
.preview-read .set-theme-preview-bar.short { background: rgba(111, 98, 72, 0.3); width: 40%; }
.preview-dark { background: #0e0f0f; }
.preview-dark .set-theme-preview-bar.long { background: #6a738c; width: 70%; }
.preview-dark .set-theme-preview-bar.short { background: rgba(255, 255, 255, 0.12); width: 40%; }
.set-theme-name { font-size: 13px; font-weight: 500; }
.set-theme-desc { font-size: 12px; font-weight: 400; color: var(--set-text-muted); margin-top: 2px; }

.set-passkey {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--set-stroke);
}
.set-passkey:first-child { border-top: 0; padding-top: 0; }
.set-passkey-name { flex: 1; font-size: 13px; font-weight: 500; }
.set-passkey-date { font-size: 12px; font-weight: 400; color: var(--set-text-muted); }

.set-provider {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--set-stroke);
  font-size: 12px;
  font-weight: 500;
}

.set-error {
  padding: 12px 14px;
  margin: 0;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, #e5484d 35%, var(--set-stroke));
  background: color-mix(in srgb, #e5484d 8%, transparent);
  color: #e5484d;
  font-size: 13px;
  font-weight: 400;
}

.set-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  border-top: 1px solid var(--set-stroke);
  font-size: 13px;
  color: var(--set-text-muted);
}

@media (max-width: 760px) {
  .set-main > .set-error,
  .set-main > .set-invalid-banner { margin: 12px 16px 0; }
  .set-section-title { padding: 20px 16px 8px; }
  .set-section-title:not(:first-of-type) { padding-top: 24px; }
  .set-card { padding: 0 16px 8px; }
  .set-row {
    grid-template-columns: 1fr !important;
    padding: 14px 16px;
    gap: 10px;
    align-items: flex-start !important;
  }
  .set-row > *:last-child {
    width: 100%;
    justify-self: stretch !important;
    text-align: left !important;
  }
  .set-value { text-align: left; }
  .set-input, .set-select { font-size: 16px; padding: 10px 12px; }
  .set-btn { min-height: 40px; }
  .set-theme-cards { grid-template-columns: 1fr; gap: 8px; }
  .set-segment { width: 100%; }
  .set-segment button { flex: 1; }
  .set-side-stack { padding: 20px 16px; }
}
`
