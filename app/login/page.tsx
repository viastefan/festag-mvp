'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Theme tokens ────────────────────────────────────────────────────────────
const DARK = {
  bg:       '#0E0F0E',
  bgPanel:  '#0E0F0E',
  card:     '#191B19',
  border:   'rgba(255,255,255,0.08)',
  text:     '#F4F5F4',
  textSec:  '#7A8780',
  textMut:  '#3E4642',
  btnPrim:  '#FFFFFF',
  btnPrimText: '#0E0F0E',
  btnSec:   'rgba(255,255,255,0.07)',
  btnSecText: '#F4F5F4',
  btnSecBorder: 'rgba(255,255,255,0.1)',
  inp:      'rgba(255,255,255,0.05)',
  inpBorder:'rgba(255,255,255,0.1)',
  inpFocus: 'rgba(255,255,255,0.15)',
  inpFocusBorder: 'rgba(255,255,255,0.4)',
  glow:     'rgba(255,255,255,0.06)',
  accent:   '#FFFFFF',
  accentSec:'#8FA89C',
  errBg:    'rgba(220,70,70,0.1)',
  errBorder:'rgba(220,70,70,0.2)',
  errText:  '#E07070',
  blkColor: '#0E0F0E',
}

const LIGHT = {
  bg:       '#F8F9F8',
  bgPanel:  '#FFFFFF',
  card:     '#F1F3F1',
  border:   'rgba(0,0,0,0.08)',
  text:     '#0F120F',
  textSec:  '#4A5450',
  textMut:  '#9AA49E',
  btnPrim:  '#323635',
  btnPrimText: '#FFFFFF',
  btnSec:   '#FFFFFF',
  btnSecText: '#323635',
  btnSecBorder: 'rgba(0,0,0,0.12)',
  inp:      '#FFFFFF',
  inpBorder:'rgba(0,0,0,0.12)',
  inpFocus: '#FFFFFF',
  inpFocusBorder: '#323635',
  glow:     'rgba(50,54,53,0.06)',
  accent:   '#323635',
  accentSec:'#5A6460',
  errBg:    '#FEF2F2',
  errBorder:'#FECACA',
  errText:  '#DC2626',
  blkColor: '#FFFFFF',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Guten Morgen.'
  if (h >= 12 && h < 14) return 'Guten Mittag.'
  if (h >= 14 && h < 18) return 'Guten Nachmittag.'
  return 'Guten Abend.'
}

type View = 'home' | 'login' | 'register' | 'dev'
// Widths vary per block, heights sum to EXACTLY 100% — zero gaps guaranteed
// Verschiedene Patterns für visuelles Interesse
const BLOCKS: Record<View, {w:number,h:number}[]> = {
  home: [
    {w:76,h:5},{w:112,h:8},{w:68,h:6},{w:98,h:11},
    {w:120,h:7},{w:80,h:9},{w:104,h:10},{w:88,h:8},
    {w:116,h:9},{w:72,h:7},{w:96,h:13},{w:84,h:7},
  ],// sum=100
  login: [
    {w:82,h:6},{w:110,h:9},{w:70,h:7},{w:100,h:11},
    {w:118,h:8},{w:76,h:10},{w:106,h:6},{w:84,h:9},
    {w:114,h:7},{w:74,h:11},{w:94,h:8},{w:88,h:8},
  ],// sum=100
  register: [
    {w:94,h:7},{w:72,h:8},{w:116,h:10},{w:80,h:9},
    {w:68,h:7},{w:102,h:11},{w:86,h:9},{w:112,h:8},
    {w:76,h:12},{w:98,h:7},{w:88,h:6},{w:104,h:6},
  ],// sum=100
  dev: [
    {w:108,h:8},{w:78,h:10},{w:114,h:7},{w:86,h:9},
    {w:66,h:8},{w:100,h:11},{w:82,h:9},{w:96,h:10},
    {w:120,h:6},{w:74,h:8},{w:92,h:7},{w:88,h:7},
  ],// sum=100
}

