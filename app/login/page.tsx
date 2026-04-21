'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Portal = 'select' | 'client' | 'developer'
type Mode   = 'login'  | 'register'

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return { label: 'Guten Morgen', sub: 'Bereit, dein Projekt voranzubringen?' }
  if (h >= 12 && h < 18) return { label: 'Guten Tag',    sub: 'Lass uns Fortschritt machen.' }
  return                         { label: 'Guten Abend',  sub: 'Dein Projekt wartet auf dich.' }
}

function VideoPanel({ portal }: { portal: Portal }) {
  return (
    <div style={{ position:'relative', flex:1, overflow:'hidden', minWidth:0, minHeight:'100%' }}>
      <video autoPlay muted loop playsInline
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}>
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(to right, rgba(5,14,28,0.65) 0%, rgba(5,14,28,0.4) 75%, rgba(5,14,28,0.15) 100%), linear-gradient(to top, rgba(5,14,28,0.72) 0%, transparent 52%)',
        pointerEvents:'none',
      }}/>
      
      {/* Animierte Bausteine - durchgehende Wand am rechten Rand */}
      <style>{`
        @keyframes slideIn{from{opacity:0;transform:translateX(80px);}to{opacity:1;transform:translateX(0);}}
        .blk{animation:slideIn .6s cubic-bezier(.16,1,.3,1) both;position:absolute;right:0;background:#FAFBFC;pointerEvents:none;}
        .d1{animation-delay:.03s;} .d2{animation-delay:.06s;} .d3{animation-delay:.09s;} 
        .d4{animation-delay:.12s;} .d5{animation-delay:.15s;} .d6{animation-delay:.18s;}
        .d7{animation-delay:.21s;} .d8{animation-delay:.24s;} .d9{animation-delay:.27s;}
        .d10{animation-delay:.30s;} .d11{animation-delay:.33s;} .d12{animation-delay:.36s;}
        .d13{animation-delay:.39s;} .d14{animation-delay:.42s;}
      `}</style>
      
      {/* SELECT Portal - Baustein-Wand rechts */}
      {portal === 'select' && (<>
        <div className="blk d1" style={{ top:0, width:90, height:'12%' }}/>
        <div className="blk d2" style={{ top:'12%', width:120, height:'5%' }}/>
        <div className="blk d3" style={{ top:'17%', width:75, height:'8%' }}/>
        <div className="blk d4" style={{ top:'25%', width:110, height:'6%' }}/>
        <div className="blk d5" style={{ top:'31%', width:95, height:'10%' }}/>
        <div className="blk d6" style={{ top:'41%', width:85, height:'7%' }}/>
        <div className="blk d7" style={{ top:'48%', width:105, height:'11%' }}/>
        <div className="blk d8" style={{ top:'59%', width:70, height:'5%' }}/>
        <div className="blk d9" style={{ top:'64%', width:100, height:'9%' }}/>
        <div className="blk d10" style={{ top:'73%', width:115, height:'6%' }}/>
        <div className="blk d11" style={{ top:'79%', width:80, height:'8%' }}/>
        <div className="blk d12" style={{ top:'87%', width:95, height:'7%' }}/>
        <div className="blk d13" style={{ top:'94%', width:110, height:'6%' }}/>
      </>)}
      
      {/* CLIENT Portal - anderes Muster */}
      {portal === 'client' && (<>
        <div className="blk d1" style={{ top:0, width:105, height:'6%' }}/>
        <div className="blk d2" style={{ top:'6%', width:85, height:'11%' }}/>
        <div className="blk d3" style={{ top:'17%', width:100, height:'5%' }}/>
        <div className="blk d4" style={{ top:'22%', width:70, height:'9%' }}/>
        <div className="blk d5" style={{ top:'31%', width:115, height:'7%' }}/>
        <div className="blk d6" style={{ top:'38%', width:90, height:'10%' }}/>
        <div className="blk d7" style={{ top:'48%', width:80, height:'6%' }}/>
        <div className="blk d8" style={{ top:'54%', width:120, height:'8%' }}/>
        <div className="blk d9" style={{ top:'62%', width:75, height:'11%' }}/>
        <div className="blk d10" style={{ top:'73%', width:95, height:'5%' }}/>
        <div className="blk d11" style={{ top:'78%', width:110, height:'9%' }}/>
        <div className="blk d12" style={{ top:'87%', width:85, height:'7%' }}/>
        <div className="blk d13" style={{ top:'94%', width:100, height:'6%' }}/>
      </>)}
      
      {/* DEVELOPER Portal - drittes Muster */}
      {portal === 'developer' && (<>
        <div className="blk d1" style={{ top:0, width:95, height:'8%' }}/>
        <div className="blk d2" style={{ top:'8%', width:110, height:'11%' }}/>
        <div className="blk d3" style={{ top:'19%', width:75, height:'6%' }}/>
        <div className="blk d4" style={{ top:'25%', width:105, height:'5%' }}/>
        <div className="blk d5" style={{ top:'30%', width:85, height:'10%' }}/>
        <div className="blk d6" style={{ top:'40%', width:120, height:'7%' }}/>
        <div className="blk d7" style={{ top:'47%', width:70, height:'9%' }}/>
        <div className="blk d8" style={{ top:'56%', width:100, height:'6%' }}/>
        <div className="blk d9" style={{ top:'62%', width:90, height:'11%' }}/>
        <div className="blk d10" style={{ top:'73%', width:115, height:'5%' }}/>
        <div className="blk d11" style={{ top:'78%', width:80, height:'8%' }}/>
        <div className="blk d12" style={{ top:'86%', width:105, height:'7%' }}/>
        <div className="blk d13" style={{ top:'93%', width:95, height:'7%' }}/>
      </>)}
      
      <div style={{ position:'absolute', top:28, left:32, zIndex:10 }}>
        <img src="/brand/logo.svg" alt="festag" style={{ height:22, filter:'brightness(0) invert(1)', opacity:0.92 }} />
      </div>
      {portal === 'select' && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 52px', textAlign:'center', zIndex:5 }}>
          <style>{`
            @keyframes tlin{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
            .tl1{animation:tlin .55s .05s cubic-bezier(.16,1,.3,1) both;}
            .tl2{animation:tlin .55s .18s cubic-bezier(.16,1,.3,1) both;}
            .tl3{animation:tlin .55s .32s cubic-bezier(.16,1,.3,1) both;}
          `}</style>
          <p className="tl1" style={{ fontFamily:"'Aeonik',sans-serif", fontWeight:400, fontSize:12, letterSpacing:'0.22em', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:24 }}>
            Festag — AI-native Softwareproduktion
          </p>
          <h2 className="tl2" style={{ fontFamily:"'Aeonik',sans-serif", fontWeight:700, fontSize:48, color:'#fff', lineHeight:1.15, letterSpacing:'-0.6px', marginBottom:20, maxWidth:560, textShadow:'0 2px 24px rgba(0,0,0,0.4)' }}>
            Kein lahmes Onboarding.<br/>Kein Risiko bei Abnahme.
          </h2>
          <p className="tl3" style={{ fontFamily:"'Aeonik',sans-serif", fontWeight:500, fontSize:22, color:'rgba(255,255,255,0.75)', letterSpacing:'-0.1px' }}>
            Festag baut. Du trinkst Kaffee.
          </p>
        </div>
      )}
      {portal !== 'select' && (
        <div style={{ position:'absolute', bottom:48, left:36, right:36, zIndex:5, maxWidth:520 }}>
          <h2 style={{ fontFamily:"'Aeonik',sans-serif", fontWeight:700, fontSize:36, color:'#fff', lineHeight:1.2, letterSpacing:'-0.5px', marginBottom:14, textShadow:'0 2px 20px rgba(0,0,0,0.5)' }}>
            {portal === 'client' ? 'Software, verständlich gemacht.' : 'Team Execution System.'}
          </h2>
          <p style={{ fontFamily:"'Aeonik',sans-serif", fontWeight:500, fontSize:15.5, color:'rgba(255,255,255,0.78)', lineHeight:1.65, textShadow:'0 1px 8px rgba(0,0,0,0.3)' }}>
            {portal === 'client' ? 'AI plant. Menschen bauen. Ein System verbindet alles.' : 'Empfange AI-Tasks. Liefere kontrolliert. Arbeite im System.'}
          </p>
        </div>
      )}
      <p style={{ position:'absolute', bottom:16, left:36, fontSize:10.5, letterSpacing:'.08em', color:'rgba(255,255,255,0.28)', fontFamily:"'Aeonik',sans-serif", fontWeight:400 }}>
        © 2026 Festag
      </p>
    </div>
  )
}

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
  const greeting = getGreeting()

  async function submitClient() {
    setError('')
    if (!email || !pw) { setError('Bitte alle Felder ausfüllen.'); return }
    if (pw.length < 6)  { setError('Passwort min. 6 Zeichen.'); return }
    setLoading(true)
    if (mode === 'register') {
      const { error:e } = await sb.auth.signUp({ email, password:pw })
      if (e) { setError(e.message); setLoading(false); return }
      await sb.auth.signInWithPassword({ email, password:pw })
      window.location.href = '/onboarding'
    } else {
      const { error:e } = await sb.auth.signInWithPassword({ email, password:pw })
      if (e) { setError('E-Mail oder Passwort falsch.'); setLoading(false); return }
      window.location.href = '/dashboard'
    }
  }

  async function submitDev() {
    setError('')
    if (!devUser || !devPin) { setError('Nutzername und PIN eingeben.'); return }
    setLoading(true)
    const { data, error:e } = await sb.rpc('verify_dev_pin', { username_input:devUser.trim().toLowerCase(), pin_input:devPin.trim() })
    if (e || !data?.length) { setError('Ungültiger Nutzername oder PIN.'); setLoading(false); return }
    localStorage.setItem('festag_dev_session', JSON.stringify({ user_id:data[0].user_id, user_email:data[0].user_email, user_role:data[0].user_role, expires:Date.now()+8*60*60*1000 }))
    window.location.href = '/dev'
  }

  async function signInWithProvider(provider: 'google'|'apple') {
    setSocialLoading(provider)
    const { error:e } = await sb.auth.signInWithOAuth({ provider, options:{ redirectTo:`${window.location.origin}/dashboard` } })
    if (e) { setError(e.message); setSocialLoading(null) }
  }

  /* PORTAL SELECT */
  if (portal === 'select') return (
    <div style={{ minHeight:'100vh', display:'flex', background:'#050e1c', fontFamily:"'Aeonik',sans-serif" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        .sel-vid { flex:1.15; display:flex; min-width:0; }
        .sel-cards { width:400px; flex-shrink:0; display:flex; flex-direction:column; justify-content:center; padding:52px 44px; background:#fff; }
        @media(max-width:768px){
          .sel-vid { display:none !important; }
          .sel-cards { width:100%; padding:40px 22px 48px; }
        }
        .p-btn{background:#fff;border:1.5px solid #E2E8F0;border-radius:14px;padding:20px 22px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;font-family:'Aeonik',sans-serif;transition:all .15s;text-align:left;width:100%;}
        .p-btn:hover{border-color:#007AFF;background:#FAFBFD;box-shadow:0 4px 24px rgba(0,122,255,.08);transform:translateY(-2px);}
        .p-btn:active{transform:scale(.98);}
        .pb1{animation:fadeUp .38s .05s cubic-bezier(.16,1,.3,1) both;}
        .pb2{animation:fadeUp .38s .14s cubic-bezier(.16,1,.3,1) both;}
      `}</style>
      <div style={{ display:'flex', width:'100%', minHeight:'100vh' }}>
        <div className="sel-vid"><VideoPanel portal="select" /></div>
        <div className="sel-cards">
          <div style={{ marginBottom:36 }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height:22, display:'block', marginBottom:36 }} />
            <p style={{ fontSize:11.5, fontWeight:700, letterSpacing:'.12em', color:'#007AFF', marginBottom:10, textTransform:'uppercase' }}>Wähle deinen Zugang</p>
            <h1 style={{ fontSize:30, fontWeight:700, color:'#0F172A', letterSpacing:'-0.5px', marginBottom:6, lineHeight:1.2 }}>Willkommen zurück.</h1>
            <p style={{ fontSize:15, color:'#64748B', margin:0, lineHeight:1.5 }}>{greeting.label} — {greeting.sub}</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <button onClick={() => setPortal('client')} className="p-btn pb1">
              <div style={{ flex:1 }}>
                <p style={{ fontSize:16.5, fontWeight:700, color:'#0F172A', marginBottom:5, letterSpacing:'-0.2px' }}>Client</p>
                <p style={{ fontSize:13.5, color:'#64748B', margin:0, lineHeight:1.5 }}>Für Auftraggeber & Kunden</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
            </button>
            <button onClick={() => setPortal('developer')} className="p-btn pb2">
              <div style={{ flex:1 }}>
                <p style={{ fontSize:16.5, fontWeight:700, color:'#0F172A', marginBottom:5, letterSpacing:'-0.2px' }}>Developer</p>
                <p style={{ fontSize:13.5, color:'#64748B', margin:0, lineHeight:1.5 }}>Interner Zugang · Nutzername & PIN</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          </div>
          <p style={{ textAlign:'center', fontSize:11, color:'#CBD5E1', marginTop:40, letterSpacing:'.08em', fontWeight:500 }}>AI plant · Menschen bauen · System verbindet</p>
        </div>
      </div>
    </div>
  )

  /* CLIENT / DEV FORM */
  const isDev = portal === 'developer'
  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'#fff', fontFamily:"'Aeonik',sans-serif" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
        .f-in{animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both;}
        .l-inp{width:100%;padding:12px 14px;background:#F8FAFC;border:1.5px solid #EEF2F7;border-radius:12px;font-size:15px;outline:none;color:#0F172A;box-sizing:border-box;font-family:'Aeonik',sans-serif;font-weight:500;transition:all .15s;}
        .l-inp:focus{border-color:#CBD5E1;background:#fff;box-shadow:0 0 0 3px rgba(15,23,42,.05);}
        .l-inp::placeholder{color:#C1CAD7;}
        .l-btn{width:100%;padding:13px;background:#0F172A;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:'Aeonik',sans-serif;transition:opacity .15s;display:flex;align-items:center;justify-content:center;gap:8px;min-height:46px;}
        .l-btn:hover{opacity:.88;} .l-btn:disabled{opacity:.4;cursor:default;}
        .seg{display:flex;background:#F1F5F9;border-radius:10px;padding:3px;margin-bottom:22px;gap:2px;}
        .seg-btn{flex:1;padding:9px;border-radius:8px;border:none;cursor:pointer;font-size:13.5px;font-family:'Aeonik',sans-serif;transition:all .12s;}
        .seg-on{background:#fff;color:#0F172A;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.08);}
        .seg-off{background:transparent;color:#94A3B8;}
        .soc-btn{width:100%;padding:12px 16px;background:#fff;color:#0F172A;border:1.5px solid #E2E8F0;border-radius:12px;font-size:14px;font-weight:500;cursor:pointer;font-family:'Aeonik',sans-serif;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .12s;min-height:46px;}
        .soc-btn:hover{background:#F8FAFC;border-color:#CBD5E1;box-shadow:0 2px 8px rgba(0,0,0,.05);}
        .soc-btn:disabled{opacity:.5;cursor:default;}
        .divider{display:flex;align-items:center;gap:12px;margin:18px 0;}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:#EEF2F7;}
        .divider span{font-size:12px;color:#94A3B8;font-weight:500;white-space:nowrap;}
        .login-left{display:flex;flex:1;min-width:0;}
        .login-right{width:100%;max-width:540px;padding:52px 48px;display:flex;flex-direction:column;flex-shrink:0;background:#FAFBFC;}
        @media(max-width:768px){
          .login-left{display:none !important;}
          .login-right{max-width:100%;padding:32px 20px;padding-top:calc(32px + env(safe-area-inset-top));background:#fff;}
        }
      `}</style>
      <div className="login-left"><VideoPanel portal={portal} /></div>
      <div className="login-right">
        <button onClick={() => setPortal('select')} style={{ background:'transparent', border:'none', color:'#94A3B8', fontSize:13, cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:5, marginBottom:36, fontFamily:"'Aeonik',sans-serif" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6"/></svg>
          Zurück
        </button>
        <div className="f-in" style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <p style={{ fontSize:11.5, fontWeight:700, color:isDev?'#059669':'#007AFF', letterSpacing:'.12em', marginBottom:10, textTransform:'uppercase' }}>
            {isDev ? 'Developer Portal' : 'Client Portal'}
          </p>
          <h1 style={{ fontSize:32, fontWeight:700, color:'#0F172A', marginBottom:8, letterSpacing:'-0.5px', lineHeight:1.2 }}>
            {isDev ? 'Systemzugang' : (mode==='login' ? greeting.label : 'Konto erstellen')}
          </h1>
          <p style={{ fontSize:15, color:'#64748B', marginBottom:32, lineHeight:1.6 }}>
            {isDev ? 'Nur für verifizierte Festag Developer.' : mode==='login' ? greeting.sub : 'Starte dein Projekt in weniger als 2 Minuten.'}
          </p>

          {!isDev && (<>
            <div className="seg">
              {(['login','register'] as const).map(m=>(
                <button key={m} onClick={()=>{setMode(m);setError('')}} className={`seg-btn ${mode===m?'seg-on':'seg-off'}`}>{m==='login'?'Anmelden':'Registrieren'}</button>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
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
            <p style={{ marginTop:18, textAlign:'center', fontSize:13, color:'#94A3B8' }}>
              {mode==='login'?'Noch kein Konto? ':'Bereits registriert? '}
              <span onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}} style={{ color:'#0F172A', cursor:'pointer', fontWeight:700 }}>
                {mode==='login'?'Registrieren':'Anmelden'}
              </span>
            </p>
            <div className="divider" style={{ marginTop:20 }}><span>oder schnell einloggen</span></div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={()=>signInWithProvider('google')} disabled={!!socialLoading} className="soc-btn">
                {socialLoading==='google' ? <span style={{ width:14,height:14,border:'2px solid #E2E8F0',borderTopColor:'#0F172A',borderRadius:'50%',animation:'spin .7s linear infinite' }}/> : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
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
          </>)}

          {isDev && (<>
            <div style={{ background:'#F8FAFC', border:'1.5px solid #EEF2F7', borderRadius:10, padding:'10px 14px', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#10B981', animation:'pulse 2s infinite', flexShrink:0 }}/>
              <p style={{ fontSize:12, color:'#64748B', margin:0 }}>Kein öffentlicher Zugang · Zuteilung durch Admin</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={lbl}>Nutzername</label>
                <input value={devUser} onChange={e=>setDevUser(e.target.value)} placeholder="dein-username" className="l-inp" autoComplete="username" onKeyDown={e=>e.key==='Enter'&&submitDev()}/>
              </div>
              <div>
                <label style={lbl}>PIN</label>
                <input type="password" value={devPin} onChange={e=>setDevPin(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="••••" maxLength={8} inputMode="numeric" className="l-inp" onKeyDown={e=>e.key==='Enter'&&submitDev()}/>
                <p style={{ fontSize:11, color:'#C1CAD7', marginTop:4 }}>Numerischer PIN, 4–8 Stellen</p>
              </div>
            </div>
            {error && <Err msg={error} />}
            <button onClick={submitDev} disabled={loading} className="l-btn" style={{ marginTop:18 }}>
              {loading ? <><Spin/> Prüfe Zugang…</> : 'Einloggen →'}
            </button>
            <p style={{ marginTop:14, textAlign:'center', fontSize:12, color:'#C1CAD7' }}>Noch kein Zugang? Wende dich an dein Admin-Team.</p>
          </>)}
        </div>
      </div>
    </div>
  )
}

function Spin() { return <span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite' }}/> }
function Err({ msg }:{ msg:string }) { return <div style={{ marginTop:12,padding:'10px 14px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,fontSize:13,color:'#EF4444' }}>{msg}</div> }
const lbl: React.CSSProperties = { fontSize:12, fontWeight:600, color:'#64748B', display:'block', marginBottom:6 }
