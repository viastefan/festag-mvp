'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

export default function InviteAcceptPage() {
  const params  = useParams<{ token: string }>()
  const router  = useRouter()
  const [state,   setState]   = useState<'idle'|'accepting'|'done'|'error'>('idle')
  const [email,   setEmail]   = useState<string>('')
  const [error,   setError]   = useState<string>('')

  async function accept() {
    if (!params?.token) return
    setState('accepting')
    setError('')
    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === 'invite-not-found-or-expired'
          ? 'Diese Einladung ist abgelaufen oder ungültig.'
          : (data.error ?? 'Unbekannter Fehler.'))
        setState('error')
        return
      }
      setEmail(data.email ?? '')
      setState('done')
    } catch (e: any) {
      setError(e?.message ?? 'Netzwerkfehler.')
      setState('error')
    }
  }

  return (
    <div style={{
      minHeight:'100dvh',
      background:'var(--bg)',
      fontFamily:"'Inter',sans-serif",
      WebkitFontSmoothing:'antialiased',
      display:'flex',
      flexDirection:'column',
      alignItems:'center',
      justifyContent:'center',
      padding:'24px',
    }}>
      <ThemeToggle/>
      <div style={{
        width:'100%',
        maxWidth: 440,
        background:'var(--surface)',
        border:'1px solid var(--border)',
        borderRadius: 22,
        padding:'40px 32px',
        boxShadow:'0 18px 60px rgba(0,0,0,0.06)',
      }}>
        <img src="/brand/logo.svg" alt="festag" style={{ height: 18, marginBottom: 28, opacity: .85, filter: 'var(--logo-filter,none)' }}/>

        {state === 'idle' && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 10, color: 'var(--text)' }}>
              Einladung annehmen
            </h1>
            <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 26 }}>
              Du wurdest eingeladen, einem Festag-Workspace beizutreten. Sobald du annimmst, bekommst du automatisch eine Mail mit deinem persönlichen Zugangs-PIN.
            </p>
            <button
              onClick={accept}
              style={{
                width:'100%',
                padding:'14px 20px',
                background:'var(--btn-prim)',
                color:'var(--btn-prim-text)',
                border:'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor:'pointer',
                fontFamily:'inherit',
                letterSpacing:'-.1px',
                transition:'transform .12s, opacity .12s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.92'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
            >
              Einladung annehmen →
            </button>
            <p style={{ marginTop: 18, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.55 }}>
              Wenn du diese Einladung nicht erwartet hast, kannst du diese Seite einfach schließen.
            </p>
          </>
        )}

        {state === 'accepting' && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 0' }}>
            <div style={{ width: 28, height: 28, border: '2.5px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite', marginBottom: 18 }}/>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Einladung wird bestätigt …</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
          </div>
        )}

        {state === 'done' && (
          <>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--green-bg, rgba(34,197,94,0.12))', display:'flex', alignItems:'center', justifyContent:'center', marginBottom: 18 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 10, color: 'var(--text)' }}>
              Einladung angenommen
            </h1>
            <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 22 }}>
              Wir haben dir eine zweite Mail an{' '}
              <strong style={{ color: 'var(--text)' }}>{email || 'deine Adresse'}</strong>
              {' '}geschickt. Sie enthält deinen persönlichen Zugangs-PIN.
            </p>
            <button
              onClick={() => router.push('/redeem' + (email ? `?email=${encodeURIComponent(email)}` : ''))}
              style={{
                width:'100%',
                padding:'13px 18px',
                background:'var(--btn-prim)',
                color:'var(--btn-prim-text)',
                border:'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor:'pointer',
                fontFamily:'inherit',
              }}
            >
              PIN jetzt einlösen →
            </button>
            <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              Mail nicht angekommen? Prüfe Spam — oder warte kurz.
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 10, color: 'var(--text)' }}>
              Hier stimmt etwas nicht
            </h1>
            <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 22 }}>
              {error}
            </p>
            <button
              onClick={() => router.push('/login')}
              style={{
                width:'100%',
                padding:'13px 18px',
                background:'var(--inp)',
                color:'var(--text)',
                border:'1.5px solid var(--border)',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor:'pointer',
                fontFamily:'inherit',
              }}
            >
              Zurück zum Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
