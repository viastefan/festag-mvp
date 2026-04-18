'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Portal = 'select'|'client'|'developer'
type Mode = 'login'|'register'

const TASKS_ANIM = [
  'Build SaaS Dashboard',
  'Create AI Automation',
  'Design Website',
  'Develop Mobile App',
  'Setup Payment System',
  'Build Admin Panel',
]

export default function EntryPage() {
  const [portal, setPortal] = useState<Portal>('select')
  const [mode, setMode] = useState<Mode>('login')
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
      const { data: signIn, error: e2 } = await supabase.auth.signInWithPassword({ email, password })
      if (e2) { setError(e2.message); setLoading(false); return }
      if (signIn.session && portal === 'developer') {
        await supabase.from('profiles').update({ role: 'dev' }).eq('id', signIn.session.user.id)
      }
      window.location.href = portal === 'developer' ? '/dev' : '/onboarding'
    } else {
      const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('E-Mail oder Passwort falsch.'); setLoading(false); return }
      
      // Check role
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', signIn.session!.user.id).single()
      const role = profile?.role
      
      if (portal === 'developer') {
        if (role === 'dev' || role === 'admin') {
          window.location.href = role === 'admin' ? '/internal-admin' : '/dev'
        } else {
          setError('Kein Developer-Zugang für dieses Konto.'); setLoading(false); return
        }
      } else {
        window.location.href = '/dashboard'
      }
    }
  }

  // ─── PORTAL SELECT ───
  if (portal === 'select') return (
    <div style={{ minHeight: '100vh', background: '#0B0F1A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520, textAlign: 'center', animation: 'fadeUp 0.5s ease' }}>
        <div style={{ marginBottom: 48 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height: 28, filter: 'invert(1)', marginBottom: 24 }} />
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: 10 }}>
            Willkommen
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            AI-native Softwareproduktion.<br />Wähle deinen Zugang.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { key: 'client', label: 'Client Portal', desc: 'Für Auftraggeber', icon: '◉', gradient: 'linear-gradient(135deg, #007AFF, #5856D6)' },
            { key: 'developer', label: 'Developer / Admin', desc: 'Für Teams', icon: '◈', gradient: 'linear-gradient(135deg, #30D158, #32D74B)' },
          ].map(p => (
            <button key={p.key} onClick={() => setPortal(p.key as Portal)} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '24px 18px', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.2s', fontFamily: 'Aeonik, sans-serif',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: p.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', marginBottom: 12 }}>{p.icon}</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{p.label}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{p.desc}</p>
            </button>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>
          AI PLANT · MENSCHEN BAUEN · SYSTEM VERBINDET
        </p>
      </div>
    </div>
  )

  // ─── LOGIN FORM ───
  const isDev = portal === 'developer'
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0B0F1A' }}>
      {/* LEFT — Visual */}
      <div className="hide-mobile" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, borderRight: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
        {/* Gradient background */}
        <div style={{ position: 'absolute', inset: 0, background: isDev ? 'radial-gradient(circle at 30% 30%, rgba(48,209,88,0.1), transparent 50%)' : 'radial-gradient(circle at 30% 30%, rgba(0,122,255,0.12), transparent 50%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 80%, rgba(88,86,214,0.1), transparent 50%)' }} />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 440 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height: 28, filter: 'invert(1)', marginBottom: 32 }} />
          <h2 style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 14 }}>
            {isDev ? 'Team Execution\nSystem.' : 'Software,\nfinally controlled.'}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 40 }}>
            {isDev ? 'Empfange AI-strukturierte Tasks. Liefere kontrolliert. Arbeite im System.' : 'AI plant. Menschen bauen. Ein System verbindet alles.'}
          </p>

          {/* Animated task list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TASKS_ANIM.slice(0, 4).map((t, i) => (
              <div key={t} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                animation: `slideUp 0.4s ${i * 0.1}s both`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#30D158' : 'rgba(255,255,255,0.2)', display: 'inline-block', animation: i === 0 ? 'pulse 2s infinite' : 'none' }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{t}</span>
                {i === 0 && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#30D158', letterSpacing: '0.08em' }}>ACTIVE</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div style={{ width: '100%', maxWidth: 480, padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <button onClick={() => setPortal('select')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', marginBottom: 32, fontFamily: 'inherit', padding: 0, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Zurück
        </button>

        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: isDev ? '#30D158' : '#007AFF', letterSpacing: '0.12em', marginBottom: 8 }}>
            {isDev ? 'DEVELOPER / ADMIN' : 'CLIENT PORTAL'}
          </p>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', marginBottom: 6 }}>
            {mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            {mode === 'login' ? 'Melde dich an um fortzufahren.' : (isDev ? 'Werde Teil des Festag Teams.' : 'Starte dein Projekt.')}
          </p>
        </div>

        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, marginBottom: 24, gap: 3 }}>
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

        <label style={{ ...lbl, marginTop: 14 }}>Passwort</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" style={inp}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          onKeyDown={e => e.key === 'Enter' && submit()} />

        {mode === 'login' && (
          <p style={{ textAlign: 'right', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8, cursor: 'pointer' }}>
            Passwort vergessen?
          </p>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, fontSize: 13, color: '#F87171' }}>
            {error}
          </div>
        )}

        <button onClick={submit} disabled={loading} style={{
          marginTop: 20, width: '100%', padding: '13px', borderRadius: 10, border: 'none',
          background: loading ? 'rgba(255,255,255,0.08)' : (isDev ? 'linear-gradient(135deg, #30D158, #32D74B)' : 'linear-gradient(135deg, #007AFF, #5856D6)'),
          color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Aeonik, sans-serif', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? (<><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Bitte warten…</>) 
            : mode === 'login' ? 'Anmelden →' : 'Konto erstellen →'}
        </button>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          {mode === 'login' ? 'Noch kein Konto? ' : 'Bereits registriert? '}
          <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={{ color: isDev ? '#30D158' : '#007AFF', cursor: 'pointer', fontWeight: 500 }}>
            {mode === 'login' ? 'Registrieren' : 'Anmelden'}
          </span>
        </p>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }
const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, fontSize: 14, outline: 'none', color: '#fff', boxSizing: 'border-box' as const, fontFamily: 'Aeonik, sans-serif' }