function PixelBlocks({ view, color }: { view: View; color: string }) {
  const blocks = BLOCKS[view]
  let top = 0
  const positioned = blocks.map(b => {
    const t = top
    top += b.h
    return { ...b, top: t }
  })
  return (
    <>
      <style>{`
        @keyframes blkIn{from{opacity:0;transform:translateX(60px);}to{opacity:1;transform:translateX(0);}}
        .px-blk{position:absolute;right:0;pointer-events:none;animation:blkIn .5s cubic-bezier(.16,1,.3,1) both;}
      `}</style>
      {positioned.map((b,i) => (
        <div key={i} className="px-blk" style={{
          top:`${b.top}%`, width:b.w, height:`${b.h}%`,
          background:color, animationDelay:`${i*0.025}s`,
        }}/>
      ))}
    </>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────
function FInput({ label,value,onChange,type='text',placeholder='',autoFocus=false,dark }:{
  label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string;autoFocus?:boolean;dark:boolean
}) {
  const T = dark ? DARK : LIGHT
  const [f,setF]=useState(false)
  return (
    <div style={{marginBottom:13}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,letterSpacing:'.1em',
        color:f?T.accent:T.textMut,textTransform:'uppercase',marginBottom:7,transition:'color .15s'}}>
        {label}
      </label>
      <input type={type} value={value} autoFocus={autoFocus}
        onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        placeholder={placeholder}
        style={{width:'100%',padding:'14px 16px',background:f?T.inpFocus:T.inp,
          border:`1.5px solid ${f?T.inpFocusBorder:T.inpBorder}`,borderRadius:13,
          fontSize:16,color:T.text,outline:'none',transition:'all .15s',
          boxShadow:f?`0 0 0 3px ${T.glow}`:'none',fontFamily:'inherit',fontWeight:500,
          caretColor:T.accent}}/>
    </div>
  )
}

function PrimaryBtn({ label,onClick,loading=false,disabled=false,dark }:{
  label:string;onClick:()=>void;loading?:boolean;disabled?:boolean;dark:boolean
}) {
  const T = dark ? DARK : LIGHT
  return (
    <button onClick={onClick} disabled={disabled||loading} style={{
      width:'100%',padding:'16px 24px',background:disabled?T.textMut:T.btnPrim,
      color:T.btnPrimText,fontSize:16,fontWeight:700,borderRadius:14,border:'none',
      cursor:disabled?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',
      gap:10,fontFamily:'inherit',letterSpacing:'-.1px',transition:'all .18s',
      boxShadow:disabled?'none':`0 2px 16px ${T.glow}`,
    }}>
      {loading
        ? <span style={{width:18,height:18,border:`2.5px solid ${dark?'rgba(0,0,0,.2)':'rgba(255,255,255,.3)'}`,
            borderTopColor:T.btnPrimText,borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}}/>
        : label}
    </button>
  )
}

function SecondaryBtn({ label,onClick,dark }:{label:string;onClick:()=>void;dark:boolean}) {
  const T = dark ? DARK : LIGHT
  const [h,setH]=useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{
      width:'100%',padding:'16px 24px',
      background:h?(dark?'rgba(255,255,255,0.11)':'#F1F3F1'):T.btnSec,
      color:T.btnSecText,fontSize:16,fontWeight:700,borderRadius:14,
      border:`1.5px solid ${T.btnSecBorder}`,cursor:'pointer',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontFamily:'inherit',letterSpacing:'-.1px',transition:'all .15s',
    }}>
      {label}
    </button>
  )
}

function SocialBtn({ label,onClick,icon,dark,black=false }:{
  label:string;onClick:()=>void;icon:React.ReactNode;dark:boolean;black?:boolean
}) {
  const T = dark ? DARK : LIGHT
  const [h,setH]=useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{
      width:'100%',padding:'14px 18px',
      background:black
        ? (h?'#1a1a1a':'#000')
        : (h?(dark?'rgba(255,255,255,0.09)':'#EAECEB'):T.inp),
      border:black?'none':`1.5px solid ${h?T.inpFocusBorder:T.inpBorder}`,
      borderRadius:13,color:black?'#fff':T.text,fontSize:15,fontWeight:600,
      display:'flex',alignItems:'center',justifyContent:'center',gap:12,
      cursor:'pointer',fontFamily:'inherit',transition:'all .15s',
    }}>
      {icon}{label}
    </button>
  )
}

function ErrBox({ msg,dark }:{msg:string;dark:boolean}) {
  const T = dark ? DARK : LIGHT
  return (
    <div style={{padding:'12px 16px',background:T.errBg,border:`1px solid ${T.errBorder}`,
      borderRadius:12,fontSize:14,color:T.errText,marginBottom:16,lineHeight:1.5}}>
      {msg}
    </div>
  )
}

