'use client'

import { useEffect, useState } from 'react'

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

export default function ClientAppShell({
  children,
  isFullHeight = false,
  scrollId = 'client-main-scroll',
}: ClientAppShellProps) {
  const [checking, setChecking] = useState(true)
  const [copilotOpen, setCopilotOpen] = useState(false)

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
