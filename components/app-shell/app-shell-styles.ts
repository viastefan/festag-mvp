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
}
`.replace(/\s+/g, ' ').trim()
