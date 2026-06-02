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

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowUp, Briefcase, CaretDown, ChatCircleDots, CheckCircle, DotsThreeOutline,
  FileText, Microphone, PencilSimple, PushPin, PushPinSimple, Sparkle, Trash, X,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import ChatMarkdown from '@/components/ChatMarkdown'
import NotesWorkspace from '@/components/NotesWorkspace'
import TagroLogo from '@/components/TagroLogo'

type Mode = 'tagro' | 'developer' | 'owner' | 'support'

type Conversation = {
  id: string
  title: string
  pinned: boolean
  mode?: Mode
  project_id?: string | null
  status?: 'active' | 'ended' | 'sent_to_inbox' | 'archived'
  summary?: string | null
  ended_at?: string | null
  created_at: string
  updated_at: string
}

type ModeDescriptor = {
  id: Mode
  label: string
  short: string
  helper: string
  composerPlaceholder: string
  composerLabel: (ctx: string) => string
}

const MODES: ModeDescriptor[] = [
  {
    id: 'tagro',
    label: 'Tagro AI',
    short: 'Tagro',
    helper: 'AI-Steuerung für Projekte, Tasks, Reviews und Briefings',
    composerPlaceholder: 'Frag Tagro über Projekte, Tasks, Risiken oder Briefings …',
    composerLabel: ctx => `An Tagro AI · Kontext: ${ctx}`,
  },
  {
    id: 'developer',
    label: 'Developer',
    short: 'Dev',
    helper: 'Direkte Abstimmung mit dem Entwicklerteam des Projekts',
    composerPlaceholder: 'Nachricht ans Developer-Team …',
    composerLabel: ctx => `An Developer Team · Projekt: ${ctx}`,
  },
  {
    id: 'owner',
    label: 'Project Owner',
    short: 'Owner',
    helper: 'Freigaben, Scope-Änderungen, Qualität, Eskalation',
    composerPlaceholder: 'Nachricht an deinen Project Owner …',
    composerLabel: ctx => `An Project Owner · Projekt: ${ctx}`,
  },
  {
    id: 'support',
    label: 'Support',
    short: 'Support',
    helper: 'Konto, Abrechnung, Zugang, Zahlungen, Plattform-Hilfe',
    composerPlaceholder: 'Nachricht an Festag Support …',
    composerLabel: ctx => `An Festag Support · ${ctx === 'Alle Projekte' ? 'Account' : 'Projekt: ' + ctx}`,
  },
]
const MODE_BY_ID: Record<Mode, ModeDescriptor> = Object.fromEntries(MODES.map(m => [m.id, m])) as Record<Mode, ModeDescriptor>
const MODE_FILTERS: Array<{ id: 'all' | Mode | 'archived'; label: string }> = [
  { id: 'all', label: 'Alle' },
  { id: 'tagro', label: 'Tagro' },
  { id: 'developer', label: 'Dev' },
  { id: 'owner', label: 'Owner' },
  { id: 'support', label: 'Support' },
  { id: 'archived', label: 'Archiv' },
]

type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string | null
  created_at: string
  pending?: boolean
}

type ProjectContext = {
  id: string
  title: string
}

const PROMPT_STARTERS = [
  'Was ist mein aktueller Projektstand?',
  'Welche Risiken sollte ich diese Woche im Blick haben?',
  'Strukturiere mir eine neue Projektidee.',
  'Was sind die nächsten Entscheidungen, die ich freigeben muss?',
]

const STATIC_CONTEXTS: ProjectContext[] = [
  { id: 'all', title: 'Alle Projekte' },
  { id: 'reviews', title: 'Offene Reviews' },
  { id: 'briefings', title: 'Statusberichte' },
]

