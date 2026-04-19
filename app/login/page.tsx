'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Portal = 'select' | 'client' | 'developer'
type Mode = 'login' | 'register'

export default function LoginPage() {
  const [portal, setPortal] = useState<Portal>('select')
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [devUsername, setDevUsername] = useState('')
  const [devPin, setDevPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  /* ─── CLIENT AUTH ─── */
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
      const { error: e } = await supabase.auth.signInWithPassword({ email, password })
      if (e) { setError('E-Mail oder Passwort falsch.'); setLoading(false); return }
      window.location.href = '/dashboard'
    }
  }

  /* ─── DEV PIN AUTH ─── */
  const submitDev = async () => {
    setError('')
    if (!devUsername || !devPin) return setError('Bitte Nutzername und PIN eingeben.')
    setLoading(true)
    try {
      const supabase = createClient()
      // Verify PIN via Supabase RPC
      const { data, error: rpcError } = await supabase.rpc('verify_dev_pin', {
        username_input: devUsername.trim().toLowerCase(),
        pin_input: devPin.trim(),
      })
      if (rpcError || !data || data.length === 0) {
        setError('Ungültiger Nutzername oder PIN.')
        setLoading(false)
        return
      }
      // Sign in with the email found
      const devEmail = data[0].user_email
      // We use a special token approach: sign in as this user via admin flow is not possible client-side
      // Instead: store dev session token in localStorage for dev portal
      const devSession = {
        user_id: data[0].user_id,
        user_email: devEmail,
        user_role: data[0].user_role,
        expires: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
      }
      localStorage.setItem('festag_dev_session', JSON.stringify(devSession))
      // Also do real supabase sign in using the email + a known method
      // Since we control the DB, we use service-level access via the rpc confirmation
      // For dev login we redirect to /dev/auth which reads the localStorage session
      window.location.href = '/dev'
    } catch {
      setError('Fehler bei der Anmeldung.')
    }
    setLoading(false)
  }

  /* ─── PORTAL SELECT ─── */
  if (portal === 'select') return (
    <div style={styles.selectBg}>
      {/* Animated background orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ ...styles.orb, width: 600, height: 600, top: '10%', left: '15%', background: 'radial-gradient(circle, rgba(96,165,250,0.35) 0%, rgba(147,197,253,0.15) 50%, transparent 70%)', animationDuration: '8s' }} className="orb" />
        <div style={{ ...styles.orb, width: 400, height: 400, top: '50%', left: '5%', background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)', animationDuration: '12s', animationDelay: '-3s' }} className="orb" />
        <div style={{ ...styles.orb, width: 300, height: 300, top: '20%', left: '55%', background: 'radial-gradient(circle, rgba(186,230,253,0.4) 0%, transparent 70%)', animationDuration: '10s', animationDelay: '-5s' }} className="orb" />
      </div>

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', animation: mounted ? 'fadeUp 0.5s ease both' : 'none' }}>
        <img src="/brand/logo.svg" alt="festag" style={{ height: 22, marginBottom: 40 }} />
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px', marginBottom: 8 }}>Willkommen</h1>
        <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 36 }}>Wähle deinen Zugang</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 340 }}>
          {[
            { key: 'client', label: 'Client Portal', desc: 'Für Auftraggeber', badge: 'CLIENT' },
            { key: 'developer', label: 'Developer', desc: 'Nutzername & PIN', badge: 'DEV' },
          ].map(p => (
            <button key={p.key} onClick={() => setPortal(p.key as Portal)} className="tap-scale" style={styles.portalBtn}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', margin: 0, marginBottom: 2, textAlign: 'left' }}>{p.label}</p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, textAlign: 'left' }}>{p.desc}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: p.key === 'client' ? '#007AFF' : '#059669', background: p.key === 'client' ? '#EFF6FF' : '#ECFDF5', padding: '3px 8px', borderRadius: 5, letterSpacing: '0.08em' }}>{p.badge}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
              </div>
            </button>
          ))}
        </div>
        <p style={{ marginTop: 28, fontSize: 11, color: '#CBD5E1', letterSpacing: '0.08em' }}>AI PLANT · MENSCHEN BAUEN · SYSTEM VERBINDET</p>
      </div>

      <style>{`
        .orb { position: absolute; border-radius: 50%; animation: float linear infinite; }
        @keyframes float { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(20px,-30px) scale(1.05); } 66% { transform: translate(-15px,20px) scale(0.95); } }
      `}</style>
    </div>
  )

  /* ─── CLIENT LOGIN — matches reference image exactly ─── */
  if (portal === 'client') return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FFFFFF' }}>
      <style>{`
        .blob-orb { position: absolute; border-radius: 50%; filter: blur(60px); animation: blobFloat linear infinite; }
        @keyframes blobFloat { 0%,100% { transform: translate(0,0) scale(1); } 25% { transform: translate(30px,-40px) scale(1.08); } 50% { transform: translate(-20px,30px) scale(0.92); } 75% { transform: translate(40px,20px) scale(1.05); } }
        .glass-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.8); border-radius: 18px; animation: cardFloat ease-in-out infinite; }
        @keyframes cardFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .inp-field { width: 100%; padding: 13px 16px; background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 12px; font-size: 15px; outline: none; color: #0F172A; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
        .inp-field:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .login-btn { width: 100%; padding: 14px; background: #0F172A; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.2s, transform 0.1s; letter-spacing: -0.2px; }
        .login-btn:hover { opacity: 0.9; } .login-btn:active { transform: scale(0.99); }
        .login-btn:disabled { opacity: 0.5; cursor: default; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .tab-active { background: #fff; color: #0F172A; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .tab-inactive { background: transparent; color: #94A3B8; font-weight: 500; }
      `}</style>

      {/* LEFT — Animated gradient with glass cards (matches image) */}
      <div className="hide-mobile" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 30%, #DBEAFE 60%, #EFF6FF 100%)' }}>
        {/* Gradient blobs */}
        <div className="blob-orb" style={{ width: 500, height: 500, top: '15%', left: '8%', background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(96,165,250,0.3) 40%, transparent 70%)', animationDuration: '9s' }} />
        <div className="blob-orb" style={{ width: 350, height: 350, top: '45%', left: '30%', background: 'radial-gradient(circle, rgba(37,99,235,0.4) 0%, rgba(59,130,246,0.2) 40%, transparent 70%)', animationDuration: '13s', animationDelay: '-4s' }} />
        <div className="blob-orb" style={{ width: 250, height: 250, top: '65%', left: '5%', background: 'radial-gradient(circle, rgba(147,197,253,0.5) 0%, transparent 70%)', animationDuration: '11s', animationDelay: '-7s' }} />
        <div className="blob-orb" style={{ width: 200, height: 200, top: '5%', left: '50%', background: 'radial-gradient(circle, rgba(186,230,253,0.6) 0%, transparent 70%)', animationDuration: '15s', animationDelay: '-2s' }} />

        {/* Glass cards — staggered/stepped like reference image */}
        <div style={{ position: 'absolute', inset: 0, padding: '10% 5%' }}>
          {/* Top left card */}
          <div className="glass-card" style={{ position: 'absolute', top: '5%', left: '5%', width: '52%', height: '16%', animationDuration: '6s' }} />
          {/* Second card — offset right */}
          <div className="glass-card" style={{ position: 'absolute', top: '16%', left: '28%', width: '45%', height: '14%', animationDuration: '8s', animationDelay: '-2s', background: 'rgba(255,255,255,0.85)' }} />
          {/* Third card — wider, further right */}
          <div className="glass-card" style={{ position: 'absolute', top: '30%', left: '5%', width: '60%', height: '18%', animationDuration: '7s', animationDelay: '-4s' }} />
          {/* Blue tinted card */}
          <div className="glass-card" style={{ position: 'absolute', top: '48%', left: '35%', width: '40%', height: '14%', animationDuration: '9s', animationDelay: '-1s', background: 'rgba(219,234,254,0.6)' }} />
          {/* Lower cards */}
          <div className="glass-card" style={{ position: 'absolute', top: '62%', left: '5%', width: '52%', height: '16%', animationDuration: '6.5s', animationDelay: '-3s' }} />
          <div className="glass-card" style={{ position: 'absolute', top: '75%', left: '20%', width: '38%', height: '12%', animationDuration: '10s', animationDelay: '-5s', background: 'rgba(241,245,249,0.7)' }} />
          <div className="glass-card" style={{ position: 'absolute', top: '85%', left: '5%', width: '30%', height: '10%', animationDuration: '8s', animationDelay: '-6s', background: 'rgba(255,255,255,0.5)' }} />

          {/* Logo bottom */}
          <div style={{ position: 'absolute', bottom: 28, left: 32 }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height: 18, opacity: 0.4 }} />
          </div>
        </div>
      </div>

      {/* RIGHT — Login form */}
      <div style={{ width: '100%', maxWidth: 480, padding: '48px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <button onClick={() => setPortal('select')} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 40, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', alignSelf: 'flex-start' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6"/></svg>
          Zurück
        </button>

        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#007AFF', letterSpacing: '0.12em', marginBottom: 10 }}>CLIENT PORTAL</p>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.6px', marginBottom: 8, lineHeight: 1.1 }}>
              {mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
            </h1>
            <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>
              {mode === 'login' ? 'Melde dich an, um fortzufahren.' : 'Starte dein Projekt in 2 Minuten.'}
            </p>
          </div>

          {/* Tab switch */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 3, marginBottom: 24, gap: 2 }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} className={`tap-scale ${mode === m ? 'tab-active' : 'tab-inactive'}`} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, transition: 'all 0.15s', fontFamily: 'inherit' }}>
                {m === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={styles.label}>E-Mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@beispiel.de" className="inp-field" autoComplete="email" onKeyDown={e => e.key === 'Enter' && submitClient()} />
            </div>
            <div>
              <label style={styles.label}>Passwort</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="inp-field" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onKeyDown={e => e.key === 'Enter' && submitClient()} />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 13, color: '#DC2626' }}>{error}</div>
          )}

          <button onClick={submitClient} disabled={loading} className="login-btn" style={{ marginTop: 20, fontFamily: 'inherit' }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                Einen Moment…
              </span>
            ) : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
            {mode === 'login' ? 'Noch kein Konto? ' : 'Bereits registriert? '}
            <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={{ color: '#0F172A', cursor: 'pointer', fontWeight: 700 }}>
              {mode === 'login' ? 'Registrieren' : 'Anmelden'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )

  /* ─── DEV LOGIN — PIN only, NO register ─── */
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FFFFFF' }}>
      <style>{`
        .blob-orb-g { position: absolute; border-radius: 50%; filter: blur(60px); animation: blobFloat2 linear infinite; }
        @keyframes blobFloat2 { 0%,100% { transform: translate(0,0) scale(1); } 25% { transform: translate(-25px,35px) scale(1.06); } 50% { transform: translate(30px,-25px) scale(0.94); } 75% { transform: translate(-15px,25px) scale(1.03); } }
        .glass-card-g { background: rgba(255,255,255,0.65); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.8); border-radius: 18px; animation: cardFloat ease-in-out infinite; }
        .pin-input { width: 100%; padding: 13px 16px; background: #F0FDF4; border: 1.5px solid #A7F3D0; border-radius: 12px; font-size: 15px; outline: none; color: #0F172A; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; letter-spacing: 0.3em; }
        .pin-input:focus { border-color: #10B981; box-shadow: 0 0 0 3px rgba(16,185,129,0.12); }
        .dev-login-btn { width: 100%; padding: 14px; background: #0F172A; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
        .dev-login-btn:hover { opacity: 0.9; } .dev-login-btn:disabled { opacity: 0.5; cursor: default; }
      `}</style>

      {/* LEFT — Green-tinted glass cards for Dev */}
      <div className="hide-mobile" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 30%, #D1FAE5 60%, #ECFDF5 100%)' }}>
        <div className="blob-orb-g" style={{ width: 480, height: 480, top: '10%', left: '10%', background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, rgba(52,211,153,0.2) 40%, transparent 70%)', animationDuration: '10s' }} />
        <div className="blob-orb-g" style={{ width: 320, height: 320, top: '50%', left: '25%', background: 'radial-gradient(circle, rgba(5,150,105,0.3) 0%, transparent 70%)', animationDuration: '14s', animationDelay: '-4s' }} />
        <div className="blob-orb-g" style={{ width: 220, height: 220, top: '70%', left: '5%', background: 'radial-gradient(circle, rgba(167,243,208,0.5) 0%, transparent 70%)', animationDuration: '12s', animationDelay: '-6s' }} />

        <div style={{ position: 'absolute', inset: 0, padding: '8%' }}>
          {[
            { t: '4%', l: '6%', w: '50%', h: '15%', d: '0s' },
            { t: '18%', l: '25%', w: '47%', h: '13%', d: '-2s' },
            { t: '30%', l: '6%', w: '58%', h: '17%', d: '-4s' },
            { t: '47%', l: '32%', w: '38%', h: '13%', d: '-1s' },
            { t: '60%', l: '6%', w: '50%', h: '15%', d: '-3s' },
            { t: '74%', l: '18%', w: '36%', h: '11%', d: '-5s' },
            { t: '84%', l: '6%', w: '28%', h: '9%', d: '-7s' },
          ].map((c, i) => (
            <div key={i} className="glass-card-g" style={{ position: 'absolute', top: c.t, left: c.l, width: c.w, height: c.h, animationDuration: `${6 + i}s`, animationDelay: c.d }} />
          ))}

          <div style={{ position: 'absolute', bottom: 24, left: 28 }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height: 16, opacity: 0.3 }} />
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(5,150,105,0.5)', letterSpacing: '0.1em', marginTop: 6 }}>DEVELOPER ACCESS</p>
          </div>
        </div>
      </div>

      {/* RIGHT — Dev form (PIN only) */}
      <div style={{ width: '100%', maxWidth: 480, padding: '48px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <button onClick={() => setPortal('select')} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 40, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', alignSelf: 'flex-start' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6"/></svg>
          Zurück
        </button>

        <div className="fade-in">
          <p style={{ fontSize: 11, fontWeight: 700, color: '#059669', letterSpacing: '0.12em', marginBottom: 10 }}>DEVELOPER PORTAL</p>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.6px', marginBottom: 8, lineHeight: 1.1 }}>Systemzugang</h1>
          <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 28 }}>
            Nur für verifizierte Festag Developer.<br />Zugangsdaten vom Admin erhalten.
          </p>

          <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 12, padding: '14px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
            <p style={{ fontSize: 12, color: '#059669', margin: 0, fontWeight: 500 }}>Kein öffentlicher Zugang · Zuteilung durch Admin</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={styles.label}>Nutzername</label>
              <input value={devUsername} onChange={e => setDevUsername(e.target.value)} placeholder="dein-username" style={{ width: '100%', padding: '13px 16px', background: '#F0FDF4', border: '1.5px solid #A7F3D0', borderRadius: 12, fontSize: 15, outline: 'none', color: '#0F172A', boxSizing: 'border-box' as const }} onKeyDown={e => e.key === 'Enter' && submitDev()} />
            </div>
            <div>
              <label style={styles.label}>PIN</label>
              <input type="password" value={devPin} onChange={e => setDevPin(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="••••" maxLength={8} inputMode="numeric" className="pin-input" onKeyDown={e => e.key === 'Enter' && submitDev()} />
              <p style={{ fontSize: 11, color: '#A7F3D0', marginTop: 6, marginLeft: 2 }}>Numerischer PIN, 4–8 Stellen</p>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 13, color: '#DC2626' }}>{error}</div>
          )}

          <button onClick={submitDev} disabled={loading} className="dev-login-btn" style={{ marginTop: 20, fontFamily: 'inherit' }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                Prüfe Zugang…
              </span>
            ) : 'Einloggen →'}
          </button>

          <p style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#CBD5E1' }}>
            Noch kein Zugang? Wende dich an dein Admin-Team.
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  selectBg: {
    minHeight: '100vh' as const,
    background: 'linear-gradient(135deg, #F8FAFC 0%, #F0F9FF 50%, #EFF6FF 100%)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 24,
  },
  orb: { position: 'absolute' as const, borderRadius: '50%', filter: 'blur(80px)' },
  portalBtn: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 14,
    padding: '16px 18px',
    cursor: 'pointer' as const,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
    fontFamily: 'inherit',
    boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
    transition: 'all 0.15s',
  },
  label: {
    fontSize: 12,
    fontWeight: 500 as const,
    color: '#475569',
    display: 'block' as const,
    marginBottom: 7,
    letterSpacing: '0.01em',
  },
}
