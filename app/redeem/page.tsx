'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

function RedeemInner() {
  const router    = useRouter()
  const params    = useSearchParams()
  const initEmail = params?.get('email') ?? ''
  const sb        = createClient()

  const [email,    setEmail]    = useState(initEmail)
  const [pin,      setPin]      = useState('')
  const [pw,       setPw]       = useState('')
  const [pw2,      setPw2]      = useState('')
  const [phase,    setPhase]    = useState<'pin'|'auth'|'redeem'|'done'>('pin')
  const [authMode, setAuthMode] = useState<'login'|'register'>('register')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Schon eingeloggt? Dann direkt zu Auth überspringen.
  useEffect(() => {
    sb.auth.getUser().then(({ data }) => {
      if (data.user) {
        if (initEmail && data.user.email === initEmail) {
          // PIN-Modus, Email match — direkt redeemen wenn PIN da
          setPhase('pin')
        } else if (data.user.email === email) {
          setPhase('pin')
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkPinAndProceed() {
    setError('')
    if (!email || !pin || pin.length !== 6) {
      return setError('Bitte E-Mail und 6-stelligen PIN eingeben.')
    }
    setLoading(true)
    const { data: { user } } = await sb.auth.getUser()
    setLoading(false)
    if (user && user.email?.toLowerCase() === email.toLowerCase()) {
      // Eingeloggt mit passender Mail → direkt redeemen
      doRedeem()
    } else {
      setPhase('auth')
    }
  }

  async function doAuth() {
    setError('')
    if (!pw) return setError('Bitte Passwort eingeben.')
    setLoading(true)
    if (authMode === 'login') {
      const { error: e } = await sb.auth.signInWithPassword({ email, password: pw })
      setLoading(false)
      if (e) return setError('E-Mail oder Passwort falsch.')
      doRedeem()
    } else {
      if (pw !== pw2)         return (setLoading(false), setError('Passwörter stimmen nicht überein.'))
      if (pw.length < 8)      return (setLoading(false), setError('Passwort muss mindestens 8 Zeichen haben.'))
      const { error: e } = await sb.auth.signUp({ email, password: pw })
      if (e) {
        if ((e.message ?? '').toLowerCase().includes('already')) {
          // Konto existiert → automatisch login versuchen
          const { error: e2 } = await sb.auth.signInWithPassword({ email, password: pw })
          setLoading(false)
          if (e2) return setError('Konto existiert bereits — Passwort falsch?')
          return doRedeem()
        }
        setLoading(false)
        return setError(e.message)
      }
      // Auto-Sign-In
      await sb.auth.signInWithPassword({ email, password: pw })
      setLoading(false)
      doRedeem()
    }
  }

  async function doRedeem() {
    setError('')
    setPhase('redeem')
    setLoading(true)
    const res  = await fetch('/api/invites/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin: pin.trim() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error === 'invalid-pin-or-expired'
        ? 'PIN ist falsch oder abgelaufen.'
        : data.error === 'not-authenticated'
          ? 'Bitte zuerst einloggen.'
          : data.error ?? 'Unbekannter Fehler.')
      setPhase('auth')
      return
    }
    setPhase('done')
    // 1.4s zeigen, dann redirecten
    setTimeout(() => {
      window.location.href = data.redirect ?? '/dashboard'
    }, 1400)
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
        maxWidth: 420,
        background:'var(--surface)',
        border:'1px solid var(--border)',
        borderRadius: 22,
        padding:'36px 30px',
        boxShadow:'0 18px 60px rgba(0,0,0,0.06)',
      }}>
        <img src="/brand/logo.svg" alt="festag" style={{ height: 17, marginBottom: 24, opacity: .85, filter: 'var(--logo-filter,none)' }}/>

        {phase === 'pin' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 8, color: 'var(--text)' }}>
              PIN einlösen
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 22 }}>
              Gib deine E-Mail und den 6-stelligen PIN aus deiner Einladungs-Mail ein.
            </p>

            <Field label="E-Mail" value={email} onChange={setEmail} type="email" placeholder="deine@email.com"/>
            <PinField value={pin} onChange={setPin}/>

            {error && <ErrorBox text={error}/>}

            <PrimaryBtn label="Weiter →" onClick={checkPinAndProceed} loading={loading}/>

            <p style={{ marginTop: 18, fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.55 }}>
              Noch keinen PIN? Klicke zuerst den Acceptance-Link aus deiner Einladungs-Mail.
            </p>
          </>
        )}

        {phase === 'auth' && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 8, color: 'var(--text)' }}>
              {authMode === 'login' ? 'Einloggen' : 'Konto anlegen'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 18 }}>
              {authMode === 'login'
                ? 'Dein Festag-Konto existiert bereits. Bitte einloggen.'
                : 'Lege ein Passwort fest, um dein Festag-Konto zu aktivieren.'}
            </p>

            <Field label="E-Mail" value={email} onChange={setEmail} type="email" disabled/>
            <Field label="Passwort" value={pw} onChange={setPw} type="password" placeholder={authMode === 'login' ? 'Passwort' : 'Mindestens 8 Zeichen'}/>
            {authMode === 'register' && <Field label="Passwort bestätigen" value={pw2} onChange={setPw2} type="password" placeholder="Erneut eingeben"/>}

            {error && <ErrorBox text={error}/>}

            <PrimaryBtn label={authMode === 'login' ? 'Einloggen →' : 'Konto anlegen →'} onClick={doAuth} loading={loading}/>

            <p style={{ marginTop: 18, fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>
              {authMode === 'login'
                ? <>Noch kein Konto? <span onClick={() => setAuthMode('register')} style={{ color:'var(--btn-prim)', fontWeight: 700, cursor:'pointer' }}>Registrieren</span></>
                : <>Bereits ein Konto? <span onClick={() => setAuthMode('login')} style={{ color:'var(--btn-prim)', fontWeight: 700, cursor:'pointer' }}>Einloggen</span></>}
            </p>
          </>
        )}

        {phase === 'redeem' && (
          <Centered>
            <Spinner/>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 16 }}>PIN wird geprüft …</p>
          </Centered>
        )}

        {phase === 'done' && (
          <Centered>
            <CheckCircle/>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 14, marginBottom: 4, color: 'var(--text)' }}>Willkommen.</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Dein Workspace wird geladen …</p>
          </Centered>
        )}
      </div>
    </div>
  )
}

