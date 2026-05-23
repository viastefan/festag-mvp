'use client'

/**
 * /notes — Linear/Notion-flavoured note workspace.
 *
 * Layout:
 *   • Top bar: title, filters, "Neue Notiz" primary action.
 *   • Table: Title · Projekt · Tags · Tagro · Geteilt · Aktualisiert.
 *   • Click row → side drawer with the body editor, Tagro suggestion
 *     panel, share + spawn-tasks actions, archive.
 *
 * Tagro suggestions are rendered as a calm right rail in the drawer.
 * The user picks which proposed tasks to actually create, then the
 * spawn-tasks API materialises them into the tasks table and links
 * them via notes_spawned_tasks.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive, ArrowsClockwise, CheckCircle, FunnelSimple, Plus, Share, Sparkle, Tag, X,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

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
  created_at: string
  updated_at: string
}

type TagroSuggestions = {
  summary?: string
  themes?: string[]
  tasks?: Array<{ title: string; why?: string; priority?: 'high'|'medium'|'low'; estimated_hours?: number }>
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

type FilterId = 'all' | 'mine' | 'shared' | 'archived'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',      label: 'Alle' },
  { id: 'mine',     label: 'Meine' },
  { id: 'shared',   label: 'Geteilt' },
  { id: 'archived', label: 'Archiv' },
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
  const [filter, setFilter] = useState<FilterId>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notes${filter === 'archived' ? '?archived=1' : ''}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setNotes(data.notes ?? [])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  const filtered = useMemo(() => {
    if (filter === 'mine')     return notes.filter(n => n.user_id === me && n.status !== 'archived')
    if (filter === 'shared')   return notes.filter(n => Array.isArray(n.shared_with) && n.shared_with.length > 0)
    if (filter === 'archived') return notes.filter(n => n.status === 'archived')
    return notes.filter(n => n.status !== 'archived')
  }, [notes, filter, me])

  async function createNote() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Neue Notiz' }),
      })
      const data = await res.json()
      if (!res.ok) return
      setNotes(n => [data.note, ...n])
      setOpenId(data.note.id)
    } finally {
      setCreating(false)
    }
  }

  function patchLocal(id: string, patch: Partial<Note>) {
    setNotes(curr => curr.map(n => n.id === id ? { ...n, ...patch } : n))
  }

  function removeLocal(id: string) {
    setNotes(curr => curr.filter(n => n.id !== id))
  }

  return (
    <div className="notes-page">
      <header className="np-head">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Notizen</h1>
          <p className="meta">
            {loading ? 'Lade…' : `${filtered.length} Notiz${filtered.length === 1 ? '' : 'en'} · ${
              notes.filter(n => n.shared_with?.length).length
            } geteilt`}
          </p>
        </div>
        <button className="np-primary" type="button" onClick={createNote} disabled={creating}>
          <Plus size={14} weight="bold" />
          {creating ? 'Lege an…' : 'Neue Notiz'}
        </button>
      </header>

      <div className="np-toolbar">
        <div className="np-filters">
          <FunnelSimple size={12} className="np-filter-icon" />
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              className={`np-filter${filter === f.id ? ' on' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section className="np-table">
        <div className="np-table-head">
          <span>Titel</span>
          <span>Tags</span>
          <span>Tagro</span>
          <span>Geteilt</span>
          <span>Aktualisiert</span>
        </div>

        {loading && filtered.length === 0 ? (
          <p className="np-empty">Notizen werden geladen…</p>
        ) : filtered.length === 0 ? (
          <div className="np-empty">
            <p>Noch keine Notizen in dieser Ansicht.</p>
            <button className="np-empty-cta" type="button" onClick={createNote}>
              <Plus size={13} /> Erste Notiz anlegen
            </button>
          </div>
        ) : filtered.map(n => (
          <button key={n.id} className="np-row" type="button" onClick={() => setOpenId(n.id)}>
            <div className="np-row-title">
              <strong>{n.title || 'Ohne Titel'}</strong>
              <small>{(n.body || '').slice(0, 90) || 'Leere Notiz — klick zum Bearbeiten.'}</small>
            </div>
            <div className="np-row-tags">
              {(n.tags || []).slice(0, 3).map(t => (
                <span key={t} className="np-tag"><Tag size={9} /> {t}</span>
              ))}
              {(!n.tags || n.tags.length === 0) && <span className="np-cell-empty">—</span>}
            </div>
            <div className="np-row-tagro">
              {n.tagro_last_run_at ? (
                <span className="np-tagro-chip"><Sparkle size={10} weight="fill" /> {n.tagro_suggestions?.tasks?.length || 0} Idee{(n.tagro_suggestions?.tasks?.length || 0) === 1 ? '' : 'n'}</span>
              ) : <span className="np-cell-empty">—</span>}
            </div>
            <div className="np-row-shared">
              {(n.shared_with?.length || 0) > 0 ? (
                <span className="np-shared-chip"><Share size={10} /> {n.shared_with.length}</span>
              ) : <span className="np-cell-empty">—</span>}
            </div>
            <div className="np-row-updated">
              {formatTimeAgo(n.updated_at)}
            </div>
          </button>
        ))}
      </section>

      {openId && (
        <NoteDrawer
          noteId={openId}
          onClose={() => setOpenId(null)}
          onPatch={patch => patchLocal(openId, patch)}
          onArchive={() => { removeLocal(openId); setOpenId(null) }}
        />
      )}

      <style jsx>{`
        .notes-page { padding: 26px 28px 48px; max-width: 1280px; margin: 0 auto; }
        .np-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
        .eyebrow { margin: 0 0 4px; font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--text-muted); }
        h1 { margin: 0; font-size: 24px; font-weight: 500; letter-spacing: -.01em; color: var(--text); }
        .meta { margin: 4px 0 0; font-size: 12.5px; color: var(--text-muted); font-weight: 500; }
        .np-primary {
          display: inline-flex; align-items: center; gap: 6px;
          height: 34px; padding: 0 14px; border: 0;
          border-radius: 999px;
          background: var(--btn-prim); color: var(--btn-prim-text);
          font: inherit; font-size: 13px; font-weight: 500; letter-spacing: .015em;
          cursor: pointer; transition: opacity .12s, transform .12s;
        }
        .np-primary:hover:not(:disabled) { opacity: .92; }
        .np-primary:active:not(:disabled) { transform: scale(.97); }
        .np-primary:disabled { opacity: .5; cursor: not-allowed; }

        .np-toolbar { margin-bottom: 14px; display: flex; align-items: center; gap: 14px; }
        .np-filters { display: inline-flex; align-items: center; gap: 4px; padding: 4px; border-radius: 999px; background: color-mix(in srgb, var(--surface-2) 50%, transparent); }
        .np-filter-icon { margin: 0 4px 0 8px; color: var(--text-muted); }
        .np-filter {
          height: 26px; padding: 0 12px; border: 0;
          border-radius: 999px; background: transparent;
          color: var(--text-muted); font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .015em;
          cursor: pointer; transition: background .12s, color .12s;
        }
        .np-filter:hover { color: var(--text); }
        .np-filter.on { background: var(--card); color: var(--text); box-shadow: 0 1px 2px color-mix(in srgb, var(--text) 8%, transparent); }

        .np-table {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--card);
          overflow: hidden;
        }
        .np-table-head, .np-row {
          display: grid;
          grid-template-columns: minmax(280px, 2.2fr) minmax(120px, 1fr) 120px 90px 130px;
          gap: 14px; align-items: center;
          padding: 11px 18px;
        }
        .np-table-head {
          font-size: 11px; font-weight: 500; letter-spacing: .08em;
          text-transform: uppercase; color: var(--text-muted);
          border-bottom: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface-2) 30%, transparent);
        }
        .np-row {
          width: 100%; border: 0; background: transparent;
          color: var(--text); font: inherit;
          text-align: left; cursor: pointer;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
          transition: background .12s;
        }
        .np-row:last-child { border-bottom: 0; }
        .np-row:hover { background: color-mix(in srgb, var(--surface-2) 35%, transparent); }
        .np-row-title strong { display: block; font-size: 13.5px; font-weight: 500; letter-spacing: -.005em; color: var(--text); }
        .np-row-title small { display: block; margin-top: 2px; font-size: 11.5px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .np-row-tags { display: inline-flex; flex-wrap: wrap; gap: 5px; }
        .np-tag {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 2px 7px; border-radius: 999px;
          background: color-mix(in srgb, var(--surface-2) 60%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          font-size: 10.5px; font-weight: 500; color: var(--text-secondary);
        }
        .np-tagro-chip, .np-shared-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; border-radius: 999px;
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
          color: var(--text); font-size: 10.5px; font-weight: 500;
        }
        .np-cell-empty { color: var(--text-muted); opacity: .55; font-size: 12px; }
        .np-row-updated { font-size: 11.5px; color: var(--text-muted); font-weight: 500; }
        .np-empty {
          padding: 36px 18px; text-align: center; color: var(--text-muted); font-size: 13px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .np-empty-cta {
          display: inline-flex; align-items: center; gap: 5px;
          height: 30px; padding: 0 12px; border-radius: 999px;
          background: var(--surface-2); color: var(--text); border: 1px solid var(--border);
          font: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
        }
        .np-empty-cta:hover { background: var(--card); }

        @media (max-width: 900px) {
          .np-table-head { display: none; }
          .np-row { grid-template-columns: 1fr; gap: 6px; padding: 12px 14px; }
          .np-row-tags, .np-row-tagro, .np-row-shared, .np-row-updated { font-size: 11px; }
        }
      `}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
 * NoteDrawer — right-side editor + Tagro panel + share + spawn
 * ─────────────────────────────────────────────────────────── */

