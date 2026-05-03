'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import RelationsSidebar from '@/components/RelationsSidebar'

export default function RelationsLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const pathname = usePathname()

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

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
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
