'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Portal = 'select' | 'client' | 'developer'
type Mode = 'login' | 'register'

const CLIENT_FEATURES = [
  { title: 'AI plant dein Projekt', desc: 'Tagro analysiert deine Idee und erstellt einen strukturierten Plan.' },
  { title: 'Experten setzen um',     desc: 'Verifizierte Developer arbeiten im System, transparent und kontrolliert.' },
  { title: 'Tägliche Updates',       desc: 'Du siehst Fortschritt in Echtzeit — keine Überraschungen.' },
  { title: 'Festag Garantie',        desc: 'Qualitätskontrolle durch AI + Project Owner vor jeder Lieferung.' },
]

export default function LoginPage() {
  const [portal, setPortal] = useState<Portal>('select')
  const [mode,   setMode]   = useState<Mode>('login')
  const [email,  setEmail]  = useState('')
  const [pw,     setPw]     = useState('')
  const [devUser,setDevUser]= useState('')
  const [devPin, setDevPin] = useState('')
  const [error,  setError]  = useState('')
  const [loading,setLoading]= useState(false)
  const [socialLoading, setSocialLoading] = useState<string|null>(null)
  const sb = createClient()

  async function submitClient() {
    setError(''); if (!email||!pw) { setError('Bitte alle Felder ausfüllen.'); return }
    if (pw.length<6) { setError('Passwort min. 6 Zeichen.'); return }
    setLoading(true)
    if (mode==='register') {
      const { error:e } = await sb.auth.signUp({ email, password:pw })
      if (e) { setError(e.message); setLoading(false); return }
      await sb.auth.signInWithPassword({ email, password:pw })
      window.location.href='/onboarding'
    } else {
      const { error:e } = await sb.auth.signInWithPassword({ email, password:pw })
      if (e) { setError('E-Mail oder Passwort falsch.'); setLoading(false); return }
      window.location.href='/dashboard'
    }
  }

  async function submitDev() {
    setError(''); if (!devUser||!devPin) { setError('Nutzername und PIN eingeben.'); return }
    setLoading(true)
    const { data, error:e } = await sb.rpc('verify_dev_pin', { username_input:devUser.trim().toLowerCase(), pin_input:devPin.trim() })
    if (e||!data?.length) { setError('Ungültiger Nutzername oder PIN.'); setLoading(false); return }
    localStorage.setItem('festag_dev_session', JSON.stringify({ user_id:data[0].user_id, user_email:data[0].user_email, user_role:data[0].user_role, expires:Date.now()+8*60*60*1000 }))
    window.location.href='/dev'
  }

  async function signInWithProvider(provider: 'google'|'apple'|'facebook') {
    setSocialLoading(provider)
    const { error:e } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })
    if (e) { setError(e.message); setSocialLoading(null) }
  }

  /* ── PORTAL SELECT ── */
  if (portal==='select') return (
    <div style={{ minHeight:'100vh',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',paddingTop:'calc(24px + env(safe-area-inset-top))' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        .sel-wrap{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;}
        .p-btn{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:16px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;font-family:inherit;transition:all .12s;text-align:left;}
        .p-btn:hover{border-color:#CBD5E1;box-shadow:0 2px 12px rgba(0,0,0,.06);}
      `}</style>
      <div className="sel-wrap" style={{ width:'100%',maxWidth:400 }}>
        {/* LARGER LOGO */}
        <div style={{ textAlign:'center',marginBottom:44 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:32,marginBottom:36,display:'inline-block' }} />
          <h1 style={{ fontSize:26,fontWeight:700,color:'#0F172A',marginBottom:8,letterSpacing:'-0.4px' }}>Willkommen</h1>
          <p style={{ fontSize:14,color:'#94A3B8' }}>Wähle deinen Zugang</p>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {[
            { key:'client',    label:'Client Portal',    desc:'Für Auftraggeber',  badge:'Für Kunden' },
            { key:'developer', label:'Developer',         desc:'Nutzername & PIN',  badge:'Intern' },
          ].map(p => (
            <button key={p.key} onClick={()=>setPortal(p.key as Portal)} className="p-btn">
              <div><p style={{ fontSize:15,fontWeight:600,color:'#0F172A',margin:'0 0 2px' }}>{p.label}</p><p style={{ fontSize:13,color:'#94A3B8',margin:0 }}>{p.desc}</p></div>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <span style={{ fontSize:11,fontWeight:500,color:'#94A3B8',padding:'3px 9px',background:'#F1F5F9',borderRadius:6 }}>{p.badge}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
              </div>
            </button>
          ))}
        </div>
        <p style={{ textAlign:'center',fontSize:11,color:'#E2E8F0',marginTop:32,letterSpacing:'.06em' }}>AI PLANT · MENSCHEN BAUEN · SYSTEM VERBINDET</p>
      </div>
    </div>
  )

  const isDev = portal==='developer'

  return (
    <div style={{ minHeight:'100vh',display:'flex',background:'#fff' }}>
      <style>{`
        .l-inp{width:100%;padding:12px 14px;background:#F8FAFC;border:1.5px solid #EEF2F7;border-radius:12px;font-size:15px;outline:none;color:#0F172A;box-sizing:border-box;font-family:inherit;font-weight:500;transition:all .15s;}
        .l-inp:focus{border-color:#CBD5E1;background:#fff;box-shadow:0 0 0 3px rgba(15,23,42,.05);}
        .l-inp::placeholder{color:#C1CAD7;}
        .l-btn{width:100%;padding:13px;background:#0F172A;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s;display:flex;align-items:center;justify-content:center;gap:8px;min-height:46px;}
        .l-btn:hover{opacity:.88;} .l-btn:disabled{opacity:.4;cursor:default;}
        .seg{display:flex;background:#F1F5F9;border-radius:10px;padding:3px;margin-bottom:22px;gap:2px;}
        .seg-btn{flex:1;padding:9px;border-radius:8px;border:none;cursor:pointer;font-size:13.5px;font-family:inherit;transition:all .12s;}
        .seg-on{background:#fff;color:#0F172A;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.08);}
        .seg-off{background:transparent;color:#94A3B8;}
        .soc-btn{width:100%;padding:12px 16px;background:#fff;color:#0F172A;border:1.5px solid #E2E8F0;border-radius:12px;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .12s;min-height:46px;}
        .soc-btn:hover{background:#F8FAFC;border-color:#CBD5E1;box-shadow:0 2px 8px rgba(0,0,0,.05);}
        .soc-btn:disabled{opacity:.5;cursor:default;}
        .divider{display:flex;align-items:center;gap:12px;margin:18px 0;}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:#EEF2F7;}
        .divider span{font-size:12px;color:#94A3B8;font-weight:500;white-space:nowrap;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .f-in{animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both;}
        @keyframes spin{to{transform:rotate(360deg);}}
        .l-feat{background:#fff;border:1px solid #EEF2F7;border-radius:14px;padding:14px 16px;animation:fadeUp .35s both;}
      `}</style>

      {/* LEFT — feature panel */}
      <div className="hide-mobile" style={{ flex:1,padding:'48px 52px',display:'flex',flexDirection:'column',justifyContent:'space-between',background:'#FAFBFD',borderRight:'1px solid #EEF2F7',overflow:'hidden' }}>
        {/* LARGER LOGO on desktop */}
        <img src="/brand/logo.svg" alt="festag" style={{ height:20,display:'block' }} />
        <div style={{ maxWidth:440 }}>
          <h2 style={{ fontSize:32,fontWeight:700,color:'#0F172A',letterSpacing:'-0.6px',lineHeight:1.15,marginBottom:14 }}>
            {isDev ? 'Team Execution System.' : 'Software, verständlich gemacht.'}
          </h2>
          <p style={{ fontSize:15,color:'#64748B',lineHeight:1.6,marginBottom:32 }}>
            {isDev ? 'Empfange AI-strukturierte Tasks. Liefere kontrolliert. Arbeite im System.' : 'AI plant. Menschen bauen. Ein System verbindet alles.'}
          </p>
          {!isDev && (
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {CLIENT_FEATURES.map((f,i) => (
                <div key={f.title} className="l-feat" style={{ animationDelay:`${i*.07}s` }}>
                  <p style={{ fontSize:13,fontWeight:600,color:'#0F172A',margin:'0 0 2px' }}>{f.title}</p>
                  <p style={{ fontSize:12,color:'#94A3B8',margin:0,lineHeight:1.5 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          )}
          {isDev && (
            <div style={{ background:'#fff',border:'1px solid #EEF2F7',borderRadius:14,padding:18 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#10B981',animation:'pulse 2s infinite' }}/>
                <span style={{ fontSize:11,fontWeight:700,color:'#059669',letterSpacing:'.06em' }}>SYSTEM AKTIV</span>
              </div>
              {['Build SaaS Dashboard','Create AI Automation','Design Landing Page','Develop Mobile App'].map((t,i)=>(
                <div key={t} style={{ padding:'8px 0',borderBottom:i<3?'1px solid #F1F5F9':'none',fontSize:13,color:'#64748B' }}>
                  <span style={{ color:'#CBD5E1',marginRight:8 }}>—</span>{t}
                </div>
              ))}
            </div>
          )}
        </div>
        <p style={{ fontSize:11,color:'#CBD5E1',letterSpacing:'.08em' }}>© 2026 FESTAG · AI-NATIVE SOFTWAREPRODUKTION</p>
      </div>

      {/* RIGHT — form */}
      <div style={{ width:'100%',maxWidth:480,padding:'48px 40px',paddingTop:'calc(48px + env(safe-area-inset-top))',display:'flex',flexDirection:'column' }}>
        <button onClick={()=>setPortal('select')} style={{ background:'transparent',border:'none',color:'#94A3B8',fontSize:13,cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:5,marginBottom:36,fontFamily:'inherit' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6"/></svg>
          Zurück
        </button>

        <div className="f-in" style={{ flex:1,display:'flex',flexDirection:'column',justifyContent:'center' }}>
          {/* Mobile logo — LARGER */}
          <div className="show-mobile" style={{ marginBottom:28,textAlign:'center' }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height:26,display:'inline-block' }} />
          </div>

          <p style={{ fontSize:11,fontWeight:700,color:isDev?'#059669':'#007AFF',letterSpacing:'.1em',marginBottom:8 }}>
            {isDev?'DEVELOPER PORTAL':'CLIENT PORTAL'}
          </p>
          <h1 style={{ fontSize:27,fontWeight:700,color:'#0F172A',marginBottom:6,letterSpacing:'-0.4px' }}>
            {isDev?'Systemzugang':(mode==='login'?'Willkommen zurück':'Konto erstellen')}
          </h1>
          <p style={{ fontSize:14,color:'#64748B',marginBottom:24,lineHeight:1.5 }}>
            {isDev?'Nur für verifizierte Festag Developer.':(mode==='login'?'Melde dich an, um fortzufahren.':'Starte dein Projekt in weniger als 2 Minuten.')}
          </p>

          {/* ── CLIENT FORM ── */}
          {!isDev && (
            <>
              {/* Social Auth buttons */}
              <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:2 }}>
                <button onClick={()=>signInWithProvider('google')} disabled={!!socialLoading} className="soc-btn">
                  {socialLoading==='google' ? <span style={{ width:16,height:16,border:'2px solid #E2E8F0',borderTopColor:'#0F172A',borderRadius:'50%',animation:'spin .7s linear infinite' }}/> : (
                    <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  )}
                  Mit Google fortfahren
                </button>
                <button onClick={()=>signInWithProvider('apple')} disabled={!!socialLoading} className="soc-btn" style={{ background:'#0F172A',color:'#fff',border:'none' }}>
                  {socialLoading==='apple' ? <span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite' }}/> : (
                    <svg width="17" height="17" viewBox="0 0 814 1000" fill="#fff"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.9-155.5-127.4C46 790.7 0 663 0 541.8c0-207.8 140-317.8 277.8-317.8 73.5 0 134.5 46.5 181.2 46.5 44.4 0 114.4-49.1 200.9-49.1zm-87.4-190.3c43.3-51.9 74.1-123.4 74.1-194.9 0-9.7-.6-19.4-2.6-27.8-70.3 2.6-154.2 47.2-206.2 106.1-39.5 44.4-74.1 116.9-74.1 190.3 0 10.4 1.9 20.7 2.6 23.9 4.5.6 11.7 1.9 18.2 1.9 64.2 0 142.3-43.3 187.9-99.5z"/></svg>
                  )}
                  Mit Apple fortfahren
                </button>
              </div>

              <div className="divider"><span>oder mit E-Mail</span></div>

              {/* Tab */}
              <div className="seg">
                {(['login','register'] as const).map(m=>(
                  <button key={m} onClick={()=>{setMode(m);setError('')}} className={`seg-btn ${mode===m?'seg-on':'seg-off'}`}>{m==='login'?'Anmelden':'Registrieren'}</button>
                ))}
              </div>

              <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                <div>
                  <label style={lbl}>E-Mail</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@beispiel.de" className="l-inp" autoComplete="email" onKeyDown={e=>e.key==='Enter'&&submitClient()}/>
                </div>
                <div>
                  <label style={lbl}>Passwort</label>
                  <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" className="l-inp" autoComplete={mode==='login'?'current-password':'new-password'} onKeyDown={e=>e.key==='Enter'&&submitClient()}/>
                </div>
              </div>
              {error && <Err msg={error} />}
              <button onClick={submitClient} disabled={loading} className="l-btn" style={{ marginTop:18 }}>
                {loading ? <><Spin/> Einen Moment…</> : (mode==='login'?'Anmelden':'Konto erstellen')}
              </button>
              <p style={{ marginTop:18,textAlign:'center',fontSize:13,color:'#94A3B8' }}>
                {mode==='login'?'Noch kein Konto? ':'Bereits registriert? '}
                <span onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}} style={{ color:'#0F172A',cursor:'pointer',fontWeight:700 }}>
                  {mode==='login'?'Registrieren':'Anmelden'}
                </span>
              </p>
            </>
          )}

          {/* ── DEV FORM ── */}
          {isDev && (
            <>
              <div style={{ background:'#F8FAFC',border:'1.5px solid #EEF2F7',borderRadius:10,padding:'10px 14px',marginBottom:20,display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#10B981',animation:'pulse 2s infinite',flexShrink:0 }}/>
                <p style={{ fontSize:12,color:'#64748B',margin:0 }}>Kein öffentlicher Zugang · Zuteilung durch Admin</p>
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                <div>
                  <label style={lbl}>Nutzername</label>
                  <input value={devUser} onChange={e=>setDevUser(e.target.value)} placeholder="dein-username" className="l-inp" autoComplete="username" onKeyDown={e=>e.key==='Enter'&&submitDev()}/>
                </div>
                <div>
                  <label style={lbl}>PIN</label>
                  <input type="password" value={devPin} onChange={e=>setDevPin(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="••••" maxLength={8} inputMode="numeric" className="l-inp" onKeyDown={e=>e.key==='Enter'&&submitDev()}/>
                  <p style={{ fontSize:11,color:'#C1CAD7',marginTop:4 }}>Numerischer PIN, 4–8 Stellen</p>
                </div>
              </div>
              {error && <Err msg={error} />}
              <button onClick={submitDev} disabled={loading} className="l-btn" style={{ marginTop:18 }}>
                {loading ? <><Spin/> Prüfe Zugang…</> : 'Einloggen →'}
              </button>
              <p style={{ marginTop:14,textAlign:'center',fontSize:12,color:'#C1CAD7' }}>Noch kein Zugang? Wende dich an dein Admin-Team.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Spin() { return <span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite' }}/> }
function Err({ msg }:{ msg:string }) { return <div style={{ marginTop:12,padding:'10px 14px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,fontSize:13,color:'#EF4444' }}>{msg}</div> }
const lbl: React.CSSProperties = { fontSize:12,fontWeight:600,color:'#64748B',display:'block',marginBottom:6 }
