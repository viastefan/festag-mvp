import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { TASK_DRAWER_CSS } from '@/components/tasks/tasks-styles-drawer'

/** Aufgaben — portal list chrome (extends dec-os). */
export const TASKS_CSS = `
${DECISION_CSS}
${TASK_DRAWER_CSS}

.task-filters {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.task-filter {
  padding: 7px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(255,255,255,.1)) 55%, transparent);
  background: var(--dec-pill-surface, rgba(255,255,255,.06));
  color: var(--dec-soft);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.task-filter.on {
  background: var(--portal-btn-primary, #fff);
  color: var(--portal-btn-primary-text, #000);
  border-color: transparent;
}

.task-create-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  border: 0;
  background: var(--dec-cta-bg, #5b647d);
  color: var(--dec-cta-text, #fff);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background .12s ease;
}
.task-create-btn:hover:not(:disabled) {
  background: var(--dec-cta-hover, color-mix(in srgb, #5b647d 88%, #000));
}
.task-create-btn:disabled { opacity: .5; cursor: not-allowed; }

.task-bridge-banner {
  margin: 0 0 18px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  background: color-mix(in srgb, var(--dec-pill-surface, rgba(255,255,255,.06)) 80%, transparent);
  color: var(--dec-soft);
  font-size: 12.5px;
  line-height: 1.45;
}
.task-bridge-banner strong {
  display: block;
  margin-bottom: 4px;
  color: var(--dec-dark);
  font-weight: 500;
}

.task-category-section {
  margin: 8px 0 18px;
}
.task-category-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 10px;
  color: var(--dec-soft);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: .02em;
}
.task-category-head em {
  margin-left: auto;
  font-style: normal;
  color: color-mix(in srgb, var(--dec-soft) 82%, transparent);
}

.task-card .dec-card-muted.task-card-progress {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.task-card-done-ico { color: #16a34a; flex-shrink: 0; }
.task-card-progress-bar {
  width: 56px;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dec-pill-surface, #f1f3f5) 90%, transparent);
  overflow: hidden;
  flex-shrink: 0;
}
.task-card-progress-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--dec-cta-bg, #5b647d);
}
.task-card-source .dec-card-label {
  font-size: 10px;
}

.task-suggest-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.task-suggest-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.task-suggest-project {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  background: color-mix(in srgb, var(--surface-2) 50%, transparent);
}
.task-suggest-project select {
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 13px;
  color: var(--text);
  max-width: 220px;
}
.task-suggest-ring {
  position: relative;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid var(--project-ring, #64748b);
  flex-shrink: 0;
}
.task-suggest-ring input {
  position: absolute;
  inset: -7px;
  width: 26px;
  height: 26px;
  opacity: 0;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.task-suggest-tabs {
  display: inline-flex;
  gap: 6px;
}
.task-suggest-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: transparent;
  color: var(--dec-soft);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.task-suggest-tabs button.on {
  background: var(--dec-pill-surface, rgba(255,255,255,.06));
  color: var(--dec-dark);
}
.task-suggest-notice {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--amber) 28%, var(--border));
  background: color-mix(in srgb, var(--amber-bg) 72%, transparent);
  color: var(--dec-soft);
  font-size: 12px;
  line-height: 1.45;
}
.task-suggest-preview {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
  background: color-mix(in srgb, var(--surface-2) 45%, transparent);
}
.task-suggest-preview strong {
  font-size: 14px;
  color: var(--dec-dark);
}
.task-suggest-preview p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dec-soft);
}
.task-suggest-dev-hint {
  font-size: 12px !important;
  color: color-mix(in srgb, var(--dec-dark) 72%, var(--dec-soft)) !important;
}
.task-suggest-preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.task-suggest-preview-actions button {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: transparent;
  color: var(--dec-soft);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
}
.task-suggest-preview-actions button.primary {
  background: var(--dec-cta-bg, #5b647d);
  border-color: transparent;
  color: #fff;
}
.task-suggest-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.task-suggest-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  color: var(--dec-soft);
  font-size: 12px;
}
.task-suggest-chip select,
.task-suggest-chip input {
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 12px;
  color: var(--text);
}
.task-suggest-chip.on {
  color: var(--dec-dark);
}
.task-suggest-chip button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  padding: 0;
}
.task-suggest-bridge {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--dec-soft);
}
`
