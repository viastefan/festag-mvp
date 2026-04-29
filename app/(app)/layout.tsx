'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import AppHeader from '@/components/AppHeader'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setChecking(false)
    })
  }, [])

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      {/* overflow-y: scroll prevents layout shift from scrollbar appearing/disappearing */}
      <main className="main-content" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'scroll' }}>
        <AppHeader />
        <div style={{ width: '100%', flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
