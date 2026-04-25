'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Exakt dasselbe Theme-System wie Login ──────────────────────────
const DARK = {
  bg:'#0E0F0E', card:'#1A1C1A', border:'rgba(255,255,255,0.08)',
  text:'#F4F5F4', textSec:'#7A8780', textMut:'#3E4642',
  btnPrim:'#FFFFFF', btnPrimText:'#0E0F0E',
  inp:'rgba(255,255,255,0.05)', inpBorder:'rgba(255,255,255,0.1)',
  inpFocus:'rgba(255,255,255,0.12)', inpFocusBorder:'rgba(255,255,255,0.4)',
  glow:'rgba(255,255,255,0.06)', accent:'#FFFFFF', accentSec:'#8FA89C',
  errBg:'rgba(220,70,70,0.1)', errBorder:'rgba(220,70,70,0.2)', errText:'#E07070',
}
const LIGHT = {
  bg:'#F8F9F8', card:'#F1F3F1', border:'rgba(0,0,0,0.08)',
  text:'#0F120F', textSec:'#4A5450', textMut:'#9AA49E',
  btnPrim:'#323635', btnPrimText:'#FFFFFF',
  inp:'#FFFFFF', inpBorder:'rgba(0,0,0,0.12)',
  inpFocus:'#FFFFFF', inpFocusBorder:'#323635',
  glow:'rgba(50,54,53,0.06)', accent:'#323635', accentSec:'#5A6460',
  errBg:'#FEF2F2', errBorder:'#FECACA', errText:'#DC2626',
}

type Step = 'name'|'company'|'phone'|'verify'|'notifs'|'photo'
const STEPS: Step[] = ['name','company','phone','verify','notifs','photo']