const EMPTY_ACTIONS = [
  {
    tone: 'task',
    title: 'Tasks aus Statusbericht',
    meta: 'Tagro erkennt nächste Schritte, Owner und Risiko.',
    primary: 'Tasks vorbereiten',
    secondary: 'Bericht wählen',
  },
  {
    tone: 'report',
    title: 'Wochenbriefing erstellen',
    meta: 'Fortschritt, Blocker und Entscheidungen verdichten.',
    primary: 'Briefing starten',
    secondary: 'Vorschau',
  },
  {
    tone: 'review',
    title: 'Reviews prüfen',
    meta: 'Offene Freigaben nach Dringlichkeit sortieren.',
    primary: 'Reviews öffnen',
    secondary: 'Risiken ansehen',
  },
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

// `useSearchParams()` requires a <Suspense> boundary in Next 14+. Without
// one the page tries to statically prerender, the hook bails, and the app
// error boundary catches it as "Diese Ansicht konnte gerade nicht sauber
// geladen werden" — that's the bug Stefan kept seeing. Wrapping the
// switcher in Suspense lets Next defer the segment to the client cleanly.
function AISwitcher() {
  const searchParams = useSearchParams()
  const view = searchParams?.get('view') ?? 'chat'
  if (view === 'notes') return <NotesWorkspace />
  return <AIChatPage />
}

export default function AIPage() {
  return (
    <Suspense fallback={<AIChatPage />}>
      <AISwitcher />
    </Suspense>
  )
}

function AIChatPage() {
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
  const [projectContexts, setProjectContexts] = useState<ProjectContext[]>(STATIC_CONTEXTS)
  const [activeContextId, setActiveContextId] = useState('all')
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const [activeMode, setActiveMode] = useState<Mode>('tagro')
  const [railFilter, setRailFilter] = useState<'all' | Mode | 'archived'>('all')
  const [endingChat, setEndingChat] = useState(false)
  const [endToast, setEndToast] = useState<string | null>(null)
  const [kbInset, setKbInset] = useState(0)
  const [composerFocused, setComposerFocused] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // visualViewport tracking — iOS Safari + Android Chrome both shrink
  // window.innerHeight when the soft keyboard opens. visualViewport.
  // height gives us the actual visible area so we can lift the
  // composer above the keyboard. Only relevant on mobile.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const vv = (window as any).visualViewport as VisualViewport | undefined
    if (!vv) return
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKbInset(inset)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  // Toggle a body-level class while the composer holds focus — the
  // global mobile CSS hides the bottom nav while typing so the input
  // never collides with it on iOS PWA.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('chat-composer-focused', composerFocused)
    return () => document.body.classList.remove('chat-composer-focused')
  }, [composerFocused])

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
      const [{ data: projects }] = await Promise.all([
        supabase.from('projects').select('id,title').order('created_at', { ascending: false }).limit(8),
        reloadConversations(),
      ])
      if (!cancelled && projects?.length) {
        setProjectContexts([
          STATIC_CONTEXTS[0],
          ...(projects as any[]).map(project => ({ id: project.id, title: project.title })),
          ...STATIC_CONTEXTS.slice(1),
        ])
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reloadConversations = useCallback(async () => {
    // Always include archived too — the rail itself filters via railFilter,
    // and we don't want a fresh-end conversation disappearing mid-flow.
    const res = await fetch('/api/ai/conversations?archived=1', { credentials: 'include' })
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

  const activeContext = useMemo(() => (
    projectContexts.find(context => context.id === activeContextId) ?? projectContexts[0]
  ), [activeContextId, projectContexts])

  async function newChat(modeOverride?: Mode, projectIdOverride?: string | null) {
    const mode = modeOverride ?? activeMode
    const projectId = projectIdOverride !== undefined
      ? projectIdOverride
      : (activeContext.id !== 'all' && activeContext.id !== 'reviews' && activeContext.id !== 'briefings'
          ? activeContext.id
          : null)
    const res = await fetch('/api/ai/conversations', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, projectId }),
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

  async function endChat(convId: string) {
    if (endingChat) return
    if (!confirm('Diesen Chat beenden? Tagro erzeugt eine Zusammenfassung und schickt sie in die Inbox. Das Transkript bleibt im Verlauf.')) return
    setEndingChat(true)
    try {
      const res = await fetch(`/api/ai/conversations/${convId}/end`, {
        method: 'POST', credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setConvs(curr => curr.map(c => c.id === convId
        ? { ...c, status: 'sent_to_inbox', summary: data.summary, ended_at: data.ended_at }
        : c))
      setEndToast('Zusammenfassung an Inbox gesendet')
      setTimeout(() => setEndToast(null), 3200)
    } finally {
      setEndingChat(false)
    }
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
        body: JSON.stringify({
          content: text,
          projectContext: {
            id: activeContext.id,
            title: activeContext.title,
          },
        }),
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

  // ⚠ All hooks must run on every render. Previously there was an
  // `if (!authChecked) return …` early-return BEFORE the useMemo blocks
  // below, which mounted hooks conditionally and broke the Rules of
  // Hooks on the second render → React threw, the (app)/error.tsx
  // boundary caught it as the dreaded "Diese Ansicht konnte gerade
  // nicht sauber geladen werden" wall. All useMemo calls now sit above
  // the conditional render guard.
  const activeConv = activeId ? convs.find(c => c.id === activeId) : null
  const hasMessages = messages.length > 0
  // Conversation's own mode wins over the switcher when one is open —
  // so the user always sees the correct mode for the active chat.
  const effectiveMode: Mode = (activeConv?.mode as Mode | undefined) ?? activeMode
  const mode = MODE_BY_ID[effectiveMode]
  const isEnded = activeConv?.status === 'sent_to_inbox' || activeConv?.status === 'ended' || activeConv?.status === 'archived'

  const projectById = useMemo(() => {
    const m = new Map<string, ProjectContext>()
    for (const p of projectContexts) m.set(p.id, p)
    return m
  }, [projectContexts])

  // Conversation rail — filter the loaded list by mode + status.
  const visibleConvs = useMemo(() => {
    if (railFilter === 'all')      return convs.filter(c => c.status !== 'archived')
    if (railFilter === 'archived') return convs.filter(c => c.status === 'archived' || c.status === 'sent_to_inbox')
    return convs.filter(c => (c.mode ?? 'tagro') === railFilter && c.status !== 'archived')
  }, [convs, railFilter])
  const railGrouped = useMemo(() => {
    const g: { pinned: Conversation[]; heute: Conversation[]; last7: Conversation[]; older: Conversation[] } = {
      pinned: [], heute: [], last7: [], older: [],
    }
    for (const c of visibleConvs) {
      if (c.pinned) { g.pinned.push(c); continue }
      g[formatGroup(c.updated_at)].push(c)
    }
    return g
  }, [visibleConvs])

  if (!authChecked) {
    return <div className="ai-loading">Lade…</div>
  }

  return (
    <div className={`ai-shell${railCollapsed ? ' rail-collapsed' : ''}`}>
      {endToast && (
        <div className="ai-toast" role="status">
          <CheckCircle size={13} weight="fill" /> {endToast}
        </div>
      )}

      {/* Floating expand handle — only visible when rail is collapsed
          so the user always has a way back. Sits at the left edge of
          the main pane, doesn't shift any other layout. */}
      {railCollapsed && (
        <button
          type="button"
          className="ai-rail-expand"
          onClick={() => setRailCollapsed(false)}
          aria-label="Chat-Liste einblenden"
          title="Chat-Liste einblenden"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="4" y="5" width="16" height="14" rx="3" />
            <path d="M9 5v14" />
          </svg>
        </button>
      )}

      {/* ── Conversation rail ─────────────────────────────────── */}
      <aside className="ai-rail" aria-label="Chats">
        <div className="ai-rail-top">
          <button
            type="button"
            className="ai-new"
            onClick={() => newChat()}
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

        <div className="ai-rail-filters" role="tablist" aria-label="Chat-Filter">
          {MODE_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={railFilter === f.id}
              className={`ai-rail-filter${railFilter === f.id ? ' on' : ''}`}
              onClick={() => setRailFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ai-rail-scroll">
          {visibleConvs.length === 0 ? (
            <p className="ai-rail-empty">
              {railFilter === 'all'
                ? 'Noch keine Chats. Starte einen mit „Neuer Chat" oder schreib unten gleich los.'
                : railFilter === 'archived'
                  ? 'Keine archivierten oder beendeten Chats.'
                  : `Keine ${MODE_BY_ID[railFilter as Mode]?.label ?? ''}-Chats in dieser Sicht.`}
            </p>
          ) : (
            <>
              {railGrouped.pinned.length > 0 && (
                <ConversationGroup label="Angepinnt" rows={railGrouped.pinned}
                  activeId={activeId} onPick={setActiveId}
                  onPin={togglePin} onDelete={deleteConv}
                  menuFor={menuFor} setMenuFor={setMenuFor}
                  renaming={renaming} setRenaming={(id) => { setRenaming(id); setRenameValue(convs.find(c => c.id === id)?.title || '') }}
                  renameValue={renameValue} setRenameValue={setRenameValue}
                  commitRename={commitRename}
                />
              )}
              {railGrouped.heute.length > 0 && (
                <ConversationGroup label="Heute" rows={railGrouped.heute}
                  activeId={activeId} onPick={setActiveId}
                  onPin={togglePin} onDelete={deleteConv}
                  menuFor={menuFor} setMenuFor={setMenuFor}
                  renaming={renaming} setRenaming={(id) => { setRenaming(id); setRenameValue(convs.find(c => c.id === id)?.title || '') }}
                  renameValue={renameValue} setRenameValue={setRenameValue}
                  commitRename={commitRename}
                />
              )}
              {railGrouped.last7.length > 0 && (
                <ConversationGroup label="Letzte 7 Tage" rows={railGrouped.last7}
                  activeId={activeId} onPick={setActiveId}
                  onPin={togglePin} onDelete={deleteConv}
                  menuFor={menuFor} setMenuFor={setMenuFor}
                  renaming={renaming} setRenaming={(id) => { setRenaming(id); setRenameValue(convs.find(c => c.id === id)?.title || '') }}
                  renameValue={renameValue} setRenameValue={setRenameValue}
                  commitRename={commitRename}
                />
              )}
              {railGrouped.older.length > 0 && (
                <ConversationGroup label="Älter" rows={railGrouped.older}
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
            <span className="ai-head-mark">
              <TagroLogo size={18} thinking={sending} />
            </span>
            <div className="ai-head-title">
              <h1>{activeConv?.title || mode.label}</h1>
              <span>{mode.helper}</span>
            </div>
          </div>

          {/* Mode switcher — disabled while a conversation is open
              (the chat's own mode wins); creating a new chat uses the
              active mode from this segmented control. */}
          <div className="ai-mode-switch" role="tablist" aria-label="Communication mode">
            {MODES.map(m => {
              const isActive = activeConv ? m.id === effectiveMode : m.id === activeMode
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`ai-mode-segment${isActive ? ' on' : ''}`}
                  onClick={() => {
                    if (activeConv) {
                      // Hand off into a fresh chat in the picked mode so we don't
                      // silently rewire the open conversation's history.
                      newChat(m.id)
                    } else {
                      setActiveMode(m.id)
                    }
                  }}
                  disabled={!!activeConv && m.id === effectiveMode}
                  title={m.label}
                >
                  {m.label}
                </button>
              )
            })}
          </div>

          <div className="ai-main-head-right">
            {activeConv && (
              <span className="ai-main-time">Aktualisiert {formatTimeAgo(activeConv.updated_at)}</span>
            )}
            {activeConv && !isEnded && (
              <button
                type="button"
                className="ai-end-chat"
                onClick={() => endChat(activeConv.id)}
                disabled={endingChat}
                title="Chat beenden — Tagro fasst zusammen und sendet an Inbox"
              >
                {endingChat ? 'Beende…' : 'Chat beenden'}
              </button>
            )}
            <div className="ai-context-wrap">
              <button
                type="button"
                className="ai-context-button"
                onClick={() => setContextMenuOpen(open => !open)}
                aria-expanded={contextMenuOpen}
              >
                <Briefcase size={13} />
                <span>Kontext: {activeContext.title}</span>
                <CaretDown size={12} weight="bold" />
              </button>
              {contextMenuOpen && (
                <>
                  <button className="ai-context-backdrop" type="button" aria-hidden onClick={() => setContextMenuOpen(false)} />
                  <div className="ai-context-menu">
                    {projectContexts.map(context => (
                      <button
                        key={context.id}
                        type="button"
                        className={context.id === activeContextId ? 'on' : ''}
                        onClick={() => {
                          setActiveContextId(context.id)
                          setContextMenuOpen(false)
                        }}
                      >
                        <span>{context.title}</span>
                        {context.id === activeContextId ? <CheckCircle size={13} weight="fill" /> : null}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="ai-feed" ref={scrollRef}>
          {!activeId && !hasMessages ? (
            <ModeEmptyState
              mode={effectiveMode}
              projectTitle={activeContext.title}
              onPickProject={() => setContextMenuOpen(true)}
              onStarter={(prompt) => sendMessage(prompt)}
            />
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
                      <>
                        <span className="ai-context-pill">Kontext: {activeContext.title}</span>
                        <ChatMarkdown text={m.content} />
                        {actionForMessage(m.content) ? (
                          <TagroActionCard {...actionForMessage(m.content)!} />
                        ) : null}
                      </>
                    ) : (
                      <p className="ai-user-text">{m.content}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div
          className={`ai-composer-wrap${composerFocused ? ' kb-focused' : ''}`}
          style={kbInset > 0 ? { transform: `translateY(-${kbInset}px)`, transition: 'transform .18s ease' } : undefined}
        >
          {isEnded && activeConv && (
            <div className="ai-ended-banner" role="status">
              <CheckCircle size={13} weight="fill" />
              <span>Konversation beendet · Zusammenfassung liegt in deiner Inbox.</span>
              <button type="button" onClick={() => newChat(effectiveMode)}>Neuen Chat starten</button>
            </div>
          )}
          {!isEnded && (
            <div className="ai-composer">
              <textarea
                ref={inputRef}
                className="ai-input"
                placeholder={mode.composerPlaceholder}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDownInput}
                onFocus={() => setComposerFocused(true)}
                onBlur={() => setComposerFocused(false)}
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
          )}
          <p className="ai-foot">
            {mode.composerLabel(activeContext.title)} ·
            {effectiveMode === 'tagro'
              ? ' Tagro kann sich irren — Wichtiges kurz gegenprüfen.'
              : ' Tagro speichert Nachrichten und kann sie zu Tasks oder Briefings verlinken.'}
          </p>
        </div>
      </main>

      <style jsx global>{CSS}</style>
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
                  <span className="ai-row-meta">
                    <span className={`ai-row-badge mode-${(c.mode ?? 'tagro')}`}>
                      {MODE_BY_ID[(c.mode ?? 'tagro') as Mode]?.short ?? 'Tagro'}
                    </span>
                    {c.status === 'sent_to_inbox' && (
                      <span className="ai-row-badge muted">In Inbox</span>
                    )}
                    {c.status === 'archived' && (
                      <span className="ai-row-badge muted">Archiviert</span>
                    )}
                  </span>
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

/* ────────────────────────────────────────────────────────────────
 * ModeEmptyState — calm, mode-aware first-screen for /ai.
 * Replaces the old huge white-card empty cluster.
 * ──────────────────────────────────────────────────────────── */
function ModeEmptyState({
  mode, projectTitle, onStarter, onPickProject,
}: {
  mode: Mode
  projectTitle: string
  onStarter: (prompt: string) => void
  onPickProject: () => void
}) {
  const isAllProjects = projectTitle === 'Alle Projekte'

  if (mode === 'tagro') {
    return (
      <div className="ai-empty">
        <div className="ai-empty-mark"><TagroLogo size={32} /></div>
        <h2>Wie kann Tagro helfen?</h2>
        <p>Frag nach Projektstatus, Risiken, Entscheidungen, Tasks oder Briefings — Kontext: <strong>{projectTitle}</strong>.</p>
        <div className="ai-starters">
          {[
            'Was ist mein aktueller Projektstand?',
            'Welche Risiken sollte ich diese Woche im Blick haben?',
            'Strukturiere mir eine neue Projektidee.',
            'Welche Entscheidungen blockieren gerade Fortschritt?',
          ].map(s => (
            <button key={s} type="button" className="ai-starter" onClick={() => onStarter(s)}>
              <Sparkle size={12} weight="fill" />
              <span>{s}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (mode === 'developer') {
    if (isAllProjects) {
      return (
        <div className="ai-empty narrow">
          <div className="ai-empty-mark"><Briefcase size={22} /></div>
          <h2>Projekt auswählen</h2>
          <p>Developer-Chats sind immer projektgebunden, damit Tagro Nachrichten mit Tasks, Milestones und Berichten verknüpfen kann.</p>
          <button type="button" className="ai-empty-cta" onClick={onPickProject}>
            <Briefcase size={13} /> Projekt wählen
          </button>
        </div>
      )
    }
    return (
      <div className="ai-empty">
        <div className="ai-empty-mark"><Briefcase size={22} /></div>
        <h2>Chat mit dem Projektteam</h2>
        <p>Nachrichten bleiben am Projekt <strong>{projectTitle}</strong> hängen und können in Tasks, Briefings oder Milestones übersetzt werden.</p>
        <div className="ai-starters">
          {[
            'Bitte gib mir kurz den aktuellen Implementierungsstand.',
            'Wo stehen wir mit dem nächsten Milestone?',
            'Welche offenen Fragen blockieren euch?',
          ].map(s => (
            <button key={s} type="button" className="ai-starter" onClick={() => onStarter(s)}>
              <Sparkle size={12} weight="fill" />
              <span>{s}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (mode === 'owner') {
    return (
      <div className="ai-empty">
        <div className="ai-empty-mark"><CheckCircle size={22} /></div>
        <h2>Mit dem Project Owner sprechen</h2>
        <p>Für Freigaben, Qualitätsfragen, Scope-Änderungen oder Eskalation — Kontext: <strong>{projectTitle}</strong>.</p>
        <div className="ai-starters">
          {[
            'Bitte Freigabe für den aktuellen Stand.',
            'Ich brauche eine Scope-Anpassung — wie gehen wir vor?',
            'Wer prüft die nächste Lieferung?',
          ].map(s => (
            <button key={s} type="button" className="ai-starter" onClick={() => onStarter(s)}>
              <Sparkle size={12} weight="fill" />
              <span>{s}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // support
  return (
    <div className="ai-empty">
      <div className="ai-empty-mark"><FileText size={22} /></div>
      <h2>Wobei kann Festag Support helfen?</h2>
      <p>Konto, Abrechnung, Zugang, Zahlungen oder Plattform-Fragen — schreib uns einfach.</p>
      <div className="ai-starters">
        {[
          'Ich habe eine Frage zur Rechnung.',
          'Wie ändere ich meine Zahlungsmethode?',
          'Ich komme nicht in mein Konto rein.',
          'Welche Pakete gibt es?',
        ].map(s => (
          <button key={s} type="button" className="ai-starter" onClick={() => onStarter(s)}>
            <Sparkle size={12} weight="fill" />
            <span>{s}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function actionForMessage(content: string) {
  const lower = content.toLowerCase()
  if (lower.includes('task') || lower.includes('aufgabe')) {
    return {
      tone: 'task',
      title: 'Task-Vorschlag erkannt',
      meta: 'Tagro kann daraus eine konkrete Aufgabe mit Kontext und Owner vorbereiten.',
      primary: 'Task erstellen',
      secondary: 'Bearbeiten',
    }
  }
  if (lower.includes('bericht') || lower.includes('briefing') || lower.includes('status')) {
    return {
      tone: 'report',
      title: 'Statusbericht vorbereiten',
      meta: 'Zusammenfassung mit Fortschritt, Risiken und nächsten Schritten erzeugen.',
      primary: 'Bericht öffnen',
      secondary: 'Audio-Briefing',
    }
  }
  if (lower.includes('review') || lower.includes('freigabe') || lower.includes('entscheidung')) {
    return {
      tone: 'review',
      title: 'Review oder Entscheidung offen',
      meta: 'Tagro kann die Freigabe bündeln oder Korrekturen formulieren.',
      primary: 'Details öffnen',
      secondary: 'Korrektur anfordern',
    }
  }
  if (lower.includes('blocker') || lower.includes('risiko')) {
    return {
      tone: 'blocker',
      title: 'Blocker-Analyse',
      meta: 'Risiko einordnen, Verantwortliche klären und nächsten Schritt ableiten.',
      primary: 'Blocker prüfen',
      secondary: 'Team fragen',
    }
  }
  return null
}

function TagroActionCard({
  tone,
  title,
  meta,
  primary,
  secondary,
  compact = false,
}: {
  tone: string
  title: string
  meta: string
  primary: string
  secondary: string
  compact?: boolean
}) {
  const Icon = tone === 'report' ? FileText : tone === 'review' ? CheckCircle : tone === 'blocker' ? Briefcase : Microphone
  return (
    <section className={`ai-action-card ${tone}${compact ? ' compact' : ''}`}>
      <span className="ai-action-icon"><Icon size={15} weight="regular" /></span>
      <span className="ai-action-copy">
        <strong>{title}</strong>
        <span>{meta}</span>
      </span>
      <span className="ai-action-buttons">
        <button type="button">{primary}</button>
        <button type="button" className="ghost">{secondary}</button>
      </span>
    </section>
  )
}

const CSS = `
  .ai-shell {
    height: 100%;
    max-height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(258px, 286px) minmax(0, 1fr);
    overflow: hidden;
    background:
      radial-gradient(circle at 74% 18%, color-mix(in srgb, var(--accent) 5%, transparent), transparent 30%),
      linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, #fff 4%), var(--surface));
    color: var(--text);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .ai-shell.rail-collapsed { grid-template-columns: 0 minmax(0, 1fr); }
  .ai-shell.rail-collapsed .ai-rail { transform: translateX(-100%); pointer-events: none; opacity: 0; }
  .ai-loading {
    height: 100%;
    display: grid;
    place-items: center;
    color: var(--text-muted);
    overflow: hidden;
  }

  /* Rail */
  .ai-rail {
    height: 100%;
    min-height: 0;
    border-right: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
    display: flex;
    flex-direction: column;
    transition: transform .2s ease, opacity .2s ease;
    overflow: hidden;
    background: color-mix(in srgb, var(--sidebar-bg) 72%, transparent);
  }
  .ai-rail-top {
    display: flex; align-items: center; gap: 6px;
    flex-shrink: 0;
    min-height: 58px;
    padding: 11px 12px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }
  .ai-new {
    flex: 1;
    display: inline-flex; align-items: center; gap: 8px;
    height: 36px; padding: 0 14px;
    border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
    background: color-mix(in srgb, var(--card) 88%, #fff 12%);
    color: var(--text);
    border-radius: 999px;
    font: inherit; font-size: 12.5px; font-weight: 620; letter-spacing: .01em;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(15,23,42,.05);
    transition: background .12s, border-color .12s, transform .12s;
  }
  .ai-new:hover {
    background: #fff;
    border-color: color-mix(in srgb, var(--border-strong) 55%, var(--border));
    transform: translateY(-1px);
  }
  .ai-rail-collapse {
    width: 32px; height: 34px; border: 0; background: transparent;
    color: var(--text-muted); border-radius: 8px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .ai-rail-collapse:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); color: var(--text); }

  .ai-rail-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 10px 8px 16px;
  }
  .ai-rail-scroll::-webkit-scrollbar { width: 4px; }
  .ai-rail-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  .ai-rail-empty {
    margin: 18px 10px 0;
    padding: 14px;
    border-radius: 16px;
    background: color-mix(in srgb, var(--surface-2) 48%, transparent);
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 600; line-height: 1.55; letter-spacing: .01em;
  }

  .ai-group { padding-top: 13px; }
  .ai-group-label {
    margin: 0 9px 6px;
    font-size: 10px; font-weight: 720; letter-spacing: .13em;
    text-transform: uppercase; color: var(--text-muted);
  }
  .ai-group-list { display: flex; flex-direction: column; gap: 2px; }
  .ai-row {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 24px;
    align-items: center;
    border-radius: 10px;
    transition: background .12s, color .12s;
  }
  .ai-row:hover { background: color-mix(in srgb, var(--surface-2) 55%, transparent); }
  .ai-row.active {
    background: color-mix(in srgb, var(--surface-2) 88%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border) 42%, transparent);
  }
  .ai-row-pick {
    width: 100%; border: 0; background: transparent;
    color: var(--text); font: inherit; text-align: left;
    padding: 8px 4px 8px 11px;
    cursor: pointer;
    min-width: 0;
  }
  .ai-row-title {
    display: block;
    font-size: 12.5px; font-weight: 560; letter-spacing: .01em;
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
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, #fff 4%) 0%, var(--surface) 45%),
      var(--surface);
  }
  .ai-main-head {
    display: flex; justify-content: space-between; align-items: center;
    flex-shrink: 0;
    height: 58px;
    padding: 0 22px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }
  .ai-main-head-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .ai-head-mark {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--card) 86%, #fff 14%);
    border: 1px solid color-mix(in srgb, var(--border) 66%, transparent);
    box-shadow: 0 8px 26px -20px rgba(15,23,42,.32);
  }
  .ai-head-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .ai-main-head h1 {
    margin: 0; font-size: 14px; font-weight: 680; letter-spacing: -.01em;
    color: var(--text);
    max-width: 60ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ai-head-title span {
    color: var(--text-muted);
    font-size: 10.8px;
    font-weight: 560;
    letter-spacing: .012em;
  }
  .ai-main-head-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    min-width: 0;
  }
  .ai-main-time {
    font-size: 11.5px; color: var(--text-muted);
    font-weight: 560; letter-spacing: .01em;
    white-space: nowrap;
  }
  .ai-context-wrap { position: relative; flex-shrink: 0; }
  .ai-context-button {
    height: 32px;
    max-width: 260px;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--card) 86%, #fff 14%);
    color: var(--text-secondary);
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 11px;
    font: inherit;
    font-size: 11.5px;
    font-weight: 640;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(15,23,42,.04);
  }
  .ai-context-button span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ai-context-button:hover { color: var(--text); background: #fff; }
  .ai-context-backdrop {
    position: fixed;
    inset: 0;
    z-index: 19;
    border: 0;
    background: transparent;
  }
  .ai-context-menu {
    position: absolute;
    top: 38px;
    right: 0;
    z-index: 20;
    width: 240px;
    max-height: 310px;
    overflow-y: auto;
    padding: 6px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
    background: var(--surface);
    box-shadow: 0 20px 46px -28px rgba(15,23,42,.34);
  }
  .ai-context-menu button {
    width: 100%;
    min-height: 32px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 9px;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }
  .ai-context-menu button:hover,
  .ai-context-menu button.on {
    background: color-mix(in srgb, var(--surface-2) 62%, transparent);
    color: var(--text);
  }

  .ai-feed {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 28px 0 16px;
  }
  .ai-feed::-webkit-scrollbar { width: 8px; }
  .ai-feed::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--border) 74%, transparent); border-radius: 999px; }
  .ai-loading-inline { padding: 40px; color: var(--text-muted); font-size: 13px; text-align: center; }

  .ai-empty {
    width: min(760px, calc(100% - 48px));
    min-height: 100%;
    margin: 0 auto;
    padding: 30px 0 26px;
    text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
  }
  .ai-empty-mark {
    width: 76px; height: 76px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background:
      radial-gradient(circle at 50% 42%, #fff 0%, color-mix(in srgb, var(--card) 92%, #fff 8%) 70%);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    box-shadow: 0 18px 44px -28px color-mix(in srgb, var(--text) 32%, transparent);
    position: relative;
  }
  .ai-empty-mark::after {
    content: '';
    position: absolute;
    inset: -7px;
    border-radius: inherit;
    border: 1px solid color-mix(in srgb, var(--border) 42%, transparent);
    opacity: .72;
    animation: aiBreath 3.4s ease-in-out infinite;
  }
  .ai-empty h2 {
    margin: 10px 0 0; font-size: clamp(28px, 3vw, 40px); font-weight: 740; letter-spacing: -.045em;
    color: var(--text);
  }
  .ai-empty p {
    margin: 0; font-size: 14.5px; line-height: 1.65;
    color: var(--text-muted); font-weight: 600; letter-spacing: .005em;
    max-width: 560px;
  }
  .ai-starters {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px; width: min(100%, 650px); margin-top: 10px;
  }
  .ai-starter {
    display: inline-flex; align-items: center; gap: 8px;
    min-height: 70px;
    padding: 15px 17px; text-align: left;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.72);
    color: var(--text-secondary);
    border-radius: 18px;
    font: inherit; font-size: 13.5px; font-weight: 650; letter-spacing: .005em;
    cursor: pointer;
    box-shadow: 0 10px 30px -28px rgba(15,23,42,.22);
    transition: border-color .12s, background .12s, color .12s, transform .15s, box-shadow .15s;
  }
  .ai-starter:hover {
    border-color: rgba(15, 23, 42, 0.14);
    background: rgba(255, 255, 255, 0.92);
    color: var(--text);
    transform: translateY(-1px);
    box-shadow: 0 16px 34px -30px rgba(15,23,42,.30);
  }
  .ai-starter svg { color: var(--text-muted); flex-shrink: 0; }
  .ai-action-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    width: min(100%, 740px);
    margin-top: 4px;
  }
  @media (max-width: 640px) { .ai-starters { grid-template-columns: 1fr; } }

  .ai-thread {
    max-width: 840px; margin: 0 auto;
    padding: 0 24px 18px;
    display: flex; flex-direction: column; gap: 22px;
  }
  .ai-msg {
    display: flex; gap: 12px;
    animation: aiMsgIn .25s cubic-bezier(.16,1,.3,1) both;
  }
  .ai-msg.user { justify-content: flex-end; }
  .ai-msg-avatar {
    width: 32px; height: 32px; flex-shrink: 0;
    border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--card);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    margin-top: 2px;
  }
  .ai-msg-body { min-width: 0; max-width: 100%; }
  .ai-msg.user .ai-msg-body {
    max-width: min(680px, 82%);
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    padding: 12px 15px;
    border-radius: 18px;
    border-top-right-radius: 7px;
    box-shadow: 0 12px 32px -30px rgba(15,23,42,.25);
  }
  .ai-msg.assistant .ai-msg-body {
    flex: 1; min-width: 0;
    padding-top: 4px;
    font-size: 14.2px; line-height: 1.72; color: var(--text); font-weight: 540;
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
  .ai-context-pill {
    width: max-content;
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 9px;
    margin: 0 0 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-2) 62%, transparent);
    color: var(--text-muted);
    font-size: 10.8px;
    font-weight: 680;
    letter-spacing: .02em;
  }
  .ai-action-card {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 10px 12px;
    padding: 13px;
    border: 1px solid rgba(15,23,42,.08);
    border-radius: 18px;
    background: rgba(255,255,255,.76);
    box-shadow: 0 14px 42px -38px rgba(15,23,42,.28);
    text-align: left;
  }
  .ai-action-card.compact {
    grid-template-columns: 28px minmax(0, 1fr);
    padding: 12px;
    margin-top: 0;
  }
  .ai-action-icon {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #475569;
    background: rgba(148,163,184,.16);
    border: 1px solid rgba(148,163,184,.22);
  }
  .ai-action-card.compact .ai-action-icon {
    width: 28px;
    height: 28px;
    border-radius: 10px;
  }
  .ai-action-copy {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .ai-action-copy strong {
    color: var(--text);
    font-size: 12.8px;
    font-weight: 720;
    letter-spacing: -.01em;
  }
  .ai-action-copy span {
    color: var(--text-muted);
    font-size: 11.8px;
    font-weight: 570;
    line-height: 1.45;
  }
  .ai-action-buttons {
    grid-column: 2;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 2px;
  }
  .ai-action-buttons button {
    height: 29px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    background: rgba(148, 163, 184, 0.18);
    color: #475569;
    padding: 0 11px;
    font: inherit;
    font-size: 11.6px;
    font-weight: 680;
    cursor: pointer;
  }
  .ai-action-buttons button:hover { background: rgba(148, 163, 184, 0.28); }
  .ai-action-buttons button.ghost {
    background: transparent;
    color: var(--text-muted);
  }
  @keyframes aiDot { 0%,80%,100% { transform: translateY(0); opacity: .35 } 40% { transform: translateY(-3px); opacity: .9 } }
  @keyframes aiMsgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @keyframes aiFade { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: none; } }
  @keyframes aiBreath { 0%,100% { transform: scale(.96); opacity:.42; } 50% { transform: scale(1.08); opacity:.82; } }

  .ai-composer-wrap {
    flex-shrink: 0;
    padding: 16px 24px 18px;
    background: linear-gradient(
      to top,
      color-mix(in srgb, var(--surface) 98%, #fff 2%) 72%,
      color-mix(in srgb, var(--surface) 0%, transparent)
    );
  }
  .ai-composer {
    max-width: 800px; width: 100%; margin: 0 auto;
    display: flex; gap: 10px; align-items: flex-end;
    min-height: 58px;
    padding: 10px 11px 10px 17px;
    border-radius: 22px;
    border: 1px solid rgba(15, 23, 42, 0.10);
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
    transition: border-color .12s, box-shadow .12s, background .12s;
  }
  .ai-composer:focus-within {
    border-color: rgba(100,116,139,.30);
    background: rgba(255,255,255,.96);
    box-shadow: 0 16px 44px rgba(15, 23, 42, 0.10), 0 0 0 3px rgba(148,163,184,.10);
  }
  .ai-input {
    flex: 1; min-width: 0;
    background: transparent; border: 0; outline: 0; resize: none;
    color: var(--text); font: inherit;
    font-size: 14.5px; line-height: 1.55; font-weight: 560; letter-spacing: .005em;
    max-height: 172px;
    overflow-y: auto;
    padding: 6px 0;
  }
  .ai-input::placeholder { color: var(--text-muted); opacity: .6; }
  .ai-send {
    width: 36px; height: 36px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.18);
    color: #475569;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background .12s, color .12s, opacity .12s, transform .12s;
    flex-shrink: 0;
  }
  .ai-send:hover:not(:disabled) { background: rgba(148, 163, 184, 0.28); color: #334155; }
  .ai-send:active:not(:disabled) { transform: scale(.95); }
  .ai-send:disabled { opacity: .4; cursor: not-allowed; }
  .ai-foot {
    max-width: 800px; margin: 8px auto 0; text-align: center;
    font-size: 11px; color: var(--text-muted);
    font-weight: 560; letter-spacing: .01em;
  }

  @media (max-width: 820px) {
    .ai-shell { grid-template-columns: 56px minmax(0, 1fr); }
    .ai-rail-top .ai-new span { display: none; }
    .ai-row-title { font-size: 12px; }
    .ai-rail-scroll { padding-left: 4px; padding-right: 4px; }
    .ai-head-title span,
    .ai-main-time { display: none; }
    .ai-action-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .ai-shell { grid-template-columns: 0 minmax(0, 1fr); }
    .ai-shell .ai-rail { transform: translateX(-100%); }
    .ai-main-head { padding: 0 14px; }
    .ai-context-button { max-width: 160px; }
    .ai-empty {
      width: min(100% - 28px, 520px);
      justify-content: flex-start;
      padding-top: 46px;
    }
    .ai-starters { grid-template-columns: 1fr; }
    .ai-thread { padding-left: 14px; padding-right: 14px; }
    .ai-composer-wrap { padding: 12px 12px calc(14px + env(safe-area-inset-bottom)); }
    .ai-action-card { grid-template-columns: 30px minmax(0, 1fr); }
    .ai-action-buttons { grid-column: 1 / -1; }
  }

  /* ─── 2026-05-23 dark-fix + mode-switcher ──────────────────
   * Override the white-heavy defaults further up. All surfaces
   * resolved through tokens so light/dark/read all behave. */

  /* Rail filter pills */
  .ai-rail-filters {
    display: flex; flex-wrap: wrap; gap: 4px;
    padding: 8px 10px 4px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
  }
  .ai-rail-filter {
    height: 24px; padding: 0 9px;
    border: 0; border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    font: inherit; font-size: 11px; font-weight: 560; letter-spacing: .015em;
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .ai-rail-filter:hover { color: var(--text); }
  .ai-rail-filter.on {
    background: color-mix(in srgb, var(--surface-2) 80%, transparent);
    color: var(--text);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border) 40%, transparent);
  }

  /* Conversation row mode + status badges */
  .ai-row-meta { display: flex; gap: 4px; padding: 2px 0 4px; flex-wrap: wrap; }
  .ai-row-badge {
    display: inline-flex; align-items: center;
    height: 16px; padding: 0 6px;
    border-radius: 999px;
    font-size: 9.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
  }
  .ai-row-badge.mode-tagro     { background: color-mix(in srgb, var(--btn-prim) 14%, transparent); color: var(--btn-prim); }
  .ai-row-badge.mode-developer { background: color-mix(in srgb, #22a06b 14%, transparent); color: #22a06b; }
  .ai-row-badge.mode-owner     { background: color-mix(in srgb, #6c8cff 14%, transparent); color: #6c8cff; }
  .ai-row-badge.mode-support   { background: color-mix(in srgb, #d4882b 14%, transparent); color: #d4882b; }
  .ai-row-badge.muted          { background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text-muted); }

  /* Top mode switcher — segmented control */
  .ai-mode-switch {
    display: inline-flex; align-items: center;
    gap: 2px; padding: 3px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-2) 60%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }
  .ai-mode-segment {
    height: 26px; padding: 0 12px;
    border: 0; border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    font: inherit; font-size: 11.5px; font-weight: 600; letter-spacing: .015em;
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .ai-mode-segment:hover { color: var(--text); }
  .ai-mode-segment.on {
    background: var(--card);
    color: var(--text);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--text) 6%, transparent);
  }
  .ai-mode-segment:disabled { cursor: default; }

  /* End-chat button */
  .ai-end-chat {
    height: 28px; padding: 0 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    background: transparent;
    color: var(--text-muted);
    font: inherit; font-size: 11.5px; font-weight: 580; letter-spacing: .015em;
    cursor: pointer; transition: background .12s, color .12s, border-color .12s;
    white-space: nowrap;
  }
  .ai-end-chat:hover:not(:disabled) {
    color: var(--text);
    background: color-mix(in srgb, var(--surface-2) 55%, transparent);
  }
  .ai-end-chat:disabled { opacity: .55; cursor: default; }

  /* Toast (Inbox handoff) */
  .ai-toast {
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
    z-index: 14000;
    display: inline-flex; align-items: center; gap: 7px;
    height: 36px; padding: 0 16px;
    background: var(--card);
    color: var(--text);
    border: 1px solid color-mix(in srgb, var(--btn-prim) 30%, var(--border));
    border-radius: 999px;
    font-size: 12.5px; font-weight: 560; letter-spacing: .015em;
    box-shadow: 0 18px 48px -20px rgba(0,0,0,.4);
    animation: aiToastIn .25s cubic-bezier(.16,1,.3,1) both;
  }
  .ai-toast svg { color: #22a06b; }
  @keyframes aiToastIn { from { opacity:0; transform:translate(-50%, 8px); } to { opacity:1; transform:translate(-50%,0); } }

  /* Ended-conversation banner replaces composer */
  .ai-ended-banner {
    max-width: 800px; margin: 0 auto;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px;
    border-radius: 14px;
    background: color-mix(in srgb, #22a06b 8%, transparent);
    border: 1px solid color-mix(in srgb, #22a06b 24%, transparent);
    color: var(--text); font-size: 12.5px; font-weight: 560; letter-spacing: .015em;
  }
  .ai-ended-banner svg { color: #22a06b; flex-shrink: 0; }
  .ai-ended-banner span { flex: 1; }
  .ai-ended-banner button {
    height: 28px; padding: 0 12px;
    border: 0; border-radius: 999px;
    background: var(--btn-prim); color: var(--btn-prim-text);
    font: inherit; font-size: 11.5px; font-weight: 600; letter-spacing: .015em;
    cursor: pointer;
  }
  .ai-ended-banner button:hover { opacity: .92; }

  /* Empty CTA */
  .ai-empty.narrow { max-width: 480px; }
  .ai-empty-cta {
    display: inline-flex; align-items: center; gap: 7px;
    height: 36px; padding: 0 16px; margin-top: 8px;
    border: 0; border-radius: 999px;
    background: var(--btn-prim); color: var(--btn-prim-text);
    font: inherit; font-size: 12.5px; font-weight: 600; letter-spacing: .015em;
    cursor: pointer; transition: opacity .12s;
  }
  .ai-empty-cta:hover { opacity: .92; }

  /* ============ DARK FIX ============
   * Replace the white-heavy bubbles, starters, action cards and composer
   * with token-driven surfaces. The earlier rules pinned literal white
   * which broke dark mode. */
  .ai-shell {
    background:
      radial-gradient(circle at 74% 18%, color-mix(in srgb, var(--btn-prim) 6%, transparent), transparent 30%),
      var(--bg);
  }
  .ai-main { background: var(--bg); }
  .ai-rail { background: color-mix(in srgb, var(--surface) 50%, transparent); }

  .ai-new {
    background: var(--card);
    border-color: color-mix(in srgb, var(--border) 70%, transparent);
    box-shadow: none;
  }
  .ai-new:hover {
    background: color-mix(in srgb, var(--surface-2) 70%, var(--card));
  }

  .ai-head-mark {
    background: color-mix(in srgb, var(--surface-2) 65%, transparent);
    border-color: color-mix(in srgb, var(--border) 60%, transparent);
    box-shadow: none;
  }

  .ai-context-button {
    background: color-mix(in srgb, var(--surface-2) 50%, transparent);
    border-color: color-mix(in srgb, var(--border) 70%, transparent);
    box-shadow: none;
  }
  .ai-context-button:hover {
    background: color-mix(in srgb, var(--surface-2) 80%, transparent);
    color: var(--text);
  }

  .ai-empty h2 {
    font-size: clamp(22px, 2.4vw, 30px);
    font-weight: 600;
    letter-spacing: -.018em;
  }
  .ai-empty p { font-size: 13.5px; font-weight: 540; }
  .ai-empty-mark {
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
    box-shadow: none;
    color: var(--text-secondary);
  }
  .ai-empty-mark::after { border-color: color-mix(in srgb, var(--btn-prim) 22%, transparent); }

  .ai-starter {
    background: color-mix(in srgb, var(--surface-2) 50%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    color: var(--text-secondary);
    box-shadow: none;
    border-radius: 14px;
    min-height: 58px;
    padding: 12px 14px;
    font-size: 13px;
  }
  .ai-starter:hover {
    background: color-mix(in srgb, var(--surface-2) 80%, transparent);
    border-color: var(--border);
    color: var(--text);
    box-shadow: none;
  }

  .ai-action-card {
    background: color-mix(in srgb, var(--surface-2) 45%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    box-shadow: none;
  }
  .ai-action-icon {
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
    border-color: color-mix(in srgb, var(--border) 60%, transparent);
    color: var(--text-secondary);
  }
  .ai-action-buttons button {
    background: var(--btn-prim);
    color: var(--btn-prim-text);
    border-color: transparent;
  }
  .ai-action-buttons button:hover { opacity: .92; }
  .ai-action-buttons button.ghost {
    background: transparent;
    color: var(--text-muted);
    border-color: color-mix(in srgb, var(--border) 65%, transparent);
  }

  .ai-msg.user .ai-msg-body {
    background: color-mix(in srgb, var(--surface-2) 75%, transparent);
    border-color: color-mix(in srgb, var(--border) 55%, transparent);
    box-shadow: none;
  }

  .ai-composer {
    background: color-mix(in srgb, var(--surface) 70%, var(--card));
    border-color: color-mix(in srgb, var(--border) 60%, transparent);
    box-shadow: none;
  }
  .ai-composer:focus-within {
    background: color-mix(in srgb, var(--surface) 90%, var(--card));
    border-color: color-mix(in srgb, var(--btn-prim) 45%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--btn-prim) 12%, transparent);
  }
  .ai-composer-wrap {
    background: linear-gradient(to top,
      color-mix(in srgb, var(--bg) 98%, transparent) 70%,
      transparent);
  }
  .ai-send {
    background: var(--btn-prim);
    color: var(--btn-prim-text);
    border-color: transparent;
  }
  .ai-send:hover:not(:disabled) {
    background: var(--btn-prim);
    color: var(--btn-prim-text);
    opacity: .92;
  }

  @media (max-width: 980px) {
    .ai-mode-switch { display: none; }
  }

  /* ─── 2026-05-23 medium-weight pass + composer calm + collapse fix ───
   * Festag design rule: Aeonik Medium (500) durchgehend, kein Bold.
   * Letter-spacing leicht negativ für Headlines, +1.5% für Body.
   * Override all earlier weights with a single floor. */
  .ai-shell, .ai-shell * { font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif); }

  .ai-empty h2 {
    font-size: clamp(20px, 1.8vw, 26px);
    font-weight: 500;
    letter-spacing: -.014em;
    color: var(--text);
  }
  .ai-empty p {
    font-size: 13px; font-weight: 500; letter-spacing: .012em;
    color: var(--text-muted);
    max-width: 480px;
  }
  .ai-main-head h1 { font-weight: 500; letter-spacing: -.005em; }
  .ai-head-title span { font-weight: 500; letter-spacing: .012em; }
  .ai-new { font-weight: 500; letter-spacing: .012em; }
  .ai-context-button { font-weight: 500; letter-spacing: .012em; }
  .ai-rail-empty { font-weight: 500; letter-spacing: .012em; }
  .ai-group-label { font-weight: 500; letter-spacing: .12em; }
  .ai-row-title { font-weight: 500; letter-spacing: .012em; }
  .ai-rail-filter { font-weight: 500; letter-spacing: .012em; }
  .ai-mode-segment { font-weight: 500; letter-spacing: .012em; }
  .ai-end-chat { font-weight: 500; letter-spacing: .012em; }
  .ai-starter { font-weight: 500; letter-spacing: .012em; font-size: 13px; }
  .ai-action-copy strong { font-weight: 500; letter-spacing: -.005em; }
  .ai-action-copy span { font-weight: 500; letter-spacing: .012em; }
  .ai-action-buttons button { font-weight: 500; letter-spacing: .012em; }
  .ai-input { font-weight: 500; letter-spacing: .012em; font-size: 14px; }
  .ai-msg.assistant .ai-msg-body { font-weight: 500; }
  .ai-user-text { font-weight: 500; letter-spacing: .012em; }
  .ai-foot { font-weight: 500; letter-spacing: .012em; }
  .ai-context-pill { font-weight: 500; letter-spacing: .04em; }
  .ai-row-badge { font-weight: 500; letter-spacing: .08em; }
  .ai-toast { font-weight: 500; letter-spacing: .012em; }
  .ai-ended-banner { font-weight: 500; letter-spacing: .012em; }
  .ai-ended-banner button { font-weight: 500; letter-spacing: .012em; }
  .ai-empty-cta { font-weight: 500; letter-spacing: .012em; }

  /* Calmer empty mark — no breathing aura, just a tiny mark */
  .ai-empty-mark { width: 56px; height: 56px; }
  .ai-empty-mark::after { display: none; }

  /* Starter cards — less boxy, more like a calm pill */
  .ai-starter {
    min-height: 0;
    padding: 11px 14px;
    border-radius: 12px;
  }
  .ai-starter:hover { transform: none; }
  .ai-action-card { border-radius: 14px; padding: 12px; }
  .ai-action-card.compact { border-radius: 14px; }

  /* Composer — flat, dense, modern. No drop-shadow, no border glow. */
  .ai-composer {
    min-height: 52px;
    padding: 8px 8px 8px 16px;
    border-radius: 16px;
    background: color-mix(in srgb, var(--surface-2) 35%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
    box-shadow: none;
    transition: border-color .15s, background .15s;
  }
  .ai-composer:focus-within {
    background: color-mix(in srgb, var(--surface-2) 55%, transparent);
    border-color: color-mix(in srgb, var(--text) 24%, var(--border));
    box-shadow: none;
  }
  .ai-input {
    padding: 8px 4px;
    line-height: 1.55;
  }
  .ai-send {
    width: 32px; height: 32px;
    border-radius: 10px;
  }
  .ai-foot {
    margin-top: 9px;
    font-size: 11px;
    opacity: .75;
  }

  /* Floating expand handle for collapsed rail */
  .ai-rail-expand {
    position: fixed;
    top: 76px;
    left: 8px;
    z-index: 30;
    width: 30px; height: 30px;
    border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
    background: var(--card);
    color: var(--text-muted);
    border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: color .12s, background .12s, transform .12s;
    box-shadow: 0 8px 24px -16px color-mix(in srgb, var(--text) 28%, transparent);
  }
  .ai-rail-expand:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--surface-2) 80%, var(--card));
    transform: translateX(2px);
  }
`
