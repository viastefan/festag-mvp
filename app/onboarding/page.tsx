'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChatMarkdown from '@/components/ChatMarkdown'
import Link from 'next/link'

type Msg  = { role: 'ai' | 'user'; text: string }
type Mode = 'chat' | 'manual'

const PROJECT_TYPES = ['Web-App / SaaS','Mobile App (iOS/Android)','E-Commerce / Shop','Dashboard / Analytics','API / Backend','Landing Page / Website','AI-Integration','Anderes']
const BUDGETS       = ['Unter €5.000','€5.000 – €20.000','€20.000 – €50.000','Über €50.000','Noch nicht definiert']
const TIMELINES     = ['Unter 4 Wochen','1–3 Monate','3–6 Monate','Über 6 Monate','Flexibel']
const TEST_TRIGGER  = /^\s*test[\s\-_]*projekt\s*$/i

const AI_SYSTEM = `Du bist Tagro, der AI-Projektmanager von Festag — das AI-native Softwareproduktionssystem.

FESTAG PRINZIP: Kein Informationsverlust. Du sprichst Business für Kunden und Technik für Entwickler.

DEINE AUFGABE: Führe ein strukturiertes Aufnahmegespräch. Du brauchst exakt diese Informationen:
1. Was soll gebaut werden? (Ziel, Problem, Lösung)
2. Für wen? (Zielgruppe, Markt)
3. Was sind die wichtigsten Features? (Scope)
4. Budget-Rahmen und Timeline?
5. Gibt es technische Anforderungen oder Risiken?

GESPRÄCHSFÜHRUNG:
- Stelle IMMER exakt EINE konkrete Frage
- Max. 2 Sätze Antwort + 1 Folgefrage
- Kein Smalltalk, kein Emoji, keine Floskeln
- Klinge wie ein erfahrener CTO im Erstgespräch
- Sprache: Deutsch

FORMATIERUNG: Markdown ist erlaubt — **fett** für Schlüsselbegriffe, Listen für Aufzählungen. Halte den Text knapp.

ABSCHLUSS: Nach 5-7 Antworten des Kunden hast du genug. Schreibe dann:
"Ich habe alle relevanten Informationen. Ich zerlege dein Projekt jetzt strukturiert."
Dann schreibe auf einer neuen Zeile exakt: {"ready":true}

Starte das Gespräch mit: "Was möchtest du bauen — und welches Problem löst es konkret?"`