export default function OnboardingPage() {
  const supabase = createClient()
  const [dark, setDark] = useState(true)
  const [step, setStep] = useState<Step>('name')
  const [userId, setUserId] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const [first,setFirst]=useState(''); const [last,setLast]=useState('')
  const [company,setCompany]=useState(''); const [compDesc,setCompDesc]=useState('')
  const [compSize,setCompSize]=useState(''); const [website,setWebsite]=useState('')
  const [phone,setPhone]=useState(''); const [otp,setOtp]=useState(''); const [cd,setCd]=useState(0)
  const [nAI,setNAI]=useState(true); const [nDev,setNDev]=useState(true)
  const [nProj,setNProj]=useState(true); const [nBill,setNBill]=useState(true)
  const [photoFile,setPhotoFile]=useState<File|null>(null); const [photoUrl,setPhotoUrl]=useState('')

  useEffect(()=>{
    const stored = localStorage.getItem('festag_theme')
    if (stored) setDark(stored === 'dark')
    supabase.auth.getSession().then(({data})=>{
      if(!data.session){window.location.href='/login';return}
      setUserId(data.session.user.id)
      supabase.from('profiles').select('onboarding_completed,first_name').eq('id',data.session.user.id).single()
        .then(({data:p})=>{ if(p?.onboarding_completed) window.location.href='/dashboard' })
    })
  },[])

  useEffect(()=>{
    if(cd<=0) return; const t=setTimeout(()=>setCd(c=>c-1),1000); return ()=>clearTimeout(t)
  },[cd])

  const T = dark ? DARK : LIGHT
  const idx = STEPS.indexOf(step)

  const back = () => {
    if (idx === 0) { window.location.href = '/login' }
    else { setStep(STEPS[idx-1]); setErr('') }
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
    const {error} = await supabase.auth.signInWithOtp({phone:`+49${phone.replace(/^0/,'')}`})
    setLoading(false)
    if(error) return setErr('SMS konnte nicht gesendet werden.')
    setCd(60);setStep('verify')
  }
  async function verifyOTP(){
    if(otp.length<6) return setErr('Bitte 6-stelligen Code eingeben.')
    setErr('');setLoading(true)
    const {error} = await supabase.auth.verifyOtp({phone:`+49${phone.replace(/^0/,'')}`,token:otp,type:'sms'})
    setLoading(false)
    if(error) return setErr('Ungültiger Code.')
    await supabase.from('profiles').update({phone:`+49${phone.replace(/^0/,'')}`,phone_verified:true,onboarding_step:3}).eq('id',userId)
    setStep('notifs')
  }
  async function saveNotifs(){
    setLoading(true)
    await supabase.from('profiles').update({notification_ai_updates:nAI,notification_developer_activity:nDev,notification_project_updates:nProj,notification_billing:nBill,onboarding_step:4}).eq('id',userId)
    if('Notification' in window && Notification.permission==='default') await Notification.requestPermission()
    setLoading(false);setStep('photo')
  }
  async function finish(){
    setLoading(true)
    let pUrl=''
    if(photoFile){
      const ext=photoFile.name.split('.').pop()
      const path=`${userId}/avatar.${ext}`
      const {data:ud} = await supabase.storage.from('avatars').upload(path,photoFile,{upsert:true})
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
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
        .ob{animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both;}
        input::placeholder,textarea::placeholder{color:${T.textMut};opacity:1;}
        body{background:${T.bg}!important;}
        select{-webkit-appearance:none;appearance:none;}
        .skip-btn{width:100%;padding:14px;text-align:center;color:${T.textMut};font-size:14px;font-weight:600;cursor:pointer;background:none;border:none;font-family:inherit;margin-top:8px;letter-spacing:-.1px;}
      `}</style>

      <div style={{minHeight:'100dvh',background:T.bg,fontFamily:"'Aeonik',sans-serif",WebkitFontSmoothing:'antialiased'}}>
        {/* Progress */}
        <div style={{position:'fixed',top:0,left:0,right:0,height:2,background:T.border,zIndex:50}}>
          <div style={{height:'100%',width:`${((idx+1)/STEPS.length)*100}%`,background:T.accent,transition:'width .4s cubic-bezier(.16,1,.3,1)'}}/>
        </div>

        <div style={{maxWidth:480,margin:'0 auto',padding:`calc(28px + env(safe-area-inset-top)) 24px calc(48px + env(safe-area-inset-bottom))`}}>

          {/* Back */}
          <button onClick={back} style={{background:'transparent',border:'none',color:T.textMut,fontSize:13,cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:6,marginBottom:40,fontFamily:'inherit',fontWeight:600}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            {idx === 0 ? 'Zurück zur Registrierung' : 'Zurück'}
          </button>

          {err && <div style={{padding:'12px 16px',background:T.errBg,border:`1px solid ${T.errBorder}`,borderRadius:12,fontSize:14,color:T.errText,marginBottom:16,lineHeight:1.5}}>{err}</div>}

          {/* ── NAME ─────────────────────────── */}
          {step==='name' && (
            <div className="ob">
              <h1 style={{fontSize:36,fontWeight:700,color:T.text,letterSpacing:'-.8px',lineHeight:1.1,marginBottom:10}}>Wie heißt du?</h1>
              <p style={{fontSize:16,color:T.textSec,marginBottom:36,lineHeight:1.55,fontWeight:500}}>Damit wir dich richtig ansprechen können.</p>
              <Inp label="Vorname" value={first} onChange={setFirst} placeholder="Max" autoFocus T={T}/>
              <Inp label="Nachname (Optional)" value={last} onChange={setLast} placeholder="Mustermann" T={T}/>
              <div style={{marginTop:12}}><PBtn label="Weiter" onClick={saveName} loading={loading} disabled={!first.trim()} T={T}/></div>
            </div>
          )}

          {/* ── COMPANY ─────────────────────── */}
          {step==='company' && (
            <div className="ob">
              <h1 style={{fontSize:36,fontWeight:700,color:T.text,letterSpacing:'-.8px',lineHeight:1.1,marginBottom:10}}>Dein Unternehmen.</h1>
              <p style={{fontSize:16,color:T.textSec,marginBottom:36,lineHeight:1.55,fontWeight:500}}>Hilft der AI, dein Projekt zu verstehen.</p>
              <Inp label="Firmenname (Optional)" value={company} onChange={setCompany} placeholder="Musterfirma GmbH" autoFocus T={T}/>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,letterSpacing:'.1em',color:T.textMut,textTransform:'uppercase',marginBottom:7}}>UNTERNEHMENSBESCHREIBUNG</label>
                <textarea value={compDesc} onChange={e=>setCompDesc(e.target.value)} placeholder="Was macht dein Unternehmen? Welche Branche?"
                  style={{width:'100%',minHeight:90,padding:'14px 16px',background:T.inp,border:`1.5px solid ${T.inpBorder}`,borderRadius:13,fontSize:15,color:T.text,outline:'none',fontFamily:'inherit',fontWeight:500,resize:'vertical'}}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,letterSpacing:'.1em',color:T.textMut,textTransform:'uppercase',marginBottom:7}}>UNTERNEHMENSGRÖSSE (OPTIONAL)</label>
                <select value={compSize} onChange={e=>setCompSize(e.target.value)}
                  style={{width:'100%',padding:'14px 16px',background:T.inp,border:`1.5px solid ${T.inpBorder}`,borderRadius:13,fontSize:16,color:T.text,outline:'none',fontFamily:'inherit',fontWeight:500,cursor:'pointer'}}>
                  <option value="">Bitte wählen</option>
                  <option value="1-5">1–5 Mitarbeiter</option>
                  <option value="6-20">6–20 Mitarbeiter</option>
                  <option value="21-100">21–100 Mitarbeiter</option>
                  <option value="101-500">101–500 Mitarbeiter</option>
                  <option value="500+">500+ Mitarbeiter</option>
                </select>
              </div>
              <Inp label="Website (Optional)" value={website} onChange={setWebsite} placeholder="https://deine-website.de" type="url" T={T}/>
              <div style={{marginTop:12}}><PBtn label="Weiter" onClick={saveCompany} loading={loading} T={T}/></div>
              <button className="skip-btn" onClick={()=>setStep('phone')}>Überspringen</button>
            </div>
          )}

          {/* ── PHONE ─────────────────────────── */}
          {step==='phone' && (
            <div className="ob">
              <h1 style={{fontSize:36,fontWeight:700,color:T.text,letterSpacing:'-.8px',lineHeight:1.1,marginBottom:10}}>Telefonnummer.</h1>
              <p style={{fontSize:16,color:T.textSec,marginBottom:36,lineHeight:1.55,fontWeight:500}}>Wir senden dir einen Verifizierungscode.</p>
              <div style={{display:'flex',gap:10,marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'14px',background:T.inp,border:`1.5px solid ${T.inpBorder}`,borderRadius:13,fontSize:15,color:T.text,fontWeight:600,flexShrink:0}}>🇩🇪 +49</div>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="170 555 0199" autoFocus
                  style={{flex:1,padding:'14px 16px',background:T.inp,border:`1.5px solid ${T.inpBorder}`,borderRadius:13,fontSize:16,color:T.text,outline:'none',fontFamily:'inherit',fontWeight:500}}/>
              </div>
              <p style={{fontSize:12,color:T.textMut,marginBottom:28,lineHeight:1.6}}>Mit Fortfahren akzeptierst du unsere <span style={{color:T.textSec}}>AGB</span> und <span style={{color:T.textSec}}>Datenschutz</span>.</p>
              <PBtn label="Code senden" onClick={sendOTP} loading={loading} disabled={!phone.trim()} T={T}/>
              <button className="skip-btn" onClick={()=>setStep('notifs')}>Überspringen</button>
            </div>
          )}

          {/* ── VERIFY ────────────────────────── */}
          {step==='verify' && (
            <div className="ob">
              <h1 style={{fontSize:36,fontWeight:700,color:T.text,letterSpacing:'-.8px',lineHeight:1.1,marginBottom:10}}>Code eingeben.</h1>
              <p style={{fontSize:16,color:T.textSec,marginBottom:36,lineHeight:1.55,fontWeight:500}}>Gesendet an <span style={{color:T.text,fontWeight:700}}>+49 {phone}</span></p>
              <OTPInput value={otp} onChange={setOtp} T={T}/>
              <PBtn label="Verifizieren" onClick={verifyOTP} loading={loading} disabled={otp.length<6} T={T}/>
              <p style={{textAlign:'center',fontSize:13,color:T.textMut,marginTop:20}}>
                Nichts erhalten?{' '}
                {cd>0
                  ? <span style={{color:T.textSec}}>Erneut in 0:{String(cd).padStart(2,'0')}</span>
                  : <span onClick={sendOTP} style={{color:T.accent,fontWeight:700,cursor:'pointer'}}>Erneut senden</span>}
              </p>
            </div>
          )}

          {/* ── NOTIFS ────────────────────────── */}
          {step==='notifs' && (
            <div className="ob">
              <h1 style={{fontSize:36,fontWeight:700,color:T.text,letterSpacing:'-.8px',lineHeight:1.1,marginBottom:10}}>Benachrichtigungen.</h1>
              <p style={{fontSize:16,color:T.textSec,marginBottom:32,lineHeight:1.55,fontWeight:500}}>Wähle was für dich wichtig ist.</p>
              <NRow title="AI Updates & Tagesberichte" desc="Wenn Tagro Berichte für dich erstellt" on={nAI} setOn={setNAI} T={T}/>
              <NRow title="Developer-Aktivität" desc="Tasks erledigt oder aktiv im Sprint" on={nDev} setOn={setNDev} T={T}/>
              <NRow title="Projekt-Statuswechsel" desc="Phasenwechsel in deinem Projekt" on={nProj} setOn={setNProj} T={T}/>
              <NRow title="Rechnungen & Zahlungen" desc="Neue Rechnungen oder Bestätigungen" on={nBill} setOn={setNBill} T={T}/>
              <div style={{marginTop:24}}><PBtn label="Weiter" onClick={saveNotifs} loading={loading} T={T}/></div>
              <button className="skip-btn" onClick={()=>setStep('photo')}>Alle ablehnen</button>
            </div>
          )}

          {/* ── PHOTO ─────────────────────────── */}
          {step==='photo' && (
            <div className="ob">
              <h1 style={{fontSize:36,fontWeight:700,color:T.text,letterSpacing:'-.8px',lineHeight:1.1,marginBottom:10}}>Profilfoto.</h1>
              <p style={{fontSize:16,color:T.textSec,marginBottom:36,lineHeight:1.55,fontWeight:500}}>Optional — jederzeit in den Einstellungen änderbar.</p>
              <label htmlFor="photo-up" style={{display:'block',cursor:'pointer',marginBottom:20}}>
                <div style={{width:100,height:100,borderRadius:32,margin:'0 auto 20px',
                  background:photoUrl?'transparent':T.card,
                  border:`2px dashed ${photoUrl?T.accent:T.border}`,
                  display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',transition:'all .2s',
                  boxShadow:photoUrl?`0 0 0 4px ${T.glow}`:'none'}}>
                  {photoUrl
                    ? <img src={photoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.textMut} strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
                </div>
              </label>
              <input id="photo-up" type="file" accept="image/*" capture="user" style={{display:'none'}}
                onChange={e=>{const f=e.target.files?.[0];if(f){setPhotoFile(f);setPhotoUrl(URL.createObjectURL(f))}}}/>
              <label htmlFor="photo-up">
                <div style={{width:'100%',padding:'14px',textAlign:'center',background:T.card,border:`1.5px solid ${T.border}`,borderRadius:13,color:T.text,fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:12}}>
                  {photoUrl?'Foto ändern':'Foto auswählen'}
                </div>
              </label>
              <div style={{marginTop:4}}><PBtn label={loading?'':'App starten →'} onClick={finish} loading={loading} T={T}/></div>
              <button className="skip-btn" onClick={finish}>Ohne Foto fortfahren</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Shared components ─────────────────────────────────────────────
function Inp({label,value,onChange,type='text',placeholder='',autoFocus=false,T}:{
  label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string;autoFocus?:boolean;T:typeof DARK
}) {
  const [f,setF]=useState(false)
  return (
    <div style={{marginBottom:13}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,letterSpacing:'.1em',color:f?T.accent:T.textMut,textTransform:'uppercase',marginBottom:7,transition:'color .15s'}}>{label}</label>
      <input type={type} value={value} autoFocus={autoFocus} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} placeholder={placeholder}
        style={{width:'100%',padding:'14px 16px',background:f?T.inpFocus:T.inp,border:`1.5px solid ${f?T.inpFocusBorder:T.inpBorder}`,borderRadius:13,fontSize:16,color:T.text,outline:'none',transition:'all .15s',boxShadow:f?`0 0 0 3px ${T.glow}`:'none',fontFamily:'inherit',fontWeight:500,caretColor:T.accent}}/>
    </div>
  )
}

function PBtn({label,onClick,loading=false,disabled=false,T}:{label:string;onClick:()=>void;loading?:boolean;disabled?:boolean;T:typeof DARK}) {
  return (
    <button onClick={onClick} disabled={disabled||loading} style={{width:'100%',padding:'16px 24px',background:disabled?T.textMut:T.btnPrim,color:T.btnPrimText,fontSize:16,fontWeight:700,borderRadius:14,border:'none',cursor:disabled?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontFamily:'inherit',letterSpacing:'-.1px',transition:'all .18s',boxShadow:disabled?'none':`0 2px 16px ${T.glow}`}}>
      {loading?<span style={{width:18,height:18,border:`2.5px solid rgba(0,0,0,.15)`,borderTopColor:T.btnPrimText,borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}}/>:label}
    </button>
  )
}

function OTPInput({value,onChange,T}:{value:string;onChange:(v:string)=>void;T:typeof DARK}) {
  const refs = useRef<(HTMLInputElement|null)[]>([])
  const digits = value.split('').concat(Array(6).fill('')).slice(0,6)
  function hk(i:number,e:React.KeyboardEvent<HTMLInputElement>) { if(e.key==='Backspace'&&!digits[i]&&i>0) refs.current[i-1]?.focus() }
  function hc(i:number,v:string) { const d=v.replace(/\D/g,'').slice(-1); const nd=[...digits];nd[i]=d;onChange(nd.join('')); if(d&&i<5) refs.current[i+1]?.focus() }
  return (
    <div style={{display:'flex',gap:10,justifyContent:'center',margin:'0 0 32px'}}>
      {digits.map((d,i)=>(
        <input key={i} ref={el=>refs.current[i]=el} type="tel" maxLength={1} value={d}
          onChange={e=>hc(i,e.target.value)} onKeyDown={e=>hk(i,e)}
          style={{width:50,height:60,textAlign:'center',fontSize:24,fontWeight:700,background:d?T.card:T.inp,border:`1.5px solid ${d?T.accent:T.inpBorder}`,borderRadius:13,color:T.text,outline:'none',fontFamily:'inherit',boxShadow:d?`0 0 0 3px ${T.glow}`:'none',transition:'all .15s'}}/>
      ))}
    </div>
  )
}

function NRow({title,desc,on,setOn,T}:{title:string;desc:string;on:boolean;setOn:(v:boolean)=>void;T:typeof DARK}) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,padding:'16px 18px',background:T.card,borderRadius:13,border:`1px solid ${T.border}`,marginBottom:10}}>
      <div>
        <p style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:3}}>{title}</p>
        <p style={{fontSize:13,color:T.textSec,lineHeight:1.45}}>{desc}</p>
      </div>
      <div onClick={()=>setOn(!on)} style={{width:44,height:26,borderRadius:13,background:on?T.accent:'rgba(255,255,255,0.1)',position:'relative',cursor:'pointer',transition:'all .2s',flexShrink:0}}>
        <div style={{position:'absolute',top:3,left:on?21:3,width:20,height:20,borderRadius:10,background:on?T.bg:'#888',transition:'left .2s cubic-bezier(.16,1,.3,1)',boxShadow:'0 1px 4px rgba(0,0,0,.4)'}}/>
      </div>
    </div>
  )
}
