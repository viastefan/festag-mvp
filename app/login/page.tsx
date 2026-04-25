'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const T = {
  bg:       '#0E0F0E',
  card:     '#1A1C1A',
  border:   'rgba(255,255,255,0.09)',
  green:    '#2E7D5E',
  greenBr:  '#34A06E',
  greenGlow:'rgba(46,125,94,0.28)',
  text:     '#F5F6F5',
  textSec:  '#8A9490',
  textMut:  '#4A524E',
  white:    '#FFFFFF',
}

type View = 'home' | 'login' | 'register' | 'dev'

function Spin({ white=true }: { white?: boolean }) {
  return (
    <span style={{ width:18,height:18,border:`2.5px solid ${white?'rgba(255,255,255,.2)':'rgba(0,0,0,.1)'}`,
      borderTopColor:white?'#fff':'#323635',borderRadius:'50%',display:'inline-block',
      animation:'spin .7s linear infinite',flexShrink:0 }}/>
  )
}

function Err({ msg }: { msg: string }) {
  return (
    <div style={{ padding:'13px 16px',background:'rgba(224,85,85,.1)',border:'1px solid rgba(224,85,85,.2)',
      borderRadius:14,fontSize:14,color:'#E07070',marginBottom:16,lineHeight:1.5 }}>
      {msg}
    </div>
  )
}

function FInput({ label, value, onChange, type='text', placeholder='', autoFocus=false }: {
  label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string;autoFocus?:boolean
}) {
  const [f,setF] = useState(false)
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block',fontSize:11,fontWeight:700,letterSpacing:'.1em',
        color:f?T.greenBr:T.textMut,textTransform:'uppercase',marginBottom:8,transition:'color .15s' }}>
        {label}
      </label>
      <input type={type} value={value} autoFocus={autoFocus}
        onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        placeholder={placeholder}
        style={{ width:'100%',padding:'15px 16px',background:f?T.card:'rgba(255,255,255,0.04)',
          border:`1.5px solid ${f?T.green:T.border}`,borderRadius:14,fontSize:16,color:T.text,
          outline:'none',transition:'all .15s',boxShadow:f?`0 0 0 3px ${T.greenGlow}`:'none',
          fontFamily:'inherit',fontWeight:500,caretColor:T.greenBr }}/>
    </div>
  )
}

