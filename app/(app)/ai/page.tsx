'use client'

/**
 * /ai — Tagro Chat, ChatGPT-style.
 *
 * Layout:
 *   • Left rail (260 px): "Neuer Chat" button, conversation list
 *     grouped by recency (Heute / Letzte 7 Tage / Älter).
 *   • Main pane: message stream with rounded soft bubbles, sticky
 *     composer at the bottom centred to a comfortable reading column.
 *   • Empty state: centred "Wie kann ich dir helfen?" headline + a
 *     couple of calm prompt-starter cards.
 *
 * Everything theme-aware via the global tokens. No Apple emojis,
 * Phosphor + inline SVG. Sidebar of the surrounding app stays — the
 * conversation rail lives inside the page.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp, ChatCircleDots, DotsThreeOutline, PencilSimple, PushPin,
  PushPinSimple, Sparkle, Trash, X,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import ChatMarkdown from '@/components/ChatMarkdown'
import TagroLogo from '@/components/TagroLogo'

type Conversation = {
  id: string
  title: string
  pinned: boolean
  created_at: string
  updated_at: string
}

type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string | null
  created_at: string
  pending?: boolean
}

const PROMPT_STARTERS = [
  'Was ist mein aktueller Projektstand?',
  'Welche Risiken sollte ich diese Woche im Blick haben?',
  'Strukturiere mir eine neue Projektidee.',
  'Was sind die nächsten Entscheidungen, die ich freigeben muss?',
]

function formatGroup(iso: string): 'heute' | 'last7' | 'older' {
  const t = new Date(iso).getTime()
  const diffDays = (Date.now() - t) / (24 * 3600 * 1000)
  if (diffDays < 1) return 'heute'
  if (diffDays < 7) return 'last7'
  return 'older'
}

function formatTimeAgo(iso: string) {
  const t = new Date(iso).getTime()
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d} Tag${d === 1 ? '' : 'en'}`
  return new Date(iso).toLocaleDateString('de-DE')
}

export default function AIPage() {
  const supabase = useMemo(() => createClient(), [])
  const [convs, setConvs] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConv, setLoadingConv] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auth + initial fetch.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/login'
        return
      }
      if (cancelled) return
      setAuthChecked(true)
      await reloadConversations()
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reloadConversations = useCallback(async () => {
    const res = await fetch('/api/ai/conversations', { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    setConvs(data.conversations ?? [])
  }, [])

  // Load messages for the active conversation.
  useEffect(() => {
    if (!activeId) { setMessages([]); return }
    let cancelled = false
    setLoadingConv(true)
    ;(async () => {
      const res = await fetch(`/api/ai/conversations/${activeId}`, { credentials: 'include' })
      if (!res.ok) { setLoadingConv(false); return }
      const data = await res.json()
      if (cancelled) return
      setMessages(data.messages ?? [])
      setLoadingConv(false)
    })()
    return () => { cancelled = true }
  }, [activeId])

  // Autoscroll on new messages.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, sending])

  // Autosize the composer.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(220, el.scrollHeight) + 'px'
  }, [input])

  // Esc closes the row menu.
  useEffect(() => {
    if (!menuFor) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuFor(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuFor])

  const grouped = useMemo(() => {
    const groups: { heute: Conversation[]; last7: Conversation[]; older: Conversation[]; pinned: Conversation[] } = {
      pinned: [], heute: [], last7: [], older: [],
    }
    for (const c of convs) {
      if (c.pinned) { groups.pinned.push(c); continue }
      groups[formatGroup(c.updated_at)].push(c)
    }
    return groups
  }, [convs])

  async function newChat() {
    const res = await fetch('/api/ai/conversations', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) return
    const data = await res.json()
    const c = data.conversation as Conversation
    setConvs(curr => [c, ...curr])
    setActiveId(c.id)
    setMessages([])
    setInput('')
    inputRef.current?.focus()
  }

  async function sendMessage(prompt?: string) {
    const text = (prompt ?? input).trim()
    if (!text || sending) return

    // Make sure we have a conversation to land in.
    let convId = activeId
    if (!convId) {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) return
      const data = await res.json()
      const c = data.conversation as Conversation
      setConvs(curr => [c, ...curr])
      setActiveId(c.id)
      convId = c.id
    }

    setSending(true)
    setInput('')
    const optimisticUser: Message = {
      id: `optim-${Date.now()}`,
      role: 'user', content: text,
      created_at: new Date().toISOString(),
    }
    const optimisticPending: Message = {
      id: 'pending',
      role: 'assistant', content: '',
      created_at: new Date().toISOString(),
      pending: true,
    }
    setMessages(curr => [...curr, optimisticUser, optimisticPending])

    try {
      const res = await fetch(`/api/ai/conversations/${convId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages(curr => curr.filter(m => m.id !== 'pending').map(m =>
          m.id === optimisticUser.id ? { ...m, id: m.id } : m,
        ).concat([{
          id: `err-${Date.now()}`, role: 'assistant',
          content: data?.error ? `Tagro hat gerade gestreikt: ${data.error}` : 'Da war ein Problem. Probier es bitte gleich nochmal.',
          created_at: new Date().toISOString(),
        }]))
        return
      }
      const realUser: Message = data.user
      const realAssistant: Message = data.assistant
      setMessages(curr => [
        ...curr.filter(m => m.id !== optimisticUser.id && m.id !== 'pending'),
        realUser, realAssistant,
      ])
      // Refresh conv list (updated_at, possibly a new title).
      reloadConversations()
    } catch {
      setMessages(curr => curr.filter(m => m.id !== 'pending').concat([{
        id: `err-${Date.now()}`, role: 'assistant',
        content: 'Verbindung kurz unterbrochen. Probier es bitte gleich nochmal.',
        created_at: new Date().toISOString(),
      }]))
    } finally {
      setSending(false)
    }
  }

  async function deleteConv(id: string) {
    if (!confirm('Diesen Chat endgültig löschen?')) return
    const res = await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) return
    setConvs(curr => curr.filter(c => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  async function togglePin(id: string, pinned: boolean) {
    const res = await fetch(`/api/ai/conversations/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !pinned }),
    })
    if (!res.ok) return
    const data = await res.json()
    setConvs(curr => curr.map(c => c.id === id ? data.conversation : c))
  }

  async function commitRename(id: string) {
    const value = renameValue.trim()
    if (!value) { setRenaming(null); return }
    const res = await fetch(`/api/ai/conversations/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: value }),
    })
    if (res.ok) {
      const data = await res.json()
      setConvs(curr => curr.map(c => c.id === id ? data.conversation : c))
    }
    setRenaming(null)
  }

  function onKeyDownInput(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!authChecked) {
    return <div className="ai-loading">Lade…</div>
  }

  const activeConv = activeId ? convs.find(c => c.id === activeId) : null
  const hasMessages = messages.length > 0

  return (
    <div className={`ai-shell${railCollapsed ? ' rail-collapsed' : ''}`}>
      {/* ── Conversation rail ─────────────────────────────────── */}
      <aside className="ai-rail" aria-label="Chats">
        <div className="ai-rail-top">
          <button
            type="button"
            className="ai-new"
            onClick={newChat}
            title="Neuer Chat"
          >
            <ChatCircleDots size={14} />
            <span>Neuer Chat</span>
          </button>
          <button
            type="button"
            className="ai-rail-collapse"
            onClick={() => setRailCollapsed(v => !v)}
            title={railCollapsed ? 'Liste einblenden' : 'Liste ausblenden'}
            aria-label="Toggle"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="4" y="5" width="16" height="14" rx="3" />
              <path d="M9 5v14" />
            </svg>
          </button>
        </div>

        <div className="ai-rail-scroll">
          {convs.length === 0 ? (
            <p className="ai-rail-empty">Noch keine Chats. Starte einen mit „Neuer Chat" oder schreib unten gleich los.</p>
          ) : (
            <>
              {grouped.pinned.length > 0 && (
                <ConversationGroup label="Angepinnt" rows={grouped.pinned}
                  activeId={activeId} onPick={setActiveId}
                  onPin={togglePin} onDelete={deleteConv}
                  menuFor={menuFor} setMenuFor={setMenuFor}
                  renaming={renaming} setRenaming={(id) => { setRenaming(id); setRenameValue(convs.find(c => c.id === id)?.title || '') }}
                  renameValue={renameValue} setRenameValue={setRenameValue}
                  commitRename={commitRename}
                />
              )}
              {grouped.heute.length > 0 && (
                <ConversationGroup label="Heute" rows={grouped.heute}
                  activeId={activeId} onPick={setActiveId}
                  onPin={togglePin} onDelete={deleteConv}
                  menuFor={menuFor} setMenuFor={setMenuFor}
                  renaming={renaming} setRenaming={(id) => { setRenaming(id); setRenameValue(convs.find(c => c.id === id)?.title || '') }}
                  renameValue={renameValue} setRenameValue={setRenameValue}
                  commitRename={commitRename}
                />
              )}
              {grouped.last7.length > 0 && (
                <ConversationGroup label="Letzte 7 Tage" rows={grouped.last7}
                  activeId={activeId} onPick={setActiveId}
                  onPin={togglePin} onDelete={deleteConv}
                  menuFor={menuFor} setMenuFor={setMenuFor}
                  renaming={renaming} setRenaming={(id) => { setRenaming(id); setRenameValue(convs.find(c => c.id === id)?.title || '') }}
                  renameValue={renameValue} setRenameValue={setRenameValue}
                  commitRename={commitRename}
                />
              )}
              {grouped.older.length > 0 && (
                <ConversationGroup label="Älter" rows={grouped.older}
                  activeId={activeId} onPick={setActiveId}
                  onPin={togglePin} onDelete={deleteConv}
                  menuFor={menuFor} setMenuFor={setMenuFor}
                  renaming={renaming} setRenaming={(id) => { setRenaming(id); setRenameValue(convs.find(c => c.id === id)?.title || '') }}
                  renameValue={renameValue} setRenameValue={setRenameValue}
                  commitRename={commitRename}
                />
              )}
            </>
          )}
        </div>
      </aside>

      {/* ── Main pane ─────────────────────────────────────────── */}
      <main className="ai-main">
        <header className="ai-main-head">
          <div className="ai-main-head-left">
            <TagroLogo size={20} thinking={sending} />
            <h1>{activeConv?.title || 'Tagro'}</h1>
          </div>
          {activeConv && (
            <span className="ai-main-time">Aktualisiert {formatTimeAgo(activeConv.updated_at)}</span>
          )}
        </header>

        <div className="ai-feed" ref={scrollRef}>
          {!activeId && !hasMessages ? (
            <div className="ai-empty">
              <div className="ai-empty-mark">
                <TagroLogo size={36} />
              </div>
              <h2>Wie kann ich dir helfen?</h2>
              <p>Schreib unten los oder wähl einen Einstieg. Ich kenne deine Projekte, Tasks und letzten Briefings.</p>
              <div className="ai-starters">
                {PROMPT_STARTERS.map(s => (
                  <button
                    key={s}
                    type="button"
                    className="ai-starter"
                    onClick={() => sendMessage(s)}
                  >
                    <Sparkle size={12} weight="fill" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : loadingConv ? (
            <p className="ai-loading-inline">Lade Chat…</p>
          ) : (
            <div className="ai-thread">
              {messages.map(m => (
                <article key={m.id} className={`ai-msg ${m.role}`}>
                  {m.role === 'assistant' && (
                    <div className="ai-msg-avatar">
                      <TagroLogo size={16} thinking={m.pending} />
                    </div>
                  )}
                  <div className="ai-msg-body">
                    {m.pending ? (
                      <span className="ai-typing"><span /><span /><span /></span>
                    ) : m.role === 'assistant' ? (
                      <ChatMarkdown text={m.content} />
                    ) : (
                      <p className="ai-user-text">{m.content}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="ai-composer-wrap">
          <div className="ai-composer">
            <textarea
              ref={inputRef}
              className="ai-input"
              placeholder="Frag Tagro…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDownInput}
              rows={1}
              disabled={sending}
            />
            <button
              type="button"
              className="ai-send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
              aria-label="Senden"
            >
              <ArrowUp size={15} weight="bold" />
            </button>
          </div>
          <p className="ai-foot">
            Tagro kann sich irren. Wichtiges immer kurz gegenprüfen.
          </p>
        </div>
      </main>

      <style jsx>{CSS}</style>
    </div>
  )
}

function ConversationGroup({
  label, rows, activeId, onPick,
  onPin, onDelete, menuFor, setMenuFor,
  renaming, setRenaming, renameValue, setRenameValue, commitRename,
}: {
  label: string
  rows: Conversation[]
  activeId: string | null
  onPick: (id: string) => void
  onPin: (id: string, pinned: boolean) => void
  onDelete: (id: string) => void
  menuFor: string | null
  setMenuFor: (id: string | null) => void
  renaming: string | null
  setRenaming: (id: string | null) => void
  renameValue: string
  setRenameValue: (v: string) => void
  commitRename: (id: string) => void
}) {
  return (
    <section className="ai-group">
      <p className="ai-group-label">{label}</p>
      <div className="ai-group-list">
        {rows.map(c => {
          const active = c.id === activeId
          const isRenaming = renaming === c.id
          return (
            <div
              key={c.id}
              className={`ai-row${active ? ' active' : ''}`}
            >
              {isRenaming ? (
                <input
                  className="ai-rename"
                  value={renameValue}
                  autoFocus
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(c.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
                    if (e.key === 'Escape') setRenaming(null)
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="ai-row-pick"
                  onClick={() => onPick(c.id)}
                  title={c.title}
                >
                  <span className="ai-row-title">{c.title}</span>
                </button>
              )}
              <button
                type="button"
                className="ai-row-menu"
                onClick={() => setMenuFor(menuFor === c.id ? null : c.id)}
                aria-label="Optionen"
                aria-expanded={menuFor === c.id}
              >
                <DotsThreeOutline size={12} weight="bold" />
              </button>
              {menuFor === c.id && (
                <>
                  <button type="button" className="ai-menu-back" onClick={() => setMenuFor(null)} aria-hidden />
                  <div className="ai-menu" role="menu">
                    <button type="button" role="menuitem" onClick={() => { setMenuFor(null); onPin(c.id, c.pinned) }}>
                      {c.pinned ? <PushPinSimple size={12} /> : <PushPin size={12} />}
                      {c.pinned ? 'Anheften aufheben' : 'Anheften'}
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setMenuFor(null); setRenaming(c.id) }}>
                      <PencilSimple size={12} />
                      Umbenennen
                    </button>
                    <button type="button" role="menuitem" className="ai-menu-danger" onClick={() => { setMenuFor(null); onDelete(c.id) }}>
                      <Trash size={12} />
                      Löschen
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

const CSS = `
  .ai-shell {
    height: 100dvh;
    display: grid;
    grid-template-columns: 264px minmax(0, 1fr);
    background: var(--bg); color: var(--text);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .ai-shell.rail-collapsed { grid-template-columns: 0 minmax(0, 1fr); }
  .ai-shell.rail-collapsed .ai-rail { transform: translateX(-100%); pointer-events: none; opacity: 0; }
  .ai-loading { padding: 80px; color: var(--text-muted); }

  /* Rail */
  .ai-rail {
    border-right: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    display: flex; flex-direction: column;
    transition: transform .2s ease, opacity .2s ease;
    overflow: hidden;
  }
  .ai-rail-top {
    display: flex; align-items: center; gap: 6px;
    padding: 12px 12px 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }
  .ai-new {
    flex: 1;
    display: inline-flex; align-items: center; gap: 8px;
    height: 34px; padding: 0 12px;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    background: var(--card);
    color: var(--text);
    border-radius: 10px;
    font: inherit; font-size: 12.5px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer; transition: background .12s, border-color .12s;
  }
  .ai-new:hover { background: var(--surface-2); border-color: var(--border); }
  .ai-rail-collapse {
    width: 32px; height: 34px; border: 0; background: transparent;
    color: var(--text-muted); border-radius: 8px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .ai-rail-collapse:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); color: var(--text); }

  .ai-rail-scroll { flex: 1 1 auto; overflow-y: auto; padding: 6px 6px 14px; }
  .ai-rail-scroll::-webkit-scrollbar { width: 4px; }
  .ai-rail-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  .ai-rail-empty {
    padding: 14px 14px 0; font-size: 11.5px; color: var(--text-muted);
    font-weight: 500; line-height: 1.5; letter-spacing: .015em;
  }

  .ai-group { padding-top: 10px; }
  .ai-group-label {
    margin: 0 8px 4px;
    font-size: 10.5px; font-weight: 500; letter-spacing: .12em;
    text-transform: uppercase; color: var(--text-muted);
  }
  .ai-group-list { display: flex; flex-direction: column; gap: 1px; }
  .ai-row {
    position: relative;
    display: grid; grid-template-columns: 1fr 22px; align-items: center;
    border-radius: 8px;
    transition: background .1s;
  }
  .ai-row:hover { background: color-mix(in srgb, var(--surface-2) 55%, transparent); }
  .ai-row.active { background: color-mix(in srgb, var(--surface-2) 80%, transparent); }
  .ai-row-pick {
    width: 100%; border: 0; background: transparent;
    color: var(--text); font: inherit; text-align: left;
    padding: 7px 4px 7px 10px;
    cursor: pointer;
    min-width: 0;
  }
  .ai-row-title {
    display: block;
    font-size: 12.5px; font-weight: 500; letter-spacing: .015em;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ai-row-menu {
    width: 22px; height: 24px; border: 0; background: transparent;
    color: var(--text-muted); border-radius: 6px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    margin-right: 4px;
    opacity: 0; transition: opacity .12s, color .12s, background .12s;
  }
  .ai-row:hover .ai-row-menu, .ai-row.active .ai-row-menu { opacity: 1; }
  .ai-row-menu:hover { color: var(--text); background: var(--card); }
  .ai-menu-back {
    position: fixed; inset: 0; z-index: 12;
    background: transparent; border: 0; padding: 0; cursor: default;
  }
  .ai-menu {
    position: absolute; top: calc(100% - 2px); right: 4px; z-index: 13;
    min-width: 168px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 4px;
    box-shadow: 0 1px 2px rgba(15,23,42,.06), 0 12px 32px rgba(15,23,42,.12);
    display: flex; flex-direction: column; gap: 1px;
    animation: aiFade .12s ease both;
  }
  [data-theme="dark"] .ai-menu, [data-theme="classic-dark"] .ai-menu {
    background: color-mix(in srgb, var(--surface) 95%, #fff 5%);
    box-shadow: 0 1px 2px rgba(0,0,0,.35), 0 18px 44px rgba(0,0,0,.4);
  }
  .ai-menu button {
    display: flex; align-items: center; gap: 8px;
    width: 100%; padding: 7px 10px;
    border: 0; background: transparent;
    color: var(--text); font: inherit; font-size: 12px;
    font-weight: 500; letter-spacing: .015em; cursor: pointer;
    border-radius: 6px; text-align: left;
  }
  .ai-menu button:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
  .ai-menu button.ai-menu-danger { color: #ef4444; }
  .ai-menu button.ai-menu-danger:hover { background: color-mix(in srgb, #ef4444 12%, transparent); }
  .ai-rename {
    width: 100%; height: 30px; padding: 0 10px; margin: 0 4px;
    border: 1px solid color-mix(in srgb, var(--text) 30%, var(--border));
    border-radius: 6px;
    background: var(--card); color: var(--text);
    font: inherit; font-size: 12.5px; font-weight: 500; letter-spacing: .015em;
    outline: 0;
  }

  /* Main */
  .ai-main {
    display: grid; grid-template-rows: auto 1fr auto;
    min-height: 0; min-width: 0;
  }
  .ai-main-head {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 22px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }
  .ai-main-head-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .ai-main-head h1 {
    margin: 0; font-size: 14px; font-weight: 500; letter-spacing: -.005em;
    color: var(--text);
    max-width: 60ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ai-main-time {
    font-size: 11.5px; color: var(--text-muted);
    font-weight: 500; letter-spacing: .015em;
  }

  .ai-feed { overflow-y: auto; padding: 28px 0 16px; }
  .ai-loading-inline { padding: 40px; color: var(--text-muted); font-size: 13px; text-align: center; }

  .ai-empty {
    max-width: 580px; margin: 56px auto 0;
    padding: 0 24px;
    text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
  }
  .ai-empty-mark {
    width: 72px; height: 72px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--card);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    box-shadow: 0 8px 28px -10px color-mix(in srgb, var(--text) 18%, transparent);
  }
  .ai-empty h2 {
    margin: 8px 0 0; font-size: 24px; font-weight: 500; letter-spacing: -.015em;
    color: var(--text);
  }
  .ai-empty p {
    margin: 0; font-size: 13.5px; line-height: 1.6;
    color: var(--text-muted); font-weight: 500; letter-spacing: .015em;
    max-width: 460px;
  }
  .ai-starters {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px; width: 100%; margin-top: 8px;
  }
  .ai-starter {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 14px; text-align: left;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    background: var(--card);
    color: var(--text-secondary);
    border-radius: 12px;
    font: inherit; font-size: 12.5px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer;
    transition: border-color .12s, background .12s, color .12s, transform .15s;
  }
  .ai-starter:hover {
    border-color: var(--border-strong);
    background: color-mix(in srgb, var(--surface-2) 35%, var(--card));
    color: var(--text);
    transform: translateY(-1px);
  }
  .ai-starter svg { color: var(--text-muted); flex-shrink: 0; }
  @media (max-width: 640px) { .ai-starters { grid-template-columns: 1fr; } }

  .ai-thread {
    max-width: 760px; margin: 0 auto;
    padding: 0 22px;
    display: flex; flex-direction: column; gap: 22px;
  }
  .ai-msg {
    display: flex; gap: 12px;
    animation: aiMsgIn .25s cubic-bezier(.16,1,.3,1) both;
  }
  .ai-msg.user { justify-content: flex-end; }
  .ai-msg-avatar {
    width: 30px; height: 30px; flex-shrink: 0;
    border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--card);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    margin-top: 2px;
  }
  .ai-msg-body { min-width: 0; max-width: 100%; }
  .ai-msg.user .ai-msg-body {
    max-width: 80%;
    background: color-mix(in srgb, var(--surface-2) 75%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    padding: 11px 14px;
    border-radius: 16px;
    border-top-right-radius: 5px;
  }
  .ai-msg.assistant .ai-msg-body {
    flex: 1; min-width: 0;
    padding-top: 4px;
    font-size: 14px; line-height: 1.65; color: var(--text); font-weight: 500;
  }
  .ai-user-text {
    margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--text);
    font-weight: 500; letter-spacing: .015em; white-space: pre-wrap; word-wrap: break-word;
  }

  .ai-typing { display: inline-flex; gap: 5px; padding: 6px 0; }
  .ai-typing span {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--text-muted); opacity: .5;
    animation: aiDot 1.2s ease-in-out infinite;
  }
  .ai-typing span:nth-child(2) { animation-delay: .15s; }
  .ai-typing span:nth-child(3) { animation-delay: .3s; }
  @keyframes aiDot { 0%,80%,100% { transform: translateY(0); opacity: .35 } 40% { transform: translateY(-3px); opacity: .9 } }
  @keyframes aiMsgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @keyframes aiFade { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: none; } }

  .ai-composer-wrap {
    border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
    padding: 14px 22px 18px;
    background: var(--bg);
  }
  .ai-composer {
    max-width: 760px; margin: 0 auto;
    display: flex; gap: 10px; align-items: flex-end;
    padding: 11px 12px 11px 16px;
    border-radius: 22px;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    background: color-mix(in srgb, var(--surface) 65%, var(--card) 35%);
    transition: border-color .12s, box-shadow .12s;
  }
  .ai-composer:focus-within {
    border-color: color-mix(in srgb, var(--text) 30%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--text) 5%, transparent);
  }
  .ai-input {
    flex: 1; min-width: 0;
    background: transparent; border: 0; outline: 0; resize: none;
    color: var(--text); font: inherit;
    font-size: 14px; line-height: 1.55; font-weight: 500; letter-spacing: .015em;
    max-height: 220px;
    padding: 6px 0;
  }
  .ai-input::placeholder { color: var(--text-muted); opacity: .6; }
  .ai-send {
    width: 32px; height: 32px; border: 0; border-radius: 10px;
    background: var(--btn-prim); color: var(--btn-prim-text);
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; transition: opacity .12s, transform .12s;
    flex-shrink: 0;
  }
  .ai-send:hover:not(:disabled) { opacity: .92; }
  .ai-send:active:not(:disabled) { transform: scale(.95); }
  .ai-send:disabled { opacity: .4; cursor: not-allowed; }
  .ai-foot {
    max-width: 760px; margin: 8px auto 0; text-align: center;
    font-size: 11px; color: var(--text-muted);
    font-weight: 500; letter-spacing: .015em;
  }

  @media (max-width: 820px) {
    .ai-shell { grid-template-columns: 56px minmax(0, 1fr); }
    .ai-rail-top .ai-new span { display: none; }
    .ai-row-title { font-size: 12px; }
    .ai-rail-scroll { padding-left: 4px; padding-right: 4px; }
  }
  @media (max-width: 640px) {
    .ai-shell { grid-template-columns: 0 minmax(0, 1fr); }
    .ai-shell .ai-rail { transform: translateX(-100%); }
  }
`
