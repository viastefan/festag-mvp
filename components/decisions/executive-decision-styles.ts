export const EXECUTIVE_DECISION_CSS = `
.edc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
  padding: 0 0 8px;
}
.edc-card {
  border-radius: 28px;
  padding: 24px 26px 22px;
  background: var(--surface, #fff);
  border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
  display: flex;
  flex-direction: column;
  gap: 16px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  width: 100%;
  transition: box-shadow 0.18s, transform 0.18s;
}
.edc-card:hover {
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}
.edc-card--critical {
  border-color: color-mix(in srgb, #FF3B30 20%, transparent);
  background: color-mix(in srgb, #FF3B30 4%, var(--surface));
}
.edc-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.edc-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.012em;
  line-height: 1.35;
}
.edc-priority {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255,59,48,.12);
  color: #D70015;
}
.edc-priority--high {
  background: rgba(255,149,0,.14);
  color: #C93400;
}
.edc-priority--normal {
  background: color-mix(in srgb, var(--border) 30%, transparent);
  color: var(--text-muted);
}
.edc-impact {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.45;
}
.edc-impact strong {
  color: var(--text);
  font-weight: 500;
}
.edc-routing {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.edc-route {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  padding: 5px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-2) 80%, transparent);
  color: var(--text-muted);
}
.edc-route.on {
  background: color-mix(in srgb, #5B647D 15%, transparent);
  color: var(--text);
}
.edc-tagro {
  border-radius: 16px;
  padding: 14px 16px;
  background: color-mix(in srgb, var(--surface-2, #f5f5f7) 70%, transparent);
}
.edc-tagro-label {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.edc-tagro-rec {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.012em;
}
.edc-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.edc-opt {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.012em;
  cursor: pointer;
  transition: background 0.15s;
}
.edc-opt:hover {
  background: color-mix(in srgb, var(--surface-2) 60%, transparent);
}
.edc-opt--rec {
  background: var(--portal-btn-primary, #2d2e2c);
  color: var(--portal-btn-primary-text, #fff);
  border-color: transparent;
}
.edc-opt--rec:hover {
  opacity: 0.92;
}
`