function NoteDrawer({
  noteId, onClose, onPatch, onArchive,
}: {
  noteId: string
  onClose: () => void
  onPatch: (patch: Partial<Note>) => void
  onArchive: () => void
}) {
  const [note, setNote] = useState<Note | null>(null)
  const [spawned, setSpawned] = useState<SpawnedTask[]>([])
  const [savingTitle, setSavingTitle] = useState(false)
  const [savingBody, setSavingBody] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [spawningTasks, setSpawningTasks] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')

  // Initial load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/notes/${noteId}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      if (cancelled) return
      setNote(data.note)
      setSpawned(data.spawned || [])
    })()
    return () => { cancelled = true }
  }, [noteId])

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function patchRemote(patch: Partial<Note>) {
    const res = await fetch(`/api/notes/${noteId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) return null
    const data = await res.json()
    setNote(data.note)
    onPatch(data.note)
    return data.note as Note
  }

  async function commitTitle(value: string) {
    if (!note || value.trim() === note.title) return
    setSavingTitle(true)
    await patchRemote({ title: value.trim() || 'Ohne Titel' })
    setSavingTitle(false)
  }

  async function commitBody(value: string) {
    if (!note || value === (note.body || '')) return
    setSavingBody(true)
    await patchRemote({ body: value })
    setSavingBody(false)
  }

  async function runTagro() {
    if (suggesting) return
    setSuggesting(true)
    try {
      const res = await fetch(`/api/notes/${noteId}/suggest`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setNote(curr => curr ? ({ ...curr, tagro_suggestions: data.suggestions, tagro_last_run_at: new Date().toISOString() }) : curr)
      onPatch({ tagro_suggestions: data.suggestions, tagro_last_run_at: new Date().toISOString() } as Partial<Note>)
    } finally {
      setSuggesting(false)
    }
  }

  async function spawnTasks() {
    if (spawningTasks || selected.size === 0) return
    setSpawningTasks(true)
    try {
      const indices = Array.from(selected)
      const res = await fetch(`/api/notes/${noteId}/spawn-tasks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indices }),
      })
      if (!res.ok) return
      const data = await res.json()
      const newSpawned: SpawnedTask[] = (data.tasks as any[]).map((t, i) => ({
        task_id: t.id,
        suggestion_idx: indices[i],
        spawned_at: new Date().toISOString(),
        task: t,
      }))
      setSpawned(curr => [...curr, ...newSpawned])
      setSelected(new Set())
    } finally {
      setSpawningTasks(false)
    }
  }

  async function shareWith() {
    if (!shareEmail.trim() || sharing) return
    setShareError('')
    setSharing(true)
    try {
      // Resolve email → user id via profiles
      const supa = createClient()
      const { data: profile } = await supa.from('profiles').select('id').eq('email', shareEmail.trim().toLowerCase()).maybeSingle()
      if (!profile || !(profile as any).id) {
        setShareError('Kein Festag-Nutzer mit dieser E-Mail gefunden.')
        return
      }
      const userId = (profile as any).id as string
      if (!note) return
      if (note.shared_with.includes(userId)) {
        setShareError('Schon geteilt mit diesem Nutzer.')
        return
      }
      const next = [...note.shared_with, userId]
      await patchRemote({ shared_with: next })
      setShareEmail('')
    } finally {
      setSharing(false)
    }
  }

  async function unshare(userId: string) {
    if (!note) return
    const next = note.shared_with.filter(u => u !== userId)
    await patchRemote({ shared_with: next })
  }

  async function archive() {
    if (!confirm('Notiz archivieren? Sie wandert in das Archiv.')) return
    const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) onArchive()
  }

  if (!note) {
    return (
      <div className="nd-overlay" role="dialog" aria-modal="true">
        <div className="nd-backdrop" onClick={onClose} />
        <aside className="nd-panel">
          <p className="nd-loading">Lade Notiz…</p>
        </aside>
        <style jsx>{DRAWER_CSS}</style>
      </div>
    )
  }

  const s = (note.tagro_suggestions || {}) as TagroSuggestions
  const hasSuggestions = s.summary || (s.tasks?.length ?? 0) > 0 || (s.themes?.length ?? 0) > 0 || (s.followups?.length ?? 0) > 0 || (s.risks?.length ?? 0) > 0

  return (
    <div className="nd-overlay" role="dialog" aria-modal="true">
      <div className="nd-backdrop" onClick={onClose} />
      <aside className="nd-panel">
        <header className="nd-head">
          <div className="nd-head-meta">
            <span className="nd-kicker">Notiz</span>
            <span className="nd-saved">
              {savingTitle || savingBody ? 'Speichere…' : `Aktualisiert ${formatTimeAgo(note.updated_at)}`}
            </span>
          </div>
          <div className="nd-head-actions">
            <button className="nd-icon-btn" onClick={archive} title="Archivieren" type="button">
              <Archive size={16} />
            </button>
            <button className="nd-icon-btn" onClick={onClose} title="Schließen" type="button">
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="nd-body">
          <input
            className="nd-title"
            defaultValue={note.title}
            placeholder="Titel der Notiz…"
            onBlur={e => commitTitle(e.currentTarget.value)}
            onKeyDown={e => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur() }}
          />

          <textarea
            className="nd-textarea"
            defaultValue={note.body || ''}
            placeholder="Schreib hier los — Tagro liest mit, wenn du analysieren willst."
            onBlur={e => commitBody(e.currentTarget.value)}
          />

          {/* Tagro panel */}
          <section className="nd-tagro">
            <header className="nd-tagro-head">
              <div>
                <span className="nd-tagro-kicker"><Sparkle size={12} weight="fill" /> Tagro-Vorschläge</span>
                {note.tagro_last_run_at
                  ? <span className="nd-tagro-time">Zuletzt {formatTimeAgo(note.tagro_last_run_at)}</span>
                  : <span className="nd-tagro-time">Noch nicht analysiert</span>}
              </div>
              <button className="nd-tagro-run" onClick={runTagro} disabled={suggesting} type="button">
                <ArrowsClockwise size={12} className={suggesting ? 'np-spin' : ''} />
                {suggesting ? 'Tagro liest…' : note.tagro_last_run_at ? 'Neu analysieren' : 'Tagro analysieren'}
              </button>
            </header>

            {!hasSuggestions && !suggesting && (
              <p className="nd-tagro-empty">
                Schreibe ein paar Sätze und klick „Tagro analysieren" — du bekommst Themen, Folgefragen und mögliche Aufgaben.
              </p>
            )}

            {hasSuggestions && (
              <>
                {s.summary && (
                  <div className="nd-tagro-block">
                    <p className="nd-tagro-label">Kurzfassung</p>
                    <p className="nd-tagro-summary">{s.summary}</p>
                  </div>
                )}

                {(s.themes?.length ?? 0) > 0 && (
                  <div className="nd-tagro-block">
                    <p className="nd-tagro-label">Themen</p>
                    <div className="nd-chips">
                      {(s.themes ?? []).map((t, i) => (
                        <span key={`${t}-${i}`} className="nd-chip">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(s.tasks?.length ?? 0) > 0 && (
                  <div className="nd-tagro-block">
                    <p className="nd-tagro-label">Mögliche Aufgaben</p>
                    <div className="nd-task-list">
                      {(s.tasks ?? []).map((t, i) => {
                        const already = spawned.some(sp => sp.suggestion_idx === i)
                        const checked = selected.has(i)
                        return (
                          <label key={i} className={`nd-task-row${already ? ' done' : ''}`}>
                            <input
                              type="checkbox"
                              checked={already || checked}
                              disabled={already}
                              onChange={e => {
                                const next = new Set(selected)
                                if (e.target.checked) next.add(i)
                                else next.delete(i)
                                setSelected(next)
                              }}
                            />
                            <div className="nd-task-meta">
                              <strong>{t.title}</strong>
                              {t.why && <span>{t.why}</span>}
                              <div className="nd-task-tags">
                                <span className={`nd-prio prio-${t.priority || 'medium'}`}>{t.priority || 'medium'}</span>
                                {typeof t.estimated_hours === 'number' && (
                                  <span className="nd-est">≈ {t.estimated_hours}h</span>
                                )}
                                {already && <span className="nd-done"><CheckCircle size={11} weight="fill" /> bereits Task</span>}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      className="nd-spawn-btn"
                      disabled={selected.size === 0 || spawningTasks}
                      onClick={spawnTasks}
                    >
                      {spawningTasks
                        ? 'Erstelle Tasks…'
                        : `${selected.size} Task${selected.size === 1 ? '' : 's'} erstellen`}
                    </button>
                  </div>
                )}

                {(s.followups?.length ?? 0) > 0 && (
                  <div className="nd-tagro-block">
                    <p className="nd-tagro-label">Offene Fragen</p>
                    <ul className="nd-list">
                      {(s.followups ?? []).map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}

                {(s.risks?.length ?? 0) > 0 && (
                  <div className="nd-tagro-block">
                    <p className="nd-tagro-label">Risiken / Lücken</p>
                    <ul className="nd-list">
                      {(s.risks ?? []).map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Share section */}
          <section className="nd-share">
            <p className="nd-share-label"><Share size={12} /> Teilen mit</p>
            {note.shared_with.length === 0 ? (
              <p className="nd-share-empty">Du bist die einzige Person mit Zugriff.</p>
            ) : (
              <div className="nd-share-list">
                {note.shared_with.map(uid => (
                  <SharedRow key={uid} userId={uid} onRemove={() => unshare(uid)} />
                ))}
              </div>
            )}
            <div className="nd-share-row">
              <input
                value={shareEmail}
                onChange={e => setShareEmail(e.target.value)}
                placeholder="E-Mail eines Festag-Nutzers…"
                onKeyDown={e => { if (e.key === 'Enter') shareWith() }}
              />
              <button onClick={shareWith} disabled={!shareEmail.trim() || sharing} type="button">
                {sharing ? 'Teile…' : 'Teilen'}
              </button>
            </div>
            {shareError && <p className="nd-share-error">{shareError}</p>}
          </section>

          {/* Spawned tasks section */}
          {spawned.length > 0 && (
            <section className="nd-spawned">
              <p className="nd-spawned-label">Aus dieser Notiz entstanden</p>
              <div className="nd-spawned-list">
                {spawned.map(sp => (
                  <div key={sp.task_id} className="nd-spawned-row">
                    <CheckCircle size={12} weight="fill" />
                    <span>{sp.task?.title || 'Task'}</span>
                    <small>{sp.task?.priority || ''}</small>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>
      <style jsx>{DRAWER_CSS}</style>
    </div>
  )
}

function SharedRow({ userId, onRemove }: { userId: string; onRemove: () => void }) {
  const [label, setLabel] = useState(userId.slice(0, 8) + '…')
  useEffect(() => {
    const supa = createClient()
    supa.from('profiles').select('full_name,email').eq('id', userId).maybeSingle().then(({ data }) => {
      if (!data) return
      const fn = (data as any).full_name || (data as any).email
      if (fn) setLabel(fn)
    })
  }, [userId])
  return (
    <div className="nd-share-chip">
      <span>{label}</span>
      <button type="button" onClick={onRemove} aria-label="Entfernen"><X size={11} /></button>
    </div>
  )
}

const DRAWER_CSS = `
  .nd-overlay { position: fixed; inset: 0; z-index: 1200; display: flex; justify-content: flex-end; }
  .nd-backdrop { flex: 1; background: rgba(8,10,14,.42); backdrop-filter: blur(4px); cursor: pointer; }
  .nd-panel {
    width: min(620px, 100vw); height: 100%;
    background: var(--bg); color: var(--text);
    border-left: 1px solid var(--border);
    display: flex; flex-direction: column;
    box-shadow: -24px 0 64px -20px rgba(0,0,0,.45);
    animation: ndIn .22s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes ndIn { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }

  .nd-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 22px 10px; border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent); }
  .nd-head-meta { display: flex; flex-direction: column; gap: 2px; }
  .nd-kicker { font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); }
  .nd-saved { font-size: 11px; color: var(--text-muted); font-weight: 500; }
  .nd-head-actions { display: flex; gap: 4px; }
  .nd-icon-btn {
    width: 30px; height: 30px; border: 0; background: transparent;
    color: var(--text-muted); border-radius: 8px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .nd-icon-btn:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text); }

  .nd-body { padding: 18px 22px 36px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }
  .nd-loading { padding: 28px; color: var(--text-muted); font-size: 13px; }

  .nd-title {
    background: transparent; border: 0; outline: 0;
    color: var(--text); font: inherit;
    font-size: 22px; font-weight: 500; letter-spacing: -.015em;
    padding: 4px 0;
  }
  .nd-title::placeholder { color: var(--text-muted); opacity: .55; }

  .nd-textarea {
    background: transparent; border: 0; outline: 0; resize: vertical;
    color: var(--text); font: inherit;
    font-size: 14px; line-height: 1.65; font-weight: 500;
    min-height: 180px; padding: 2px 0;
  }
  .nd-textarea::placeholder { color: var(--text-muted); opacity: .55; }

  .nd-tagro {
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
    border-radius: 14px;
    padding: 14px 16px;
    background: color-mix(in srgb, var(--accent) 5%, transparent);
    display: flex; flex-direction: column; gap: 14px;
  }
  .nd-tagro-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .nd-tagro-kicker {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--text);
  }
  .nd-tagro-time { display: block; margin-top: 2px; font-size: 10.5px; color: var(--text-muted); font-weight: 500; }
  .nd-tagro-run {
    display: inline-flex; align-items: center; gap: 5px;
    height: 26px; padding: 0 11px; border-radius: 999px;
    background: var(--card); color: var(--text); border: 1px solid var(--border);
    font: inherit; font-size: 11.5px; font-weight: 500; cursor: pointer;
    transition: background .12s;
  }
  .nd-tagro-run:hover:not(:disabled) { background: var(--surface-2); }
  .nd-tagro-run:disabled { opacity: .55; cursor: not-allowed; }
  .np-spin { animation: ndSpin 1s linear infinite; }
  @keyframes ndSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  .nd-tagro-empty { margin: 0; font-size: 12.5px; color: var(--text-muted); line-height: 1.55; font-weight: 500; }

  .nd-tagro-block { display: flex; flex-direction: column; gap: 6px; }
  .nd-tagro-label { margin: 0; font-size: 10.5px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--text-muted); }
  .nd-tagro-summary { margin: 0; font-size: 13px; line-height: 1.55; color: var(--text); font-weight: 500; }
  .nd-chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .nd-chip {
    display: inline-flex; align-items: center;
    height: 22px; padding: 0 9px; border-radius: 999px;
    background: var(--card); border: 1px solid var(--border);
    font-size: 11px; font-weight: 500; color: var(--text-secondary);
  }
  .nd-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
  .nd-list li { font-size: 12.5px; line-height: 1.55; color: var(--text-secondary); font-weight: 500; }

  .nd-task-list { display: flex; flex-direction: column; gap: 8px; }
  .nd-task-row {
    display: flex; gap: 10px; align-items: flex-start;
    padding: 10px 12px;
    background: var(--card); border: 1px solid var(--border); border-radius: 10px;
    cursor: pointer; transition: border-color .12s;
  }
  .nd-task-row:hover:not(.done) { border-color: color-mix(in srgb, var(--accent) 35%, var(--border)); }
  .nd-task-row.done { opacity: .65; cursor: default; }
  .nd-task-row input { margin-top: 2px; }
  .nd-task-meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .nd-task-meta strong { font-size: 13px; font-weight: 500; letter-spacing: -.005em; color: var(--text); }
  .nd-task-meta span { font-size: 12px; color: var(--text-secondary); font-weight: 500; line-height: 1.45; }
  .nd-task-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
  .nd-prio {
    display: inline-flex; align-items: center; height: 18px; padding: 0 7px;
    border-radius: 999px; font-size: 10px; font-weight: 500; letter-spacing: .04em; text-transform: uppercase;
  }
  .prio-high { background: color-mix(in srgb, #ef4444 14%, transparent); color: #ef4444; }
  .prio-medium { background: color-mix(in srgb, #f59e0b 14%, transparent); color: #f59e0b; }
  .prio-low { background: color-mix(in srgb, #22c55e 14%, transparent); color: #22c55e; }
  .nd-est { font-size: 10.5px; color: var(--text-muted); }
  .nd-done {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 10.5px; color: var(--green, #22c55e); font-weight: 500;
  }

  .nd-spawn-btn {
    align-self: flex-start;
    height: 30px; padding: 0 14px; border: 0;
    border-radius: 999px;
    background: var(--btn-prim); color: var(--btn-prim-text);
    font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer; transition: opacity .12s, transform .12s;
  }
  .nd-spawn-btn:hover:not(:disabled) { opacity: .92; }
  .nd-spawn-btn:active:not(:disabled) { transform: scale(.97); }
  .nd-spawn-btn:disabled { opacity: .4; cursor: not-allowed; }

  .nd-share { display: flex; flex-direction: column; gap: 8px; padding-top: 14px; border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent); }
  .nd-share-label { display: inline-flex; align-items: center; gap: 5px; margin: 0; font-size: 10.5px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--text-muted); }
  .nd-share-empty { margin: 0; font-size: 12px; color: var(--text-muted); font-weight: 500; }
  .nd-share-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .nd-share-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 8px 4px 10px; border-radius: 999px;
    background: var(--surface-2); border: 1px solid var(--border);
    font-size: 11.5px; font-weight: 500; color: var(--text);
  }
  .nd-share-chip button { background: transparent; border: 0; color: var(--text-muted); cursor: pointer; padding: 2px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; }
  .nd-share-chip button:hover { background: var(--card); color: var(--text); }
  .nd-share-row { display: flex; gap: 6px; }
  .nd-share-row input {
    flex: 1; min-width: 0;
    height: 32px; padding: 0 12px; border-radius: 10px;
    background: var(--card); border: 1px solid var(--border);
    color: var(--text); font: inherit; font-size: 12.5px; font-weight: 500;
    outline: 0;
  }
  .nd-share-row input:focus { border-color: color-mix(in srgb, var(--text) 30%, var(--border)); }
  .nd-share-row button {
    height: 32px; padding: 0 14px; border-radius: 10px;
    background: var(--btn-prim); color: var(--btn-prim-text); border: 0;
    font: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
  }
  .nd-share-row button:disabled { opacity: .4; cursor: not-allowed; }
  .nd-share-error { margin: 0; font-size: 12px; color: #ef4444; font-weight: 500; }

  .nd-spawned { padding-top: 14px; border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent); }
  .nd-spawned-label { margin: 0 0 8px; font-size: 10.5px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--text-muted); }
  .nd-spawned-list { display: flex; flex-direction: column; gap: 6px; }
  .nd-spawned-row {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; border-radius: 8px;
    background: var(--card); border: 1px solid var(--border);
    font-size: 12.5px; color: var(--text); font-weight: 500;
  }
  .nd-spawned-row svg { color: var(--green, #22c55e); flex-shrink: 0; }
  .nd-spawned-row small { margin-left: auto; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }

  @media (max-width: 720px) {
    .nd-panel { width: 100vw; }
  }
`
