'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChatMarkdown from '@/components/ChatMarkdown'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Msg  = { role: 'ai' | 'user'; text: string }
type Mode = 'chat' | 'manual'

const PROJECT_TYPES = ['Web-App / SaaS','Mobile App','E-Commerce','Dashboard','API / Backend','Landing Page','AI-Integration','Anderes']
const BUDGETS       = ['< €5.000','€5.000 – €20.000','€20.000 – €50.000','> €50.000','Offen']
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
    @keyframes spin   { to { transform:rotate(360deg); } }
    @keyframes pulse  { 0%,100%{opacity:1;} 50%{opacity:.3;} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;} }
    @keyframes dot    { from{opacity:.2;transform:scale(.75);}to{opacity:1;transform:scale(1);} }
    @keyframes backdropIn { from{opacity:0;} to{opacity:1;} }
    @keyframes modalIn { from{opacity:0;transform:translateY(12px) scale(.98);}to{opacity:1;transform:none;} }
    .ob-row { animation:fadeUp .2s cubic-bezier(.16,1,.3,1) both; }
    .ob-inp { resize:none; background:transparent; border:none; outline:none; font-family:inherit; color:var(--text); font-size:14px; line-height:1.6; width:100%; }
    .ob-inp::placeholder { color:var(--text-muted); }
    .ob-send { width:32px; height:32px; border-radius:8px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background .1s; }
    .ob-field { width:100%; padding:9px 12px; background:transparent; border:1px solid var(--border); border-radius:7px; font-size:13px; color:var(--text); font-family:inherit; outline:none; box-sizing:border-box; transition:border-color .15s; }
    .ob-field:focus { border-color:var(--text-secondary); }
    .ob-chip { padding:4px 11px; border-radius:5px; font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; transition:all .1s; }
  `

  /* ── BACKDROP wrapper ── */
  const Backdrop = ({ children }: { children: React.ReactNode }) => (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.72)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', animation:'backdropIn .2s ease' }}>
      <style>{css}</style>
      {children}
    </div>
  )

  /* ── DONE ── */
  if (phase === 'done') return (
    <Backdrop>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'40px 36px', maxWidth:440, width:'100%', textAlign:'center', animation:'modalIn .25s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ fontSize:20, fontWeight:600, letterSpacing:'-.3px', margin:'0 0 8px' }}>Projekt strukturiert</h2>
        <p style={{ fontSize:13.5, color:'var(--text-muted)', margin:'0 0 28px', lineHeight:1.6 }}>
          Tagro hat dein Projekt in Epics und Tasks zerlegt.
        </p>
        <Link href={`/project/${projectId}`} style={{ textDecoration:'none', display:'block', marginBottom:8 }}>
          <button style={{ width:'100%', height:40, background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Projekt öffnen →
          </button>
        </Link>
        <Link href="/dashboard" style={{ textDecoration:'none' }}>
          <button style={{ width:'100%', height:36, background:'transparent', color:'var(--text-muted)', border:'none', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
            Zum Dashboard
          </button>
        </Link>
      </div>
    </Backdrop>
  )

  /* ── DECOMPOSE ── */
  if (phase === 'decompose') return (
    <Backdrop>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'40px 36px', maxWidth:400, width:'100%', textAlign:'center', animation:'modalIn .25s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ width:40, height:40, border:'2px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin .9s linear infinite', margin:'0 auto 24px' }}/>
        <h2 style={{ fontSize:18, fontWeight:600, letterSpacing:'-.3px', margin:'0 0 8px' }}>Tagro analysiert</h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6, margin:'0 0 24px' }}>Epics, Tasks und Akzeptanzkriterien werden erstellt…</p>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {['Ziele & Scope definieren','Epics strukturieren','Tasks erstellen','Prioritäten setzen'].map((s, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 12px', border:'1px solid var(--border)', borderRadius:7 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--text-muted)', animation:`dot 1.2s ${i*0.2}s ease-in-out infinite alternate`, flexShrink:0 }}/>
              <span style={{ fontSize:12.5, color:'var(--text-secondary)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </Backdrop>
  )

  /* ── MANUAL FORM ── */
  if (mode === 'manual') return (
    <Backdrop>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:520, maxHeight:'90vh', display:'flex', flexDirection:'column', animation:'modalIn .25s cubic-bezier(.16,1,.3,1)' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={() => setMode('chat')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Manuelles Formular</span>
          </div>
          <Link href="/dashboard">
            <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </Link>
        </div>
        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
          <form onSubmit={submitManual}>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em', display:'block', marginBottom:5 }}>PROJEKTNAME *</label>
                <input value={mTitle} onChange={e => setMTitle(e.target.value)} required placeholder="z.B. Kunden-Portal mit AI-Chat" className="ob-field"/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em', display:'block', marginBottom:5 }}>BESCHREIBUNG</label>
                <textarea value={mDesc} onChange={e => setMDesc(e.target.value)} rows={3}
                  placeholder="Was soll gebaut werden? Für wen? Welches Problem löst es?"
                  className="ob-field" style={{ resize:'vertical', lineHeight:1.55 }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em', display:'block', marginBottom:7 }}>TYP</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {PROJECT_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setMType(t===mType?'':t)} className="ob-chip"
                      style={{ border:`1px solid ${mType===t?'var(--text)':'var(--border)'}`, background:mType===t?'var(--text)':'transparent', color:mType===t?'var(--bg)':'var(--text-secondary)' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em', display:'block', marginBottom:5 }}>BUDGET</label>
                  <select value={mBudget} onChange={e => setMBudget(e.target.value)} className="ob-field" style={{ cursor:'pointer' }}>
                    <option value="">Wählen</option>{BUDGETS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em', display:'block', marginBottom:5 }}>TIMELINE</label>
                  <select value={mTimeline} onChange={e => setMTimeline(e.target.value)} className="ob-field" style={{ cursor:'pointer' }}>
                    <option value="">Wählen</option>{TIMELINES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {mError && <p style={{ fontSize:12, color:'#ef4444', margin:0 }}>{mError}</p>}
              <button type="submit" disabled={!mTitle.trim()||mSubmitting}
                style={{ height:38, background:mTitle.trim()&&!mSubmitting?'var(--btn-prim)':'var(--border)', color:mTitle.trim()&&!mSubmitting?'var(--btn-prim-text)':'var(--text-muted)', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:mTitle.trim()&&!mSubmitting?'pointer':'default', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                {mSubmitting ? <><span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>Erstellt…</> : 'Projekt erstellen →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Backdrop>
  )

  /* ── CHAT ── */
  return (
    <Backdrop>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:600, maxHeight:'88vh', display:'flex', flexDirection:'column', animation:'modalIn .25s cubic-bezier(.16,1,.3,1)' }}>

        {/* Modal header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Tagro AI</span>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>· Neues Projekt</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={() => setMode('manual')}
              style={{ height:26, padding:'0 10px', background:'transparent', border:'1px solid var(--border)', borderRadius:6, fontSize:11, fontWeight:500, color:'var(--text-muted)', cursor:'pointer', fontFamily:'inherit' }}>
              Formular
            </button>
            <Link href="/dashboard">
              <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </Link>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 20px 0', display:'flex', flexDirection:'column', gap:16 }}>
          {msgs.map((m, i) => (
            <div key={i} className={i === msgs.length-1 ? 'ob-row' : ''} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
              {m.role === 'ai' ? (
                <div style={{ maxWidth:'86%', fontSize:14, lineHeight:1.65, color:'var(--text)' }}>
                  <ChatMarkdown text={m.text} variant="plain" />
                </div>
              ) : (
                <div style={{ maxWidth:'80%', padding:'10px 14px', background:'var(--text)', color:'var(--bg)', borderRadius:'12px 12px 3px 12px', fontSize:13.5, fontWeight:500, lineHeight:1.5 }}>
                  {m.text}
                </div>
              )}
            </div>
          ))}
          {aiLoading && (
            <div style={{ display:'flex', gap:5, paddingLeft:2 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-muted)', animation:`dot .9s ${i*0.16}s ease-in-out infinite alternate` }}/>
              ))}
            </div>
          )}
          {decomposeErr && (
            <p style={{ fontSize:12, color:'#ef4444', margin:'4px 0' }}>{decomposeErr} <button onClick={decompose} style={{ color:'#ef4444', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600 }}>Erneut →</button></p>
          )}
          {ready && !decomposing && (
            <div className="ob-row" style={{ margin:'8px 0 4px', padding:'16px 18px', border:'1px solid var(--border)', borderRadius:10 }}>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 12px', lineHeight:1.55 }}>
                Tagro hat genug Informationen. Projekt jetzt strukturieren?
              </p>
              <button onClick={decompose}
                style={{ height:34, padding:'0 16px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Jetzt strukturieren →
              </button>
            </div>
          )}
          <div ref={bottomRef} style={{ height:12 }}/>
        </div>

        {/* Input */}
        {!ready && (
          <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'flex-end', gap:10, flexShrink:0 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Beschreibe deine Idee…"
              rows={1}
              className="ob-inp"
              style={{ maxHeight:120 }}
            />
            <button onClick={send} disabled={!input.trim()||aiLoading} className="ob-send"
              style={{ background:input.trim()&&!aiLoading?'var(--text)':'var(--border)', color:input.trim()&&!aiLoading?'var(--bg)':'var(--text-muted)', cursor:input.trim()&&!aiLoading?'pointer':'default' }}>
              {aiLoading
                ? <span style={{ width:12, height:12, border:'2px solid rgba(128,128,128,.3)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
              }
            </button>
          </div>
        )}
      </div>
    </Backdrop>
  )
}
