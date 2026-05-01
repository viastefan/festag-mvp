'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ChatMarkdown from '@/components/ChatMarkdown'

type Project = {
  id: string; title: string; status: string
  lastMsg?: { message: string; created_at: string; is_ai: boolean } | null
}
type Msg = { id: string; message: string; created_at: string; sender_id: string | null; is_ai?: boolean }
type SenderProfile = { id: string; first_name?: string; full_name?: string; avatar_url?: string|null; role?: string }

/** Verified blue checkmark — used for Tagro AI and Festag-verified devs. */
function VerifiedTick({ animate = false, size = 13 }: { animate?: boolean; size?: number }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:size+2, height:size+2, position:'relative', flexShrink:0 }}>
      <span style={{ position:'absolute', inset:-2, borderRadius:'50%', background:'rgba(0,122,255,.18)', animation: animate ? 'tick-pulse 1.4s ease-out 1' : 'none' }}/>
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ position:'relative', filter:'drop-shadow(0 1px 3px rgba(0,122,255,.4))' }}>
        <circle cx="12" cy="12" r="10" fill="#007AFF"/>
        <path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          style={{ strokeDasharray: 16, strokeDashoffset: animate ? 16 : 0, animation: animate ? 'tick-draw .55s .15s cubic-bezier(.4,.0,.2,1) forwards' : 'none' }}/>
      </svg>
    </span>
  )
}

const PHASE_LABEL: Record<string, string> = {
  intake: 'Intake', planning: 'Planning', active: 'In Arbeit', testing: 'Testing', done: 'Abgeschlossen',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Jetzt'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return new Date(iso).toLocaleDateString('de', { day: '2-digit', month: 'short' })
}

function timeOfDay(iso: string) {
  return new Date(iso).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
}

