'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import CopilotPanel from '@/components/CopilotPanel'
import FeedbackWidget from '@/components/FeedbackWidget'
import CommandPalette from '@/components/CommandPalette'
import FloatingBar from '@/components/FloatingBar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [checking,    setChecking]    = useState(true)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const pathname = usePathname()
  const isFullHeight = pathname === '/messages'

  useEffect(() => {
    const el = document.getElementById('app-main-scroll')
    if (el) el.scrollTop = 0
  }, [pathname])

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setChecking(false)
    })
  }, [])

  // Globale Shortcut-Bridges (vom CommandPalette dispatched)
  useEffect(() => {
    const onCopilot = () => setCopilotOpen(o => !o)
    window.addEventListener('toggle-copilot', onCopilot)
    return () => window.removeEventListener('toggle-copilot', onCopilot)
  }, [])

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @keyframes panelFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .panel-enter { animation: panelFadeIn .22s cubic-bezier(.16,1,.3,1) both; }
      `}</style>
      <div className="panel-enter" style={{ display:'contents' }} key="festwerk">
        <Sidebar />
      </div>
      <main
        id="app-main-scroll"
        className="main-content"
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: isFullHeight ? 'hidden' : 'scroll', height: isFullHeight ? '100dvh' : undefined, scrollBehavior: 'auto' }}
      >
        <div style={{ width: '100%', flex: 1 }}>
          {children}
        </div>
      </main>

      <FloatingBar copilotOpen={copilotOpen} onToggleCopilot={() => setCopilotOpen(o => !o)} />
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
      <FeedbackWidget />
      <CommandPalette />
    </div>
  )
}
