import { DECISION_CSS } from '@/components/decisions/decisions-styles'

export const DOCUMENTS_CSS = `
${DECISION_CSS}

.doc-filters {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.doc-filter {
  padding: 7px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
  background: var(--dec-pill-surface, rgba(255,255,255,.06));
  color: var(--dec-soft);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.doc-filter.on {
  background: var(--portal-btn-primary, #fff);
  color: var(--portal-btn-primary-text, #000);
  border-color: transparent;
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
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
  background: color-mix(in srgb, var(--dec-pill-surface, rgba(255,255,255,.06)) 92%, transparent);
  color: var(--dec-dark);
  font: inherit;
  cursor: pointer;
  transition: background .14s, border-color .14s, transform .12s;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}
.doc-create-tile:hover:not(:disabled) {
  background: color-mix(in srgb, var(--surface-2) 58%, transparent);
  border-color: color-mix(in srgb, var(--border) 90%, transparent);
}
.doc-create-tile:active:not(:disabled) { transform: scale(.995); }
.doc-create-tile:disabled { opacity: .45; cursor: not-allowed; }
.doc-create-ico {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--surface-2) 75%, transparent);
  color: var(--dec-dark);
  flex-shrink: 0;
}
.doc-create-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.doc-create-label {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -.01em;
  color: var(--dec-dark);
}
.doc-create-sub {
  font-size: 12px;
  line-height: 1.35;
  color: var(--dec-soft);
}
.doc-create-plus {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--dec-cta-bg, #5b647d) 14%, transparent);
  color: var(--dec-dark);
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
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  background: color-mix(in srgb, var(--dec-pill-surface, rgba(255,255,255,.06)) 80%, transparent);
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
