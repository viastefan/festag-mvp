'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PortalSidebar from '@/components/PortalSidebar'
import CommandPalette from '@/components/CommandPalette'
import PortalShortcutsSheet from '@/components/portal/PortalShortcutsSheet'
import TagroOverlay from '@/components/TagroOverlay'
import TagroFocusComposeBar from '@/components/tagro/TagroFocusComposeBar'
import WeeklyStatusBriefingModal from '@/components/briefing/WeeklyStatusBriefingModal'
import { PORTAL_PREMIUM_CSS } from '@/lib/portal/portal-premium-styles'

export const PORTAL_APP_SHELL_CSS = `
  .portal-app-shell {
    --festag-sidebar-width: 260px;
    --cp-dock-width: 400px;
    /* Soft studio canvas + elevated floating plate. */
    --portal-bg: var(--festag-portal-canvas-desktop, #E8E9ED);
    --portal-card: var(--festag-plate-bg, var(--festag-content-panel, #FFFFFF));
    --portal-raised: var(--festag-portal-sheet, var(--raised, #FAFAFA));
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
    --portal-nav-avatar-bg: color-mix(in srgb, var(--festag-plate-bg, #FFFFFF) 92%, var(--festag-portal-canvas-desktop, #E8E9ED) 8%);
    --portal-nav-avatar-border: var(--border, rgba(0, 0, 0, 0.08));
    --portal-pill-bg: rgba(0, 0, 0, 0.05);
    --portal-btn-primary: var(--festag-btn-dark-bg, var(--btn-prim, #ffffff));
    --portal-btn-primary-text: var(--festag-btn-dark-fg, var(--btn-prim-text, #1e1e20));
    --portal-btn-primary-hover: var(--festag-btn-dark-bg-hover, var(--btn-prim-hover, #f7f8fb));
    --portal-btn-primary-text-hover: var(--festag-btn-dark-fg-hover, var(--btn-prim-text-hover, #1e1e20));
    --portal-btn-outline-bg: var(--raised, #FFFFFF);
    --portal-btn-outline-border: var(--border, rgba(0, 0, 0, 0.08));
    --portal-btn-outline-text: var(--text, #1D1D1F);
    --portal-row-hover: var(--portal-nav-hover-bg);
    --portal-icon-border: var(--border, rgba(0, 0, 0, 0.08));
    --portal-white-elev: var(--festag-plate-shadow, var(--festag-glass-shadow));
    --portal-white-border: 1px solid var(--festag-plate-border, var(--festag-glass-edge, rgba(15, 23, 42, 0.055)));
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
    --portal-bg: var(--festag-black-canvas, #0B0F0D);
    --portal-card: var(--festag-black-content, #111816);
    --portal-raised: var(--festag-black-raised, #161F1C);
    --portal-text: var(--festag-night-ink, #F5F8F6);
    --portal-muted: var(--festag-night-ink-3, #8B9893);
    --portal-soft: var(--festag-night-ink-2, #C7D0CC);
    --portal-nav-active-bg: rgba(91, 100, 125, 0.32);
    --portal-nav-hover-bg: var(--festag-night-fill-hover, rgba(255, 255, 255, 0.06));
    --portal-nav-item: var(--nav-off-text, #8B9893);
    --portal-nav-item-active: #F5F8F6;
    --portal-nav-item-hover: var(--festag-night-ink, #F5F8F6);
    --portal-nav-section: var(--text-muted, #8B9893);
    --portal-nav-util: var(--nav-off-text, #8B9893);
    --portal-nav-util-hover: var(--festag-night-ink, #F5F8F6);
    --portal-nav-avatar-bg: rgba(255,255,255,.05);
    --portal-nav-avatar-border: var(--festag-night-line, rgba(255,255,255,.06));
    --portal-pill-bg: var(--festag-night-fill-hover, rgba(255,255,255,.06));
    --portal-btn-primary: var(--festag-btn-dark-bg, #5B647D);
    --portal-btn-primary-text: var(--festag-btn-dark-fg, #F5F8F6);
    --portal-btn-primary-hover: var(--festag-btn-dark-bg-hover, #6A738C);
    --portal-btn-primary-text-hover: var(--festag-btn-dark-fg-hover, #F5F8F6);
    --portal-btn-outline-bg: rgba(255,255,255,.03);
    --portal-btn-outline-border: rgba(255,255,255,.08);
    --portal-btn-outline-text: var(--festag-night-ink, #F5F8F6);
    --portal-row-hover: var(--portal-nav-hover-bg);
    --portal-icon-border: var(--festag-night-line-strong, rgba(255,255,255,.08));
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
    background: transparent !important;
    border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
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
    padding:var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) 0;
    transition:margin-left .22s cubic-bezier(.16,1,.3,1);
  }
  .portal-app-shell.portal-sidebar-collapsed .portal-app-main-col {
    margin-left:56px;
    padding:var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) 0;
  }
  .portal-app-shell.portal-sidebar-collapsed .portal-app-main {
    border-top-left-radius:var(--festag-plate-radius, 12px);
    border-bottom-left-radius:var(--festag-plate-radius, 12px);
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
  [data-theme="dark"] .portal-app-main,
  [data-theme="classic-dark"] .portal-app-main {
    background: transparent;
  }
  .portal-app-main :where(p, span, div, label, li, button, a, h1, h2, h3, h4, h5, h6) {
    letter-spacing:inherit;
  }

  /* Desktop — elevated floating plate (design-system tokens) */
  @media (min-width: 769px) {
    .portal-app-main {
      border-radius:var(--festag-plate-radius, 12px);
      border:1px solid var(--festag-plate-border, rgba(15, 23, 42, 0.055));
      box-shadow:var(--festag-plate-shadow, var(--portal-white-elev));
      background:var(--festag-plate-bg, var(--portal-card));
      backdrop-filter:none;
      -webkit-backdrop-filter:none;
    }
    .portal-app-main-col {
      padding:var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) 0;
    }
    [data-theme="light"] .portal-app-main-col,
    [data-theme="read"] .portal-app-main-col,
    [data-theme="pure-light"] .portal-app-main-col {
      padding:var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) 0;
    }
    [data-theme="light"] .portal-app-main,
    [data-theme="read"] .portal-app-main,
    [data-theme="pure-light"] .portal-app-main {
      background:var(--festag-plate-bg, #FFFFFF);
      border-radius:var(--festag-plate-radius, 12px);
      border:1px solid var(--festag-plate-border, rgba(15, 23, 42, 0.055));
      box-shadow:var(--festag-plate-shadow);
      backdrop-filter:none;
      -webkit-backdrop-filter:none;
    }
    /* Dark — floating graphite plate on OLED canvas */
    [data-theme="dark"] .portal-app-main,
    [data-theme="classic-dark"] .portal-app-main {
      background: var(--festag-plate-bg, var(--festag-black-content, #111816));
      border: 1px solid var(--festag-plate-border, rgba(255, 255, 255, 0.07));
      border-radius: var(--festag-plate-radius, 12px);
      box-shadow: var(--festag-plate-shadow);
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
    [data-theme="dark"] .portal-app-main-col,
    [data-theme="classic-dark"] .portal-app-main-col {
      padding: var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) 0;
    }
    [data-theme="dark"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main,
    [data-theme="classic-dark"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main {
      border-radius: var(--festag-plate-radius, 12px);
    }
    [data-theme="dark"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main-col,
    [data-theme="classic-dark"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main-col {
      padding: var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) 0;
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
    background:var(--portal-btn-primary, var(--festag-btn-dark-bg, #ffffff));
    border:0.7px solid var(--festag-btn-dark-border, #e7ebf0);
    color:var(--portal-btn-primary-text, var(--festag-btn-dark-fg, #1e1e20));
    box-shadow:var(--festag-btn-dark-shadow, none);
  }
  .portal-app-shell .fui-pill-btn--primary:hover:not(:disabled) {
    background:var(--portal-btn-primary-hover, var(--festag-btn-dark-bg-hover, #f7f8fb));
    color:var(--portal-btn-primary-text-hover, var(--festag-btn-dark-fg-hover, #1e1e20));
    border-color:var(--festag-btn-dark-border-hover, #dce1ea);
    box-shadow:var(--festag-btn-dark-shadow-hover, none);
  }
  .portal-app-shell .fui-pill-btn--primary:active:not(:disabled) {
    background:var(--portal-btn-primary-hover, var(--festag-btn-dark-bg-hover, #f7f8fb));
    color:var(--portal-btn-primary-text-hover, var(--festag-btn-dark-fg-hover, #1e1e20));
  }
  [data-theme="dark"] .portal-app-shell .fui-pill-btn--primary,
  [data-theme="classic-dark"] .portal-app-shell .fui-pill-btn--primary {
    background:var(--portal-btn-primary, #ffffff);
    border-color:var(--festag-btn-dark-border, transparent);
    color:var(--portal-btn-primary-text, #1e1e20);
    box-shadow:var(--festag-btn-dark-shadow, none);
  }
  [data-theme="dark"] .portal-app-shell .fui-pill-btn--primary:hover:not(:disabled),
  [data-theme="classic-dark"] .portal-app-shell .fui-pill-btn--primary:hover:not(:disabled) {
    background:var(--portal-btn-primary-hover, #d9dfe6);
    color:var(--portal-btn-primary-text-hover, #1e1e20);
    border-color:var(--festag-btn-dark-border-hover, transparent);
    box-shadow:var(--festag-btn-dark-shadow-hover, none);
  }

  @media (max-width: 768px) {
    .portal-app-shell {
      background: var(--festag-portal-canvas, #FCFCFC);
    }
    [data-theme="dark"] .portal-app-shell,
    [data-theme="classic-dark"] .portal-app-shell {
      background: var(--festag-black-canvas, #0B0F0D);
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
    try { sessionStorage.removeItem('festag_auth_dash_bounce') } catch { /* noop */ }
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
      <TagroFocusComposeBar />
      <WeeklyStatusBriefingModal />
    </div>
  )
}
