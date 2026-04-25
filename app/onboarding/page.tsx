'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const T = {
  bg:'#0E0F0E', surface:'#161917', card:'#1C1F1C',
  border:'rgba(255,255,255,0.08)', borderHover:'rgba(255,255,255,0.14)',
  accent:'#323635', text:'#F5F6F5', textSec:'#8A9490', textMut:'#505850',
  green:'#2E7D5E', greenBright:'#34A06E', greenGlow:'rgba(46,125,94,0.22)',
}

type Step = 'auth'|'name'|'company'|'phone'|'verify'|'notifs'|'photo'
const STEPS: Step[] = ['auth','name','company','phone','verify','notifs','photo']

function ProgressBar({ step }:{ step:Step }) {
  const idx = STEPS.indexOf(step)
  return (
    <div style={{ display:'flex', gap:5, marginBottom:36 }}>
      {STEPS.map((_,i) => (
        <div key={i} style={{ flex:1, height:3, borderRadius:2,
          background: i<=idx ? T.green : 'rgba(255,255,255,0.1)',
          transition:'background .4s ease' }}/>
      ))}
    </div>
  )
}

function BackBtn({ onBack }:{ onBack:()=>void }) {
  return (
    <button onClick={onBack} style={{ width:40,height:40,borderRadius:12,
      background:T.card,border:`1px solid ${T.border}`,display:'flex',
      alignItems:'center',justifyContent:'center',marginBottom:28,cursor:'pointer' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.textSec} strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
  )
}

function FInput({ label, value, onChange, type='text', placeholder='', autoFocus=false }:{
  label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string;autoFocus?:boolean
}) {
  const [f,setF] = useState(false)
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block',fontSize:11,fontWeight:700,letterSpacing:'.1em',
        color:f?T.greenBright:T.textMut,textTransform:'uppercase',marginBottom:7,transition:'color .15s' }}>
        {label}
      </label>
      <input type={type} value={value} autoFocus={autoFocus}
        onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        placeholder={placeholder}
        style={{ width:'100%',padding:'15px 16px',background:f?T.card:'rgba(255,255,255,0.03)',
          border:`1.5px solid ${f?T.green:T.border}`,borderRadius:14,fontSize:17,color:T.text,
          outline:'none',transition:'all .15s',boxShadow:f?`0 0 0 3px ${T.greenGlow}`:'none',
          fontFamily:'inherit',fontWeight:500,caretColor:T.greenBright }}/>
    </div>
  )
}

function PrimaryBtn({ label, onClick, disabled=false, loading=false }:{
  label:string;onClick:()=>void;disabled?:boolean;loading?:boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled||loading} style={{
      width:'100%',padding:'17px 24px',
      background:disabled?'rgba(255,255,255,0.08)':`linear-gradient(135deg,${T.green} 0%,${T.greenBright} 100%)`,
      color:disabled?T.textMut:'#fff',fontSize:16,fontWeight:700,borderRadius:16,
      border:'none',cursor:disabled?'default':'pointer',display:'flex',alignItems:'center',
      justifyContent:'center',gap:10,fontFamily:'inherit',letterSpacing:'-.1px',
      boxShadow:disabled?'none':`0 4px 24px ${T.greenGlow}`,transition:'all .2s',
    }}>
      {loading
        ? <span style={{ width:20,height:20,border:'2.5px solid rgba(255,255,255,.25)',
            borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block' }}/>
        : label}
    </button>
  )
}

function SocialBtn({ label, onClick, icon, black=false }:{
  label:string;onClick:()=>void;icon:React.ReactNode;black?:boolean
}) {
  const [h,setH]=useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ width:'100%',padding:'15px 20px',
        background:black?(h?'#111':'#000'):(h?T.card:'rgba(255,255,255,0.04)'),
        border:`1.5px solid ${h?T.borderHover:T.border}`,borderRadius:14,
        color:'#fff',fontSize:15,fontWeight:600,display:'flex',alignItems:'center',
        justifyContent:'center',gap:12,cursor:'pointer',transition:'all .15s',
        fontFamily:'inherit',boxShadow:h?'0 4px 20px rgba(0,0,0,.4)':'none' }}>
      {icon}{label}
    </button>
  )
}

