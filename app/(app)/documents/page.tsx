'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DocumentsPage() {
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = '/login'
    })
  }, [])

  return (
    <div>
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <h1 style={{ marginBottom: 4 }}>Dokumente</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Rechnungen, Verträge und Briefings</p>
      </div>
      <div className="animate-fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>
        </div>
        <h2 style={{ marginBottom: 8 }}>Noch keine Dokumente</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Sobald dein Projekt aktiv wird, findest du hier Rechnungen, Briefings und Verträge.</p>
      </div>
    </div>
  )
}
