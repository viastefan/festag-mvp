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
  gap: 8px;
  margin-bottom: 18px;
}
.doc-create-tile {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
  background: color-mix(in srgb, var(--dec-pill-surface, rgba(255,255,255,.06)) 85%, transparent);
  color: var(--dec-dark);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background .14s, border-color .14s;
  text-align: left;
}
.doc-create-tile:hover:not(:disabled) {
  background: color-mix(in srgb, var(--surface-2) 55%, transparent);
  border-color: color-mix(in srgb, var(--border) 80%, transparent);
}
.doc-create-tile:disabled { opacity: .45; cursor: not-allowed; }
.doc-create-ico {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--surface-2) 70%, transparent);
  color: var(--dec-soft);
  flex-shrink: 0;
}

.doc-bridge-banner,
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
.doc-bridge-banner strong,
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
