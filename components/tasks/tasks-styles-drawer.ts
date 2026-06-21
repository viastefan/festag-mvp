export const TASK_DRAWER_CSS = `
.task-drawer-overlay {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; justify-content: flex-end;
}
.task-drawer-backdrop {
  flex: 1; border: 0; padding: 0; cursor: pointer;
  background: rgba(8, 10, 14, .42);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.task-drawer-panel {
  width: min(720px, 100vw); height: 100%;
  background: var(--bg, #fff); color: var(--text);
  border-left: 1px solid var(--border);
  display: flex; flex-direction: column;
  box-shadow: -24px 0 64px -20px rgba(0, 0, 0, .45);
  animation: taskDrawerIn .22s cubic-bezier(.16, 1, .3, 1) both;
  overflow: hidden;
}
@keyframes taskDrawerIn {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: none; opacity: 1; }
}
.task-drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 14px 18px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  flex-shrink: 0;
}
.task-drawer-head-meta { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.task-drawer-kicker {
  font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase;
  color: var(--text-muted, #90959F);
}
.task-drawer-title {
  margin: 0; font-size: 16px; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.task-drawer-close {
  width: 32px; height: 32px; border: 0; border-radius: 8px;
  background: transparent; color: var(--text-muted);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
}
.task-drawer-close:hover { background: var(--surface-2); color: var(--text); }
.task-drawer-body {
  flex: 1 1 auto; min-height: 0; overflow: hidden;
  display: flex; flex-direction: column;
}
.task-detail-shell.task-detail-drawer {
  height: 100%; min-height: 0; overflow: hidden;
  display: flex; flex-direction: column;
}
.task-detail-shell.task-detail-drawer .task-detail-topbar { display: none !important; }
.task-detail-shell.task-detail-drawer .task-detail-desktop {
  flex: 1 1 auto; min-height: 0; overflow: hidden;
  display: flex; flex-direction: column;
}
.task-detail-shell.task-detail-drawer .task-detail-grid {
  flex: 1 1 auto; min-height: 0; overflow-y: auto;
}
@media (max-width: 768px) {
  .task-drawer-panel { width: 100vw; }
  .task-drawer-head { padding-top: calc(10px + env(safe-area-inset-top, 0px)); }
}
`
