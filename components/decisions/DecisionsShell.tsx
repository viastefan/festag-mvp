'use client'

import { useEffect, useState } from 'react'
import PortalSidebar from '@/components/PortalSidebar'
import CommandPalette from '@/components/CommandPalette'

export const DECISIONS_SHELL_CSS = `
  .decisions-shell {
    --portal-bg: rgba(241,243,245,.9);
    --portal-card: #FFFFFF;
    --portal-text: #0f0f10;
    --portal-muted: #6e717e;
    --portal-soft: #8f93a4;
    --portal-nav-active-bg: rgba(255,255,255,.95);
    --portal-nav-avatar-bg: rgba(255,255,255,.8);
    --portal-nav-avatar-border: #f3f5f7;
    --portal-pill-bg: #f1f3f5;
    --portal-btn-primary: #5b647d;
    --portal-btn-outline-bg: #fff;
    --portal-btn-outline-border: #e7ebf0;
    --portal-btn-outline-text: #202532;
    --portal-row-hover: rgba(241,243,245,.4);
    --portal-icon-border: rgba(202,207,212,.2);
    --portal-shadow-card: 0 -2px 4px rgba(110,113,126,.05), 0 2px 4px rgba(110,113,126,.05);

    position:fixed; inset:0;
    background:var(--portal-bg);
    backdrop-filter:blur(40px) saturate(1.4);
    -webkit-backdrop-filter:blur(40px) saturate(1.4);
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    color:var(--portal-text);
    color-scheme:light;
    overflow:hidden;
    display:flex;
    gap:12px;
    padding:8px 8px 8px 12px;
    box-sizing:border-box;
  }
  [data-theme="dark"] .decisions-shell,
  [data-theme="classic-dark"] .decisions-shell {
    --portal-bg: #07090b;
    --portal-card: #141416;
    --portal-text: #f4f4f4;
    --portal-muted: #9aa0ac;
    --portal-soft: #8f93a4;
    --portal-nav-active-bg: rgba(255,255,255,.08);
    --portal-nav-avatar-bg: rgba(255,255,255,.06);
    --portal-nav-avatar-border: rgba(255,255,255,.08);
    --portal-pill-bg: rgba(255,255,255,.08);
    --portal-btn-primary: #7b849c;
    --portal-btn-outline-bg: rgba(255,255,255,.04);
    --portal-btn-outline-border: rgba(255,255,255,.1);
    --portal-btn-outline-text: #f4f4f4;
    --portal-row-hover: rgba(255,255,255,.06);
    --portal-icon-border: rgba(255,255,255,.1);
    --portal-shadow-card: 0 8px 30px rgba(0,0,0,.28);
    color-scheme: dark;
    backdrop-filter:none;
    -webkit-backdrop-filter:none;
  }
  [data-theme="light"] .decisions-shell,
  [data-theme="read"] .decisions-shell {
    color-scheme: light;
  }
  .decisions-nav-col {
    width:200px; flex-shrink:0;
    box-sizing:border-box;
    transition:width .22s cubic-bezier(.16,1,.3,1);
  }
  .decisions-shell.portal-sidebar-collapsed .decisions-nav-col {
    width:52px;
  }
  .decisions-main-col {
    flex:1; min-width:0;
    box-sizing:border-box;
    display:flex; flex-direction:column;
  }
  .decisions-main {
    flex:1; min-height:0;
    background:var(--portal-card);
    border-radius:12px;
    box-shadow:var(--portal-shadow-card);
    overflow:hidden;
    display:flex; flex-direction:column;
    position:relative;
  }
  @media (max-width: 900px) {
    .decisions-nav-col { display:none; }
    .decisions-main-col { padding:0; }
    .decisions-main { border-radius:0; }
  }
`

const STORAGE_KEY = 'festag-portal-sidebar-collapsed'

export default function DecisionsShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(STORAGE_KEY) === 'true')
    } catch { /* noop */ }
  }, [])

  function toggleSidebar() {
    setSidebarCollapsed(c => {
      const next = !c
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* noop */ }
      return next
    })
  }

  return (
    <div className={`decisions-shell${sidebarCollapsed ? ' portal-sidebar-collapsed' : ''}`}>
      <style>{DECISIONS_SHELL_CSS}</style>
      <div className="decisions-nav-col">
        <PortalSidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      </div>
      <div className="decisions-main-col">
        <div className="decisions-main">
          {children}
        </div>
      </div>
      <CommandPalette theme="portal" />
    </div>
  )
}
