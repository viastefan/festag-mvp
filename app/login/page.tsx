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
      setLoading(false)
    }
  }

  // ─── PORTAL SELECT ───
  if (portal === 'select') return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        .sel { animation: fadeUp .4s cubic-bezier(.16,1,.3,1) both; }
        .p-btn { background:#FFF; border:1px solid #E2E8F0; border-radius:12px; padding:14px 16px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:10px; font-family:inherit; transition:border-color .12s, background .12s; }
        .p-btn:hover { border-color:#CBD5E1; background:#FAFBFC; }
      `}</style>
      <div className="sel" style={{ width:'100%', maxWidth:380, textAlign:'center' }}>
        <img src="/brand/logo.svg" alt="festag" style={{ height:20, marginBottom:40 }} />
        <h1 style={{ fontSize:24, fontWeight:700, color:'#0F172A', letterSpacing:'-0.4px', marginBottom:6 }}>Willkommen</h1>
        <p style={{ fontSize:14, color:'#94A3B8', marginBottom:32 }}>Wähle deinen Zugang</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { key:'client',    label:'Client Portal',   desc:'Für Auftraggeber' },
            { key:'developer', label:'Developer',        desc:'Nutzername & PIN' },
          ].map(p => (
            <button key={p.key} onClick={() => setPortal(p.key as Portal)} className="p-btn">
              <div style={{ textAlign:'left' }}>
                <p style={{ fontSize:14, fontWeight:600, color:'#0F172A', margin:'0 0 1px' }}>{p.label}</p>
                <p style={{ fontSize:12, color:'#94A3B8', margin:0 }}>{p.desc}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          ))}
        </div>
        <p style={{ marginTop:24, fontSize:10, color:'#E2E8F0', letterSpacing:'0.08em' }}>AI PLANT · MENSCHEN BAUEN · SYSTEM VERBINDET</p>
      </div>
    </div>
  )

  const isDev = portal === 'developer'
  // accent color per portal
  const accent = isDev ? '#10B981' : '#3B82F6'
  const accentBg = isDev
    ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 40%, #D1FAE5 70%, #F0FDF4 100%)'
    : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 40%, #BFDBFE 70%, #EFF6FF 100%)'

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#FFFFFF' }}>
      <style>{`
        /* ── CONTAINERS: white semi-opaque boxes on gradient bg ── */
        .lcard {
          position: absolute;
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.85);
        }
        @keyframes fc1 { 0%,100%{transform:translateY(0);}   50%{transform:translateY(-9px);} }
        @keyframes fc2 { 0%,100%{transform:translateY(0);}   50%{transform:translateY(-6px);} }
        @keyframes fc3 { 0%,100%{transform:translateY(-3px);}50%{transform:translateY(6px);}  }
        @keyframes fc4 { 0%,100%{transform:translateY(2px);} 50%{transform:translateY(-7px);} }
        @keyframes fc5 { 0%,100%{transform:translateY(0);}   50%{transform:translateY(-5px);} }
        @keyframes fc6 { 0%,100%{transform:translateY(-2px);}50%{transform:translateY(8px);}  }
        /* Input styles — fine gray borders only */
        .l-inp {
          width:100%; padding:11px 13px;
          background:#F8FAFC;
          border:1px solid #E2E8F0;
          border-radius:9px;
          font-size:15px; outline:none; color:#0F172A;
          box-sizing:border-box; transition:border-color .15s, box-shadow .15s;
          font-family:inherit;
        }
        .l-inp:focus { border-color:#CBD5E1; box-shadow:0 0 0 3px rgba(15,23,42,.04); background:#FFF; }
        .l-inp::placeholder { color:#CBD5E1; }
        /* Tab segmented control */
        .l-seg { display:flex; background:#F1F5F9; border-radius:9px; padding:3px; gap:2px; margin-bottom:20px; }
        .l-seg button { flex:1; padding:8px; border-radius:7px; border:none; cursor:pointer; font-size:13px; font-family:inherit; transition:all .12s; }
        .l-seg-on  { background:#FFF; color:#0F172A; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.07); }
        .l-seg-off { background:transparent; color:#94A3B8; }
        /* Primary button */
        .l-btn {
          width:100%; padding:12px;
          background:#0F172A; color:#FFF;
          border:none; border-radius:9px;
          font-size:15px; font-weight:600; cursor:pointer;
          font-family:inherit; transition:opacity .15s;
        }
        .l-btn:hover { opacity:.88; } .l-btn:disabled { opacity:.4; cursor:default; }
        .l-btn:active { transform:scale(.99); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        .fade-form { animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both; }
        @keyframes spin { to{transform:rotate(360deg);} }
        /* Divider line between columns */
        .col-divider { width:1px; background:#F1F5F9; flex-shrink:0; }
      `}</style>

      {/* ══════════════════════════════════════════
          LEFT — gradient background + floating containers
      ══════════════════════════════════════════ */}
      <div className="hide-mobile" style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: accentBg,
      }}>
        {/* Logo top-left */}
        <div style={{ position:'absolute', top:28, left:32, zIndex:2 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:18, opacity:.35 }} />
        </div>

        {/* Floating white containers — step-ladder layout */}
        {/* Row 1 */}
        <div className="lcard" style={{ top:'6%',  left:'5%',  width:'55%', height:'13%', animation:'fc1 7s ease-in-out infinite' }} />
        <div className="lcard" style={{ top:'6%',  left:'63%', width:'30%', height:'13%', animation:'fc2 9s ease-in-out infinite' }} />
        {/* Row 2 — offset right */}
        <div className="lcard" style={{ top:'22%', left:'20%', width:'45%', height:'12%', animation:'fc3 8s ease-in-out -.5s infinite' }} />
        <div className="lcard" style={{ top:'22%', left:'68%', width:'25%', height:'12%', animation:'fc4 10s ease-in-out -1s infinite' }} />
        {/* Row 3 — back left */}
        <div className="lcard" style={{ top:'37%', left:'5%',  width:'60%', height:'14%', animation:'fc1 7.5s ease-in-out -2s infinite' }} />
        {/* Row 4 — offset */}
        <div className="lcard" style={{ top:'54%', left:'28%', width:'42%', height:'12%', animation:'fc5 9s ease-in-out -3s infinite' }} />
        <div className="lcard" style={{ top:'54%', left:'73%', width:'20%', height:'12%', animation:'fc2 11s ease-in-out -.5s infinite' }} />
        {/* Row 5 */}
        <div className="lcard" style={{ top:'69%', left:'5%',  width:'52%', height:'13%', animation:'fc6 8s ease-in-out -4s infinite' }} />
        {/* Row 6 */}
        <div className="lcard" style={{ top:'85%', left:'15%', width:'38%', height:'11%', animation:'fc3 7s ease-in-out -1s infinite' }} />
        <div className="lcard" style={{ top:'85%', left:'56%', width:'32%', height:'11%', animation:'fc5 9.5s ease-in-out -2s infinite' }} />
      </div>

      {/* Thin divider line */}
      <div className="col-divider hide-mobile" />

      {/* ══════════════════════════════════════════
          RIGHT — login form
      ══════════════════════════════════════════ */}
      <div style={{
        width:'100%', maxWidth:460,
        padding:'0 44px',
        display:'flex', flexDirection:'column', justifyContent:'center',
        minHeight:'100vh', position:'relative',
      }}>
        {/* Back button */}
        <button onClick={() => setPortal('select')} style={{
          position:'absolute', top:32, left:44,
          background:'transparent', border:'none',
          color:'#94A3B8', fontSize:13, cursor:'pointer',
          display:'flex', alignItems:'center', gap:4, fontFamily:'inherit', padding:0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6"/></svg>
          Zurück
        </button>

        <div className="fade-form">
          {/* Portal label + headline */}
          <p style={{ fontSize:11, fontWeight:700, color: accent, letterSpacing:'0.1em', marginBottom:8 }}>
            {isDev ? 'DEVELOPER PORTAL' : 'CLIENT PORTAL'}
          </p>
          <h1 style={{ fontSize:28, fontWeight:700, color:'#0F172A', letterSpacing:'-0.5px', lineHeight:1.1, marginBottom:8 }}>
            {isDev ? 'Systemzugang' : (mode==='login' ? 'Willkommen zurück' : 'Konto erstellen')}
          </h1>
          <p style={{ fontSize:14, color:'#94A3B8', marginBottom:24, lineHeight:1.5 }}>
            {isDev
              ? 'Nur für verifizierte Festag Developer.\nZugangsdaten vom Admin erhalten.'
              : (mode==='login' ? 'Melde dich an, um fortzufahren.' : 'Starte dein Projekt in 2 Minuten.')}
          </p>

          {/* ── CLIENT FORM ── */}
          {!isDev && (
            <>
              <div className="l-seg">
                {(['login','register'] as const).map(m => (
                  <button key={m} onClick={() => { setMode(m); setError('') }} className={mode===m?'l-seg-on':'l-seg-off'}>
                    {m==='login' ? 'Anmelden' : 'Registrieren'}
                  </button>
                ))}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label style={lbl}>E-Mail</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder="name@beispiel.de" className="l-inp" autoComplete="email"
                    onKeyDown={e=>e.key==='Enter'&&submitClient()} />
                </div>
                <div>
                  <label style={lbl}>Passwort</label>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder="••••••••" className="l-inp"
                    autoComplete={mode==='login'?'current-password':'new-password'}
                    onKeyDown={e=>e.key==='Enter'&&submitClient()} />
                </div>
              </div>
              {error && <div style={errStyle}>{error}</div>}
              <button onClick={submitClient} disabled={loading} className="l-btn" style={{ marginTop:18 }}>
                {loading ? <SpinBtn /> : (mode==='login' ? 'Anmelden' : 'Konto erstellen')}
              </button>
              <p style={{ marginTop:16, textAlign:'center', fontSize:13, color:'#94A3B8' }}>
                {mode==='login' ? 'Noch kein Konto? ' : 'Bereits registriert? '}
                <span onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}
                  style={{ color:'#0F172A', cursor:'pointer', fontWeight:700 }}>
                  {mode==='login' ? 'Registrieren' : 'Anmelden'}
                </span>
              </p>
            </>
          )}

          {/* ── DEV FORM ── */}
          {isDev && (
            <>
              <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:9, padding:'10px 13px', marginBottom:18, display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#10B981', animation:'pulse 2s infinite', flexShrink:0 }} />
                <p style={{ fontSize:12, color:'#475569', margin:0 }}>Kein öffentlicher Zugang · Zuteilung durch Admin</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label style={lbl}>Nutzername</label>
                  <input value={devUsername} onChange={e=>setDevUsername(e.target.value)}
                    placeholder="dein-username" className="l-inp" autoComplete="username"
                    onKeyDown={e=>e.key==='Enter'&&submitDev()} />
                </div>
                <div>
                  <label style={lbl}>PIN</label>
                  <input type="password" value={devPin}
                    onChange={e=>setDevPin(e.target.value.replace(/\D/g,'').slice(0,8))}
                    placeholder="••••" maxLength={8} inputMode="numeric" className="l-inp"
                    onKeyDown={e=>e.key==='Enter'&&submitDev()} />
                  <p style={{ fontSize:11, color:'#CBD5E1', marginTop:4 }}>Numerischer PIN, 4–8 Stellen</p>
                </div>
              </div>
              {error && <div style={errStyle}>{error}</div>}
              <button onClick={submitDev} disabled={loading} className="l-btn" style={{ marginTop:18 }}>
                {loading ? <SpinBtn /> : 'Einloggen →'}
              </button>
              <p style={{ marginTop:12, textAlign:'center', fontSize:12, color:'#CBD5E1' }}>
                Noch kein Zugang? Wende dich an dein Admin-Team.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SpinBtn() {
  return (
    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
      <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin .7s linear infinite' }} />
      Einen Moment…
    </span>
  )
}

const lbl: React.CSSProperties = { fontSize:12, fontWeight:500, color:'#64748B', display:'block', marginBottom:6 }
const errStyle: React.CSSProperties = { marginTop:12, padding:'10px 13px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:9, fontSize:13, color:'#DC2626' }