export default function MessagesPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [input, setInput] = useState('')
  const [aiThinking, setAiThinking] = useState(false)
  const [showListMobile, setShowListMobile] = useState(true)
  const [profiles, setProfiles] = useState<Record<string, SenderProfile>>({})
  const [newAnimIds, setNewAnimIds] = useState<Set<string>>(new Set())
  const feedRef = useRef<HTMLDivElement>(null)
  const sb = createClient()

  // Initial load: session + projects
  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserId(data.session.user.id)
      setUserEmail(data.session.user.email ?? '')
      const { data: projs } = await sb.from('projects').select('id,title,status').order('created_at', { ascending: false })
      if (!projs?.length) { setLoading(false); return }
      const enriched = await Promise.all(projs.map(async p => {
        const { data: msg } = await sb.from('messages').select('message,created_at,is_ai').eq('project_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
        return { ...p, lastMsg: msg ?? null }
      }))
      enriched.sort((a, b) => {
        const ta = a.lastMsg?.created_at ?? ''
        const tb = b.lastMsg?.created_at ?? ''
        return tb.localeCompare(ta)
      })
      setProjects(enriched)
      setActiveId(enriched[0]?.id ?? null)
      setLoading(false)
    })
  }, [])

  // Load messages + realtime when active project changes
  useEffect(() => {
    if (!activeId) return
    setMsgsLoading(true)
    sb.from('messages').select('*').eq('project_id', activeId).order('created_at').then(async ({ data }) => {
      const list = (data as any[]) ?? []
      setMessages(list)
      // Resolve sender profiles
      const ids = Array.from(new Set(list.filter(m => m.sender_id && !m.is_ai).map(m => m.sender_id)))
      if (ids.length > 0) {
        const { data: ps } = await sb.from('profiles').select('id,first_name,full_name,avatar_url,role').in('id', ids)
        const map: Record<string, SenderProfile> = {}
        for (const p of (ps as any[]) ?? []) map[(p as any).id] = p
        setProfiles(prev => ({ ...prev, ...map }))
      }
      setMsgsLoading(false)
    })

    const ch = sb.channel(`msgs-${activeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${activeId}` }, (payload) => {
        const m = payload.new as Msg
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev.filter(x => !x.id.startsWith('tmp-')), m])
        setAiThinking(false)
        // Trigger blue tick animation for verified senders
        setNewAnimIds(prev => { const s = new Set(prev); s.add(m.id); return s })
        setTimeout(() => setNewAnimIds(prev => { const s = new Set(prev); s.delete(m.id); return s }), 2000)
        // Update preview in list
        setProjects(prev => prev.map(p => p.id === activeId ? { ...p, lastMsg: { message: m.message, created_at: m.created_at, is_ai: !!m.is_ai } } : p))
      })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [activeId])

  // Auto-scroll
  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, aiThinking])

  const filtered = projects.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
  const active = projects.find(p => p.id === activeId) ?? null

  async function send() {
    const text = input.trim()
    if (!text || !activeId || !userId) return
    setInput('')
    const tmpId = 'tmp-' + Date.now()
    const optimistic: Msg = { id: tmpId, message: text, created_at: new Date().toISOString(), sender_id: userId, is_ai: false }
    setMessages(prev => [...prev, optimistic])
    setProjects(prev => prev.map(p => p.id === activeId ? { ...p, lastMsg: { message: text, created_at: optimistic.created_at, is_ai: false } } : p))

    await sb.from('messages').insert({ project_id: activeId, sender_id: userId, message: text, is_ai: false })

    setAiThinking(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 250,
          system: `Du bist Tagro, der AI-Projektmanager von Festag. Antworte klar, max 3 Sätze. Kein Smalltalk. Markdown ist erlaubt für Klarheit. Projekt: "${active?.title ?? 'Unbekannt'}" — Phase: ${PHASE_LABEL[active?.status ?? '']}`,
          messages: [{ role: 'user', content: text }],
        }),
      })
      const data = await res.json()
      const aiMsg = data.content?.[0]?.text
      if (aiMsg) await sb.from('messages').insert({ project_id: activeId, sender_id: userId, message: aiMsg, is_ai: true })
      else setAiThinking(false)
    } catch { setAiThinking(false) }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="page-content msgs-root" style={{ maxWidth: 1200, padding: 0 }}>
      <style>{`
        @keyframes tick-pulse { 0%{transform:scale(.4);opacity:.9;} 100%{transform:scale(2.6);opacity:0;} }
        @keyframes tick-draw  { to { stroke-dashoffset: 0; } }
        .msgs-grid { display: grid; grid-template-columns: 320px 1fr; gap: 0; height: calc(100dvh - 96px); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; background: var(--surface); }
        .msgs-list { border-right: 1px solid var(--border); display: flex; flex-direction: column; min-height: 0; background: var(--surface); }
        .msgs-chat { display: flex; flex-direction: column; min-height: 0; background: var(--bg); }
        .msgs-back { display: none; }
        @media (max-width: 820px) {
          .msgs-grid { grid-template-columns: 1fr; height: calc(100dvh - 80px); }
          .msgs-list { display: ${showListMobile ? 'flex' : 'none'} !important; border-right: none; }
          .msgs-chat { display: ${showListMobile ? 'none' : 'flex'} !important; }
          .msgs-back { display: inline-flex !important; }
        }
      `}</style>

      <div className="page-header" style={{ padding: '24px 28px 20px' }}>
        <h1 style={{ marginBottom: 4 }}>Nachrichten</h1>
        <p style={{ margin: 0 }}>Projekt-Konversationen mit Tagro &amp; dem Team</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        </div>
      ) : projects.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round">
              <path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z"/>
            </svg>
          </div>
          <h2 style={{ marginBottom: 8 }}>Noch keine Konversationen</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.6 }}>
            Starte ein Projekt um mit Tagro und dem Team zu kommunizieren.
          </p>
          <Link href="/onboarding">
            <button className="tap-scale" style={{ padding: '10px 22px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Projekt starten →
            </button>
          </Link>
        </div>
      ) : (
        <div className="msgs-grid">

          {/* ── LEFT: Conversation list ── */}
          <div className="msgs-list">
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Suchen…"
                  style={{ width: '100%', height: 34, padding: '0 12px 0 32px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <p style={{ padding: 20, fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>Kein Projekt für „{search}"</p>
              ) : filtered.map(p => {
                const isActive = p.id === activeId
                const initial = p.title.charAt(0).toUpperCase()
                const preview = p.lastMsg
                  ? (p.lastMsg.is_ai ? 'Tagro: ' : 'Du: ') + p.lastMsg.message
                  : 'Noch keine Nachrichten'
                return (
                  <button key={p.id}
                    onClick={() => { setActiveId(p.id); setShowListMobile(false) }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 14px',
                      borderBottom: '1px solid var(--border)',
                      background: isActive ? 'var(--surface-2)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--text)' : '3px solid transparent',
                      border: 'none', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', fontFamily: 'inherit',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: isActive ? 'var(--text)' : 'var(--surface-2)', color: isActive ? '#FFFFFF' : 'var(--text)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                        {p.lastMsg?.created_at && <span style={{ fontSize: 10.5, color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(p.lastMsg.created_at)}</span>}
                      </div>
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT: Active chat ── */}
          <div className="msgs-chat">
            {!active ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Wähle eine Konversation…
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <button onClick={() => setShowListMobile(true)} className="msgs-back tap-scale"
                      style={{ width: 30, height: 30, border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 8, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {active.title.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '1px 0 0' }}>Phase: {PHASE_LABEL[active.status] ?? active.status}</p>
                    </div>
                  </div>
                  <Link href={`/project/${active.id}`} style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'none', flexShrink: 0, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)' }}>
                    Projekt öffnen →
                  </Link>
                </div>

                {/* Feed */}
                <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {msgsLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
                      <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: 'var(--text)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z"/></svg>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Starte das Gespräch</p>
                      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, maxWidth: 280, lineHeight: 1.55 }}>Stelle Tagro eine Frage zum Projekt — oder hinterlasse eine Nachricht für das Team.</p>
                    </div>
                  ) : messages.map(m => {
                    const isAI = m.is_ai
                    const isMe = !isAI && m.sender_id === userId
                    const senderProfile = m.sender_id ? profiles[m.sender_id] : undefined
                    const senderRole = senderProfile?.role
                    const isDev = !isAI && (senderRole === 'dev' || senderRole === 'admin') && !isMe
                    const verified = isAI || isDev
                    const animateTick = newAnimIds.has(m.id) && verified
                    const senderName = isAI ? 'Tagro AI'
                      : isMe ? 'Du'
                      : senderProfile?.first_name ?? senderProfile?.full_name?.split(' ')[0] ?? 'Team'
                    const senderInitial = isAI ? 'T'
                      : senderProfile?.first_name?.charAt(0)?.toUpperCase()
                        ?? senderProfile?.full_name?.charAt(0)?.toUpperCase()
                        ?? (isMe ? (userEmail.charAt(0) || 'U').toUpperCase() : 'T')
                    const avatarBg = isAI ? 'linear-gradient(135deg,#0f172a,#334155)'
                      : isDev ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                      : 'var(--surface-2)'
                    const avatarBorder = (isAI || isDev) ? 'none' : '1px solid var(--border)'
                    const avatarColor = (isAI || isDev) ? '#fff' : 'var(--text)'
                    return (
                      <div key={m.id} style={{ display: 'flex', gap: 10, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        {!isMe && (
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: avatarBg, color: avatarColor, border: avatarBorder, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, flexShrink: 0, position:'relative', overflow:'hidden' }}>
                            {!isAI && senderProfile?.avatar_url
                              ? <img src={senderProfile.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                              : senderInitial}
                          </div>
                        )}
                        <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                          {!isMe && (
                            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4, padding:'0 4px' }}>
                              <span style={{ fontSize:11.5, fontWeight:700, color:'var(--text)' }}>{senderName}</span>
                              {verified && <VerifiedTick animate={animateTick} size={11}/>}
                              {isDev && <span style={{ fontSize:8.5, fontWeight:800, color:'#16a34a', background:'rgba(34,197,94,.12)', padding:'1px 5px', borderRadius:4, letterSpacing:'.05em' }}>DEV</span>}
                              {isAI && <span style={{ fontSize:8.5, fontWeight:800, color:'var(--text-muted)', background:'var(--surface-2)', padding:'1px 5px', borderRadius:4, letterSpacing:'.05em' }}>AI</span>}
                            </div>
                          )}
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                            background: isMe ? 'var(--btn-prim)' : 'var(--surface)',
                            color: isMe ? 'var(--btn-prim-text)' : 'var(--text)',
                            border: isMe ? 'none' : `1px solid ${isDev?'var(--green-border)':'var(--border)'}`,
                            fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word',
                          }}>
                            {isAI
                              ? <ChatMarkdown text={m.message} />
                              : <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: isMe ? 'var(--btn-prim-text)' : 'var(--text)', fontWeight: isMe ? 600 : 500 }}>{m.message}</p>}
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, padding: '0 4px', display:'flex', alignItems:'center', gap:5 }}>
                            {timeOfDay(m.created_at)}
                          </span>
                        </div>
                        {isMe && (
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent)', color:'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                            {(userEmail.charAt(0) || 'U').toUpperCase()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {aiThinking && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg)', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>
                      </div>
                      <div style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 5 }}>
                        {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.2s ${i*0.2}s infinite` }} />)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Codex-style input */}
                <div style={{ padding: '10px 14px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
                  <div style={{ position: 'relative', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '10px 44px 10px 14px', transition: 'border-color .15s, box-shadow .15s' }}
                    onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px var(--glow)' }}
                    onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                    <textarea
                      value={input}
                      onChange={e => {
                        setInput(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                      }}
                      onKeyDown={handleKey}
                      placeholder="Nachricht an Tagro / Team…"
                      rows={1}
                      style={{ width: '100%', resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, lineHeight: 1.6, color: 'var(--text)', fontFamily: 'inherit', fontWeight: 500, padding: 0, overflowY: 'hidden', minHeight: 24, caretColor: 'var(--text)' }}
                    />
                    <button
                      onClick={send}
                      disabled={!input.trim() || aiThinking}
                      className="tap-scale"
                      style={{ position: 'absolute', right: 8, bottom: 8, width: 32, height: 32, borderRadius: 10, border: 'none', background: input.trim() && !aiThinking ? 'var(--btn-prim)' : 'var(--surface-2)', color: input.trim() && !aiThinking ? 'var(--btn-prim-text)' : 'var(--text-muted)', cursor: input.trim() && !aiThinking ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}>
                      {aiThinking
                        ? <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', opacity: .6 }} />
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>}
                    </button>
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', margin: '5px 0 0', letterSpacing: '.03em' }}>⏎ Senden · ⇧⏎ Neue Zeile</p>
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
