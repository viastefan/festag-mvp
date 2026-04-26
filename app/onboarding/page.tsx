'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

type Step = 'ai'|'name'|'company'|'phone'|'verify'|'notifs'|'photo'
const ALL_STEPS: Step[] = ['ai','name','company','phone','verify','notifs','photo']
type Msg = { role:'ai'|'user'; text:string }

const AI_SYSTEM = `Du bist Tagro, das AI-System von Festag — AI-native Softwareproduktion.

FESTAG PRINZIP: Kein Informationsverlust zwischen Kunde und Entwickler. Du bist die KI die beide Sprachen spricht.

AUFGABE: Kurzes Aufnahmegespräch. Du brauchst: Projektziel, Zielgruppe, Timeline-Wunsch, Teamgröße.

REGELN:
- Max 2 Sätze pro Antwort, direkt und klar
- Kein Emoji, keine Floskeln, klinge wie erfahrener Tech Lead
- Stelle immer exakt EINE Folgefrage
- Nach 3-4 User-Antworten: Fasse zusammen und schreibe auf einer eigenen Zeile: {"ready":true,"summary":"2 Satz Zusammenfassung"}
- Sprache: Deutsch`

// Shared CSS-var based components
function FInp({ label, value, onChange, type='text', placeholder='', autoFocus=false }: {
  label:string; value:string; onChange:(v:string)=>void; type?:string; placeholder?:string; autoFocus?:boolean
}) {
  const [f, setF] = useState(false)
  return (
    <div style={{ marginBottom:13 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'.1em',
        color: f ? 'var(--btn-prim)' : 'var(--text-muted)', textTransform:'uppercase',
        marginBottom:7, transition:'color .15s' }}>{label}</label>
      <input type={type} value={value} autoFocus={autoFocus}
        onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        placeholder={placeholder}
        style={{ width:'100%', padding:'14px 16px',
          background: f ? 'var(--inp-focus)' : 'var(--inp)',
          border: `1.5px solid ${f ? 'var(--inp-focus-border)' : 'var(--inp-border)'}`,
          borderRadius:13, fontSize:16, color:'var(--text)', outline:'none', transition:'all .15s',
          boxShadow: f ? '0 0 0 3px var(--glow)' : 'none',
          fontFamily:'inherit', fontWeight:500, caretColor:'var(--btn-prim)' }}/>
    </div>
  )
}

function PBtn({ label, onClick, loading=false, disabled=false }: {
  label:string; onClick:()=>void; loading?:boolean; disabled?:boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled||loading}
      style={{ width:'100%', padding:'16px 24px',
        background: disabled ? 'var(--card)' : 'var(--btn-prim)',
        color: disabled ? 'var(--text-muted)' : 'var(--btn-prim-text)',
        fontSize:16, fontWeight:700, borderRadius:14, border:'none',
        cursor: disabled ? 'default' : 'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        fontFamily:'inherit', letterSpacing:'-.1px', transition:'all .18s',
        boxShadow: disabled ? 'none' : '0 2px 16px var(--glow)', opacity: disabled ? .5 : 1 }}>
      {loading
        ? <span style={{ width:18, height:18, border:'2.5px solid rgba(128,128,128,.3)',
            borderTopColor:'var(--btn-prim-text)', borderRadius:'50%',
            animation:'spin .7s linear infinite', display:'inline-block' }}/>
        : label}
    </button>
  )
}

