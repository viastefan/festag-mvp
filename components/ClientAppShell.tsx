'use client'

import { MagnifyingGlass } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import CommandPalette from '@/components/CommandPalette'
import CopilotPanel from '@/components/CopilotPanel'
import FeedbackWidget from '@/components/FeedbackWidget'
import FloatingBar from '@/components/FloatingBar'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/client'

type ClientAppShellProps = {
  children: React.ReactNode
  isFullHeight?: boolean
  scrollId?: string
}

const CONTEXT_LABELS: { match: (pathname: string) => boolean; label: string }[] = [
  { match: (pathname) => pathname.startsWith('/relations/messages') || pathname === '/messages', label: 'Nachrichten' },
  { match: (pathname) => pathname === '/tasks', label: 'Aufgaben' },
  { match: (pathname) => pathname.startsWith('/relations/projects') || pathname.startsWith('/project/') || pathname === '/dashboard', label: 'Projekte' },
  { match: (pathname) => pathname.startsWith('/relations/documents') || pathname === '/documents', label: 'Dokumente' },
  { match: (pathname) => pathname.startsWith('/relations/notes'), label: 'Notizen' },
  { match: (pathname) => pathname.startsWith('/relations/quotes') || pathname === '/billing', label: 'Abrechnung' },
  { match: (pathname) => pathname === '/reports', label: 'Statusberichte' },
  { match: (pathname) => pathname === '/teams', label: 'Teams' },
  { match: (pathname) => pathname === '/ai' || pathname.startsWith('/relations/ai'), label: 'Tagro AI' },
  { match: (pathname) => pathname === '/settings', label: 'Einstellungen' },
  { match: (pathname) => pathname === '/connectors', label: 'Connectors' },
  { match: (pathname) => pathname === '/addons', label: 'Add-ons' },
  { match: (pathname) => pathname === '/estimator', label: 'Preisschätzer' },
]

function contextLabel(pathname: string) {
  return CONTEXT_LABELS.find((item) => item.match(pathname))?.label ?? 'Workspace'
}

export default function ClientAppShell({
  children,
  isFullHeight = false,
  scrollId = 'client-main-scroll',
}: ClientAppShellProps) {
  const [checking, setChecking] = useState(true)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const pathname = usePathname()
  const label = useMemo(() => contextLabel(pathname), [pathname])

  useEffect(() => {
    const el = document.getElementById(scrollId)
    if (el) el.scrollTop = 0
  }, [pathname, scrollId])

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
    window.addEventListener('toggle-copilot', onCopilot)
    return () => window.removeEventListener('toggle-copilot', onCopilot)
  }, [])

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @keyframes panelFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .panel-enter { animation: panelFadeIn .22s cubic-bezier(.16,1,.3,1) both; }
        .client-shell-header {
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 28px;
          border-bottom: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg) 88%, transparent);
          backdrop-filter: blur(18px) saturate(160%);
          -webkit-backdrop-filter: blur(18px) saturate(160%);
        }
        .client-shell-search {
          height: 32px;
          min-width: 300px;
          max-width: 460px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text-secondary);
          font-size: 12.5px;
          font-weight: 500;
          text-align: left;
        }
        .client-shell-kbd {
          margin-left: auto;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          border: 1px solid var(--border);
          border-radius: 5px;
          padding: 1px 5px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
        }
        @media(max-width:768px) {
          .client-shell-header { display: none; }
        }
      `}</style>

      <div className="panel-enter" style={{ display: 'contents' }}>
        <Sidebar />
      </div>

      <main
        id={scrollId}
        className="main-content"
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflowY: isFullHeight ? 'hidden' : 'scroll',
          height: isFullHeight ? '100dvh' : undefined,
          scrollBehavior: 'auto',
        }}
      >
        <header className="client-shell-header">
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
              Stefan Workspace
            </p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
              {label}
            </p>
          </div>

          <button
            type="button"
            className="client-shell-search"
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          >
            <MagnifyingGlass size={14} weight="regular" color="var(--text-muted)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Suche nach Projekt, Task, Dokument, Nachricht oder Einstellung...
            </span>
            <span className="client-shell-kbd">⌘K</span>
          </button>
        </header>

        <div style={{ width: '100%', flex: 1 }}>
          {children}
        </div>
      </main>

      <FloatingBar copilotOpen={copilotOpen} onToggleCopilot={() => setCopilotOpen((open) => !open)} />
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
      <FeedbackWidget />
      <CommandPalette />
    </div>
  )
}
