/**
 * Pre-workspace Festag App Shell — scoped styles on `.fas-root`.
 * Ivory light · Primary Dusk dark (create-workspace) · soft sidebar hairline.
 */

import { FESTAG_SAND } from '@/lib/design-tokens/sand-read'

export const APP_SHELL_STYLES = `
.fas-root {
  --fas-canvas: ${FESTAG_SAND.canvasWarm};
  --fas-sidebar-bg: ${FESTAG_SAND.canvasSoft};
  --fas-main-bg: #FFFEFB;
  --fas-ink: ${FESTAG_SAND.ink};
  --fas-ink-muted: #8891a0;
  --fas-ink-faint: rgba(30, 30, 32, 0.42);
  --fas-card: #ffffff;
  --fas-card-border: rgba(30, 30, 32, 0.07);
  --fas-card-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  --fas-sep: rgba(30, 30, 32, 0.07);
  --fas-nav-idle: rgba(30, 30, 32, 0.52);
  --fas-nav-hover: rgba(30, 30, 32, 0.06);
  --fas-nav-active: rgba(30, 30, 32, 0.09);
  --fas-nav-active-ink: ${FESTAG_SAND.ink};
  --fas-sidebar-w: 232px;
  --fas-sidebar-collapsed-w: 64px;
  --festag-sidebar-width: var(--fas-sidebar-w);
  --fas-topbar-h: 52px;
  --fas-radius: 10px;
  --fas-radius-btn: 6px;
  --fas-btn-bg: #ffffff;
  --fas-btn-bg-hover: #fafafa;
  --fas-btn-bg-active: #f5f5f6;
  --fas-btn-fg: #1e1e20;
  --fas-btn-border: rgba(30, 30, 32, 0.08);
  --fas-btn-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  --fas-popover: #ffffff;
  --fas-popover-border: rgba(30, 30, 32, 0.08);
  --fas-popover-shadow: 0 8px 28px rgba(15, 23, 42, 0.10), 0 1px 2px rgba(0, 0, 0, 0.04);

  position: fixed;
  inset: 0;
  display: flex;
  background: var(--fas-canvas);
  color: var(--fas-ink);
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
  z-index: 1;
}

.fas-root.is-sidebar-collapsed {
  --festag-sidebar-width: var(--fas-sidebar-collapsed-w);
}

html[data-theme="dark"] .fas-root,
html[data-theme="classic-dark"] .fas-root {
  --fas-canvas: #0C0D12;
  --fas-sidebar-bg: rgba(16, 18, 26, 0.72);
  --fas-main-bg: transparent;
  --fas-ink: #E6E8EE;
  --fas-ink-muted: #8891a0;
  --fas-ink-faint: #6B7385;
  --fas-card: #14161F;
  --fas-card-border: rgba(255, 255, 255, 0.06);
  --fas-card-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
  --fas-sep: rgba(255, 255, 255, 0.06);
  --fas-nav-idle: rgba(230, 232, 238, 0.55);
  --fas-nav-hover: rgba(255, 255, 255, 0.05);
  --fas-nav-active: rgba(255, 255, 255, 0.08);
  --fas-nav-active-ink: #E6E8EE;
  --fas-btn-bg: rgba(186, 194, 210, 0.08);
  --fas-btn-bg-hover: rgba(186, 194, 210, 0.11);
  --fas-btn-bg-active: rgba(186, 194, 210, 0.14);
  --fas-btn-fg: rgba(245, 245, 247, 0.88);
  --fas-btn-border: rgba(255, 255, 255, 0.06);
  --fas-btn-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  --fas-popover: #171A24;
  --fas-popover-border: rgba(255, 255, 255, 0.06);
  --fas-popover-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  /* Same Primary Dusk atmosphere as /create-workspace */
  background:
    radial-gradient(ellipse 90% 48% at 40% -8%, rgba(255, 255, 255, 0.035), transparent 55%),
    radial-gradient(ellipse 80% 42% at 60% 110%, rgba(255, 255, 255, 0.02), transparent 60%),
    linear-gradient(180deg, #10121A 0%, #0C0D12 48%, #0B0C10 100%) !important;
  color: #E6E8EE;
}

html[data-theme="read"] .fas-root {
  --fas-canvas: ${FESTAG_SAND.canvasWarm};
  --fas-sidebar-bg: ${FESTAG_SAND.canvasSoft};
  --fas-main-bg: #FFFEFB;
}

/* ── Sidebar ── */
.fas-sidebar {
  width: var(--fas-sidebar-w);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 14px 10px 12px;
  background: var(--fas-sidebar-bg);
  border: none;
  border-right: 1px solid var(--fas-sep);
  overflow: hidden;
  position: relative;
  transition: width 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.fas-sidebar.is-collapsed {
  width: var(--fas-sidebar-collapsed-w);
  padding-left: 8px;
  padding-right: 8px;
}

.fas-sidebar-top {
  position: relative;
  flex-shrink: 0;
  margin-bottom: 14px;
  z-index: 5;
}

.fas-sidebar-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  column-gap: 8px;
  min-width: 0;
  padding: 0;
}

.fas-ws-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
  margin: 2px 4px;
  padding: 2px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--fas-ink);
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
  overflow: hidden;
}
.fas-ws-trigger:hover,
.fas-ws-trigger.is-open {
  background: var(--fas-nav-hover);
}
.fas-ws-copy {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 0 1 auto;
  max-width: 100%;
  overflow: hidden;
}
.fas-ws-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  line-height: 1.15;
  min-width: 0;
  overflow: hidden;
}
.fas-ws-label {
  font-size: 9px;
  font-weight: 400;
  color: var(--fas-ink-muted);
  letter-spacing: 0.6px;
  text-transform: uppercase;
  white-space: nowrap;
  line-height: 1.2;
}
.fas-ws-value {
  display: block;
  font-size: 14px;
  font-weight: 400;
  color: var(--fas-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 9rem;
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.fas-ws-caret {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  color: var(--fas-ink-muted);
  opacity: 0.85;
}
.fas-ws-mark {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  letter-spacing: -0.02em;
  color: var(--fas-ink);
  background: var(--fas-card);
  border: 1px solid var(--fas-card-border);
  box-shadow: var(--fas-card-shadow);
}

.fas-sidebar-utils {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.fas-sidebar-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--fas-ink-muted);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
  font-family: inherit;
  padding: 0;
}
.fas-sidebar-icon:hover {
  background: var(--fas-nav-hover);
  color: var(--fas-ink);
}

.fas-ws-popover {
  top: calc(100% + 4px);
  left: 0;
  right: auto;
  min-width: 220px;
}
.fas-popover-note {
  margin: 0 8px 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--fas-ink-muted);
}

.fas-notif-dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5B647D;
}
.fas-notif-popover {
  min-width: 300px;
  max-width: 340px;
  max-height: min(420px, 70vh);
  overflow: auto;
  padding: 8px;
}
.fas-notif-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fas-notif-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  padding: 12px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
}
.fas-notif-card:hover {
  background: var(--fas-nav-hover);
}
.fas-notif-card.is-unread {
  background: rgba(91, 100, 125, 0.06);
}
.fas-notif-card-title {
  font-size: 14px;
  letter-spacing: 0.01em;
  color: var(--fas-ink);
}
.fas-notif-card-body {
  font-size: 13px;
  line-height: 1.45;
  color: var(--fas-ink-muted);
}

.fas-sidebar.is-collapsed .fas-sidebar-header {
  grid-template-columns: 1fr;
  justify-items: center;
  gap: 8px;
}
.fas-sidebar.is-collapsed .fas-ws-trigger {
  width: 36px;
  height: 36px;
  margin: 0;
  padding: 0;
  justify-content: center;
  border-radius: 50%;
}
.fas-sidebar.is-collapsed .fas-sidebar-utils {
  flex-direction: column;
}
.fas-sidebar.is-collapsed .fas-nav-link {
  justify-content: center;
  padding: 0;
  width: 40px;
  height: 40px;
  margin: 0 auto;
}
.fas-sidebar.is-collapsed .fas-nav-group,
.fas-sidebar.is-collapsed .fas-nav-after-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.fas-sidebar.is-collapsed .fas-sidebar-footer {
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.fas-sidebar.is-collapsed .fas-settings-link {
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  margin: 0;
}
.fas-sidebar.is-collapsed .fas-help-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 10px;
}

.fas-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 2px;
  scrollbar-width: none;
}
.fas-nav::-webkit-scrollbar { display: none; }

.fas-nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 10px;
  border-radius: 7px;
  color: var(--fas-nav-idle);
  text-decoration: none;
  font-size: 13.5px;
  letter-spacing: -0.01em;
  transition: background 0.14s ease, color 0.14s ease;
  border: none;
  background: transparent;
  cursor: pointer;
  width: 100%;
  text-align: left;
  font-family: inherit;
  font-weight: 400;
}
.fas-nav-link:hover {
  background: var(--fas-nav-hover);
  color: var(--fas-nav-active-ink);
}
.fas-nav-link.is-active {
  background: var(--fas-nav-active);
  color: var(--fas-nav-active-ink);
}
.fas-nav-link svg { flex-shrink: 0; opacity: 0.88; }

.fas-nav-group {
  margin: 10px 0 4px;
  padding: 10px 0 0;
  border-top: 1px solid var(--fas-sep);
}
.fas-nav-group + .fas-nav-group {
  margin-top: 8px;
}
.fas-nav-after-group {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--fas-sep);
}

.fas-profile-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(30, 30, 32, 0.08);
  color: var(--fas-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  letter-spacing: -0.02em;
  flex-shrink: 0;
}
html[data-theme="dark"] .fas-profile-avatar,
html[data-theme="classic-dark"] .fas-profile-avatar {
  background: rgba(255, 255, 255, 0.08);
}

.fas-sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  margin-top: 8px;
  padding: 4px 4px 2px;
}

.fas-settings-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 7px;
  text-decoration: none;
  color: var(--fas-ink-muted);
  font-size: 13px;
  letter-spacing: -0.01em;
  transition: color 0.14s ease, background 0.14s ease;
}
.fas-settings-link:hover {
  color: var(--fas-ink);
  background: var(--fas-nav-hover);
}
.fas-settings-link.is-active {
  color: var(--fas-nav-active-ink);
  background: var(--fas-nav-active);
}
.fas-settings-link svg { flex-shrink: 0; opacity: 0.9; }

.fas-help-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 8px;
  border: none;
  background: var(--fas-nav-active);
  color: var(--fas-ink);
  font-size: 12.5px;
  font-family: inherit;
  font-weight: 400;
  letter-spacing: -0.01em;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s ease, color 0.12s ease;
}
.fas-help-btn:hover {
  background: rgba(30, 30, 32, 0.12);
}
html[data-theme="dark"] .fas-help-btn,
html[data-theme="classic-dark"] .fas-help-btn {
  background: rgba(255, 255, 255, 0.08);
}
html[data-theme="dark"] .fas-help-btn:hover,
html[data-theme="classic-dark"] .fas-help-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* ── Main column ── */
.fas-main-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--fas-main-bg);
}

.fas-topbar {
  height: var(--fas-topbar-h);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 20px 0 8px;
  background: transparent;
}

.fas-topbar-left,
.fas-topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.fas-ws-switch {
  display: none;
}

.fas-icon-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--fas-radius-btn);
  border: none;
  background: transparent;
  color: var(--fas-ink-muted);
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease;
  font-family: inherit;
  position: relative;
}
.fas-icon-btn:hover {
  background: var(--fas-nav-hover);
  color: var(--fas-ink);
}

.fas-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  padding: 8px;
  border-radius: 10px;
  background: var(--fas-popover);
  border: 1px solid var(--fas-popover-border);
  box-shadow: var(--fas-popover-shadow);
  z-index: 40;
  animation: fasPop 0.16s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.fas-popover-left { left: 0; right: auto; }
.fas-popover-title {
  font-size: 12.5px;
  color: var(--fas-ink-muted);
  padding: 6px 8px 8px;
}
.fas-popover-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--fas-ink);
  font-size: 13px;
  font-family: inherit;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.12s ease;
}
.fas-popover-item:hover { background: var(--fas-nav-hover); }
.fas-popover-sep {
  height: 1px;
  background: var(--fas-sep);
  margin: 4px 4px;
}

.fas-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 28px 48px;
  scrollbar-gutter: stable;
}

/* Assemble motion */
@keyframes fasAssemble {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fasPop {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.fas-assemble {
  animation: fasAssemble 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.fas-assemble-d1 { animation-delay: 0.06s; }
.fas-assemble-d2 { animation-delay: 0.14s; }
.fas-assemble-d3 { animation-delay: 0.22s; }
.fas-assemble-d4 { animation-delay: 0.30s; }

/* ── Home ── */
.fas-home {
  max-width: 860px;
  margin: 0 auto;
  padding-top: 36px;
}

.fas-hero {
  margin-bottom: 36px;
}
.fas-hero-greet {
  margin: 0 0 8px;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.025em;
  font-weight: 400;
  color: var(--fas-ink);
}
.fas-hero-title {
  margin: 0 0 10px;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.025em;
  font-weight: 400;
  color: var(--fas-ink);
}
.fas-hero-support {
  margin: 0 0 22px;
  max-width: 460px;
  font-size: 15px;
  line-height: 1.55;
  color: var(--fas-ink-muted);
}

.fas-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 18px;
  border-radius: var(--fas-radius-btn);
  border: 1px solid var(--fas-btn-border) !important;
  background: var(--fas-btn-bg) !important;
  color: var(--fas-btn-fg) !important;
  box-shadow: var(--fas-btn-shadow);
  font-size: 14px;
  font-family: inherit;
  font-weight: 400;
  letter-spacing: -0.01em;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.14s ease, box-shadow 0.14s ease;
}
.fas-btn:hover {
  background: var(--fas-btn-bg-hover) !important;
}
.fas-btn:active {
  background: var(--fas-btn-bg-active) !important;
  box-shadow: none;
}

.fas-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}
@media (min-width: 720px) {
  .fas-cards {
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
}

.fas-card {
  background: var(--fas-card);
  border: 1px solid var(--fas-card-border);
  border-radius: var(--fas-radius);
  box-shadow: var(--fas-card-shadow);
  padding: 22px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 200px;
}
.fas-card-title {
  margin: 0;
  font-size: 15px;
  letter-spacing: -0.015em;
  font-weight: 400;
  color: var(--fas-ink);
}
.fas-card-body {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--fas-ink-muted);
  flex: 1;
}
.fas-card-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}
.fas-card-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0;
  color: var(--fas-ink);
  text-decoration: none;
  font-size: 13.5px;
  letter-spacing: -0.01em;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-weight: 400;
  text-align: left;
  width: 100%;
  border-bottom: 1px solid var(--fas-sep);
}
.fas-card-link:last-child { border-bottom: none; }
.fas-card-link:hover { color: var(--fas-ink); opacity: 0.78; }
.fas-card-link-muted {
  color: var(--fas-ink-muted);
  font-size: 12.5px;
}

/* ── Workflow viz ── */
.fas-workflow {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 4px;
}
.fas-workflow-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  position: relative;
  padding-bottom: 12px;
}
.fas-workflow-step:last-child { padding-bottom: 0; }
.fas-workflow-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 14px;
  flex-shrink: 0;
  padding-top: 3px;
}
.fas-workflow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--fas-ink-faint);
  flex-shrink: 0;
}
.fas-workflow-line {
  width: 1px;
  flex: 1;
  min-height: 14px;
  background: var(--fas-sep);
  margin-top: 4px;
}
.fas-workflow-step:last-child .fas-workflow-line { display: none; }
.fas-workflow-label {
  font-size: 13px;
  line-height: 1.35;
  color: var(--fas-ink);
  letter-spacing: -0.01em;
  padding-top: 0;
}
.fas-workflow-hint {
  display: block;
  font-size: 12px;
  color: var(--fas-ink-muted);
  margin-top: 2px;
  line-height: 1.4;
}

/* ── Workspace Overview (operational) ── */
.fas-wo {
  max-width: 920px;
  margin: 0 auto;
  padding-top: 28px;
  padding-bottom: 64px;
}
.fas-wo-loading {
  padding-top: 48px;
}
.fas-wo-skeleton {
  height: 12px;
  width: 180px;
  border-radius: 6px;
  background: rgba(30, 30, 32, 0.06);
  animation: fasAssemble 1.2s ease infinite alternate;
}
html[data-theme="dark"] .fas-wo-skeleton,
html[data-theme="classic-dark"] .fas-wo-skeleton {
  background: rgba(255, 255, 255, 0.06);
}

.fas-wo-hero {
  margin-bottom: 40px;
}
.fas-wo-greet {
  margin: 0 0 10px;
  font-size: 32px;
  line-height: 1.15;
  letter-spacing: -0.03em;
  font-weight: 400;
  color: var(--fas-ink);
}
.fas-wo-calm {
  margin: 0 0 18px;
  max-width: 520px;
  font-size: 16px;
  line-height: 1.5;
  color: var(--fas-ink-muted);
}
.fas-wo-domain {
  margin: -8px 0 18px;
  font-size: 13.5px;
  letter-spacing: -0.015em;
  color: var(--fas-ink-faint);
  word-break: break-all;
}
.fas-wo-meta {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}
.fas-wo-meta li {
  font-size: 13px;
  letter-spacing: -0.01em;
  color: var(--fas-ink-faint);
}

.fas-wo-briefing {
  margin-bottom: 44px;
  padding: 28px 28px 24px;
  background: var(--fas-card);
  border: 1px solid var(--fas-card-border);
  border-radius: 14px;
  box-shadow: var(--fas-card-shadow);
}
.fas-wo-briefing-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--fas-ink-muted);
}
.fas-wo-briefing-project {
  margin: 0 0 16px;
  font-size: 26px;
  line-height: 1.2;
  letter-spacing: -0.025em;
  font-weight: 400;
  color: var(--fas-ink);
}
.fas-wo-briefing-lines {
  margin: 0 0 22px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fas-wo-briefing-lines li {
  font-size: 15px;
  line-height: 1.5;
  color: var(--fas-ink);
  letter-spacing: -0.01em;
  padding-left: 14px;
  position: relative;
}
.fas-wo-briefing-lines li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--fas-ink-faint);
}
.fas-wo-briefing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.fas-wo-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: var(--fas-radius-btn);
  border: 1px solid var(--fas-btn-border) !important;
  background: var(--fas-btn-bg) !important;
  color: var(--fas-btn-fg) !important;
  box-shadow: var(--fas-btn-shadow);
  font-size: 13.5px;
  font-family: inherit;
  font-weight: 400;
  letter-spacing: -0.01em;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.14s ease, box-shadow 0.14s ease;
}
.fas-wo-btn:hover {
  background: var(--fas-btn-bg-hover) !important;
}
.fas-wo-btn:active {
  background: var(--fas-btn-bg-active) !important;
  box-shadow: none;
}
.fas-wo-btn--quiet,
.fas-wo-btn:disabled {
  background: transparent !important;
  box-shadow: none;
  color: var(--fas-ink-muted) !important;
  border-color: var(--fas-sep) !important;
  cursor: default;
  opacity: 0.85;
}

.fas-wo-section {
  margin-bottom: 40px;
}
.fas-wo-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.fas-wo-section-title {
  margin: 0;
  font-size: 18px;
  letter-spacing: -0.02em;
  font-weight: 400;
  color: var(--fas-ink);
}
.fas-wo-section-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--fas-ink-muted);
  text-decoration: none;
  letter-spacing: -0.01em;
}
.fas-wo-section-link:hover { color: var(--fas-ink); }
.fas-wo-quiet {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--fas-ink-muted);
}
.fas-wo-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 22px 0;
}
.fas-wo-empty p {
  margin: 0;
  max-width: 420px;
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--fas-ink-muted);
}

.fas-wo-project-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 720px) {
  .fas-wo-project-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.fas-wo-project {
  padding: 18px 18px 16px;
  background: var(--fas-card);
  border: 1px solid var(--fas-card-border);
  border-radius: 12px;
  box-shadow: var(--fas-card-shadow);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.fas-wo-project-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.fas-wo-project-name {
  margin: 0;
  font-size: 15.5px;
  letter-spacing: -0.015em;
  font-weight: 400;
  color: var(--fas-ink);
}
.fas-wo-health {
  flex-shrink: 0;
  font-size: 12px;
  letter-spacing: -0.01em;
  color: var(--fas-ink-muted);
  padding-top: 2px;
}
.fas-wo-health--risk,
.fas-wo-health--blocked {
  color: var(--fas-ink);
}
.fas-wo-progress {
  height: 3px;
  border-radius: 999px;
  background: rgba(30, 30, 32, 0.06);
  overflow: hidden;
}
html[data-theme="dark"] .fas-wo-progress,
html[data-theme="classic-dark"] .fas-wo-progress {
  background: rgba(255, 255, 255, 0.08);
}
.fas-wo-progress-bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--fas-ink-faint);
}
.fas-wo-project-meta {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.fas-wo-project-meta dt {
  font-size: 11.5px;
  color: var(--fas-ink-faint);
  margin: 0 0 2px;
}
.fas-wo-project-meta dd {
  margin: 0;
  font-size: 13px;
  color: var(--fas-ink);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fas-wo-project-open {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 13px;
  color: var(--fas-ink);
  text-decoration: none;
  letter-spacing: -0.01em;
}
.fas-wo-project-open:hover { opacity: 0.72; }

.fas-wo-decision-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fas-wo-decision {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--fas-card-border);
  background: var(--fas-card);
}
.fas-wo-decision-title {
  margin: 0 0 4px;
  font-size: 14.5px;
  letter-spacing: -0.01em;
  font-weight: 400;
  color: var(--fas-ink);
}
.fas-wo-decision-meta {
  margin: 0;
  font-size: 12.5px;
  color: var(--fas-ink-muted);
}

.fas-wo-split {
  display: grid;
  grid-template-columns: 1fr;
  gap: 36px;
}
@media (min-width: 860px) {
  .fas-wo-split {
    grid-template-columns: 1.4fr 0.9fr;
    gap: 40px;
  }
}

.fas-wo-activity {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.fas-wo-activity-row {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--fas-sep);
}
.fas-wo-activity-row:last-child { border-bottom: none; }
.fas-wo-activity-dot {
  width: 6px;
  height: 6px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--fas-ink-faint);
  flex-shrink: 0;
}
.fas-wo-activity-title {
  margin: 0 0 3px;
  font-size: 14px;
  letter-spacing: -0.01em;
  color: var(--fas-ink);
}
.fas-wo-activity-meta {
  margin: 0;
  font-size: 12.5px;
  color: var(--fas-ink-muted);
}

.fas-wo-team {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fas-wo-team-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.fas-wo-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: rgba(30, 30, 32, 0.06);
}
.fas-wo-avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  letter-spacing: -0.02em;
  color: var(--fas-ink);
}
.fas-wo-team-name {
  font-size: 14px;
  letter-spacing: -0.01em;
  color: var(--fas-ink);
}

.fas-topbar-notif {
  position: relative;
}
.fas-notif-empty {
  margin: 8px 10px;
  font-size: 13px;
  color: var(--fas-ink-muted);
}
.fas-assemble-d5 { animation-delay: 0.38s; }

/* ── Module empty ── */
.fas-empty {
  max-width: 420px;
  margin: 72px auto 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.fas-empty-title {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
  letter-spacing: -0.025em;
  font-weight: 400;
  color: var(--fas-ink);
}
.fas-empty-body {
  margin: 0 0 8px;
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--fas-ink-muted);
}

.fas-settings-lite {
  max-width: 480px;
  margin: 48px auto 0;
}
.fas-settings-lite .fas-empty {
  margin-top: 0;
  text-align: left;
  align-items: flex-start;
}
.fas-settings-row {
  margin-top: 28px;
  padding: 16px 18px;
  background: var(--fas-card);
  border: 1px solid var(--fas-card-border);
  border-radius: var(--fas-radius);
  box-shadow: var(--fas-card-shadow);
}
.fas-settings-row-label {
  font-size: 12.5px;
  color: var(--fas-ink-muted);
  margin-bottom: 4px;
}
.fas-settings-row-value {
  font-size: 14.5px;
  color: var(--fas-ink);
  letter-spacing: -0.01em;
}

@media (max-width: 768px) {
  .fas-root { flex-direction: column; }
  .fas-sidebar,
  .fas-sidebar.is-collapsed {
    width: 100%;
    flex-direction: row;
    align-items: center;
    padding: 8px 12px;
    overflow-x: auto;
    gap: 4px;
    border-right: none;
    border-bottom: 1px solid var(--fas-sep);
  }
  .fas-sidebar-top {
    margin: 0;
    flex-shrink: 0;
  }
  .fas-sidebar-header {
    grid-template-columns: auto auto;
    gap: 4px;
  }
  .fas-ws-name { max-width: 110px; }
  .fas-nav {
    flex-direction: row;
    overflow-x: auto;
    gap: 2px;
    padding: 0;
  }
  .fas-nav-group,
  .fas-nav-after-group {
    display: flex;
    flex-direction: row;
    margin: 0;
    padding: 0;
    border: none;
    gap: 2px;
  }
  .fas-nav-link {
    height: 32px;
    padding: 0 10px;
    white-space: nowrap;
  }
  .fas-nav-link span { display: none; }
  .fas-settings-link span { display: none; }
  .fas-ws-label,
  .fas-ws-value,
  .fas-ws-caret { display: none; }
  .fas-sidebar-collapse { display: none; }
  .fas-help-btn { display: none; }
  .fas-content { padding: 12px 18px 40px; }
  .fas-hero-greet,
  .fas-hero-title { font-size: 24px; }
  .fas-cards { grid-template-columns: 1fr; }
  .fas-wo { padding-top: 12px; }
  .fas-wo-greet { font-size: 26px; }
  .fas-wo-briefing { padding: 22px 18px 18px; }
  .fas-wo-briefing-project { font-size: 22px; }
  .fas-wo-decision { flex-direction: column; align-items: flex-start; }
}
`.replace(/\s+/g, ' ').trim()
