'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PortalSidebar from '@/components/PortalSidebar'
import CommandPalette from '@/components/CommandPalette'
import TagroOverlay from '@/components/TagroOverlay'

export const PORTAL_APP_SHELL_CSS = `
  .portal-app-shell {
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
    box-sizing:border-box;
  }
  [data-theme="dark"] .portal-app-shell,
  [data-theme="classic-dark"] .portal-app-shell {
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
  [data-theme="light"] .portal-app-shell,
  [data-theme="read"] .portal-app-shell {
    color-scheme: light;
  }

  .portal-app-nav-col {
    position:fixed; left:0; top:0; bottom:0;
    width:var(--festag-sidebar-width, 260px);
    z-index:80;
    box-sizing:border-box;
    display:flex; flex-direction:column;
    background:transparent !important;
    border:0 !important;
    box-shadow:none !important;
    overflow:hidden;
    transition:width .22s cubic-bezier(.16,1,.3,1);
  }
  .portal-app-shell .portal-nav {
    background:transparent !important;
    border:0 !important;
    box-shadow:none !important;
  }
  .portal-app-shell.portal-sidebar-collapsed .portal-app-nav-col {
    width:56px;
  }

  .portal-app-main-col {
    margin-left:var(--festag-sidebar-width, 260px);
    height:100%;
    min-width:0;
    box-sizing:border-box;
    display:flex; flex-direction:column;
    padding:8px 8px 8px 0;
    transition:margin-left .22s cubic-bezier(.16,1,.3,1);
  }
  .portal-app-shell.portal-sidebar-collapsed .portal-app-main-col {
    margin-left:56px;
  }
  .portal-app-main {
    flex:1; min-height:0;
    background:var(--portal-card);
    border-radius:12px;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 50%, transparent);
    overflow:hidden;
    display:flex; flex-direction:column;
    position:relative;
    box-shadow:none;
  }
  [data-theme="dark"] .portal-app-main,
  [data-theme="classic-dark"] .portal-app-main {
    border-color:rgba(255,255,255,.08);
  }

  .portal-app-shell .fui-icon-btn,
  .portal-app-shell .fui-pill-btn {
    background:transparent;
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 80%, transparent);
    box-shadow:none;
    transform:none;
    color:var(--portal-muted, #6e717e);
  }
  .portal-app-shell .fui-icon-btn:hover:not(:disabled),
  .portal-app-shell .fui-pill-btn:hover:not(:disabled) {
    background:var(--portal-row-hover, rgba(241,243,245,.4));
    border-color:color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 100%, transparent);
    box-shadow:none;
    transform:none;
    color:var(--portal-text, #0f0f10);
  }
  .portal-app-shell .fui-icon-btn:active:not(:disabled),
  .portal-app-shell .fui-pill-btn:active:not(:disabled) {
    background:var(--glass-nav-active, rgba(0,0,0,.055));
    box-shadow:none;
    transform:none;
  }
  .portal-app-shell .fui-pill-btn--primary {
    background:var(--portal-btn-primary, #5b647d);
    border-color:transparent;
    color:#fff;
  }
  .portal-app-shell .fui-pill-btn--primary:hover:not(:disabled) {
    background:color-mix(in srgb, var(--portal-btn-primary, #5b647d) 90%, #000);
    color:#fff;
  }
  .portal-app-shell .fui-pill-btn--primary:active:not(:disabled) {
    background:color-mix(in srgb, var(--portal-btn-primary, #5b647d) 82%, #000);
    color:#fff;
  }
  [data-theme="dark"] .portal-app-shell .fui-icon-btn,
  [data-theme="dark"] .portal-app-shell .fui-pill-btn,
  [data-theme="classic-dark"] .portal-app-shell .fui-icon-btn,
  [data-theme="classic-dark"] .portal-app-shell .fui-pill-btn {
    background:rgba(255,255,255,.04);
    border-color:rgba(255,255,255,.1);
    color:var(--portal-muted, #9aa0ac);
  }
  [data-theme="dark"] .portal-app-shell .fui-icon-btn:hover:not(:disabled),
  [data-theme="dark"] .portal-app-shell .fui-pill-btn:hover:not(:disabled),
  [data-theme="classic-dark"] .portal-app-shell .fui-icon-btn:hover:not(:disabled),
  [data-theme="classic-dark"] .portal-app-shell .fui-pill-btn:hover:not(:disabled) {
    background:rgba(255,255,255,.08);
    color:var(--portal-text, #f4f4f4);
  }
  [data-theme="dark"] .portal-app-shell .fui-pill-btn--primary,
  [data-theme="classic-dark"] .portal-app-shell .fui-pill-btn--primary {
    background:var(--portal-btn-primary, #7b849c);
    border-color:transparent;
    color:#fff;
  }
  [data-theme="dark"] .portal-app-shell .fui-pill-btn--primary:hover:not(:disabled),
  [data-theme="classic-dark"] .portal-app-shell .fui-pill-btn--primary:hover:not(:disabled) {
    background:color-mix(in srgb, var(--portal-btn-primary, #7b849c) 90%, #000);
    color:#fff;
  }

  @media (max-width: 900px) {
    .portal-app-nav-col { display:none; }
    .portal-app-main-col { margin-left:0; padding:0; }
    .portal-app-main { border-radius:0; border:0; }
  }
`

const STORAGE_KEY = 'festag-portal-sidebar-collapsed'

export default function PortalAppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(STORAGE_KEY) === 'true')
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    document.body.classList.add('festag-portal-shell')
    return () => { document.body.classList.remove('festag-portal-shell') }
  }, [])

  useEffect(() => {
    function onTagroApplied() { router.refresh() }
    window.addEventListener('festag:tagro-applied', onTagroApplied)
    return () => window.removeEventListener('festag:tagro-applied', onTagroApplied)
  }, [router])

  function toggleSidebar() {
    setSidebarCollapsed(c => {
      const next = !c
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* noop */ }
      return next
    })
  }

  return (
    <div className={`portal-app-shell${sidebarCollapsed ? ' portal-sidebar-collapsed' : ''}`}>
      <style>{PORTAL_APP_SHELL_CSS}</style>
      <div className="portal-app-nav-col">
        <PortalSidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      </div>
      <div className="portal-app-main-col">
        <div className="portal-app-main">
          {children}
        </div>
      </div>
      <CommandPalette theme="portal" />
      <TagroOverlay />
    </div>
  )
}
