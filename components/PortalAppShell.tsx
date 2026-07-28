'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import PortalSidebar from '@/components/PortalSidebar'
import CommandPalette from '@/components/CommandPalette'
import PortalShortcutsSheet from '@/components/portal/PortalShortcutsSheet'
import TagroOverlay from '@/components/TagroOverlay'
import TagroFocusComposeBar from '@/components/tagro/TagroFocusComposeBar'
import WeeklyStatusBriefingModal from '@/components/briefing/WeeklyStatusBriefingModal'
import StatusPlayerHost from '@/components/status/StatusPlayerHost'
import { StatusPlayerProvider } from '@/components/status/StatusPlayerContext'
import FestagLoadingScreen from '@/components/FestagLoadingScreen'
import FestagAmbient from '@/components/ambient/FestagAmbient'
import { PORTAL_PREMIUM_CSS } from '@/lib/portal/portal-premium-styles'
import { FESTAG_GLASSY_ENTER_MS, FESTAG_GLASSY_TEXT_CSS } from '@/lib/ui/glassy-text'

export const PORTAL_APP_SHELL_CSS = `
  .portal-app-shell {
    --festag-sidebar-width: 260px;
    --cp-dock-width: 400px;
    /* Soft studio canvas — closer to Dev flat workspace (#F7F7F8), less cool gray plate. */
    --portal-bg: var(--festag-portal-canvas-desktop, #F7F7F8);
    --portal-card: var(--festag-plate-bg, var(--festag-content-panel, #FFFFFF));
    --portal-raised: var(--festag-portal-sheet, var(--raised, #FAFAFA));
    --portal-text: var(--text, #1E1E20);
    --portal-muted: var(--text-muted, #90959F);
    --portal-soft: var(--text-secondary, #5c5c62);
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
    isolation:isolate;
  }
  [data-theme="dark"] .portal-app-shell,
  [data-theme="classic-dark"] .portal-app-shell {
    --portal-bg: var(--festag-black-canvas, #070708);
    --portal-card: var(--festag-black-content, #0E0E10);
    --portal-raised: var(--festag-black-raised, #151518);
    --portal-text: var(--festag-night-ink, #E6E6EA);
    --portal-muted: var(--festag-night-ink-3, #8A8A94);
    --portal-soft: var(--festag-night-ink-2, #B8B8C0);
    --portal-nav-active-bg: rgba(91, 100, 125, 0.32);
    --portal-nav-hover-bg: var(--festag-night-fill-hover, rgba(255, 255, 255, 0.05));
    --portal-nav-item: var(--nav-off-text, #8A8A94);
    --portal-nav-item-active: #E6E6EA;
    --portal-nav-item-hover: var(--festag-night-ink, #E6E6EA);
    --portal-nav-section: var(--text-muted, #8A8A94);
    --portal-nav-util: var(--nav-off-text, #8A8A94);
    --portal-nav-util-hover: var(--festag-night-ink, #E6E6EA);
    --portal-nav-avatar-bg: rgba(255,255,255,.05);
    --portal-nav-avatar-border: var(--festag-night-line, rgba(255,255,255,.06));
    --portal-pill-bg: var(--festag-night-fill-hover, rgba(255,255,255,.05));
    --portal-btn-primary: var(--festag-btn-dark-bg, #F0F2F5);
    --portal-btn-primary-text: var(--festag-btn-dark-fg, #1A1A1E);
    --portal-btn-primary-hover: var(--festag-btn-dark-bg-hover, #DCE1E8);
    --portal-btn-primary-text-hover: var(--festag-btn-dark-fg-hover, #1A1A1E);
    --portal-btn-outline-bg: rgba(255,255,255,.03);
    --portal-btn-outline-border: rgba(255,255,255,.08);
    --portal-btn-outline-text: var(--festag-night-ink, #E6E6EA);
    --portal-row-hover: var(--portal-nav-hover-bg);
    --portal-icon-border: var(--festag-night-line-strong, rgba(255,255,255,.09));
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
    background: color-mix(in srgb, var(--portal-bg) 72%, transparent) !important;
    backdrop-filter: blur(12px) saturate(1.06);
    -webkit-backdrop-filter: blur(12px) saturate(1.06);
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
    /* ChatGPT/OpenAI dark: continuous canvas — no hairline divider on the rail. */
    background: var(--festag-black-canvas, #070708) !important;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-right: 0 !important;
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
    background: var(--festag-black-canvas, #070708) !important;
    border-right: 0 !important;
  }

  .portal-app-main-col {
    position:relative;
    z-index:1;
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
      border-top-left-radius:0;
      border-bottom-left-radius:0;
      border:1px solid var(--festag-plate-border, rgba(15, 23, 42, 0.055));
      box-shadow:var(--festag-plate-shadow, var(--portal-white-elev));
      background:var(--festag-plate-bg, var(--portal-card));
      backdrop-filter:none;
      -webkit-backdrop-filter:none;
      transition:none;
    }
    .portal-app-shell.portal-sidebar-collapsed .portal-app-main {
      border-top-left-radius:var(--festag-plate-radius, 12px);
      border-bottom-left-radius:var(--festag-plate-radius, 12px);
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
      border-top-left-radius:0;
      border-bottom-left-radius:0;
      border:1px solid var(--festag-plate-border, rgba(15, 23, 42, 0.055));
      box-shadow:var(--festag-plate-shadow);
      backdrop-filter:none;
      -webkit-backdrop-filter:none;
    }
    [data-theme="light"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main,
    [data-theme="read"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main,
    [data-theme="pure-light"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main {
      border-top-left-radius:var(--festag-plate-radius, 12px);
      border-bottom-left-radius:var(--festag-plate-radius, 12px);
    }
    /* Dark — floating graphite plate on OLED canvas */
    [data-theme="dark"] .portal-app-main,
    [data-theme="classic-dark"] .portal-app-main {
      background: var(--festag-plate-bg, var(--festag-black-content, #0E0E10));
      border: 1px solid var(--festag-plate-border, rgba(255, 255, 255, 0.07));
      border-radius: var(--festag-plate-radius, 12px);
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
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
      border-top-left-radius: var(--festag-plate-radius, 12px);
      border-bottom-left-radius: var(--festag-plate-radius, 12px);
    }
    [data-theme="dark"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main-col,
    [data-theme="classic-dark"] .portal-app-shell.portal-sidebar-collapsed .portal-app-main-col {
      padding: var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) var(--festag-plate-inset, 4px) 0;
    }
  }

  .portal-app-shell .fui-pill-btn {
    transform:none;
  }
  .portal-app-shell .fui-pill-btn {
    border-radius: 8px !important;
  }
  .portal-app-shell .fui-pill-btn:hover:not(:disabled) {
    transform:none;
  }
  .portal-app-shell .fui-pill-btn:active:not(:disabled) {
    transform:none;
  }
  .portal-app-shell .fui-pill-btn--primary {
    background:var(--portal-btn-primary, var(--festag-btn-dark-bg, #ffffff));
    border:1px solid var(--festag-btn-dark-border, rgba(30, 30, 32, 0.10));
    border-radius: 8px !important;
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
    background:#ffffff;
    border-color:transparent;
    color:#1e1e20;
    box-shadow:none;
    border-radius: 8px !important;
  }
  [data-theme="dark"] .portal-app-shell .fui-pill-btn--primary:hover:not(:disabled),
  [data-theme="classic-dark"] .portal-app-shell .fui-pill-btn--primary:hover:not(:disabled) {
    background:#d9dfe6;
    color:#1e1e20;
    border-color:transparent;
    box-shadow:none;
  }
  [data-theme="dark"] .portal-app-shell .fui-pill-btn:not(.fui-pill-btn--primary),
  [data-theme="classic-dark"] .portal-app-shell .fui-pill-btn:not(.fui-pill-btn--primary) {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.10);
    color: rgba(228, 228, 234, 0.62);
    box-shadow: none;
    border-radius: 8px !important;
  }
  [data-theme="dark"] .portal-app-shell .fui-pill-btn:not(.fui-pill-btn--primary):hover:not(:disabled),
  [data-theme="classic-dark"] .portal-app-shell .fui-pill-btn:not(.fui-pill-btn--primary):hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.16);
    color: rgba(232, 234, 240, 0.92);
  }

  @media (max-width: 768px) {
    .portal-app-shell {
      background: var(--festag-portal-canvas, #FCFCFC);
    }
    [data-theme="dark"] .portal-app-shell,
    [data-theme="classic-dark"] .portal-app-shell {
      background: var(--festag-black-canvas, #070708);
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

  /* Settings workspace — keep portal chrome mounted (no remount flash), just park it. */
  .portal-app-shell.is-settings-away {
    visibility: hidden;
    pointer-events: none;
  }
  .portal-app-shell.is-settings-away .fa-ambient,
  .portal-app-shell.is-settings-away .fa-ambient * {
    animation: none !important;
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
  const [loaderDone, setLoaderDone] = useState(false)
  const [playEnter, setPlayEnter] = useState(true)
  const router = useRouter()
  const pathname = usePathname() || ''
  const isSettings = pathname.startsWith('/settings')

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
    if (!loaderDone) return
    const t = window.setTimeout(() => setPlayEnter(false), FESTAG_GLASSY_ENTER_MS + 40)
    return () => window.clearTimeout(t)
  }, [loaderDone])

  // Leaving settings: portal chrome is still mounted — just make sure it isn’t stuck inert visually.
  useEffect(() => {
    if (isSettings) return
    document.body.classList.remove('festag-settings-workspace')
  }, [isSettings])

  useEffect(() => {
    if (!isSettings) return
    document.body.classList.add('festag-settings-workspace')
    return () => document.body.classList.remove('festag-settings-workspace')
  }, [isSettings])

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

  if (!loaderDone) {
    return <FestagLoadingScreen surface="portal" onDone={() => setLoaderDone(true)} />
  }

  return (
    <StatusPlayerProvider>
      {/* Portal chrome stays mounted when opening settings — hide instead of remount (no glassy flash). */}
      <div
        className={[
          'portal-app-shell',
          playEnter ? 'festag-glassy-enter' : '',
          sidebarCollapsed ? 'portal-sidebar-collapsed' : '',
          cpOpen ? 'portal-cp-open' : '',
          tagroFullscreen ? 'portal-tagro-fullscreen' : '',
          isSettings ? 'is-settings-away' : '',
        ].filter(Boolean).join(' ')}
        aria-hidden={isSettings || undefined}
        {...(isSettings ? { inert: true } : {})}
      >
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: PORTAL_APP_SHELL_CSS + PORTAL_PREMIUM_CSS + FESTAG_GLASSY_TEXT_CSS }} />
        <FestagAmbient key="client-panel" surface="client-panel" />
        <div className="portal-app-nav-col">
          <PortalSidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
        </div>
        <div className="portal-app-main-col">
          <div className="portal-app-main">
            {!isSettings ? children : null}
          </div>
        </div>
      </div>

      {isSettings ? children : null}

      <CommandPalette theme="portal" />
      {!isSettings ? <PortalShortcutsSheet /> : null}
      <TagroOverlay />
      {!isSettings ? <TagroFocusComposeBar /> : null}
      {!isSettings ? <WeeklyStatusBriefingModal /> : null}
      {!isSettings ? <StatusPlayerHost /> : null}
    </StatusPlayerProvider>
  )
}
