'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChatMarkdown from '@/components/ChatMarkdown'
import TagroLogo from '@/components/TagroLogo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Msg  = { role: 'ai' | 'user'; text: string }
type Mode = 'chat' | 'manual'

const PROJECT_TYPES = ['Web-App / SaaS','Mobile App','E-Commerce','Dashboard','API / Backend','Landing Page','AI-Integration','Anderes']
const BUDGETS       = ['< €5k','€5k–20k','€20k–50k','> €50k','Offen']
const TIMELINES     = ['< 4 Wochen','1–3 Monate','3–6 Monate','> 6 Monate','Flexibel']
const TEST_TRIGGER  = /^\s*test[\s\-_]*projekt\s*$/i

const AI_SYSTEM = `Du bist Tagro, der AI-Projektmanager von Festag — das AI-native Softwareproduktionssystem.

PERSÖNLICHKEIT: Direkt, kompetent, wie ein erfahrener Tech-Lead. Keine leeren Floskeln. Kein Smalltalk.

AUFGABE: Führe ein strukturiertes Aufnahmegespräch. Sammle:
1. Was gebaut werden soll (Ziel, Problem, Lösung)
2. Für wen (Zielgruppe)
3. Wichtigste Features (Scope)
4. Budget und Timeline
5. Technische Anforderungen

GESPRÄCHSFÜHRUNG:
- Bestätige kurz was du verstanden hast (1 Satz), dann EINE konkrete Folgefrage
- Max. 3 Sätze pro Antwort
- Sprache: Deutsch. Markdown erlaubt.

ABSCHLUSS: Nach 5-7 Antworten schreibe:
"Ich habe alle relevanten Informationen. Ich zerlege dein Projekt jetzt strukturiert."
Dann auf neuer Zeile exakt: {"ready":true}

Starte mit: "Was möchtest du bauen — und welches Problem löst es konkret?"`

