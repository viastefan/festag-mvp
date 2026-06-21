'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PortalSidebar from '@/components/PortalSidebar'
import CommandPalette from '@/components/CommandPalette'
import PortalShortcutsSheet from '@/components/portal/PortalShortcutsSheet'
import TagroOverlay from '@/components/TagroOverlay'

export const PORTAL_APP_SHELL_CSS = `
  .portal-app-shell {
    /* Gray canvas — white .portal-app-main floats inset with 8px gutter */
    --portal-bg: var(--bg, #F0F0F2);
    --portal-card: var(--surface, #FFFFFF);
    --portal-raised: var(--raised, #FFFFFF);
    --portal-text: var(--text, #1D1D1F);
    --portal-muted: var(--text-muted, #86868B);
    --portal-soft: var(--text-secondary, #86868B);
    --portal-nav-active-bg: var(--nav-on, rgba(0, 0, 0, 0.06));
    --portal-nav-avatar-bg: color-mix(in srgb, var(--surface, #FFFFFF) 92%, var(--bg, #F5F5F7) 8%);
    --portal-nav-avatar-border: var(--border, rgba(0, 0, 0, 0.08));
    --portal-pill-bg: rgba(0, 0, 0, 0.05);
    --portal-btn-primary: var(--btn-prim, #1D1D1F);
    --portal-btn-primary-text: var(--btn-prim-text, #FFFFFF);
    --portal-btn-outline-bg: var(--raised, #FFFFFF);
    --portal-btn-outline-border: var(--border, rgba(0, 0, 0, 0.08));
    --portal-btn-outline-text: var(--text, #1D1D1F);
    --portal-row-hover: rgba(0, 0, 0, 0.04);
    --portal-icon-border: var(--border, rgba(0, 0, 0, 0.08));
    --portal-white-elev:0 1px 2px rgba(15, 23, 42, 0.05);
    --portal-white-border: 1px solid rgba(0, 0, 0, 0.07);
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
    --portal-bg: var(--festag-black-canvas, #000000);
    --portal-card: var(--festag-black-content, #0c0c0e);
    --portal-text: #FFFFFF;
    --portal-muted: #8E8E93;
    --portal-soft: #AEAEB2;
    --portal-nav-active-bg: var(--glass-nav-active, rgba(255,255,255,.10));
    --portal-nav-avatar-bg: rgba(255,255,255,.06);
    --portal-nav-avatar-border: rgba(255,255,255,.08);
    --portal-pill-bg: rgba(255,255,255,.08);
    --portal-btn-primary: #FFFFFF;
    --portal-btn-outline-bg: rgba(255,255,255,.04);
    --portal-btn-outline-border: rgba(255,255,255,.10);
    --portal-btn-outline-text: #FFFFFF;
    --portal-row-hover: rgba(255,255,255,.06);
    --portal-icon-border: rgba(255,255,255,.10);
    --portal-shadow-card: none;
    color-scheme: dark;
  }
  [data-theme="light"] .portal-app-shell,
  [data-theme="read"] .portal-app-shell,
  [data-theme="pure-light"] .portal-app-shell {
    color-scheme: light;
  }

  .portal-app-nav-col {
    position:fixed; left:0; top:0; bottom:0;
    width:var(--festag-sidebar-width, 260px);
    z-index:80;
    box-sizing:border-box;
    display:flex; flex-direction:column;
    background:var(--sidebar-bg, rgba(245,245,247,0.5)) !important;
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
  [data-theme="dark"] .portal-app-nav-col,
  [data-theme="classic-dark"] .portal-app-nav-col {
    background:transparent !important;
    border-right:0 !important;
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
    overflow:hidden;
    display:flex; flex-direction:column;
    position:relative;
    letter-spacing:0;
  }
  .portal-app-main :where(p, span, div, label, li, button, a, h1, h2, h3, h4, h5, h6) {
    letter-spacing:inherit;
  }

  /* Desktop — gray canvas with floating white inset card */
  @media (min-width: 901px) {
    .portal-app-main {
      border-radius:24px;
      border:var(--portal-white-border, 1px solid rgba(0, 0, 0, 0.07));
      box-shadow:var(--portal-white-elev);
    }
    .portal-app-main-col {
      padding:8px 8px 8px 0;
    }
    [data-theme="light"] .portal-app-main-col,
    [data-theme="read"] .portal-app-main-col,
    [data-theme="pure-light"] .portal-app-main-col {
      padding:8px 8px 8px 0;
    }
    [data-theme="light"] .portal-app-main,
    [data-theme="read"] .portal-app-main,
    [data-theme="pure-light"] .portal-app-main {
      background:#FFFFFF;
      border-radius:24px;
      border:var(--portal-white-border, 1px solid rgba(0, 0, 0, 0.07));
      box-shadow:var(--portal-white-elev);
    }
    [data-theme="dark"] .portal-app-main,
    [data-theme="classic-dark"] .portal-app-main {
      border-color:rgba(255,255,255,.08);
      box-shadow:none;
    }
  }

  .portal-app-shell .fui-pill-btn {
    transform:none;
  }
  .portal-app-shell .fui-pill-btn:hover:not(:disabled) {
    transform:none;
  }
  .portal-app-shell .fui-pill-btn:active:not(:disabled) {
    transform:none;
  }
  .portal-app-shell .fui-pill-btn--primary {
    background:var(--portal-btn-primary, #000);
    border-color:transparent;
    color:var(--portal-btn-primary-text, #fff);
  }
  .portal-app-shell .fui-pill-btn--primary:hover:not(:disabled) {
    background:color-mix(in srgb, var(--portal-btn-primary, #000) 88%, #fff);
    color:var(--portal-btn-primary-text, #fff);
  }
  .portal-app-shell .fui-pill-btn--primary:active:not(:disabled) {
    background:color-mix(in srgb, var(--portal-btn-primary, #000) 92%, #000);
    color:var(--portal-btn-primary-text, #fff);
  }
  [data-theme="dark"] .portal-app-shell .fui-pill-btn--primary,
  [data-theme="classic-dark"] .portal-app-shell .fui-pill-btn--primary {
    background:var(--portal-btn-primary, #fff);
    border-color:transparent;
    color:#000;
  }
  [data-theme="dark"] .portal-app-shell .fui-pill-btn--primary:hover:not(:disabled),
  [data-theme="classic-dark"] .portal-app-shell .fui-pill-btn--primary:hover:not(:disabled) {
    background:color-mix(in srgb, var(--portal-btn-primary, #fff) 92%, #000);
    color:#000;
  }

  @media (max-width: 900px) {
    .portal-app-shell {
      background: #FCFCFC;
    }
    [data-theme="dark"] .portal-app-shell,
    [data-theme="classic-dark"] .portal-app-shell {
      background: var(--festag-black-canvas, #000000);
    }
    .portal-app-nav-col { display:none; }
    .portal-app-main-col {
      margin-left:0;
      padding:0;
    }
    .portal-app-main {
      border-radius:0;
      border:0;
      box-shadow:none;
      background:transparent;
    }
  }
`

const STORAGE_KEY = 'festag-portal-sidebar-collapsed'

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export default function PortalAppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)
  const router = useRouter()

  useEffect(() => {
    setSidebarCollapsed(readSidebarCollapsed())
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
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: PORTAL_APP_SHELL_CSS }} />
      <div className="portal-app-nav-col">
        <PortalSidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      </div>
      <div className="portal-app-main-col">
        <div className="portal-app-main">
          {children}
        </div>
      </div>
      <CommandPalette theme="portal" />
      <PortalShortcutsSheet />
      <TagroOverlay />
    </div>
  )
}
