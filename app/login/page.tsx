'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getTimeBasedGreeting } from '@/lib/hooks/useUser'

type Portal = 'select'|'client'|'developer'
type Mode = 'login'|'register'

const FEATURES = [
  {
    key: 'ai',
    title: 'AI plant & strukturiert',
    desc: 'Tagro analysiert deine Idee und erstellt einen präzisen Plan.',
  },
  {
    key: 'devs',
    title: 'Experten bauen',
    desc: 'Verifizierte Developer setzen im System kontrolliert um.',
  },
  {
    key: 'tx',
    title: 'Transparenter Fortschritt',
    desc: 'Tägliche Updates, klare Meilensteine, keine Überraschungen.',
  },
  {
    key: 'guar',
    title: 'Festag Garantie',
    desc: 'AI + Project Owner prüfen jede Lieferung vor der Freigabe.',
  },
]

export default function LoginPage() {
  const [portal, setPortal] = useState<Portal>('select')
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  const greeting = getTimeBasedGreeting()

  // Rotate "active" feature card every 2.8s
  useEffect(() => {
    const iv = setInterval(() => setActiveFeature(i => (i + 1) % FEATURES.length), 2800)
    return () => clearInterval(iv)
  }, [])

  const submit = async () => {
    setError('')
    if (!email || !password) return setError('Bitte alle Felder ausfüllen.')
    if (password.length < 6) return setError('Passwort mindestens 6 Zeichen.')
    if (mode === 'register' && !fullName.trim()) return setError('Bitte gib deinen Namen ein.')
    setLoading(true)
    const supabase = createClient()

    if (mode === 'register') {
      const { error: signUpErr } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName.trim() } },
      })
      if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
      const { data: signIn, error: e2 } = await supabase.auth.signInWithPassword({ email, password })
      if (e2) { setError(e2.message); setLoading(false); return }
      if (signIn.session) {
        await supabase.from('profiles').update({
          full_name: fullName.trim(),
          role: portal === 'developer' ? 'dev' : 'client',
        }).eq('id', signIn.session.user.id)
      }
      window.location.href = portal === 'developer' ? '/dev' : '/onboarding'
    } else {
      const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('E-Mail oder Passwort falsch.'); setLoading(false); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', signIn.session!.user.id).single()
      const role = profile?.role
      if (portal === 'developer') {
        if (role === 'dev' || role === 'admin') {
          window.location.href = role === 'admin' ? '/internal-admin' : '/dev'
        } else { setError('Dieses Konto hat keinen Developer-Zugang.'); setLoading(false); return }
      } else {
        window.location.href = '/dashboard'
      }
    }
  }

  // ═══════════════════════════════════════════
  // PORTAL SELECT
  // ═══════════════════════════════════════════
  if (portal === 'select') return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
      {/* Logo top-left */}
      <div style={{ position: 'absolute', top: 24, left: 28, zIndex: 2, paddingTop: 'env(safe-area-inset-top)' }}>
        <img src="/brand/logo.svg" alt="festag" style={{ height: 20 }} />
      </div>

      {/* Soft background accent */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%', width: '60%', height: '80%',
        background: 'radial-gradient(circle, rgba(0,122,255,0.05), transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 440, animation: 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.4px' }}>
              {greeting.short}
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 360, margin: '0 auto' }}>
              {portal === 'select' && greeting.full.replace(`${greeting.short} — `, '')}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                key: 'client',
                label: 'Client',
                desc: 'Für Auftraggeber',
                badge: 'Für Kunden',
              },
              {
                key: 'developer',
                label: 'Developer',
                desc: 'Für Festag',
                badge: 'Intern',
              },
            ].map(p => (
              <button key={p.key} onClick={() => setPortal(p.key as Portal)} className="tap-scale" style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)',
                padding: '18px 20px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--text)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 2, letterSpacing: '-0.1px' }}>{p.label}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{p.desc}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', padding: '3px 8px', background: 'var(--surface-2)', borderRadius: 6 }}>{p.badge}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                </div>
              </button>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 32, letterSpacing: '0.08em' }}>
            AI PLANT · MENSCHEN BAUEN · SYSTEM VERBINDET
          </p>
        </div>
      </div>
    </div>
  )

  const isDev = portal === 'developer'

  // ═══════════════════════════════════════════
  // LOGIN / REGISTER FORM
  // ═══════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', position: 'relative', overflow: 'hidden' }}>
      {/* ═════ LEFT SIDE ═════ */}
      <div className="hide-mobile" style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 0 28px 56px',
        overflow: 'hidden',
        background: '#FFFFFF',
      }}>
        {/* Background image with gradient transitions */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: isDev
            ? `
              radial-gradient(circle at 20% 30%, rgba(16,185,129,0.12), transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(15,23,42,0.05), transparent 40%),
              linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)
            `
            : `
              radial-gradient(circle at 20% 30%, rgba(0,122,255,0.10), transparent 55%),
              radial-gradient(circle at 80% 70%, rgba(15,23,42,0.06), transparent 40%),
              linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)
            `,
          zIndex: 0,
        }} />

        {/* Decorative grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(15,23,42,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.025) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 80%)',
          zIndex: 1,
        }} />

        {/* Gradient transition to right (seamless blend) */}
        <div style={{
          position: 'absolute',
          top: 0, right: -1, bottom: 0, width: 120,
          background: 'linear-gradient(90deg, transparent 0%, #FFFFFF 100%)',
          zIndex: 2, pointerEvents: 'none',
        }} />

        {/* Logo top-left corner */}
        <div style={{ position: 'relative', zIndex: 3, marginBottom: 'auto' }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height: 22 }} />
        </div>

        {/* Centered content block */}
        <div style={{
          position: 'relative', zIndex: 3,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: 480,
          margin: 'auto 0',
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: isDev ? 'var(--green-dark)' : 'var(--blue)', letterSpacing: '0.1em', marginBottom: 14 }}>
            {isDev ? 'TEAM EXECUTION' : 'AI-NATIVE PLATFORM'}
          </p>
          <h2 style={{ fontSize: 36, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.9px', lineHeight: 1.1, marginBottom: 14 }}>
            {isDev ? 'Der Arbeitsplatz für Festag Experten.' : 'Software,\nverständlich gemacht.'}
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 36, maxWidth: 380 }}>
            {isDev
              ? 'Empfange AI-strukturierte Tasks. Liefere kontrolliert. Arbeite im System.'
              : 'AI plant. Menschen bauen. Ein System verbindet alles.'}
          </p>

          {/* 4 feature boxes — animated */}
          {!isDev && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 440 }}>
              {FEATURES.map((f, i) => {
                const isActive = i === activeFeature
                return (
                  <div key={f.key} style={{
                    background: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                    border: `1px solid ${isActive ? 'var(--text)' : 'var(--border)'}`,
                    borderRadius: 'var(--r)',
                    padding: '14px 16px',
                    animation: `slideUp 0.4s ${i * 0.08}s both`,
                    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: isActive ? 'translateX(4px)' : 'translateX(0)',
                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: isActive ? 'var(--green)' : 'var(--border-strong)',
                      flexShrink: 0,
                      transition: 'background 0.35s',
                      animation: isActive ? 'pulse 1.8s infinite' : 'none',
                    }} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 2 }}>{f.title}</p>
                      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {isDev && (
            <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 22, boxShadow: 'var(--shadow-sm)', maxWidth: 440 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.8s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', letterSpacing: '0.08em' }}>SYSTEM AKTIV</span>
              </div>
              {['Build SaaS Dashboard', 'Create AI Automation', 'Design Landing Page', 'Develop Mobile App'].map((t, i) => (
                <div key={t} style={{ padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text-muted)' }}>—</span>{t}
                </div>
              ))}
            </div>
          )}
        </div>

        <p style={{ position: 'relative', zIndex: 3, fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 'auto' }}>
          © 2026 FESTAG · AI-NATIVE SOFTWAREPRODUKTION
        </p>
      </div>

      {/* ═════ RIGHT SIDE — Form ═════ */}
      <div style={{ width: '100%', maxWidth: 480, padding: '28px 40px', paddingTop: 'calc(28px + env(safe-area-inset-top))', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 4, background: '#FFFFFF' }}>
        <button onClick={() => setPortal('select')} style={{
          background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 13,
          cursor: 'pointer', padding: 0, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 32,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          Zurück
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="show-mobile" style={{ marginBottom: 28 }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height: 20 }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: isDev ? 'var(--green-dark)' : 'var(--blue)', letterSpacing: '0.1em', marginBottom: 8 }}>
              {isDev ? 'DEVELOPER' : 'CLIENT'}
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.4px' }}>
              {mode === 'login' ? greeting.short : 'Konto erstellen'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {mode === 'login'
                ? (isDev ? 'Melde dich in deinem Developer Account an.' : greeting.full.replace(`${greeting.short} — `, ''))
                : (isDev ? 'Werde Teil des Festag Teams.' : 'Starte dein Projekt in weniger als 2 Minuten.')}
            </p>
          </div>

          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: 3, marginBottom: 22, gap: 2 }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} className="tap-scale" style={{
                flex: 1, padding: '9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: mode === m ? '#FFFFFF' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                fontSize: 13.5, fontWeight: mode === m ? 600 : 500,
                boxShadow: mode === m ? 'var(--shadow-xs)' : 'none',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}>
                {m === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          {mode === 'register' && (
            <>
              <label style={lbl}>Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Max Mustermann" style={inp} autoComplete="name"
                onKeyDown={e => e.key === 'Enter' && submit()} />
              <div style={{ height: 14 }} />
            </>
          )}

          <label style={lbl}>E-Mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="name@beispiel.de" style={inp} autoComplete="email" inputMode="email"
            onKeyDown={e => e.key === 'Enter' && submit()} />

          <label style={{ ...lbl, marginTop: 14 }}>Passwort</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" style={inp}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onKeyDown={e => e.key === 'Enter' && submit()} />

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--red-bg)', border: '1px solid #FECACA', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--red)' }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={loading} className="tap-scale" style={{
            marginTop: 20, width: '100%', padding: '13px', borderRadius: 'var(--r-sm)', border: 'none',
            background: loading ? 'var(--surface-2)' : 'var(--text)',
            color: loading ? 'var(--text-muted)' : '#FFFFFF',
            fontSize: 14.5, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            minHeight: 46, fontFamily: 'inherit',
          }}>
            {loading ? (
              <>
                <span style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Einen Moment…
              </>
            ) : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            {mode === 'login' ? 'Noch kein Konto? ' : 'Bereits registriert? '}
            <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={{ color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>
              {mode === 'login' ? 'Registrieren' : 'Anmelden'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }
const inp: React.CSSProperties = {
  width: '100%', padding: '12px 14px', background: '#FFFFFF',
  border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  fontSize: 15, outline: 'none', color: 'var(--text)',
  boxSizing: 'border-box' as const, transition: 'all 0.15s', minHeight: 46,
  fontFamily: 'inherit',
}
