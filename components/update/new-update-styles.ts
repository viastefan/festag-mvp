import { FESTAG_MOBILE_HEAD_CSS } from '@/components/mobile/mobile-codex-list-styles'

export const NEW_UPDATE_CSS = `
${FESTAG_MOBILE_HEAD_CSS}

.nu-os {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--portal-text, #1D1D1F);
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-weight: 400;
  letter-spacing: 0.012em;
  background: var(--portal-card, #fff);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.nu-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-width: none;
}
.nu-scroll::-webkit-scrollbar { display: none; }

.nu-inner {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.nu-topbar {
  display: none;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-height: 40px;
  padding: 12px 20px 0;
  flex-shrink: 0;
}

.nu-stage-wrap {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 40px 28px;
  box-sizing: border-box;
}

.nu-stage {
  width: 100%;
  max-width: 620px;
  margin: 0 auto;
}

.nu-hero-head {
  text-align: center;
  margin-bottom: 28px;
}
.nu-kicker {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--portal-muted, #86868B);
}
.nu-title {
  margin: 0;
  font-size: clamp(28px, 3.4vw, 34px);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--portal-text, #1D1D1F);
}
.nu-lead {
  margin: 12px auto 0;
  max-width: 42ch;
  font-size: 15px;
  line-height: 1.55;
  color: var(--portal-muted, #6E6E73);
}

.nu-composer {
  width: 100%;
  border-radius: 24px;
  background: var(--portal-premium-muted-surface, #f7f7f8);
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: var(--portal-premium-shadow-soft, 0 6px 24px rgba(15, 23, 42, 0.05));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: background .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.nu-composer:focus-within {
  background: #ffffff;
  border-color: rgba(15, 23, 42, 0.09);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.05),
    0 2px 6px rgba(15, 23, 42, 0.04),
    0 14px 40px rgba(15, 23, 42, 0.09);
}

.nu-composer-field {
  position: relative;
  padding: 24px 24px 8px;
  min-height: 80px;
}

.nu-composer textarea {
  width: 100%;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1.5;
  color: var(--portal-text, #1D1D1F);
  outline: none;
  min-width: 0;
  resize: none;
  text-align: center;
  min-height: 30px;
  max-height: 200px;
  overflow-y: hidden;
  field-sizing: content;
}
.nu-composer textarea::placeholder { color: transparent; }

.nu-composer-ghost {
  position: absolute;
  left: 24px;
  right: 24px;
  top: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  pointer-events: none;
  font-size: 18px;
  font-weight: 400;
  line-height: 1.5;
  text-align: center;
  color: var(--portal-muted, #8E8E93);
  transition: opacity .34s ease;
}
.nu-composer-ghost.is-faded { opacity: 0; }

.nu-composer-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 14px;
  min-height: 48px;
}

.nu-composer-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 0;
  background: transparent;
  color: var(--portal-muted, #86868B);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .14s ease, color .14s ease, transform .1s ease;
}
.nu-composer-icon-btn:hover {
  background: rgba(15, 23, 42, 0.05);
  color: var(--portal-text, #1D1D1F);
}
.nu-composer-icon-btn:active { transform: scale(0.96); }

.nu-composer-spacer { flex: 1; min-width: 8px; }

.nu-composer-submit {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 0;
  background: color-mix(in srgb, var(--portal-muted, #86868B) 28%, transparent);
  color: rgba(255, 255, 255, 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .16s ease, transform .1s ease, box-shadow .16s ease;
}
.nu-composer-submit.is-ready {
  background: var(--portal-btn-primary, #1D1D1F);
  color: var(--portal-btn-primary-text, #fff);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.18);
}
.nu-composer-submit:disabled {
  opacity: 1;
  cursor: default;
}
.nu-composer-submit:not(:disabled):active { transform: scale(0.96); }

.nu-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 0 2px;
  min-height: 32px;
}
.nu-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nu-toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  font: inherit;
  font-size: 13px;
  font-weight: 400;
  color: var(--portal-muted, #6E6E73);
  cursor: pointer;
  transition: background .14s ease, border-color .14s ease, color .14s ease;
}
.nu-toolbar-btn:hover {
  background: #fff;
  border-color: rgba(15, 23, 42, 0.1);
  color: var(--portal-text, #1D1D1F);
}
.nu-intent-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.07);
  background: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  font-weight: 400;
  color: var(--portal-muted, #86868B);
  white-space: nowrap;
}
.nu-intent-chip strong {
  font-weight: 500;
  color: var(--portal-text, #1D1D1F);
}

.nu-suggestions-label {
  margin: 28px 0 10px;
  padding: 0 4px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--portal-muted, #86868B);
}

.nu-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nu-suggestion {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.78);
  font: inherit;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1.4;
  color: color-mix(in srgb, var(--portal-text, #1D1D1F) 90%, var(--portal-muted, #86868B));
  text-align: left;
  cursor: pointer;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset;
  transition: background .14s ease, border-color .14s ease, color .14s ease, transform .12s ease, box-shadow .14s ease;
}
.nu-suggestion:hover {
  background: #ffffff;
  border-color: rgba(15, 23, 42, 0.1);
  color: var(--portal-text, #1D1D1F);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.03),
    0 6px 18px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}
.nu-suggestion:active { transform: translateY(0); }
.nu-suggestion-icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--portal-muted, #86868B);
}
.nu-suggestion strong {
  font-weight: 500;
  color: var(--portal-text, #1D1D1F);
}

.nu-recent {
  flex-shrink: 0;
  width: 100%;
  max-width: 620px;
  margin: 0 auto;
  padding: 12px 40px 44px;
  box-sizing: border-box;
}
.nu-recent-panel {
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: color-mix(in srgb, var(--portal-premium-muted-surface, #f7f7f8) 82%, #fff 18%);
  padding: 6px 14px 8px;
}
.nu-recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 2px;
  padding: 8px 2px 6px;
}
.nu-recent-label {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--portal-muted, #86868B);
}
.nu-recent-filter {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 400;
  color: var(--portal-text, #1D1D1F);
  cursor: pointer;
  transition: background .12s ease;
}
.nu-recent-filter:hover { background: rgba(15, 23, 42, 0.04); }
.nu-recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 11px 4px;
  border: 0;
  border-top: 1px solid rgba(15, 23, 42, 0.05);
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 400;
  color: var(--portal-text, #1D1D1F);
  text-align: left;
  cursor: pointer;
  border-radius: 8px;
  transition: background .12s ease, color .12s ease;
}
.nu-recent-item:first-of-type { border-top: 0; }
.nu-recent-item:hover {
  background: rgba(15, 23, 42, 0.03);
}
.nu-recent-age {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--portal-muted, #86868B);
  font-variant-numeric: tabular-nums;
}

[data-theme="dark"] .nu-os,
[data-theme="classic-dark"] .nu-os {
  background: var(--portal-card, #0c0c0e);
}
[data-theme="dark"] .nu-composer,
[data-theme="classic-dark"] .nu-composer {
  background: var(--festag-black-content, #111114);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: none;
}
[data-theme="dark"] .nu-composer:focus-within,
[data-theme="classic-dark"] .nu-composer:focus-within {
  background: var(--festag-black-popup, #18181c);
  border-color: rgba(255, 255, 255, 0.11);
  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.38);
}
[data-theme="dark"] .nu-toolbar-btn,
[data-theme="classic-dark"] .nu-toolbar-btn {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: #8e8e93;
}
[data-theme="dark"] .nu-toolbar-btn:hover,
[data-theme="classic-dark"] .nu-toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}
[data-theme="dark"] .nu-intent-chip,
[data-theme="classic-dark"] .nu-intent-chip {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}
[data-theme="dark"] .nu-suggestion,
[data-theme="classic-dark"] .nu-suggestion {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: none;
}
[data-theme="dark"] .nu-suggestion:hover,
[data-theme="classic-dark"] .nu-suggestion:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.11);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}
[data-theme="dark"] .nu-recent-panel,
[data-theme="classic-dark"] .nu-recent-panel {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
}
[data-theme="dark"] .nu-composer-submit.is-ready,
[data-theme="classic-dark"] .nu-composer-submit.is-ready {
  background: #fff;
  color: #000;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
}
[data-theme="dark"] .nu-composer-submit:not(.is-ready),
[data-theme="classic-dark"] .nu-composer-submit:not(.is-ready) {
  background: rgba(255,255,255,.16);
  color: rgba(255,255,255,.55);
}
[data-theme="dark"] .nu-composer-icon-btn:hover,
[data-theme="classic-dark"] .nu-composer-icon-btn:hover {
  background: rgba(255,255,255,.08);
}

@media (max-width: 900px) {
  .nu-hero-head { display: none; }
  .nu-topbar { display: flex; }
  .nu-stage-wrap {
    align-items: flex-start;
    padding: 8px 20px 20px;
  }
  .nu-stage { max-width: none; }
  .nu-composer-field { padding: 18px 18px 8px; }
  .nu-composer-ghost { left: 18px; right: 18px; top: 18px; }
  .nu-composer textarea { font-size: 17px; }
  .nu-composer-ghost { font-size: 17px; }
  .nu-recent {
    max-width: none;
    padding: 0 20px 96px;
    margin-top: 8px;
  }
  .nu-recent-panel {
    border: 0;
    background: transparent;
    padding: 0;
  }
}
`
