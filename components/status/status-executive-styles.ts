export const STATUS_EXECUTIVE_CSS = `
.st-ex {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 36px 40px 56px;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}
.st-ex-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 44px;
}
.st-ex-greeting {
  margin: 0;
  font-size: clamp(28px, 3.2vw, 36px);
  font-weight: 500;
  letter-spacing: 0.012em;
  line-height: 1.15;
  color: var(--text);
}
.st-ex-sub {
  margin: 10px 0 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-muted);
  max-width: 48ch;
}
.st-ex-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.st-ex-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.012em;
  cursor: pointer;
  white-space: nowrap;
}
.st-ex-pill:hover { background: color-mix(in srgb, var(--border) 25%, transparent); }
.st-ex-pill--dark {
  background: var(--portal-btn-primary, #1D1D1F);
  color: var(--portal-btn-primary-text, #fff);
  border-color: transparent;
}
.st-ex-pill--dark:hover {
  background: color-mix(in srgb, var(--portal-btn-primary, #1D1D1F) 88%, #fff);
}

.st-ex-kpis {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 48px;
}
@media (max-width: 1200px) {
  .st-ex-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.st-ex-mobile-head {
  display: none;
}
@media (max-width: 768px) {
  .st-ex-mobile-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 16px 0;
    position: sticky;
    top: 0;
    z-index: 4;
    background: var(--portal-card, var(--surface, #fff));
  }
  .st-ex { padding-top: 0; }
  .st-ex-head { display: none; }
}

.st-ex-kpi {
  border-radius: 24px;
  background: color-mix(in srgb, var(--surface-2, #f5f5f7) 70%, transparent);
  padding: 18px 18px 16px;
  min-height: 118px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
}
[data-theme="dark"] .st-ex-kpi,
[data-theme="classic-dark"] .st-ex-kpi {
  background: rgba(255,255,255,.04);
  border-color: rgba(255,255,255,.06);
}
.st-ex-kpi-label {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}
.st-ex-kpi-value {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1;
  color: var(--text);
}
.st-ex-kpi-chart {
  margin-top: auto;
  height: 36px;
  width: 100%;
  opacity: 0.85;
}
.st-ex-kpi-trend {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
}
.st-ex-kpi-trend.up { color: #34C759; }
.st-ex-kpi-trend.down { color: #FF3B30; }

.st-ex-section {
  margin-bottom: 40px;
}
.st-ex-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.st-ex-section-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.st-ex-section-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  border: 0;
  background: none;
  cursor: pointer;
  padding: 0;
  font: inherit;
}
.st-ex-section-link:hover { color: var(--text); }

.st-ex-summary {
  border-radius: 28px;
  padding: 24px 28px;
  background: color-mix(in srgb, var(--surface-2, #f5f5f7) 55%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 45%, transparent);
}
.st-ex-summary p {
  margin: 0;
  font-size: 17px;
  line-height: 1.6;
  letter-spacing: 0.015em;
  color: var(--text);
}
.st-ex-summary-meta {
  margin-top: 14px;
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}
.st-ex-tagro-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5B647D;
}

.st-ex-projects {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.st-ex-project {
  border-radius: 24px;
  padding: 20px 20px 18px;
  background: var(--surface, #fff);
  border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: box-shadow 0.18s, transform 0.18s;
}
.st-ex-project:hover {
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}
.st-ex-project-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.st-ex-project-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.012em;
  line-height: 1.3;
}
.st-ex-health {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
}
.st-ex-health--green { background: rgba(52,199,89,.12); color: #248A3D; }
.st-ex-health--amber { background: rgba(255,149,0,.14); color: #C93400; }
.st-ex-health--red { background: rgba(255,59,48,.12); color: #D70015; }
.st-ex-project-meta {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.45;
}
.st-ex-progress {
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 40%, transparent);
  overflow: hidden;
}
.st-ex-progress > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #5B647D;
}

.st-ex-attention {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.st-ex-attention-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 20px;
  background: color-mix(in srgb, #FF3B30 6%, var(--surface));
  border: 1px solid color-mix(in srgb, #FF3B30 12%, transparent);
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
}
.st-ex-attention-item:hover {
  background: color-mix(in srgb, #FF3B30 9%, var(--surface));
}
.st-ex-attention-ico {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(255,59,48,.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #FF3B30;
}
.st-ex-attention-copy { min-width: 0; flex: 1; }
.st-ex-attention-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.012em;
}
.st-ex-attention-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.st-ex-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 20px;
}
.st-ex-timeline::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: color-mix(in srgb, var(--border) 70%, transparent);
}
.st-ex-tl-item {
  position: relative;
  padding: 0 0 22px 16px;
}
.st-ex-tl-item:last-child { padding-bottom: 0; }
.st-ex-tl-dot {
  position: absolute;
  left: -20px;
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--surface, #fff);
  border: 2px solid #5B647D;
}
.st-ex-tl-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.012em;
  line-height: 1.4;
}
.st-ex-tl-time {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.st-ex-empty {
  margin: 0;
  padding: 20px 22px;
  border-radius: 20px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--surface-2, #f5f5f7) 45%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
}
`
