/** Scoped styles for Delivery Coordination panels (dev + client). */

export const COORDINATION_CSS = `
.coord-panel {
  border: 1px solid var(--border, rgba(0,0,0,.08));
  border-radius: 14px;
  background: var(--portal-card, #fff);
  overflow: hidden;
}
.coord-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--border, rgba(0,0,0,.06));
}
.coord-kicker {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.coord-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.coord-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.45;
}
.coord-metrics {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.coord-metric {
  min-width: 52px;
  padding: 6px 8px;
  border-radius: 10px;
  background: #f5f5f7;
  text-align: center;
}
.coord-metric strong {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.coord-metric span {
  font-size: 10px;
  color: var(--text-muted);
}
.coord-flow {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 11px;
  color: var(--text-muted);
  background: #f5f5f7;
  border-bottom: 1px solid var(--border, rgba(0,0,0,.04));
}
.coord-timeline {
  padding: 10px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}
.coord-event {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 10px;
  align-items: start;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f5f5f7;
}
.coord-event.is-actionable {
  outline: 1px solid color-mix(in srgb, var(--accent, #0071e3) 35%, transparent);
  background: color-mix(in srgb, var(--accent, #0071e3) 6%, #f5f5f7);
}
.coord-event-dot {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #1d1d1f;
  background: #ebebed;
}
.coord-event-dot.actor-client { background: #e8f0fe; color: #1a56db; }
.coord-event-dot.actor-dev { background: #ecfdf3; color: #047857; }
.coord-event-dot.actor-tagro { background: #f3e8ff; color: #7c3aed; }
.coord-event-body h4 {
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.coord-event-body p {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.coord-event-meta {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
}
.coord-compose {
  padding: 12px 16px 16px;
  border-top: 1px solid var(--border, rgba(0,0,0,.06));
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.coord-compose label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .03em;
}
.coord-compose input,
.coord-compose textarea,
.coord-compose select {
  width: 100%;
  border: 1px solid var(--border, rgba(0,0,0,.1));
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 13px;
  background: var(--portal-card, #fff);
  color: var(--text-primary);
}
.coord-compose textarea { min-height: 72px; resize: vertical; }
.coord-compose-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.coord-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: var(--text-primary, #1d1d1f);
  color: #fff;
}
.coord-btn:disabled { opacity: .45; cursor: not-allowed; }
.coord-btn.ghost {
  background: #f5f5f7;
  color: var(--text-primary);
}
.coord-btn.tagro {
  background: color-mix(in srgb, #7c3aed 12%, #f5f5f7);
  color: #5b21b6;
}
.coord-error {
  margin: 0;
  font-size: 12px;
  color: var(--red, #dc2626);
}
.coord-empty {
  margin: 0;
  padding: 16px;
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}
.coord-success {
  margin: 0;
  font-size: 12px;
  color: var(--green-dark, #047857);
}
html[data-theme="dark"] .coord-panel,
html[data-theme="classic-dark"] .coord-panel {
  background: var(--portal-card, #0c0c0e);
}
html[data-theme="dark"] .coord-metric,
html[data-theme="classic-dark"] .coord-metric,
html[data-theme="dark"] .coord-flow,
html[data-theme="classic-dark"] .coord-flow,
html[data-theme="dark"] .coord-event,
html[data-theme="classic-dark"] .coord-event {
  background: rgba(255,255,255,.05);
}
html[data-theme="dark"] .coord-btn.ghost,
html[data-theme="classic-dark"] .coord-btn.ghost {
  background: rgba(255,255,255,.08);
}
`
