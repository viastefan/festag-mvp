export const BRIEFING_INTELLIGENCE_CSS = `
.festag-modal-host:has(.festag-modal-surface--briefing-intel) {
  background: rgba(0, 0, 0, 0.52) !important;
  backdrop-filter: blur(12px) saturate(120%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(120%) !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 32px 48px !important;
}

.festag-modal-surface--briefing-intel {
  width: min(560px, calc(100vw - 48px)) !important;
  max-width: min(560px, calc(100vw - 48px)) !important;
  max-height: min(90vh, 760px) !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 28px !important;
  overflow: hidden !important;
  border: 0.5px solid rgba(0, 0, 0, 0.06);
  background: #ffffff;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.04),
    0 24px 80px -32px rgba(0, 0, 0, 0.28);
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
}

.festag-modal-surface--briefing-intel .festag-modal-body {
  padding: 0;
  overflow: hidden;
}

.bi-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: min(90vh, 760px);
  padding: 28px 28px 22px;
  color: #1d1d1f;
}

.bi-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 2;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f7;
  color: #86868b;
  cursor: pointer;
}

.bi-close:hover {
  background: #ebebed;
  color: #1d1d1f;
}

.bi-head {
  padding-right: 36px;
  margin-bottom: 16px;
}

.bi-kicker {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 500;
  color: #86868b;
  text-align: center;
}

.bi-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.15;
  text-align: center;
}

.bi-sub {
  margin: 8px auto 0;
  max-width: 42ch;
  font-size: 14px;
  line-height: 1.45;
  color: #86868b;
  text-align: center;
}

.bi-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.bi-preset {
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: #f5f5f7;
  color: #1d1d1f;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.bi-preset:hover {
  background: #ebebed;
}

.bi-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.bi-label {
  font-size: 12px;
  font-weight: 500;
  color: #86868b;
}

.bi-textarea {
  width: 100%;
  min-height: 148px;
  padding: 14px 16px;
  border: none;
  border-radius: 16px;
  background: #f5f5f7;
  color: #1d1d1f;
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.bi-textarea:focus {
  outline: none;
  background: #ffffff;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.06),
    0 8px 24px -12px rgba(0, 0, 0, 0.12);
}

.bi-toggles {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.bi-toggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f5f5f7;
  cursor: pointer;
}

.bi-toggle input {
  margin-top: 3px;
  accent-color: #5b647d;
}

.bi-toggle strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
}

.bi-toggle small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.4;
  color: #86868b;
}

.bi-foot {
  margin-top: auto;
  padding-top: 4px;
}

.bi-save {
  width: 100%;
  height: 47px;
  border: 0.7px solid #e7ebf0;
  border-radius: 32px;
  background: #ffffff;
  color: #202532;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  transition: background 0.15s ease, border-color 0.15s ease;
}

.bi-save:hover:not(:disabled) {
  background: #f7f8fb;
  border-color: #dce1ea;
}

.bi-save:disabled {
  opacity: 0.55;
  cursor: default;
}

[data-theme="dark"] .festag-modal-surface--briefing-intel,
[data-theme="classic-dark"] .festag-modal-surface--briefing-intel {
  background: #121214;
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .bi-title,
[data-theme="classic-dark"] .bi-title,
[data-theme="dark"] .bi-toggle strong,
[data-theme="classic-dark"] .bi-toggle strong {
  color: #f4f4f5;
}

[data-theme="dark"] .bi-textarea,
[data-theme="classic-dark"] .bi-textarea,
[data-theme="dark"] .bi-toggle,
[data-theme="classic-dark"] .bi-toggle,
[data-theme="dark"] .bi-preset,
[data-theme="classic-dark"] .bi-preset,
[data-theme="dark"] .bi-close,
[data-theme="classic-dark"] .bi-close {
  background: rgba(255, 255, 255, 0.06);
  color: #f4f4f5;
}

[data-theme="dark"] .bi-save,
[data-theme="classic-dark"] .bi-save {
  background: #ffffff;
  color: #000000;
  border-color: rgba(255, 255, 255, 0.14);
}

@media (max-width: 768px) {
  .festag-modal-host:has(.festag-modal-surface--briefing-intel-mobile) {
    align-items: flex-end !important;
    justify-content: flex-end !important;
    padding: 0 !important;
  }

  .festag-modal-surface--briefing-intel-mobile {
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 20px 20px 0 0 !important;
    max-height: min(92vh, 760px) !important;
  }

  .bi-shell {
    padding: 22px 20px calc(18px + env(safe-area-inset-bottom, 0px));
  }
}
`