function OTPInput({ value,onChange }:{value:string;onChange:(v:string)=>void}) {
  const refs = useRef<(HTMLInputElement|null)[]>([])
  const digits = value.split('').concat(Array(6).fill('')).slice(0,6)
  function hk(i:number,e:React.KeyboardEvent<HTMLInputElement>) {
    if(e.key==='Backspace'&&!digits[i]&&i>0) refs.current[i-1]?.focus()
  }
  function hc(i:number,v:string) {
    const d=v.replace(/\D/g,'').slice(-1)
    const nd=[...digits];nd[i]=d;onChange(nd.join(''))
    if(d&&i<5) refs.current[i+1]?.focus()
  }
  return (
    <div style={{ display:'flex',gap:10,justifyContent:'center',margin:'28px 0' }}>
      {digits.map((d,i)=>(
        <input key={i} ref={el=>refs.current[i]=el} type="tel" maxLength={1} value={d}
          onChange={e=>hc(i,e.target.value)} onKeyDown={e=>hk(i,e)}
          style={{ width:50,height:60,textAlign:'center',fontSize:24,fontWeight:700,
            background:d?T.card:'rgba(255,255,255,0.03)',
            border:`1.5px solid ${d?T.green:T.border}`,borderRadius:14,color:T.text,
            outline:'none',fontFamily:'inherit',
            boxShadow:d?`0 0 0 3px ${T.greenGlow}`:'none',transition:'all .15s' }}/>
      ))}
    </div>
  )
}

function Toggle({ on,setOn }:{on:boolean;setOn:(v:boolean)=>void}) {
  return (
    <div onClick={()=>setOn(!on)} style={{ width:44,height:26,borderRadius:13,
      background:on?T.green:'rgba(255,255,255,0.1)',position:'relative',cursor:'pointer',transition:'all .2s',flexShrink:0 }}>
      <div style={{ position:'absolute',top:3,left:on?21:3,width:20,height:20,borderRadius:10,
        background:'#fff',transition:'left .2s cubic-bezier(.16,1,.3,1)',boxShadow:'0 1px 4px rgba(0,0,0,.4)' }}/>
    </div>
  )
}

function NRow({ title,desc,on,setOn }:{title:string;desc:string;on:boolean;setOn:(v:boolean)=>void}) {
  return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,
      padding:'17px 18px',background:T.card,borderRadius:14,border:`1px solid ${T.border}`,marginBottom:10 }}>
      <div>
        <p style={{ fontSize:15,fontWeight:700,color:T.text,marginBottom:3 }}>{title}</p>
        <p style={{ fontSize:13,color:T.textSec,lineHeight:1.45 }}>{desc}</p>
      </div>
      <Toggle on={on} setOn={setOn}/>
    </div>
  )
}

