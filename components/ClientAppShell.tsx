'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

import BrowserTabTitle from '@/components/BrowserTabTitle'
import CommandPalette from '@/components/CommandPalette'
import CopilotPanel from '@/components/CopilotPanel'
import FeedbackWidget from '@/components/FeedbackWidget'
import LoadingScreen from '@/components/LoadingScreen'
import PwaInstallBanner from '@/components/PwaInstallBanner'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/client'
import { getTheme, setTheme, type ThemeMode } from '@/lib/theme'
import { Check, FunnelSimple } from '@phosphor-icons/react'

type ClientAppShellProps = {
  children: React.ReactNode
  isFullHeight?: boolean
  scrollId?: string
}

export default function ClientAppShell({
  children,
  isFullHeight = false,
  scrollId = 'client-main-scroll',
}: ClientAppShellProps) {
  const THEME_OPTIONS: Array<{ id: ThemeMode; label: string; tone: 'dark' | 'light' }> = [
    { id: 'dark', label: 'Darkmode', tone: 'dark' },
    { id: 'light', label: 'Light', tone: 'light' },
    { id: 'read', label: 'Read', tone: 'light' },
  ]
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('read')
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const themeMenuRef = useRef<HTMLDivElement | null>(null)
  const sidebarWidth = sidebarCollapsed ? '0px' : '212px'

  useEffect(() => {
    try { setSidebarCollapsed(localStorage.getItem('festag-sidebar-collapsed') === 'true') } catch {}
    try { setThemeMode(getTheme()) } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('festag-sidebar-collapsed', String(sidebarCollapsed)) } catch {}
  }, [sidebarCollapsed])

  useEffect(() => {
    document.body.classList.add('festag-app-mode')
    return () => document.body.classList.remove('festag-app-mode')
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await createClient().auth.getSession()
        if (cancelled) return
        if (!data.session) {
          window.location.href = '/login'
          return
        }
      } catch (error) {
        console.error('App shell session check failed', error)
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onCopilot = () => setCopilotOpen((open) => !open)
    const onOpenCopilot = () => setCopilotOpen(true)
    const onTheme = (event: Event) => {
      if (event instanceof CustomEvent) setThemeMode(event.detail as ThemeMode)
    }
    window.addEventListener('toggle-copilot', onCopilot)
    window.addEventListener('open-copilot', onOpenCopilot)
    window.addEventListener('festag-theme', onTheme)
    return () => {
      window.removeEventListener('toggle-copilot', onCopilot)
      window.removeEventListener('open-copilot', onOpenCopilot)
      window.removeEventListener('festag-theme', onTheme)
    }
  }, [])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!themeMenuOpen) return
      if (themeMenuRef.current && event.target instanceof Node && !themeMenuRef.current.contains(event.target)) {
        setThemeMenuOpen(false)
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setThemeMenuOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onEscape)
    }
  }, [themeMenuOpen])

  function applyThemeChoice(next: ThemeMode) {
    setTheme(next)
    setThemeMode(next)
    setThemeMenuOpen(false)
  }

  if (checking) return <LoadingScreen onDone={() => undefined} />

  return (
    <div
      className={`festag-app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}${isFullHeight ? ' full-height' : ''}`}
      style={{ '--app-sidebar-width': sidebarWidth } as React.CSSProperties}
    >
      <style>{`
        @keyframes panelFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .panel-enter { animation: panelFadeIn .22s cubic-bezier(.16,1,.3,1) both; }
        @keyframes sidebarReturnIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .festag-app-shell {
          position: fixed;
          inset: 0;
          height: 100dvh;
          overflow: hidden;
          /* Match the app-shell base (= sidebar + html) so the strips around
             the floating workspace never read as a different, half-filled
             shade. The workspace box is the only lifted surface. */
          background: var(--bg-app, var(--bg));
        }
        .app-workspace {
          position: fixed;
          top: 8px;
          right: 0px;
          bottom: 38px;
          left: calc(var(--app-sidebar-width) + 1px);
          min-width: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          max-height: calc(100dvh - 46px);
          border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
          border-radius: 10px;
          background: var(--surface);
          box-shadow: 0 0 0 1px rgba(255,255,255,.03);
          transition: left .18s cubic-bezier(.16,1,.3,1), border-color .18s ease, background .18s ease;
        }
        .sidebar-collapsed .app-workspace :where(.task-top, .projects-top, .reports-commandline, .page-header, .task-detail-crumbs, .app-page-header, .obs-top) {
          padding-left: 58px;
          transition: padding-left .18s cubic-bezier(.16,1,.3,1);
        }
        .app-sidebar-return {
          position: absolute;
          top: 25px;
          left: 18px;
          z-index: 210;
          width: 24px;
          height: 24px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: color-mix(in srgb, var(--text-secondary) 88%, var(--text));
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: none;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          animation: sidebarReturnIn .18s cubic-bezier(.16,1,.3,1) both;
          transition: color .14s ease, transform .14s ease;
        }
        .app-sidebar-return:hover {
          color: var(--text);
          background: transparent;
        }
        .app-sidebar-return:active {
          transform: scale(.94);
        }
        [data-theme="dark"] .app-workspace {
          background: var(--surface);
        }
        .app-workspace-scroll {
          height: 100%;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          scroll-behavior: auto;
          -webkit-overflow-scrolling: touch;
        }
        @media(max-width:768px) {
          .festag-app-shell {
            position: relative;
            min-height: 100dvh;
            overflow: visible;
          }
          .app-workspace {
            position: relative;
            inset: auto;
            min-height: 100dvh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
            background: var(--bg);
          }
          .app-workspace-scroll {
            overflow-y: visible;
          }
          .festag-app-shell.full-height {
            position: fixed;
            inset: 0;
            height: 100dvh;
            min-height: 0;
            overflow: hidden;
          }
          .festag-app-shell.full-height .app-workspace {
            position: fixed;
            inset: 0;
            height: 100dvh;
            min-height: 0;
            max-height: 100dvh;
            overflow: hidden;
          }
          .festag-app-shell.full-height .app-workspace-scroll {
            height: 100%;
            min-height: 0;
            overflow: hidden;
          }
          .app-footer-controls { display:none; }
        }
        .app-footer-controls {
          position:fixed;
          right:12px;
          bottom:7px;
          z-index:145;
          display:flex;
          flex-direction:row;
          align-items:center;
          gap:8px;
          color:var(--text-muted);
        }
        .app-footer-btn {
          position:relative;
          height:26px;
          border:1px solid transparent;
          background:transparent;
          color:color-mix(in srgb, var(--text-secondary) 78%, var(--accent));
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:7px;
          padding:0 6px;
          border-radius:10px;
          font:inherit;
          font-size:11.5px;
          font-weight:500;
          text-decoration:none;
          letter-spacing:.02em;
          transition:background .16s ease, border-color .16s ease, color .16s ease;
        }
        .app-footer-btn.icon-only {
          width:26px;
          padding:0;
        }
        .app-footer-btn:hover {
          color:var(--text);
          border-color:transparent;
          background:transparent;
        }
        [data-theme="light"] .app-footer-btn.icon-only,
        [data-theme="pure-light"] .app-footer-btn.icon-only {
          color:#4F5A74;
        }
        [data-theme="light"] .app-footer-btn.icon-only:hover,
        [data-theme="pure-light"] .app-footer-btn.icon-only:hover {
          color:#202532;
          background:transparent;
          border-color:transparent;
        }
        .app-footer-copilot-label {
          display:inline-flex;
          align-items:center;
          line-height:1;
        }
        .app-footer-theme-menu {
          position:absolute;
          right:0;
          bottom:calc(100% + 7px);
          width:196px;
          padding:7px;
          border-radius:12px;
          border:1px solid color-mix(in srgb, var(--border) 80%, rgba(255,255,255,.12));
          background:color-mix(in srgb, var(--surface) 92%, rgba(255,255,255,.78));
          box-shadow:
            0 16px 38px rgba(15,23,42,.12),
            0 1px 0 rgba(255,255,255,.32) inset,
            0 0 0 1px rgba(255,255,255,.08);
          backdrop-filter:blur(18px) saturate(150%);
          -webkit-backdrop-filter:blur(18px) saturate(150%);
          animation:panelFadeIn .18s cubic-bezier(.16,1,.3,1) both;
        }
        [data-theme="dark"] .app-footer-theme-menu,
        [data-theme="classic-dark"] .app-footer-theme-menu,
        [data-theme="magic-blue"] .app-footer-theme-menu {
          background:color-mix(in srgb, #101215 88%, rgba(18,22,30,.72));
          box-shadow:
            0 18px 42px rgba(0,0,0,.34),
            0 1px 0 rgba(255,255,255,.06) inset,
            0 0 0 1px rgba(255,255,255,.04);
        }
        .app-footer-theme-option {
          width:100%;
          min-height:38px;
          border:0;
          border-radius:10px;
          background:transparent;
          color:var(--text);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:9px;
          padding:6px 8px;
          font:inherit;
          font-size:12px;
          font-weight:500;
          text-align:left;
          transition:background .16s ease, color .16s ease, transform .16s ease;
        }
        .app-footer-theme-option:hover {
          background:color-mix(in srgb, var(--surface-2) 82%, transparent);
          color:var(--text);
        }
        .app-footer-theme-option.active {
          background:color-mix(in srgb, var(--surface-2) 90%, rgba(255,255,255,.18));
          color:var(--text);
        }
        .app-footer-theme-option:active { transform:scale(.988); }
        .app-footer-theme-chip {
          width:32px;
          height:22px;
          border-radius:8px;
          border:1px solid rgba(0,0,0,.08);
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:3px;
          flex-shrink:0;
          font-size:9px;
          font-weight:500;
          letter-spacing:-.02em;
          box-shadow:0 1px 2px rgba(15,23,42,.08) inset;
        }
        .app-footer-theme-chip::before {
          content:'';
          width:6px;
          height:6px;
          border-radius:999px;
          background:#6d6afc;
          box-shadow:0 0 0 2px rgba(109,106,252,.12);
        }
        .app-footer-theme-chip.dark {
          background:linear-gradient(180deg, #17191d 0%, #0f1114 100%);
          border-color:rgba(255,255,255,.08);
          color:#f5f7fb;
        }
        .app-footer-theme-chip.light {
          background:linear-gradient(180deg, #ffffff 0%, #f1f4f8 100%);
          border-color:rgba(16,24,40,.12);
          color:#344054;
        }
        .app-footer-theme-label {
          flex:1;
          min-width:0;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .app-footer-theme-check {
          width:16px;
          height:16px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          color:color-mix(in srgb, var(--text) 78%, var(--text-muted));
          flex-shrink:0;
        }
      `}</style>

      {!sidebarCollapsed && (
        <div className="panel-enter" style={{ display: 'contents' }}>
          <Sidebar onCollapse={() => setSidebarCollapsed(true)} />
        </div>
      )}

      <main className="main-content app-workspace">
        {sidebarCollapsed && (
          <button
            className="app-sidebar-return"
            type="button"
            aria-label="Sidebar ausklappen"
            title="Sidebar ausklappen"
            onClick={() => setSidebarCollapsed(false)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="5" width="16" height="14" rx="3" />
              <path d="M9 5v14" />
            </svg>
          </button>
        )}
        <div id={scrollId} className="app-workspace-scroll" style={{ overflowY: isFullHeight ? 'hidden' : 'auto' }}>
          <div key={pathname} className="route-fade" style={{ minHeight: '100%', height: isFullHeight ? '100%' : undefined }}>
            {children}
          </div>
        </div>
      </main>
      <style>{`
        @keyframes routeFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .route-fade { animation: routeFadeIn .18s cubic-bezier(.16,1,.3,1) both; }
      `}</style>

      <div className="app-footer-controls" aria-label="Workspace Schnellzugriff">
        <button
          className="app-footer-btn"
          type="button"
          onClick={() => setCopilotOpen(true)}
          title="Copilot öffnen"
          aria-label="Copilot öffnen"
        >
          <span className="app-footer-copilot-label">Copilot</span>
        </button>
        <div ref={themeMenuRef} style={{ position: 'relative' }}>
          <button
            className="app-footer-btn icon-only"
            type="button"
            onClick={() => setThemeMenuOpen((open) => !open)}
            title="Theme wechseln"
            aria-label="Theme wechseln"
            aria-expanded={themeMenuOpen}
          >
            <FunnelSimple size={16} weight="regular" />
          </button>
          {themeMenuOpen && (
            <div className="app-footer-theme-menu" role="menu" aria-label="Theme Auswahl">
              {THEME_OPTIONS.map((option) => {
                const active = themeMode === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`app-footer-theme-option${active ? ' active' : ''}`}
                    onClick={() => applyThemeChoice(option.id)}
                  >
                    <span className={`app-footer-theme-chip ${option.tone}`} aria-hidden="true">
                      <span>Aa</span>
                    </span>
                    <span className="app-footer-theme-label">{option.label}</span>
                    <span className="app-footer-theme-check" aria-hidden="true">
                      {active ? <Check size={16} weight="bold" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
      <FeedbackWidget />
      <CommandPalette />
      <PwaInstallBanner />
      <BrowserTabTitle />
    </div>
  )
}
