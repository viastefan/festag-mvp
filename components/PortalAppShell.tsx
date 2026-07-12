'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PortalSidebar from '@/components/PortalSidebar'
import CommandPalette from '@/components/CommandPalette'
import PortalShortcutsSheet from '@/components/portal/PortalShortcutsSheet'
import TagroOverlay from '@/components/TagroOverlay'
import WeeklyStatusBriefingModal from '@/components/briefing/WeeklyStatusBriefingModal'
import { PORTAL_PREMIUM_CSS } from '@/lib/portal/portal-premium-styles'

export const PORTAL_APP_SHELL_CSS = `
  .portal-app-shell {
    --festag-sidebar-width: 260px;
    --cp-dock-width: 400px;
    /* Gray canvas — white .portal-app-main floats inset with 8px gutter */
    --portal-bg: var(--bg, #F0F0F2);
    --portal-card: var(--festag-content-panel, var(--surface, #FFFFFF));
    --portal-raised: var(--raised, #FFFFFF);
    --portal-text: var(--text, #1D1D1F);
    --portal-muted: var(--text-muted, #86868B);
    --portal-soft: var(--text-secondary, #86868B);
    --portal-nav-active-bg: color-mix(in srgb, var(--portal-text, #1D1D1F) 8%, transparent);
    --portal-nav-hover-bg: color-mix(in srgb, var(--portal-text, #1D1D1F) 5.5%, transparent);
    --portal-nav-item: #3F3F3F;
    --portal-nav-item-active: #3F3F3F;
    --portal-nav-item-hover: #525252;
    --portal-nav-section: var(--text-muted, #86868B);
    --portal-nav-util: var(--nav-off-text, #6E6E73);
    --portal-nav-util-hover: var(--nav-on-text, #3C3C3C);
    --portal-nav-avatar-bg: color-mix(in srgb, var(--surface, #FFFFFF) 92%, var(--bg, #F5F5F7) 8%);
    --portal-nav-avatar-border: var(--border, rgba(0, 0, 0, 0.08));
    --portal-pill-bg: rgba(0, 0, 0, 0.05);
    --portal-btn-primary: var(--btn-prim, #2d2e2c);
    --portal-btn-primary-text: var(--btn-prim-text, #FFFFFF);
    --portal-btn-outline-bg: var(--raised, #FFFFFF);
    --portal-btn-outline-border: var(--border, rgba(0, 0, 0, 0.08));
    --portal-btn-outline-text: var(--text, #1D1D1F);
    --portal-row-hover: var(--portal-nav-hover-bg);
    --portal-icon-border: var(--border, rgba(0, 0, 0, 0.08));
    --portal-white-elev: var(--festag-glass-shadow,
      0 1px 0 rgba(255, 255, 255, 0.72) inset,
      0 8px 28px rgba(15, 23, 42, 0.05));
    --portal-white-border: 1px solid var(--festag-glass-edge, rgba(15, 23, 42, 0.06));
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
    --portal-card: var(--festag-content-panel, var(--surface-1, #2C2C2E));
    --portal-text: #FFFFFF;
    --portal-muted: #8E8E93;
    --portal-soft: #AEAEB2;
    --portal-nav-active-bg: rgba(255, 255, 255, 0.12);
    --portal-nav-hover-bg: rgba(255, 255, 255, 0.09);
    --portal-nav-item: var(--nav-off-text, #8E8E93);
    --portal-nav-item-active: var(--nav-on-text, #FFFFFF);
    --portal-nav-item-hover: #FFFFFF;
    --portal-nav-section: var(--text-muted, #8E8E93);
    --portal-nav-util: var(--nav-off-text, #8E8E93);
    --portal-nav-util-hover: #FFFFFF;
    --portal-nav-avatar-bg: rgba(255,255,255,.06);
    --portal-nav-avatar-border: rgba(255,255,255,.08);
    --portal-pill-bg: rgba(255,255,255,.08);
    --portal-btn-primary: #FFFFFF;
    --portal-btn-outline-bg: rgba(255,255,255,.04);
    --portal-btn-outline-border: rgba(255,255,255,.10);
    --portal-btn-outline-text: #FFFFFF;
    --portal-row-hover: var(--portal-nav-hover-bg);
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
  .portal-app-shell.portal-sidebar-collapsed {
    --festag-sidebar-width: 56px;
  }
  .portal-app-shell.portal-sidebar-collapsed .portal-app-nav-col {
    width:56px;
    overflow:hidden;
  }

  .portal-app-shell.portal-cp-open .portal-app-nav-col {
    background: #FFFFFF !important;
    border-right: 1px solid rgba(0, 0, 0, 0.06) !important;
    z-index: 84;
  }
  [data-theme="dark"] .portal-app-shell.portal-cp-open .portal-app-nav-col,
  [data-theme="classic-dark"] .portal-app-shell.portal-cp-open .portal-app-nav-col {
    background: var(--festag-black-content, #111114) !important;
    border-right-color: rgba(255, 255, 255, 0.06) !important;
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
    padding:6px 6px 6px 0;
  }
  .portal-app-shell.portal-sidebar-collapsed .portal-app-main {
    border-top-left-radius:20px;
    border-bottom-left-radius:20px;
  }

  .portal-app-shell.portal-tagro-fullscreen {
    --festag-sidebar-width: 56px;
  }
  .portal-app-shell.portal-tagro-fullscreen .portal-app-nav-col {
    z-index: 2147483602;
    width: 56px;
    pointer-events: auto;
  }
  .portal-app-shell.portal-tagro-fullscreen .portal-app-main-col {
    margin-left: 56px;
    visibility: hidden;
    pointer-events: none;
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

  /* Desktop — gray canvas with floating glass inset card */
  @media (min-width: 901px) {
    .portal-app-main {
      border-radius:24px;
      border:0;
      box-shadow:var(--portal-white-elev);
      backdrop-filter:var(--festag-glass-blur, blur(18px) saturate(155%));
      -webkit-backdrop-filter:var(--festag-glass-blur, blur(18px) saturate(155%));
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
      background:var(--festag-content-panel, #FFFFFF);
      border-radius:24px;
      border:1px solid var(--festag-content-panel-border, rgba(0, 0, 0, 0.08));
      box-shadow:var(--festag-glass-shadow,
        0 1px 0 rgba(255, 255, 255, 0.72) inset,
        0 8px 28px rgba(15, 23, 42, 0.05));
      backdrop-filter:none;
      -webkit-backdrop-filter:none;
    }
    [data-theme="dark"] .portal-app-main,
    [data-theme="classic-dark"] .portal-app-main {
      background:var(--festag-content-panel, var(--portal-card));
      border:1px solid var(--festag-content-panel-border, rgba(255, 255, 255, 0.1));
      box-shadow:none;
      backdrop-filter:none;
      -webkit-backdrop-filter:none;
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
    background:var(--portal-btn-primary, #2d2e2c);
    border-color:transparent;
    color:var(--portal-btn-primary-text, #fff);
  }
  .portal-app-shell .fui-pill-btn--primary:hover:not(:disabled) {
    background:var(--btn-prim-hover, #000);
    color:var(--portal-btn-primary-text, #fff);
  }
  .portal-app-shell .fui-pill-btn--primary:active:not(:disabled) {
    background:var(--btn-prim-hover, #000);
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
  const [cpOpen, setCpOpen] = useState(false)
  const [tagroFullscreen, setTagroFullscreen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setSidebarCollapsed(readSidebarCollapsed())
  }, [])

  useEffect(() => {
    document.body.classList.add('festag-portal-shell')
    return () => { document.body.classList.remove('festag-portal-shell') }
  }, [])

  useEffect(() => {
    const onCpState = (e: Event) => {
      const detail = (e as CustomEvent<{ open?: boolean }>).detail
      setCpOpen(!!detail?.open)
    }
    window.addEventListener('festag:portal-cp-state', onCpState)
    return () => window.removeEventListener('festag:portal-cp-state', onCpState)
  }, [])

  useEffect(() => {
    function onTagroFs(e: Event) {
      const active = !!(e as CustomEvent<{ active: boolean }>).detail?.active
      setTagroFullscreen(active)
    }
    window.addEventListener('festag:tagro-fullscreen', onTagroFs as EventListener)
    return () => window.removeEventListener('festag:tagro-fullscreen', onTagroFs as EventListener)
  }, [])

  useEffect(() => {
    if (!tagroFullscreen) return
    setSidebarCollapsed(true)
  }, [tagroFullscreen])

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
    <div className={`portal-app-shell${sidebarCollapsed ? ' portal-sidebar-collapsed' : ''}${cpOpen ? ' portal-cp-open' : ''}${tagroFullscreen ? ' portal-tagro-fullscreen' : ''}`}>
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: PORTAL_APP_SHELL_CSS + PORTAL_PREMIUM_CSS }} />
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
      <WeeklyStatusBriefingModal />
    </div>
  )
}
