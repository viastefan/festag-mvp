export const ARCHITECTURE_PAGE_CSS = `
.arch {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 32px 36px 48px;
  box-sizing: border-box;
}
.arch-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}
.arch-title {
  margin: 0;
  font-size: clamp(28px, 3vw, 34px);
  font-weight: 500;
  letter-spacing: 0.012em;
  color: var(--text);
}
.arch-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.arch-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--festag-plate-border, rgba(15,23,42,0.055));
  background: var(--festag-plate-bg, #fff);
  box-shadow: var(--festag-plate-shadow, none);
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}
.arch-status-chip:hover {
  background: color-mix(in srgb, var(--hover, #f5f5f7) 80%, transparent);
}
.arch-status-score {
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
.arch-status-label {
  color: var(--text-muted);
  font-weight: 400;
}
.arch-mobile-pill { display: none; }

.arch-layout {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}
.arch-nav {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 4px;
}
.arch-nav-btn {
  text-align: left;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 13.5px;
  font-weight: 400;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  letter-spacing: 0.01em;
}
.arch-nav-btn:hover {
  color: var(--text);
  background: color-mix(in srgb, var(--hover, #f5f5f7) 70%, transparent);
}
.arch-nav-btn[data-active="true"] {
  color: var(--text);
  background: color-mix(in srgb, var(--hover, #f5f5f7) 90%, transparent);
}

.arch-main {
  display: flex;
  flex-direction: column;
  gap: 40px;
  min-width: 0;
  padding-bottom: 24px;
}
.arch-section-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 0.012em;
  color: var(--text);
}
.arch-section-summary {
  margin: 0 0 18px;
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--text-muted);
  max-width: 62ch;
}

.arch-domains {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.arch-domain {
  border-radius: 12px;
  padding: 14px 16px;
  background: var(--festag-glass-bg, color-mix(in srgb, var(--surface-2, #f5f5f7) 55%, transparent));
  border: 1px solid var(--festag-glass-border, color-mix(in srgb, var(--border) 45%, transparent));
}
.arch-domain-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.arch-domain-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}
.arch-domain-health {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}
.arch-domain-health[data-health="healthy"] { color: color-mix(in srgb, #3d7a5a 80%, var(--text-muted)); }
.arch-domain-health[data-health="attention"] { color: color-mix(in srgb, #9a7b3c 85%, var(--text-muted)); }
.arch-domain-health[data-health="gap"] { color: color-mix(in srgb, #9a5b5b 85%, var(--text-muted)); }
.arch-domain-note {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-muted);
}

.arch-os-panel {
  border-radius: 12px;
  padding: 20px 22px;
  background: var(--festag-plate-bg, #fff);
  border: 1px solid var(--festag-plate-border, rgba(15,23,42,0.055));
  box-shadow: var(--festag-plate-shadow, none);
}
.arch-os-title {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 500;
}
.arch-os-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px 16px;
}
.arch-os-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--text);
}
.arch-os-check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  color: var(--text-muted);
}
.arch-os-check[data-ok="true"] {
  border-color: color-mix(in srgb, #3d7a5a 40%, var(--border));
  color: color-mix(in srgb, #3d7a5a 90%, var(--text));
}

.arch-memory {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.arch-memory-item {
  border-radius: 12px;
  padding: 18px 20px;
  background: var(--festag-glass-bg, color-mix(in srgb, var(--surface-2, #f5f5f7) 55%, transparent));
  border: 1px solid var(--festag-glass-border, color-mix(in srgb, var(--border) 45%, transparent));
}
.arch-memory-q {
  margin: 0 0 8px;
  font-size: 15.5px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text);
}
.arch-memory-a {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted);
  max-width: 68ch;
}
.arch-memory-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 12.5px;
  color: var(--text-muted);
}
.arch-memory-meta strong {
  font-weight: 500;
  color: var(--text);
}

.arch-history {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-left: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  margin-left: 6px;
  padding-left: 18px;
}
.arch-history-item {
  position: relative;
  padding: 0 0 22px;
}
.arch-history-item:last-child { padding-bottom: 0; }
.arch-history-item::before {
  content: '';
  position: absolute;
  left: -22px;
  top: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
  opacity: 0.55;
}
.arch-history-ver {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.arch-history-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}
.arch-history-summary {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text-muted);
  max-width: 60ch;
}

.arch-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}
.arch-card {
  border-radius: 12px;
  padding: 16px 18px;
  background: var(--festag-glass-bg, color-mix(in srgb, var(--surface-2, #f5f5f7) 55%, transparent));
  border: 1px solid var(--festag-glass-border, color-mix(in srgb, var(--border) 45%, transparent));
}
.arch-card-title {
  margin: 0 0 6px;
  font-size: 14.5px;
  font-weight: 500;
  color: var(--text);
}
.arch-card-meta {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--text-muted);
}
.arch-card-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
}
.arch-anchors {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.arch-anchors li {
  font-size: 12.5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--text-muted);
  word-break: break-all;
}

.arch-prod {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.arch-prod-metric {
  border-radius: 12px;
  padding: 14px 16px;
  background: var(--festag-glass-bg, color-mix(in srgb, var(--surface-2, #f5f5f7) 55%, transparent));
  border: 1px solid var(--festag-glass-border, color-mix(in srgb, var(--border) 45%, transparent));
}
.arch-prod-label {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--text-muted);
}
.arch-prod-value {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text);
}
.arch-prod-hint {
  margin: 6px 0 0;
  font-size: 11.5px;
  color: var(--text-muted);
}

html[data-theme="dark"] .arch-status-chip,
html[data-theme="classic-dark"] .arch-status-chip {
  background: var(--festag-black-content, #0E0E10);
  border-color: rgba(255,255,255,0.06);
}
html[data-theme="dark"] .arch-os-panel,
html[data-theme="classic-dark"] .arch-os-panel {
  background: var(--festag-black-content, #0E0E10);
  border-color: rgba(255,255,255,0.06);
}
html[data-theme="dark"] .arch-domain,
html[data-theme="dark"] .arch-memory-item,
html[data-theme="dark"] .arch-card,
html[data-theme="dark"] .arch-prod-metric,
html[data-theme="classic-dark"] .arch-domain,
html[data-theme="classic-dark"] .arch-memory-item,
html[data-theme="classic-dark"] .arch-card,
html[data-theme="classic-dark"] .arch-prod-metric {
  background: var(--festag-black-raised, #151518);
  border-color: rgba(255,255,255,0.06);
}

@media (max-width: 980px) {
  .arch-layout { grid-template-columns: 1fr; }
  .arch-nav {
    position: static;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 4px;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }
  .arch-nav-btn { white-space: nowrap; flex-shrink: 0; }
}

@media (max-width: 768px) {
  .arch {
    padding: 20px 18px 120px;
  }
  .arch-mobile-pill { display: block; }
  .arch-status-chip { display: none; }
  .arch-head { margin-bottom: 20px; }
}
`