function OTPInput({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  const refs = useRef<(HTMLInputElement|null)[]>([])
  const digits = value.split('').concat(Array(6).fill('')).slice(0,6)
  function hk(i:number, e:React.KeyboardEvent<HTMLInputElement>) {
    if (e.key==='Backspace' && !digits[i] && i>0) refs.current[i-1]?.focus()
  }
  function hc(i:number, v:string) {
    const d = v.replace(/\D/g,'').slice(-1)
    const nd = [...digits]; nd[i]=d; onChange(nd.join(''))
    if (d && i<5) refs.current[i+1]?.focus()
  }
  return (
    <div style={{ display:'flex', gap:10, justifyContent:'center', margin:'0 0 28px' }}>
      {digits.map((d,i) => (
        <input key={i} ref={el=>refs.current[i]=el} type="tel" maxLength={1} value={d}
          onChange={e=>hc(i,e.target.value)} onKeyDown={e=>hk(i,e)}
          style={{ width:50, height:60, textAlign:'center', fontSize:24, fontWeight:700,
            background: d ? 'var(--card)' : 'var(--inp)',
            border: `1.5px solid ${d ? 'var(--btn-prim)' : 'var(--inp-border)'}`,
            borderRadius:13, color:'var(--text)', outline:'none', fontFamily:'inherit',
            boxShadow: d ? '0 0 0 3px var(--glow)' : 'none', transition:'all .15s' }}/>
      ))}
    </div>
  )
}

function NRow({ title, desc, on, setOn }: { title:string; desc:string; on:boolean; setOn:(v:boolean)=>void }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16,
      padding:'15px 16px', background:'var(--card)', borderRadius:13,
      border:'1px solid var(--border)', marginBottom:9 }}>
      <div>
        <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{title}</p>
        <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.4, margin:0 }}>{desc}</p>
      </div>
      <div onClick={()=>setOn(!on)} style={{ width:42, height:24, borderRadius:12,
        background: on ? 'var(--btn-prim)' : 'var(--border)', position:'relative',
        cursor:'pointer', transition:'all .2s', flexShrink:0 }}>
        <div style={{ position:'absolute', top:2, left: on ? 19 : 2, width:20, height:20,
          borderRadius:10, background: on ? 'var(--btn-prim-text)' : 'var(--text-muted)',
          transition:'left .2s cubic-bezier(.16,1,.3,1)', boxShadow:'0 1px 4px rgba(0,0,0,.3)' }}/>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const supabase = createClient()
  const [step, setStep] = useState<Step>('ai')
  const [userId, setUserId] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  // AI
  const [msgs, setMsgs] = useState<Msg[]>([
    { role:'ai', text:'Was bringt dich zu Festag? Erzähl mir kurz von deinem Projekt — auch wenn es noch eine grobe Idee ist.' }
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [aiDone, setAiDone] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  // Profile
  const [first,setFirst]=useState(''); const [last,setLast]=useState('')
  const [company,setCompany]=useState(''); const [compDesc,setCompDesc]=useState('')
  const [compSize,setCompSize]=useState(''); const [website,setWebsite]=useState('')
  const [phone,setPhone]=useState(''); const [otp,setOtp]=useState(''); const [cd,setCd]=useState(0)
  const [nAI,setNAI]=useState(true); const [nDev,setNDev]=useState(true)
  const [nProj,setNProj]=useState(true); const [nBill,setNBill]=useState(true)
  const [photoFile,setPhotoFile]=useState<File|null>(null); const [photoUrl,setPhotoUrl]=useState('')

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      if (!data.session) { window.location.href='/login'; return }
      setUserId(data.session.user.id)
      supabase.from('profiles').select('onboarding_completed').eq('id',data.session.user.id).single()
        .then(({data:p})=>{ if (p?.onboarding_completed) window.location.href='/dashboard' })
    })
  },[])

  useEffect(()=>{
    if (cd<=0) return; const t=setTimeout(()=>setCd(c=>c-1),1000); return ()=>clearTimeout(t)
  },[cd])

  useEffect(()=>{
    chatRef.current?.scrollTo({top:chatRef.current.scrollHeight, behavior:'smooth'})
  },[msgs])

  const stepIdx = ALL_STEPS.indexOf(step)

  function back() {
    if (stepIdx===0) window.location.href='/login'
    else { setStep(ALL_STEPS[stepIdx-1]); setErr('') }
  }

  async function sendAiMsg() {
    if (!aiInput.trim() || aiLoading) return
    const msg = aiInput.trim(); setAiInput('')
    const newMsgs: Msg[] = [...msgs, {role:'user', text:msg}]
    setMsgs(newMsgs); setAiLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:300, system:AI_SYSTEM,
          messages: newMsgs.map(m=>({ role:m.role==='ai'?'assistant':'user', content:m.text }))
        })
      })
      const data = await res.json()
      const text: string = data.content?.[0]?.text ?? ''
      const jsonMatch = text.match(/\{"ready":true.*?\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          setAiSummary(parsed.summary ?? ''); setAiDone(true)
          const display = text.replace(jsonMatch[0],'').trim()
          setMsgs(m=>[...m,{role:'ai',text:display||'Perfekt — ich habe alles notiert. Jetzt richten wir deinen Account ein.'}])
        } catch { setMsgs(m=>[...m,{role:'ai',text}]) }
      } else { setMsgs(m=>[...m,{role:'ai',text}]) }
    } catch { setMsgs(m=>[...m,{role:'ai',text:'Verbindungsfehler. Bitte erneut versuchen.'}]) }
    setAiLoading(false)
  }

  async function proceedFromAi() {
    if (aiSummary && userId) {
      await supabase.from('profiles').upsert({id:userId, company_description:aiSummary, onboarding_step:0})
    }
    setStep('name')
  }

  async function saveName(){
    if (!first.trim()) return setErr('Vorname erforderlich.')
    setErr(''); setLoading(true)
    await supabase.from('profiles').upsert({id:userId, first_name:first, last_name:last, onboarding_step:1})
    setLoading(false); setStep('company')
  }
  async function saveCompany(){
    setLoading(true)
    await supabase.from('profiles').update({company_name:company, company_description:compDesc||aiSummary,
      company_size:compSize, website, onboarding_step:2}).eq('id',userId)
    setLoading(false); setStep('phone')
  }
  async function sendOTP(){
    if (!phone.trim()) return setErr('Bitte Telefonnummer eingeben.')
    setErr(''); setLoading(true)
    const {error} = await supabase.auth.signInWithOtp({phone:`+49${phone.replace(/^0/,'')}`})
    setLoading(false)
    if (error) return setErr('SMS konnte nicht gesendet werden.')
    setCd(60); setStep('verify')
  }
  async function verifyOTP(){
    if (otp.length<6) return setErr('Bitte 6-stelligen Code eingeben.')
    setErr(''); setLoading(true)
    const {error} = await supabase.auth.verifyOtp({phone:`+49${phone.replace(/^0/,'')}`, token:otp, type:'sms'})
    setLoading(false)
    if (error) return setErr('Ungültiger Code.')
    await supabase.from('profiles').update({phone:`+49${phone.replace(/^0/,'')}`, phone_verified:true, onboarding_step:3}).eq('id',userId)
    setStep('notifs')
  }
  async function saveNotifs(){
    setLoading(true)
    await supabase.from('profiles').update({notification_ai_updates:nAI, notification_developer_activity:nDev,
      notification_project_updates:nProj, notification_billing:nBill, onboarding_step:4}).eq('id',userId)
    if ('Notification' in window && Notification.permission==='default') await Notification.requestPermission()
    setLoading(false); setStep('photo')
  }
  async function finish(){
    setLoading(true)
    let pUrl=''
    if (photoFile) {
      const ext=photoFile.name.split('.').pop()
      const path=`${userId}/avatar.${ext}`
      const {data:ud} = await supabase.storage.from('avatars').upload(path,photoFile,{upsert:true})
      if (ud) { const {data:{publicUrl}}=supabase.storage.from('avatars').getPublicUrl(path); pUrl=publicUrl }
    }
    await supabase.from('profiles').update({profile_photo_url:pUrl||undefined, onboarding_completed:true, onboarding_step:8}).eq('id',userId)
    setLoading(false); window.location.href='/dashboard'
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes msgIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:.25;}}
        .ob{animation:fadeUp .28s cubic-bezier(.16,1,.3,1) both;}
        .msg-in{animation:msgIn .22s cubic-bezier(.16,1,.3,1) both;}
        input::placeholder,textarea::placeholder{color:var(--text-muted);opacity:1;}
        body{background:var(--bg)!important;}
        select{-webkit-appearance:none;appearance:none;}
        .skip-btn{width:100%;padding:13px;text-align:center;color:var(--text-muted);font-size:14px;font-weight:600;cursor:pointer;background:none;border:none;font-family:inherit;margin-top:8px;}
        textarea{resize:none;}
      `}</style>

      <div style={{ minHeight:'100dvh', background:'var(--bg)', fontFamily:"'Aeonik',sans-serif",
        WebkitFontSmoothing:'antialiased', display:'flex', flexDirection:'column' }}>

        <ThemeToggle/>

        {/* Progress */}
        <div style={{ position:'fixed', top:0, left:0, right:0, height:2, background:'var(--border)', zIndex:50 }}>
          <div style={{ height:'100%', width:`${((stepIdx+1)/ALL_STEPS.length)*100}%`,
            background:'var(--btn-prim)', transition:'width .4s cubic-bezier(.16,1,.3,1)' }}/>
        </div>

        {/* ── AI CHAT ─────────────────────────────────────────── */}
        {step==='ai' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', maxWidth:560, margin:'0 auto',
            width:'100%', padding:`calc(28px + env(safe-area-inset-top)) 0 0` }}>

            <div style={{ padding:'0 24px' }}>
              <button onClick={back} style={{ background:'transparent', border:'none', color:'var(--text-muted)',
                fontSize:13, cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:6,
                marginBottom:28, fontFamily:'inherit', fontWeight:600 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                Zurück zur Registrierung
              </button>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:30, height:30, borderRadius:9, background:'var(--card)',
                  border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>
                </div>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'.1em', margin:0 }}>TAGRO AI</p>
              </div>
              <h1 style={{ fontSize:28, fontWeight:700, color:'var(--text)', letterSpacing:'-.6px', lineHeight:1.2, marginBottom:6 }}>
                Erzähl uns von<br/>deinem Projekt.
              </h1>
              <p style={{ fontSize:15, color:'var(--text-secondary)', marginBottom:20, lineHeight:1.5, fontWeight:500 }}>
                Ein kurzes Gespräch — damit wir die richtigen Menschen für dich finden.
              </p>
            </div>

            {/* Messages */}
            <div ref={chatRef} style={{ flex:1, overflowY:'auto', padding:'0 24px', display:'flex',
              flexDirection:'column', gap:12, minHeight:0 }}>
              {msgs.map((m,i)=>(
                <div key={i} className="msg-in" style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
                  <div style={{ maxWidth:'82%', padding:'12px 15px',
                    borderRadius: m.role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: m.role==='ai' ? 'var(--card)' : 'var(--btn-prim)',
                    color: m.role==='user' ? 'var(--btn-prim-text)' : 'var(--text)',
                    fontSize:15, lineHeight:1.55, fontWeight:500,
                    border: m.role==='ai' ? '1px solid var(--border)' : 'none' }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ display:'flex', justifyContent:'flex-start' }}>
                  <div style={{ padding:'12px 16px', borderRadius:'16px 16px 16px 4px',
                    background:'var(--card)', border:'1px solid var(--border)',
                    display:'flex', gap:5, alignItems:'center' }}>
                    {[0,1,2].map(i=>(
                      <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-muted)',
                        animation:`blink 1.2s ${i*0.2}s infinite` }}/>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding:'16px 24px', paddingBottom:`calc(env(safe-area-inset-bottom) + 24px)` }}>
              {!aiDone ? (
                <>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-end',
                    background:'var(--card)', border:'1.5px solid var(--border)',
                    borderRadius:16, padding:'12px 14px' }}>
                    <textarea value={aiInput}
                      onChange={e=>setAiInput(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAiMsg()} }}
                      placeholder="Antwort eingeben..."
                      rows={1}
                      style={{ flex:1, background:'transparent', border:'none', fontSize:15,
                        color:'var(--text)', fontFamily:'inherit', fontWeight:500,
                        lineHeight:1.5, maxHeight:100, overflowY:'auto', outline:'none' }}/>
                    <button onClick={sendAiMsg} disabled={!aiInput.trim()||aiLoading}
                      style={{ width:34, height:34, borderRadius:9,
                        background: aiInput.trim() ? 'var(--btn-prim)' : 'transparent',
                        border: `1px solid ${aiInput.trim()?'transparent':'var(--border)'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        cursor: aiInput.trim() ? 'pointer' : 'default', transition:'all .15s', flexShrink:0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke={aiInput.trim()?'var(--btn-prim-text)':'var(--text-muted)'} strokeWidth="2.5" strokeLinecap="round">
                        <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
                      </svg>
                    </button>
                  </div>
                  <button onClick={()=>setStep('name')} className="skip-btn">Gespräch überspringen</button>
                </>
              ) : (
                <div className="ob">
                  {aiSummary && (
                    <div style={{ padding:'12px 16px', background:'var(--card)', border:'1px solid var(--border)',
                      borderRadius:13, marginBottom:12 }}>
                      <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', marginBottom:5 }}>TAGRO PROJEKTANALYSE</p>
                      <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.5, margin:0 }}>{aiSummary}</p>
                    </div>
                  )}
                  <PBtn label="Account einrichten →" onClick={proceedFromAi}/>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DATA STEPS — vertikal zentriert ─────────────────── */}
        {step!=='ai' && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
            padding:`calc(20px + env(safe-area-inset-top)) 24px calc(20px + env(safe-area-inset-bottom))` }}>
            <div style={{ width:'100%', maxWidth:440 }} className="ob">

              <button onClick={back} style={{ background:'transparent', border:'none', color:'var(--text-muted)',
                fontSize:13, cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:6,
                marginBottom:36, fontFamily:'inherit', fontWeight:600 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                Zurück
              </button>

              {err && <div style={{ padding:'12px 16px', background:'var(--red-bg)',
                border:'1px solid rgba(220,70,70,.2)', borderRadius:12, fontSize:14,
                color:'var(--red)', marginBottom:16, lineHeight:1.5 }}>{err}</div>}

              {step==='name' && (<>
                <h1 style={{ fontSize:36, fontWeight:700, color:'var(--text)', letterSpacing:'-.8px', lineHeight:1.1, marginBottom:10 }}>Wie heißt du?</h1>
                <p style={{ fontSize:16, color:'var(--text-secondary)', marginBottom:32, lineHeight:1.55, fontWeight:500 }}>Damit wir dich richtig ansprechen können.</p>
                <FInp label="Vorname" value={first} onChange={setFirst} placeholder="Max" autoFocus/>
                <FInp label="Nachname (Optional)" value={last} onChange={setLast} placeholder="Mustermann"/>
                <div style={{marginTop:12}}><PBtn label="Weiter" onClick={saveName} loading={loading} disabled={!first.trim()}/></div>
              </>)}

              {step==='company' && (<>
                <h1 style={{ fontSize:36, fontWeight:700, color:'var(--text)', letterSpacing:'-.8px', lineHeight:1.1, marginBottom:10 }}>Dein Unternehmen.</h1>
                <p style={{ fontSize:16, color:'var(--text-secondary)', marginBottom:32, lineHeight:1.55, fontWeight:500 }}>Hilft der AI, dein Projekt zu verstehen.</p>
                <FInp label="Firmenname (Optional)" value={company} onChange={setCompany} placeholder="Musterfirma GmbH" autoFocus/>
                <div style={{ marginBottom:13 }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'.1em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:7 }}>BESCHREIBUNG</label>
                  <textarea value={compDesc||aiSummary} onChange={e=>setCompDesc(e.target.value)} placeholder="Was macht dein Unternehmen?"
                    style={{ width:'100%', minHeight:80, padding:'14px 16px', background:'var(--inp)',
                      border:'1.5px solid var(--inp-border)', borderRadius:13, fontSize:15, color:'var(--text)',
                      outline:'none', fontFamily:'inherit', fontWeight:500 }}/>
                </div>
                <div style={{ marginBottom:13 }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'.1em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:7 }}>GRÖSSE (OPTIONAL)</label>
                  <select value={compSize} onChange={e=>setCompSize(e.target.value)}
                    style={{ width:'100%', padding:'14px 16px', background:'var(--inp)',
                      border:'1.5px solid var(--inp-border)', borderRadius:13, fontSize:16,
                      color:compSize?'var(--text)':'var(--text-muted)', outline:'none', fontFamily:'inherit', fontWeight:500, cursor:'pointer' }}>
                    <option value="">Bitte wählen</option>
                    <option value="1-5">1–5 Mitarbeiter</option>
                    <option value="6-20">6–20 Mitarbeiter</option>
                    <option value="21-100">21–100 Mitarbeiter</option>
                    <option value="101-500">101–500 Mitarbeiter</option>
                    <option value="500+">500+ Mitarbeiter</option>
                  </select>
                </div>
                <FInp label="Website (Optional)" value={website} onChange={setWebsite} placeholder="https://deine-website.de" type="url"/>
                <div style={{marginTop:12}}><PBtn label="Weiter" onClick={saveCompany} loading={loading}/></div>
                <button className="skip-btn" onClick={()=>setStep('phone')}>Überspringen</button>
              </>)}

              {step==='phone' && (<>
                <h1 style={{ fontSize:36, fontWeight:700, color:'var(--text)', letterSpacing:'-.8px', lineHeight:1.1, marginBottom:10 }}>Telefonnummer.</h1>
                <p style={{ fontSize:16, color:'var(--text-secondary)', marginBottom:32, lineHeight:1.55, fontWeight:500 }}>Wir senden dir einen Verifizierungscode.</p>
                <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px',
                    background:'var(--inp)', border:'1.5px solid var(--inp-border)', borderRadius:13,
                    fontSize:15, color:'var(--text)', fontWeight:600, flexShrink:0 }}>🇩🇪 +49</div>
                  <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="170 555 0199" autoFocus
                    style={{ flex:1, padding:'14px 16px', background:'var(--inp)', border:'1.5px solid var(--inp-border)',
                      borderRadius:13, fontSize:16, color:'var(--text)', outline:'none', fontFamily:'inherit', fontWeight:500 }}/>
                </div>
                <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:28, lineHeight:1.6 }}>
                  Mit Fortfahren akzeptierst du unsere <span style={{color:'var(--text-secondary)'}}>AGB</span> und <span style={{color:'var(--text-secondary)'}}>Datenschutz</span>.
                </p>
                <PBtn label="Code senden" onClick={sendOTP} loading={loading} disabled={!phone.trim()}/>
                <button className="skip-btn" onClick={()=>setStep('notifs')}>Überspringen</button>
              </>)}

              {step==='verify' && (<>
                <h1 style={{ fontSize:36, fontWeight:700, color:'var(--text)', letterSpacing:'-.8px', lineHeight:1.1, marginBottom:10 }}>Code eingeben.</h1>
                <p style={{ fontSize:16, color:'var(--text-secondary)', marginBottom:32, lineHeight:1.55, fontWeight:500 }}>
                  Gesendet an <span style={{color:'var(--text)',fontWeight:700}}>+49 {phone}</span>
                </p>
                <OTPInput value={otp} onChange={setOtp}/>
                <PBtn label="Verifizieren" onClick={verifyOTP} loading={loading} disabled={otp.length<6}/>
                <p style={{ textAlign:'center', fontSize:13, color:'var(--text-muted)', marginTop:18 }}>
                  Nichts erhalten?{' '}
                  {cd>0
                    ? <span style={{color:'var(--text-secondary)'}}>Erneut in 0:{String(cd).padStart(2,'0')}</span>
                    : <span onClick={sendOTP} style={{color:'var(--btn-prim)',fontWeight:700,cursor:'pointer'}}>Erneut senden</span>}
                </p>
              </>)}

              {step==='notifs' && (<>
                <h1 style={{ fontSize:36, fontWeight:700, color:'var(--text)', letterSpacing:'-.8px', lineHeight:1.1, marginBottom:10 }}>Benachrichtigungen.</h1>
                <p style={{ fontSize:16, color:'var(--text-secondary)', marginBottom:24, lineHeight:1.55, fontWeight:500 }}>Wähle was für dich wichtig ist.</p>
                <NRow title="AI Updates & Tagesberichte" desc="Wenn Tagro Berichte erstellt" on={nAI} setOn={setNAI}/>
                <NRow title="Developer-Aktivität" desc="Tasks erledigt oder aktiv" on={nDev} setOn={setNDev}/>
                <NRow title="Projekt-Statuswechsel" desc="Phasenwechsel in deinem Projekt" on={nProj} setOn={setNProj}/>
                <NRow title="Rechnungen & Zahlungen" desc="Neue Rechnungen oder Bestätigungen" on={nBill} setOn={setNBill}/>
                <div style={{marginTop:20}}><PBtn label="Weiter" onClick={saveNotifs} loading={loading}/></div>
                <button className="skip-btn" onClick={()=>setStep('photo')}>Alle ablehnen</button>
              </>)}

              {step==='photo' && (<>
                <h1 style={{ fontSize:36, fontWeight:700, color:'var(--text)', letterSpacing:'-.8px', lineHeight:1.1, marginBottom:10 }}>Profilfoto.</h1>
                <p style={{ fontSize:16, color:'var(--text-secondary)', marginBottom:32, lineHeight:1.55, fontWeight:500 }}>Optional — jederzeit in den Einstellungen änderbar.</p>
                <label htmlFor="photo-up" style={{ display:'block', cursor:'pointer' }}>
                  <div style={{ width:88, height:88, borderRadius:28, margin:'0 auto 20px',
                    background: photoUrl?'transparent':'var(--card)',
                    border: `2px dashed ${photoUrl?'var(--btn-prim)':'var(--border)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    overflow:'hidden', transition:'all .2s',
                    boxShadow: photoUrl?'0 0 0 4px var(--glow)':'none' }}>
                    {photoUrl
                      ? <img src={photoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
                  </div>
                </label>
                <input id="photo-up" type="file" accept="image/*" capture="user" style={{display:'none'}}
                  onChange={e=>{ const f=e.target.files?.[0]; if(f){setPhotoFile(f);setPhotoUrl(URL.createObjectURL(f))} }}/>
                <label htmlFor="photo-up">
                  <div style={{ width:'100%', padding:'14px', textAlign:'center',
                    background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:13,
                    color:'var(--text)', fontSize:15, fontWeight:700, cursor:'pointer', marginBottom:12 }}>
                    {photoUrl?'Foto ändern':'Foto auswählen'}
                  </div>
                </label>
                <div style={{marginTop:4}}><PBtn label={loading?'':'App starten →'} onClick={finish} loading={loading}/></div>
                <button className="skip-btn" onClick={finish}>Ohne Foto fortfahren</button>
              </>)}

            </div>
          </div>
        )}
      </div>
    </>
  )
}
