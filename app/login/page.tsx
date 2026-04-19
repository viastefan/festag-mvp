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
      localStorage.setItem('festag_dev_session', JSON.stringify({
        user_id: data[0].user_id,
        user_email: data[0].user_email,
        user_role: data[0].user_role,
        expires: Date.now() + 8 * 60 * 60 * 1000,
      }))
      window.location.href = '/dev'
    } catch {
      setError('Fehler bei der Anmeldung.')
    }
    setLoading(false)
  }

  /* ─── PORTAL SELECT ─── */
  if (portal === 'select') return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .sel-in { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .portal-btn { background:#FFF; border:1px solid #E2E8F0; border-radius:14px; padding:16px 18px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:12px; font-family:inherit; transition:all 0.12s; }
        .portal-btn:hover { border-color:#CBD5E1; background:#FAFAFA; }
      `}</style>
      <div className="sel-in" style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <img src="/brand/logo.svg" alt="festag" style={{ height: 22, marginBottom: 44 }} />
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px', marginBottom: 6 }}>Willkommen</h1>
        <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 36 }}>Wähle deinen Zugang</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { key: 'client',    label: 'Client Portal',    desc: 'Für Auftraggeber', badge: 'CLIENT' },
            { key: 'developer', label: 'Developer',        desc: 'Nutzername & PIN',  badge: 'DEV' },
          ].map(p => (
            <button key={p.key} onClick={() => setPortal(p.key as Portal)} className="portal-btn">
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

  const isDev = portal === 'developer'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FFFFFF' }}>
      <style>{`
        /* Floating blob animations */
        @keyframes b1 { 0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(28px,-35px) scale(1.06);}66%{transform:translate(-18px,25px) scale(0.94);} }
        @keyframes b2 { 0%,100%{transform:translate(0,0) scale(1);}40%{transform:translate(-25px,30px) scale(1.04);}75%{transform:translate(30px,-20px) scale(0.96);} }
        @keyframes b3 { 0%,100%{transform:translate(0,0);}50%{transform:translate(-15px,-20px);} }
        /* Card float */
        @keyframes cf1 { 0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);} }
        @keyframes cf2 { 0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);} }
        @keyframes cf3 { 0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);} }
        /* Input styles — gray only */
        .l-inp { width:100%; padding:11px 14px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:9px; font-size:15px; outline:none; color:#0F172A; box-sizing:border-box; transition:border-color 0.15s, box-shadow 0.15s; font-family:inherit; }
        .l-inp:focus { border-color:#CBD5E1; box-shadow:0 0 0 3px rgba(15,23,42,0.04); background:#FFF; }
        .l-inp::placeholder { color:#CBD5E1; }
        .l-btn { width:100%; padding:13px; background:#0F172A; color:#fff; border:none; border-radius:9px; font-size:15px; font-weight:600; cursor:pointer; font-family:inherit; transition:opacity 0.15s; }
        .l-btn:hover { opacity:0.88; } .l-btn:disabled { opacity:0.45; cursor:default; }
        .l-tabs { display:flex; background:#F1F5F9; border-radius:9px; padding:3px; gap:2px; margin-bottom:22px; }
        .l-tabs button { flex:1; padding:9px; border-radius:7px; border:none; cursor:pointer; font-size:13px; font-family:inherit; transition:all 0.12s; }
        .l-tab-on  { background:#FFF; color:#0F172A; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,0.07); }
        .l-tab-off { background:transparent; color:#94A3B8; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        .form-fade { animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes spin { to{transform:rotate(360deg);} }
      `}</style>

      {/* ═══ LEFT — Gradient with animated glass boxes ═══ */}
      <div className="hide-mobile" style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: isDev
          ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 35%, #D1FAE5 65%, #ECFDF5 100%)'
          : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 35%, #BFDBFE 65%, #EFF6FF 100%)',
      }}>
        {/* Blobs */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <div style={{ position:'absolute', width:480, height:480, top:'5%', left:'5%', borderRadius:'50%', filter:'blur(70px)', background: isDev ? 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(59,130,246,0.28) 0%, transparent 70%)', animation:'b1 11s ease-in-out infinite' }} />
          <div style={{ position:'absolute', width:320, height:320, bottom:'8%', right:'8%', borderRadius:'50%', filter:'blur(60px)', background: isDev ? 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(96,165,250,0.22) 0%, transparent 70%)', animation:'b2 15s ease-in-out infinite' }} />
          <div style={{ position:'absolute', width:200, height:200, top:'50%', left:'35%', borderRadius:'50%', filter:'blur(50px)', background: isDev ? 'radial-gradient(circle, rgba(167,243,208,0.3) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(186,230,253,0.3) 0%, transparent 70%)', animation:'b3 18s ease-in-out infinite' }} />
        </div>

        {/* Glass containers — step-ladder layout like reference image
            Key: gradient from transparent (left) → white (right) = pixel/dissolve effect */}
        <div style={{ position:'absolute', inset:0 }}>
          {[
            /* [top%, left%, width%, height%, animName, duration, delay] */
            [4,  4,  55, 13, 'cf1', '7s',  '0s'   ],
            [16, 22, 48, 12, 'cf2', '9s',  '-2.5s'],
            [28, 4,  62, 15, 'cf3', '8s',  '-4s'  ],
            [44, 30, 44, 12, 'cf1', '10s', '-1.5s'],
            [57, 4,  54, 13, 'cf2', '7.5s','-3s'  ],
            [70, 16, 40, 11, 'cf3', '9.5s','-5s'  ],
            [80, 4,  32, 10, 'cf1', '8.5s','-6s'  ],
            [89, 20, 38, 9,  'cf2', '11s', '-7s'  ],
          ].map(([t, l, w, h, anim, dur, delay], i) => (
            <div key={i} style={{
              position:'absolute',
              top: `${t}%`, left: `${l}%`,
              width:`${w}%`, height:`${h}%`,
              borderRadius: 18,
              /* Gradient from transparent (left edge) to solid white (right edge)
                 This creates the "emerging from gradient / pixel dissolve" effect */
              background: `linear-gradient(90deg,
                rgba(255,255,255,0)    0%,
                rgba(255,255,255,0.18) 15%,
                rgba(255,255,255,0.48) 40%,
                rgba(255,255,255,0.78) 70%,
                rgba(255,255,255,0.94) 90%,
                rgba(255,255,255,0.97) 100%)`,
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.55)',
              borderLeft: '1px solid rgba(255,255,255,0.15)',
              animation: `${anim} ${dur} ${delay} ease-in-out infinite`,
            }} />
          ))}
        </div>

        {/* Logo bottom */}
        <div style={{ position:'absolute', bottom:28, left:32 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:16, opacity:0.25 }} />
        </div>
      </div>

      {/* ═══ RIGHT — Form ═══ */}
      <div style={{ width:'100%', maxWidth:470, minHeight:'100vh', padding:'0 48px', display:'flex', flexDirection:'column', justifyContent:'center', position:'relative' }}>
        <button onClick={() => setPortal('select')} style={{ position:'absolute', top:36, left:48, background:'transparent', border:'none', color:'#94A3B8', fontSize:13, cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:5, fontFamily:'inherit' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6"/></svg>
          Zurück
        </button>

        <div className="form-fade">
          <div style={{ marginBottom:26 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', marginBottom:10, color: isDev ? '#059669' : '#007AFF' }}>
              {isDev ? 'DEVELOPER PORTAL' : 'CLIENT PORTAL'}
            </p>
            <h1 style={{ fontSize:30, fontWeight:700, color:'#0F172A', letterSpacing:'-0.6px', lineHeight:1.1, marginBottom:8 }}>
              {isDev ? 'Systemzugang' : (mode==='login' ? 'Willkommen zurück' : 'Konto erstellen')}
            </h1>
            <p style={{ fontSize:14, color:'#94A3B8', margin:0, lineHeight:1.5 }}>
              {isDev
                ? 'Nur für verifizierte Festag Developer.\nZugangsdaten vom Admin erhalten.'
                : (mode==='login' ? 'Melde dich an, um fortzufahren.' : 'Starte dein Projekt in 2 Minuten.')}
            </p>
          </div>

          {!isDev && (
            <>
              <div className="l-tabs">
                {(['login','register'] as const).map(m => (
                  <button key={m} onClick={() => { setMode(m); setError('') }} className={mode===m?'l-tab-on':'l-tab-off'}>
                    {m==='login' ? 'Anmelden' : 'Registrieren'}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={lbl}>E-Mail</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@beispiel.de" className="l-inp" autoComplete="email" onKeyDown={e=>e.key==='Enter'&&submitClient()} />
                </div>
                <div>
                  <label style={lbl}>Passwort</label>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="l-inp" autoComplete={mode==='login'?'current-password':'new-password'} onKeyDown={e=>e.key==='Enter'&&submitClient()} />
                </div>
              </div>
              {error && <div style={errBox}>{error}</div>}
              <button onClick={submitClient} disabled={loading} className="l-btn" style={{ marginTop:18 }}>
                {loading ? <Spinner /> : (mode==='login' ? 'Anmelden' : 'Konto erstellen')}
              </button>
              <p style={{ marginTop:18, textAlign:'center', fontSize:13, color:'#94A3B8' }}>
                {mode==='login' ? 'Noch kein Konto? ' : 'Bereits registriert? '}
                <span onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}} style={{color:'#0F172A',cursor:'pointer',fontWeight:700}}>
                  {mode==='login' ? 'Registrieren' : 'Anmelden'}
                </span>
              </p>
            </>
          )}

          {isDev && (
            <>
              {/* Status chip — gray */}
              <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:9, padding:'10px 14px', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#10B981', animation:'pulse 2s infinite', flexShrink:0 }} />
                <p style={{ fontSize:12, color:'#475569', margin:0 }}>Kein öffentlicher Zugang · Zuteilung durch Admin</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={lbl}>Nutzername</label>
                  <input value={devUsername} onChange={e=>setDevUsername(e.target.value)} placeholder="dein-username" className="l-inp" autoComplete="username" onKeyDown={e=>e.key==='Enter'&&submitDev()} />
                </div>
                <div>
                  <label style={lbl}>PIN</label>
                  <input type="password" value={devPin} onChange={e=>setDevPin(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="••••" maxLength={8} inputMode="numeric" className="l-inp" onKeyDown={e=>e.key==='Enter'&&submitDev()} />
                  <p style={{ fontSize:11, color:'#CBD5E1', marginTop:4 }}>Numerischer PIN, 4–8 Stellen</p>
                </div>
              </div>
              {error && <div style={errBox}>{error}</div>}
              <button onClick={submitDev} disabled={loading} className="l-btn" style={{ marginTop:18 }}>
                {loading ? <Spinner /> : 'Einloggen →'}
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

function Spinner() {
  return (
    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
      <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} />
      Einen Moment…
    </span>
  )
}

const lbl: React.CSSProperties = { fontSize:12, fontWeight:500, color:'#64748B', display:'block', marginBottom:6 }
const errBox: React.CSSProperties = { marginTop:12, padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:9, fontSize:13, color:'#DC2626' }
