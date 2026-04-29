'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

const PHASE_LABEL: Record<string, string> = {
  intake: 'Intake', planning: 'Planning', active: 'In Arbeit',
  testing: 'Testing', done: 'Abgeschlossen',
}

type CopilotMsg = { role: 'user' | 'ai'; text: string }

export default function AppHeader() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [copilot, setCopilot] = useState(false)
  const [cpMsgs, setCpMsgs] = useState<CopilotMsg[]>([])
  const [cpInput, setCpInput] = useState('')
  const [cpLoading, setCpLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const cpRef = useRef<HTMLDivElement>(null)
  const cpBottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('app-search')?.focus()
      }
      if (e.key === 'Escape') { setOpen(false); setQ(''); setCopilot(false) }
    }
    const outside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
      if (cpRef.current && !cpRef.current.contains(e.target as Node)) setCopilot(false)
    }
    document.addEventListener('keydown', handler)
    document.addEventListener('mousedown', outside)
    return () => { document.removeEventListener('keydown', handler); document.removeEventListener('mousedown', outside) }
  }, [])

  useEffect(() => {
    if (copilot && cpMsgs.length === 0) {
      setCpMsgs([{ role: 'ai', text: 'Hallo! Ich bin Tagro — dein AI-Copilot. Wie kann ich helfen? Du kannst mich zu Projekten befragen, Tasks planen lassen oder ein neues Projekt starten.' }])
    }
  }, [copilot])

  useEffect(() => {
    if (cpBottomRef.current) cpBottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [cpMsgs])

  async function search(val: string) {
    setQ(val)
    if (val.trim().length < 1) { setResults([]); setOpen(false); return }
    const sb = createClient()
    const { data } = await sb.from('projects').select('id,title,status').ilike('title', `%${val}%`).limit(6)
    setResults(data ?? [])
    setOpen(true)
  }

  function pick(id: string) {
    setOpen(false); setQ('')
    router.push(`/project/${id}`)
  }

  async function sendCopilot() {
    const msg = cpInput.trim()
    if (!msg || cpLoading) return
    setCpInput('')
    setCpMsgs(m => [...m, { role: 'user', text: msg }])
    setCpLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'Du bist Tagro Copilot von Festag. Antworte kurz, klar, maximal 3 Sätze. Kein Smalltalk. Deutsch.',
          max_tokens: 300,
          messages: [...cpMsgs.slice(-6), { role: 'user', text: msg }]
            .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
        }),
      })
      const d = await res.json()
      const reply = d.content?.[0]?.text ?? 'Verbindungsfehler.'
      setCpMsgs(m => [...m, { role: 'ai', text: reply }])
    } catch {
      setCpMsgs(m => [...m, { role: 'ai', text: 'Verbindungsfehler. Bitte erneut versuchen.' }])
    }
    setCpLoading(false)
  }

  return (
    <>
      <style>{`
        @media(max-width:768px){.ah-search{display:none!important;}.ah-copilot-btn span.cp-label{display:none!important;}}
        .cp-panel{position:fixed;top:64px;right:16px;width:340px;max-height:520px;z-index:500;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-lg);overflow:hidden;animation:fadeUp .2s cubic-bezier(.16,1,.3,1) both;}
        @media(max-width:768px){.cp-panel{left:12px;right:12px;width:auto;top:60px;}}
      `}</style>

      <header style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 50,
        height: 56,
      }}>
        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div ref={wrapRef} className="ah-search" style={{ position: 'relative', width: 260 }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input id="app-search" value={q} onChange={e => search(e.target.value)}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              placeholder="Projekte suchen…" autoComplete="off"
              style={{ width: '100%', height: 36, padding: '0 38px 0 30px', background: focused ? 'var(--surface)' : 'var(--card)', border: `1px solid ${focused ? 'var(--border-strong)' : 'var(--border)'}`, borderRadius: 10, fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', fontWeight: 500, outline: 'none', transition: 'all .15s' }}
            />
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: '2px 5px', borderRadius: 5, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', pointerEvents: 'none' }}>⌘K</span>
          </div>

          {open && results.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 200 }}>
              {results.map((r, i) => (
                <button key={r.id} onClick={() => pick(r.id)}
                  style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', borderBottom: i < results.length-1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--card)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
                    {r.title.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{PHASE_LABEL[r.status] ?? r.status}</p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                </button>
              ))}
            </div>
          )}
          {open && q.length > 0 && results.length === 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', padding: '14px 16px', zIndex: 200 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Kein Projekt gefunden für „{q}"</p>
            </div>
          )}
        </div>

        {/* Tagro Copilot button */}
        <div ref={cpRef} style={{ position: 'relative' }}>
          <button className="ah-copilot-btn tap-scale" onClick={() => setCopilot(o => !o)}
            style={{ height: 36, padding: '0 13px', background: copilot ? 'var(--accent)' : 'var(--card)', color: copilot ? 'var(--accent-text)' : 'var(--text-secondary)', border: `1px solid ${copilot ? 'transparent' : 'var(--border)'}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7, transition: 'all .15s' }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>✦</span>
            <span className="cp-label">Copilot</span>
          </button>
        </div>

        {/* New project */}
        <Link href="/new-project" style={{ textDecoration: 'none' }}>
          <button className="tap-scale" style={{ height: 36, padding: '0 14px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Neu
          </button>
        </Link>

        {/* Theme toggle */}
        <div style={{ height: 36, display: 'flex', alignItems: 'center' }}>
          <ThemeToggle position="relative" />
        </div>
      </header>

      {/* Copilot panel */}
      {copilot && (
        <div className="cp-panel">
          {/* Panel header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--accent-text)', fontWeight: 700 }}>✦</span>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1 }}>Tagro Copilot</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1 }}>AI-Assistent · immer verfügbar</p>
              </div>
            </div>
            <button onClick={() => setCopilot(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cpMsgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.role === 'ai' && (
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 10, color: 'var(--accent-text)', fontWeight: 700 }}>✦</span>
                  </div>
                )}
                <div style={{ maxWidth: '82%', padding: '9px 13px', borderRadius: m.role === 'ai' ? '3px 12px 12px 12px' : '12px 3px 12px 12px', background: m.role === 'ai' ? 'var(--card)' : 'var(--btn-prim)', border: m.role === 'ai' ? '1px solid var(--border)' : 'none', color: m.role === 'ai' ? 'var(--text)' : 'var(--btn-prim-text)' }}>
                  <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</p>
                </div>
              </div>
            ))}
            {cpLoading && (
              <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: 'var(--accent-text)', fontWeight: 700 }}>✦</span>
                </div>
                <div style={{ padding: '12px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '3px 12px 12px 12px', display: 'flex', gap: 4 }}>
                  {[0,1,2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.2s ${j*0.2}s ease-in-out infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={cpBottomRef} />
          </div>

          {/* Quick actions */}
          <div style={{ padding: '0 14px 10px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
            {['Projektstatus', 'Nächste Steps', 'Projekt starten'].map(s => (
              <button key={s} onClick={() => { setCpInput(s); }} style={{ padding: '5px 11px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '0 14px 14px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--card)', border: '1.5px solid var(--border-strong)', borderRadius: 12, padding: '8px 10px 8px 14px' }}>
              <input
                value={cpInput}
                onChange={e => setCpInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCopilot() }}}
                placeholder="Frage Tagro…"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', fontWeight: 500 }}
              />
              <button onClick={sendCopilot} disabled={!cpInput.trim() || cpLoading}
                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', flexShrink: 0, background: cpInput.trim() && !cpLoading ? 'var(--btn-prim)' : 'var(--surface-2)', color: cpInput.trim() && !cpLoading ? 'var(--btn-prim-text)' : 'var(--text-muted)', cursor: cpInput.trim() && !cpLoading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
                {cpLoading
                  ? <span style={{ width: 12, height: 12, border: '2px solid rgba(128,128,128,.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                  : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
