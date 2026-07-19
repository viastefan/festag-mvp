export const STATUS_WORKFLOW_CSS = `
.festag-modal-surface--workflow {
  width: min(680px, calc(100vw - 48px)) !important;
  max-width: min(680px, calc(100vw - 48px)) !important;
  max-height: min(92vh, 880px) !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 24px !important;
  overflow: hidden !important;
  border: 0.5px solid rgba(255, 255, 255, 0.08) !important;
  background: var(--festag-black-popup, #121214) !important;
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.04),
    0 28px 72px -28px rgba(0, 0, 0, 0.62) !important;
  --fp-text: #f4f4f5;
  --fp-muted: #8e8e93;
  --fp-divider: rgba(255, 255, 255, 0.08);
  --fp-pill: rgba(255, 255, 255, 0.08);
  color: var(--fp-text);
}

[data-theme="light"] .festag-modal-surface--workflow,
[data-theme="read"] .festag-modal-surface--workflow,
[data-theme="pure-light"] .festag-modal-surface--workflow {
  --fp-text: #18181b;
  --fp-muted: #71717a;
  --fp-divider: rgba(24, 24, 27, 0.08);
  --fp-pill: rgba(24, 24, 27, 0.05);
  background: #ffffff !important;
  border-color: rgba(24, 24, 27, 0.08) !important;
  box-shadow:
    0 0 0 0.5px rgba(24, 24, 27, 0.05),
    0 28px 72px -28px rgba(15, 23, 42, 0.22) !important;
}

.swf-modal {
  display: flex;
  flex-direction: column;
  max-height: min(92vh, 880px);
  overflow: hidden;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
}

.swf-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 24px 14px;
  flex-shrink: 0;
}

.swf-title {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--fp-text);
}

.swf-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.swf-preset {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 0.5px solid var(--fp-divider);
  background: var(--fp-pill);
  color: var(--fp-text);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.007em;
  cursor: pointer;
}

.swf-preset:hover {
  background: color-mix(in srgb, var(--fp-pill) 88%, #fff 12%);
}

.swf-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--fp-muted);
  cursor: pointer;
}

.swf-close:hover {
  background: var(--fp-pill);
  color: var(--fp-text);
}

.swf-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 24px 8px;
}

.swf-canvas {
  padding: 20px 20px 24px;
  border-radius: 16px;
  background: var(--festag-black-content, #111114);
  border: 0.5px solid rgba(255, 255, 255, 0.06);
}

[data-theme="light"] .swf-canvas,
[data-theme="read"] .swf-canvas,
[data-theme="pure-light"] .swf-canvas {
  background: #f5f5f7;
  border-color: rgba(24, 24, 27, 0.06);
}

.swf-flow {
  position: relative;
  padding-left: 54px;
}

.swf-connector {
  position: absolute;
  left: 19px;
  top: 38px;
  bottom: 22px;
  width: 0;
  border-left: 2px dashed rgba(255, 255, 255, 0.14);
  pointer-events: none;
}

[data-theme="light"] .swf-connector,
[data-theme="read"] .swf-connector,
[data-theme="pure-light"] .swf-connector {
  border-left-color: rgba(24, 24, 27, 0.14);
}

.swf-section-label {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.007em;
  color: var(--fp-muted);
}

.swf-picker {
  position: relative;
  width: 100%;
  margin-bottom: 28px;
}

.swf-picker-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 76px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  box-sizing: border-box;
  transition: background 0.15s ease, border-color 0.15s ease;
}

[data-theme="light"] .swf-picker-card,
[data-theme="read"] .swf-picker-card,
[data-theme="pure-light"] .swf-picker-card {
  background: #ffffff;
  border-color: rgba(24, 24, 27, 0.08);
}

.swf-picker-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.swf-picker-card.on {
  border-color: rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
}

[data-theme="light"] .swf-picker-card:hover,
[data-theme="read"] .swf-picker-card:hover,
[data-theme="pure-light"] .swf-picker-card:hover,
[data-theme="light"] .swf-picker-card.on,
[data-theme="read"] .swf-picker-card.on,
[data-theme="pure-light"] .swf-picker-card.on {
  background: #ffffff;
  border-color: rgba(24, 24, 27, 0.12);
}

.swf-picker-ico {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.28);
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--fp-text);
}

.swf-picker-ico--menu {
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

[data-theme="light"] .swf-picker-ico,
[data-theme="read"] .swf-picker-ico,
[data-theme="pure-light"] .swf-picker-ico {
  background: #f5f5f7;
  border-color: rgba(24, 24, 27, 0.08);
  color: #18181b;
}

.swf-picker-copy { min-width: 0; flex: 1; }

.swf-picker-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.007em;
  color: var(--fp-text);
}

.swf-picker-sub {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--fp-muted);
  letter-spacing: 0.007em;
}

.swf-picker-caret {
  flex-shrink: 0;
  color: var(--fp-muted);
  transition: transform 0.2s ease;
}

.swf-picker-caret.open { transform: rotate(180deg); }

.swf-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  z-index: 20;
  max-height: min(360px, 52vh);
  overflow-y: auto;
  padding: 6px;
  border-radius: 16px;
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  background: var(--festag-black-popup, #121214);
  box-shadow: 0 20px 48px -16px rgba(0, 0, 0, 0.55);
}

.swf-menu--steps {
  position: relative;
  top: auto;
  margin-top: 10px;
}

[data-theme="light"] .swf-menu,
[data-theme="read"] .swf-menu,
[data-theme="pure-light"] .swf-menu {
  background: #ffffff;
  border-color: rgba(24, 24, 27, 0.08);
  box-shadow: 0 20px 48px -16px rgba(15, 23, 42, 0.18);
}

.swf-menu-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.swf-menu-item:hover,
.swf-menu-item.on {
  background: rgba(255, 255, 255, 0.06);
}

[data-theme="light"] .swf-menu-item:hover,
[data-theme="read"] .swf-menu-item:hover,
[data-theme="pure-light"] .swf-menu-item:hover,
[data-theme="light"] .swf-menu-item.on,
[data-theme="read"] .swf-menu-item.on,
[data-theme="pure-light"] .swf-menu-item.on {
  background: #f5f5f7;
}

.swf-menu-item-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.007em;
  color: var(--fp-text);
}

.swf-menu-item-sub {
  margin: 3px 0 0;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
  color: var(--fp-muted);
}

.swf-steps {
  position: relative;
  margin-top: 4px;
}

.swf-step-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.swf-step-row {
  display: flex;
  align-items: stretch;
  width: 100%;
}

.swf-step-draft {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  width: 100%;
  min-height: 148px;
  padding: 16px 16px 14px;
  border-radius: 16px;
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  box-sizing: border-box;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.swf-step-draft--filled {
  min-height: 0;
  cursor: default;
}

[data-theme="light"] .swf-step-draft,
[data-theme="read"] .swf-step-draft,
[data-theme="pure-light"] .swf-step-draft {
  background: #ffffff;
  border-color: rgba(24, 24, 27, 0.08);
}

.swf-step-draft:hover,
.swf-step-draft.on {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

[data-theme="light"] .swf-step-draft:hover,
[data-theme="read"] .swf-step-draft:hover,
[data-theme="pure-light"] .swf-step-draft:hover,
[data-theme="light"] .swf-step-draft.on,
[data-theme="read"] .swf-step-draft.on,
[data-theme="pure-light"] .swf-step-draft.on {
  background: #ffffff;
  border-color: rgba(24, 24, 27, 0.12);
}

.swf-step-draft-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.swf-step-draft-label {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.007em;
  color: var(--fp-text);
}

.swf-step-draft-placeholder {
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.45;
  color: var(--fp-muted);
}

.swf-step-draft-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 18px;
}

.swf-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--fp-text);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.007em;
}

[data-theme="light"] .swf-chip,
[data-theme="read"] .swf-chip,
[data-theme="pure-light"] .swf-chip {
  background: #f5f5f7;
  border-color: rgba(24, 24, 27, 0.08);
  color: #18181b;
}

.swf-step-remove {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--fp-muted);
  cursor: pointer;
}

.swf-step-remove:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff453a;
}

.swf-add-wrap {
  position: relative;
  margin-top: 14px;
  padding-left: 0;
}

.swf-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin-left: -35px;
  border-radius: 999px;
  border: 0.5px solid rgba(255, 255, 255, 0.12);
  background: var(--festag-black-content, #111114);
  color: var(--fp-text);
  cursor: pointer;
}

.swf-add-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}

.swf-add-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

[data-theme="light"] .swf-add-btn,
[data-theme="read"] .swf-add-btn,
[data-theme="pure-light"] .swf-add-btn {
  background: #ffffff;
  border-color: rgba(24, 24, 27, 0.1);
}

.swf-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 24px 22px;
  flex-shrink: 0;
}

.swf-foot-hint {
  margin-right: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 400;
  color: var(--fp-muted);
  letter-spacing: 0.007em;
}

.swf-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: var(--fp-text);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.007em;
  cursor: pointer;
  transition: background 0.15s ease;
}

.swf-save:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.16);
}

.swf-save:disabled {
  opacity: 0.4;
  cursor: default;
}

[data-theme="light"] .swf-save,
[data-theme="read"] .swf-save,
[data-theme="pure-light"] .swf-save {
  background: var(--festag-btn-dark-bg, #ffffff);
  color: var(--festag-btn-dark-fg, #1e1e20);
  border: 0.7px solid var(--festag-btn-dark-border, #e7ebf0);
  box-shadow: var(--festag-btn-dark-shadow, none);
}

[data-theme="light"] .swf-save:not(:disabled):hover,
[data-theme="read"] .swf-save:not(:disabled):hover,
[data-theme="pure-light"] .swf-save:not(:disabled):hover {
  background: var(--festag-btn-dark-bg-hover, #f7f8fb);
  color: var(--festag-btn-dark-fg-hover, #1e1e20);
  border-color: var(--festag-btn-dark-border-hover, #dce1ea);
  box-shadow: var(--festag-btn-dark-shadow-hover, none);
}

@media (max-width: 768px) {
  .festag-modal-surface--workflow {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
    max-height: min(94dvh, 900px) !important;
    border-radius: 20px !important;
  }

  .swf-head {
    padding: 18px 18px 12px;
  }

  .swf-title {
    font-size: 20px;
  }

  .swf-body {
    padding: 0 18px 8px;
  }

  .swf-canvas {
    padding: 16px 14px 18px;
  }

  .swf-flow {
    padding-left: 46px;
  }

  .swf-connector {
    left: 15px;
  }

  .swf-foot {
    padding: 12px 18px 18px;
  }

  .swf-foot-hint {
    display: none;
  }

  .swf-save {
    width: 100%;
  }
}
`
