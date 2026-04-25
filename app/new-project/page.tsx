'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

// Animierte Placeholder-Texte die durchrotieren
const PLACEHOLDERS = [
  'Ich brauche eine SaaS-Buchungsplattform für mein Hotel mit API-Anbindung...',
  'Wir bauen ein Startup und brauchen eine Mobile App für iOS und Android...',
  'Eine interne Verwaltungssoftware für unser 50-köpfiges Team...',
  'Ein KI-gestütztes Dashboard für Echtzeit-Datenanalyse unserer Produktion...',
  'Eine E-Commerce-Plattform mit eigenem Payment-System und ERP-Anbindung...',
  'Wir brauchen eine Custom CRM-Lösung die mit Salesforce kommuniziert...',
]

const AI_SYSTEM = `Du bist Tagro, das AI-System von Festag — einer AI-nativen Softwareproduktionsfirma.

FESTAG PRINZIP: Kein Informationsverlust mehr zwischen Kunde und Entwickler. Die KI versteht beide Sprachen — Business für den Kunden, Technik für den Entwickler. Du bist diese KI.

DEINE AUFGABE: Führe ein kurzes, präzises Aufnahmegespräch. Du brauchst:
1. Was genau gebaut werden soll (Kernfunktion)
2. Für wen (Zielgruppe/Nutzer)
3. Grobe Timeline-Vorstellung
4. Ungefährer Teamgröße-Wunsch (1 Dev? 3? Team?)

REGELN:
- Max 2 Sätze pro Antwort — kurz und direkt
- Kein Emoji, keine leeren Floskeln
- Klinge wie ein erfahrener Tech Lead, nicht wie ein Support-Bot
- Stelle immer genau EINE Folgefrage
- Nach 3-4 User-Antworten: Fasse das Projekt in 2 Sätzen zusammen und schreibe exakt: {"ready":true,"summary":"...","project_type":"...","team_size":1}
- JSON auf eigener Zeile, reines JSON ohne Markdown
- Sprache: Deutsch`

type Msg = { role: 'ai' | 'user'; text: string }

