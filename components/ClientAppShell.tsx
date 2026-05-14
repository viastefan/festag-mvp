'use client'

import { useEffect, useState } from 'react'

import CommandPalette from '@/components/CommandPalette'
import CopilotPanel from '@/components/CopilotPanel'
import FeedbackWidget from '@/components/FeedbackWidget'
import FloatingBar from '@/components/FloatingBar'
import LoadingScreen from '@/components/LoadingScreen'
import PwaInstallBanner from '@/components/PwaInstallBanner'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/client'

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
  const [checking, setChecking] = useState(true)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    try { setSidebarCollapsed(localStorage.getItem('festag-sidebar-collapsed') === 'true') } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('festag-sidebar-collapsed', String(sidebarCollapsed)) } catch {}
  }, [sidebarCollapsed])

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
    window.addEventListener('toggle-copilot', onCopilot)
    window.addEventListener('open-copilot', onOpenCopilot)
    return () => {
      window.removeEventListener('toggle-copilot', onCopilot)
      window.removeEventListener('open-copilot', onOpenCopilot)
    }
  }, [])

  if (checking) return <LoadingScreen onDone={() => undefined} />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @keyframes panelFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .panel-enter { animation: panelFadeIn .22s cubic-bezier(.16,1,.3,1) both; }
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
          marginLeft: sidebarCollapsed ? 0 : 256,
          transition: 'margin-left .22s cubic-bezier(.16,1,.3,1)',
        }}
      >
        <div style={{ width: '100%', flex: 1 }}>
          {children}
        </div>
      </main>

      <FloatingBar copilotOpen={copilotOpen} onToggleCopilot={() => setCopilotOpen((open) => !open)} />
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
      <FeedbackWidget />
      <CommandPalette />
      <PwaInstallBanner />
    </div>
  )
}
