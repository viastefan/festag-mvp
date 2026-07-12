import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { DOCUMENTS_RESPONSIVE_CSS } from '@/components/documents/documents-responsive-styles'

export const DOCUMENTS_CSS = `
${DECISION_CSS}
${DOCUMENTS_RESPONSIVE_CSS}

/* Dokumente — no inner sheet; inherit portal canvas / main panel */
.doc-os-page.dec-os {
  background: transparent !important;
}
.doc-os-page .dec-m-shell,
.doc-os-page .dec-scroll-body,
.doc-os-page .dec-static-top {
  background: transparent !important;
}

@media (max-width: 768px) {
  .doc-os-page.dec-os {
    background: transparent !important;
  }
}

@media (max-width: 900px) {
  .doc-os-page.dec-os {
    background: transparent !important;
  }
  .doc-os-page .dec-m-shell {
    background: transparent !important;
  }
}

html[data-theme="dark"] .doc-os-page .doc-create-tile,
html[data-theme="classic-dark"] .doc-os-page .doc-create-tile {
  background: transparent !important;
  box-shadow: none !important;
}
html[data-theme="dark"] .doc-os-page .doc-create-tile:hover:not(:disabled),
html[data-theme="classic-dark"] .doc-os-page .doc-create-tile:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05) !important;
}
html[data-theme="dark"] .doc-os-page .doc-create-tile:active:not(:disabled),
html[data-theme="classic-dark"] .doc-os-page .doc-create-tile:active:not(:disabled) {
  background: rgba(255, 255, 255, 0.08) !important;
}
html[data-theme="dark"] .doc-os-page .doc-filter,
html[data-theme="classic-dark"] .doc-os-page .doc-filter {
  background: rgba(255, 255, 255, 0.06);
}
html[data-theme="dark"] .doc-os-page .doc-filter.on,
html[data-theme="classic-dark"] .doc-os-page .doc-filter.on {
  background: rgba(255, 255, 255, 0.1);
}

.dec-os {
  --doc-white-bg: var(--festag-elev-bg, #ffffff);
  --doc-surface: rgba(0, 0, 0, 0.04);
  --doc-surface-hover: rgba(0, 0, 0, 0.06);
  --doc-surface-active: rgba(0, 0, 0, 0.08);
  --doc-chip-bg: transparent;
  --doc-chip-hover: rgba(0, 0, 0, 0.05);
}

.doc-os-page {
  --doc-head-collapse: 0;
}

@media (min-width: 769px) {
  .doc-os-page .doc-static-top {
    padding-top: clamp(64px, 7vh, 88px);
    background: color-mix(
      in srgb,
      var(--festag-glass-bg, rgba(255, 255, 255, 0.72))
      calc(var(--doc-head-collapse) * 100%),
      transparent
    );
    backdrop-filter: blur(calc(18px * var(--doc-head-collapse)))
      saturate(calc(100% + 55% * var(--doc-head-collapse)));
    -webkit-backdrop-filter: blur(calc(18px * var(--doc-head-collapse)))
      saturate(calc(100% + 55% * var(--doc-head-collapse)));
  }
  html[data-theme="dark"] .doc-os-page .doc-static-top,
  html[data-theme="classic-dark"] .doc-os-page .doc-static-top {
    background: color-mix(
      in srgb,
      var(--festag-black-content, #0c0c0e)
      calc(var(--doc-head-collapse) * 100%),
      transparent
    );
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .doc-os-page .doc-static-top .dec-page-head {
    padding-bottom: 28px;
  }

  .doc-os-page .dec-page-head {
    align-items: flex-end;
  }
  .doc-os-page .dec-page-actions {
    padding-top: 0;
    align-self: flex-end;
  }
  .doc-os-page .dec-page-head-copy {
    max-width: min(720px, 100%);
  }

  .doc-os-page .doc-templates {
    margin-bottom: calc(22px - 14px * var(--doc-head-collapse));
  }

  .doc-os-page .doc-create-tile {
    min-height: calc(120px - 64px * var(--doc-head-collapse));
    padding:
      calc(14px - 6px * var(--doc-head-collapse))
      calc(14px - 4px * var(--doc-head-collapse));
    gap: calc(10px - 4px * var(--doc-head-collapse));
  }

  .doc-os-page .doc-create-ico {
    width: calc(36px - 10px * var(--doc-head-collapse));
    height: calc(36px - 10px * var(--doc-head-collapse));
  }

  .doc-os-page .doc-create-sub {
    overflow: hidden;
    max-height: calc(2.8em * (1 - var(--doc-head-collapse)));
    opacity: clamp(0, calc(1 - var(--doc-head-collapse) * 1.25), 1);
  }

  .doc-os-page .doc-create-plus {
    opacity: clamp(0, calc(1 - var(--doc-head-collapse) * 2.2), 1);
    transform: scale(calc(1 - var(--doc-head-collapse) * 0.35));
  }

  .doc-os-page[data-doc-head-compact="true"] .doc-create-tile {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    min-height: 52px;
  }

  .doc-os-page[data-doc-head-compact="true"] .doc-create-copy {
    flex: 1;
    min-width: 0;
  }

  .doc-os-page[data-doc-head-compact="true"] .doc-create-plus {
    margin-left: auto;
    opacity: 0.55;
    transform: none;
  }
}

@media (max-width: 768px) {
  .doc-os-page .doc-templates {
    margin-bottom: calc(22px - 12px * var(--doc-head-collapse));
  }

  .doc-os-page .doc-create-tile {
    min-height: calc(96px - 40px * var(--doc-head-collapse));
    padding:
      calc(12px - 4px * var(--doc-head-collapse))
      calc(12px - 2px * var(--doc-head-collapse));
  }

  .doc-os-page .doc-create-sub {
    overflow: hidden;
    max-height: calc(2.6em * (1 - var(--doc-head-collapse)));
    opacity: clamp(0, calc(1 - var(--doc-head-collapse) * 1.2), 1);
  }
}

html[data-theme="dark"] .dec-os,
html[data-theme="classic-dark"] .dec-os {
  --doc-white-bg: var(--surface-1, #2C2C2E);
  --doc-surface: rgba(255, 255, 255, 0.06);
  --doc-surface-hover: rgba(255, 255, 255, 0.09);
  --doc-surface-active: rgba(255, 255, 255, 0.11);
  --doc-chip-bg: rgba(255, 255, 255, 0.04);
  --doc-chip-hover: rgba(255, 255, 255, 0.08);
}

.doc-filters {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.doc-filter {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border-radius: 8px !important;
  border: none;
  background: var(--doc-surface);
  color: var(--dec-soft);
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  font-family: inherit;
  box-shadow: none;
  transition: background .12s ease, color .12s ease;
}
.doc-filter:hover {
  color: var(--dec-dark);
  background: var(--doc-surface-hover);
}
.doc-filter.on {
  background: var(--doc-surface-active);
  color: var(--dec-dark);
  border: none;
  box-shadow: none;
}
html[data-theme="dark"] .dec-os .doc-filter:hover,
html[data-theme="classic-dark"] .dec-os .doc-filter:hover {
  color: var(--portal-text, #f4f4f4);
}
html[data-theme="dark"] .dec-os .doc-filter.on,
html[data-theme="classic-dark"] .dec-os .doc-filter.on {
  background: var(--doc-surface-active) !important;
  color: var(--portal-text, #f4f4f4) !important;
  border: none !important;
  box-shadow: none !important;
}

.doc-create-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.doc-templates {
  margin-bottom: 22px;
}

.doc-list-chrome-mobile {
  display: none;
}

.doc-create-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 10px;
  min-height: 120px;
  padding: 14px;
  border-radius: 8px !important;
  border: none;
  background: var(--doc-surface);
  color: var(--dec-dark);
  font: inherit;
  cursor: pointer;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
  box-shadow: none;
  transition: background .14s ease, transform .12s ease;
}
.doc-create-tile:hover:not(:disabled) {
  background: var(--doc-surface-hover);
  box-shadow: none;
}
.doc-create-tile:active:not(:disabled) {
  transform: translateY(1px);
  background: var(--doc-surface-active);
  box-shadow: none;
}
html[data-theme="dark"] .dec-os .doc-create-tile,
html[data-theme="classic-dark"] .dec-os .doc-create-tile {
  flex-direction: column !important;
  align-items: flex-start !important;
  background: var(--doc-surface) !important;
  color: var(--portal-text, #f4f4f4) !important;
  border: none !important;
  box-shadow: none !important;
}
html[data-theme="dark"] .dec-os .doc-create-tile:hover:not(:disabled),
html[data-theme="classic-dark"] .dec-os .doc-create-tile:hover:not(:disabled) {
  background: var(--doc-surface-hover) !important;
  box-shadow: none !important;
}
html[data-theme="dark"] .dec-os .doc-create-tile:active:not(:disabled),
html[data-theme="classic-dark"] .dec-os .doc-create-tile:active:not(:disabled) {
  background: var(--doc-surface-active) !important;
  box-shadow: none !important;
}
.doc-create-tile:disabled { opacity: .45; cursor: not-allowed; }

.doc-create-ico {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  color: var(--dec-soft);
  flex-shrink: 0;
  box-shadow: none;
}
html[data-theme="dark"] .dec-os .doc-create-ico,
html[data-theme="classic-dark"] .dec-os .doc-create-ico {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: var(--portal-muted, #9aa0ac);
  box-shadow: none;
}
html[data-theme="dark"] .dec-os .doc-create-label,
html[data-theme="classic-dark"] .dec-os .doc-create-label {
  color: var(--portal-text, #f4f4f4);
}
html[data-theme="dark"] .dec-os .doc-create-plus,
html[data-theme="classic-dark"] .dec-os .doc-create-plus {
  display: none !important;
}

.doc-create-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.doc-create-label {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -.01em;
  color: var(--dec-dark);
}
.doc-create-sub {
  font-size: 12px;
  line-height: 1.4;
  color: var(--dec-soft);
}
.doc-create-plus {
  display: none;
}

.doc-create-error {
  margin: 0 0 14px;
  font-size: 13px;
  color: #c0362e;
}

.doc-inbox-hint {
  margin: 0 0 18px;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--dec-soft);
}
.doc-inbox-hint a {
  color: var(--dec-dark);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.doc-issuer-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin: 0 0 18px;
  padding: 16px 18px;
  border-radius: 8px;
  background: var(--festag-content-panel, var(--doc-white-bg));
  border: 1px solid var(--festag-content-panel-border, rgba(0, 0, 0, 0.1));
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  color: #1d1d1f;
}
html[data-theme="dark"] .doc-issuer-card,
html[data-theme="classic-dark"] .doc-issuer-card {
  background: var(--festag-content-panel, var(--festag-black-content, #111114));
  border: 1px solid var(--festag-content-panel-border, rgba(255, 255, 255, 0.12));
  box-shadow: none;
  color: var(--dec-dark, #f5f5f7);
}
.doc-issuer-copy { min-width: 0; flex: 1; }
.doc-issuer-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 500;
  color: inherit;
}
.doc-issuer-lead {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--dec-soft, #6e6e73);
}
.doc-issuer-note {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--dec-soft, #86868b);
}
.doc-issuer-settings-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 500;
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
  opacity: 0.88;
}
.doc-issuer-settings-link:hover {
  opacity: 1;
}
.doc-issuer-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: 32px;
  background: rgba(0,0,0,0.06);
  color: inherit;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background .14s;
}
html[data-theme="dark"] .doc-issuer-btn,
html[data-theme="classic-dark"] .doc-issuer-btn {
  background: rgba(255,255,255,0.1);
}
.doc-issuer-btn:hover { background: rgba(0,0,0,0.1); }
@media (max-width: 640px) {
  .doc-issuer-card { flex-direction: column; }
  .doc-issuer-btn { align-self: flex-start; }
}

.doc-agency-gate {
  margin: 0 0 18px;
  padding: 12px 14px;
  border-radius: 8px;
  border: none;
  background: var(--doc-surface);
  box-shadow: none;
  color: var(--dec-soft);
  font-size: 12.5px;
  line-height: 1.45;
}
.doc-agency-gate strong {
  display: block;
  margin-bottom: 4px;
  color: var(--dec-dark);
  font-weight: 500;
}
.doc-agency-gate a {
  color: var(--dec-cta-bg, #5b647d);
  text-decoration: none;
}
.doc-agency-gate a:hover { text-decoration: underline; }

.doc-card-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 132px;
}
.doc-card-actions .fui-pill-btn,
.doc-card-actions .festag-pill-btn {
  justify-content: center;
  gap: 6px;
}

.doc-intro-loader,
.doc-list-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: min(48vh, 380px);
  padding: 32px 20px 48px;
}

/* Scroll fade — hidden until scrolled, smoother on editor */
.doc-ed-page .dec-static-top {
  --festag-scroll-fade-height: 72px;
  --festag-scroll-fade-bg: var(--portal-card, var(--surface-0, #1C1C1E));
}
.doc-os-page .dec-static-top::after,
.doc-ed-page .dec-static-top::after {
  opacity: 0;
  transition: opacity .28s ease;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    var(--festag-scroll-fade-bg, var(--portal-card, #F7F7F8)) 0%,
    color-mix(in srgb, var(--festag-scroll-fade-bg, var(--portal-card, #F7F7F8)) 76%, transparent) 32%,
    color-mix(in srgb, var(--festag-scroll-fade-bg, var(--portal-card, #F7F7F8)) 44%, transparent) 58%,
    color-mix(in srgb, var(--festag-scroll-fade-bg, var(--portal-card, #F7F7F8)) 16%, transparent) 82%,
    transparent 100%
  );
}
.doc-os-page[data-doc-scroll-faded="true"] .dec-static-top::after,
.doc-ed-page[data-doc-scroll-faded="true"] .dec-static-top::after {
  opacity: 1;
}

/* Empty state — Linear-style */
.dec-scroll-body .dec-empty.doc-empty--linear {
  padding: 56px 24px 64px;
  gap: 0;
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
  align-items: center;
}
.doc-empty-title {
  margin: 4px 0 10px;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--dec-dark);
}
.doc-empty-lead {
  margin: 0 0 22px;
  max-width: 400px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--dec-soft);
}
.doc-empty-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.doc-empty-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background .14s ease, border-color .14s ease, opacity .12s ease;
}
.doc-empty-btn--primary {
  border: 0;
  background: #5e6ad2;
  color: #fff;
  box-shadow: 0 1px 2px rgba(94, 106, 210, 0.28);
}
.doc-empty-btn--primary:hover {
  background: #4f5ac4;
}
.doc-empty-btn--ghost {
  border: none;
  background: var(--doc-surface);
  color: var(--dec-dark);
  box-shadow: none;
}
.doc-empty-btn--ghost:hover {
  background: var(--doc-surface-hover);
}
html[data-theme="dark"] .doc-empty-btn--primary,
html[data-theme="classic-dark"] .doc-empty-btn--primary {
  background: #5e6ad2;
  color: #fff;
}
html[data-theme="dark"] .doc-empty-btn--ghost,
html[data-theme="classic-dark"] .doc-empty-btn--ghost {
  background: var(--doc-surface);
  border: none;
  color: var(--dec-dark);
  box-shadow: none;
}
html[data-theme="dark"] .doc-empty-btn--ghost:hover,
html[data-theme="classic-dark"] .doc-empty-btn--ghost:hover {
  background: var(--doc-surface-hover);
}
.dec-scroll-body .dec-empty.doc-empty--linear > p {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--dec-dark);
}
.dec-scroll-body .dec-empty.doc-empty--linear > small {
  font-size: 13px;
  line-height: 1.55;
  opacity: 1;
  color: var(--dec-soft);
}

.doc-empty-art {
  width: 120px;
  height: 92px;
  margin: 0 auto 8px;
  color: var(--dec-soft);
}
.doc-empty-art svg {
  display: block;
  width: 100%;
  height: 100%;
}
.doc-empty-edge {
  stroke: currentColor;
  stroke-width: 1.15;
  fill: none;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  opacity: 0.62;
}
.doc-empty-fold,
.doc-empty-line {
  stroke: currentColor;
  stroke-width: 1;
  fill: none;
  stroke-linecap: round;
  opacity: 0.45;
  vector-effect: non-scaling-stroke;
}
.doc-empty-sheet {
  animation: none;
}
.doc-empty-sheet--2,
.doc-empty-sheet--3 {
  animation: none;
}

html[data-theme="dark"] .dec-os .doc-empty-art,
html[data-theme="classic-dark"] .dec-os .doc-empty-art {
  color: var(--portal-muted, #9aa0ac);
}
html[data-theme="dark"] .dec-os .doc-agency-gate,
html[data-theme="classic-dark"] .dec-os .doc-agency-gate {
  background: var(--doc-surface);
  border: none;
  box-shadow: none;
}

@media (max-width: 900px) {
  .doc-create-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .doc-card-actions {
    flex-direction: row;
    flex-wrap: wrap;
    min-width: 0;
    width: 100%;
  }
}
`
