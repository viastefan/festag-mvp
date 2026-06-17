'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PaperPlaneRight, ChatCircle, Spinner } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

type Message = {
  id: string
  project_id: string
  sender_id: string
  content: string
  message_type: string
  file_url: string | null
  file_name: string | null
  read_at: string | null
  created_at: string
}

type Props = {
  projectId: string
}

export default function RelationsChat({ projectId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load user + messages
  useEffect(() => {
    const sb = createClient()
    let channel: ReturnType<typeof sb.channel> | null = null

    async function init() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Load existing messages
      const { data } = await sb
        .from('rel_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      setMessages((data as Message[]) ?? [])
      setLoading(false)

      // Subscribe to realtime
      channel = sb
        .channel(`rel_messages:${projectId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'rel_messages',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            const msg = payload.new as Message
            setMessages(prev => {
              // Avoid duplicates (optimistic + realtime)
              if (prev.some(m => m.id === msg.id)) return prev
              return [...prev, msg]
            })
          }
        )
        .subscribe()
    }

    init()

    return () => {
      if (channel) sb.removeChannel(channel)
    }
  }, [projectId])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const content = newMessage.trim()
    if (!content || !userId || sending) return

    setSending(true)
    setNewMessage('')

    const sb = createClient()
    const optimisticId = crypto.randomUUID()

    // Optimistic add
    const optimistic: Message = {
      id: optimisticId,
      project_id: projectId,
      sender_id: userId,
      content,
      message_type: 'text',
      file_url: null,
      file_name: null,
      read_at: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const { data, error } = await sb
      .from('rel_messages')
      .insert({
        project_id: projectId,
        sender_id: userId,
        content,
        message_type: 'text',
      } as any)
      .select()
      .single()

    if (error) {
      // Remove optimistic on error
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
    } else if (data) {
      // Replace optimistic with real
      setMessages(prev =>
        prev.map(m => m.id === optimisticId ? (data as Message) : m)
      )
    }

    setSending(false)
    inputRef.current?.focus()
  }, [newMessage, userId, sending, projectId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Group messages by date
  function getDateLabel(dateStr: string): string {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Heute'
    if (date.toDateString() === yesterday.toDateString()) return 'Gestern'
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 300, background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '24px',
      }}>
        <Spinner size={24} color="var(--text-muted)" style={{ animation: 'spin .8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '24px', overflow: 'hidden',
      height: 'min(600px, 65vh)',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.02)',
    }}>
      {/* Messages area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '24px 22px 12px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
          background: 'var(--surface)',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <ChatCircle size={36} weight="duotone" color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
              Noch keine Nachrichten
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Starte die Konversation mit deinem Team.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isOwn = msg.sender_id === userId
              const showDateLabel = i === 0 ||
                getDateLabel(msg.created_at) !== getDateLabel(messages[i - 1].created_at)
              // Show time gap if > 5 min since last message from same sender
              const prevMsg = messages[i - 1]
              const showAvatar = !prevMsg ||
                prevMsg.sender_id !== msg.sender_id ||
                (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 300000

              return (
                <div key={msg.id}>
                  {/* Date divider */}
                  {showDateLabel && (
                    <div style={{
                      textAlign: 'center', margin: '28px 0 18px',
                      position: 'relative',
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                        background: 'var(--surface)', padding: '0 14px',
                        position: 'relative', zIndex: 1,
                      }}>
                        {getDateLabel(msg.created_at)}
                      </span>
                      <div style={{
                        position: 'absolute', top: '50%', left: 0, right: 0,
                        height: 1, background: 'var(--border)',
                      }} />
                    </div>
                  )}

                  {/* Message bubble */}
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        marginBottom: showAvatar ? 14 : 5,
                      }}
                    >
                      <div style={{
                        width: 'min(100%, 720px)',
                        minWidth: 60,
                      }}>
                        <div style={{
                          padding: '14px 16px',
                          borderRadius: 18,
                          background: isOwn ? 'color-mix(in srgb, var(--surface-2) 84%, transparent)' : 'var(--card)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          fontSize: 14,
                          lineHeight: 1.65,
                          wordBreak: 'break-word',
                        }}>
                          {msg.content}
                        </div>
                        <div style={{
                          fontSize: 10, fontWeight: 500,
                          color: 'var(--text-muted)',
                          marginTop: 4,
                          textAlign: isOwn ? 'right' : 'left',
                          padding: '0 4px',
                        }}>
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              )
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '16px 18px 18px',
        display: 'flex', alignItems: 'flex-end', gap: 10,
        background: 'var(--card)',
      }}>
        <textarea
          ref={inputRef}
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nachricht schreiben..."
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            border: '1px solid var(--inp-border)',
            borderRadius: '18px',
            padding: '12px 15px',
            fontSize: 14,
            fontFamily: 'inherit',
            fontWeight: 500,
            background: 'var(--inp)',
            color: 'var(--text)',
            outline: 'none',
            lineHeight: 1.5,
            maxHeight: 120,
            transition: 'border-color .12s, background .12s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--inp-focus-border)'; e.currentTarget.style.background = 'var(--inp-focus)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--inp-border)'; e.currentTarget.style.background = 'var(--inp)' }}
          onInput={e => {
            const t = e.currentTarget
            t.style.height = 'auto'
            t.style.height = Math.min(t.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          style={{
            width: 42, height: 42,
            borderRadius: '16px',
            background: newMessage.trim() ? 'var(--btn-prim)' : 'var(--hover)',
            color: newMessage.trim() ? 'var(--btn-prim-text)' : 'var(--text-muted)',
            border: 'none',
            cursor: newMessage.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'background .15s, color .15s',
          }}
        >
          <PaperPlaneRight size={18} weight="bold" />
        </button>
      </div>
    </div>
  )
}