export default function OnboardingPage() {
  const [msgs,       setMsgs]       = useState<Msg[]>([])
  const [input,      setInput]      = useState('')
  const [aiLoading,  setAiLoading]  = useState(false)
  const [ready,      setReady]      = useState(false)
  const [decomposing,setDecomposing]= useState(false)
  const [projectId,  setProjectId]  = useState<string|null>(null)
  const [userId,     setUserId]     = useState<string|null>(null)
  const [phase,      setPhase]      = useState<'chat'|'decompose'|'done'>('chat')
  const [mode,       setMode]       = useState<Mode>('chat')
  const [decomposeErr,setDecomposeErr]= useState('')
  const [mTitle,     setMTitle]     = useState('')
  const [mDesc,      setMDesc]      = useState('')
  const [mType,      setMType]      = useState('')
  const [mBudget,    setMBudget]    = useState('')
  const [mTimeline,  setMTimeline]  = useState('')
  const [mContact,   setMContact]   = useState('')
  const [mSubmitting,setMSubmitting]= useState(false)
  const [mError,     setMError]     = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textRef   = useRef<HTMLTextAreaElement>(null)
  const supabase  = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      setUserId(uid)
      const { data: profile } = await supabase.from('profiles').select('onboarding_step').eq('id', uid).single()
      if ((profile as any)?.onboarding_step === 99) { window.location.href = '/dashboard'; return }
      setAiLoading(true)
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ system: AI_SYSTEM, max_tokens: 200, messages: [{ role: 'user', content: 'Start' }] })
        })
        const d = await res.json()
        setMsgs([{ role: 'ai', text: d.content?.[0]?.text ?? 'Was möchtest du bauen — und welches Problem löst es konkret?' }])
      } catch {
        setMsgs([{ role: 'ai', text: 'Was möchtest du bauen — und welches Problem löst es konkret?' }])
      }
      setAiLoading(false)
    })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, aiLoading])

  async function createTestProject() {
    if (!userId) return
    setPhase('decompose'); setDecomposing(true)
    try {
      const res = await fetch('/api/ai/test-project', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const d = await res.json()
      if (d.projectId) {
        setProjectId(d.projectId)
        await supabase.from('profiles').update({ onboarding_step: 99 }).eq('id', userId)
        setPhase('done')
      } else {
        setPhase('chat'); setDecomposing(false)
        setMsgs(m => [...m, { role: 'ai', text: 'Konnte Test-Projekt nicht anlegen. Bitte erneut versuchen.' }])
      }
    } catch {
      setPhase('chat'); setDecomposing(false)
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindungsfehler beim Anlegen des Test-Projekts.' }])
    }
  }

  async function send() {
    if (!input.trim() || aiLoading) return
    const msg = input.trim(); setInput('')
    if (textRef.current) { textRef.current.style.height = 'auto' }
    const newMsgs: Msg[] = [...msgs, { role: 'user', text: msg }]
    setMsgs(newMsgs)
    if (TEST_TRIGGER.test(msg)) {
      setMsgs(m => [...m, { role: 'ai', text: '**Test-Modus erkannt.** Lege ein vordefiniertes Demo-Projekt an.' }])
      setTimeout(() => createTestProject(), 400); return
    }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: AI_SYSTEM, max_tokens: 300,
          messages: newMsgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })) })
      })
      const d = await res.json()
      let text: string = d.content?.[0]?.text ?? ''
      if (text.includes('{"ready":true}')) {
        setMsgs(m => [...m, { role: 'ai', text: text.replace('{"ready":true}', '').trim() }])
        setReady(true)
      } else {
        setMsgs(m => [...m, { role: 'ai', text }])
      }
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindungsfehler. Bitte erneut versuchen.' }])
    }
    setAiLoading(false)
  }

  async function decompose() {
    if (!userId) { setDecomposeErr('Sitzung abgelaufen — bitte Seite neu laden.'); return }
    setDecomposing(true); setPhase('decompose'); setDecomposeErr('')
    try {
      const res = await fetch('/api/ai/decompose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory: msgs, userId })
      })
      const d = await res.json()
      if (d.projectId) {
        setProjectId(d.projectId)
        await supabase.from('profiles').update({ onboarding_step: 99 }).eq('id', userId)
        setPhase('done')
      } else {
        setPhase('chat'); setDecomposing(false)
        setDecomposeErr(d.error ?? 'Fehler beim Strukturieren. Bitte erneut versuchen.')
      }
    } catch {
      setPhase('chat'); setDecomposing(false)
      setDecomposeErr('Verbindungsfehler. Bitte erneut versuchen.')
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !mTitle.trim()) { setMError('Projektname ist erforderlich.'); return }
    setMSubmitting(true); setMError('')
    try {
      const description = [mDesc, mType && `Typ: ${mType}`, mBudget && `Budget: ${mBudget}`, mTimeline && `Timeline: ${mTimeline}`, mContact && `Kontakt: ${mContact}`].filter(Boolean).join('\n')
      const { data: project, error } = await supabase.from('projects').insert({
        user_id: userId, title: mTitle.trim(), description: description || null, status: 'intake'
      }).select().single()
      if (error) throw error
      await supabase.from('profiles').update({ onboarding_step: 99 }).eq('id', userId)
      await supabase.from('activity_feed').insert({ user_id: userId, project_id: (project as any).id, type: 'project_status', message: `Projekt "${mTitle.trim()}" wurde manuell angelegt.` }).catch(() => {})
      setProjectId((project as any).id); setPhase('done')
    } catch (err: any) { setMError(err.message ?? 'Fehler. Bitte erneut versuchen.') }
    setMSubmitting(false)
  }

  /* ─── GLOBAL STYLES ─────────────────────────────────────── */
  const globalStyle = `
    @keyframes spin   { to { transform: rotate(360deg); } }
    @keyframes pulse  { 0%,100%{opacity:1;} 50%{opacity:.3;} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;} }
    @keyframes dot    { from{opacity:.2;transform:scale(.75);}to{opacity:1;transform:scale(1);} }
    @keyframes scanLine { 0%{top:0%;}100%{top:100%;} }
    .ob-msg-in { animation: fadeUp .22s cubic-bezier(.16,1,.3,1) both; }
    .ob-input-wrap:focus-within { border-color: var(--accent) !important; box-shadow: 0 0 0 3px rgba(var(--accent-rgb,.4,.4,.4),.13), 0 2px 20px rgba(0,0,0,.18) !important; }
    .ob-cta-btn { transition: opacity .15s, transform .1s; }
    .ob-cta-btn:hover:not(:disabled) { opacity:.88; }
    .ob-cta-btn:active:not(:disabled) { transform:scale(.98); }
    .ob-chip { transition: background .12s, color .12s; }
    .ob-chip:hover { background: var(--card) !important; color: var(--text) !important; }
    @media(max-width:640px) {
      .ob-header-right .ob-form-btn { display:none !important; }
    }
  `

  /* ─── MANUAL FORM ─────────────────────────────────────────── */
  if (mode === 'manual') return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <style>{globalStyle}</style>
      <header style={{ position:'sticky', top:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', height:56, borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:17, filter:'var(--logo-filter,none)' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', textTransform:'uppercase' }}>Projekt-Aufnahme</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => setMode('chat')} style={{ height:32, padding:'0 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:8, fontSize:12, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>← AI-Chat</button>
          <Link href="/dashboard" style={{ textDecoration:'none' }}>
            <button style={{ height:32, padding:'0 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:8, fontSize:12, fontWeight:600, color:'var(--text-muted)', cursor:'pointer', fontFamily:'inherit' }}>Überspringen</button>
          </Link>
        </div>
      </header>
      <div style={{ flex:1, overflowY:'auto', padding:'36px 24px 80px', maxWidth:640, width:'100%', margin:'0 auto' }}>
        {/* Contact banner */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:28 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 4px' }}>Lieber persönlich?</p>
          <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'0 0 14px', lineHeight:1.6 }}>Wir melden uns innerhalb 24h. Oder direkt:</p>
          <div style={{ display:'flex', gap:10 }}>
            <a href="mailto:hello@festag.io" style={{ flex:1, display:'flex', alignItems:'center', gap:10, padding:'10px 13px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, textDecoration:'none' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
              </div>
              <div><p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', margin:0, letterSpacing:'.06em' }}>E-MAIL</p><p style={{ fontSize:12, fontWeight:600, color:'var(--text)', margin:'1px 0 0' }}>hello@festag.io</p></div>
            </a>
            <a href="https://wa.me/4989123456" target="_blank" rel="noopener" style={{ flex:1, display:'flex', alignItems:'center', gap:10, padding:'10px 13px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, textDecoration:'none' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.3h3a2 2 0 0 1 2 1.72c.13.81.37 1.6.7 2.35a2 2 0 0 1-.45 2.11L7.91 9.4a16 16 0 0 0 6.19 6.19l.95-.95a2 2 0 0 1 2.1-.45c.75.33 1.54.57 2.35.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div><p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', margin:0, letterSpacing:'.06em' }}>WHATSAPP</p><p style={{ fontSize:12, fontWeight:600, color:'var(--text)', margin:'1px 0 0' }}>+49 089 123 456 78</p></div>
            </a>
          </div>
        </div>

        <form onSubmit={submitManual}>
          <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text)', margin:'0 0 22px', letterSpacing:'-.4px' }}>Projekt beschreiben</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', display:'block', marginBottom:6 }}>PROJEKTNAME *</label>
              <input value={mTitle} onChange={e => setMTitle(e.target.value)} required placeholder="z.B. Kunden-Portal mit AI-Chat"
                style={{ width:'100%', padding:'11px 14px', background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)', fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
                onFocus={e => (e.currentTarget.style.borderColor='var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor='var(--border)')}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', display:'block', marginBottom:6 }}>PROJEKTBESCHREIBUNG</label>
              <textarea value={mDesc} onChange={e => setMDesc(e.target.value)} rows={4}
                placeholder="Was soll gebaut werden? Für wen? Welches Problem löst es?"
                style={{ width:'100%', padding:'11px 14px', background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)', fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6, transition:'border-color .15s' }}
                onFocus={e => (e.currentTarget.style.borderColor='var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor='var(--border)')}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', display:'block', marginBottom:8 }}>PROJEKTTYP</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {PROJECT_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setMType(t===mType?'':t)} className="ob-chip"
                    style={{ padding:'6px 13px', borderRadius:20, border:`1.5px solid ${mType===t?'var(--accent)':'var(--border)'}`, background:mType===t?'var(--accent)':'var(--card)', color:mType===t?'var(--accent-text)':'var(--text-secondary)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', display:'block', marginBottom:6 }}>BUDGET</label>
                <select value={mBudget} onChange={e => setMBudget(e.target.value)}
                  style={{ width:'100%', padding:'11px 14px', background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--text)', fontFamily:'inherit', outline:'none', cursor:'pointer' }}>
                  <option value="">Bitte wählen</option>{BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', display:'block', marginBottom:6 }}>TIMELINE</label>
                <select value={mTimeline} onChange={e => setMTimeline(e.target.value)}
                  style={{ width:'100%', padding:'11px 14px', background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--text)', fontFamily:'inherit', outline:'none', cursor:'pointer' }}>
                  <option value="">Bitte wählen</option>{TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', display:'block', marginBottom:6 }}>KONTAKT (OPTIONAL)</label>
              <input value={mContact} onChange={e => setMContact(e.target.value)} placeholder="Telefon, WhatsApp oder E-Mail für Rückfragen"
                style={{ width:'100%', padding:'11px 14px', background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)', fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
                onFocus={e => (e.currentTarget.style.borderColor='var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor='var(--border)')}/>
            </div>
            {mError && <p style={{ fontSize:13, color:'#ef4444', background:'rgba(239,68,68,.08)', padding:'10px 14px', borderRadius:9, margin:0, border:'1px solid rgba(239,68,68,.15)' }}>{mError}</p>}
            <button type="submit" disabled={!mTitle.trim()||mSubmitting} className="ob-cta-btn"
              style={{ width:'100%', padding:'14px', background:mTitle.trim()&&!mSubmitting?'var(--btn-prim)':'var(--surface-2)', color:mTitle.trim()&&!mSubmitting?'var(--btn-prim-text)':'var(--text-muted)', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:mTitle.trim()&&!mSubmitting?'pointer':'default', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {mSubmitting?<><span style={{ width:16, height:16, border:'2px solid rgba(128,128,128,.3)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Wird erstellt…</>:'Projekt einreichen →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  /* ─── DONE STATE ──────────────────────────────────────────── */
  if (phase === 'done') return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <style>{globalStyle}</style>
      <div style={{ maxWidth:480, width:'100%', textAlign:'center' }}>
        <div style={{ width:68, height:68, borderRadius:'50%', background:'rgba(34,197,94,.1)', border:'1.5px solid rgba(34,197,94,.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 style={{ fontSize:28, fontWeight:700, color:'var(--text)', letterSpacing:'-.6px', marginBottom:10 }}>Projekt strukturiert.</h1>
        <p style={{ fontSize:15, color:'var(--text-secondary)', lineHeight:1.65, marginBottom:36, maxWidth:380, margin:'0 auto 36px' }}>
          Tagro hat dein Projekt in Epics und Tasks zerlegt. Das Team kann jetzt mit der Arbeit beginnen.
        </p>
        <Link href={`/project/${projectId}`} style={{ textDecoration:'none' }}>
          <button className="ob-cta-btn" style={{ width:'100%', padding:'15px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginBottom:10 }}>
            Projekt öffnen →
          </button>
        </Link>
        <Link href="/dashboard" style={{ textDecoration:'none' }}>
          <button style={{ width:'100%', padding:'13px', background:'transparent', color:'var(--text-muted)', border:'none', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            Zum Dashboard
          </button>
        </Link>
      </div>
    </div>
  )

  /* ─── DECOMPOSE STATE ─────────────────────────────────────── */
  if (phase === 'decompose') return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <style>{globalStyle}</style>
      <div style={{ maxWidth:400, width:'100%', textAlign:'center' }}>
        <div style={{ position:'relative', width:56, height:56, margin:'0 auto 28px' }}>
          <div style={{ width:56, height:56, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin .9s linear infinite' }}/>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:18, color:'var(--accent)' }}>✦</span>
          </div>
        </div>
        <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:8, letterSpacing:'-.4px' }}>Tagro analysiert</h2>
        <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.6, marginBottom:28 }}>
          Erstelle Epics, Tasks, Prioritäten und Akzeptanzkriterien…
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {['Ziele & Scope definieren','Epics strukturieren','Tasks & Subtasks erstellen','Prioritäten setzen','Akzeptanzkriterien formulieren'].map((s, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', background:'var(--card)', borderRadius:10, border:'1px solid var(--border)' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', animation:`pulse 1.8s ${i*0.25}s ease-in-out infinite`, flexShrink:0 }}/>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  /* ─── CHAT STATE ──────────────────────────────────────────── */
  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column', fontFamily:"'Aeonik',-apple-system,sans-serif", WebkitFontSmoothing:'antialiased' }}>
      <style>{globalStyle}</style>

      {/* ── Header ── */}
      <header style={{ position:'sticky', top:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', height:54, borderBottom:'1px solid var(--border)', background:'var(--bg)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:16, filter:'var(--logo-filter,none)' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', textTransform:'uppercase' }}>Projekt-Aufnahme</span>
        </div>
        <div className="ob-header-right" style={{ display:'flex', alignItems:'center', gap:7 }}>
          <button onClick={() => setMode('manual')} className="ob-form-btn"
            style={{ height:30, padding:'0 12px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:11, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Formular
          </button>
          <Link href="/dashboard" style={{ textDecoration:'none' }}>
            <button style={{ height:30, padding:'0 12px', background:'transparent', border:'1px solid var(--border)', borderRadius:8, fontSize:11, fontWeight:600, color:'var(--text-muted)', cursor:'pointer', fontFamily:'inherit' }}>
              Überspringen
            </button>
          </Link>
        </div>
      </header>

      {/* ── Chat area ── */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', scrollbarWidth:'thin' }}>
        <div style={{ maxWidth:720, margin:'0 auto', padding:'40px 20px 0' }}>

          {/* Tagro identity header */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:15, color:'var(--accent-text)', fontWeight:700 }}>✦</span>
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0, lineHeight:1 }}>Tagro AI</p>
              <p style={{ fontSize:11, color:'var(--text-muted)', margin:'3px 0 0', lineHeight:1 }}>Festag Projekt-Aufnahme</p>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.05em' }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite' }}/>
              AI AKTIV
            </div>
          </div>

          {/* Messages */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {msgs.map((m, i) => (
              <div key={i} className={i === msgs.length-1 ? 'ob-msg-in' : ''} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', gap:10 }}>
                {m.role === 'ai' ? (
                  <div style={{ maxWidth:'82%' }}>
                    <div style={{ fontSize:15, lineHeight:1.68, color:'var(--text)', fontWeight:450 }}>
                      <ChatMarkdown text={m.text} variant="plain" />
                    </div>
                  </div>
                ) : (
                  <div style={{ maxWidth:'78%', padding:'12px 17px', background:'var(--accent)', color:'var(--accent-text)', borderRadius:'18px 18px 4px 18px', fontSize:15, fontWeight:600, lineHeight:1.5, wordBreak:'break-word' }}>
                    {m.text}
                  </div>
                )}
              </div>
            ))}

            {/* AI loading dots */}
            {aiLoading && (
              <div className="ob-msg-in" style={{ display:'flex', gap:5, paddingLeft:2 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--text-muted)', animation:`dot .9s ${i*0.16}s ease-in-out infinite alternate` }}/>
                ))}
              </div>
            )}
          </div>

          {/* Decompose error */}
          {decomposeErr && (
            <div style={{ margin:'20px 0', padding:'12px 16px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, display:'flex', alignItems:'flex-start', gap:10 }}>
              <span style={{ color:'#ef4444', fontSize:16, lineHeight:1, flexShrink:0 }}>⚠</span>
              <p style={{ fontSize:13, color:'#ef4444', margin:0, lineHeight:1.5 }}>{decomposeErr}</p>
              <button onClick={decompose} style={{ marginLeft:'auto', flexShrink:0, fontSize:12, fontWeight:700, color:'#ef4444', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Erneut →</button>
            </div>
          )}

          {/* Ready CTA */}
          {ready && !decomposing && (
            <div className="ob-msg-in" style={{ margin:'28px 0', padding:'22px 24px', background:'var(--card)', borderRadius:16, border:'1px solid var(--border)', boxShadow:'0 4px 24px rgba(0,0,0,.07)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:30, height:30, borderRadius:8, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:13, color:'var(--accent-text)', fontWeight:700 }}>✦</span>
                </div>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>Tagro ist bereit</p>
              </div>
              <p style={{ fontSize:13, color:'var(--text-secondary)', margin:'0 0 18px', lineHeight:1.6 }}>
                Ich zerlege dein Projekt jetzt vollautomatisch in Epics, Tasks und Akzeptanzkriterien.
              </p>
              <button onClick={decompose} className="ob-cta-btn"
                style={{ width:'100%', padding:'14px 20px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:11, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <span style={{ fontSize:14 }}>✦</span>
                Projekt strukturieren
              </button>
            </div>
          )}

          <div ref={bottomRef} style={{ height:160 }}/>
        </div>
      </div>

      {/* ── Input bar (sticky bottom) ── */}
      {!ready && (
        <div style={{ position:'sticky', bottom:0, background:'linear-gradient(to top, var(--bg) 70%, transparent)', padding:'12px 20px 20px', paddingBottom:'calc(20px + env(safe-area-inset-bottom))' }}>
          <div style={{ maxWidth:720, margin:'0 auto' }}>
            {/* Main input container */}
            <div className="ob-input-wrap"
              style={{ display:'flex', alignItems:'flex-end', gap:10, background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:16, padding:'12px 12px 12px 16px', boxShadow:'0 2px 20px rgba(0,0,0,.1)', transition:'border-color .2s, box-shadow .2s' }}>
              <textarea
                ref={textRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
                }}
                onKeyDown={handleKey}
                placeholder="Beschreibe deine Idee…"
                rows={1}
                style={{ flex:1, resize:'none', border:'none', outline:'none', background:'transparent', fontSize:15, lineHeight:1.6, color:'var(--text)', fontFamily:'inherit', fontWeight:500, overflowY:'hidden', minHeight:26, maxHeight:180, padding:0, caretColor:'var(--accent)' }}
              />
              <button onClick={send} disabled={!input.trim() || aiLoading}
                style={{ width:38, height:38, borderRadius:11, border:'none', flexShrink:0, background:(input.trim()&&!aiLoading)?'var(--btn-prim)':'var(--surface-2)', color:(input.trim()&&!aiLoading)?'var(--btn-prim-text)':'var(--text-muted)', cursor:(input.trim()&&!aiLoading)?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .15s, color .15s' }}>
                {aiLoading
                  ? <span style={{ width:14, height:14, border:'2px solid rgba(128,128,128,.3)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                }
              </button>
            </div>

            {/* Hint strip */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, padding:'0 2px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:11, color:'var(--text-muted)', opacity:.7 }}>Enter zum Senden · Shift+Enter neue Zeile</span>
                <span style={{ width:1, height:10, background:'var(--border)' }}/>
                <span style={{ fontSize:11, color:'var(--text-muted)', opacity:.7 }}>Tipp: <code style={{ fontFamily:'ui-monospace,monospace', background:'var(--surface-2)', padding:'1px 5px', borderRadius:4, fontSize:10 }}>test projekt</code> für Demo</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, color:'var(--text-muted)', opacity:.5, letterSpacing:'.04em' }}>
                <span style={{ fontSize:11 }}>✦</span>
                TAGRO AI
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
