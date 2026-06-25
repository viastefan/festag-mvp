export const BRIEFING_INTELLIGENCE_CSS = `
/* Matches festag-modal-surface--briefing backdrop + surface tokens */

.festag-modal-host:has(.festag-modal-surface--briefing-intel) {
  z-index: 9550 !important;
  background: rgba(0, 0, 0, 0.52) !important;
  backdrop-filter: blur(12px) saturate(120%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(120%) !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 32px 48px !important;
}

.festag-modal-surface--briefing-intel {
  width: min(640px, calc(100vw - 96px)) !important;
  max-width: min(640px, calc(100vw - 96px)) !important;
  max-height: min(88vh, 720px) !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 28px !important;
  overflow: hidden !important;
  border: 0.5px solid rgba(0, 0, 0, 0.06);
  background: #ffffff;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  --bi-accent: #5b647d;
  --bi-gray: #f5f5f7;
  --bi-gray-hover: #ebebed;
  --bi-text: #1d1d1f;
  --bi-muted: #86868b;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.04),
    0 24px 80px -32px rgba(0, 0, 0, 0.28);
}

.festag-modal-surface--briefing-intel .festag-modal-body {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.bi-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  max-height: min(88vh, 720px);
  padding: 32px 36px 24px;
  color: var(--bi-text);
}

.bi-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 3;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bi-gray);
  color: var(--bi-muted);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.bi-close:hover {
  background: var(--bi-gray-hover);
  color: var(--bi-text);
}

.bi-head {
  flex-shrink: 0;
  padding: 0 36px 20px 0;
}

.bi-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--bi-text);
}

.bi-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 2px;
}

.bi-flow {
  position: relative;
  padding-left: 28px;
}

.bi-flow-line {
  position: absolute;
  left: 11px;
  top: 18px;
  bottom: 24px;
  width: 2px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(91, 100, 125, 0.28), rgba(91, 100, 125, 0.08));
}

.bi-block {
  position: relative;
  margin-bottom: 22px;
}

.bi-block:last-child {
  margin-bottom: 0;
}

.bi-block-label {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--bi-text);
}

.bi-anchor {
  position: relative;
}

.bi-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 12px 14px;
  border: none;
  border-radius: 18px;
  background: var(--bi-gray);
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.bi-card:hover,
.bi-card.is-open {
  background: #ffffff;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.06),
    0 8px 24px -12px rgba(0, 0, 0, 0.1);
}

.bi-card--empty {
  min-height: 88px;
  align-items: flex-start;
  padding-top: 14px;
}

.bi-card-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  color: var(--bi-accent);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.bi-card-icon--muted {
  color: var(--bi-muted);
}

.bi-card-copy {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bi-card-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--bi-text);
}

.bi-card-meta {
  font-size: 13px;
  line-height: 1.35;
  color: var(--bi-muted);
}

.bi-card-caret {
  flex-shrink: 0;
  color: var(--bi-muted);
  opacity: 0.55;
  transition: transform 0.2s ease;
}

.bi-card-caret.open {
  transform: rotate(180deg);
}

.bi-menu {
  padding: 6px;
  border-radius: 16px;
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  background: #ffffff;
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.18);
}

.bi-menu--portal {
  max-height: min(320px, calc(100vh - 120px));
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.bi-menu-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.bi-menu-item:hover,
.bi-menu-item.on {
  background: var(--bi-gray);
}

.bi-menu-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  color: var(--bi-accent);
}

.bi-menu-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.bi-menu-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--bi-text);
}

.bi-menu-meta {
  font-size: 12px;
  line-height: 1.35;
  color: var(--bi-muted);
}

.bi-steps {
  position: relative;
}

.bi-step-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.bi-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 12px 12px 14px;
  border-radius: 16px;
  background: var(--bi-gray);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.bi-step-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bi-step-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--bi-text);
}

.bi-step-meta {
  font-size: 12px;
  line-height: 1.35;
  color: var(--bi-muted);
}

.bi-step-remove {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--bi-muted);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.bi-step-remove:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #be123c;
}

.bi-add-row {
  display: flex;
  justify-content: flex-start;
}

.bi-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: var(--bi-gray);
  color: var(--bi-text);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.bi-add-btn:hover:not(:disabled) {
  background: var(--bi-gray-hover);
}

.bi-add-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.bi-foot {
  flex-shrink: 0;
  padding-top: 18px;
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
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}

.bi-save:hover:not(:disabled) {
  background: #f7f8fb;
  border-color: #dce1ea;
}

.bi-save:disabled {
  opacity: 0.42;
  cursor: default;
}

[data-theme="dark"] .festag-modal-host:has(.festag-modal-surface--briefing-intel),
[data-theme="classic-dark"] .festag-modal-host:has(.festag-modal-surface--briefing-intel) {
  background: rgba(0, 0, 0, 0.72) !important;
}

[data-theme="dark"] .festag-modal-surface--briefing-intel,
[data-theme="classic-dark"] .festag-modal-surface--briefing-intel {
  background: #121214;
  border-color: rgba(255, 255, 255, 0.1);
  --bi-text: #f4f4f5;
  --bi-muted: #9a9aa0;
  --bi-gray: rgba(255, 255, 255, 0.06);
  --bi-gray-hover: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .bi-card,
[data-theme="classic-dark"] .bi-card,
[data-theme="dark"] .bi-step,
[data-theme="classic-dark"] .bi-step,
[data-theme="dark"] .bi-add-btn,
[data-theme="classic-dark"] .bi-add-btn,
[data-theme="dark"] .bi-close,
[data-theme="classic-dark"] .bi-close {
  box-shadow: none;
}

[data-theme="dark"] .bi-card-icon,
[data-theme="classic-dark"] .bi-card-icon,
[data-theme="dark"] .bi-menu,
[data-theme="classic-dark"] .bi-menu,
[data-theme="dark"] .bi-menu-icon,
[data-theme="classic-dark"] .bi-menu-icon {
  background: rgba(255, 255, 255, 0.08);
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
    max-height: min(92vh, 720px) !important;
  }

  .bi-shell {
    padding: 24px 20px calc(18px + env(safe-area-inset-bottom, 0px));
  }

  .bi-title {
    font-size: 20px;
  }
}
`
