'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

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
  const THEME_OPTIONS: Array<{ id: ThemeMode; label: string }> = [
    { id: 'dark', label: 'Darkmode' },
    { id: 'magic-blue', label: 'Blue' },
    { id: 'light', label: 'Light' },
    { id: 'read', label: 'Read' },
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
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = '/login'
        return
      }
      setChecking(false)
    })
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
      className="festag-app-shell"
      style={{ '--app-sidebar-width': sidebarWidth } as React.CSSProperties}
    >
      <style>{`
        @keyframes panelFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .panel-enter { animation: panelFadeIn .22s cubic-bezier(.16,1,.3,1) both; }
        .festag-app-shell {
          position: fixed;
          inset: 0;
          height: 100dvh;
          overflow: hidden;
          background: var(--bg);
        }
        .app-workspace {
          position: fixed;
          top: 28px;
          right: 24px;
          bottom: 48px;
          left: calc(var(--app-sidebar-width) + 24px);
          min-width: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          max-height: calc(100dvh - 76px);
          border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
          border-radius: 20px;
          background: var(--surface);
          box-shadow: 0 0 0 1px rgba(255,255,255,.03);
          transition: left .18s cubic-bezier(.16,1,.3,1), border-color .18s ease, background .18s ease;
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
          .app-footer-controls { display:none; }
        }
        .app-footer-controls {
          position:fixed;
          right:28px;
          bottom:20px;
          z-index:145;
          display:flex;
          align-items:center;
          gap:0;
          color:var(--text-muted);
          opacity:.72;
        }
        .app-footer-btn {
          position:relative;
          width:24px;
          height:24px;
          border:0;
          background:transparent;
          color:var(--text-muted);
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:0;
          font:inherit;
          font-size:13px;
          font-weight:500;
          text-decoration:none;
          letter-spacing:.01em;
        }
        .app-footer-btn:hover { color:var(--text); }
        .app-footer-theme-menu {
          position:absolute;
          right:-2px;
          bottom:calc(100% + 10px);
          width:172px;
          padding:6px;
          border-radius:14px;
          border:1px solid var(--border);
          background:color-mix(in srgb, var(--card) 96%, transparent);
          box-shadow:0 0 0 1px rgba(255,255,255,.02);
          backdrop-filter:blur(18px);
          -webkit-backdrop-filter:blur(18px);
        }
        .app-footer-theme-option {
          width:100%;
          min-height:34px;
          border:0;
          border-radius:10px;
          background:transparent;
          color:var(--text-secondary);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:0 10px;
          font:inherit;
          font-size:12.5px;
          font-weight:500;
          text-align:left;
        }
        .app-footer-theme-option:hover {
          background:var(--hover);
          color:var(--text);
        }
        .app-footer-theme-option.active {
          background:color-mix(in srgb, var(--surface-2) 54%, transparent);
          color:var(--text);
        }
      `}</style>

      {!sidebarCollapsed && (
        <div className="panel-enter" style={{ display: 'contents' }}>
          <Sidebar onCollapse={() => setSidebarCollapsed(true)} />
        </div>
      )}

      {sidebarCollapsed && (
        <button
          type="button"
          aria-label="Sidebar ausklappen"
          title="Sidebar ausklappen"
          onClick={() => setSidebarCollapsed(false)}
          style={{
            position:'fixed',
            top:14,
            left:14,
            zIndex:210,
            width:34,
            height:34,
            borderRadius:14,
            border:'1px solid var(--sidebar-border)',
            background:'var(--sidebar-bg)',
            color:'var(--text-secondary)',
            display:'inline-flex',
            alignItems:'center',
            justifyContent:'center',
            boxShadow:'0 0 0 1px rgba(255,255,255,.03)',
            backdropFilter:'blur(22px) saturate(180%)',
            WebkitBackdropFilter:'blur(22px) saturate(180%)',
            cursor:'pointer',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="5" width="16" height="14" rx="3" />
            <path d="M9 5v14" />
          </svg>
        </button>
      )}

      <main className="main-content app-workspace">
        <div id={scrollId} className="app-workspace-scroll" style={{ overflowY: isFullHeight ? 'hidden' : 'auto' }}>
          {children}
        </div>
      </main>

      <div className="app-footer-controls" aria-label="Workspace Schnellzugriff">
        <div ref={themeMenuRef} style={{ position: 'relative' }}>
          <button
            className="app-footer-btn"
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
                    <span>{option.label}</span>
                    {active ? <Check size={14} weight="bold" /> : <span />}
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
    </div>
  )
}
