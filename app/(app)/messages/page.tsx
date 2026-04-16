'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Project = { id: string; title: string }
type Message = { id: string; message: string; created_at: string; sender_id: string }

export default function MessagesPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [userId, setUserId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('projects').select('id, title').order('created_at').then(({ data }) => {
      if (data) { setProjects(data); if (data[0]) setSelected(data[0].id) }
    })
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ''))
  }, [])

  useEffect(() => {
    if (!selected) return
    supabase.from('messages').select('*').eq('project_id', selected).order('created_at').then(({ data }) => {
      if (data) setMessages(data)
    })
  }, [selected])

  async function sendMessage() {
    if (!newMsg.trim() || !selected) return
    await supabase.from('messages').insert({ project_id: selected, sender_id: userId, message: newMsg })
    setNewMsg('')
    const { data } = await supabase.from('messages').select('*').eq('project_id', selected).order('created_at')
    if (data) setMessages(data)
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px' }}>Messages</h1>
      <div style={{ display: 'flex', gap: 20, height: 600 }}>
        {/* Project list */}
        <div style={s.sidebar}>
          <p style={s.sidebarTitle}>Projekte</p>
          {projects.map(p => (
            <div key={p.id} onClick={() => setSelected(p.id)} style={{
              ...s.projectItem, ...(selected === p.id ? s.projectActive : {})
            }}>
              {p.title}
            </div>
          ))}
          {projects.length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', padding: 8 }}>Keine Projekte</p>}
        </div>

        {/* Chat */}
        <div style={s.chatArea}>
          {selected ? (
            <>
              <div style={s.chatHeader}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>
                  {projects.find(p => p.id === selected)?.title}
                </p>
              </div>
              <div style={s.msgFeed}>
                {messages.length === 0 && <p style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 14 }}>Noch keine Nachrichten.</p>}
                {messages.map(m => (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender_id === userId ? 'flex-end' : 'flex-start' }}>
                    <div style={{ ...s.bubble, ...(m.sender_id === userId ? s.bubbleOwn : s.bubbleOther) }}>
                      <p style={{ margin: 0, fontSize: 14 }}>{m.message}</p>
                    </div>
                    <span style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      {new Date(m.created_at).toLocaleString('de', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
              <div style={s.inputRow}>
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Nachricht schreiben..." style={s.input} />
                <button onClick={sendMessage} style={s.sendBtn}>Senden →</button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
              Projekt auswählen
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  sidebar: { width: 220, background: '#fff', border: '1px solid #E6E8EE', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 2 },
  sidebarTitle: { fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 8px 8px' },
  projectItem: { padding: '9px 12px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#374151', cursor: 'pointer' },
  projectActive: { background: '#EEF3FF', color: '#2F6BFF' },
  chatArea: { flex: 1, background: '#fff', border: '1px solid #E6E8EE', borderRadius: 12, display: 'flex', flexDirection: 'column' },
  chatHeader: { padding: '14px 20px', borderBottom: '1px solid #E6E8EE' },
  msgFeed: { flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' },
  bubble: { padding: '10px 14px', borderRadius: 12, maxWidth: '70%' },
  bubbleOwn: { background: '#EEF3FF', border: '1px solid #C7D7FF' },
  bubbleOther: { background: '#F3F4F6', border: '1px solid #E6E8EE' },
  inputRow: { padding: '14px 20px', borderTop: '1px solid #E6E8EE', display: 'flex', gap: 8 },
  input: { flex: 1, padding: '9px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none' },
  sendBtn: { padding: '9px 18px', background: '#2F6BFF', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
}
