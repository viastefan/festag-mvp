'use client'

/**
 * /dev/messages — Execution Inbox.
 *
 * The dev-side counterpart to the client `/inbox`. Reads the same
 * `notifications` table (RLS scopes every row to `user_id = auth.uid()`),
 * but classifies and labels events the way an operator needs to act on
 * them: client requests, blockers, verification handoffs, approvals,
 * assignments. Every actionable kind carries a calm "next action" hint
 * (festag_task_flow → Next Actions) so the dev always knows the move.
 *
 * Tagro is a writing layer, never a chat partner — so this surface stays
 * a quiet operations feed, not a messenger. Click a row → mark read +
 * jump to the underlying task or project.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TagroEntryButton from '@/components/TagroEntryButton'
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

/** Calm, operator-facing label per raw event kind. */
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

/** The move the dev should make — surfaced as a quiet hint, not a CTA shout. */
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

/** Filter groups, by raw kind. */
const GROUP: Record<string, string[]> = {
  client:   ['client_request_created'],
  blockers: ['blocker_reported', 'owner_changes_requested', 'quality_issue'],
  review:   ['finished_by_dev', 'needs_review', 'proof_missing', 'tagro_verified'],
  approved: ['approved_by_owner'],
  assigned: ['task_assigned', 'project_available'],
}
/** Kinds that demand a dev action (drives the "needs action" KPI + dot). */
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
  if (k === 'client_request_created') return <PaperPlaneTilt size={14} weight="regular" />
  if (GROUP.blockers.includes(k))     return <WarningCircle size={14} weight="regular" />
  if (k === 'tagro_verified' || k === 'approved_by_owner') return <CheckCircle size={14} weight="regular" />
  if (GROUP.review.includes(k))       return <Robot size={14} weight="regular" />
  if (k === 'task_assigned')          return <ClipboardText size={14} weight="regular" />
  if (k === 'project_available')      return <ClipboardText size={14} weight="regular" />
  if (k === 'conversation_summary')   return <ChatCircleDots size={14} weight="regular" />
  if (k === 'dev_joined')             return <UserPlus size={14} weight="regular" />
  return <Sparkle size={14} weight="regular" />
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
  const [projectsById, setProjectsById] = useState<Map<string, { title: string; color: string | null }>>(new Map())

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }   // DevAppShell gates access — never hard-bounce
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

  // Realtime: a new notification for me drops in without a manual refresh.
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

  return (
    <div className="dev-page">
      <header className="dev-page-header">
        <div>
          <p className="dev-eyebrow">Execution · Inbox</p>
          <h1>Inbox</h1>
          <p className="meta">
            {loading ? 'Lade…'
              : counts.action > 0
                ? `${counts.unread} ungelesen · ${counts.action} mit offener Aktion`
                : `${counts.all} Einträge · ${counts.unread} ungelesen`}
          </p>
        </div>
        <div className="im-head-actions">
          <button type="button" className="dev-secondary-btn" onClick={load} disabled={loading}>
            <ArrowClockwise size={14} weight="regular" /> {loading ? 'Lade…' : 'Aktualisieren'}
          </button>
          {counts.unread > 0 && (
            <button type="button" className="dev-secondary-btn" onClick={markAllRead}>
              Alles gelesen
            </button>
          )}
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

      <div className="im-toolbar">
        <div className="im-filters">
          <FunnelSimple size={12} className="im-filter-icon" />
          {FILTERS.map(f => {
            const n = f.id === 'all' ? counts.all
              : f.id === 'unread' ? counts.unread
              : items.filter(it => (GROUP[f.id] ?? []).includes(rawKind(it))).length
            return (
              <button
                key={f.id}
                type="button"
                className={`im-filter${filter === f.id ? ' on' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}{n > 0 && <span className="im-filter-count">{n}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <section className="im-list">
        {loading && filtered.length === 0 ? (
          <p className="im-loading">Inbox wird geladen…</p>
        ) : filtered.length === 0 ? (
          <div className="im-empty dev-surface">
            <Tray size={20} weight="regular" />
            <p><strong>Keine Einträge.</strong></p>
            <p>Client-Anfragen, Blocker, Prüf-Ergebnisse und Freigaben landen hier — sobald ein Projekt in die Ausführung geht.</p>
            <Link href="/dev/tasks" className="dev-primary-btn">Zu meinen Aufgaben</Link>
          </div>
        ) : filtered.map(n => {
          const k = rawKind(n)
          const t = tone(n)
          const label = KIND_LABEL[k] ?? 'Update'
          const action = !n.read ? KIND_ACTION[k] : undefined
          const project = n.project_id ? projectsById.get(n.project_id) : null
          const Wrap: any = n.link ? Link : 'div'
          const wrapProps: any = n.link
            ? { href: n.link, onClick: () => markRead(n.id) }
            : { onClick: () => markRead(n.id) }
          return (
            <Wrap key={n.id} className={`im-row tone-${t}${n.read ? ' read' : ''}`} {...wrapProps}>
              <span className="im-row-icon">{iconFor(n)}</span>
              <div className="im-row-main">
                <div className="im-row-meta">
                  <span className={`im-badge tone-${t}`}>{label}</span>
                  {project && (
                    <span className="im-project">
                      <span className="im-project-dot" style={{ background: project.color || 'var(--text-muted)' }} />
                      {project.title}
                    </span>
                  )}
                  {!n.read && <span className="im-unread-dot" aria-label="ungelesen" />}
                  <span className="im-time">{fmtAgo(n.created_at)}</span>
                </div>
                <p className="im-title">{n.title || n.body || n.message || label}</p>
                {(n.body || n.message) && n.title && <p className="im-body">{n.body || n.message}</p>}
                {action && <span className="im-action">{action} →</span>}
              </div>
            </Wrap>
          )
        })}
      </section>

      <p className="im-foot">
        <Sliders size={12} weight="regular" />
        Tagro übersetzt operative Ereignisse in geprüfte Statusinformationen. Diese Inbox zeigt deine internen Hinweise — der Client sieht nur die freigegebene Sicht.
      </p>

      <style jsx>{`
        .im-head-actions { display: flex; gap: 8px; flex-shrink: 0; }

        .im-toolbar { margin-bottom: 14px; }
        .im-filters {
          display: inline-flex; align-items: center; gap: 4px; padding: 4px;
          border-radius: 10px; background: color-mix(in srgb, var(--surface-2) 55%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
          overflow-x: auto; max-width: 100%; -webkit-overflow-scrolling: touch;
        }
        .im-filter-icon { margin: 0 4px 0 6px; color: var(--text-muted); flex-shrink: 0; }
        .im-filter {
          height: 26px; padding: 0 11px; border: 0; border-radius: 7px;
          background: transparent; color: var(--text-muted);
          font: inherit; font-size: 12px; font-weight: 500; letter-spacing: var(--ls-body, .017em);
          cursor: pointer; flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px;
          white-space: nowrap;
        }
        .im-filter:hover { color: var(--text); }
        .im-filter.on { background: var(--surface); color: var(--text); box-shadow: 0 1px 2px color-mix(in srgb, #000 14%, transparent); }
        .im-filter-count {
          min-width: 16px; height: 16px; padding: 0 4px; border-radius: 5px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 500;
          background: color-mix(in srgb, var(--surface-2) 80%, transparent); color: var(--text-secondary);
        }
        .im-filter.on .im-filter-count { background: color-mix(in srgb, var(--btn-prim) 18%, transparent); color: var(--btn-prim); }

        .im-list { display: flex; flex-direction: column; gap: 7px; }
        .im-loading { color: var(--text-muted); font-size: 12.5px; padding: 8px 2px; }
        .im-empty {
          display: flex; flex-direction: column; align-items: center; gap: 9px;
          padding: 40px 20px; text-align: center;
          color: var(--text-muted); font-size: 12.5px; line-height: 1.55;
        }
        .im-empty strong { color: var(--text); font-size: 14px; }
        .im-empty :global(.dev-primary-btn) { margin-top: 6px; text-decoration: none; }

        .im-row {
          display: grid; grid-template-columns: 30px 1fr; gap: 12px; align-items: flex-start;
          padding: 11px 13px; border-radius: 10px;
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          background: var(--surface);
          color: var(--text); text-decoration: none;
          cursor: pointer; transition: background .12s ease, border-color .12s ease;
        }
        .im-row:hover { background: color-mix(in srgb, var(--surface-2) 55%, var(--surface)); }
        .im-row.read { opacity: .62; }
        .im-row-icon {
          width: 30px; height: 30px; border-radius: 8px;
          display: inline-flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--surface-2) 70%, transparent);
          color: var(--text-secondary); flex-shrink: 0;
        }
        .im-row.tone-good .im-row-icon   { background: color-mix(in srgb, var(--green-dark) 16%, transparent); color: var(--green-dark); }
        .im-row.tone-warn .im-row-icon   { background: color-mix(in srgb, var(--amber) 16%, transparent); color: var(--amber); }
        .im-row.tone-risk .im-row-icon   { background: color-mix(in srgb, var(--red) 18%, transparent); color: var(--red); }
        .im-row.tone-accent .im-row-icon { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); }

        .im-row-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .im-row-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; row-gap: 4px; }
        .im-badge {
          display: inline-flex; align-items: center; height: 18px; padding: 0 8px; border-radius: 5px;
          font-size: 9.5px; font-weight: 500; letter-spacing: .07em; text-transform: uppercase;
          background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text-secondary);
        }
        .im-badge.tone-good   { color: var(--green-dark); background: color-mix(in srgb, var(--green-dark) 13%, transparent); }
        .im-badge.tone-warn   { color: var(--amber); background: color-mix(in srgb, var(--amber) 13%, transparent); }
        .im-badge.tone-risk   { color: var(--red); background: color-mix(in srgb, var(--red) 14%, transparent); }
        .im-badge.tone-accent { color: var(--accent); background: color-mix(in srgb, var(--accent) 15%, transparent); }
        .im-project {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; color: var(--text-muted); font-weight: 500;
          max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .im-project-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .im-unread-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
        .im-time { font-size: 11px; color: var(--text-muted); font-weight: 500; margin-left: auto; }
        .im-title { margin: 0; font-size: 13px; font-weight: 500; letter-spacing: -.004em; color: var(--text); line-height: 1.42; }
        .im-body {
          margin: 0; font-size: 12px; line-height: 1.5; color: var(--text-muted); font-weight: 500;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .im-action { font-size: 11px; font-weight: 500; color: var(--accent); letter-spacing: var(--ls-body, .017em); margin-top: 1px; }

        .im-foot {
          display: flex; align-items: flex-start; gap: 7px;
          margin: 22px 0 0; padding-top: 14px;
          border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
          font-size: 11.5px; line-height: 1.55; color: var(--text-muted); max-width: 720px;
        }
        .im-foot :global(svg) { flex-shrink: 0; margin-top: 2px; }

        @media (max-width: 768px) {
          .im-head-actions { width: 100%; }
          .im-head-actions :global(.dev-secondary-btn) { flex: 1; }
        }
      `}</style>
    </div>
  )
}
