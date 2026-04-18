'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      window.location.href = data.session ? '/dashboard' : '/login'
    })
  }, [])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #E2E8F0', borderTopColor: '#007AFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}
