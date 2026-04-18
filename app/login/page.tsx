'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError('')
    if (!email || !password) return setError('Bitte alle Felder ausfüllen.')
    if (password.length < 6) return setError('Passwort min. 6 Zeichen.')
    setLoading(true)
    const supabase = createClient()
    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      const { error: e2 } = await supabase.auth.signInWithPassword({ email, password })
      if (e2) { setError(e2.message); setLoading(false); return }
      // New users go to onboarding
      window.location.href = '/onboarding'
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('E-Mail oder Passwort falsch.'); setLoading(false); return }
      window.location.href = '/dashboard'
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0A0B0E' }}>
      {/* Left — branding */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', borderRight: '1px solid rgba(255,255,255,0.06)' }} className="hide-mobile">
        <div style={{ maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }}>F</div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>festag<span style={{ color: '#2563EB' }}>.</span></span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: '#fff', letterSpacing: '-0.8px', lineHeight: 1.2, marginBottom: 20 }}>
            Software development,<br />
            <span style={{ color: '#2563EB' }}>finally understandable.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 40 }}>
            AI plant. Menschen bauen. Ein System verbindet alles.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '✦', text: 'AI strukturiert dein Projekt automatisch' },
              { icon: '◎', text: 'Verifizierte Developer setzen um' },
              { icon: '◻', text: 'Tägliche Updates — keine Überraschungen' },
            ].map(f => (
              <div key={f.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, color: '#2563EB', marginTop: 1, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 40px' }}>
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', marginBottom: 6 }}>
            {mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            {mode === 'login' ? 'Melde dich an um fortzufahren.' : 'Starte dein erstes Projekt kostenlos.'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, marginBottom: 24, gap: 3 }}>
          {(['login','register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: mode === m ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: mode === m ? '#fff' : 'rgba(255,255,255,0.35)',
              fontSize: 13, fontWeight: mode === m ? 600 : 400, fontFamily: 'Aeonik, sans-serif',
            }}>
              {m === 'login' ? 'Anmelden' : 'Registrieren'}
            </button>
          ))}
        </div>

        <label style={lbl}>E-Mail</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="name@beispiel.de" style={inp} autoComplete="email"
          onKeyDown={e => e.key === 'Enter' && submit()} />

        <label style={{ ...lbl, marginTop: 16 }}>Passwort</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" style={inp}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          onKeyDown={e => e.key === 'Enter' && submit()} />

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, fontSize: 13, color: '#F87171' }}>
            {error}
          </div>
        )}

        <button onClick={submit} disabled={loading} style={{
          marginTop: 20, width: '100%', padding: '13px', borderRadius: 10, border: 'none',
          background: loading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #2563EB, #7C3AED)',
          color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Aeonik, sans-serif', transition: 'opacity 0.2s', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? (
            <>
              <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              Bitte warten…
            </>
          ) : mode === 'login' ? 'Anmelden →' : 'Konto erstellen →'}
        </button>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          {mode === 'login' ? 'Noch kein Konto? ' : 'Bereits registriert? '}
          <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}>
            {mode === 'login' ? 'Registrieren' : 'Anmelden'}
          </span>
        </p>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }
const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, fontSize: 14, outline: 'none', color: '#fff', boxSizing: 'border-box' as const, fontFamily: 'Aeonik, sans-serif', transition: 'border-color 0.2s' }