function Divider({ dark }:{dark:boolean}) {
  const T = dark ? DARK : LIGHT
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,margin:'18px 0'}}>
      <div style={{flex:1,height:1,background:T.border}}/>
      <span style={{fontSize:11,color:T.textMut,fontWeight:700,letterSpacing:'.08em'}}>ODER</span>
      <div style={{flex:1,height:1,background:T.border}}/>
    </div>
  )
}

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const APPLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
)

function ThemeToggle({ dark, toggle }:{dark:boolean;toggle:()=>void}) {
  return (
    <button onClick={toggle} style={{
      position:'fixed',top:20,right:20,zIndex:100,
      width:40,height:40,borderRadius:12,
      background:dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)',
      border:`1px solid ${dark?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.1)'}`,
      display:'flex',alignItems:'center',justifyContent:'center',
      cursor:'pointer',transition:'all .2s',
    }}>
      {dark
        ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F4F5F4" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#323635" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      }
    </button>
  )
}

// ─── Left image panel ────────────────────────────────────────────────────────
function ImagePanel({ view, dark }: { view: View; dark: boolean }) {
  const T = dark ? DARK : LIGHT
  return (
    <div style={{position:'relative',overflow:'hidden',width:'100%',height:'100%'}}>
      <img src="/bg-office.jpg" alt=""
        style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
      {/* gradient overlay */}
      <div style={{position:'absolute',inset:0,
        background:'linear-gradient(to right, rgba(5,14,10,0.72) 0%, rgba(5,14,10,0.45) 60%, rgba(5,14,10,0.08) 100%), linear-gradient(to top, rgba(5,14,10,0.85) 0%, transparent 55%)',
        pointerEvents:'none'}}/>
      {/* pixel blocks - color matches right panel bg, no gap */}
      <PixelBlocks view={view} color={T.bgPanel}/>
      {/* logo */}
      <div style={{position:'absolute',top:30,left:36,zIndex:2}}>
        <img src="/brand/logo.svg" alt="festag"
          style={{height:21,filter:'brightness(0) invert(1)',opacity:.88}}/>
      </div>
      {/* copy */}
      <div style={{position:'absolute',bottom:52,left:48,right:'18%',zIndex:2}}>
        <h2 style={{fontSize:48,fontWeight:700,color:'#fff',lineHeight:1.1,letterSpacing:'-.8px',
          marginBottom:16,textShadow:'0 2px 30px rgba(0,0,0,.6)'}}>
          {view==='home' ? <>Projekte,<br/>die laufen.</> :
           view==='login' ? <>Schön,<br/>dass du wieder da bist.</> :
           view==='register' ? <>Willkommen<br/>bei Festag.</> :
           <>Team Execution<br/>System.</>}
        </h2>
        <p style={{fontSize:17,fontWeight:500,color:'rgba(255,255,255,.62)',lineHeight:1.6}}>
          {view==='dev'
            ? 'Empfange Tasks. Liefere kontrolliert.'
            : 'Von der Idee zum fertigen Produkt — die KI versteht, plant und liefert.'}
        </p>
      </div>
      <p style={{position:'absolute',bottom:18,left:36,fontSize:11,
        color:'rgba(255,255,255,.22)',letterSpacing:'.06em',zIndex:2}}>
        © 2026 Festag
      </p>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [dark,   setDark]   = useState(true)
  const [view,   setView]   = useState<View>('home')
  const [email,  setEmail]  = useState('')
  const [pw,     setPw]     = useState('')
  const [pw2,    setPw2]    = useState('')
  const [devUser,setDevUser]= useState('')
  const [devPin, setDevPin] = useState('')
  const [error,  setError]  = useState('')
  const [loading,setLoading]= useState(false)
  const [socLoad,setSocLoad]= useState<string|null>(null)
  const sb = createClient()

  useEffect(() => {
    const stored = localStorage.getItem('festag_theme')
    if (stored) setDark(stored === 'dark')
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    localStorage.setItem('festag_theme', next ? 'dark' : 'light')
  }

  function reset() { setError(''); setEmail(''); setPw(''); setPw2('') }
  function go(v: View) { reset(); setView(v) }

  async function doLogin() {
    setError('')
    if (!email||!pw) return setError('Bitte alle Felder ausfüllen.')
    setLoading(true)
    const {error:e} = await sb.auth.signInWithPassword({email,password:pw})
    setLoading(false)
    if (e) return setError('E-Mail oder Passwort falsch.')
    window.location.href='/dashboard'
  }

  async function doRegister() {
    setError('')
    if (!email||!pw) return setError('Bitte alle Felder ausfüllen.')
    if (pw!==pw2) return setError('Passwörter stimmen nicht überein.')
    if (pw.length<8) return setError('Passwort muss mindestens 8 Zeichen haben.')
    setLoading(true)
    const {data,error:e} = await sb.auth.signUp({email,password:pw})
    if (e) { setError(e.message); setLoading(false); return }
    await sb.auth.signInWithPassword({email,password:pw})
    setLoading(false)
    window.location.href='/onboarding'
  }

  async function doSocial(provider:'google'|'apple') {
    setSocLoad(provider)
    const redirect = view==='register'
      ? `${window.location.origin}/onboarding`
      : `${window.location.origin}/dashboard`
    const {error:e} = await sb.auth.signInWithOAuth({provider,options:{redirectTo:redirect}})
    if (e) { setError(e.message); setSocLoad(null) }
  }

  async function doDev() {
    setError('')
    if (!devUser||!devPin) return setError('Nutzername und PIN eingeben.')
    setLoading(true)
    const {data,error:e} = await sb.rpc('verify_dev_pin',{username_input:devUser.trim().toLowerCase(),pin_input:devPin.trim()})
    setLoading(false)
    if (e||!data?.length) return setError('Ungültiger Nutzername oder PIN.')
    localStorage.setItem('festag_dev_session',JSON.stringify({
      user_id:data[0].user_id,user_email:data[0].user_email,
      user_role:data[0].user_role,expires:Date.now()+8*60*60*1000
    }))
    window.location.href='/dev'
  }

  const T = dark ? DARK : LIGHT

  const styles = `
    *{box-sizing:border-box;margin:0;padding:0;}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
    .frm{animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both;}
    input::placeholder{color:${T.textMut};opacity:1;}
    body{background:${T.bg}!important;}

    /* Mobile: stack vertically */
    .l-wrap{display:flex;min-height:100dvh;background:${T.bg};}
    .l-left{display:none;}
    .l-right{flex:1;display:flex;flex-direction:column;background:${T.bgPanel};}

    /* Mobile home: full-height image top, buttons bottom */
    .home-img-mobile{display:block;width:100%;height:55dvh;position:relative;overflow:hidden;flex-shrink:0;}
    .home-btns-mobile{flex:1;display:flex;flex-direction:column;justify-content:flex-end;
      padding:28px 24px calc(env(safe-area-inset-bottom)+36px);}

    @media(min-width:769px){
      .home-img-mobile{display:none!important;}
      .home-btns-mobile{padding:60px 52px;justify-content:center;flex:1;}
      .l-left{display:flex;flex:1.2;min-width:0;}
      .l-right{width:480px;flex:none;padding:0;}
    }
  `

  // ─── HOME ──────────────────────────────────────────────────────────────────
  if (view==='home') return (
    <div style={{minHeight:'100dvh',background:T.bg,fontFamily:"'Aeonik',sans-serif",WebkitFontSmoothing:'antialiased'}}>
      <style>{styles}</style>
      <ThemeToggle dark={dark} toggle={toggleDark}/>

      <div className="l-wrap">
        {/* Desktop left */}
        <div className="l-left"><ImagePanel view="home" dark={dark}/></div>

        {/* Right panel */}
        <div className="l-right">
          {/* Mobile: image on top */}
          <div className="home-img-mobile">
            <img src="/bg-office.jpg" alt=""
              style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>
            <div style={{position:'absolute',inset:0,
              background:'linear-gradient(180deg,rgba(5,14,10,0.2) 0%,rgba(5,14,10,0.82) 100%)'}}/>
            <div style={{position:'absolute',top:20,left:22,zIndex:2}}>
              <img src="/brand/logo.svg" alt="festag"
                style={{height:19,filter:'brightness(0) invert(1)',opacity:.88}}/>
            </div>
            <div style={{position:'absolute',bottom:24,left:22,right:22,zIndex:2}}>
              <h1 style={{fontSize:30,fontWeight:700,color:'#fff',lineHeight:1.15,
                letterSpacing:'-.5px',textShadow:'0 2px 16px rgba(0,0,0,.5)'}}>
                Projekte,<br/>die laufen.
              </h1>
              <p style={{fontSize:14,fontWeight:500,color:'rgba(255,255,255,.65)',marginTop:8,lineHeight:1.5}}>
                Von der Idee zum fertigen Produkt —<br/>die KI versteht, plant und liefert.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="home-btns-mobile">
            {/* Desktop: logo + headline */}
            <div style={{display:'none'}} className="desk-header">
              <img src="/brand/logo.svg" alt="festag"
                style={{height:21,filter:dark?'brightness(0) invert(1)':'none',opacity:.85,marginBottom:48}}/>
              <p style={{fontSize:11,fontWeight:700,letterSpacing:'.14em',color:T.accentSec,
                textTransform:'uppercase',marginBottom:12}}>Willkommen</p>
              <h1 style={{fontSize:36,fontWeight:700,color:T.text,letterSpacing:'-.7px',
                lineHeight:1.15,marginBottom:10}}>Dein Projekt<br/>wartet.</h1>
              <p style={{fontSize:16,color:T.textSec,marginBottom:44,lineHeight:1.6,fontWeight:500}}>
                Starte oder melde dich an.
              </p>
            </div>
            <style>{`.desk-header{display:none!important;}@media(min-width:769px){.desk-header{display:block!important;}}`}</style>

            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <PrimaryBtn label="Jetzt starten" onClick={()=>go('register')} dark={dark}/>
              <SecondaryBtn label="Einloggen" onClick={()=>go('login')} dark={dark}/>
            </div>

            <div style={{marginTop:32,paddingTop:28,borderTop:`1px solid ${T.border}`,textAlign:'center'}}>
              <span onClick={()=>go('dev')} style={{fontSize:13,color:T.textMut,cursor:'pointer',
                fontWeight:600,letterSpacing:'-.1px'}}>
                Als Dev'ler einloggen →
              </span>
            </div>

            <p style={{textAlign:'center',fontSize:11,color:T.textMut,marginTop:28,letterSpacing:'.05em'}}>
              AI plant · Menschen bauen · System verbindet
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── LOGIN / REGISTER / DEV ──────────────────────────────────────────────────

  return (
    <div style={{minHeight:'100dvh',background:T.bg,fontFamily:"'Aeonik',sans-serif",WebkitFontSmoothing:'antialiased',display:'flex'}}>
      <style>{styles}</style>
      <ThemeToggle dark={dark} toggle={toggleDark}/>

      {/* Desktop: image left */}
      <div className="l-left"><ImagePanel view={view} dark={dark}/></div>

      {/* Form panel */}
      <div style={{
        width:'100%',maxWidth:'100%',
        background:T.bgPanel,display:'flex',flexDirection:'column',justifyContent:'center',
        padding:'calc(env(safe-area-inset-top)+24px) 24px calc(env(safe-area-inset-bottom)+40px)',
      }}
        className="l-right"
      >
        <style>{`@media(min-width:769px){.l-right{width:480px!important;flex:none!important;padding:60px 52px!important;}}`}</style>

        {/* Back */}
        <button onClick={()=>go('home')} style={{
          background:'transparent',border:'none',color:T.textMut,fontSize:13,
          cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:6,
          marginBottom:36,fontFamily:'inherit',fontWeight:600,width:'fit-content',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Zurück
        </button>

        <div className="frm">
          {/* Headline — nur Greeting oder Aktion */}
          {(() => {
            const isDev = view==='dev'
            const isReg = view==='register'
            const h = isDev ? 'Systemzugang.' : isReg ? 'Konto erstellen.' : getGreeting()
            const sub = isDev ? 'Nur für verifizierte Festag Developer.'
              : isReg ? 'Starte oder melde dich an.'
              : 'Von der Idee zum fertigen Produkt — die KI versteht, plant und liefert.'
            return (
              <>
                <h1 style={{fontSize:40,fontWeight:700,color:T.text,letterSpacing:'-.8px',
                  lineHeight:1.1,marginBottom:14}}>
                  {h}
                </h1>
                <p style={{fontSize:16,color:T.textSec,marginBottom:32,lineHeight:1.55,fontWeight:500}}>
                  {sub}
                </p>
              </>
            )
          })()}

          {error && <ErrBox msg={error} dark={dark}/>}

          {/* ── LOGIN ───────────────────────────────────── */}
          {view==='login' && (<>
            <FInput label="E-Mail" value={email} onChange={setEmail} type="email" placeholder="deine@email.com" autoFocus dark={dark}/>
            <FInput label="Passwort" value={pw} onChange={setPw} type="password" placeholder="Dein Passwort" dark={dark}/>
            <div style={{marginTop:10,marginBottom:18}}>
              <PrimaryBtn label="Anmelden →" onClick={doLogin} loading={loading} dark={dark}/>
            </div>
            <Divider dark={dark}/>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <SocialBtn label="Mit Google anmelden" onClick={()=>doSocial('google')} icon={GOOGLE_ICON} dark={dark} disabled={!!socLoad}/>
              <SocialBtn label="Mit Apple anmelden" onClick={()=>doSocial('apple')} icon={APPLE_ICON} dark={dark} black/>
            </div>
            <p style={{textAlign:'center',fontSize:13,color:T.textMut,marginTop:24}}>
              Noch kein Konto?{' '}
              <span onClick={()=>go('register')} style={{color:T.accent,fontWeight:700,cursor:'pointer'}}>Registrieren</span>
            </p>
          </>)}

          {/* ── REGISTER ────────────────────────────────── */}
          {view==='register' && (<>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:4}}>
              <SocialBtn label="Mit Google registrieren" onClick={()=>doSocial('google')} icon={GOOGLE_ICON} dark={dark} disabled={!!socLoad}/>
              <SocialBtn label="Mit Apple ID registrieren" onClick={()=>doSocial('apple')} icon={APPLE_ICON} dark={dark} black/>
            </div>
            <Divider dark={dark}/>
            <FInput label="E-Mail" value={email} onChange={setEmail} type="email" placeholder="deine@email.com" dark={dark}/>
            <FInput label="Passwort" value={pw} onChange={setPw} type="password" placeholder="Mindestens 8 Zeichen" dark={dark}/>
            <FInput label="Passwort bestätigen" value={pw2} onChange={setPw2} type="password" placeholder="Erneut eingeben" dark={dark}/>
            <div style={{marginTop:10}}>
              <PrimaryBtn label="Konto erstellen →" onClick={doRegister} loading={loading} dark={dark}/>
            </div>
            <p style={{textAlign:'center',fontSize:13,color:T.textMut,marginTop:20}}>
              Bereits ein Konto?{' '}
              <span onClick={()=>go('login')} style={{color:T.accent,fontWeight:700,cursor:'pointer'}}>Einloggen</span>
            </p>
            <p style={{textAlign:'center',fontSize:11,color:T.textMut,marginTop:12,lineHeight:1.6}}>
              Mit der Registrierung stimmst du unseren <span style={{color:T.textSec}}>AGB</span> und der <span style={{color:T.textSec}}>Datenschutzerklärung</span> zu.
            </p>
          </>)}

          {/* ── DEV ─────────────────────────────────────── */}
          {view==='dev' && (<>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 15px',
              background:dark?'rgba(255,255,255,0.04)':T.card,
              border:`1px solid ${T.border}`,borderRadius:12,marginBottom:22}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#34A06E',
                animation:'pulse 2s infinite',flexShrink:0}}/>
              <p style={{fontSize:13,color:T.textSec,margin:0,lineHeight:1.4}}>
                Kein öffentlicher Zugang · Zuteilung durch Admin
              </p>
            </div>
            <FInput label="Nutzername" value={devUser} onChange={setDevUser} placeholder="dein-username" autoFocus dark={dark}/>
            <FInput label="PIN" value={devPin} onChange={v=>setDevPin(v.replace(/\D/g,'').slice(0,8))} type="password" placeholder="Numerischer PIN" dark={dark}/>
            <div style={{marginTop:10}}>
              <PrimaryBtn label="Einloggen →" onClick={doDev} loading={loading} dark={dark}/>
            </div>
            <p style={{textAlign:'center',fontSize:12,color:T.textMut,marginTop:18,lineHeight:1.6}}>
              Noch kein Zugang? Wende dich an dein Admin-Team.
            </p>
          </>)}
        </div>
      </div>
    </div>
  )
}
