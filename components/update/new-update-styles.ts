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
  letter-spacing: 0.01em;
  background: var(--portal-card, #fff);
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
  max-width: 680px;
  margin: 0 auto;
  min-height: 100%;
  padding: 20px 32px 40px;
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
  margin-bottom: 8px;
}
.nu-mobile-pill { display: none; }

.nu-hero {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: min(68vh, 560px);
  padding: 12px 0 24px;
}

.nu-composer {
  border-radius: 999px;
  padding: 5px 5px 5px 18px;
  min-height: 52px;
  background: color-mix(in srgb, var(--surface-2, #ececee) 88%, #fff 12%);
  border: 1px solid color-mix(in srgb, var(--border, rgba(0,0,0,.06)) 80%, transparent);
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: none;
}
.nu-composer-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--portal-muted, #86868B);
}
.nu-composer-field {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 32px;
  display: flex;
  align-items: center;
}
.nu-composer input {
  width: 100%;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 17px;
  font-weight: 400;
  letter-spacing: 0.01em;
  color: var(--portal-text, #1D1D1F);
  outline: none;
  min-width: 0;
}
.nu-composer input::placeholder { color: transparent; }
.nu-composer-ghost {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  pointer-events: none;
  font-size: 17px;
  font-weight: 400;
  color: var(--portal-muted, #8E8E93);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity .32s ease;
}
.nu-composer-ghost.is-faded { opacity: 0; }
.nu-composer-submit {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 0;
  background: color-mix(in srgb, var(--portal-muted, #86868B) 35%, transparent);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .14s ease, opacity .12s ease, transform .08s ease;
}
.nu-composer-submit.is-ready {
  background: var(--portal-btn-primary, #1D1D1F);
  color: var(--portal-btn-primary-text, #fff);
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
  margin-top: 14px;
  padding: 0 6px;
  min-height: 28px;
}
.nu-toolbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.nu-toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 400;
  color: var(--portal-muted, #86868B);
  cursor: pointer;
}
.nu-toolbar-btn:hover { color: var(--portal-text, #1D1D1F); }
.nu-intent-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border, rgba(0,0,0,.08)) 70%, transparent);
  background: transparent;
  font-size: 12px;
  font-weight: 400;
  color: var(--portal-muted, #86868B);
  white-space: nowrap;
}
.nu-intent-chip strong {
  font-weight: 500;
  color: var(--portal-text, #1D1D1F);
}

.nu-suggestions {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
}
.nu-suggestion {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 15px 2px;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--border, rgba(0,0,0,.08)) 42%, transparent);
  background: transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0.01em;
  color: color-mix(in srgb, var(--portal-text, #1D1D1F) 88%, var(--portal-muted, #86868B));
  text-align: left;
  cursor: pointer;
  transition: color .12s ease, background .12s ease;
  border-radius: 0;
}
.nu-suggestion:first-child {
  border-top: 1px solid color-mix(in srgb, var(--border, rgba(0,0,0,.08)) 42%, transparent);
}
.nu-suggestion:hover {
  color: var(--portal-text, #1D1D1F);
}
.nu-suggestion-icon {
  width: 22px;
  height: 22px;
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
  margin-top: auto;
  padding-top: 40px;
}
.nu-recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
  padding: 0 2px 8px;
}
.nu-recent-label {
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  color: var(--portal-muted, #86868B);
}
.nu-recent-filter {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 400;
  color: var(--portal-text, #1D1D1F);
  cursor: pointer;
}
.nu-recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 2px;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--border, rgba(0,0,0,.08)) 38%, transparent);
  background: transparent;
  font: inherit;
  font-size: 15px;
  font-weight: 400;
  color: var(--portal-text, #1D1D1F);
  text-align: left;
  cursor: pointer;
  border-radius: 0;
}
.nu-recent-item:hover {
  color: color-mix(in srgb, var(--portal-text, #1D1D1F) 82%, var(--portal-muted, #86868B));
}
.nu-recent-age {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--portal-muted, #86868B);
  font-variant-numeric: tabular-nums;
}

[data-theme="dark"] .nu-os,
[data-theme="classic-dark"] .nu-os {
  background: var(--portal-card, #0c0c0e);
}
[data-theme="dark"] .nu-composer,
[data-theme="classic-dark"] .nu-composer {
  background: color-mix(in srgb, var(--festag-black-content, #0c0c0e) 82%, #fff 18%);
  border-color: rgba(255,255,255,.08);
}
[data-theme="dark"] .nu-composer-submit.is-ready,
[data-theme="classic-dark"] .nu-composer-submit.is-ready {
  background: #fff;
  color: #000;
}
[data-theme="dark"] .nu-composer-submit:not(.is-ready),
[data-theme="classic-dark"] .nu-composer-submit:not(.is-ready) {
  background: rgba(255,255,255,.18);
  color: rgba(255,255,255,.55);
}

@media (max-width: 900px) {
  .nu-inner {
    padding: 0 20px 96px;
    max-width: none;
  }
  .nu-topbar {
    display: flex;
  }
  .nu-mobile-pill { display: flex; }
  .nu-hero {
    min-height: auto;
    justify-content: flex-start;
    padding-top: 8px;
  }
  .nu-recent {
    margin-top: 32px;
    padding-top: 24px;
  }
}
`
