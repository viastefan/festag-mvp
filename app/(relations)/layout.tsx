'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRelationsSetup } from '@/hooks/useRelationsSetup'
import RelationsSidebar from '@/components/RelationsSidebar'

export default function RelationsLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const pathname = usePathname()
  const { status: setupStatus, error: setupError, retry: retrySetup } = useRelationsSetup()

  useEffect(() => {
    const el = document.getElementById('relations-main-scroll')
    if (el) el.scrollTop = 0
  }, [pathname])

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setChecking(false)
    })
  }, [])

  // Auth-Check laeuft noch
  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )

  // DB-Setup laeuft
  if (setupStatus === 'checking' || setupStatus === 'idle') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--bg)' }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Datenbank wird vorbereitet...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )

  // DB-Setup Fehler
  if (setupStatus === 'error') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--bg)', padding: 32 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--danger, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 700 }}>!</div>
      <p style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600 }}>Datenbank-Setup fehlgeschlagen</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 480, textAlign: 'center', lineHeight: 1.5 }}>{setupError}</p>
      <button
        onClick={retrySetup}
        style={{
          marginTop: 8,
          padding: '8px 20px',
          background: 'var(--primary, #6366f1)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Erneut versuchen
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <RelationsSidebar />
      <main
        id="relations-main-scroll"
        className="main-content"
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'scroll', scrollBehavior: 'auto' }}
      >
        <div style={{ width: '100%', flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
