'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'
import Link from 'next/link'

type Msg = { role: 'ai' | 'user'; text: string }
type Mode = 'chat' | 'manual'

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

ABSCHLUSS: Nach 5-7 Antworten des Kunden hast du genug. Schreibe dann:
"Ich habe alle relevanten Informationen. Ich zerlege dein Projekt jetzt strukturiert."
Dann schreibe auf einer neuen Zeile exakt: {"ready":true}

Starte das Gespräch mit: "Was möchtest du bauen — und welches Problem löst es konkret?"`

const PROJECT_TYPES = [
  'Web-App / SaaS', 'Mobile App (iOS/Android)', 'E-Commerce / Shop',
  'Dashboard / Analytics', 'API / Backend', 'Landing Page / Website',
  'AI-Integration', 'Anderes',
]
const BUDGETS = ['Unter €5.000', '€5.000 – €20.000', '€20.000 – €50.000', 'Über €50.000', 'Noch nicht definiert']
const TIMELINES = ['Unter 4 Wochen', '1–3 Monate', '3–6 Monate', 'Über 6 Monate', 'Flexibel']

export default function OnboardingPage() {
  const [msgs,       setMsgs]       = useState<Msg[]>([])
  const [input,      setInput]      = useState('')
  const [aiLoading,  setAiLoading]  = useState(false)
  const [ready,      setReady]      = useState(false)
  const [decomposing,setDecomposing]= useState(false)
  const [projectId,  setProjectId]  = useState<string | null>(null)
  const [userId,     setUserId]     = useState<string | null>(null)
  const [phase,      setPhase]      = useState<'chat'|'decompose'|'done'>('chat')
  const [mode,       setMode]       = useState<Mode>('chat')

  // Manual form state
  const [mTitle,    setMTitle]    = useState('')
  const [mDesc,     setMDesc]     = useState('')
  const [mType,     setMType]     = useState('')
  const [mBudget,   setMBudget]   = useState('')
  const [mTimeline, setMTimeline] = useState('')
  const [mContact,  setMContact]  = useState('')
  const [mSubmitting, setMSubmitting] = useState(false)
  const [mError,    setMError]    = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const textRef   = useRef<HTMLTextAreaElement>(null)
  const supabase  = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      setUserId(uid)

      const { data: profile } = await supabase.from('profiles').select('onboarding_step').eq('id', uid).single()
      if (profile?.onboarding_step === 99) {
        window.location.href = '/dashboard'
        return
      }

      // Start AI conversation
      setAiLoading(true)
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: AI_SYSTEM,
            max_tokens: 200,
            messages: [{ role: 'user', content: 'Start' }],
          }),
        })
        const d = await res.json()
        const text = d.content?.[0]?.text ?? 'Was möchtest du bauen — und welches Problem löst es konkret?'
        setMsgs([{ role: 'ai', text }])
      } catch {
        setMsgs([{ role: 'ai', text: 'Was möchtest du bauen — und welches Problem löst es konkret?' }])
      }
      setAiLoading(false)
    })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, aiLoading])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  async function send() {
    if (!input.trim() || aiLoading) return
    const msg = input.trim()
    setInput('')
    const newMsgs: Msg[] = [...msgs, { role: 'user', text: msg }]
    setMsgs(newMsgs)
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: AI_SYSTEM,
          max_tokens: 300,
          messages: newMsgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
        }),
      })
      const d = await res.json()
      let text: string = d.content?.[0]?.text ?? ''
      if (text.includes('{"ready":true}')) {
        const display = text.replace('{"ready":true}', '').trim()
        setMsgs(m => [...m, { role: 'ai', text: display }])
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
    if (!userId || decomposing) return
    setDecomposing(true)
    setPhase('decompose')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ai/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory: msgs, userId, authToken: session?.access_token }),
      })
      const d = await res.json()
      if (d.projectId) {
        await supabase.from('profiles').update({ onboarding_step: 99 }).eq('id', userId)
        setProjectId(d.projectId)
        setPhase('done')
      } else {
        setPhase('chat')
        setDecomposing(false)
      }
    } catch {
      setPhase('chat')
      setDecomposing(false)
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !mTitle.trim()) { setMError('Projektname ist erforderlich.'); return }
    setMSubmitting(true)
    setMError('')
    try {
      const description = [
        mDesc,
        mType     ? `Projekttyp: ${mType}` : '',
        mBudget   ? `Budget: ${mBudget}` : '',
        mTimeline ? `Timeline: ${mTimeline}` : '',
        mContact  ? `Kontakt: ${mContact}` : '',
      ].filter(Boolean).join('\n')

      const { data: project, error } = await supabase.from('projects').insert({
        user_id: userId,
        title: mTitle.trim(),
        description: description || null,
        status: 'intake',
      }).select().single()

      if (error) throw error

      await supabase.from('profiles').update({ onboarding_step: 99 }).eq('id', userId)

      // Log to activity feed
      await supabase.from('activity_feed').insert({
        user_id: userId,
        project_id: project.id,
        type: 'project_status',
        message: `Projekt "${mTitle.trim()}" wurde manuell angelegt und wartet auf Bearbeitung.`,
      }).catch(() => {})

      setProjectId(project.id)
      setPhase('done')
    } catch (err: any) {
      setMError(err.message ?? 'Fehler beim Erstellen. Bitte erneut versuchen.')
    }
    setMSubmitting(false)
  }

  // ── DONE ────────────────────────────────────────────────────
  if (phase === 'done') return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      <div style={{ maxWidth:420, width:'100%', textAlign:'center' }}>
        <div style={{ width:56, height:56, borderRadius:16, background:'var(--green-bg)', border:'1px solid var(--green-border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:24 }}>✓</div>
        <h2 style={{ fontSize:24, fontWeight:700, color:'var(--text)', marginBottom:10 }}>Projekt erstellt!</h2>
        <p style={{ fontSize:14, color:'var(--text-secondary)', marginBottom:32, lineHeight:1.6 }}>
          Dein Projekt wurde angelegt. Unser Team wird es in Kürze aufnehmen.
        </p>
        <Link href={`/project/${projectId}`}>
          <button style={{ width:'100%', padding:'16px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:12, fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginBottom:12 }}>
            Projekt öffnen →
          </button>
        </Link>
        <Link href="/dashboard">
          <button style={{ width:'100%', padding:'14px', background:'transparent', color:'var(--text-muted)', border:'none', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
            Zum Dashboard
          </button>
        </Link>
      </div>
    </div>
  )

  // ── DECOMPOSE ─────────────────────────────────────────────
  if (phase === 'decompose') return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:420, width:'100%', textAlign:'center' }}>
        <div style={{ width:48, height:48, border:'2px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 28px' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:10 }}>Tagro analysiert dein Projekt</h2>
        <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.6 }}>
          Erstelle Epics, Tasks, Prioritäten und Akzeptanzkriterien…
        </p>
        <div style={{ marginTop:32, display:'flex', flexDirection:'column', gap:8 }}>
          {['Ziele & Scope definieren','Epics strukturieren','Tasks & Subtasks erstellen','Prioritäten setzen','Akzeptanzkriterien formulieren'].map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--card)', borderRadius:10, border:'1px solid var(--border)' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', animation:`pulse 2s ${i*0.3}s infinite` }}/>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{s}</span>
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}`}</style>
      </div>
    </div>
  )

  // ── MANUAL FORM ───────────────────────────────────────────
  if (mode === 'manual') return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      <header style={{ position:'sticky', top:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:17, filter:'var(--logo-filter,none)' }}/>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.06em', textTransform:'uppercase' }}>Projekt-Aufnahme</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => setMode('chat')} style={{ height:34, padding:'0 14px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:9, fontSize:12, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>
            ← AI-Chat
          </button>
          <ThemeToggle/>
        </div>
      </header>

      <div style={{ flex:1, overflowY:'auto', padding:'32px 24px 60px', maxWidth:660, width:'100%', margin:'0 auto' }}>
        {/* Info box */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px 24px', marginBottom:32 }}>
          <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>Persönliche Beratung bevorzugt?</p>
          <p style={{ fontSize:13, color:'var(--text-secondary)', margin:'0 0 16px', lineHeight:1.6 }}>
            Fülle das Formular aus — unser Team meldet sich innerhalb von 24 Stunden bei dir. Oder kontaktiere uns direkt:
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <a href="mailto:hello@festag.io" style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, textDecoration:'none' }}>
              <div style={{ width:34, height:34, borderRadius:9, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
              </div>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', margin:0, letterSpacing:'.06em' }}>E-MAIL</p>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:'2px 0 0' }}>hello@festag.io</p>
              </div>
            </a>
            <a href="https://wa.me/4989123456" target="_blank" rel="noopener" style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, textDecoration:'none' }}>
              <div style={{ width:34, height:34, borderRadius:9, background:'var(--green-bg)', border:'1px solid var(--green-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.3h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.19 6.19l.95-.95a2 2 0 0 1 2.1-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', margin:0, letterSpacing:'.06em' }}>WHATSAPP / TELEFON</p>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:'2px 0 0' }}>+49 (0)89 123 456 78</p>
              </div>
            </a>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submitManual}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', margin:'0 0 24px' }}>Projekt beschreiben</h2>

          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'.05em', display:'block', marginBottom:7 }}>PROJEKTNAME *</label>
              <input value={mTitle} onChange={e => setMTitle(e.target.value)} required
                placeholder="z.B. Kunden-Portal mit AI-Chat"
                style={{ width:'100%', padding:'11px 14px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'.05em', display:'block', marginBottom:7 }}>PROJEKTBESCHREIBUNG</label>
              <textarea value={mDesc} onChange={e => setMDesc(e.target.value)} rows={4}
                placeholder="Was soll gebaut werden? Welches Problem löst es? Für wen?"
                style={{ width:'100%', padding:'11px 14px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)', fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'.05em', display:'block', marginBottom:7 }}>PROJEKTTYP</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {PROJECT_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setMType(t === mType ? '' : t)}
                    style={{ padding:'7px 14px', borderRadius:20, border:'1px solid var(--border)', background: mType === t ? 'var(--accent)' : 'var(--card)', color: mType === t ? 'var(--accent-text)' : 'var(--text-secondary)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .12s' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'.05em', display:'block', marginBottom:7 }}>BUDGET</label>
                <select value={mBudget} onChange={e => setMBudget(e.target.value)}
                  style={{ width:'100%', padding:'11px 14px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--text)', fontFamily:'inherit', outline:'none', cursor:'pointer' }}>
                  <option value="">Bitte wählen</option>
                  {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'.05em', display:'block', marginBottom:7 }}>TIMELINE</label>
                <select value={mTimeline} onChange={e => setMTimeline(e.target.value)}
                  style={{ width:'100%', padding:'11px 14px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--text)', fontFamily:'inherit', outline:'none', cursor:'pointer' }}>
                  <option value="">Bitte wählen</option>
                  {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'.05em', display:'block', marginBottom:7 }}>DEINE KONTAKTMÖGLICHKEIT (OPTIONAL)</label>
              <input value={mContact} onChange={e => setMContact(e.target.value)}
                placeholder="Telefon, WhatsApp oder E-Mail für Rückfragen"
                style={{ width:'100%', padding:'11px 14px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {mError && (
              <p style={{ fontSize:13, color:'var(--red,#ef4444)', background:'rgba(239,68,68,.08)', padding:'10px 14px', borderRadius:9, margin:0 }}>{mError}</p>
            )}

            <button type="submit" disabled={!mTitle.trim() || mSubmitting}
              style={{ width:'100%', padding:'15px', background: mTitle.trim() && !mSubmitting ? 'var(--btn-prim)' : 'var(--surface-2)', color: mTitle.trim() && !mSubmitting ? 'var(--btn-prim-text)' : 'var(--text-muted)', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor: mTitle.trim() && !mSubmitting ? 'pointer' : 'default', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {mSubmitting
                ? <><span style={{ width:16, height:16, border:'2px solid rgba(128,128,128,.3)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Wird erstellt…</>
                : 'Projekt einreichen →'
              }
            </button>

            <Link href="/dashboard" style={{ textDecoration:'none', textAlign:'center' }}>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:0, cursor:'pointer' }}>Überspringen — direkt zum Dashboard</p>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )

  // ── CHAT ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column', fontFamily:"'Aeonik', -apple-system, sans-serif", WebkitFontSmoothing:'antialiased' }}>
      <style>{`@keyframes dot{from{opacity:.2;transform:scale(.8);}to{opacity:1;transform:scale(1);}}`}</style>

      <header style={{ position:'sticky', top:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:17, filter:'var(--logo-filter,none)' }}/>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.06em', textTransform:'uppercase' }}>Projekt-Aufnahme</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => setMode('manual')} style={{ height:34, padding:'0 14px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:9, fontSize:12, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>
            Formular ausfüllen
          </button>
          <Link href="/dashboard" style={{ textDecoration:'none' }}>
            <button style={{ height:34, padding:'0 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:9, fontSize:12, fontWeight:600, color:'var(--text-muted)', cursor:'pointer', fontFamily:'inherit' }}>
              Überspringen
            </button>
          </Link>
          <ThemeToggle/>
        </div>
      </header>

      <div style={{ flex:1, overflowY:'auto', padding:'32px 24px 0', maxWidth:700, width:'100%', margin:'0 auto', WebkitOverflowScrolling:'touch' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:28 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✦</div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0, lineHeight:1 }}>Tagro AI</p>
            <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, marginTop:2 }}>Projekt-Aufnahme · Festag System</p>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'ai' ? (
                <p style={{ fontSize:16, lineHeight:1.65, color:'var(--text)', margin:0, maxWidth:'85%', fontWeight:500 }}>{m.text}</p>
              ) : (
                <div style={{ background:'var(--accent)', color:'var(--accent-text)', padding:'12px 18px', borderRadius:'18px 18px 4px 18px', fontSize:15, fontWeight:500, lineHeight:1.5, maxWidth:'80%' }}>
                  {m.text}
                </div>
              )}
            </div>
          ))}
          {aiLoading && (
            <div style={{ display:'flex', gap:5, padding:'4px 0' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--text-muted)', animation:`dot .9s ${i*0.15}s ease-in-out infinite alternate` }}/>
              ))}
            </div>
          )}
        </div>

        {ready && !decomposing && (
          <div style={{ margin:'32px 0', padding:'20px 24px', background:'var(--card)', borderRadius:14, border:'1px solid var(--border)' }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>Tagro ist bereit.</p>
            <p style={{ fontSize:13, color:'var(--text-secondary)', margin:'0 0 16px', lineHeight:1.5 }}>
              Ich zerlege dein Projekt jetzt in Epics, Tasks und Akzeptanzkriterien — vollautomatisch.
            </p>
            <button onClick={decompose} style={{ width:'100%', padding:'14px 20px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Projekt strukturieren →
            </button>
          </div>
        )}
        <div ref={bottomRef} style={{ height:120 }}/>
      </div>

      {!ready && (
        <div style={{ position:'sticky', bottom:0, background:'var(--bg)', borderTop:'1px solid var(--border)', padding:'16px 24px', paddingBottom:'calc(16px + env(safe-area-inset-bottom))' }}>
          <div style={{ maxWidth:700, margin:'0 auto', display:'flex', alignItems:'flex-end', gap:10 }}>
            <textarea ref={textRef} value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
              }}
              onKeyDown={handleKey}
              placeholder="Schreib hier deine Antwort…"
              rows={1}
              style={{ flex:1, resize:'none', border:'none', outline:'none', background:'transparent', fontSize:15, lineHeight:1.6, color:'var(--text)', fontFamily:'inherit', fontWeight:500, padding:'6px 0', overflowY:'hidden', minHeight:36, caretColor:'var(--btn-prim)' }}
            />
            <button onClick={send} disabled={!input.trim() || aiLoading}
              style={{ width:36, height:36, borderRadius:'50%', background: input.trim() ? 'var(--btn-prim)' : 'var(--card)', border:'none', cursor: input.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background .15s' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? 'var(--btn-prim-text)' : 'var(--text-muted)'} strokeWidth="2.5" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:8, opacity:.6, maxWidth:700, margin:'8px auto 0' }}>
            Enter zum Senden · Shift+Enter für neue Zeile
          </p>
        </div>
      )}
    </div>
  )
}
