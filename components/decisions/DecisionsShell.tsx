'use client'

import { useEffect, useState } from 'react'
import PortalSidebar from '@/components/PortalSidebar'
import CommandPalette from '@/components/CommandPalette'

export const DECISIONS_SHELL_CSS = `
  .decisions-shell {
    --portal-bg: #F6F6F7;
    --portal-card: #FFFFFF;
    --portal-text: #0f0f10;
    --portal-muted: #6e717e;
    --portal-soft: #8f93a4;
    --portal-nav-active-bg: var(--glass-nav-active, rgba(0,0,0,.055));
    --portal-nav-avatar-bg: rgba(255,255,255,.72);
    --portal-nav-avatar-border: rgba(255,255,255,.5);
    --portal-pill-bg: #f1f3f5;
    --portal-btn-primary: #5b647d;
    --portal-btn-outline-bg: #fff;
    --portal-btn-outline-border: #e7ebf0;
    --portal-btn-outline-text: #202532;
    --portal-row-hover: rgba(241,243,245,.4);
    --portal-icon-border: rgba(202,207,212,.2);
    --portal-shadow-card: none;

    position:fixed; inset:0;
    background:var(--portal-bg);
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    color:var(--portal-text);
    color-scheme:light;
    overflow:hidden;
    display:flex;
    gap:0;
    padding:0;
    box-sizing:border-box;
  }
  [data-theme="dark"] .decisions-shell,
  [data-theme="classic-dark"] .decisions-shell {
    --portal-bg: var(--glass-shell-bg, rgba(7,9,11,.92));
    --portal-card: #141416;
    --portal-text: #f4f4f4;
    --portal-muted: #9aa0ac;
    --portal-soft: #8f93a4;
    --portal-nav-active-bg: var(--glass-nav-active, rgba(255,255,255,.09));
    --portal-nav-avatar-bg: rgba(255,255,255,.06);
    --portal-nav-avatar-border: rgba(255,255,255,.08);
    --portal-pill-bg: rgba(255,255,255,.08);
    --portal-btn-primary: #7b849c;
    --portal-btn-outline-bg: rgba(255,255,255,.04);
    --portal-btn-outline-border: rgba(255,255,255,.1);
    --portal-btn-outline-text: #f4f4f4;
    --portal-row-hover: rgba(255,255,255,.06);
    --portal-icon-border: rgba(255,255,255,.1);
    --portal-shadow-card: none;
    color-scheme: dark;
  }
  [data-theme="light"] .decisions-shell,
  [data-theme="read"] .decisions-shell {
    color-scheme: light;
  }

  .decisions-nav-col {
    width:var(--festag-sidebar-width, 260px); flex-shrink:0;
    box-sizing:border-box;
    display:flex; flex-direction:column;
    background:transparent;
    border-right:none;
    box-shadow:none;
    overflow:hidden;
    transition:width .22s cubic-bezier(.16,1,.3,1);
  }
  .decisions-shell.portal-sidebar-collapsed .decisions-nav-col {
    width:56px;
  }

  .decisions-main-col {
    flex:1; min-width:0;
    box-sizing:border-box;
    display:flex; flex-direction:column;
    padding:8px 8px 8px 0;
  }
  .decisions-main {
    flex:1; min-height:0;
    background:var(--portal-card);
    border-radius:12px;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 50%, transparent);
    overflow:hidden;
    display:flex; flex-direction:column;
    position:relative;
    box-shadow:none;
  }
  [data-theme="dark"] .decisions-main,
  [data-theme="classic-dark"] .decisions-main {
    border-color:rgba(255,255,255,.08);
  }

  /* Flat controls in portal — no 3D press */
  .decisions-shell .fui-icon-btn,
  .decisions-shell .fui-pill-btn {
    background:transparent;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 80%, transparent);
    box-shadow:none;
    transform:none;
    color:var(--portal-muted, #6e717e);
  }
  .decisions-shell .fui-icon-btn:hover:not(:disabled),
  .decisions-shell .fui-pill-btn:hover:not(:disabled) {
    background:var(--portal-row-hover, rgba(241,243,245,.4));
    border-color:color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 100%, transparent);
    box-shadow:none;
    transform:none;
    color:var(--portal-text, #0f0f10);
  }
  .decisions-shell .fui-icon-btn:active:not(:disabled),
  .decisions-shell .fui-pill-btn:active:not(:disabled) {
    background:var(--glass-nav-active, rgba(0,0,0,.055));
    box-shadow:none;
    transform:none;
  }
  .decisions-shell .fui-pill-btn--primary {
    background:var(--portal-btn-primary, #5b647d);
    border-color:transparent;
    color:#fff;
  }
  .decisions-shell .fui-pill-btn--primary:hover:not(:disabled) {
    background:color-mix(in srgb, var(--portal-btn-primary, #5b647d) 90%, #000);
    color:#fff;
  }
  .decisions-shell .fui-pill-btn--primary:active:not(:disabled) {
    background:color-mix(in srgb, var(--portal-btn-primary, #5b647d) 82%, #000);
  }
  [data-theme="dark"] .decisions-shell .fui-icon-btn,
  [data-theme="dark"] .decisions-shell .fui-pill-btn,
  [data-theme="classic-dark"] .decisions-shell .fui-icon-btn,
  [data-theme="classic-dark"] .decisions-shell .fui-pill-btn {
    background:rgba(255,255,255,.04);
    border-color:rgba(255,255,255,.1);
    color:var(--portal-muted, #9aa0ac);
  }
  [data-theme="dark"] .decisions-shell .fui-icon-btn:hover:not(:disabled),
  [data-theme="dark"] .decisions-shell .fui-pill-btn:hover:not(:disabled),
  [data-theme="classic-dark"] .decisions-shell .fui-icon-btn:hover:not(:disabled),
  [data-theme="classic-dark"] .decisions-shell .fui-pill-btn:hover:not(:disabled) {
    background:rgba(255,255,255,.08);
    color:var(--portal-text, #f4f4f4);
  }

  @media (max-width: 900px) {
    .decisions-nav-col { display:none; }
    .decisions-shell { padding:0; gap:0; }
    .decisions-main-col { padding:0; }
    .decisions-main { border-radius:0; border:0; }
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

  useEffect(() => {
    document.body.classList.add('festag-portal-shell')
    return () => { document.body.classList.remove('festag-portal-shell') }
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
