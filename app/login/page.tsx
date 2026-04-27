'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'
import { getTheme } from '@/lib/theme'

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Guten Morgen.'
  if (h >= 12 && h < 14) return 'Guten Mittag.'
  if (h >= 14 && h < 18) return 'Guten Nachmittag.'
  return 'Guten Abend.'
}

function getGreetingSub() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Lass uns heute etwas bauen.'
  if (h >= 12 && h < 14) return 'Zeit, Fortschritt zu machen.'
  if (h >= 14 && h < 18) return 'Dein Projekt wartet auf dich.'
  return 'Starte oder melde dich an.'
}

type View = 'home'|'login'|'register'|'dev'

function getPanelBg(theme: string) {
  if (theme === 'light') return '#f4f5f4'
  if (theme === 'read') return '#efe7dc'
  return '#0f1412'
}

const BLOCKS: Record<View,{w:number,h:number}[]> = {
  home:    [{w:76,h:5},{w:112,h:8},{w:68,h:6},{w:98,h:11},{w:120,h:7},{w:80,h:9},{w:104,h:10},{w:88,h:8},{w:116,h:9},{w:72,h:7},{w:96,h:13},{w:84,h:7}],
  login:   [{w:82,h:6},{w:110,h:9},{w:70,h:7},{w:100,h:11},{w:118,h:8},{w:76,h:10},{w:106,h:6},{w:84,h:9},{w:114,h:7},{w:74,h:11},{w:94,h:8},{w:88,h:8}],
  register:[{w:94,h:7},{w:72,h:8},{w:116,h:10},{w:80,h:9},{w:68,h:7},{w:102,h:11},{w:86,h:9},{w:112,h:8},{w:76,h:12},{w:98,h:7},{w:88,h:6},{w:104,h:6}],
  dev:     [{w:108,h:8},{w:78,h:10},{w:114,h:7},{w:86,h:9},{w:66,h:8},{w:100,h:11},{w:82,h:9},{w:96,h:10},{w:120,h:6},{w:74,h:8},{w:92,h:7},{w:88,h:7}],
}

// ─────────────────────────────────────────────
// MOBILE PIXELS
// ─────────────────────────────────────────────
function PixelBlocksMobile() {
  const [bg, setBg] = useState('#000')

  useEffect(() => {
    const update = () => {
      const theme = localStorage.getItem('festag_theme') || 'dark'
      setBg(getPanelBg(theme))
    }
    update()
    window.addEventListener('festag-theme', update)
    return () => window.removeEventListener('festag-theme', update)
  }, [])

  const rows = [
    { bottom: 0, h: 14, w: '100%' },
    { bottom: 14, h: 10, w: '78%' },
    { bottom: 24, h: 8, w: '92%' },
    { bottom: 32, h: 6, w: '64%' },
    { bottom: 38, h: 5, w: '84%' },
    { bottom: 43, h: 4, w: '52%' },
    { bottom: 47, h: 3, w: '70%' },
    { bottom: 50, h: 2.5, w: '38%' },
  ]

  return (
    <>
      {rows.map((b, i) => (
        <div key={i} className="px-mob" style={{
          position:'absolute',
          left:0,
          bottom:`${b.bottom}px`,
          width:b.w,
          height:`${b.h}px`,
          background:bg,
          zIndex:3
        }}/>
      ))}
    </>
  )
}

// ─────────────────────────────────────────────
// DESKTOP IMAGE PANEL
// ─────────────────────────────────────────────
function ImagePanel({ view }: { view: View }) {
  return (
    <div style={{position:'relative',width:'100%',height:'100%',overflow:'hidden'}}>
      <img src="/bg-office.jpg" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to right,rgba(0,0,0,.7),transparent)'}}/>
    </div>
  )
}

// ─────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────
function FInput({label,value,onChange,type='text'}:{
  label:string,value:string,onChange:(v:string)=>void,type?:string
}) {
  return (
    <div style={{marginBottom:12}}>
      <label style={{fontSize:12,display:'block',marginBottom:6}}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e=>onChange(e.target.value)}
        style={{width:'100%',padding:12,borderRadius:10,border:'1px solid #333'}}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN CSS (FIXED)
// ─────────────────────────────────────────────
const MOBILE_CSS = `
@keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}

.l-wrap{display:flex;min-height:100vh}
.l-left{flex:1}
.l-right{flex:1}

@media(max-width:768px){
  .l-left{display:none}
}
`

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
export default function LoginPage() {
  const [view,setView]=useState<View>('home')
  const [email,setEmail]=useState('')
  const [pw,setPw]=useState('')
  const [pw2,setPw2]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)

  const sb=createClient()

  async function login(){
    setLoading(true)
    const {error}=await sb.auth.signInWithPassword({email,password:pw})
    setLoading(false)
    if(error) return setError('Login fehlgeschlagen')
    location.href='/dashboard'
  }

  async function register(){
    setLoading(true)
    const {error}=await sb.auth.signUp({email,password:pw})
    setLoading(false)
    if(error) return setError(error.message)
    location.href='/onboarding'
  }

  if(view==='home'){
    return(
      <div>
        <style>{MOBILE_CSS}</style>
        <ThemeToggle/>
        <div className="l-wrap">
          <div className="l-left"><ImagePanel view="home"/></div>

          <div className="l-right">
            <button onClick={()=>setView('login')}>Login</button>
            <button onClick={()=>setView('register')}>Register</button>
          </div>
        </div>
      </div>
    )
  }

  return(
    <div>
      <style>{MOBILE_CSS}</style>

      <div style={{padding:40}}>
        <button onClick={()=>setView('home')}>← Back</button>

        {view==='login'&&(
          <>
            <FInput label="Email" value={email} onChange={setEmail}/>
            <FInput label="Passwort" value={pw} onChange={setPw} type="password"/>
            <button onClick={login} disabled={loading}>Login</button>
          </>
        )}

        {view==='register'&&(
          <>
            <FInput label="Email" value={email} onChange={setEmail}/>
            <FInput label="Passwort" value={pw} onChange={setPw} type="password"/>
            <FInput label="Repeat" value={pw2} onChange={setPw2} type="password"/>
            <button onClick={register} disabled={loading}>Register</button>
          </>
        )}

        {error && <p style={{color:'red'}}>{error}</p>}
      </div>
    </div>
  )
}
