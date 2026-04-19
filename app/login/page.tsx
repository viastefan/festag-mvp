'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Portal = 'select' | 'client' | 'developer'
type Mode = 'login' | 'register'

const CLIENT_FEATURES = [
  { title: 'AI plant dein Projekt', desc: 'Tagro analysiert deine Idee und erstellt einen strukturierten Plan.' },
  { title: 'Experten setzen um', desc: 'Verifizierte Developer arbeiten im System, transparent und kontrolliert.' },
  { title: 'Tägliche Updates', desc: 'Du siehst Fortschritt in Echtzeit — keine Überraschungen.' },
  { title: 'Festag Garantie', desc: 'Qualitätskontrolle durch AI + Project Owner vor jeder Lieferung.' },
]

export default function LoginPage() {
  const [portal, setPortal] = useState<Portal>('select')
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [devUsername, setDevUsername] = useState('')
  const [devPin, setDevPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  /* ─── Client Auth ─── */
  const submitClient = async () => {
    setError('')
    if (!email || !password) return setError('Bitte alle Felder ausfüllen.')
    if (password.length < 6) return setError('Passwort min. 6 Zeichen.')
    setLoading(true)
    const supabase = createClient()
    if (mode === 'register') {
      const { error: e } = await supabase.auth.signUp({ email, password })
      if (e) { setError(e.message); setLoading(false); return }
      await supabase.auth.signInWithPassword({ email, password })
      window.location.href = '/onboarding'
    } else {
      const { data: signIn, error: e } = await supabase.auth.signInWithPassword({ email, password })
      if (e) { setError('E-Mail oder Passwort falsch.'); setLoading(false); return }
      window.location.href = '/dashboard'
    }
  }

  /* ─── Dev PIN Auth ─── */
  const submitDev = async () => {
    setError('')
    if (!devUsername || !devPin) return setError('Bitte Nutzername und PIN eingeben.')
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error: rpcError } = await supabase.rpc('verify_dev_pin', {
        username_input: devUsername.trim().toLowerCase(),
        pin_input: devPin.trim(),
      })
      if (rpcError || !data || data.length === 0) {
        setError('Ungültiger Nutzername oder PIN.')
        setLoading(false)
        return
      }
      localStorage.setItem('festag_dev_session', JSON.stringify({
        user_id: data[0].user_id,
        user_email: data[0].user_email,
        user_role: data[0].user_role,
        expires: Date.now() + 8 * 60 * 60 * 1000,
      }))
      window.location.href = '/dev'
    } catch {
      setError('Fehler bei der Anmeldung.')
      setLoading(false)
    }
  }

  /* ─── Portal select screen ─── */
  if (portal === 'select') return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', paddingTop: 'calc(24px + env(safe-area-inset-top))' }}>
      <div style={{ width: '100%', maxWidth: 440, animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height: 24, marginBottom: 32 }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Willkommen</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Wähle deinen Zugang</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { key: 'client',    label: 'Client Portal',    desc: 'Für Auftraggeber', badge: 'Für Kunden' },
            { key: 'developer', label: 'Developer',         desc: 'Nutzername & PIN',  badge: 'Intern' },
          ].map(p => (
            <button key={p.key} onClick={() => setPortal(p.key as Portal)} className="tap-scale" style={{
              background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
              padding: '18px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontFamily: 'inherit',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 2 }}>{p.label}</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{p.desc}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', padding: '3px 8px', background: 'var(--surface-2)', borderRadius: 6 }}>{p.badge}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </div>
            </button>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 32, letterSpacing: '0.06em' }}>
          AI PLANT · MENSCHEN BAUEN · SYSTEM VERBINDET
        </p>
      </div>
    </div>
  )

  const isDev = portal === 'developer'

  /* ─── Login / Register form ─── */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#FFFFFF' }}>

      {/* LEFT — Feature cards (desktop only) */}
      <div className="hide-mobile" style={{
        flex: 1, padding: '48px 56px', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', background: 'var(--bg)',
        borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden',
      }}>
        <img src="/brand/logo.svg" alt="festag" style={{ height: 22 }} />

        <div style={{ maxWidth: 440 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.6px', lineHeight: 1.15, marginBottom: 14 }}>
            {isDev ? 'Team Execution System.' : 'Software, verständlich gemacht.'}
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 36 }}>
            {isDev
              ? 'Empfange AI-strukturierte Tasks. Liefere kontrolliert. Arbeite im System.'
              : 'AI plant. Menschen bauen. Ein System verbindet alles.'}
          </p>

          {/* Client: Feature cards */}
          {!isDev && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CLIENT_FEATURES.map((f, i) => (
                <div key={f.title} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)',
                  padding: '14px 16px', animation: `slideUp 0.4s ${i * 0.08}s both`,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 2 }}>{f.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Dev: Active task list */}
          {isDev && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green-dark)', letterSpacing: '0.06em' }}>SYSTEM AKTIV</span>
              </div>
              {['Build SaaS Dashboard', 'Create AI Automation', 'Design Landing Page', 'Develop Mobile App'].map((t, i) => (
                <div key={t} style={{ padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>—</span>{t}
                </div>
              ))}
            </div>
          )}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          © 2026 FESTAG · AI-NATIVE SOFTWAREPRODUKTION
        </p>
      </div>

      {/* RIGHT — Form */}
      <div style={{ width: '100%', maxWidth: 460, padding: '48px 40px', paddingTop: 'calc(48px + env(safe-area-inset-top))', display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => setPortal('select')} style={{
          background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 13,
          cursor: 'pointer', padding: 0, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 40, fontFamily: 'inherit',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          Zurück
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

          {/* Mobile logo */}
          <div className="show-mobile" style={{ marginBottom: 32 }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height: 20 }} />
          </div>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: isDev ? 'var(--green-dark)' : 'var(--blue)', letterSpacing: '0.1em', marginBottom: 8 }}>
              {isDev ? 'DEVELOPER PORTAL' : 'CLIENT PORTAL'}
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              {isDev ? 'Systemzugang' : (mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {isDev
                ? 'Nur für verifizierte Festag Developer.'
                : (mode === 'login' ? 'Melde dich an, um fortzufahren.' : 'Starte dein Projekt in weniger als 2 Minuten.')}
            </p>
          </div>

          {/* ── CLIENT FORM ── */}
          {!isDev && (
            <>
              {/* Segmented tab */}
              <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: 3, marginBottom: 24, gap: 2 }}>
                {(['login', 'register'] as const).map(m => (
                  <button key={m} onClick={() => { setMode(m); setError('') }} className="tap-scale" style={{
                    flex: 1, padding: '9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: mode === m ? '#FFFFFF' : 'transparent',
                    color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                    fontSize: 13.5, fontWeight: mode === m ? 600 : 500,
                    boxShadow: mode === m ? 'var(--shadow-xs)' : 'none', transition: 'all 0.12s',
                    fontFamily: 'inherit',
                  }}>
                    {m === 'login' ? 'Anmelden' : 'Registrieren'}
                  </button>
                ))}
              </div>

              <label style={lbl}>E-Mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@beispiel.de" style={inp} autoComplete="email" inputMode="email"
                onKeyDown={e => e.key === 'Enter' && submitClient()} />

              <label style={{ ...lbl, marginTop: 14 }}>Passwort</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" style={inp}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onKeyDown={e => e.key === 'Enter' && submitClient()} />

              {error && <ErrBox msg={error} />}

              <button onClick={submitClient} disabled={loading} className="tap-scale" style={{ ...btnStyle, background: loading ? 'var(--surface-2)' : 'var(--text)', color: loading ? 'var(--text-muted)' : '#FFFFFF', cursor: loading ? 'default' : 'pointer' }}>
                {loading ? <Spinner /> : (mode === 'login' ? 'Anmelden' : 'Konto erstellen')}
              </button>

              <p style={{ marginTop: 22, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                {mode === 'login' ? 'Noch kein Konto? ' : 'Bereits registriert? '}
                <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
                  style={{ color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>
                  {mode === 'login' ? 'Registrieren' : 'Anmelden'}
                </span>
              </p>
            </>
          )}

          {/* ── DEV FORM (PIN only, no register) ── */}
          {isDev && (
            <>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Kein öffentlicher Zugang · Zuteilung durch Admin</p>
              </div>

              <label style={lbl}>Nutzername</label>
              <input value={devUsername} onChange={e => setDevUsername(e.target.value)}
                placeholder="dein-username" style={inp} autoComplete="username"
                onKeyDown={e => e.key === 'Enter' && submitDev()} />

              <label style={{ ...lbl, marginTop: 14 }}>PIN</label>
              <input type="password" value={devPin}
                onChange={e => setDevPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="••••" maxLength={8} inputMode="numeric" style={inp}
                onKeyDown={e => e.key === 'Enter' && submitDev()} />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Numerischer PIN, 4–8 Stellen</p>

              {error && <ErrBox msg={error} />}

              <button onClick={submitDev} disabled={loading} className="tap-scale" style={{ ...btnStyle, marginTop: 20, background: loading ? 'var(--surface-2)' : 'var(--text)', color: loading ? 'var(--text-muted)' : '#FFFFFF', cursor: loading ? 'default' : 'pointer' }}>
                {loading ? <Spinner /> : 'Einloggen →'}
              </button>

              <p style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                Noch kein Zugang? Wende dich an dein Admin-Team.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <span style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
      Einen Moment…
    </span>
  )
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--red-bg)', border: '1px solid #FECACA', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--red)' }}>
      {msg}
    </div>
  )
}

const lbl: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
  display: 'block', marginBottom: 7,
}
const inp: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: '#FFFFFF', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', fontSize: 15, outline: 'none',
  color: 'var(--text)', boxSizing: 'border-box' as const,
  transition: 'all 0.15s', minHeight: 44,
}
const btnStyle: React.CSSProperties = {
  marginTop: 20, width: '100%', padding: '13px',
  borderRadius: 'var(--r-sm)', border: 'none',
  fontSize: 14.5, fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  transition: 'opacity 0.2s', minHeight: 44, fontFamily: 'inherit',
}