export default function LoginPage() {
  const [view, setView] = useState<View>('home')
  const [email,  setEmail]  = useState('')
  const [pw,     setPw]     = useState('')
  const [pw2,    setPw2]    = useState('')
  const [devUser,setDevUser]= useState('')
  const [devPin, setDevPin] = useState('')
  const [error,  setError]  = useState('')
  const [loading,setLoading]= useState(false)
  const [socialLoading, setSocialLoading] = useState<string|null>(null)
  const sb = createClient()

  function reset() { setError(''); setEmail(''); setPw(''); setPw2('') }

  async function doLogin() {
    setError('')
    if (!email || !pw) return setError('Bitte alle Felder ausfüllen.')
    setLoading(true)
    const { error:e } = await sb.auth.signInWithPassword({ email, password:pw })
    setLoading(false)
    if (e) return setError('E-Mail oder Passwort falsch.')
    window.location.href = '/dashboard'
  }

  async function doRegister() {
    setError('')
    if (!email || !pw) return setError('Bitte alle Felder ausfüllen.')
    if (pw !== pw2) return setError('Passwörter stimmen nicht überein.')
    if (pw.length < 8) return setError('Passwort muss mindestens 8 Zeichen haben.')
    setLoading(true)
    const { data, error:e } = await sb.auth.signUp({ email, password:pw })
    if (e) { setError(e.message); setLoading(false); return }
    await sb.auth.signInWithPassword({ email, password:pw })
    setLoading(false)
    window.location.href = '/onboarding'
  }

  async function doSocial(provider: 'google'|'apple') {
    setSocialLoading(provider)
    const redirect = view === 'register'
      ? `${window.location.origin}/onboarding`
      : `${window.location.origin}/dashboard`
    const { error:e } = await sb.auth.signInWithOAuth({ provider, options:{ redirectTo: redirect } })
    if (e) { setError(e.message); setSocialLoading(null) }
  }

  async function doDev() {
    setError('')
    if (!devUser || !devPin) return setError('Nutzername und PIN eingeben.')
    setLoading(true)
    const { data, error:e } = await sb.rpc('verify_dev_pin', {
      username_input: devUser.trim().toLowerCase(),
      pin_input: devPin.trim()
    })
    setLoading(false)
    if (e || !data?.length) return setError('Ungültiger Nutzername oder PIN.')
    localStorage.setItem('festag_dev_session', JSON.stringify({
      user_id: data[0].user_id, user_email: data[0].user_email,
      user_role: data[0].user_role, expires: Date.now()+8*60*60*1000
    }))
    window.location.href = '/dev'
  }

  // ─── HOME SCREEN ─────────────────────────────────────────────────────────────
  if (view === 'home') return (
    <div style={{ minHeight:'100dvh', background:T.bg, fontFamily:"'Aeonik',sans-serif",
      WebkitFontSmoothing:'antialiased', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        .h-btn-primary{
          width:100%;padding:17px 24px;
          background:linear-gradient(135deg,${T.green} 0%,${T.greenBr} 100%);
          color:#fff;font-size:17px;font-weight:700;border-radius:18px;border:none;
          cursor:pointer;font-family:'Aeonik',sans-serif;letter-spacing:-.2px;
          box-shadow:0 4px 28px ${T.greenGlow};transition:all .2s;
        }
        .h-btn-primary:active{transform:scale(.97);opacity:.92;}
        .h-btn-secondary{
          width:100%;padding:17px 24px;
          background:rgba(255,255,255,0.06);
          color:${T.text};font-size:17px;font-weight:700;border-radius:18px;
          border:1.5px solid ${T.border};
          cursor:pointer;font-family:'Aeonik',sans-serif;letter-spacing:-.2px;
          transition:all .2s;
        }
        .h-btn-secondary:active{transform:scale(.97);background:rgba(255,255,255,0.1);}
        .a1{animation:fadeUp .5s .1s cubic-bezier(.16,1,.3,1) both;}
        .a2{animation:fadeUp .5s .22s cubic-bezier(.16,1,.3,1) both;}
        .a3{animation:fadeUp .5s .34s cubic-bezier(.16,1,.3,1) both;}
        .a4{animation:fadeUp .5s .46s cubic-bezier(.16,1,.3,1) both;}
        .a5{animation:fadeUp .5s .58s cubic-bezier(.16,1,.3,1) both;}

        /* ── Desktop Layout ── */
        .home-desktop-wrap{display:none;}
        .home-mobile-wrap{display:flex;flex-direction:column;min-height:100dvh;}

        @media(min-width:769px){
          .home-mobile-wrap{display:none!important;}
          .home-desktop-wrap{display:flex!important;min-height:100vh;}
        }
      `}</style>

      {/* ─── MOBILE ─────────────────────────────────────────── */}
      <div className="home-mobile-wrap">
        {/* Video Container – oben, runder Kreis-Container */}
        <div style={{ flex:'0 0 auto', padding:'calc(env(safe-area-inset-top) + 20px) 20px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div className="a1" style={{
            width:'100%', maxWidth:390, height:340,
            borderRadius:32, overflow:'hidden', position:'relative',
            boxShadow:'0 24px 60px rgba(0,0,0,0.7)',
          }}>
            <video autoPlay muted loop playsInline style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover' }}>
              <source src="/bg-video.mp4" type="video/mp4"/>
            </video>
            {/* Dark gradient overlay */}
            <div style={{ position:'absolute',inset:0,
              background:'linear-gradient(180deg, rgba(5,14,10,0.25) 0%, rgba(5,14,10,0.85) 100%)',
              pointerEvents:'none' }}/>
            {/* Logo top-left */}
            <div style={{ position:'absolute',top:22,left:22,zIndex:2 }}>
              <img src="/brand/logo.svg" alt="festag" style={{ height:20,filter:'brightness(0) invert(1)',opacity:.88 }}/>
            </div>
            {/* Text bottom */}
            <div style={{ position:'absolute',bottom:28,left:24,right:24,zIndex:2 }}>
              <p style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,.45)',letterSpacing:'.15em',
                textTransform:'uppercase',marginBottom:10 }}>
                AI-native Softwareproduktion
              </p>
              <h1 style={{ fontSize:28,fontWeight:700,color:'#fff',lineHeight:1.2,letterSpacing:'-.5px',
                textShadow:'0 2px 20px rgba(0,0,0,.5)',margin:0 }}>
                Projekte,<br/>die laufen.
              </h1>
              <p style={{ fontSize:14,fontWeight:500,color:'rgba(255,255,255,.65)',marginTop:8,lineHeight:1.5 }}>
                Von der Idee zum fertigen Produkt —<br/>die KI versteht, plant und liefert.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons Bottom */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end',
          padding:`24px 24px calc(env(safe-area-inset-bottom) + 32px)` }}>
          <div className="a3" style={{ marginBottom:12 }}>
            <button className="h-btn-primary" onClick={() => { reset(); setView('register') }}>
              Jetzt starten
            </button>
          </div>
          <div className="a4" style={{ marginBottom:28 }}>
            <button className="h-btn-secondary" onClick={() => { reset(); setView('login') }}>
              Einloggen
            </button>
          </div>
          <div className="a5" style={{ textAlign:'center' }}>
            <span onClick={() => { reset(); setView('dev') }}
              style={{ fontSize:13,color:T.textMut,cursor:'pointer',fontWeight:600,letterSpacing:'-.1px' }}>
              Als Dev'ler einloggen
            </span>
          </div>
        </div>
      </div>

      {/* ─── DESKTOP ─────────────────────────────────────────── */}
      <div className="home-desktop-wrap" style={{ width:'100%' }}>
        {/* Left: fullscreen video */}
        <div style={{ flex:1, position:'relative', overflow:'hidden', minWidth:0 }}>
          <video autoPlay muted loop playsInline style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover' }}>
            <source src="/bg-video.mp4" type="video/mp4"/>
          </video>
          <div style={{ position:'absolute',inset:0,
            background:'linear-gradient(to right,rgba(5,14,10,0.7) 0%,rgba(5,14,10,0.35) 70%,rgba(5,14,10,0.1) 100%), linear-gradient(to top,rgba(5,14,10,0.8) 0%,transparent 55%)',
            pointerEvents:'none' }}/>
          {/* Animierte Bausteine rechts */}
          <style>{`
            @keyframes slideInBlk{from{opacity:0;transform:translateX(70px);}to{opacity:1;transform:translateX(0);}}
            .dblk{animation:slideInBlk .6s cubic-bezier(.16,1,.3,1) both;position:absolute;right:0;background:#0E0F0E;pointer-events:none;}
            .db1{animation-delay:.04s;}.db2{animation-delay:.08s;}.db3{animation-delay:.12s;}
            .db4{animation-delay:.16s;}.db5{animation-delay:.20s;}.db6{animation-delay:.24s;}
            .db7{animation-delay:.28s;}.db8{animation-delay:.32s;}.db9{animation-delay:.36s;}
            .db10{animation-delay:.40s;}.db11{animation-delay:.44s;}.db12{animation-delay:.48s;}
          `}</style>
          <div className="dblk db1" style={{ top:0, width:80, height:'3%' }}/>
          <div className="dblk db2" style={{ top:'3%', width:105, height:'11%' }}/>
          <div className="dblk db3" style={{ top:'14%', width:65, height:'5%' }}/>
          <div className="dblk db4" style={{ top:'19%', width:90, height:'13%' }}/>
          <div className="dblk db5" style={{ top:'32%', width:115, height:'4%' }}/>
          <div className="dblk db6" style={{ top:'36%', width:70, height:'9%' }}/>
          <div className="dblk db7" style={{ top:'45%', width:95, height:'7%' }}/>
          <div className="dblk db8" style={{ top:'52%', width:85, height:'12%' }}/>
          <div className="dblk db9" style={{ top:'64%', width:110, height:'6%' }}/>
          <div className="dblk db10" style={{ top:'70%', width:75, height:'10%' }}/>
          <div className="dblk db11" style={{ top:'80%', width:100, height:'5%' }}/>
          <div className="dblk db12" style={{ top:'85%', width:90, height:'15%' }}/>

          {/* Logo */}
          <div style={{ position:'absolute',top:32,left:36 }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height:22,filter:'brightness(0) invert(1)',opacity:.9 }}/>
          </div>
          {/* Desktop copy */}
          <div style={{ position:'absolute',bottom:52,left:52,right:'20%',zIndex:2 }}>
            <p style={{ fontSize:12,fontWeight:700,color:'rgba(255,255,255,.4)',letterSpacing:'.18em',
              textTransform:'uppercase',marginBottom:16 }}>Festag — AI-native Softwareproduktion</p>
            <h2 style={{ fontSize:52,fontWeight:700,color:'#fff',lineHeight:1.1,letterSpacing:'-.8px',
              marginBottom:18,textShadow:'0 2px 30px rgba(0,0,0,.5)' }}>
              Projekte,<br/>die laufen.
            </h2>
            <p style={{ fontSize:18,fontWeight:500,color:'rgba(255,255,255,.65)',lineHeight:1.6 }}>
              Von der Idee zum fertigen Produkt —<br/>die KI versteht, plant und liefert.
            </p>
          </div>
          <p style={{ position:'absolute',bottom:20,left:36,fontSize:11,color:'rgba(255,255,255,.22)',letterSpacing:'.06em' }}>
            © 2026 Festag
          </p>
        </div>

        {/* Right: Action Panel */}
        <div style={{ width:480,flexShrink:0,background:T.bg,display:'flex',flexDirection:'column',
          justifyContent:'center',padding:'60px 52px',borderLeft:`1px solid ${T.border}` }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:22,filter:'brightness(0) invert(1)',opacity:.7,marginBottom:52 }}/>
          <p style={{ fontSize:11,fontWeight:700,letterSpacing:'.14em',color:T.green,textTransform:'uppercase',marginBottom:12 }}>
            Willkommen
          </p>
          <h1 style={{ fontSize:36,fontWeight:700,color:T.text,letterSpacing:'-.7px',lineHeight:1.15,marginBottom:12 }}>
            Dein Projekt<br/>wartet.
          </h1>
          <p style={{ fontSize:16,color:T.textSec,marginBottom:48,lineHeight:1.6,fontWeight:500 }}>
            Starte oder melde dich an.
          </p>
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <button onClick={()=>{reset();setView('register')}} style={{
              width:'100%',padding:'16px 24px',
              background:`linear-gradient(135deg,${T.green} 0%,${T.greenBr} 100%)`,
              color:'#fff',fontSize:16,fontWeight:700,borderRadius:16,border:'none',
              cursor:'pointer',fontFamily:'inherit',letterSpacing:'-.1px',
              boxShadow:`0 4px 24px ${T.greenGlow}`,transition:'all .2s',
            }}>Jetzt starten</button>
            <button onClick={()=>{reset();setView('login')}} style={{
              width:'100%',padding:'16px 24px',
              background:'rgba(255,255,255,0.05)',
              color:T.text,fontSize:16,fontWeight:700,borderRadius:16,
              border:`1.5px solid ${T.border}`,
              cursor:'pointer',fontFamily:'inherit',letterSpacing:'-.1px',transition:'all .2s',
            }}>Einloggen</button>
          </div>
          <div style={{ marginTop:40,paddingTop:32,borderTop:`1px solid ${T.border}`,textAlign:'center' }}>
            <span onClick={()=>{reset();setView('dev')}} style={{
              fontSize:13,color:T.textMut,cursor:'pointer',fontWeight:600,
              letterSpacing:'-.1px',transition:'color .15s',
            }}>
              Als Dev'ler einloggen →
            </span>
          </div>
          <p style={{ textAlign:'center',fontSize:11,color:T.textMut,marginTop:32,letterSpacing:'.06em' }}>
            AI plant · Menschen bauen · System verbindet
          </p>
        </div>
      </div>
    </div>
  )

  // ─── Shared form wrapper ─────────────────────────────────────────────────────
  const isDev = view === 'dev'
  const isReg = view === 'register'

  return (
    <div style={{ minHeight:'100dvh',background:T.bg,fontFamily:"'Aeonik',sans-serif",
      WebkitFontSmoothing:'antialiased',display:'flex' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        .frm{animation:fadeUp .32s cubic-bezier(.16,1,.3,1) both;}
        input::placeholder{color:${T.textMut};opacity:1;}
        .prim-btn{width:100%;padding:17px;background:linear-gradient(135deg,${T.green} 0%,${T.greenBr} 100%);
          color:#fff;font-size:16px;font-weight:700;border-radius:16px;border:none;cursor:pointer;
          font-family:inherit;display:flex;align-items:center;justify-content:center;gap:10px;
          box-shadow:0 4px 24px ${T.greenGlow};transition:all .2s;letter-spacing:-.1px;}
        .prim-btn:disabled{opacity:.4;cursor:default;box-shadow:none;}
        .soc-btn{width:100%;padding:14px 18px;background:rgba(255,255,255,0.05);
          border:1.5px solid ${T.border};border-radius:14px;color:${T.text};font-size:15px;font-weight:600;
          display:flex;align-items:center;justify-content:center;gap:12px;cursor:pointer;
          font-family:inherit;transition:all .15s;}
        .soc-btn:hover{background:rgba(255,255,255,0.09);border-color:rgba(255,255,255,0.16);}
        .soc-btn-apple{background:#000!important;border-color:#000!important;}
        .soc-btn-apple:hover{background:#111!important;}

        /* Desktop: video left, form right */
        .form-left{display:none;}
        .form-right{width:100%;padding:calc(env(safe-area-inset-top)+24px) 24px calc(env(safe-area-inset-bottom)+48px);
          display:flex;flex-direction:column;max-width:480px;margin:0 auto;}
        @media(min-width:769px){
          .form-left{display:flex;flex:1;min-width:0;}
          .form-right{width:520px;flex-shrink:0;padding:60px 52px;justify-content:center;
            border-left:1px solid ${T.border};}
        }
      `}</style>

      {/* Desktop: video left */}
      <div className="form-left" style={{ position:'relative',overflow:'hidden' }}>
        <video autoPlay muted loop playsInline style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover' }}>
          <source src="/bg-video.mp4" type="video/mp4"/>
        </video>
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(to right,rgba(5,14,10,0.65) 0%,rgba(5,14,10,0.2) 100%)',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',top:32,left:36 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:22,filter:'brightness(0) invert(1)',opacity:.9 }}/>
        </div>
        <div style={{ position:'absolute',bottom:52,left:52,right:'15%' }}>
          <h2 style={{ fontSize:44,fontWeight:700,color:'#fff',lineHeight:1.15,letterSpacing:'-.7px',
            textShadow:'0 2px 24px rgba(0,0,0,.5)' }}>
            {isDev ? 'Team Execution System.' : isReg ? 'Willkommen bei Festag.' : 'Schön, dass du wieder da bist.'}
          </h2>
          <p style={{ fontSize:16,fontWeight:500,color:'rgba(255,255,255,.6)',marginTop:14,lineHeight:1.6 }}>
            {isDev ? 'Empfange Tasks. Liefere kontrolliert.' : 'AI plant. Menschen bauen. Ein System verbindet alles.'}
          </p>
        </div>
        <p style={{ position:'absolute',bottom:20,left:36,fontSize:11,color:'rgba(255,255,255,.22)',letterSpacing:'.06em' }}>
          © 2026 Festag
        </p>
      </div>

      {/* Form */}
      <div className="form-right">
        <button onClick={() => { setView('home'); setError('') }} style={{
          background:'transparent',border:'none',color:T.textMut,fontSize:13,cursor:'pointer',
          padding:0,display:'flex',alignItems:'center',gap:6,marginBottom:40,fontFamily:'inherit',fontWeight:600,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Zurück
        </button>

        <div className="frm">
          {/* Icon */}
          <div style={{ width:52,height:52,borderRadius:16,background:T.card,
            border:`1px solid ${T.border}`,display:'flex',alignItems:'center',
            justifyContent:'center',marginBottom:24 }}>
            {isDev
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.greenBr} strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.greenBr} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            }
          </div>

          <p style={{ fontSize:11,fontWeight:700,letterSpacing:'.12em',color:isDev?T.greenBr:T.green,
            textTransform:'uppercase',marginBottom:10 }}>
            {isDev ? 'Developer Portal' : isReg ? 'Registrierung' : 'Login'}
          </p>
          <h1 style={{ fontSize:30,fontWeight:700,color:T.text,letterSpacing:'-.6px',lineHeight:1.2,marginBottom:8 }}>
            {isDev ? 'Systemzugang.' : isReg ? 'Konto erstellen.' : 'Willkommen zurück.'}
          </h1>
          <p style={{ fontSize:15,color:T.textSec,marginBottom:32,lineHeight:1.55,fontWeight:500 }}>
            {isDev ? 'Nur für verifizierte Festag Developer.' : isReg ? 'Starte dein Projekt in 2 Minuten.' : 'Melde dich an, um fortzufahren.'}
          </p>

          {error && <Err msg={error}/>}

          {/* ── CLIENT LOGIN ──────────────────────── */}
          {view === 'login' && (<>
            <FInput label="E-Mail" value={email} onChange={setEmail} type="email" placeholder="deine@email.com" autoFocus/>
            <FInput label="Passwort" value={pw} onChange={setPw} type="password" placeholder="Dein Passwort"/>
            <button onClick={doLogin} disabled={loading} className="prim-btn" style={{ marginTop:10, marginBottom:20 }}>
              {loading ? <Spin/> : 'Anmelden →'}
            </button>
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
              <div style={{ flex:1,height:1,background:T.border }}/>
              <span style={{ fontSize:12,color:T.textMut,fontWeight:700,letterSpacing:'.07em' }}>ODER</span>
              <div style={{ flex:1,height:1,background:T.border }}/>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              <button onClick={()=>doSocial('google')} className="soc-btn" disabled={!!socialLoading}>
                {socialLoading==='google' ? <Spin white={false}/> : (
                  <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                )}
                Mit Google anmelden
              </button>
              <button onClick={()=>doSocial('apple')} className="soc-btn soc-btn-apple" disabled={!!socialLoading}>
                {socialLoading==='apple' ? <Spin/> : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                )}
                Mit Apple anmelden
              </button>
            </div>
            <p style={{ textAlign:'center',fontSize:13,color:T.textMut,marginTop:28 }}>
              Noch kein Konto?{' '}
              <span onClick={()=>{reset();setView('register')}} style={{ color:T.greenBr,fontWeight:700,cursor:'pointer' }}>Registrieren</span>
            </p>
          </>)}

          {/* ── REGISTER ──────────────────────────── */}
          {view === 'register' && (<>
            <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:20 }}>
              <button onClick={()=>doSocial('google')} className="soc-btn" disabled={!!socialLoading}>
                {socialLoading==='google' ? <Spin white={false}/> : (
                  <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                )}
                Mit Google registrieren
              </button>
              <button onClick={()=>doSocial('apple')} className="soc-btn soc-btn-apple" disabled={!!socialLoading}>
                {socialLoading==='apple' ? <Spin/> : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                )}
                Mit Apple ID registrieren
              </button>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
              <div style={{ flex:1,height:1,background:T.border }}/>
              <span style={{ fontSize:12,color:T.textMut,fontWeight:700,letterSpacing:'.07em' }}>ODER</span>
              <div style={{ flex:1,height:1,background:T.border }}/>
            </div>
            <FInput label="E-Mail" value={email} onChange={setEmail} type="email" placeholder="deine@email.com"/>
            <FInput label="Passwort" value={pw} onChange={setPw} type="password" placeholder="Mindestens 8 Zeichen"/>
            <FInput label="Passwort bestätigen" value={pw2} onChange={setPw2} type="password" placeholder="Erneut eingeben"/>
            <button onClick={doRegister} disabled={loading} className="prim-btn" style={{ marginTop:10 }}>
              {loading ? <Spin/> : 'Konto erstellen →'}
            </button>
            <p style={{ textAlign:'center',fontSize:13,color:T.textMut,marginTop:24,lineHeight:1.6 }}>
              Bereits ein Konto?{' '}
              <span onClick={()=>{reset();setView('login')}} style={{ color:T.greenBr,fontWeight:700,cursor:'pointer' }}>Einloggen</span>
            </p>
            <p style={{ textAlign:'center',fontSize:11,color:T.textMut,marginTop:14,lineHeight:1.6 }}>
              Mit der Registrierung stimmst du unseren <span style={{ color:T.textSec }}>AGB</span> und der <span style={{ color:T.textSec }}>Datenschutzerklärung</span> zu.
            </p>
          </>)}

          {/* ── DEVELOPER ─────────────────────────── */}
          {view === 'dev' && (<>
            <div style={{ display:'flex',alignItems:'center',gap:10,padding:'12px 16px',
              background:'rgba(46,125,94,.08)',border:'1px solid rgba(46,125,94,.2)',
              borderRadius:12,marginBottom:24 }}>
              <span style={{ width:7,height:7,borderRadius:'50%',background:T.greenBr,
                animation:'pulse 2s infinite',flexShrink:0 }}/>
              <p style={{ fontSize:13,color:T.textSec,margin:0,lineHeight:1.4 }}>
                Kein öffentlicher Zugang · Zuteilung durch Admin
              </p>
            </div>
            <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}`}</style>
            <FInput label="Nutzername" value={devUser} onChange={setDevUser} placeholder="dein-username" autoFocus/>
            <FInput label="PIN" value={devPin} onChange={v=>setDevPin(v.replace(/\D/g,'').slice(0,8))} type="password" placeholder="Numerischer PIN"/>
            <button onClick={doDev} disabled={loading} className="prim-btn" style={{ marginTop:10 }}>
              {loading ? <Spin/> : 'Einloggen →'}
            </button>
            <p style={{ textAlign:'center',fontSize:12,color:T.textMut,marginTop:20,lineHeight:1.6 }}>
              Noch kein Zugang? Wende dich an dein Admin-Team.
            </p>
          </>)}
        </div>
      </div>
    </div>
  )
}
