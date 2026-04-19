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
      const devSession = {
        user_id: data[0].user_id,
        user_email: data[0].user_email,
        user_role: data[0].user_role,
        expires: Date.now() + 8 * 60 * 60 * 1000,
      }
      localStorage.setItem('festag_dev_session', JSON.stringify(devSession))
      window.location.href = '/dev'
    } catch {
      setError('Fehler bei der Anmeldung.')
    }
    setLoading(false)
  }

  /* ─── PORTAL SELECT ─── */
  if (portal === 'select') return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .select-wrap { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .portal-btn:hover { border-color: #CBD5E1 !important; background: #FAFAFA !important; }
        .portal-btn { transition: all 0.15s; }
      `}</style>
      <div className="select-wrap" style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <img src="/brand/logo.svg" alt="festag" style={{ height: 22, marginBottom: 44 }} />
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px', marginBottom: 6 }}>Willkommen</h1>
        <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 36 }}>Wähle deinen Zugang</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { key: 'client', label: 'Client Portal', desc: 'Für Auftraggeber', badge: 'CLIENT' },
            { key: 'developer', label: 'Developer', desc: 'Nutzername & PIN', badge: 'DEV' },
          ].map(p => (
            <button key={p.key} onClick={() => setPortal(p.key as Portal)}
              className="portal-btn"
              style={{
                background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14,
                padding: '16px 18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, fontFamily: 'inherit',
              }}>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{p.label}</p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{p.desc}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', background: '#F1F5F9', padding: '3px 8px', borderRadius: 5, letterSpacing: '0.08em' }}>{p.badge}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
              </div>
            </button>
          ))}
        </div>

        <p style={{ marginTop: 28, fontSize: 11, color: '#E2E8F0', letterSpacing: '0.08em' }}>AI PLANT · MENSCHEN BAUEN · SYSTEM VERBINDET</p>
      </div>
    </div>
  )

  /* ─── SHARED STYLES ─── */
  const isDev = portal === 'developer'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FFFFFF' }}>
      <style>{`
        /* === PIXEL/GRADIENT BOX EFFECT ===
           Boxes fade from solid white (right edge) to transparent (left)
           creating the "dissolving into gradient" look */
        @keyframes floatA { 0%,100%{transform:translateY(0) translateX(0);} 33%{transform:translateY(-10px) translateX(6px);} 66%{transform:translateY(6px) translateX(-8px);} }
        @keyframes floatB { 0%,100%{transform:translateY(0) translateX(0);} 40%{transform:translateY(8px) translateX(-5px);} 75%{transform:translateY(-8px) translateX(10px);} }
        @keyframes floatC { 0%,100%{transform:translateY(0) translateX(0);} 50%{transform:translateY(-6px) translateX(-10px);} }
        @keyframes blobDrift { 0%,100%{transform:translate(0,0) scale(1);} 30%{transform:translate(30px,-30px) scale(1.05);} 60%{transform:translate(-20px,25px) scale(0.95);} }
        
        /* Input style — clean gray, no color borders */
        .login-inp {
          width: 100%;
          padding: 12px 14px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          font-size: 15px;
          outline: none;
          color: #0F172A;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
          font-family: inherit;
        }
        .login-inp:focus {
          border-color: #CBD5E1;
          box-shadow: 0 0 0 3px rgba(15,23,42,0.04);
          background: #FFFFFF;
        }
        .login-inp::placeholder { color: #CBD5E1; }
        
        .submit-btn {
          width: 100%;
          padding: 13px;
          background: #0F172A;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: -0.1px;
          transition: opacity 0.15s;
          font-family: inherit;
        }
        .submit-btn:hover { opacity: 0.88; }
        .submit-btn:active { opacity: 0.8; transform: scale(0.99); }
        .submit-btn:disabled { opacity: 0.45; cursor: default; }

        .tab-seg { display:flex; background:#F1F5F9; border-radius:9px; padding:3px; gap:2px; margin-bottom:22px; }
        .tab-seg button { flex:1; padding:9px; border-radius:7px; border:none; cursor:pointer; font-size:13px; font-family:inherit; transition:all 0.12s; }
        .tab-active-btn { background:#FFF; color:#0F172A; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,0.07); }
        .tab-inactive-btn { background:transparent; color:#94A3B8; font-weight:400; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        .form-in { animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ════ LEFT — Pixel/Gradient boxes ════ */}
      <div className="hide-mobile" style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        /* Base gradient that the boxes dissolve into */
        background: isDev
          ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 40%, #D1FAE5 70%, #ECFDF5 100%)'
          : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 40%, #BFDBFE 70%, #EFF6FF 100%)',
      }}>
        {/* Soft blur blobs behind everything */}
        <div style={{
          position:'absolute', width:500, height:500,
          top:'5%', left:'5%',
          borderRadius:'50%',
          filter:'blur(80px)',
          background: isDev
            ? 'radial-gradient(circle, rgba(34,197,94,0.25) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)',
          animation:'blobDrift 12s ease-in-out infinite',
        }}/>
        <div style={{
          position:'absolute', width:360, height:360,
          bottom:'10%', right:'10%',
          borderRadius:'50%',
          filter:'blur(70px)',
          background: isDev
            ? 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(96,165,250,0.2) 0%, transparent 70%)',
          animation:'blobDrift 16s ease-in-out infinite reverse',
        }}/>

        {/* ── GRADIENT BOXES
            Each box: left edge transparent → right edge solid white
            This creates the "pixel dissolve" / "emerging from gradient" effect ── */}
        {[
          /* [top%, left%, width%, height%, animClass, animDuration, animDelay] */
          [4,  5,  52, 13, 'floatA', '7s',  '0s'],
          [15, 28, 44, 12, 'floatB', '9s',  '-2s'],
          [27, 5,  58, 15, 'floatC', '8s',  '-4s'],
          [43, 33, 42, 12, 'floatA', '10s', '-1s'],
          [57, 5,  50, 14, 'floatB', '7.5s','-3s'],
          [70, 18, 38, 11, 'floatC', '9.5s','-5s'],
          [80, 5,  30, 10, 'floatA', '8.5s','-6s'],
          [88, 22, 36, 9,  'floatB', '11s', '-7s'],
        ].map(([t, l, w, h, anim, dur, delay], i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `${t}%`, left: `${l}%`,
            width: `${w}%`, height: `${h}%`,
            borderRadius: 18,
            /* KEY EFFECT: gradient from transparent (left) to white (right)
               This makes boxes look like they're "dissolving" from the gradient bg */
            background: `linear-gradient(90deg,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,0.3) 20%,
              rgba(255,255,255,0.65) 55%,
              rgba(255,255,255,0.88) 80%,
              rgba(255,255,255,0.95) 100%
            )`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.6)',
            borderLeft: 'none',
            animation: `${anim} ${dur} ${delay} ease-in-out infinite`,
          }} />
        ))}

        {/* Logo bottom left */}
        <div style={{ position:'absolute', bottom:28, left:32 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:16, opacity:0.3 }} />
        </div>
      </div>

      {/* ════ RIGHT — Form ════ */}
      <div style={{
        width:'100%', maxWidth:460,
        padding:'0 48px',
        display:'flex', flexDirection:'column', justifyContent:'center',
        minHeight:'100vh',
      }}>
        {/* Back */}
        <button onClick={() => setPortal('select')} style={{
          background:'transparent', border:'none', color:'#94A3B8',
          fontSize:13, cursor:'pointer', padding:0,
          display:'flex', alignItems:'center', gap:5,
          fontFamily:'inherit', position:'absolute', top:32,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6"/></svg>
          Zurück
        </button>

        <div className="form-in">
          {/* Badge + Headline */}
          <div style={{ marginBottom:24 }}>
            <p style={{
              fontSize:11, fontWeight:700, letterSpacing:'0.12em', marginBottom:10,
              color: isDev ? '#059669' : '#007AFF',
            }}>
              {isDev ? 'DEVELOPER PORTAL' : 'CLIENT PORTAL'}
            </p>
            <h1 style={{ fontSize:30, fontWeight:700, color:'#0F172A', letterSpacing:'-0.6px', lineHeight:1.1, marginBottom:8 }}>
              {isDev ? 'Systemzugang' : (mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen')}
            </h1>
            <p style={{ fontSize:14, color:'#94A3B8', margin:0 }}>
              {isDev
                ? 'Nur für verifizierte Festag Developer.\nZugangsdaten vom Admin erhalten.'
                : (mode === 'login' ? 'Melde dich an, um fortzufahren.' : 'Starte dein Projekt in 2 Minuten.')}
            </p>
          </div>

          {/* ── CLIENT FORM ── */}
          {!isDev && (
            <>
              {/* Tab toggle */}
              <div className="tab-seg">
                {(['login','register'] as const).map(m => (
                  <button key={m}
                    onClick={() => { setMode(m); setError('') }}
                    className={mode === m ? 'tab-active-btn' : 'tab-inactive-btn'}
                  >
                    {m === 'login' ? 'Anmelden' : 'Registrieren'}
                  </button>
                ))}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={lbl}>E-Mail</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder="name@beispiel.de" className="login-inp"
                    autoComplete="email"
                    onKeyDown={e=>e.key==='Enter'&&submitClient()} />
                </div>
                <div>
                  <label style={lbl}>Passwort</label>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder="••••••••" className="login-inp"
                    autoComplete={mode==='login'?'current-password':'new-password'}
                    onKeyDown={e=>e.key==='Enter'&&submitClient()} />
                </div>
              </div>

              {error && <div style={errStyle}>{error}</div>}

              <button onClick={submitClient} disabled={loading} className="submit-btn" style={{ marginTop:18 }}>
                {loading
                  ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                      <span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/>
                      Einen Moment…
                    </span>
                  : mode==='login' ? 'Anmelden' : 'Konto erstellen'}
              </button>

              <p style={{ marginTop:18, textAlign:'center', fontSize:13, color:'#94A3B8' }}>
                {mode==='login' ? 'Noch kein Konto? ' : 'Bereits registriert? '}
                <span onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}
                  style={{color:'#0F172A', cursor:'pointer', fontWeight:700}}>
                  {mode==='login' ? 'Registrieren' : 'Anmelden'}
                </span>
              </p>
            </>
          )}

          {/* ── DEV FORM ── */}
          {isDev && (
            <>
              {/* Info chip — gray like everything else */}
              <div style={{
                background:'#F8FAFC', border:'1px solid #E2E8F0',
                borderRadius:10, padding:'11px 14px', marginBottom:20,
                display:'flex', alignItems:'center', gap:8,
              }}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#10B981',animation:'pulse 2s infinite',flexShrink:0}}/>
                <p style={{fontSize:12,color:'#475569',margin:0}}>Kein öffentlicher Zugang · Zuteilung durch Admin</p>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={lbl}>Nutzername</label>
                  <input value={devUsername} onChange={e=>setDevUsername(e.target.value)}
                    placeholder="dein-username" className="login-inp"
                    autoComplete="username"
                    onKeyDown={e=>e.key==='Enter'&&submitDev()} />
                </div>
                <div>
                  <label style={lbl}>PIN</label>
                  <input type="password" value={devPin}
                    onChange={e=>setDevPin(e.target.value.replace(/\D/g,'').slice(0,8))}
                    placeholder="••••" maxLength={8} inputMode="numeric" className="login-inp"
                    onKeyDown={e=>e.key==='Enter'&&submitDev()} />
                  <p style={{fontSize:11,color:'#CBD5E1',marginTop:5,marginLeft:2}}>Numerischer PIN, 4–8 Stellen</p>
                </div>
              </div>

              {error && <div style={errStyle}>{error}</div>}

              <button onClick={submitDev} disabled={loading} className="submit-btn" style={{ marginTop:18 }}>
                {loading
                  ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                      <span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/>
                      Prüfe Zugang…
                    </span>
                  : 'Einloggen →'}
              </button>

              <p style={{ marginTop:14, textAlign:'center', fontSize:12, color:'#CBD5E1' }}>
                Noch kein Zugang? Wende dich an dein Admin-Team.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: '#64748B',
  display: 'block', marginBottom: 6,
}

const errStyle: React.CSSProperties = {
  marginTop: 12, padding: '10px 14px',
  background: '#FEF2F2', border: '1px solid #FECACA',
  borderRadius: 9, fontSize: 13, color: '#DC2626',
}
