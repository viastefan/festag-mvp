'use client'

/**
 * /notes — Festag Notes Workspace (v2)
 *
 * Linear/Notion-flavoured, but with Festag chrome: same shell as /tasks
 * (soft text #4E5567, 14.5px title, sticky top, pill filters, no white
 * buttons in dark). Three panes:
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │ Notizen        [Quick capture]   [Neue Notiz +]        │
 *   ├──────────────┬──────────────────┬────────────────────── │
 *   │  RAIL        │  LIST            │  EDITOR              │
 *   │  Smart lists │  Compact rows    │  Title + body        │
 *   │  Projects    │  Pin/Project dot │  Tagro panel         │
 *   │  Note types  │  "Neu" badge     │  Share / Spawn       │
 *   │  Tags cloud  │                  │  Backlinks           │
 *   └──────────────┴──────────────────┴────────────────────── │
 *
 * Value loops baked in:
 *   • "Heute" Daily-Note — one-per-day, auto-pinned, idempotent backend.
 *   • Pin/Unpin — pinned notes sort to top per smart list.
 *   • Note types (journal/brief/meeting/research) shape Tagro behaviour.
 *   • [[Backlink]] syntax — typing `[[X` shows a typeahead, saves to
 *     notes_mentions, surfaces as "Erwähnt von" in the editor footer.
 *   • Tagro panel → propose tasks → spawn into real tasks linked back.
 *   • Apply Tagro's suggested tags onto the note with one click.
 *   • Realtime: shared notes update live when collaborators edit.
 *   • Quick capture (⌘⇧N) drops anywhere into a new note + auto-opens.
 *
 * Mobile: rail collapses behind a button, list takes full width, opening
 * a note slides the editor in over both. Inherits the .task-os pattern.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive, ArrowsClockwise, Check, CheckCircle, FunnelSimple, MagnifyingGlass,
  Plus, PushPin, Share, Sparkle, Tag, X, ArrowSquareOut, Notepad, Cards, Microphone, Books,
  ArrowsOut, ArrowsIn, CaretLeft, CaretRight, PencilSimple, WaveSine, Scales,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import NewNoteModal from '@/components/NewNoteModal'
import EmptyState from '@/components/EmptyState'
import HelpHint from '@/components/HelpHint'
import TagroEntryButton from '@/components/TagroEntryButton'
import MobilePageHeader from '@/components/MobilePageHeader'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import { MOBILE_CODEX_LIST_CSS } from '@/components/mobile/mobile-codex-list-styles'
import { openTagro } from '@/components/TagroOverlay'

type NoteType = 'journal' | 'brief' | 'meeting' | 'research'

type Note = {
  id: string
  user_id: string
  project_id: string | null
  title: string
  body: string | null
  tags: string[]
  status: 'active' | 'archived'
  shared_with: string[]
  tagro_suggestions: TagroSuggestions
  tagro_last_run_at: string | null
  pinned: boolean
  pinned_at: string | null
  note_type: NoteType
  is_daily: boolean
  daily_date: string | null
  created_at: string
  updated_at: string
}

type TagroSuggestions = {
  summary?: string
  themes?: string[]
  tasks?: Array<{ title: string; why?: string; priority?: 'high'|'medium'|'low'; estimated_hours?: number }>
  decisions?: Array<{ title: string; reason?: string; options?: string[] }>
  followups?: string[]
  risks?: string[]
  tags?: string[]
}

type SpawnedTask = {
  task_id: string
  suggestion_idx: number | null
  spawned_at: string
  task: { id: string; title: string; status: string; priority?: string | null } | null
}

type SpawnedDecision = {
  decision_id: string
  suggestion_idx: number
  spawned_at: string
  title: string
}

type ProjectLite = { id: string; title: string; color?: string | null }

type SmartList = 'today' | 'all' | 'pinned' | 'shared' | 'archived'

const SMART_LISTS: { id: SmartList; label: string; icon: any }[] = [
  { id: 'today',    label: 'Heute',      icon: Notepad },
  { id: 'all',      label: 'Alle',       icon: Cards },
  { id: 'pinned',   label: 'Angeheftet', icon: PushPin },
  { id: 'shared',   label: 'Geteilt',    icon: Share },
  { id: 'archived', label: 'Archiv',     icon: Archive },
]

const NOTE_TYPES: { id: NoteType; label: string; icon: any; hint: string }[] = [
  { id: 'journal',  label: 'Journal',  icon: Notepad,    hint: 'Lose Gedanken — Tagro sammelt Themen' },
  { id: 'brief',    label: 'Brief',    icon: Cards,      hint: 'Auftrag oder Spec — Tagro spawnt Tasks' },
  { id: 'meeting',  label: 'Meeting',  icon: Microphone, hint: 'Protokoll — Tagro zieht Folgepunkte' },
  { id: 'research', label: 'Research', icon: Books,      hint: 'Recherche — Tagro destilliert Risiken' },
]

function formatTimeAgo(iso: string) {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d} Tag${d === 1 ? '' : 'en'}`
  const w = Math.floor(d / 7)
  if (w < 5) return `vor ${w} Wo`
  return new Date(iso).toLocaleDateString('de-DE')
}

export default function NotesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<string>('')
  const [projects, setProjects] = useState<ProjectLite[]>([])

  // Filters
  const [smartList, setSmartList] = useState<SmartList>('all')
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<NoteType | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // Selection
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [editorWide, setEditorWide] = useState(false)
  const [railOpen, setRailOpen] = useState(true)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  /* ── Initial loads ───────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  useEffect(() => {
    ;(async () => {
      const { data } = await (supabase as any)
        .from('projects').select('id,title,color').order('updated_at', { ascending: false }).limit(40)
      setProjects(data ?? [])
    })()
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = smartList === 'archived' ? '?archived=1' : ''
      const res = await fetch(`/api/notes${params}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setNotes(data.notes ?? [])
    } finally {
      setLoading(false)
    }
  }, [smartList])

  useEffect(() => { load() }, [load])

  /* ── Realtime: shared notes ──────────────────────────────── */
  useEffect(() => {
    if (!me) return
    const channel = (supabase as any)
      .channel(`notes-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload: any) => {
        if (payload.eventType === 'UPDATE') {
          setNotes(cur => cur.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n))
        } else if (payload.eventType === 'INSERT') {
          setNotes(cur => cur.some(n => n.id === payload.new.id) ? cur : [payload.new, ...cur])
        } else if (payload.eventType === 'DELETE') {
          setNotes(cur => cur.filter(n => n.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => { (supabase as any).removeChannel(channel) }
  }, [supabase, me])

  /* ── Global ⌘⇧N quick capture → opens the modal composer ──── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault(); setComposerOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  /* ── Derived list ────────────────────────────────────────── */
  const visible = useMemo(() => {
    let xs = notes
    if (smartList === 'pinned')   xs = xs.filter(n => n.pinned && n.status !== 'archived')
    else if (smartList === 'shared') xs = xs.filter(n => Array.isArray(n.shared_with) && n.shared_with.length > 0)
    else if (smartList === 'archived') xs = xs.filter(n => n.status === 'archived')
    else if (smartList === 'today') {
      const todayISO = new Date().toISOString().slice(0, 10)
      xs = xs.filter(n => n.is_daily && n.daily_date === todayISO)
    } else {
      xs = xs.filter(n => n.status !== 'archived')
    }

    if (projectFilter) xs = xs.filter(n => n.project_id === projectFilter)
    if (typeFilter)    xs = xs.filter(n => n.note_type === typeFilter)
    if (tagFilter)     xs = xs.filter(n => Array.isArray(n.tags) && n.tags.includes(tagFilter))
    if (query.trim()) {
      const q = query.toLowerCase()
      xs = xs.filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.body || '').toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    // pinned-first, then updated_at desc
    return [...xs].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [notes, smartList, projectFilter, typeFilter, tagFilter, query])

  const tagsCloud = useMemo(() => {
    const m = new Map<string, number>()
    notes.forEach(n => (n.tags || []).forEach(t => m.set(t, (m.get(t) || 0) + 1)))
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 24)
  }, [notes])

  const projectsWithCounts = useMemo(() => {
    const m = new Map<string, number>()
    notes.forEach(n => { if (n.project_id) m.set(n.project_id, (m.get(n.project_id) || 0) + 1) })
    return projects.map(p => ({ ...p, count: m.get(p.id) || 0 }))
      .filter(p => p.count > 0 || projectFilter === p.id)
  }, [notes, projects, projectFilter])

  const counts = useMemo(() => {
    const active = notes.filter(n => n.status !== 'archived')
    return {
      all: active.length,
      pinned: active.filter(n => n.pinned).length,
      shared: notes.filter(n => n.shared_with?.length).length,
      archived: notes.filter(n => n.status === 'archived').length,
    }
  }, [notes])

  async function createNote(seed?: Partial<Note>) {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Neue Notiz', project_id: projectFilter, ...seed }),
      })
      if (!res.ok) return
      const data = await res.json()
      setNotes(n => [data.note, ...n])
      setOpenId(data.note.id)
    } finally {
      setCreating(false)
    }
  }

  async function openTodayNote() {
    const res = await fetch('/api/notes/today', { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    setNotes(curr => curr.some(n => n.id === data.note.id) ? curr.map(n => n.id === data.note.id ? data.note : n) : [data.note, ...curr])
    setSmartList('today')
    setOpenId(data.note.id)
  }

  function patchLocal(id: string, patch: Partial<Note>) {
    setNotes(curr => curr.map(n => n.id === id ? { ...n, ...patch } : n))
  }

  function removeLocal(id: string) {
    setNotes(curr => curr.filter(n => n.id !== id))
  }

  async function togglePin(n: Note) {
    const next = !n.pinned
    patchLocal(n.id, { pinned: next, pinned_at: next ? new Date().toISOString() : null })
    await fetch(`/api/notes/${n.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: next }),
    })
  }

  const openNote = visible.find(n => n.id === openId) || null

  const SMART_FILTERS: Array<{ id: SmartList; label: string }> = [
    { id: 'all',      label: 'Alle' },
    { id: 'today',    label: 'Heute' },
    { id: 'pinned',   label: 'Angeheftet' },
    { id: 'shared',   label: 'Geteilt' },
    { id: 'archived', label: 'Archiv' },
  ]

  const tagroNotes = () => openTagro({
    contextType: 'note',
    id: 'list',
    title: 'Notizen · Übersicht',
    subtitle: `${visible.length} sichtbar`,
  })

  return (
    <div className="notes-os mcl-page">
      <style>{MOBILE_CODEX_LIST_CSS}</style>
      <style jsx>{NOTES_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="notes-m-shell">
      {/* ── Sticky top: same chrome as /tasks + /decisions ── */}
      <div className="notes-static-top">
        <header className="mcl-head">
          <div className="mcl-head-copy">
            <h1><span className="mcl-m">Notizen</span></h1>
            <p className="mcl-page-sub"><span className="mcl-m">{visible.length} sichtbar</span></p>
          </div>
          <div className="mcl-head-actions">
            <CodexMobileActionPill
              onMenu={() => setNavOpen(true)}
              onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            />
          </div>
        </header>

        <div className="mcl-actions notes-m-actions">
          <button type="button" className="mcl-add-btn" aria-label="Neue Notiz" onClick={() => setComposerOpen(true)}>
            <Plus size={18} weight="bold" />
          </button>
          <div className="mcl-actions-group">
            <button
              type="button"
              className={`mcl-ctl${filterMenuOpen ? ' on' : ''}${smartList !== 'all' ? ' has-active' : ''}`}
              aria-label="Filter"
              aria-expanded={filterMenuOpen}
              onClick={() => setFilterMenuOpen(v => !v)}
            >
              <FunnelSimple size={17} weight="regular" />
            </button>
            <button type="button" className="mcl-ctl" aria-label="Heute öffnen" onClick={openTodayNote}>
              <Notepad size={17} weight="regular" />
            </button>
          </div>
          {filterMenuOpen && (
            <>
              <div className="mcl-filter-menu" role="menu">
                <p className="mcl-sheet-title">Ansicht</p>
                {SMART_FILTERS.map(f => {
                  const count = (counts as Record<string, number>)[f.id]
                  return (
                    <button
                      key={f.id}
                      type="button"
                      role="menuitem"
                      className={`mcl-filter-item${smartList === f.id ? ' on' : ''}`}
                      onClick={() => {
                        setSmartList(f.id)
                        setProjectFilter(null)
                        setTypeFilter(null)
                        setTagFilter(null)
                        setFilterMenuOpen(false)
                      }}
                    >
                      {f.label}{typeof count === 'number' && count > 0 && f.id !== 'all' ? ` (${count})` : ''}
                    </button>
                  )
                })}
              </div>
              <button type="button" className="mcl-sheet-backdrop" aria-label="Schließen" onClick={() => setFilterMenuOpen(false)} />
            </>
          )}
        </div>

        <div className="notes-legacy-mph">
        <MobilePageHeader
          title="Notizen"
          primaryIcon={Notepad}
          primaryLabel="Neue Notiz"
          onPrimary={() => setComposerOpen(true)}
          menuItems={[
            { id: 'today', label: 'Heute öffnen', onClick: openTodayNote },
          ]}
        />
        </div>
        <div className="notes-top">
          <div className="notes-top-left">
            <span style={{ display:'inline-flex', alignItems:'center', gap:7, minWidth:0 }}>
              <h1 className="notes-title">Notizen</h1>
              <HelpHint title="Notizen" description="Halte Gedanken fest — Tagro findet daraus Themen, Tasks und Risiken. ⌘⇧N legt überall eine neue Notiz an." />
            </span>
            <span className="notes-count-pill">
              {loading ? '…' : `${visible.length} sichtbar`}
            </span>
          </div>

          <div className="notes-top-right">
            <button
              className="notes-ghost"
              type="button"
              onClick={openTodayNote}
              title="Daily Note öffnen"
            >
              <Notepad size={11} weight="regular" />
              Heute
            </button>
            <button className="notes-create" type="button" disabled={creating} onClick={() => setComposerOpen(true)}>
              <span>Neue Notiz</span>
              <span className="notes-create-plus" aria-hidden>+</span>
            </button>
            <TagroEntryButton
              context={{
                contextType: 'note',
                id: 'list',
                title: 'Notizen · Übersicht',
                subtitle: `${visible.length} sichtbar`,
              }}
            />
          </div>
        </div>

        <nav className="notes-tabs" role="tablist">
          {SMART_FILTERS.map(f => {
            const count = (counts as any)[f.id]
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={smartList === f.id}
                className={`notes-tab${smartList === f.id ? ' on' : ''}`}
                onClick={() => {
                  setSmartList(f.id)
                  setProjectFilter(null); setTypeFilter(null); setTagFilter(null)
                }}
              >
                {f.label}
                {typeof count === 'number' && count > 0 && f.id !== 'all' && (
                  <span className="notes-tab-count">{count}</span>
                )}
              </button>
            )
          })}
          {(projectFilter || typeFilter || tagFilter) && (
            <button
              type="button"
              className="notes-tab clear"
              onClick={() => { setProjectFilter(null); setTypeFilter(null); setTagFilter(null) }}
              title="Filter zurücksetzen"
            >
              <X size={10} weight="bold" />
              {projectFilter && projects.find(p => p.id === projectFilter)?.title}
              {typeFilter && NOTE_TYPES.find(t => t.id === typeFilter)?.label}
              {tagFilter && `#${tagFilter}`}
            </button>
          )}
        </nav>
      </div>

      {/* Floating Festag search pill — unchanged. */}
      <div
        className={`notes-search-float${searchFocused || query ? ' open' : ''}`}
        onClick={() => { if (!searchFocused) searchInputRef.current?.focus() }}
      >
        <MagnifyingGlass size={13} weight="bold" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Notiz suchen…"
          aria-label="Notiz suchen"
        />
        {query && (
          <button
            type="button"
            aria-label="Suche leeren"
            onMouseDown={e => { e.preventDefault(); setQuery(''); searchInputRef.current?.focus() }}
          >
            <X size={11} weight="bold" />
          </button>
        )}
      </div>

      {/* Flat table body ────────────────────────────────────────── */}
      <div className="notes-scroll-body">
        {/* Column header only when there are rows — never floating above
            an empty state. */}
        {visible.length > 0 && (
          <div className="notes-table-head">
            <span>Titel</span>
            <span>Projekt</span>
            <span>Typ</span>
            <span>Tags</span>
            <span>Tagro</span>
            <span>Aktualisiert</span>
          </div>
        )}

        {loading && visible.length === 0 ? (
          <p className="notes-empty">Notizen werden geladen…</p>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Notepad}
            kicker="Notizen"
            title="Hier ist es ruhig"
            description="Halte einen Gedanken fest — Tagro findet daraus Themen, Tasks und Risiken. ⌘⇧N legt überall in der App eine neue Notiz an."
            actions={[
              { label: 'Erste Notiz anlegen', icon: Plus, primary: true, onClick: () => setComposerOpen(true) },
            ]}
          />
        ) : visible.map(n => {
          const project = projects.find(p => p.id === n.project_id)
          const fresh = Date.now() - new Date(n.created_at).getTime() < 1000 * 60 * 60 * 12
          const hasTagro = n.tagro_last_run_at && (n.tagro_suggestions?.tasks?.length ?? 0) > 0
          return (
            <button
              key={n.id}
              type="button"
              className={`notes-row${openId === n.id ? ' on' : ''}`}
              onClick={() => setOpenId(n.id)}
            >
              <span className="notes-row-title">
                {n.pinned && <PushPin size={10} weight="fill" className="notes-row-pin" />}
                <strong>{n.title || 'Ohne Titel'}</strong>
                {fresh && smartList !== 'archived' && <span className="notes-row-fresh">Neu</span>}
              </span>
              <span className="notes-row-proj">
                {project ? (
                  <><span className="notes-row-dot" style={{ background: project.color || 'var(--text-muted)' }} />{project.title}</>
                ) : <span className="notes-cell-mute">—</span>}
              </span>
              <span className="notes-cell-mute">{NOTE_TYPES.find(t => t.id === n.note_type)?.label || 'Journal'}</span>
              <span className="notes-row-tags">
                {(n.tags || []).length === 0
                  ? <span className="notes-cell-mute">—</span>
                  : (n.tags || []).slice(0, 2).map(t => <span key={t} className="notes-tag-chip">#{t}</span>)}
                {(n.tags || []).length > 2 && <span className="notes-cell-mute">+{n.tags.length - 2}</span>}
              </span>
              <span className="notes-row-tagro">
                {hasTagro
                  ? <><Sparkle size={10} weight="fill" /> {n.tagro_suggestions?.tasks?.length} Idee{(n.tagro_suggestions?.tasks?.length || 0) === 1 ? '' : 'n'}</>
                  : <span className="notes-cell-mute">—</span>}
              </span>
              <span className="notes-cell-mute">{formatTimeAgo(n.updated_at)}</span>
            </button>
          )
        })}
      </div>

      {/* Detail drawer overlay — right-anchored, slides in */}
      {openNote && (
        <div className="notes-overlay" role="dialog" aria-modal="true">
          <div className="notes-overlay-backdrop" onClick={() => setOpenId(null)} />
          <Editor
            key={openNote.id}
            note={openNote}
            projects={projects}
            isOwner={openNote.user_id === me}
            wide={editorWide}
            onToggleWide={() => setEditorWide(v => !v)}
            onPatch={patch => patchLocal(openNote.id, patch)}
            onArchive={() => { removeLocal(openNote.id); setOpenId(null) }}
            onClose={() => setOpenId(null)}
            onTogglePin={() => togglePin(openNote)}
          />
        </div>
      )}

      {/* Create modal — proper composer (title/body/type/project/tags)
          with three submit paths: plain, Tagro-analyse, or hand-to-AI. */}
      {composerOpen && (
        <NewNoteModal
          projects={projects}
          defaultProjectId={projectFilter}
          onClose={() => setComposerOpen(false)}
          onCreated={(noteId) => {
            // Re-fetch the row + slide the drawer in. If Tagro just ran,
            // the suggestions will be on the row already.
            setComposerOpen(false)
            ;(async () => {
              const res = await fetch(`/api/notes/${noteId}`, { credentials: 'include' })
              if (res.ok) {
                const data = await res.json()
                setNotes(curr => curr.some(n => n.id === noteId)
                  ? curr.map(n => n.id === noteId ? data.note : n)
                  : [data.note, ...curr])
              }
              setOpenId(noteId)
            })()
          }}
        />
      )}
      </div>

      <MobilePageDock
        onDragUp={() => setComposerOpen(true)}
        primary={{
          id: 'note',
          label: 'Neue Notiz erstellen...',
          icon: <WaveSine size={14} weight="regular" />,
          onClick: () => setComposerOpen(true),
          ariaLabel: 'Neue Notiz erstellen',
        }}
        secondary={{
          id: 'tagro',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: tagroNotes,
          ariaLabel: 'Mit Tagro bearbeiten',
        }}
      />
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════
 * Editor — right pane, replaces the old drawer
 * ═══════════════════════════════════════════════════════════ */

function Editor({
  note, projects, isOwner, wide,
  onToggleWide, onPatch, onArchive, onClose, onTogglePin,
}: {
  note: Note
  projects: ProjectLite[]
  isOwner: boolean
  wide: boolean
  onToggleWide: () => void
  onPatch: (p: Partial<Note>) => void
  onArchive: () => void
  onClose: () => void
  onTogglePin: () => void
}) {
  const [title, setTitle] = useState(note.title)
  const [body, setBody]   = useState(note.body || '')
  const [savedAt, setSavedAt] = useState<string>('')
  const [suggesting, setSuggesting] = useState(false)
  const [spawning, setSpawning] = useState(false)
  const [spawningDecisions, setSpawningDecisions] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
  const [selectedDecisions, setSelectedDecisions] = useState<Set<number>>(new Set())
  const [spawned, setSpawned] = useState<SpawnedTask[]>([])
  const [spawnedDecisions, setSpawnedDecisions] = useState<SpawnedDecision[]>([])
  const [backlinks, setBacklinks] = useState<Array<{id:string; title:string; updated_at:string}>>([])
  const [s, setS] = useState<TagroSuggestions>(note.tagro_suggestions || {})
  const [showTagroPanel, setShowTagroPanel] = useState<boolean>(!!note.tagro_last_run_at)
  const [linkMenu, setLinkMenu] = useState<{q: string; pos: number; results: Array<{id:string;title:string}>}|null>(null)

  const textareaRef = useRef<HTMLTextAreaElement|null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  // Reload note + spawned + backlinks on open
  useEffect(() => {
    let cancelled = false
    setTitle(note.title); setBody(note.body || ''); setS(note.tagro_suggestions || {})
    ;(async () => {
      const res = await fetch(`/api/notes/${note.id}`, { credentials: 'include' })
      if (!res.ok || cancelled) return
      const data = await res.json()
      setSpawned(data.spawned || [])
      setBacklinks(data.backlinks || [])
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id])

  // Auto-save: title (blur) + body (debounce 600ms)
  const persist = useCallback(async (patch: Partial<Note>) => {
    const res = await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const data = await res.json()
      onPatch(data.note)
      setSavedAt(new Date().toISOString())
    }
  }, [note.id, onPatch])

  function onBodyChange(v: string) {
    setBody(v)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => persist({ body: v }), 600)
    // [[autocomplete
    const cursor = textareaRef.current?.selectionStart ?? v.length
    const before = v.slice(0, cursor)
    const m = before.match(/\[\[([^\]\n]*)$/)
    if (m) {
      const q = m[1].trim()
      if (q.length >= 1) {
        fetch(`/api/notes/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
          .then(r => r.ok ? r.json() : { notes: [] })
          .then(data => setLinkMenu({ q, pos: cursor, results: data.notes || [] }))
        return
      }
    }
    setLinkMenu(null)
  }

  function pickLink(target: {id:string; title:string}) {
    if (!linkMenu) return
    const before = body.slice(0, linkMenu.pos)
    const after  = body.slice(linkMenu.pos)
    const start  = before.lastIndexOf('[[')
    const next   = before.slice(0, start) + `[[${target.title}]]` + after
    setBody(next); setLinkMenu(null)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => persist({ body: next }), 300)
  }

  async function runTagro() {
    if (suggesting) return
    setSuggesting(true)
    try {
      // Save pending body first so Tagro reads the latest.
      if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; await persist({ body }) }
      const res = await fetch(`/api/notes/${note.id}/suggest`, { method: 'POST', credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setS(data.suggestions || {})
      setShowTagroPanel(true)
      onPatch({ tagro_suggestions: data.suggestions, tagro_last_run_at: new Date().toISOString() } as Partial<Note>)
    } finally {
      setSuggesting(false)
    }
  }

  async function spawnTasks() {
    if (spawning || selectedTasks.size === 0) return
    setSpawning(true)
    try {
      const indices = Array.from(selectedTasks)
      const res = await fetch(`/api/notes/${note.id}/spawn-tasks`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indices }),
      })
      if (!res.ok) return
      const data = await res.json()
      const newSpawned: SpawnedTask[] = (data.tasks as any[]).map((t, i) => ({
        task_id: t.id, suggestion_idx: indices[i],
        spawned_at: new Date().toISOString(), task: t,
      }))
      setSpawned(curr => [...curr, ...newSpawned])
      setSelectedTasks(new Set())
    } finally {
      setSpawning(false)
    }
  }

  async function spawnDecisions() {
    if (spawningDecisions || selectedDecisions.size === 0 || !note.project_id) return
    setSpawningDecisions(true)
    try {
      const indices = Array.from(selectedDecisions)
      const created: SpawnedDecision[] = []
      for (const idx of indices) {
        const d = s.decisions?.[idx]
        if (!d?.title?.trim()) continue
        const options = (d.options ?? []).slice(0, 6).map((label, i) => ({
          id: `opt-${i + 1}`,
          label: String(label).slice(0, 200),
        }))
        const res = await fetch('/api/decisions', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: note.project_id,
            title: d.title.trim(),
            description: d.reason?.trim() || null,
            options: options.length ? options : undefined,
          }),
        })
        if (!res.ok) continue
        const data = await res.json()
        created.push({
          decision_id: data.id,
          suggestion_idx: idx,
          spawned_at: new Date().toISOString(),
          title: d.title.trim(),
        })
      }
      if (created.length) {
        setSpawnedDecisions(curr => [...curr, ...created])
        setSelectedDecisions(new Set())
      }
    } finally {
      setSpawningDecisions(false)
    }
  }

  async function applyTagroTags() {
    const incoming = (s.tags || []).filter(t => !note.tags.includes(t))
    if (!incoming.length) return
    const merged = [...note.tags, ...incoming]
    await persist({ tags: merged } as Partial<Note>)
  }

  async function archive() {
    if (!confirm('Notiz archivieren?')) return
    const res = await fetch(`/api/notes/${note.id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) onArchive()
  }

  async function changeType(t: NoteType) {
    await persist({ note_type: t } as Partial<Note>)
  }

  async function changeProject(pid: string | null) {
    await persist({ project_id: pid } as Partial<Note>)
  }

  function handToAi() {
    // Persist immediately then route to /ai with the note linked via query.
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
    persist({ body }).then(() => {
      const prefill = `Ich habe eine Notiz, schau drauf:\n\n${title}\n\n${body}`
      window.location.href = `/ai?prefill=${encodeURIComponent(prefill)}`
    })
  }

  const hasSuggestions = !!(
    s.summary
    || (s.tasks?.length ?? 0) > 0
    || (s.decisions?.length ?? 0) > 0
    || (s.themes?.length ?? 0) > 0
    || (s.followups?.length ?? 0) > 0
    || (s.risks?.length ?? 0) > 0
    || (s.tags?.length ?? 0) > 0
  )
  const currentType = NOTE_TYPES.find(t => t.id === note.note_type) || NOTE_TYPES[0]
  const project = projects.find(p => p.id === note.project_id)

  return (
    <section className={`notes-editor${wide ? ' wide' : ''}`}>
      <header className="editor-head">
        <div className="editor-head-left">
          <span className="editor-kicker">
            {note.is_daily ? 'Daily Note' : currentType.label}
            {project && <> · <span className="editor-proj"><span className="editor-proj-dot" style={{ background: project.color || 'var(--text-muted)' }} />{project.title}</span></>}
          </span>
          <span className="editor-saved">
            {suggesting ? 'Tagro liest…' : savedAt ? `Gespeichert · ${formatTimeAgo(savedAt)}` : `Aktualisiert ${formatTimeAgo(note.updated_at)}`}
          </span>
        </div>
        <div className="editor-head-actions">
          <button className={`editor-icon-btn${note.pinned ? ' on' : ''}`} type="button" onClick={onTogglePin} title={note.pinned ? 'Pin lösen' : 'Anheften'} aria-pressed={note.pinned}>
            <PushPin size={13} weight={note.pinned ? 'fill' : 'regular'} />
          </button>
          <button className="editor-icon-btn" type="button" onClick={handToAi} title="An Tagro übergeben">
            <ArrowSquareOut size={13} />
          </button>
          <button className="editor-icon-btn" type="button" onClick={archive} title="Archivieren" disabled={!isOwner}>
            <Archive size={13} />
          </button>
          <button className="editor-icon-btn" type="button" onClick={onToggleWide} title={wide ? 'Schmaler' : 'Breiter'}>
            {wide ? <ArrowsIn size={13} /> : <ArrowsOut size={13} />}
          </button>
          <button className="editor-icon-btn close-mobile" type="button" onClick={onClose} title="Schließen">
            <X size={13} />
          </button>
        </div>
      </header>

      <div className="editor-meta">
        <div className="meta-row">
          <span className="meta-label">Typ</span>
          <div className="type-pills">
            {NOTE_TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                className={`type-pill${note.note_type === t.id ? ' on' : ''}`}
                onClick={() => changeType(t.id)}
                title={t.hint}
                disabled={!isOwner}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="meta-row">
          <span className="meta-label">Projekt</span>
          <select
            className="meta-select"
            value={note.project_id || ''}
            onChange={e => changeProject(e.target.value || null)}
            disabled={!isOwner}
          >
            <option value="">— Kein Projekt —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>

      <div className="editor-body">
        <input
          className="editor-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => title.trim() !== note.title && persist({ title: title.trim() || 'Ohne Titel' })}
          placeholder="Titel…"
          disabled={!isOwner}
        />

        <div className="editor-textarea-wrap">
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={body}
            onChange={e => onBodyChange(e.target.value)}
            placeholder={`Schreib los — Tagro liest, wenn du analysieren willst.

Tipp: [[Notiz-Titel]] verlinkt auf eine andere Notiz.`}
            disabled={!isOwner}
          />
          {linkMenu && linkMenu.results.length > 0 && (
            <div className="link-menu" role="listbox">
              {linkMenu.results.map(r => (
                <button key={r.id} type="button" onClick={() => pickLink(r)}>
                  <Notepad size={11} /> {r.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tagro panel */}
        <section className={`tagro-panel${hasSuggestions ? ' has' : ''}`}>
          <header className="tagro-head">
            <div>
              <span className="tagro-kicker"><Sparkle size={11} weight="fill" /> Tagro · {currentType.label}-Modus</span>
              <span className="tagro-hint">{currentType.hint}</span>
            </div>
            <button className="tagro-run" type="button" onClick={runTagro} disabled={suggesting || !body.trim()}>
              <ArrowsClockwise size={11} className={suggesting ? 'spin' : ''} />
              {suggesting ? 'Liest…' : note.tagro_last_run_at ? 'Neu analysieren' : 'Analysieren'}
            </button>
          </header>

          {!hasSuggestions && !suggesting && (
            <p className="tagro-empty">Schreib ein paar Sätze, dann findet Tagro Themen, Tasks und Risiken.</p>
          )}

          {hasSuggestions && (
            <div className="tagro-content">
              {s.summary && (
                <div className="tagro-block">
                  <p className="tagro-label">Kurzfassung</p>
                  <p className="tagro-summary">{s.summary}</p>
                </div>
              )}

              {(s.themes?.length ?? 0) > 0 && (
                <div className="tagro-block">
                  <p className="tagro-label">Themen</p>
                  <div className="tagro-chips">
                    {(s.themes ?? []).map((t, i) => <span key={`${t}-${i}`} className="tagro-chip">{t}</span>)}
                  </div>
                </div>
              )}

              {(s.tasks?.length ?? 0) > 0 && (
                <div className="tagro-block">
                  <p className="tagro-label">Mögliche Aufgaben</p>
                  <div className="task-suggestions">
                    {(s.tasks ?? []).map((t, i) => {
                      const already = spawned.some(sp => sp.suggestion_idx === i)
                      const checked = selectedTasks.has(i)
                      return (
                        <label key={i} className={`task-suggestion${already ? ' done' : ''}`}>
                          <input
                            type="checkbox"
                            checked={already || checked}
                            disabled={already}
                            onChange={e => {
                              const next = new Set(selectedTasks)
                              if (e.target.checked) next.add(i); else next.delete(i)
                              setSelectedTasks(next)
                            }}
                          />
                          <div className="ts-body">
                            <strong>{t.title}</strong>
                            {t.why && <span className="ts-why">{t.why}</span>}
                            <div className="ts-meta">
                              <span className={`ts-prio prio-${t.priority || 'medium'}`}>{t.priority || 'medium'}</span>
                              {typeof t.estimated_hours === 'number' && <span className="ts-est">≈ {t.estimated_hours}h</span>}
                              {already && <span className="ts-done"><CheckCircle size={10} weight="fill" /> bereits Task</span>}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  <button type="button" className="spawn-btn" disabled={selectedTasks.size === 0 || spawning} onClick={spawnTasks}>
                    {spawning ? 'Erstelle…' : `${selectedTasks.size} Task${selectedTasks.size === 1 ? '' : 's'} erstellen`}
                  </button>
                </div>
              )}

              {(s.decisions?.length ?? 0) > 0 && (
                <div className="tagro-block">
                  <p className="tagro-label">Mögliche Entscheidungen</p>
                  {!note.project_id && (
                    <p className="tagro-empty">Projekt zuweisen, um Entscheidungen zu erstellen.</p>
                  )}
                  <div className="task-suggestions">
                    {(s.decisions ?? []).map((d, i) => {
                      const already = spawnedDecisions.some(sp => sp.suggestion_idx === i)
                      const checked = selectedDecisions.has(i)
                      return (
                        <label key={i} className={`task-suggestion${already ? ' done' : ''}`}>
                          <input
                            type="checkbox"
                            checked={already || checked}
                            disabled={already || !note.project_id}
                            onChange={e => {
                              const next = new Set(selectedDecisions)
                              if (e.target.checked) next.add(i); else next.delete(i)
                              setSelectedDecisions(next)
                            }}
                          />
                          <div className="ts-body">
                            <strong>{d.title}</strong>
                            {d.reason && <span className="ts-why">{d.reason}</span>}
                            {(d.options?.length ?? 0) > 0 && (
                              <div className="ts-meta">
                                {(d.options ?? []).slice(0, 3).map((o, j) => (
                                  <span key={j} className="ts-est">{o}</span>
                                ))}
                              </div>
                            )}
                            {already && <span className="ts-done"><CheckCircle size={10} weight="fill" /> Entscheidung erstellt</span>}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    className="spawn-btn"
                    disabled={!note.project_id || selectedDecisions.size === 0 || spawningDecisions}
                    onClick={spawnDecisions}
                  >
                    {spawningDecisions
                      ? 'Erstelle…'
                      : `${selectedDecisions.size} Entscheidung${selectedDecisions.size === 1 ? '' : 'en'} erstellen`}
                  </button>
                </div>
              )}

              {(s.followups?.length ?? 0) > 0 && (
                <div className="tagro-block">
                  <p className="tagro-label">Offene Fragen</p>
                  <ul className="tagro-list">{(s.followups ?? []).map((f, i) => <li key={i}>{f}</li>)}</ul>
                </div>
              )}

              {(s.risks?.length ?? 0) > 0 && (
                <div className="tagro-block">
                  <p className="tagro-label">Risiken / Lücken</p>
                  <ul className="tagro-list">{(s.risks ?? []).map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              )}

              {(s.tags?.length ?? 0) > 0 && (
                <div className="tagro-block">
                  <p className="tagro-label">Vorgeschlagene Tags</p>
                  <div className="tagro-chips">
                    {(s.tags ?? []).map((t, i) => (
                      <span key={`${t}-${i}`} className={`tagro-chip${note.tags.includes(t) ? ' applied' : ''}`}>#{t}</span>
                    ))}
                  </div>
                  {(s.tags ?? []).some(t => !note.tags.includes(t)) && (
                    <button type="button" className="apply-tags-btn" onClick={applyTagroTags}>
                      <Check size={11} /> Tags übernehmen
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Spawned tasks + decisions */}
        {(spawned.length > 0 || spawnedDecisions.length > 0) && (
          <section className="spawned-block">
            <p className="spawned-label">Aus dieser Notiz entstanden</p>
            <div className="spawned-list">
              {spawned.map(sp => (
                <a key={sp.task_id} className="spawned-row" href={`/tasks?open=${sp.task_id}`}>
                  <CheckCircle size={11} weight="fill" />
                  <span>{sp.task?.title || 'Task'}</span>
                  <small>{sp.task?.priority || ''}</small>
                </a>
              ))}
              {spawnedDecisions.map(sp => (
                <a key={sp.decision_id} className="spawned-row decision" href={`/decisions?open=${sp.decision_id}`}>
                  <Scales size={11} weight="fill" />
                  <span>{sp.title}</span>
                  <small>Entscheidung</small>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Backlinks */}
        {backlinks.length > 0 && (
          <section className="backlinks-block">
            <p className="spawned-label">Erwähnt von</p>
            <div className="backlinks-list">
              {backlinks.map(b => (
                <button key={b.id} type="button" className="backlink-row" onClick={() => (window.location.href = `/notes?open=${b.id}`)}>
                  <Notepad size={10} />
                  <span>{b.title}</span>
                  <small>{formatTimeAgo(b.updated_at)}</small>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  )
}

/* ═════════════════════════════════════════════════════════════
 * Styles — match the .task-os shell (compact, Slate, no white-on-dark)
 * ═══════════════════════════════════════════════════════════ */

const NOTES_CSS = `
  .notes-os {
    --notes-soft:#4E5567;
    --notes-soft-faint: color-mix(in srgb, #4E5567 62%, transparent);
    width:100%; height:100%; min-height:0; color:var(--text);
    padding:20px 0 0; display:flex; flex-direction:column; overflow:hidden;
    letter-spacing:.017em;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-weight:500;
    position:relative; /* anchor for the floating .notes-search-float pill */
  }
  .notes-os, .notes-os * { font-weight:500; letter-spacing:.017em; }
  [data-theme="dark"] .notes-os,
  [data-theme="classic-dark"] .notes-os,
  [data-theme="read"] .notes-os {
    --notes-soft: var(--text-secondary);
  }

  /* ─── Sticky top ────────────────────────────────────────── */
  .notes-static-top {
    flex:0 0 auto;
    position:relative;
    z-index:8;
  }
  .notes-m-shell {
    display:flex; flex-direction:column; flex:1 1 auto; min-height:0;
  }
  .notes-top {
    display:flex; align-items:center; justify-content:space-between;
    min-height:34px; padding:0 18px 12px;
    border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .notes-top-left { display:flex; align-items:center; gap:10px; min-width:0; }
  .notes-rail-toggle {
    width:24px; height:24px; border:0; background:transparent;
    color:var(--notes-soft); border-radius:7px; cursor:pointer;
    display:inline-flex; align-items:center; justify-content:center;
    transition:background .12s, color .12s;
  }
  .notes-rail-toggle:hover { background:var(--surface-2); color:var(--text); }
  .notes-title { margin:0; font-size:14.5px; font-weight:500; letter-spacing:0; }
  .notes-count-pill {
    height:20px; padding:0 8px; border-radius:999px;
    background:color-mix(in srgb, var(--surface-2) 50%, transparent);
    color:var(--notes-soft); font-size:10.5px; font-weight:500;
    display:inline-flex; align-items:center; letter-spacing:.012em;
  }

  .notes-top-right { display:flex; align-items:center; gap:8px; }

  /* ── Floating search pill — Festag .task-tool DNA.
       Sits above the page chrome, anchored top-right. Collapsed
       state is a 32px round chip with the magnifier glyph; on focus
       (or while a query is present) it grows to 240px with the
       input revealed. Same shadow recipe used everywhere in the
       app to elevate floating tools. */
  .notes-search-float {
    position:absolute;
    top:18px; right:22px; z-index:18;
    display:inline-flex; align-items:center; gap:6px;
    height:32px; width:32px; padding:0;
    border-radius:999px; border:0;
    background:#fff; color:var(--notes-soft);
    box-shadow:0 1px 2px rgba(15,23,42,.08), 0 4px 12px rgba(15,23,42,.07);
    overflow:hidden; cursor:text;
    transition:width .22s cubic-bezier(.16,1,.3,1),
               padding .22s cubic-bezier(.16,1,.3,1),
               box-shadow .14s ease, color .14s ease;
  }
  .notes-search-float:hover { color:var(--text); box-shadow:0 1px 2px rgba(15,23,42,.1), 0 6px 14px rgba(15,23,42,.09); }
  .notes-search-float.open {
    width:260px; padding:0 9px 0 11px; cursor:default;
    box-shadow:0 1px 2px rgba(15,23,42,.1), 0 10px 26px rgba(15,23,42,.12);
  }
  .notes-search-float > svg {
    flex-shrink:0;
    margin-left:9px;
    transition:margin .22s cubic-bezier(.16,1,.3,1);
  }
  .notes-search-float.open > svg { margin-left:0; color:var(--text); }
  .notes-search-float input {
    flex:1; min-width:0; border:0; outline:0; background:transparent;
    color:var(--text); font:inherit; font-size:12.5px; font-weight:500;
    letter-spacing:.012em;
    width:0; padding:0; transition:width .22s, padding .22s;
  }
  .notes-search-float.open input { width:auto; padding:0 0 0 2px; }
  .notes-search-float input::placeholder { color:var(--notes-soft); }
  .notes-search-float button {
    width:20px; height:20px; border:0; background:transparent;
    color:var(--notes-soft); cursor:pointer; border-radius:50%;
    display:none; align-items:center; justify-content:center;
    flex-shrink:0; transition:background .12s, color .12s;
  }
  .notes-search-float.open button { display:inline-flex; }
  .notes-search-float button:hover {
    background:color-mix(in srgb, var(--surface-2) 80%, transparent); color:var(--text);
  }

  [data-theme="dark"] .notes-search-float,
  [data-theme="classic-dark"] .notes-search-float {
    background:color-mix(in srgb, var(--surface) 92%, #fff 8%);
    box-shadow:0 1px 2px rgba(0,0,0,.28), 0 6px 14px rgba(0,0,0,.18);
  }
  [data-theme="dark"] .notes-search-float.open,
  [data-theme="classic-dark"] .notes-search-float.open {
    box-shadow:0 1px 2px rgba(0,0,0,.32), 0 12px 30px rgba(0,0,0,.32);
  }

  .notes-create {
    height:30px; padding:0 9px 0 12px;
    border:1px solid transparent; border-radius:8px;
    background:transparent; color:var(--notes-soft);
    display:flex; align-items:center; gap:8px;
    font:inherit; font-size:12px; font-weight:500; cursor:pointer;
    transition:background .12s, color .12s;
  }
  .notes-create:hover { background:var(--surface-2); color:var(--text); }
  .notes-create:disabled { opacity:.46; }
  .notes-create-plus { width:14px; height:14px; font-size:15px; line-height:1; display:inline-flex; align-items:center; justify-content:center; transform:translateY(-.5px); }

  /* ─── Filter-Tabs unter dem Title (Festag pill chips) ────── */
  .notes-tabs {
    display:flex; gap:5px; padding:12px 18px 10px;
    overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none;
  }
  .notes-tabs::-webkit-scrollbar { display:none; }
  .notes-tab {
    display:inline-flex; align-items:center; gap:5px;
    height:27px; padding:0 11px;
    border:1px solid var(--border); border-radius:999px;
    background:transparent; color:var(--notes-soft);
    font:inherit; font-size:11.5px; font-weight:500;
    cursor:pointer; white-space:nowrap; flex-shrink:0;
    transition:background .12s, color .12s;
  }
  .notes-tab:hover { color:var(--text); }
  .notes-tab.on { background:var(--surface-2); color:var(--text); }
  .notes-tab.clear { border-style:dashed; color:var(--notes-soft); }
  .notes-tab.clear:hover { color:var(--text); border-style:solid; }
  .notes-tab-count {
    display:inline-flex; align-items:center; justify-content:center;
    min-width:15px; height:15px; padding:0 4px; border-radius:999px;
    background:color-mix(in srgb, var(--text) 12%, transparent);
    color:var(--text); font-size:9.5px;
  }

  /* "Heute" ghost button next to "Neue Notiz" */
  .notes-ghost {
    display:inline-flex; align-items:center; gap:5px;
    height:28px; padding:0 11px; border-radius:8px;
    background:transparent; border:0; color:var(--notes-soft);
    font:inherit; font-size:12px; font-weight:500;
    cursor:pointer; transition:background .12s, color .12s;
  }
  .notes-ghost:hover { background:var(--surface-2); color:var(--text); }

  /* ─── Flat scroll body + table ────────────────────────────── */
  .notes-scroll-body {
    flex:1 1 auto; min-height:0;
    overflow-y:auto; overflow-x:hidden;
    padding:0 18px 80px; overscroll-behavior:contain;
  }

  .notes-table-head {
    display:grid; gap:14px;
    grid-template-columns:minmax(240px, 2fr) minmax(140px, 1fr) 90px minmax(120px, 1fr) 110px 110px;
    padding:14px 8px 9px;
    font-size:10px; letter-spacing:.14em; text-transform:uppercase;
    color:var(--notes-soft);
  }

  .notes-row {
    display:grid; gap:14px; align-items:center;
    grid-template-columns:minmax(240px, 2fr) minmax(140px, 1fr) 90px minmax(120px, 1fr) 110px 110px;
    padding:11px 8px;
    border:0; border-bottom:1px solid color-mix(in srgb, var(--border) 26%, transparent);
    background:transparent; color:var(--text); font:inherit; font-size:12.5px;
    text-align:left; cursor:pointer; width:100%; transition:background .1s;
  }
  .notes-row:hover { background:color-mix(in srgb, var(--surface-2) 45%, transparent); }
  .notes-row.on { background:color-mix(in srgb, var(--surface-2) 80%, transparent); }
  .notes-row-title { display:inline-flex; align-items:center; gap:6px; min-width:0; }
  .notes-row-title strong {
    font-size:13px; font-weight:500; color:var(--text);
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0;
  }
  .notes-row-pin { color:var(--notes-soft); flex-shrink:0; }
  .notes-row-fresh {
    height:15px; padding:0 5px; border-radius:4px; flex-shrink:0;
    background:color-mix(in srgb, var(--accent) 18%, transparent);
    color:var(--accent); font-size:9.5px; font-weight:500;
    letter-spacing:.04em; text-transform:uppercase;
    display:inline-flex; align-items:center;
  }
  .notes-row-proj {
    display:inline-flex; align-items:center; gap:5px;
    font-size:12px; color:var(--text);
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .notes-row-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .notes-row-tags { display:inline-flex; flex-wrap:wrap; gap:4px; align-items:center; }
  .notes-tag-chip {
    display:inline-flex; align-items:center;
    height:18px; padding:0 7px; border-radius:999px;
    background:color-mix(in srgb, var(--surface-2) 55%, transparent);
    color:var(--text); font-size:10.5px; font-weight:500;
  }
  .notes-row-tagro {
    display:inline-flex; align-items:center; gap:4px;
    font-size:11.5px; color:var(--text);
  }
  .notes-row-tagro svg { color:var(--accent); }
  .notes-cell-mute { color:var(--notes-soft); font-size:11.5px; }

  .notes-empty {
    padding:38px 6px; color:var(--notes-soft);
    font-size:12.5px; text-align:center;
    display:flex; flex-direction:column; align-items:center; gap:8px;
  }
  .notes-empty p { margin:0; }
  .notes-empty small { font-size:11.5px; opacity:.75; }
  .notes-empty-cta {
    display:inline-flex; align-items:center; gap:5px;
    height:28px; padding:0 12px; border-radius:999px;
    background:#fff; color:var(--text);
    border:0; font:inherit; font-size:12px; font-weight:500; cursor:pointer;
    box-shadow:0 1px 2px rgba(15,23,42,.08), 0 4px 12px rgba(15,23,42,.07);
    transition:transform .12s, box-shadow .12s;
  }
  .notes-empty-cta:hover { transform:translateY(-1px); box-shadow:0 1px 2px rgba(15,23,42,.1), 0 8px 18px rgba(15,23,42,.10); }
  [data-theme="dark"] .notes-empty-cta,
  [data-theme="classic-dark"] .notes-empty-cta {
    background:color-mix(in srgb, var(--surface) 92%, #fff 8%);
    box-shadow:0 1px 2px rgba(0,0,0,.3), 0 6px 16px rgba(0,0,0,.22);
  }

  /* ─── Overlay drawer for the Editor ──────────────────────── */
  .notes-overlay {
    position:fixed; inset:0; z-index:1200;
    display:flex; justify-content:flex-end;
  }
  .notes-overlay-backdrop {
    flex:1; background:rgba(8,10,14,.42);
    backdrop-filter:blur(4px); cursor:pointer;
  }
  /* The Editor renders a <section.notes-editor>. Inside the overlay
     it becomes the right-anchored drawer (matches /tasks task drawer). */
  .notes-overlay .notes-editor {
    width:min(640px, 100vw); height:100%;
    background:var(--bg); color:var(--text);
    border-left:1px solid var(--border);
    display:flex; flex-direction:column;
    box-shadow:-24px 0 64px -20px rgba(0,0,0,.45);
    animation:notesDrawerIn .22s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes notesDrawerIn { from { transform:translateX(20px); opacity:0; } to { transform:none; opacity:1; } }
  .row-tagro svg { color:var(--accent); }
  .row-time { font-size:10.5px; color:var(--notes-soft); }

  /* ─── Editor ───────────────────────────────────────────── */
  .notes-editor { display:flex; flex-direction:column; min-width:0; overflow:hidden; }
  .editor-empty {
    flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:8px; color:var(--notes-soft); font-size:12.5px; padding:0 30px; text-align:center;
  }
  .editor-empty svg { color:var(--notes-soft); margin-bottom:4px; }
  .editor-empty small { font-size:11px; opacity:.7; }

  .editor-head {
    display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
    padding:12px 22px 10px;
    border-bottom:1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }
  .editor-head-left { display:flex; flex-direction:column; gap:1px; min-width:0; }
  .editor-kicker {
    font-size:10.5px; font-weight:500; letter-spacing:.12em;
    text-transform:uppercase; color:var(--notes-soft);
    display:inline-flex; align-items:center; gap:4px;
  }
  .editor-proj { display:inline-flex; align-items:center; gap:4px; }
  .editor-proj-dot { width:7px; height:7px; border-radius:50%; }
  .editor-saved { font-size:11px; color:var(--notes-soft); font-weight:500; }
  .editor-head-actions { display:flex; align-items:center; gap:2px; }
  .editor-icon-btn {
    width:28px; height:28px; border:0; background:transparent;
    color:var(--notes-soft); border-radius:7px; cursor:pointer;
    display:inline-flex; align-items:center; justify-content:center;
    transition:background .1s, color .1s;
  }
  .editor-icon-btn:hover { background:var(--surface-2); color:var(--text); }
  .editor-icon-btn.on { background:color-mix(in srgb, var(--accent) 12%, transparent); color:var(--accent); }
  .editor-icon-btn:disabled { opacity:.4; cursor:not-allowed; }
  .editor-icon-btn.close-mobile { display:none; }

  .editor-meta {
    display:flex; flex-direction:column; gap:6px;
    padding:8px 22px; border-bottom:1px solid color-mix(in srgb, var(--border) 30%, transparent);
  }
  .meta-row { display:flex; align-items:center; gap:10px; }
  .meta-label {
    width:60px; font-size:10px; font-weight:500; letter-spacing:.12em;
    text-transform:uppercase; color:var(--notes-soft);
  }
  .type-pills { display:inline-flex; gap:4px; flex-wrap:wrap; }
  .type-pill {
    height:24px; padding:0 10px; border-radius:6px;
    background:transparent; border:1px solid color-mix(in srgb, var(--border) 60%, transparent);
    color:var(--notes-soft); font:inherit; font-size:11.5px; font-weight:500;
    cursor:pointer; transition:background .1s, color .1s, border-color .1s;
  }
  .type-pill:hover { background:var(--surface-2); color:var(--text); }
  .type-pill.on { background:var(--text); color:var(--bg); border-color:var(--text); }
  .type-pill:disabled { opacity:.4; cursor:not-allowed; }
  .meta-select {
    height:26px; padding:0 8px; border-radius:6px;
    background:transparent; border:1px solid color-mix(in srgb, var(--border) 60%, transparent);
    color:var(--text); font:inherit; font-size:12px; font-weight:500;
    cursor:pointer; max-width:280px;
  }
  .meta-select:focus { outline:0; border-color:var(--border); }
  .meta-select:disabled { opacity:.5; cursor:not-allowed; }

  .editor-body {
    flex:1; min-height:0; overflow-y:auto; padding:22px 28px 50px;
    display:flex; flex-direction:column; gap:18px;
  }
  .editor-title {
    background:transparent; border:0; outline:0;
    color:var(--text); font:inherit; font-size:24px; font-weight:500;
    letter-spacing:-.012em; padding:2px 0;
  }
  .editor-title::placeholder { color:var(--notes-soft); opacity:.55; }
  .editor-title:disabled { opacity:.7; }

  .editor-textarea-wrap { position:relative; }
  .editor-textarea {
    width:100%; background:transparent; border:0; outline:0; resize:vertical;
    color:var(--text); font:inherit; font-size:14px; line-height:1.65; font-weight:500;
    min-height:220px; padding:2px 0; letter-spacing:.012em;
  }
  .editor-textarea::placeholder { color:var(--notes-soft); opacity:.55; white-space:pre-line; }
  .editor-textarea:disabled { opacity:.7; }
  .link-menu {
    position:absolute; left:0; right:auto; max-width:340px;
    margin-top:6px; padding:5px;
    background:var(--card); border:1px solid var(--border); border-radius:10px;
    box-shadow:0 1px 2px rgba(15,23,42,.08), 0 18px 40px rgba(15,23,42,.18);
    display:flex; flex-direction:column; gap:1px; z-index:5;
  }
  .link-menu button {
    display:flex; align-items:center; gap:6px;
    padding:7px 10px; border:0; background:transparent; border-radius:7px !important;
    color:var(--text); font:inherit; font-size:12px; font-weight:500;
    cursor:pointer; text-align:left;
  }
  .link-menu button:hover { background:var(--surface-2); }
  .link-menu button svg { color:var(--notes-soft); }

  /* Tagro panel — accent-tinted card */
  .tagro-panel {
    border:1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
    border-radius:14px; padding:14px 16px;
    background:color-mix(in srgb, var(--accent) 4%, transparent);
    display:flex; flex-direction:column; gap:12px;
  }
  .tagro-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
  .tagro-kicker {
    display:inline-flex; align-items:center; gap:5px;
    font-size:11px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; color:var(--text);
  }
  .tagro-hint { display:block; margin-top:2px; font-size:11px; color:var(--notes-soft); font-weight:500; }
  .tagro-run {
    display:inline-flex; align-items:center; gap:5px;
    height:26px; padding:0 11px; border-radius:8px;
    background:var(--card); color:var(--text); border:1px solid var(--border);
    font:inherit; font-size:11.5px; font-weight:500; cursor:pointer;
    transition:background .12s;
    white-space:nowrap;
  }
  .tagro-run:hover:not(:disabled) { background:var(--surface-2); }
  .tagro-run:disabled { opacity:.5; cursor:not-allowed; }
  .spin { animation:notesSpin 1s linear infinite; }
  @keyframes notesSpin { from { transform:rotate(0); } to { transform:rotate(360deg); } }
  .tagro-empty { margin:0; font-size:12.5px; color:var(--notes-soft); line-height:1.55; }

  .tagro-content { display:flex; flex-direction:column; gap:14px; }
  .tagro-block { display:flex; flex-direction:column; gap:5px; }
  .tagro-label {
    margin:0; font-size:10px; font-weight:500; letter-spacing:.12em;
    text-transform:uppercase; color:var(--notes-soft);
  }
  .tagro-summary { margin:0; font-size:13px; line-height:1.55; color:var(--text); font-weight:500; }
  .tagro-chips { display:flex; flex-wrap:wrap; gap:4px; }
  .tagro-chip {
    display:inline-flex; align-items:center; height:22px; padding:0 9px;
    border-radius:6px; background:var(--card); border:1px solid var(--border);
    font-size:11px; font-weight:500; color:var(--text);
  }
  .tagro-chip.applied { background:color-mix(in srgb, var(--accent) 16%, transparent); border-color:color-mix(in srgb, var(--accent) 40%, var(--border)); color:var(--text); }
  .tagro-list { margin:0; padding-left:16px; display:flex; flex-direction:column; gap:3px; }
  .tagro-list li { font-size:12.5px; line-height:1.5; color:var(--text); font-weight:500; }

  .task-suggestions { display:flex; flex-direction:column; gap:6px; }
  .task-suggestion {
    display:flex; gap:9px; align-items:flex-start;
    padding:9px 11px; cursor:pointer;
    background:var(--card); border:1px solid var(--border); border-radius:10px;
    transition:border-color .12s;
  }
  .task-suggestion:hover:not(.done) { border-color:color-mix(in srgb, var(--accent) 30%, var(--border)); }
  .task-suggestion.done { opacity:.6; cursor:default; }
  .task-suggestion input { margin-top:3px; flex-shrink:0; }
  .ts-body { display:flex; flex-direction:column; gap:2px; min-width:0; flex:1; }
  .ts-body strong { font-size:12.5px; font-weight:500; letter-spacing:.012em; color:var(--text); }
  .ts-why { font-size:11.5px; color:var(--notes-soft); font-weight:500; line-height:1.45; }
  .ts-meta { display:flex; gap:6px; flex-wrap:wrap; margin-top:2px; }
  .ts-prio { display:inline-flex; align-items:center; height:16px; padding:0 6px; border-radius:4px; font-size:9.5px; font-weight:500; letter-spacing:.04em; text-transform:uppercase; }
  .prio-high   { background:color-mix(in srgb, #ef4444 14%, transparent); color:#ef4444; }
  .prio-medium { background:color-mix(in srgb, #f59e0b 14%, transparent); color:#f59e0b; }
  .prio-low    { background:color-mix(in srgb, #22c55e 14%, transparent); color:#22c55e; }
  .ts-est { font-size:10px; color:var(--notes-soft); }
  .ts-done { display:inline-flex; align-items:center; gap:3px; font-size:10px; color:#22c55e; font-weight:500; }

  .spawn-btn, .apply-tags-btn {
    align-self:flex-start; height:28px; padding:0 12px; border:0;
    border-radius:8px; background:var(--btn-prim); color:var(--btn-prim-text);
    font:inherit; font-size:11.5px; font-weight:500; letter-spacing:.012em;
    cursor:pointer; display:inline-flex; align-items:center; gap:5px;
    transition:opacity .12s, transform .12s;
  }
  .apply-tags-btn { background:var(--surface-2); color:var(--text); border:1px solid var(--border); }
  .spawn-btn:hover:not(:disabled), .apply-tags-btn:hover:not(:disabled) { opacity:.92; }
  .spawn-btn:active:not(:disabled), .apply-tags-btn:active:not(:disabled) { transform:scale(.97); }
  .spawn-btn:disabled, .apply-tags-btn:disabled { opacity:.4; cursor:not-allowed; }

  .spawned-block, .backlinks-block {
    padding-top:14px; border-top:1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }
  .spawned-label {
    margin:0 0 6px; font-size:10px; font-weight:500; letter-spacing:.12em;
    text-transform:uppercase; color:var(--notes-soft);
  }
  .spawned-list, .backlinks-list { display:flex; flex-direction:column; gap:4px; }
  .spawned-row, .backlink-row {
    display:flex; align-items:center; gap:7px;
    padding:7px 10px; border-radius:8px;
    background:var(--card); border:1px solid var(--border);
    font-size:12px; color:var(--text); font-weight:500;
    text-decoration:none; cursor:pointer; text-align:left;
    transition:border-color .12s;
  }
  .spawned-row { border:1px solid var(--border); }
  .spawned-row svg { color:#22c55e; flex-shrink:0; }
  .spawned-row.decision svg { color:var(--accent); }
  .spawned-row:hover, .backlink-row:hover { border-color:color-mix(in srgb, var(--text) 30%, var(--border)); }
  .backlink-row { border:0; background:transparent; }
  .backlink-row svg { color:var(--notes-soft); }
  .backlink-row span { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .backlink-row small, .spawned-row small {
    margin-left:auto; font-size:10.5px; color:var(--notes-soft);
    text-transform:uppercase; letter-spacing:.04em;
  }

  /* ─── Responsive ───────────────────────────────────────── */
  @media (max-width: 900px) {
    /* On narrow screens drop Typ/Tags/Tagro columns; keep title + project + time. */
    .notes-table-head,
    .notes-row {
      grid-template-columns:minmax(180px, 2fr) minmax(110px, 1fr) 90px;
    }
    .notes-table-head > :nth-child(n+4),
    .notes-row > :nth-child(n+4) { display:none; }
  }
  /* Mobile uses MobilePageHeader above; hide the desktop title row. */
  @media (max-width: 768px) {
    :global(.mcd) { display: none !important; }
    .notes-legacy-mph, .notes-legacy-mph :global(.mph) { display: none !important; }
    .notes-os { background: #FCFCFC !important; }
    [data-theme="dark"] .notes-os,
    [data-theme="classic-dark"] .notes-os { background: var(--portal-bg, #0d0d0f) !important; }
    .notes-m-shell {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      padding: calc(20px + env(safe-area-inset-top, 0px)) 20px 160px !important;
      box-sizing: border-box !important;
    }
    .notes-static-top { padding: 0 !important; position: relative !important; }
    .notes-top { display: none !important; }
    .notes-tabs { display: none !important; }
    .notes-m-actions { position: relative !important; }
    .notes-table-head { display: none !important; }
    .notes-scroll-body { padding-bottom: 0 !important; }
    .notes-row {
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 8px !important;
      grid-template-columns: none !important;
      min-height: auto !important;
      padding: 16px 14px !important;
      margin-bottom: 12px !important;
      border: 1px solid rgba(0, 0, 0, 0.07) !important;
      border-radius: 14px !important;
      background: #FFFFFF !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 1px 0 rgba(0,0,0,0.04), 0 4px 10px rgba(144,149,159,0.16) !important;
      text-align: left !important;
    }
    [data-theme="dark"] .notes-row,
    [data-theme="classic-dark"] .notes-row {
      background: rgba(255,255,255,0.06) !important;
      border: 1px solid rgba(255,255,255,0.14) !important;
    }
    .notes-row:hover { background: #FFFFFF !important; }
    .notes-row.on { background: #FAFAFA !important; }
    .notes-row-title strong {
      font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
      font-size: 18px !important;
      font-weight: 500 !important;
      letter-spacing: -0.02em !important;
      line-height: 1.28 !important;
    }
    .notes-row-proj { font-size: 14px !important; }
    .notes-row > .notes-cell-mute:last-child {
      display: flex !important;
      font-size: 13px !important;
      color: #90959F !important;
    }
    .notes-row > .notes-cell-mute:nth-child(3),
    .notes-row-tags,
    .notes-row-tagro { display: none !important; }
  }
  @media (max-width: 600px) {
    .notes-overlay .notes-editor { width:100vw; }
    .editor-icon-btn.close-mobile { display:inline-flex; }
    .notes-search-float { top:13px; right:14px; }
    .notes-search-float.open { width:min(260px, calc(100vw - 80px)); }
  }
`
