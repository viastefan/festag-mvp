'use client'

/**
 * /dev/messages — Execution Inbox (Portal-Stil im Dev-Panel).
 *
 * Operator-facing Feed aus `notifications` — gleiche visuelle Sprache
 * wie Client-Posteingang und Entscheidungen.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TagroEntryButton from '@/components/TagroEntryButton'
import { INBOX_CSS } from '@/components/inbox/inbox-styles'
import {
  ArrowClockwise, ChatCircleDots, CheckCircle, ClipboardText, FunnelSimple,
  PaperPlaneTilt, Robot, Sparkle, Tray, UserPlus, WarningCircle, Sliders,
} from '@phosphor-icons/react'

type Notification = {
  id: string
  project_id: string | null
  task_id: string | null
  audience: string | null
  kind: string | null
  type: string | null
  title: string | null
  body: string | null
  message?: string | null
  link: string | null
  payload: Record<string, unknown> | null
  read: boolean | null
  read_at: string | null
  created_at: string
}

type Tone = 'default' | 'good' | 'warn' | 'risk' | 'accent'

const KIND_LABEL: Record<string, string> = {
  client_request_created: 'Client-Anfrage',
  blocker_reported:       'Blocker',
  owner_changes_requested:'Änderungen angefordert',
  quality_issue:          'Qualitätsfrage',
  finished_by_dev:        'Zur Prüfung',
  needs_review:           'Review nötig',
  proof_missing:          'Nachweise fehlen',
  tagro_verified:         'Verifiziert',
  approved_by_owner:      'Freigegeben',
  task_assigned:          'Zugewiesen',
  project_available:      'Neues Projekt',
  work_log:               'Update',
  status_changed:         'Status',
  proof_added:            'Nachweis',
  conversation_summary:   'Zusammenfassung',
  dev_joined:             'Beigetreten',
}

const KIND_TONE: Record<string, Tone> = {
  client_request_created: 'warn',
  blocker_reported:       'risk',
  owner_changes_requested:'risk',
  quality_issue:          'risk',
  finished_by_dev:        'accent',
  needs_review:           'warn',
  proof_missing:          'warn',
  tagro_verified:         'good',
  approved_by_owner:      'good',
  task_assigned:          'accent',
  project_available:      'accent',
}

const KIND_ACTION: Record<string, string> = {
  client_request_created: 'Anfrage sichten',
  blocker_reported:       'Klärung vorbereiten',
  owner_changes_requested:'Änderungen umsetzen',
  quality_issue:          'Task überarbeiten',
  needs_review:           'Nachweise ergänzen',
  proof_missing:          'Belege hochladen',
  task_assigned:          'Task öffnen',
  project_available:      'Projekt ansehen',
}

const GROUP: Record<string, string[]> = {
  client:   ['client_request_created'],
  blockers: ['blocker_reported', 'owner_changes_requested', 'quality_issue'],
  review:   ['finished_by_dev', 'needs_review', 'proof_missing', 'tagro_verified'],
  approved: ['approved_by_owner'],
  assigned: ['task_assigned', 'project_available'],
}

const ACTIONABLE = new Set([
  'client_request_created', 'blocker_reported', 'owner_changes_requested',
  'quality_issue', 'needs_review', 'proof_missing', 'task_assigned',
])

type FilterId = 'all' | 'unread' | 'client' | 'blockers' | 'review' | 'approved' | 'assigned'
const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',      label: 'Alle' },
  { id: 'unread',   label: 'Ungelesen' },
  { id: 'client',   label: 'Client' },
  { id: 'blockers', label: 'Blocker' },
  { id: 'review',   label: 'Prüfung' },
  { id: 'approved', label: 'Freigaben' },
  { id: 'assigned', label: 'Zugewiesen' },
]

function rawKind(n: Notification) { return (n.kind ?? n.type ?? '') as string }
function tone(n: Notification): Tone { return KIND_TONE[rawKind(n)] ?? 'default' }
function iconFor(n: Notification) {
  const k = rawKind(n)
  if (k === 'client_request_created') return <PaperPlaneTilt size={16} weight="regular" />
  if (GROUP.blockers.includes(k))     return <WarningCircle size={16} weight="regular" />
  if (k === 'tagro_verified' || k === 'approved_by_owner') return <CheckCircle size={16} weight="regular" />
  if (GROUP.review.includes(k))       return <Robot size={16} weight="regular" />
  if (k === 'task_assigned' || k === 'project_available') return <ClipboardText size={16} weight="regular" />
  if (k === 'conversation_summary')   return <ChatCircleDots size={16} weight="regular" />
  if (k === 'dev_joined')             return <UserPlus size={16} weight="regular" />
  return <Sparkle size={16} weight="regular" />
}
function fmtAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d} Tag${d === 1 ? '' : 'en'}`
  return new Date(iso).toLocaleDateString('de-DE')
}

export default function DevMessagesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterId>('all')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [projectsById, setProjectsById] = useState<Map<string, { title: string; color: string | null }>>(new Map())
  const filterWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!filterMenuOpen) return
    function onDoc(e: MouseEvent) {
      if (filterWrapRef.current && !filterWrapRef.current.contains(e.target as Node)) setFilterMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFilterMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [filterMenuOpen])

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const [{ data: rows }, { data: projects }] = await Promise.all([
      (supabase as any).from('notifications')
        .select('id,project_id,task_id,audience,kind,type,title,body,message,link,payload,read,read_at,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200),
      (supabase as any).from('projects').select('id,title,color'),
    ])
    setItems(((rows as Notification[] | null) ?? []))
    const map = new Map<string, { title: string; color: string | null }>()
    for (const p of (projects as any[] | null) ?? []) map.set(p.id, { title: p.title, color: p.color })
    setProjectsById(map)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let channel: any
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      channel = (supabase as any)
        .channel(`dev-inbox-${user.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload: any) => setItems(curr => [payload.new as Notification, ...curr]))
        .subscribe()
    })()
    return () => { if (channel) (supabase as any).removeChannel(channel) }
  }, [supabase])

  const filtered = useMemo(() => {
    if (filter === 'all')    return items
    if (filter === 'unread') return items.filter(n => !n.read)
    const kinds = GROUP[filter] ?? []
    return items.filter(n => kinds.includes(rawKind(n)))
  }, [items, filter])

  const counts = useMemo(() => ({
    all: items.length,
    unread: items.filter(n => !n.read).length,
    action: items.filter(n => !n.read && ACTIONABLE.has(rawKind(n))).length,
  }), [items])

  async function markRead(id: string) {
    const target = items.find(n => n.id === id)
    if (!target || target.read) return
    setItems(curr => curr.map(n => n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
    await (supabase as any).from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', id)
  }

  async function markAllRead() {
    const unreadIds = items.filter(n => !n.read).map(n => n.id)
    if (!unreadIds.length) return
    setItems(curr => curr.map(n => unreadIds.includes(n.id) ? { ...n, read: true, read_at: new Date().toISOString() } : n))
    await (supabase as any).from('notifications').update({ read: true, read_at: new Date().toISOString() }).in('id', unreadIds)
  }

  const filterActive = filter !== 'all'
  const activeFilter = FILTERS.find(f => f.id === filter) || FILTERS[0]

  const leadLine = loading
    ? 'Inbox wird geladen…'
    : counts.action > 0
      ? `${counts.unread} ungelesen · ${counts.action} mit offener Aktion`
      : counts.unread > 0
        ? `${counts.unread} ungelesene Hinweise — sortiert nach Dringlichkeit.`
        : `${counts.all} Einträge — alles gelesen.`

  function countForFilter(id: FilterId) {
    if (id === 'all') return counts.all
    if (id === 'unread') return counts.unread
    return items.filter(it => (GROUP[id] ?? []).includes(rawKind(it))).length
  }

  return (
    <div className="inb-os inb-os--dev">
      <style>{INBOX_CSS}</style>

      <div className="inb-static-top">
        <header className="inb-page-head">
          <div className="inb-page-head-copy">
            <h1 className="inb-page-title">Inbox</h1>
            <div className="inb-page-lead">
              <p>{leadLine}</p>
            </div>
          </div>
          <div className="inb-page-actions">
            <div className="inb-page-actions-group">
              <div className="inb-filter-wrap" ref={filterWrapRef}>
                <button
                  type="button"
                  className={`inb-head-tool${filterMenuOpen || filterActive ? ' on' : ''}`}
                  title="Filter"
                  aria-label="Filter"
                  aria-expanded={filterMenuOpen}
                  onClick={() => setFilterMenuOpen(v => !v)}
                >
                  <FunnelSimple size={15} weight="regular" />
                </button>
                {filterMenuOpen && (
                  <div className="inb-filter-menu" role="menu" aria-label="Filter">
                    <p className="inb-filter-menu-label">Ansicht</p>
                    {FILTERS.map(f => {
                      const n = countForFilter(f.id)
                      return (
                        <button
                          key={f.id}
                          type="button"
                          role="menuitem"
                          className={`inb-filter-menu-item${filter === f.id ? ' on' : ''}`}
                          onClick={() => { setFilter(f.id); setFilterMenuOpen(false) }}
                        >
                          <Tray size={14} weight="regular" />
                          <span className="inb-filter-menu-item-main">
                            <strong>{f.label}</strong>
                          </span>
                          {n > 0 && <span className="inb-filter-count">{n}</span>}
                          {filter === f.id && <span className="inb-filter-check">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              {counts.unread > 0 && (
                <button type="button" className="inb-head-tool" title="Alles gelesen" onClick={markAllRead}>
                  <CheckCircle size={15} weight="regular" />
                </button>
              )}
            </div>
            <button type="button" className="inb-head-tool" title="Aktualisieren" onClick={load} disabled={loading}>
              <ArrowClockwise size={15} weight="regular" />
            </button>
            <TagroEntryButton
              context={{
                contextType: 'empty',
                id: 'dev-inbox',
                title: 'Inbox · Triage',
                subtitle: `${counts.all} Einträge · ${counts.unread} ungelesen`,
              }}
            />
          </div>
        </header>
      </div>

      <div className="inb-scroll-body">
        <div className="inb-list-toolbar" style={{ padding: '0 0 12px' }}>
          <span className="inb-list-toolbar-label">
            {activeFilter.label}
            {filtered.length > 0 && ` · ${filtered.length}`}
          </span>
        </div>

        {loading && filtered.length === 0 ? (
          <p className="inb-loading">Inbox wird geladen…</p>
        ) : filtered.length === 0 ? (
          <div className="inb-empty">
            <Tray size={24} weight="regular" />
            <p className="inb-empty-title">Keine Einträge</p>
            <p className="inb-empty-sub">
              Client-Anfragen, Blocker, Prüf-Ergebnisse und Freigaben landen hier — sobald ein Projekt in die Ausführung geht.
            </p>
            <Link href="/dev/tasks" style={{ marginTop: 8, textDecoration: 'none' }}>
              <button type="button" className="inb-head-tool" style={{ width: 'auto', borderRadius: 999, padding: '0 16px', height: 36 }}>
                Zu meinen Aufgaben
              </button>
            </Link>
          </div>
        ) : (
          <div className="inb-feed">
            {filtered.map(n => {
              const k = rawKind(n)
              const t = tone(n)
              const label = KIND_LABEL[k] ?? 'Update'
              const action = !n.read ? KIND_ACTION[k] : undefined
              const project = n.project_id ? projectsById.get(n.project_id) : null
              const Wrap: any = n.link ? Link : 'button'
              const wrapProps: any = n.link
                ? { href: n.link, onClick: () => markRead(n.id) }
                : { type: 'button', onClick: () => markRead(n.id) }
              return (
                <Wrap key={n.id} className={`inb-feed-row tone-${t}${n.read ? ' read' : ''}`} {...wrapProps}>
                  <span className="inb-feed-icon">{iconFor(n)}</span>
                  <div className="inb-feed-main">
                    <div className="inb-feed-meta">
                      <span className={`inb-feed-badge tone-${t}`}>{label}</span>
                      {project && (
                        <span className="inb-feed-project">
                          <span className="inb-feed-dot" style={{ background: project.color || 'var(--inb-muted)' }} />
                          {project.title}
                        </span>
                      )}
                      {!n.read && <span className="inb-feed-unread" aria-label="ungelesen" />}
                    </div>
                    <p className="inb-feed-title">{n.title || n.body || n.message || label}</p>
                    {(n.body || n.message) && n.title && <p className="inb-feed-body">{n.body || n.message}</p>}
                    {action && <span className="inb-feed-action">{action} →</span>}
                  </div>
                  <div className="inb-feed-side">
                    <span className="inb-feed-time">{fmtAgo(n.created_at)}</span>
                  </div>
                </Wrap>
              )
            })}
          </div>
        )}

        <p className="inb-foot">
          <Sliders size={13} weight="regular" />
          Tagro übersetzt operative Ereignisse in geprüfte Statusinformationen. Diese Inbox zeigt deine internen Hinweise — der Client sieht nur die freigegebene Sicht.
        </p>
      </div>
    </div>
  )
}