export default function OnboardingPage() {
  const supabase = createClient()
  const [step, setStep] = useState<Step>('auth')
  const [userId, setUserId] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); const [pw2,setPw2]=useState('')
  const [first,setFirst]=useState(''); const [last,setLast]=useState('')
  const [company,setCompany]=useState(''); const [compDesc,setCompDesc]=useState('')
  const [compSize,setCompSize]=useState(''); const [website,setWebsite]=useState('')
  const [phone,setPhone]=useState(''); const [otp,setOtp]=useState(''); const [cd,setCd]=useState(0)
  const [nAI,setNAI]=useState(true); const [nDev,setNDev]=useState(true)
  const [nProj,setNProj]=useState(true); const [nBill,setNBill]=useState(true)
  const [photoFile,setPhotoFile]=useState<File|null>(null); const [photoUrl,setPhotoUrl]=useState('')

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      if(data.session){
        setUserId(data.session.user.id); setEmail(data.session.user.email??'')
        supabase.from('profiles').select('onboarding_completed,first_name').eq('id',data.session.user.id).single()
          .then(({data:p})=>{ if(p?.onboarding_completed) window.location.href='/dashboard'; else if(p?.first_name) setStep('company'); else setStep('name') })
      }
    })
  },[])

  useEffect(()=>{
    if(cd<=0) return; const t=setTimeout(()=>setCd(c=>c-1),1000); return ()=>clearTimeout(t)
  },[cd])

  const back=()=>{
    const m:Record<Step,Step>={auth:'auth',name:'auth',company:'name',phone:'company',verify:'phone',notifs:'verify',photo:'notifs'}
    setStep(m[step]); setErr('')
  }

  async function socialAuth(p:'google'|'apple'){
    const {error}=await supabase.auth.signInWithOAuth({provider:p,options:{redirectTo:`${window.location.origin}/onboarding`}})
    if(error) setErr(error.message)
  }

  async function doRegister(){
    setErr('')
    if(!email||!pw) return setErr('Bitte alle Felder ausfüllen.')
    if(pw!==pw2) return setErr('Passwörter stimmen nicht überein.')
    if(pw.length<8) return setErr('Passwort muss mindestens 8 Zeichen haben.')
    setLoading(true)
    const {data,error}=await supabase.auth.signUp({email,password:pw})
    setLoading(false)
    if(error) return setErr(error.message)
    if(data.user){setUserId(data.user.id);setStep('name')}
  }

  async function saveName(){
    if(!first.trim()) return setErr('Vorname erforderlich.')
    setErr('');setLoading(true)
    await supabase.from('profiles').upsert({id:userId,first_name:first,last_name:last,onboarding_step:1})
    setLoading(false);setStep('company')
  }

  async function saveCompany(){
    setLoading(true)
    await supabase.from('profiles').update({company_name:company,company_description:compDesc,company_size:compSize,website:website,onboarding_step:2}).eq('id',userId)
    setLoading(false);setStep('phone')
  }

  async function sendOTP(){
    if(!phone.trim()) return setErr('Bitte Telefonnummer eingeben.')
    setErr('');setLoading(true)
    const {error}=await supabase.auth.signInWithOtp({phone:`+49${phone.replace(/^0/,'')}`})
    setLoading(false)
    if(error) return setErr('SMS konnte nicht gesendet werden.')
    setCd(60);setStep('verify')
  }

  async function verifyOTP(){
    if(otp.length<6) return setErr('Bitte 6-stelligen Code eingeben.')
    setErr('');setLoading(true)
    const {error}=await supabase.auth.verifyOtp({phone:`+49${phone.replace(/^0/,'')}`,token:otp,type:'sms'})
    setLoading(false)
    if(error) return setErr('Ungültiger Code.')
    await supabase.from('profiles').update({phone:`+49${phone.replace(/^0/,'')}`,phone_verified:true,onboarding_step:3}).eq('id',userId)
    setStep('notifs')
  }

  async function saveNotifs(){
    setLoading(true)
    await supabase.from('profiles').update({notification_ai_updates:nAI,notification_developer_activity:nDev,notification_project_updates:nProj,notification_billing:nBill,onboarding_step:4}).eq('id',userId)
    if('Notification' in window&&Notification.permission==='default') await Notification.requestPermission()
    setLoading(false);setStep('photo')
  }

  async function finish(){
    setLoading(true)
    let pUrl=''
    if(photoFile){
      const ext=photoFile.name.split('.').pop()
      const path=`${userId}/avatar.${ext}`
      const {data:ud}=await supabase.storage.from('avatars').upload(path,photoFile,{upsert:true})
      if(ud){const {data:{publicUrl}}=supabase.storage.from('avatars').getPublicUrl(path);pUrl=publicUrl}
    }
    await supabase.from('profiles').update({profile_photo_url:pUrl||undefined,onboarding_completed:true,onboarding_step:8}).eq('id',userId)
    setLoading(false);window.location.href='/dashboard'
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
        .ob{animation:fadeUp .32s cubic-bezier(.16,1,.3,1) both;}
        body{background:${T.bg}!important;}
        input::placeholder{color:${T.textMut};opacity:1;}
        textarea{resize:vertical;min-height:96px;}
        select{-webkit-appearance:none;appearance:none;}
        .skip{width:100%;padding:14px;text-align:center;color:${T.textMut};font-size:14px;font-weight:600;cursor:pointer;background:none;border:none;font-family:inherit;margin-top:10px;letter-spacing:-.1px;}
      `}</style>

      <div style={{ minHeight:'100dvh',background:T.bg,fontFamily:"'Aeonik',sans-serif",WebkitFontSmoothing:'antialiased' }}>
        <div style={{ maxWidth:440,margin:'0 auto',padding:`calc(20px + env(safe-area-inset-top)) 24px calc(48px + env(safe-area-inset-bottom))` }}>

          {step!=='auth' && <BackBtn onBack={back}/>}
          {step!=='auth' && <ProgressBar step={step}/>}
          {err && (
            <div style={{ background:'rgba(224,85,85,.1)',border:'1px solid rgba(224,85,85,.2)',borderRadius:12,padding:'12px 16px',fontSize:14,color:'#E07070',marginBottom:16,lineHeight:1.5 }}>
              {err}
            </div>
          )}

          {/* ─── AUTH ─────────────────────────────────── */}
          {step==='auth' && (
            <div className="ob">
              <div style={{ marginBottom:44,marginTop:4 }}>
                <img src="/brand/logo.svg" alt="festag" style={{ height:22,filter:'brightness(0) invert(1)',opacity:.85 }}/>
              </div>
              <h1 style={{ fontSize:32,fontWeight:700,color:T.text,letterSpacing:'-.7px',lineHeight:1.15,marginBottom:10 }}>
                Erstelle<br/>dein Konto.
              </h1>
              <p style={{ fontSize:16,color:T.textSec,marginBottom:36,lineHeight:1.55,fontWeight:500 }}>
                Beschreibe dein Projekt —<br/>Festag macht den Rest.
              </p>

              <SocialBtn label="Mit Google registrieren" onClick={()=>socialAuth('google')} icon={
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              }/>
              <div style={{ height:10 }}/>
              <SocialBtn label="Mit Apple ID registrieren" onClick={()=>socialAuth('apple')} black icon={
                <svg width="19" height="19" viewBox="0 0 24 24" fill="#fff"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              }/>

              <div style={{ display:'flex',alignItems:'center',gap:12,margin:'22px 0' }}>
                <div style={{ flex:1,height:1,background:T.border }}/><span style={{ fontSize:12,color:T.textMut,fontWeight:700,letterSpacing:'.07em' }}>ODER</span><div style={{ flex:1,height:1,background:T.border }}/>
              </div>

              <FInput label="E-Mail" value={email} onChange={setEmail} type="email" placeholder="deine@email.com"/>
              <FInput label="Passwort" value={pw} onChange={setPw} type="password" placeholder="Mindestens 8 Zeichen"/>
              <FInput label="Passwort bestätigen" value={pw2} onChange={setPw2} type="password" placeholder="Erneut eingeben"/>
              <div style={{ marginTop:10 }}><PrimaryBtn label="Konto erstellen" onClick={doRegister} loading={loading}/></div>

              <p style={{ textAlign:'center',fontSize:13,color:T.textMut,marginTop:24,lineHeight:1.6 }}>
                Bereits ein Konto?{' '}
                <span onClick={()=>window.location.href='/login'} style={{ color:T.greenBright,fontWeight:700,cursor:'pointer' }}>Einloggen</span>
              </p>
              <p style={{ textAlign:'center',fontSize:11,color:T.textMut,marginTop:16,lineHeight:1.6 }}>
                Mit der Registrierung stimmst du unseren <span style={{ color:T.textSec }}>AGB</span> und der <span style={{ color:T.textSec }}>Datenschutzerklärung</span> zu.
              </p>
            </div>
          )}

          {/* ─── NAME ─────────────────────────────────── */}
          {step==='name' && (
            <div className="ob">
              <div style={{ width:52,height:52,borderRadius:16,background:T.card,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.greenBright} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <h1 style={{ fontSize:30,fontWeight:700,color:T.text,letterSpacing:'-.6px',lineHeight:1.2,marginBottom:8 }}>Wie heißt du?</h1>
              <p style={{ fontSize:16,color:T.textSec,marginBottom:32,lineHeight:1.5,fontWeight:500 }}>Damit wir dich richtig ansprechen können.</p>
              <FInput label="Vorname" value={first} onChange={setFirst} placeholder="Max" autoFocus/>
              <FInput label="Nachname (Optional)" value={last} onChange={setLast} placeholder="Mustermann"/>
              <div style={{ marginTop:10 }}><PrimaryBtn label="Weiter" onClick={saveName} loading={loading} disabled={!first.trim()}/></div>
            </div>
          )}

          {/* ─── COMPANY ──────────────────────────────── */}
          {step==='company' && (
            <div className="ob">
              <div style={{ width:52,height:52,borderRadius:16,background:T.card,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.greenBright} strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              </div>
              <h1 style={{ fontSize:30,fontWeight:700,color:T.text,letterSpacing:'-.6px',lineHeight:1.2,marginBottom:8 }}>Dein Unternehmen.</h1>
              <p style={{ fontSize:16,color:T.textSec,marginBottom:32,lineHeight:1.5,fontWeight:500 }}>Diese Infos helfen der AI dein Projekt zu verstehen.</p>
              <FInput label="Firmenname (Optional)" value={company} onChange={setCompany} placeholder="Musterfirma GmbH" autoFocus/>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block',fontSize:11,fontWeight:700,letterSpacing:'.1em',color:T.textMut,textTransform:'uppercase',marginBottom:7 }}>UNTERNEHMENSBESCHREIBUNG</label>
                <textarea value={compDesc} onChange={e=>setCompDesc(e.target.value)} placeholder="Was macht dein Unternehmen? Welche Branche, welche Ziele?"
                  style={{ width:'100%',minHeight:96,padding:'15px 16px',background:'rgba(255,255,255,0.03)',border:`1.5px solid ${T.border}`,borderRadius:14,fontSize:15,color:T.text,outline:'none',fontFamily:'inherit',fontWeight:500,resize:'vertical' }}/>
                <p style={{ fontSize:12,color:T.textMut,marginTop:5 }}>Wichtig für die AI-Analyse deines Projekts.</p>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block',fontSize:11,fontWeight:700,letterSpacing:'.1em',color:T.textMut,textTransform:'uppercase',marginBottom:7 }}>UNTERNEHMENSGRÖSSE (OPTIONAL)</label>
                <select value={compSize} onChange={e=>setCompSize(e.target.value)}
                  style={{ width:'100%',padding:'15px 16px',background:'rgba(255,255,255,0.03)',border:`1.5px solid ${T.border}`,borderRadius:14,fontSize:16,color:T.text,outline:'none',fontFamily:'inherit',fontWeight:500,cursor:'pointer' }}>
                  <option value="">Bitte wählen</option>
                  <option value="1-5">1–5 Mitarbeiter</option>
                  <option value="6-20">6–20 Mitarbeiter</option>
                  <option value="21-100">21–100 Mitarbeiter</option>
                  <option value="101-500">101–500 Mitarbeiter</option>
                  <option value="500+">500+ Mitarbeiter</option>
                </select>
              </div>
              <FInput label="Website (Optional)" value={website} onChange={setWebsite} placeholder="https://deine-website.de" type="url"/>
              <div style={{ marginTop:10 }}><PrimaryBtn label="Weiter" onClick={saveCompany} loading={loading}/></div>
              <button className="skip" onClick={()=>setStep('phone')}>Überspringen</button>
            </div>
          )}

          {/* ─── PHONE ────────────────────────────────── */}
          {step==='phone' && (
            <div className="ob">
              <div style={{ width:52,height:52,borderRadius:16,background:T.card,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.greenBright} strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.86a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>
              </div>
              <h1 style={{ fontSize:30,fontWeight:700,color:T.text,letterSpacing:'-.6px',lineHeight:1.2,marginBottom:8 }}>Deine Telefon-nummer.</h1>
              <p style={{ fontSize:16,color:T.textSec,marginBottom:32,lineHeight:1.5,fontWeight:500 }}>Wir schicken dir einen Code zur Verifizierung.</p>
              <div style={{ display:'flex',gap:10,marginBottom:12 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,padding:'15px 14px',background:'rgba(255,255,255,0.04)',border:`1.5px solid ${T.border}`,borderRadius:14,fontSize:15,color:T.text,fontWeight:600,flexShrink:0,whiteSpace:'nowrap' }}>🇩🇪 +49</div>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="170 555 0199" autoFocus
                  style={{ flex:1,padding:'15px 16px',background:'rgba(255,255,255,0.03)',border:`1.5px solid ${T.border}`,borderRadius:14,fontSize:17,color:T.text,outline:'none',fontFamily:'inherit',fontWeight:500 }}/>
              </div>
              <p style={{ fontSize:12,color:T.textMut,marginBottom:28,lineHeight:1.6 }}>Mit Fortfahren akzeptierst du unsere <span style={{ color:T.textSec }}>AGB</span> und <span style={{ color:T.textSec }}>Datenschutz</span>.</p>
              <PrimaryBtn label="Code senden" onClick={sendOTP} loading={loading} disabled={!phone.trim()}/>
              <button className="skip" onClick={()=>setStep('notifs')}>Überspringen</button>
            </div>
          )}

          {/* ─── VERIFY ───────────────────────────────── */}
          {step==='verify' && (
            <div className="ob">
              <div style={{ width:52,height:52,borderRadius:16,background:T.card,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.greenBright} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h1 style={{ fontSize:30,fontWeight:700,color:T.text,letterSpacing:'-.6px',lineHeight:1.2,marginBottom:8 }}>Code eingeben.</h1>
              <p style={{ fontSize:16,color:T.textSec,marginBottom:8,lineHeight:1.5,fontWeight:500 }}>Gesendet an <span style={{ color:T.text,fontWeight:700 }}>+49 {phone}</span></p>
              <OTPInput value={otp} onChange={setOtp}/>
              <PrimaryBtn label="Verifizieren" onClick={verifyOTP} loading={loading} disabled={otp.length<6}/>
              <p style={{ textAlign:'center',fontSize:13,color:T.textMut,marginTop:20,lineHeight:1.6 }}>
                Nichts erhalten?{' '}
                {cd>0
                  ? <span style={{ color:T.textSec }}>Erneut in 0:{String(cd).padStart(2,'0')}</span>
                  : <span onClick={sendOTP} style={{ color:T.greenBright,fontWeight:700,cursor:'pointer' }}>Erneut senden</span>}
              </p>
            </div>
          )}

          {/* ─── NOTIFS ───────────────────────────────── */}
          {step==='notifs' && (
            <div className="ob">
              <div style={{ width:52,height:52,borderRadius:16,background:T.card,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.greenBright} strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <h1 style={{ fontSize:30,fontWeight:700,color:T.text,letterSpacing:'-.6px',lineHeight:1.2,marginBottom:8 }}>Benachrichtigungen.</h1>
              <p style={{ fontSize:16,color:T.textSec,marginBottom:28,lineHeight:1.5,fontWeight:500 }}>Wähle was für dich wichtig ist.</p>
              <NRow title="AI Updates & Tagesberichte" desc="Wenn Tagro Berichte für dich erstellt" on={nAI} setOn={setNAI}/>
              <NRow title="Developer-Aktivität" desc="Tasks erledigt oder aktiv im Sprint" on={nDev} setOn={setNDev}/>
              <NRow title="Projekt-Statuswechsel" desc="Phasenwechsel in deinem Projekt" on={nProj} setOn={setNProj}/>
              <NRow title="Rechnungen & Zahlungen" desc="Neue Rechnungen oder Bestätigungen" on={nBill} setOn={setNBill}/>
              <div style={{ marginTop:24 }}><PrimaryBtn label="Weiter" onClick={saveNotifs} loading={loading}/></div>
              <button className="skip" onClick={()=>setStep('photo')}>Alle ablehnen</button>
            </div>
          )}

          {/* ─── PHOTO ────────────────────────────────── */}
          {step==='photo' && (
            <div className="ob">
              <div style={{ width:52,height:52,borderRadius:16,background:T.card,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.greenBright} strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <h1 style={{ fontSize:30,fontWeight:700,color:T.text,letterSpacing:'-.6px',lineHeight:1.2,marginBottom:8 }}>Dein Profilfoto.</h1>
              <p style={{ fontSize:16,color:T.textSec,marginBottom:32,lineHeight:1.5,fontWeight:500 }}>Optional — jederzeit in den Einstellungen änderbar.</p>
              <label htmlFor="photo-up" style={{ display:'block',cursor:'pointer',marginBottom:16 }}>
                <div style={{ width:110,height:110,borderRadius:36,margin:'0 auto 20px',
                  background:photoUrl?'transparent':T.card,border:`2px dashed ${photoUrl?T.green:T.border}`,
                  display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',
                  boxShadow:photoUrl?`0 0 0 4px ${T.greenGlow}`:'none',transition:'all .2s' }}>
                  {photoUrl
                    ? <img src={photoUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                    : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.textMut} strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
                </div>
              </label>
              <input id="photo-up" type="file" accept="image/*" capture="user" style={{ display:'none' }}
                onChange={e=>{const f=e.target.files?.[0];if(f){setPhotoFile(f);setPhotoUrl(URL.createObjectURL(f))}}}/>
              <label htmlFor="photo-up">
                <div style={{ width:'100%',padding:'15px',textAlign:'center',background:T.card,
                  border:`1.5px solid ${T.border}`,borderRadius:14,color:T.text,fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:12 }}>
                  {photoUrl?'Foto ändern':'Foto auswählen oder aufnehmen'}
                </div>
              </label>
              <div style={{ marginTop:4 }}><PrimaryBtn label={loading?'':'App starten →'} onClick={finish} loading={loading}/></div>
              <button className="skip" onClick={finish}>Ohne Foto fortfahren</button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