export default function NewProjectPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [fromOnboarding, setFromOnboarding] = useState(false)

  // Phase 1: Texteingabe
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<'input' | 'chat' | 'done'>('input')
  const [plIdx, setPlIdx] = useState(0)
  const [plText, setPlText] = useState('')
  const [plDir, setPlDir] = useState<'in' | 'out'>('in')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Phase 2: AI Chat
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUserId(data.session.user.id)
        setIsLoggedIn(true)
      }
    })
    // Check if coming from onboarding
    const params = new URLSearchParams(window.location.search)
    setFromOnboarding(params.get('from') === 'onboarding')
  }, [])

  // Placeholder animation
  useEffect(() => {
    if (phase !== 'input') return
    let timeout: NodeJS.Timeout
    if (plDir === 'in') {
      timeout = setTimeout(() => setPlDir('out'), 2800)
    } else {
      timeout = setTimeout(() => {
        setPlIdx(i => (i + 1) % PLACEHOLDERS.length)
        setPlDir('in')
      }, 400)
    }
    return () => clearTimeout(timeout)
  }, [plDir, phase])

  useEffect(() => {
    setPlText(PLACEHOLDERS[plIdx])
  }, [plIdx])

  // Auto-scroll chat
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  async function startChat() {
    if (!input.trim()) return
    const userMsg = input.trim()
    setPhase('chat')

    // First AI response
    const initMsgs: Msg[] = [{ role: 'user', text: userMsg }]
    setMsgs(initMsgs)
    setAiLoading(true)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: AI_SYSTEM,
          messages: [{ role: 'user', content: userMsg }]
        })
      })
      const data = await res.json()
      const text: string = data.content?.[0]?.text ?? ''
      processAiResponse(text, initMsgs)
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindungsfehler. Bitte versuche es erneut.' }])
      setAiLoading(false)
    }
  }

  function processAiResponse(text: string, currentMsgs: Msg[]) {
    const jsonMatch = text.match(/\{"ready":true.*?\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        setSummary(parsed.summary ?? '')
        const displayText = text.replace(jsonMatch[0], '').trim()
        setMsgs([...currentMsgs, {
          role: 'ai',
          text: displayText || 'Perfekt — ich habe alles was ich brauche. Lass uns dein Projekt aufbauen.'
        }])
        setTimeout(() => setPhase('done'), 800)
        if (userId) {
          supabase.from('profiles').update({ company_description: parsed.summary }).eq('id', userId)
        }
      } catch {
        setMsgs([...currentMsgs, { role: 'ai', text }])
      }
    } else {
      setMsgs([...currentMsgs, { role: 'ai', text }])
    }
    setAiLoading(false)
  }

  async function sendChat() {
    if (!chatInput.trim() || aiLoading) return
    const msg = chatInput.trim()
    setChatInput('')
    const newMsgs: Msg[] = [...msgs, { role: 'user', text: msg }]
    setMsgs(newMsgs)
    setAiLoading(true)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: AI_SYSTEM,
          messages: newMsgs.map(m => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.text
          }))
        })
      })
      const data = await res.json()
      processAiResponse(data.content?.[0]?.text ?? '', newMsgs)
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindungsfehler.' }])
      setAiLoading(false)
    }
  }

  function proceed() {
    if (fromOnboarding || !isLoggedIn) {
      window.location.href = '/onboarding'
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:.25;}}
        @keyframes plIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        @keyframes plOut{from{opacity:1;transform:translateY(0);}to{opacity:0;transform:translateY(-6px);}}
        .msg-in{animation:fadeUp .22s cubic-bezier(.16,1,.3,1) both;}
        .pl-in{animation:plIn .35s cubic-bezier(.16,1,.3,1) both;}
        .pl-out{animation:plOut .3s ease both;}
        textarea{resize:none;}
        textarea::placeholder{opacity:0;}
      `}</style>

      <div style={{ minHeight:'100dvh', background:'var(--bg)', fontFamily:"'Aeonik',sans-serif",
        WebkitFontSmoothing:'antialiased', display:'flex', flexDirection:'column' }}>

        <ThemeToggle/>

        {/* ── PHASE 1: INPUT ───────────────────────────────── */}
        {phase === 'input' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', padding:'60px 24px' }}>

            {/* Back */}
            <button onClick={() => window.history.back()}
              style={{ position:'fixed', top:16, left:16, display:'flex', alignItems:'center', gap:6,
                background:'var(--card)', border:'1px solid var(--border)', borderRadius:10,
                color:'var(--text-muted)', fontSize:12, fontWeight:600, padding:'7px 12px', cursor:'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              Zurück
            </button>

            <div style={{ width:'100%', maxWidth:620 }}>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', color:'var(--text-muted)',
                textTransform:'uppercase', marginBottom:16 }}>TAGRO AI · NEUES PROJEKT</p>

              <h1 style={{ fontSize:36, fontWeight:700, color:'var(--text)', letterSpacing:'-.8px',
                lineHeight:1.15, marginBottom:12 }}>
                Was soll gebaut werden?
              </h1>
              <p style={{ fontSize:16, color:'var(--text-secondary)', marginBottom:40, lineHeight:1.6, fontWeight:500 }}>
                Beschreibe deine Idee — die KI versteht, zerlegt und steuert die Umsetzung.
              </p>

              {/* Main input */}
              <div style={{ position:'relative', marginBottom:16 }}>
                {/* Animated placeholder */}
                {!input && (
                  <div className={plDir === 'in' ? 'pl-in' : 'pl-out'}
                    style={{ position:'absolute', top:20, left:20, right:20, pointerEvents:'none',
                      fontSize:17, color:'var(--text-muted)', lineHeight:1.6, fontWeight:500, zIndex:1 }}>
                    {plText}
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startChat() } }}
                  rows={5}
                  style={{
                    width:'100%', padding:'20px', fontSize:17, fontWeight:500,
                    background:'var(--inp)', border:'1.5px solid var(--inp-border)',
                    borderRadius:18, color:'var(--text)', outline:'none',
                    lineHeight:1.6, position:'relative', zIndex:2, fontFamily:'inherit',
                    transition:'border-color .15s, box-shadow .15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--inp-focus-border)'; e.target.style.boxShadow = '0 0 0 3px var(--glow)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--inp-border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <button onClick={startChat} disabled={!input.trim()} style={{
                  flex:1, padding:'16px 24px', background:input.trim()?'var(--btn-prim)':'var(--card)',
                  color:input.trim()?'var(--btn-prim-text)':'var(--text-muted)',
                  fontSize:16, fontWeight:700, borderRadius:14, border:'none', cursor:input.trim()?'pointer':'default',
                  transition:'all .15s', fontFamily:'inherit', letterSpacing:'-.1px',
                }}>
                  Projekt beschreiben →
                </button>
                <button onClick={proceed} style={{
                  padding:'16px 20px', background:'var(--card)', border:'1px solid var(--border)',
                  borderRadius:14, color:'var(--text-muted)', fontSize:14, fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit', transition:'all .15s', whiteSpace:'nowrap',
                }}>
                  Überspringen
                </button>
              </div>

              <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:16, textAlign:'center', lineHeight:1.6 }}>
                Enter ↵ zum Starten · Kein Informationsverlust zwischen Idee und Umsetzung
              </p>
            </div>
          </div>
        )}

        {/* ── PHASE 2: AI CHAT ──────────────────────────────── */}
        {(phase === 'chat' || phase === 'done') && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', maxWidth:620, margin:'0 auto',
            width:'100%', padding:'calc(20px + env(safe-area-inset-top)) 0 0' }}>

            {/* Header */}
            <div style={{ padding:'0 24px 20px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:10, background:'var(--card)',
                  border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>Tagro AI</p>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', animation:'pulse 2s infinite' }}/>
                    <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>
                      {phase === 'done' ? 'Analyse abgeschlossen' : 'Analysiert dein Projekt...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={chatRef} style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14, minHeight:0 }}>
              {msgs.map((m, i) => (
                <div key={i} className="msg-in" style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
                  <div style={{
                    maxWidth:'80%', padding:'12px 16px',
                    borderRadius: m.role==='user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: m.role==='ai' ? 'var(--card)' : 'var(--btn-prim)',
                    color: m.role==='user' ? 'var(--btn-prim-text)' : 'var(--text)',
                    fontSize:15, lineHeight:1.55, fontWeight:500,
                    border: m.role==='ai' ? '1px solid var(--border)' : 'none',
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div style={{ display:'flex', justifyContent:'flex-start' }}>
                  <div style={{ padding:'12px 18px', borderRadius:'18px 18px 18px 4px',
                    background:'var(--card)', border:'1px solid var(--border)', display:'flex', gap:5, alignItems:'center' }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-muted)', animation:`blink 1.2s ${i*0.2}s infinite` }}/>
                    ))}
                  </div>
                </div>
              )}

              {/* Done state */}
              {phase === 'done' && !aiLoading && (
                <div className="msg-in" style={{ marginTop:8 }}>
                  {summary && (
                    <div style={{ padding:'14px 16px', background:'var(--card)',
                      border:'1px solid var(--border)', borderRadius:14, marginBottom:12 }}>
                      <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', marginBottom:6 }}>TAGRO PROJEKTANALYSE</p>
                      <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.55, margin:0 }}>{summary}</p>
                    </div>
                  )}
                  <button onClick={proceed} style={{
                    width:'100%', padding:'16px', background:'var(--btn-prim)', color:'var(--btn-prim-text)',
                    fontSize:16, fontWeight:700, borderRadius:14, border:'none', cursor:'pointer',
                    fontFamily:'inherit', letterSpacing:'-.1px', boxShadow:'0 2px 16px var(--glow)',
                  }}>
                    {isLoggedIn && !fromOnboarding ? 'Zum Dashboard →' : 'Account einrichten →'}
                  </button>
                </div>
              )}
            </div>

            {/* Chat input */}
            {phase === 'chat' && (
              <div style={{ padding:'16px 24px', paddingBottom:'calc(env(safe-area-inset-bottom) + 20px)',
                borderTop:'1px solid var(--border)' }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-end',
                  background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:16, padding:'12px 14px' }}>
                  <textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendChat() } }}
                    placeholder="Antwort eingeben..."
                    rows={1}
                    style={{ flex:1, background:'transparent', border:'none', fontSize:15, color:'var(--text)',
                      fontFamily:'inherit', fontWeight:500, resize:'none', lineHeight:1.5, maxHeight:100,
                      overflowY:'auto', outline:'none' }}
                  />
                  <button onClick={sendChat} disabled={!chatInput.trim()||aiLoading}
                    style={{ width:34, height:34, borderRadius:9,
                      background:chatInput.trim()?'var(--btn-prim)':'transparent',
                      border:`1px solid ${chatInput.trim()?'transparent':'var(--border)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:chatInput.trim()?'pointer':'default', transition:'all .15s', flexShrink:0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke={chatInput.trim()?'var(--btn-prim-text)':'var(--text-muted)'} strokeWidth="2.5" strokeLinecap="round">
                      <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
                    </svg>
                  </button>
                </div>
                <button onClick={proceed} style={{ width:'100%', marginTop:10, padding:'10px',
                  textAlign:'center', color:'var(--text-muted)', fontSize:13, fontWeight:600,
                  cursor:'pointer', background:'none', border:'none', fontFamily:'inherit' }}>
                  Überspringen
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
