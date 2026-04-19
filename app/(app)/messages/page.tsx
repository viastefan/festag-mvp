'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser, getDisplayName } from '@/lib/hooks/useUser'
import Avatar from '@/components/Avatar'

type Thread = {
  project_id: string
  project_title: string
  project_status: string
  last_msg: string
  last_time: string
  is_ai: boolean
  unread: number
}

type Msg = {
  id: string
  message: string
  created_at: string
  sender_id: string
  is_ai: boolean
  sender_name?: string
  sender_avatar?: string | null
}

export default function MessagesPage() {
  const { user } = useUser()
  const [threads, setThreads] = useState<Thread[]>([])
  const [aiUpdates, setAiUpdates] = useState<any[]>([])
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState<'all' | 'updates' | 'chats'>('all')
  const feedRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      loadAll()
    })
  }, [])

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function loadAll() {
    const [{ data: projects }, { data: updates }] = await Promise.all([
      supabase.from('projects').select('id, title, status'),
      supabase.from('ai_updates').select('*, projects(title)').order('created_at', { ascending: false }).limit(20),
    ])
    setAiUpdates(updates ?? [])

    if (projects) {
      const enriched = await Promise.all(projects.map(async (p: any) => {
        const { data: last } = await supabase
          .from('messages')
          .select('*')
          .eq('project_id', p.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return {
          project_id: p.id,
          project_title: p.title,
          project_status: p.status,
          last_msg: last?.message ?? 'Noch keine Nachrichten',
          last_time: last?.created_at ?? '',
          is_ai: last?.is_ai ?? false,
          unread: 0,
        }
      }))
      setThreads(enriched.filter(t => t.last_time).sort((a, b) => b.last_time.localeCompare(a.last_time)))
    }
    setLoading(false)
  }

  async function openThread(projectId: string) {
    setActiveThread(projectId)
    const { data } = await supabase
      .from('messages')
      .select('*, profiles:sender_id(full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at')
    setMessages((data ?? []).map((m: any) => ({
      ...m,
      sender_name: m.profiles?.full_name,
      sender_avatar: m.profiles?.avatar_url,
    })))
  }

  async function sendMessage() {
    if (!newMsg.trim() || !activeThread || !user || sending) return
    const text = newMsg
    setNewMsg('')
    setSending(true)
    await supabase.from('messages').insert({ project_id: activeThread, sender_id: user.id, message: text, is_ai: false })
    await openThread(activeThread)

    // AI reply
    try {
      const project = threads.find(t => t.project_id === activeThread)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 250,
          system: `Du bist Tagro, Festag AI-System. Antworte klar, max 2 Sätze. Kein Emoji. Projekt: "${project?.project_title}"`,
          messages: [{ role: 'user', content: text }],
        }),
      })
      const data = await res.json()
      const aiReply = data.content?.[0]?.text
      if (aiReply) {
        await supabase.from('messages').insert({ project_id: activeThread, sender_id: user.id, message: aiReply, is_ai: true })
        await openThread(activeThread)
      }
    } catch {}
    setSending(false)
    loadAll()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /></div>

  // If thread open → full chat view
  if (activeThread) {
    const thread = threads.find(t => t.project_id === activeThread)
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
        {/* Thread header */}
        <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { setActiveThread(null); setMessages([]) }} className="tap-scale" style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontFamily: 'Aeonik, sans-serif' }}>{thread?.project_title}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Aeonik, sans-serif' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
              Tagro AI & Developer aktiv
            </p>
          </div>
        </div>

        {/* Messages feed */}
        <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 10 }}>
          {messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0', fontFamily: 'Aeonik, sans-serif' }}>
              Noch keine Nachrichten. Starte die Konversation.
            </p>
          ) : messages.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', gap: 10, animation: i === messages.length - 1 ? 'slideUp 0.2s ease' : 'none' }}>
              {m.is_ai ? (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Aeonik, sans-serif' }}>T</span>
                </div>
              ) : m.sender_id === user?.id ? (
                <Avatar user={user} size={36} />
              ) : (
                <Avatar user={{ ...user, full_name: m.sender_name ?? 'Dev', avatar_url: m.sender_avatar } as any} size={36} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'Aeonik, sans-serif' }}>
                    {m.is_ai ? 'Tagro' : m.sender_id === user?.id ? 'Du' : (m.sender_name ?? 'Developer')}
                  </span>
                  {m.is_ai && (
                    <span style={{ padding: '1px 6px', background: 'var(--text)', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 3, letterSpacing: '0.04em', fontFamily: 'Aeonik, sans-serif' }}>AI</span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
                  <p style={{ fontSize: 14, color: 'var(--text)', margin: 0, lineHeight: 1.55, fontFamily: 'Aeonik, sans-serif', whiteSpace: 'pre-wrap' }}>{m.message}</p>
                </div>
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Aeonik, sans-serif' }}>T</span>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', display: 'flex', gap: 5 }}>
                {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1s ${i*0.2}s infinite` }} />)}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8, paddingTop: 14 }}>
          <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Nachricht an Tagro oder Developer…"
            style={{ flex: 1, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 22, fontSize: 15, outline: 'none', background: 'var(--surface)', minHeight: 44, fontFamily: 'inherit' }} />
          <button onClick={sendMessage} disabled={!newMsg.trim() || sending} className="tap-scale" style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none',
            background: newMsg.trim() ? 'var(--text)' : 'var(--surface-2)',
            color: newMsg.trim() ? '#fff' : 'var(--text-muted)',
            cursor: newMsg.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {sending ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>}
          </button>
        </div>
      </div>
    )
  }

  // List view
  const filtered = tab === 'all' ? [...aiUpdates.map(u => ({ type: 'update', ...u })), ...threads.map(t => ({ type: 'thread', ...t }))]
    : tab === 'updates' ? aiUpdates.map(u => ({ type: 'update', ...u }))
    : threads.map(t => ({ type: 'thread', ...t }))

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="animate-fade-up" style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 4, fontFamily: 'Aeonik, sans-serif' }}>Neuigkeiten & Updates</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'Aeonik, sans-serif' }}>
          Zentrale Kommunikation mit Tagro AI und Developern
        </p>
      </div>

      <div className="animate-fade-up-1" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {([
          { k: 'all', l: `Alle (${aiUpdates.length + threads.length})` },
          { k: 'updates', l: `AI Updates (${aiUpdates.length})` },
          { k: 'chats', l: `Konversationen (${threads.length})` },
        ] as const).map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className="tap-scale" style={{
            padding: '7px 14px', borderRadius: 20,
            border: '1px solid var(--border)',
            background: tab === t.k ? 'var(--text)' : 'var(--surface)',
            color: tab === t.k ? '#fff' : 'var(--text-secondary)',
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}>{t.l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="animate-fade-up-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h2 style={{ marginBottom: 8 }}>Noch keine Updates</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'Aeonik, sans-serif' }}>
            Sobald dein Projekt startet, findest du hier AI Tagesberichte und Nachrichten.
          </p>
        </div>
      ) : (
        <div className="animate-fade-up-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {filtered.map((item: any, i: number) => {
            if (item.type === 'update') {
              return (
                <div key={`u-${item.id}`} style={{
                  padding: '14px 18px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Aeonik, sans-serif' }}>T</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', fontFamily: 'Aeonik, sans-serif' }}>Tagro AI</span>
                      <span style={{ padding: '1px 6px', background: 'var(--text)', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 3, letterSpacing: '0.04em', fontFamily: 'Aeonik, sans-serif' }}>AI UPDATE</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {item.projects?.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(item.created_at).toLocaleDateString('de', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55, fontFamily: 'Aeonik, sans-serif', whiteSpace: 'pre-wrap' }}>{item.content}</p>
                  </div>
                </div>
              )
            }
            // thread
            return (
              <div key={`t-${item.project_id}`} onClick={() => openThread(item.project_id)} className="tap-scale" style={{
                padding: '14px 18px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: 'Aeonik, sans-serif' }}>
                  {item.project_title.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'Aeonik, sans-serif' }}>{item.project_title}</span>
                    {item.last_time && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(item.last_time).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Aeonik, sans-serif' }}>
                    {item.is_ai && <span style={{ fontWeight: 600, color: 'var(--text)' }}>Tagro: </span>}
                    {item.last_msg}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