export default function OnboardingPage() {
  const router = useRouter()
  const [msgs,        setMsgs]        = useState<Msg[]>([])
  const [input,       setInput]       = useState('')
  const [aiLoading,   setAiLoading]   = useState(false)
  const [ready,       setReady]       = useState(false)
  const [decomposing, setDecomposing] = useState(false)
  const [projectId,   setProjectId]   = useState<string|null>(null)
  const [userId,      setUserId]      = useState<string|null>(null)
  const [phase,       setPhase]       = useState<'chat'|'decompose'|'done'>('chat')
  const [mode,        setMode]        = useState<Mode>('chat')
  const [decomposeErr,setDecomposeErr]= useState('')
  const [mTitle,      setMTitle]      = useState('')
  const [mDesc,       setMDesc]       = useState('')
  const [mType,       setMType]       = useState('')
  const [mBudget,     setMBudget]     = useState('')
  const [mTimeline,   setMTimeline]   = useState('')
  const [mSubmitting, setMSubmitting] = useState(false)
  const [mError,      setMError]      = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const supabase  = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      setUserId(uid)
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
      setTimeout(() => inputRef.current?.focus(), 80)
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
      } else { setPhase('chat'); setDecomposing(false) }
    } catch { setPhase('chat'); setDecomposing(false) }
  }

  async function send() {
    if (!input.trim() || aiLoading) return
    const msg = input.trim(); setInput('')
    if (inputRef.current) { inputRef.current.style.height = 'auto' }
    const newMsgs: Msg[] = [...msgs, { role: 'user', text: msg }]
    setMsgs(newMsgs)
    if (TEST_TRIGGER.test(msg)) {
      setMsgs(m => [...m, { role: 'ai', text: 'Test-Modus. Lege Demo-Projekt an.' }])
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
      const text: string = d.content?.[0]?.text ?? ''
      if (text.includes('{"ready":true}')) {
        setMsgs(m => [...m, { role: 'ai', text: text.replace('{"ready":true}', '').trim() }])
        setReady(true)
      } else {
        setMsgs(m => [...m, { role: 'ai', text: text || 'Kurze Pause. Schreib weiter.' }])
      }
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindung unterbrochen. Bitte erneut versuchen.' }])
    }
    setAiLoading(false)
    setTimeout(() => inputRef.current?.focus(), 40)
  }

  async function decompose() {
    if (!userId) return
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
        setDecomposeErr(d.error ?? 'Fehler. Bitte erneut versuchen.')
      }
    } catch { setPhase('chat'); setDecomposing(false); setDecomposeErr('Verbindungsfehler.') }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !mTitle.trim()) { setMError('Projektname erforderlich.'); return }
    setMSubmitting(true); setMError('')
    try {
      const description = [mDesc, mType && `Typ: ${mType}`, mBudget && `Budget: ${mBudget}`, mTimeline && `Timeline: ${mTimeline}`].filter(Boolean).join('\n')
      const { data: project, error } = await supabase.from('projects').insert({
        user_id: userId, title: mTitle.trim(), description: description || null, status: 'intake'
      }).select().single()
      if (error) throw error
      await supabase.from('profiles').update({ onboarding_step: 99 }).eq('id', userId)
      setProjectId((project as any).id); setPhase('done')
    } catch (err: any) { setMError(err.message ?? 'Fehler.') }
    setMSubmitting(false)
  }

  const css = `
    @keyframes spin    { to { transform:rotate(360deg); } }
    @keyframes pulse   { 0%,100%{opacity:1;} 50%{opacity:.3;} }
    @keyframes fadeUp  { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;} }
    @keyframes dot     { from{opacity:.2;transform:scale(.75);}to{opacity:1;transform:scale(1);} }
    @keyframes bdIn    { from{opacity:0;} to{opacity:1;} }
    @keyframes mdIn    { from{opacity:0;transform:translateY(16px) scale(.97);}to{opacity:1;transform:none;} }
    @keyframes floatIn { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;} }
    .ob-msg-ai  { animation:fadeUp .22s cubic-bezier(.16,1,.3,1) both; }
    .ob-msg-usr { animation:fadeUp .15s cubic-bezier(.16,1,.3,1) both; }
    .ob-inp { resize:none; background:transparent; border:none; outline:none; font-family:inherit; color:var(--text); font-size:15px; line-height:1.65; width:100%; }
    .ob-inp::placeholder { color:var(--text-muted); opacity:.7; }
    .chip-opt { padding:6px 14px; border-radius:7px; font-size:12.5px; font-weight:500; cursor:pointer; font-family:inherit; transition:all .12s; border:1px solid var(--border); background:transparent; color:var(--text-secondary); }
    .chip-opt:hover { border-color:var(--text-muted); }
    .chip-opt.sel { background:var(--text); color:var(--bg); border-color:var(--text); }
    .m-input { width:100%; padding:10px 14px; background:var(--surface-2); border:1px solid var(--border); border-radius:9px; font-size:13.5px; color:var(--text); font-family:inherit; outline:none; box-sizing:border-box; transition:border-color .15s; }
    .m-input:focus { border-color:var(--text-secondary); background:var(--card); }
    .m-input::placeholder { color:var(--text-muted); }
  `

  const Backdrop = ({ children }: { children: React.ReactNode }) => (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.8)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', animation:'bdIn .2s ease' }}>
      <style>{css}</style>
      {children}
    </div>
  )

  /* ── DONE ── */
  if (phase === 'done') return (
    <Backdrop>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'48px 40px', maxWidth:420, width:'100%', textAlign:'center', animation:'mdIn .28s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(34,197,94,.1)', border:'1.5px solid rgba(34,197,94,.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 22px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.4px', margin:'0 0 10px' }}>Projekt strukturiert</h2>
        <p style={{ fontSize:14, color:'var(--text-muted)', margin:'0 0 32px', lineHeight:1.65 }}>
          Tagro hat dein Projekt analysiert und in Epics und Tasks zerlegt.
        </p>
        <Link href={`/project/${projectId}`} style={{ textDecoration:'none', display:'block', marginBottom:10 }}>
          <button style={{ width:'100%', height:42, background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', letterSpacing:'-.1px' }}>
            Projekt öffnen →
          </button>
        </Link>
        <Link href="/dashboard" style={{ textDecoration:'none' }}>
          <button style={{ width:'100%', height:36, background:'transparent', color:'var(--text-muted)', border:'none', fontSize:12.5, cursor:'pointer', fontFamily:'inherit' }}>
            Zum Dashboard
          </button>
        </Link>
      </div>
    </Backdrop>
  )

  /* ── DECOMPOSE ── */
  if (phase === 'decompose') return (
    <Backdrop>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'48px 40px', maxWidth:400, width:'100%', textAlign:'center', animation:'mdIn .28s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ width:44, height:44, border:'2.5px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin .9s linear infinite', margin:'0 auto 26px' }}/>
        <h2 style={{ fontSize:19, fontWeight:700, letterSpacing:'-.3px', margin:'0 0 8px' }}>Tagro analysiert</h2>
        <p style={{ fontSize:13.5, color:'var(--text-muted)', lineHeight:1.6, margin:'0 0 28px' }}>Epics, Tasks und Akzeptanzkriterien werden erstellt…</p>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {['Ziele & Scope definieren','Epics strukturieren','Tasks erstellen','Prioritäten setzen'].map((s, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--text-muted)', animation:`dot 1.2s ${i*0.2}s ease-in-out infinite alternate`, flexShrink:0 }}/>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </Backdrop>
  )

  /* ── MANUAL FORM ── */
  if (mode === 'manual') return (
    <Backdrop>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, width:'100%', maxWidth:580, maxHeight:'92vh', display:'flex', flexDirection:'column', animation:'mdIn .28s cubic-bezier(.16,1,.3,1)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={() => setMode('chat')} style={{ width:28, height:28, background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div>
              <span style={{ fontSize:14, fontWeight:700, color:'var(--text)', letterSpacing:'-.2px' }}>Manuelles Formular</span>
              <span style={{ fontSize:11.5, color:'var(--text-muted)', marginLeft:8 }}>· Neues Projekt</span>
            </div>
          </div>
          <Link href="/dashboard">
            <button style={{ width:28, height:28, background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', borderRadius:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </Link>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'28px 28px 24px', scrollbarWidth:'none' }}>
          <form onSubmit={submitManual}>
            <div style={{ display:'flex', flexDirection:'column', gap:22 }}>

              {/* Title */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:7 }}>Projektname *</label>
                <input value={mTitle} onChange={e => setMTitle(e.target.value)} required
                  placeholder="z.B. Kunden-Portal mit AI-Chat"
                  autoFocus
                  style={{ width:'100%', padding:'12px 16px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, fontSize:15, fontWeight:600, color:'var(--text)', fontFamily:'inherit', outline:'none', boxSizing:'border-box', letterSpacing:'-.1px' }}
                  onFocus={e => e.target.style.borderColor = 'var(--text-secondary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:7 }}>Beschreibung</label>
                <textarea value={mDesc} onChange={e => setMDesc(e.target.value)} rows={3}
                  placeholder="Was soll gebaut werden? Für wen? Welches Problem löst es?"
                  className="m-input" style={{ resize:'vertical', lineHeight:1.6 }}
                />
              </div>

              {/* Type */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:10 }}>Projekttyp</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {PROJECT_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setMType(t===mType?'':t)}
                      className={`chip-opt${mType===t?' sel':''}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget + Timeline */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:10 }}>Budget</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {BUDGETS.map(b => (
                      <button key={b} type="button" onClick={() => setMBudget(b===mBudget?'':b)}
                        style={{ height:34, padding:'0 12px', border:`1px solid ${mBudget===b?'var(--text)':'var(--border)'}`, borderRadius:8, background:mBudget===b?'var(--text)':'transparent', color:mBudget===b?'var(--bg)':'var(--text-secondary)', fontSize:12.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all .1s' }}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:10 }}>Timeline</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {TIMELINES.map(t => (
                      <button key={t} type="button" onClick={() => setMTimeline(t===mTimeline?'':t)}
                        style={{ height:34, padding:'0 12px', border:`1px solid ${mTimeline===t?'var(--text)':'var(--border)'}`, borderRadius:8, background:mTimeline===t?'var(--text)':'transparent', color:mTimeline===t?'var(--bg)':'var(--text-secondary)', fontSize:12.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all .1s' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {mError && <p style={{ fontSize:12.5, color:'#ef4444', margin:0, padding:'8px 12px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:7 }}>{mError}</p>}

              <button type="submit" disabled={!mTitle.trim()||mSubmitting}
                style={{ height:44, background:mTitle.trim()&&!mSubmitting?'var(--btn-prim)':'var(--border)', color:mTitle.trim()&&!mSubmitting?'var(--btn-prim-text)':'var(--text-muted)', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:mTitle.trim()&&!mSubmitting?'pointer':'default', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, letterSpacing:'-.1px' }}>
                {mSubmitting
                  ? <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Erstellt…</>
                  : 'Projekt erstellen →'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </Backdrop>
  )

  /* ── CHAT ── */
  const lastAiMsg = [...msgs].reverse().find(m => m.role === 'ai')
  const prevMsgs  = msgs.slice(0, -1)

  return (
    <Backdrop>
      <div style={{ width:'100%', maxWidth:660, display:'flex', flexDirection:'column', gap:0, animation:'mdIn .28s cubic-bezier(.16,1,.3,1)' }}>

        {/* ── TOP CONTAINER: Conversation ── */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'20px 20px 0 0', borderBottom:'none', overflow:'hidden', display:'flex', flexDirection:'column' }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <TagroLogo size={26} thinking={aiLoading} />
              <div>
                <span style={{ fontSize:13.5, fontWeight:700, color:'var(--text)', letterSpacing:'-.1px' }}>Tagro AI</span>
                <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:7 }}>· Neues Projekt</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={() => setMode('manual')}
                style={{ height:27, padding:'0 10px', background:'transparent', border:'1px solid var(--border)', borderRadius:7, fontSize:11, fontWeight:500, color:'var(--text-muted)', cursor:'pointer', fontFamily:'inherit', transition:'border-color .1s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                Formular
              </button>
              <Link href="/dashboard">
                <button style={{ width:27, height:27, background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', borderRadius:6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </Link>
            </div>
          </div>

          {/* Previous messages (condensed) */}
          {prevMsgs.length > 0 && (
            <div style={{ maxHeight:200, overflowY:'auto', padding:'16px 22px 0', display:'flex', flexDirection:'column', gap:10, scrollbarWidth:'none' }}>
              {prevMsgs.map((m, i) => (
                <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
                  {m.role === 'ai' ? (
                    <div style={{ maxWidth:'88%', fontSize:13, lineHeight:1.6, color:'var(--text-muted)' }}>
                      <ChatMarkdown text={m.text} variant="plain" />
                    </div>
                  ) : (
                    <div style={{ maxWidth:'80%', padding:'7px 12px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'10px 10px 3px 10px', fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.5 }}>
                      {m.text}
                    </div>
                  )}
                </div>
              ))}
              <div ref={msgs.length <= 1 ? bottomRef : undefined}/>
            </div>
          )}

          {/* Current AI message — prominent */}
          <div style={{ padding: prevMsgs.length > 0 ? '14px 22px 20px' : '28px 28px 24px' }}>
            {aiLoading && msgs.length === 0 ? (
              <div style={{ display:'flex', gap:6 }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--text-muted)', animation:`dot .9s ${i*0.16}s ease-in-out infinite alternate` }}/>
                ))}
              </div>
            ) : lastAiMsg ? (
              <div className="ob-msg-ai" style={{ fontSize: prevMsgs.length === 0 ? 18 : 15, fontWeight: prevMsgs.length === 0 ? 600 : 500, lineHeight:1.65, color:'var(--text)', letterSpacing: prevMsgs.length === 0 ? '-.2px' : 'normal' }}>
                <ChatMarkdown text={lastAiMsg.text} variant="plain" />
              </div>
            ) : null}
            {aiLoading && msgs.length > 0 && (
              <div style={{ display:'flex', gap:5, marginTop:10 }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-muted)', animation:`dot .9s ${i*0.16}s ease-in-out infinite alternate` }}/>
                ))}
              </div>
            )}
            {decomposeErr && (
              <p style={{ fontSize:12.5, color:'#ef4444', margin:'8px 0 0' }}>
                {decomposeErr}{' '}
                <button onClick={decompose} style={{ color:'#ef4444', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:600 }}>Erneut →</button>
              </p>
            )}
            {ready && !decomposing && (
              <div style={{ marginTop:16, padding:'14px 16px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                <p style={{ fontSize:13, color:'var(--text-secondary)', margin:0, lineHeight:1.5 }}>
                  Tagro hat genug Informationen.
                </p>
                <button onClick={decompose}
                  style={{ flexShrink:0, height:33, padding:'0 16px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:8, fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  Jetzt strukturieren →
                </button>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
        </div>

        {/* ── BOTTOM CONTAINER: Input ── */}
        {!ready && (
          <div style={{ display:'flex', flexDirection:'column' }}>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderTop:'1px solid rgba(255,255,255,.06)', borderRadius:'0 0 20px 20px', padding:'14px 18px 16px' }}>
              <div style={{ display:'flex', alignItems:'flex-end', gap:12 }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px'
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Beschreibe deine Idee…"
                  rows={2}
                  className="ob-inp"
                  style={{ maxHeight:130, minHeight:44 }}
                />
                <button onClick={send} disabled={!input.trim()||aiLoading}
                  style={{ width:38, height:38, borderRadius:10, border:'none', cursor:input.trim()&&!aiLoading?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:input.trim()&&!aiLoading?'var(--text)':'var(--border)', color:input.trim()&&!aiLoading?'var(--bg)':'var(--text-muted)', transition:'all .12s' }}>
                  {aiLoading
                    ? <span style={{ width:13, height:13, border:'2px solid rgba(128,128,128,.3)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
                  }
                </button>
              </div>
            </div>
            {/* Tagro hint below */}
            <div style={{ textAlign:'center', marginTop:12, animation:'floatIn .4s .15s cubic-bezier(.16,1,.3,1) both' }}>
              <span style={{ fontSize:11.5, color:'var(--text-muted)', opacity:.6, letterSpacing:'.02em' }}>
                Tagro · AI-Projektmanager von Festag · <kbd style={{ fontSize:10, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:4, padding:'1px 5px' }}>↵ Enter</kbd> zum Senden
              </span>
            </div>
          </div>
        )}
      </div>
    </Backdrop>
  )
}
