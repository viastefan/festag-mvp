import { DECISION_CSS } from '@/components/decisions/decisions-styles'

export const DOCUMENTS_CSS = `
${DECISION_CSS}

.dec-os {
  --doc-white-bg: var(--festag-elev-bg, #ffffff);
  --doc-white-elev: var(--festag-elev-shadow);
  --doc-white-border: 1px solid var(--festag-elev-border, rgba(0, 0, 0, 0.08));
  --doc-chip-bg: var(--festag-elev-bg, #ffffff);
  --doc-chip-hover: var(--festag-elev-active-bg, #f5f5f7);
}
html[data-theme="dark"] .dec-os,
html[data-theme="classic-dark"] .dec-os {
  --doc-white-bg: var(--festag-black-popup, #121214);
  --doc-white-elev: var(--festag-elev-shadow);
  --doc-white-border: 1px solid var(--festag-elev-border, rgba(255, 255, 255, 0.14));
  --doc-chip-bg: var(--festag-elev-bg, #0c0c0e);
  --doc-chip-hover: var(--festag-elev-active-bg, rgba(255, 255, 255, 0.08));
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
  border: var(--doc-white-border);
  background: var(--doc-chip-bg);
  color: var(--dec-soft);
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  font-family: inherit;
  box-shadow: var(--festag-elev-shadow);
  transition: background .12s ease, color .12s ease, box-shadow .12s ease, border-color .12s ease;
}
.doc-filter:hover {
  color: var(--dec-dark);
  background: var(--doc-chip-hover);
  box-shadow: var(--festag-elev-shadow-hover);
}
.doc-filter.on {
  background: var(--doc-white-bg);
  color: var(--dec-dark);
  border: var(--doc-white-border);
  box-shadow: var(--doc-white-elev);
}
html[data-theme="dark"] .dec-os .doc-filter,
html[data-theme="classic-dark"] .dec-os .doc-filter {
  box-shadow: var(--festag-elev-shadow);
}
html[data-theme="dark"] .dec-os .doc-filter:hover,
html[data-theme="classic-dark"] .dec-os .doc-filter:hover {
  color: var(--portal-text, #f4f4f4);
  box-shadow: var(--festag-elev-shadow-hover);
}
html[data-theme="dark"] .dec-os .doc-filter.on,
html[data-theme="classic-dark"] .dec-os .doc-filter.on {
  background: var(--festag-black-popup, #121214) !important;
  color: var(--portal-text, #f4f4f4) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  box-shadow: var(--doc-white-elev) !important;
}

.doc-create-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.doc-templates {
  margin-bottom: 22px;
}
.doc-templates-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
.doc-templates-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--dec-soft);
}
.doc-templates-lead {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: var(--dec-soft);
  max-width: 560px;
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
  border: var(--doc-white-border);
  background: var(--doc-white-bg);
  color: var(--dec-dark);
  font: inherit;
  cursor: pointer;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
  box-shadow: var(--doc-white-elev);
  transition: background .14s ease, border-color .14s ease, box-shadow .14s ease, transform .12s ease;
}
.doc-create-tile:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--dec-dark) 12%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 1),
    0 2px 0 rgba(0, 0, 0, 0.03),
    0 6px 16px rgba(144, 149, 159, 0.2);
}
.doc-create-tile:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow:
    inset 0 1px 2px rgba(15, 23, 42, 0.06),
    0 1px 4px rgba(144, 149, 159, 0.12);
}
html[data-theme="dark"] .dec-os .doc-create-tile,
html[data-theme="classic-dark"] .dec-os .doc-create-tile {
  flex-direction: column !important;
  align-items: flex-start !important;
  background: var(--festag-black-popup, #121214) !important;
  color: var(--portal-text, #f4f4f4) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: var(--doc-white-elev) !important;
}
html[data-theme="dark"] .dec-os .doc-create-tile:hover:not(:disabled),
html[data-theme="classic-dark"] .dec-os .doc-create-tile:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.16) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 4px 14px rgba(0, 0, 0, 0.38) !important;
}
html[data-theme="dark"] .dec-os .doc-create-tile:active:not(:disabled),
html[data-theme="classic-dark"] .dec-os .doc-create-tile:active:not(:disabled) {
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.28),
    0 1px 4px rgba(0, 0, 0, 0.22) !important;
}
.doc-create-tile:disabled { opacity: .45; cursor: not-allowed; }

.doc-create-ico {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--doc-chip-bg);
  border: var(--doc-white-border);
  color: var(--dec-soft);
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
html[data-theme="dark"] .dec-os .doc-create-ico,
html[data-theme="classic-dark"] .dec-os .doc-create-ico {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--portal-muted, #9aa0ac);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
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
  border-radius: 12px;
  background: #f5f5f7;
  color: #1d1d1f;
}
html[data-theme="dark"] .doc-issuer-card,
html[data-theme="classic-dark"] .doc-issuer-card {
  background: rgba(255,255,255,0.06);
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
  border: var(--doc-white-border);
  background: var(--doc-white-bg);
  box-shadow: var(--doc-white-elev);
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

/* Empty state — Linear-style stack + calm copy */
.dec-scroll-body .dec-empty.doc-empty {
  padding: 48px 20px 56px;
  gap: 10px;
  max-width: 440px;
  margin: 0 auto;
}
.dec-scroll-body .dec-empty.doc-empty > p {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--dec-dark);
}
.dec-scroll-body .dec-empty.doc-empty > small {
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
.doc-empty-stroke {
  stroke: currentColor;
  stroke-width: 1.1;
  fill: none;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  opacity: 0.72;
}
.doc-empty-fill {
  fill: color-mix(in srgb, currentColor 7%, transparent);
  stroke: none;
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
  animation: docEmptyFloat 4.4s ease-in-out infinite;
}
.doc-empty-sheet--2 { animation-delay: .2s; }
.doc-empty-sheet--3 { animation-delay: .38s; }
@keyframes docEmptyFloat {
  0%, 100% { transform: translateY(0); opacity: .55; }
  50% { transform: translateY(-4px); opacity: 1; }
}

html[data-theme="dark"] .dec-os .doc-empty-art,
html[data-theme="classic-dark"] .dec-os .doc-empty-art {
  color: var(--portal-muted, #9aa0ac);
}
html[data-theme="dark"] .dec-os .doc-agency-gate,
html[data-theme="classic-dark"] .dec-os .doc-agency-gate {
  background: var(--festag-black-popup, #121214);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--doc-white-elev);
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
