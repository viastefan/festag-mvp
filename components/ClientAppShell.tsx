'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

import CommandPalette from '@/components/CommandPalette'
import CopilotPanel from '@/components/CopilotPanel'
import FeedbackWidget from '@/components/FeedbackWidget'
import LoadingScreen from '@/components/LoadingScreen'
import PwaInstallBanner from '@/components/PwaInstallBanner'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/client'
import { getTheme, setTheme, type ThemeMode } from '@/lib/theme'
import { Moon } from '@phosphor-icons/react'

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
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('read')
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

  function cycleReadingTheme() {
    const next: ThemeMode = themeMode === 'dark' ? 'read' : themeMode === 'read' ? 'light' : 'dark'
    setTheme(next)
    setThemeMode(next)
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
          top: 24px;
          right: 10px;
          bottom: 52px;
          left: calc(var(--app-sidebar-width) + 8px);
          min-width: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
          border-radius: 12px;
          background: var(--surface);
          box-shadow: 0 1px 2px rgba(0,0,0,.025), 0 18px 60px rgba(0,0,0,.045);
          transition: left .18s cubic-bezier(.16,1,.3,1);
        }
        [data-theme="dark"] .app-workspace {
          box-shadow: 0 1px 2px rgba(0,0,0,.24), 0 18px 60px rgba(0,0,0,.30);
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
          right:24px;
          bottom:12px;
          z-index:145;
          display:flex;
          align-items:center;
          gap:8px;
          color:var(--text-muted);
        }
        .app-footer-btn {
          height:32px;
          border-radius:999px;
          border:1px solid color-mix(in srgb, var(--border) 70%, transparent);
          background:color-mix(in srgb, var(--surface) 74%, transparent);
          color:var(--text-secondary);
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:7px;
          padding:0 11px;
          font:inherit;
          font-size:12px;
          font-weight:600;
          text-decoration:none;
          backdrop-filter:blur(18px);
          -webkit-backdrop-filter:blur(18px);
          box-shadow:0 8px 24px -18px rgba(0,0,0,.35);
        }
        .app-footer-btn.icon { width:32px; padding:0; }
        .app-footer-btn:hover { color:var(--text); border-color:var(--border-strong); }
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
            borderRadius:11,
            border:'1px solid var(--sidebar-border)',
            background:'var(--sidebar-bg)',
            color:'var(--text-secondary)',
            display:'inline-flex',
            alignItems:'center',
            justifyContent:'center',
            boxShadow:'0 8px 24px rgba(0,0,0,.07)',
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
        <button className="app-footer-btn icon" type="button" onClick={cycleReadingTheme} title="Light, Read und Dark wechseln" aria-label="Theme wechseln">
          <Moon size={15} weight="regular" />
        </button>
        <button className="app-footer-btn" type="button" onClick={() => setCopilotOpen(true)}>
          <span>Copilot</span>
        </button>
      </div>

      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
      <FeedbackWidget />
      <CommandPalette />
      <PwaInstallBanner />
    </div>
  )
}
