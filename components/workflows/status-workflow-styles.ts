export const STATUS_WORKFLOW_CSS = `
.swf-modal {
  width: min(560px, calc(100vw - 32px));
  max-height: min(90vh, 820px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.swf-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 22px 8px;
}
.swf-title {
  margin: 0;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--text, #0f0f10);
}
.swf-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.swf-preset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border, rgba(0,0,0,.08));
  background: var(--surface-2, #f7f8f8);
  color: var(--text, #0f0f10);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.007em;
  cursor: pointer;
}
.swf-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted, #6e717e);
  cursor: pointer;
}
.swf-close:hover { background: var(--surface-2, #f0f1f2); }

.swf-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 22px 20px;
}
.swf-section-label {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.007em;
  color: var(--text-muted, #6e717e);
}
.swf-flow {
  position: relative;
  padding-left: 2px;
}
.swf-connector {
  position: absolute;
  left: 27px;
  top: 72px;
  bottom: 88px;
  width: 0;
  border-left: 2px dashed color-mix(in srgb, var(--border, #d1d5db) 85%, transparent);
  pointer-events: none;
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
  min-height: 72px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--border, rgba(0,0,0,.08)) 70%, transparent);
  background: var(--surface-2, #f7f8f8);
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  box-sizing: border-box;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.swf-picker-card:hover {
  background: color-mix(in srgb, var(--surface-2, #f7f8f8) 80%, #fff);
  border-color: color-mix(in srgb, var(--border) 100%, transparent);
}
.swf-picker-card.on {
  border-color: color-mix(in srgb, #5b647d 35%, var(--border));
}
.swf-picker-ico {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #0f0f10;
}
.swf-picker-copy { min-width: 0; flex: 1; }
.swf-picker-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.007em;
  color: var(--text, #0f0f10);
}
.swf-picker-sub {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-muted, #6e717e);
  letter-spacing: 0.007em;
}
.swf-picker-caret {
  flex-shrink: 0;
  color: var(--text-muted, #959da0);
  transition: transform 0.2s ease;
}
.swf-picker-caret.open { transform: rotate(180deg); }

.swf-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  z-index: 12;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  border-radius: 16px;
  border: 1px solid var(--border, rgba(0,0,0,.08));
  background: var(--fp-bg, var(--portal-card, #fff));
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
}
.swf-menu-group {
  margin: 0;
  padding: 8px 10px 4px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted, #959da0);
}
.swf-menu-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.swf-menu-item:hover,
.swf-menu-item.on {
  background: var(--surface-2, #f7f8f8);
}
.swf-menu-item-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.007em;
}
.swf-menu-item-sub {
  margin: 3px 0 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-muted, #6e717e);
}

.swf-steps { margin-top: 4px; }
.swf-step-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}
.swf-step-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.swf-step-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: var(--surface-2, #f7f8f8);
}
.swf-step-num {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted, #6e717e);
}
.swf-step-remove {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted, #959da0);
  cursor: pointer;
}
.swf-step-remove:hover { background: rgba(255,59,48,.08); color: #ff3b30; }

.swf-add-wrap {
  position: relative;
  padding-left: 54px;
  margin-top: 4px;
}
.swf-add-line {
  position: absolute;
  left: 27px;
  top: -12px;
  height: 28px;
  border-left: 2px dashed color-mix(in srgb, var(--border, #d1d5db) 85%, transparent);
}
.swf-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: #fff;
  color: var(--text, #0f0f10);
  cursor: pointer;
}
.swf-add-btn:hover { background: var(--surface-2, #f7f8f8); }

.swf-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 22px 20px;
  border-top: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
}
.swf-foot-hint {
  margin-right: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted, #959da0);
  letter-spacing: 0.007em;
}
.swf-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  border: none;
  background: #5b647d;
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.007em;
  cursor: pointer;
}
.swf-save:disabled {
  opacity: 0.45;
  cursor: default;
}
.swf-save:not(:disabled):hover {
  background: color-mix(in srgb, #5b647d 92%, #fff);
}

[data-theme="dark"] .swf-picker-card,
[data-theme="classic-dark"] .swf-picker-card,
[data-theme="dark"] .swf-step-card,
[data-theme="classic-dark"] .swf-step-card {
  background: rgba(255,255,255,.05);
}
[data-theme="dark"] .swf-picker-ico,
[data-theme="classic-dark"] .swf-picker-ico {
  background: #121214;
}
`
