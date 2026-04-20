'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setChecking(false)
    })
  }, [])

  if (checking) return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)' }}>
      <div style={{ width:24,height:24,border:'2px solid var(--border)',borderTopColor:'var(--text)',borderRadius:'50%',animation:'spin .8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ display:'flex',minHeight:'100vh',background:'var(--bg)' }}>
      <Sidebar />
      {/* main-content class handles margin + padding from globals.css */}
      <main className="main-content" style={{ flex:1, minWidth:0 }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
