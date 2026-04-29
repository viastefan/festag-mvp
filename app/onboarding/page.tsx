'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'
import ChatMarkdown from '@/components/ChatMarkdown'
import Link from 'next/link'

type Msg = { role: 'ai' | 'user'; text: string }

const TEST_TRIGGER = /^\s*test[\s\-_]*projekt\s*$/i

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

FORMATIERUNG: Markdown ist erlaubt — **fett** für Schlüsselbegriffe, Listen für Aufzählungen, \`code\` für technische Begriffe. Halte den Text trotzdem knapp.

ABSCHLUSS: Nach 5-7 Antworten des Kunden hast du genug. Schreibe dann:
"Ich habe alle relevanten Informationen. Ich zerlege dein Projekt jetzt strukturiert."
Dann schreibe auf einer neuen Zeile exakt: {"ready":true}

Starte das Gespräch mit: "Was möchtest du bauen — und welches Problem löst es konkret?"`

export default function OnboardingPage() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [decomposing, setDecomposing] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'chat'|'decompose'|'done'>('chat')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  // Get user + start AI conversation
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      setUserId(uid)

      // Check if already has completed onboarding
      const { data: profile } = await supabase.from('profiles').select('onboarding_step').eq('id', uid).single()
      if (profile?.onboarding_step === 99) {
        window.location.href = '/dashboard'
        return
      }

      // Start conversation
      setAiLoading(true)
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: AI_SYSTEM,
            max_tokens: 200,
            messages: [{ role: 'user', content: 'Start' }]
          })
        })
        const d = await res.json()
        const text = d.content?.[0]?.text ?? 'Was möchtest du bauen?'
        setMsgs([{ role: 'ai', text }])
      } catch {
        setMsgs([{ role: 'ai', text: 'Was möchtest du bauen — und welches Problem löst es konkret?' }])
      }
      setAiLoading(false)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, aiLoading])

  async function createTestProject() {
    if (!userId) return
    setPhase('decompose')
    setDecomposing(true)
    try {
      const res = await fetch('/api/ai/test-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const d = await res.json()
      if (d.projectId) {
        setProjectId(d.projectId)
        await supabase.from('profiles').update({ onboarding_step: 99 }).eq('id', userId)
        setPhase('done')
      } else {
        setPhase('chat')
        setDecomposing(false)
        setMsgs(m => [...m, { role: 'ai', text: 'Konnte Test-Projekt nicht anlegen. Bitte erneut versuchen.' }])
      }
    } catch {
      setPhase('chat')
      setDecomposing(false)
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindungsfehler beim Anlegen des Test-Projekts.' }])
    }
  }

  async function send() {
    if (!input.trim() || aiLoading) return
    const msg = input.trim()
    setInput('')
    const newMsgs: Msg[] = [...msgs, { role: 'user', text: msg }]
    setMsgs(newMsgs)

    // Shortcut: "test projekt" → direkt vorgefertigtes Projekt anlegen
    if (TEST_TRIGGER.test(msg)) {
      setMsgs(m => [...m, { role: 'ai', text: '**Test-Modus erkannt.** Lege ein vordefiniertes Test-Projekt an — kein Gespräch nötig.' }])
      setTimeout(() => createTestProject(), 400)
      return
    }

    setAiLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: AI_SYSTEM,
          max_tokens: 300,
          messages: newMsgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
        })
      })
      const d = await res.json()
      let text: string = d.content?.[0]?.text ?? ''

      // Check if AI is done
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
    if (!userId) return
    setDecomposing(true)
    setPhase('decompose')

    try {
      const res = await fetch('/api/ai/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory: msgs, userId })
      })
      const d = await res.json()
      if (d.projectId) {
        setProjectId(d.projectId)
        // Mark onboarding complete
        await supabase.from('profiles').update({ onboarding_step: 99 }).eq('id', userId)
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

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ── DONE STATE ──────────────────────────────────────────────
  if (phase === 'done') return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:480, width:'100%', textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--green-bg)', border:'1.5px solid var(--green-border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:28 }}>✓</div>
        <h1 style={{ fontSize:28, fontWeight:700, color:'var(--text)', letterSpacing:'-.6px', marginBottom:10 }}>Projekt strukturiert.</h1>
        <p style={{ fontSize:15, color:'var(--text-secondary)', lineHeight:1.6, marginBottom:32 }}>
          Tagro hat dein Projekt in Epics und Tasks zerlegt. Das Team kann jetzt mit der Arbeit beginnen.
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

  // ── DECOMPOSE STATE ──────────────────────────────────────────
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
          {['Ziele & Scope definieren','Epics strukturieren','Tasks & Subtasks erstellen','Prioritäten setzen','Akzeptanzkriterien formulieren'].map((s, i) => (
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

  // ── CHAT STATE ───────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Aeonik', -apple-system, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:17, filter:'var(--logo-filter,none)' }}/>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.06em', textTransform:'uppercase' }}>Projekt-Aufnahme</span>
        </div>
        <ThemeToggle/>
      </header>

      {/* Chat canvas — paper feel */}
      <div style={{ flex:1, overflowY:'auto', padding:'32px 24px 0', maxWidth:700, width:'100%', margin:'0 auto', WebkitOverflowScrolling:'touch' }}>

        {/* Tagro intro chip */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:28 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✦</div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0, lineHeight:1 }}>Tagro AI</p>
            <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, marginTop:2 }}>Projekt-Aufnahme · Festag System</p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'ai' ? (
                <div style={{
                  fontSize: 16, lineHeight: 1.65, color: 'var(--text)',
                  maxWidth: '85%', fontWeight: 500,
                }}>
                  <ChatMarkdown text={m.text} variant="plain" />
                </div>
              ) : (
                <div style={{
                  background: 'var(--accent)', color: 'var(--accent-text)',
                  padding: '12px 18px', borderRadius: '18px 18px 4px 18px',
                  fontSize: 15, fontWeight: 500, lineHeight: 1.5,
                  maxWidth: '80%',
                }}>
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
          <style>{`@keyframes dot{from{opacity:.2;transform:scale(.8);}to{opacity:1;transform:scale(1);}}`}</style>
        </div>

        {/* Ready: Decompose CTA */}
        {ready && !decomposing && (
          <div style={{ margin:'32px 0', padding:'20px 24px', background:'var(--card)', borderRadius:14, border:'1px solid var(--border)' }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>Tagro ist bereit.</p>
            <p style={{ fontSize:13, color:'var(--text-secondary)', margin:'0 0 16px', lineHeight:1.5 }}>
              Ich zerlege dein Projekt jetzt in Epics, Tasks und Akzeptanzkriterien — vollautomatisch.
            </p>
            <button onClick={decompose} style={{
              width:'100%', padding:'14px 20px',
              background:'var(--btn-prim)', color:'var(--btn-prim-text)',
              border:'none', borderRadius:10, fontSize:15, fontWeight:700,
              cursor:'pointer', fontFamily:'inherit',
            }}>
              Projekt strukturieren →
            </button>
          </div>
        )}

        <div ref={bottomRef} style={{ height:120 }}/>
      </div>

      {/* Input — Paper/Canvas style */}
      {!ready && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          padding: '16px 24px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}>
          <div style={{ maxWidth:700, margin:'0 auto' }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
            }}>
              <textarea
                ref={textRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                }}
                onKeyDown={handleKey}
                placeholder="Schreib hier deine Antwort…"
                rows={1}
                style={{
                  flex: 1,
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  fontWeight: 500,
                  padding: '6px 0',
                  overflowY: 'hidden',
                  minHeight: 36,
                  caretColor: 'var(--btn-prim)',
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || aiLoading}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: input.trim() ? 'var(--btn-prim)' : 'var(--card)',
                  border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background .15s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? 'var(--btn-prim-text)' : 'var(--text-muted)'} strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:8, opacity:.6 }}>
              Enter zum Senden · Shift+Enter für neue Zeile · Tipp: <code style={{ fontFamily:'ui-monospace,monospace', background:'var(--surface-2)', padding:'1px 5px', borderRadius:4 }}>test projekt</code> für Demo
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
