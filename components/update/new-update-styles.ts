import {
  FESTAG_CONTENT_HEAD_CSS,
  FESTAG_MOBILE_HEAD_CSS,
} from '@/components/mobile/mobile-codex-list-styles'

export const NEW_UPDATE_CSS = `
${FESTAG_CONTENT_HEAD_CSS}
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
  max-width: var(--festag-content-max, 1080px);
  margin: 0 auto;
  padding: clamp(64px, 7vh, 88px) var(--festag-content-pad-x, 56px) 64px;
  box-sizing: border-box;
}

.nu-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 32px;
}
.nu-page-head-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nu-page-title {
  margin: 0;
  font-size: 29px;
  font-weight: 400;
  letter-spacing: -0.5px;
  line-height: 1.02;
  color: var(--portal-text, #1D1D1F);
}
.nu-page-lead {
  margin: 0;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.35;
  color: var(--portal-muted, #86868B);
  max-width: 52ch;
}
.nu-mobile-pill { display: none; }

.nu-stage {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.nu-composer {
  border-radius: 28px;
  padding: 8px 8px 8px 18px;
  background: color-mix(in srgb, var(--surface-2, #f2f2f7) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, rgba(0,0,0,.08)) 65%, transparent);
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
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
  min-height: 28px;
  display: flex;
  align-items: center;
}
.nu-composer input {
  width: 100%;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 16px;
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
  font-size: 16px;
  font-weight: 400;
  color: var(--portal-muted, #86868B);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity .28s ease;
}
.nu-composer-ghost.is-faded { opacity: 0; }
.nu-composer-submit {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 0;
  background: var(--portal-btn-primary, #1D1D1F);
  color: var(--portal-btn-primary-text, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity .12s ease, transform .08s ease;
}
.nu-composer-submit:disabled {
  opacity: 0.35;
  cursor: default;
}
.nu-composer-submit:not(:disabled):active { transform: scale(0.96); }

.nu-intent {
  margin: 10px 4px 0;
  font-size: 12px;
  font-weight: 400;
  color: var(--portal-muted, #86868B);
  min-height: 18px;
}
.nu-intent strong {
  font-weight: 500;
  color: var(--portal-text, #1D1D1F);
}

.nu-suggestions {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
}
.nu-suggestion {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 4px;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--border, rgba(0,0,0,.08)) 55%, transparent);
  background: transparent;
  font: inherit;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 0.01em;
  color: var(--portal-text, #1D1D1F);
  text-align: left;
  cursor: pointer;
  transition: color .12s ease;
}
.nu-suggestion:first-child { border-top: 0; padding-top: 6px; }
.nu-suggestion:hover { color: color-mix(in srgb, var(--portal-text, #1D1D1F) 82%, var(--portal-muted, #86868B)); }
.nu-suggestion-dot {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--surface-2, #f2f2f7) 90%, transparent);
  color: var(--portal-muted, #86868B);
  font-size: 11px;
  font-weight: 500;
}

.nu-recent {
  margin-top: 48px;
  padding-top: 8px;
}
.nu-recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding: 0 4px;
}
.nu-recent-label {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--portal-text, #1D1D1F);
}
.nu-recent-filter {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border, rgba(0,0,0,.08)) 80%, transparent);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 400;
  color: var(--portal-muted, #86868B);
  cursor: pointer;
}
.nu-recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 4px;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--border, rgba(0,0,0,.08)) 45%, transparent);
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 400;
  color: var(--portal-text, #1D1D1F);
  text-align: left;
  cursor: pointer;
}
.nu-recent-item:hover { background: var(--portal-row-hover, rgba(0,0,0,.035)); border-radius: 8px; }
.nu-recent-age {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--portal-muted, #86868B);
  font-variant-numeric: tabular-nums;
}

[data-theme="dark"] .nu-composer,
[data-theme="classic-dark"] .nu-composer {
  background: color-mix(in srgb, var(--festag-black-content, #0c0c0e) 88%, #fff 12%);
  border-color: rgba(255,255,255,.08);
  box-shadow: none;
}
[data-theme="dark"] .nu-composer-submit,
[data-theme="classic-dark"] .nu-composer-submit {
  background: #fff;
  color: #000;
}

@media (max-width: 900px) {
  .nu-inner {
    padding: 0 20px 96px;
  }
  .nu-page-head { display: none; }
  .nu-mobile-pill {
    display: flex;
    justify-content: flex-end;
    padding: 12px 0 8px;
  }
  .nu-stage { max-width: none; }
  .nu-recent { margin-top: 36px; }
}
`
