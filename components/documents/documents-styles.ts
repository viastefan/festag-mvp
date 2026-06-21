import { DECISION_CSS } from '@/components/decisions/decisions-styles'

export const DOCUMENTS_CSS = `
${DECISION_CSS}

.dec-os {
  --doc-white-bg: #ffffff;
  --doc-white-elev:
    inset 0 1px 0 rgba(255, 255, 255, 1),
    0 1px 0 rgba(0, 0, 0, 0.04),
    0 4px 10px rgba(144, 149, 159, 0.16);
  --doc-white-border: 1px solid rgba(0, 0, 0, 0.07);
  --doc-chip-bg: rgba(15, 23, 42, 0.05);
  --doc-chip-hover: rgba(15, 23, 42, 0.08);
}
[data-theme="dark"] .dec-os,
[data-theme="classic-dark"] .dec-os {
  --doc-white-bg: #141416;
  --doc-white-elev:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.28);
  --doc-white-border: 1px solid rgba(255, 255, 255, 0.1);
  --doc-chip-bg: rgba(255, 255, 255, 0.06);
  --doc-chip-hover: rgba(255, 255, 255, 0.09);
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
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
  transition: background .12s ease, color .12s ease, box-shadow .12s ease, border-color .12s ease;
}
.doc-filter:hover {
  color: var(--dec-dark);
  background: var(--doc-chip-hover);
}
.doc-filter.on {
  background: var(--doc-white-bg);
  color: var(--dec-dark);
  border: var(--doc-white-border);
  box-shadow: var(--doc-white-elev);
}
[data-theme="dark"] .doc-filter,
[data-theme="classic-dark"] .doc-filter {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
[data-theme="dark"] .doc-filter.on,
[data-theme="classic-dark"] .doc-filter.on {
  box-shadow: var(--doc-white-elev);
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
[data-theme="dark"] .doc-create-tile:hover:not(:disabled),
[data-theme="classic-dark"] .doc-create-tile:hover:not(:disabled) {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 4px 14px rgba(0, 0, 0, 0.32);
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
[data-theme="dark"] .doc-create-ico,
[data-theme="classic-dark"] .doc-create-ico {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
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