export default function RedeemPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100dvh', background:'var(--bg)' }}/>}>
      <RedeemInner/>
    </Suspense>
  )
}

// ── Atoms ────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, type='text', placeholder='', disabled=false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean
}) {
  const [f, setF] = useState(false)
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        display:'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em',
        color: f ? 'var(--btn-prim)' : 'var(--text-muted)',
        textTransform:'uppercase', marginBottom: 6, transition:'color .15s',
      }}>{label}</label>
      <input
        type={type} value={value} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        placeholder={placeholder}
        style={{
          width:'100%', padding:'12px 14px',
          background: disabled ? 'var(--card)' : f ? 'var(--inp-focus)' : 'var(--inp)',
          border: `1.5px solid ${f ? 'var(--inp-focus-border)' : 'var(--inp-border)'}`,
          borderRadius: 11, fontSize: 15, color:'var(--text)',
          outline:'none', transition:'all .15s',
          fontFamily:'inherit', fontWeight: 500,
          opacity: disabled ? .65 : 1,
        }}
      />
    </div>
  )
}

function PinField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [f, setF] = useState(false)
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display:'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em',
        color: f ? 'var(--btn-prim)' : 'var(--text-muted)',
        textTransform:'uppercase', marginBottom: 6, transition:'color .15s',
      }}>PIN</label>
      <input
        type="text" inputMode="numeric" pattern="[0-9]*"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        placeholder="••••••"
        style={{
          width:'100%', padding:'14px 16px',
          background: f ? 'var(--inp-focus)' : 'var(--inp)',
          border: `1.5px solid ${f ? 'var(--inp-focus-border)' : 'var(--inp-border)'}`,
          borderRadius: 11, fontSize: 22, color:'var(--text)',
          outline:'none', transition:'all .15s',
          fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',
          fontWeight: 700, letterSpacing: '.3em', textAlign:'center',
        }}
      />
    </div>
  )
}

function PrimaryBtn({ label, onClick, loading=false }: { label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick} disabled={loading}
      style={{
        width:'100%', padding:'14px 22px',
        background:'var(--btn-prim)', color:'var(--btn-prim-text)',
        fontSize: 15, fontWeight: 700,
        borderRadius: 12, border:'none',
        cursor: loading ? 'default' : 'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:'inherit', letterSpacing:'-.1px',
        opacity: loading ? .7 : 1, transition:'opacity .15s',
      }}
    >
      {loading ? <Spinner small/> : label}
    </button>
  )
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div style={{
      padding:'10px 14px',
      background:'var(--red-bg, rgba(220,70,70,0.08))',
      border:'1px solid rgba(220,70,70,.2)',
      borderRadius: 10, fontSize: 13, color:'var(--red,#D14343)',
      marginBottom: 14, lineHeight: 1.5,
    }}>{text}</div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 0' }}>{children}</div>
}

function Spinner({ small=false }: { small?: boolean }) {
  const sz = small ? 16 : 26
  return (
    <>
      <div style={{ width: sz, height: sz, border: `2.5px solid ${small ? 'rgba(255,255,255,0.4)' : 'var(--border)'}`, borderTopColor: small ? 'var(--btn-prim-text)' : 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </>
  )
}

function CheckCircle() {
  return (
    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--green-bg, rgba(34,197,94,0.12))', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
  )
}
