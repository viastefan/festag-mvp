'use client'

/**
 * /inbox — mobile-first action + notification centre.
 *
 * Renders all `notifications` rows for the current user as calm cards.
 * Conversation summaries, dev_joined pings, project_available drops,
 * payment / blocker / review handoffs all live here. Filter chips
 * narrow by kind. Tap a card → mark read + jump to its link.
 *
 * Works on desktop too (same surface), but the layout density is
 * tuned for the small screen.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ChatCircleDots, CheckCircle, ClipboardText, FunnelSimple,
  Sparkle, Tray, UserPlus, WarningCircle,
} from '@phosphor-icons/react'

type Notification = {
  id: string
  user_id: string
  project_id: string | null
  task_id: string | null
  audience: string | null
  kind: string | null
  type: string | null
  title: string | null
  body: string | null
  link: string | null
  payload: Record<string, unknown> | null
  read: boolean | null
  read_at: string | null
  created_at: string
}

const KIND_LABEL: Record<string, string> = {
  conversation_summary: 'Chat-Summary',
  project_available:    'Neues Projekt',
  dev_joined:           'Dev übernommen',
  client_request_created: 'Neue Anfrage',
  finished_by_dev:      'Bereit zur Prüfung',
  tagro_verified:       'Verifiziert',
  approved_by_owner:    'Freigegeben',
  needs_review:         'Review nötig',
  blocker_reported:     'Blocker',
  owner_changes_requested: 'Änderungen',
  proof_added:          'Nachweis',
  status_changed:       'Status',
  task_assigned:        'Zugewiesen',
}

const KIND_TONE: Record<string, 'default' | 'good' | 'warn' | 'risk' | 'accent'> = {
  conversation_summary: 'accent',
  project_available:    'accent',
  dev_joined:           'good',
  client_request_created: 'warn',
  finished_by_dev:      'good',
  tagro_verified:       'good',
  approved_by_owner:    'good',
  needs_review:         'warn',
  blocker_reported:     'risk',
  owner_changes_requested: 'risk',
}

type FilterId = 'all' | 'unread' | 'reviews' | 'briefings' | 'risks' | 'chats'
const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',       label: 'Alle' },
  { id: 'unread',    label: 'Ungelesen' },
  { id: 'reviews',   label: 'Freigaben' },
  { id: 'briefings', label: 'Briefings' },
  { id: 'risks',     label: 'Risiken' },
  { id: 'chats',     label: 'Chats' },
]

const REVIEW_KINDS = new Set(['finished_by_dev', 'needs_review', 'tagro_verified', 'approved_by_owner', 'owner_changes_requested'])
const BRIEFING_KINDS = new Set(['conversation_summary', 'project_available', 'status_changed'])
const RISK_KINDS = new Set(['blocker_reported', 'owner_changes_requested'])
const CHAT_KINDS = new Set(['conversation_summary', 'dev_joined', 'client_request_created'])

function tone(kind: string | null) {
  return KIND_TONE[(kind ?? '') as keyof typeof KIND_TONE] ?? 'default'
}
function iconFor(kind: string | null) {
  if (REVIEW_KINDS.has(kind ?? ''))   return <CheckCircle size={14} weight="regular" />
  if (RISK_KINDS.has(kind ?? ''))     return <WarningCircle size={14} weight="regular" />
  if (kind === 'conversation_summary') return <ChatCircleDots size={14} />
  if (kind === 'project_available')   return <ClipboardText size={14} />
  if (kind === 'dev_joined')          return <UserPlus size={14} />
  return <Sparkle size={14} />
}
function fmtAgo(iso: string) {
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

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterId>('all')
  const [projectsById, setProjectsById] = useState<Map<string, { title: string; color: string | null }>>(new Map())

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const [{ data: rows }, { data: projects }] = await Promise.all([
      (supabase as any).from('notifications')
        .select('id,user_id,project_id,task_id,audience,kind,type,title,body,link,payload,read,read_at,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300),
      (supabase as any).from('projects').select('id,title,color'),
    ])
    setItems(((rows as Notification[] | null) ?? []))
    const map = new Map<string, { title: string; color: string | null }>()
    for (const p of (projects as any[] | null) ?? []) {
      map.set(p.id, { title: p.title, color: p.color })
    }
    setProjectsById(map)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (filter === 'all')       return items
    if (filter === 'unread')    return items.filter(n => !n.read)
    if (filter === 'reviews')   return items.filter(n => REVIEW_KINDS.has(n.kind ?? n.type ?? ''))
    if (filter === 'briefings') return items.filter(n => BRIEFING_KINDS.has(n.kind ?? n.type ?? ''))
    if (filter === 'risks')     return items.filter(n => RISK_KINDS.has(n.kind ?? n.type ?? ''))
    if (filter === 'chats')     return items.filter(n => CHAT_KINDS.has(n.kind ?? n.type ?? ''))
    return items
  }, [items, filter])

  const counts = useMemo(() => ({
    all: items.length,
    unread: items.filter(n => !n.read).length,
  }), [items])

  async function markRead(id: string) {
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
    <div className="inbox-page">
      <header className="ix-head">
        <div>
          <h1>Inbox</h1>
          <p className="ix-meta">
            {loading ? 'Lade…' : `${counts.all} Items · ${counts.unread} ungelesen`}
          </p>
        </div>
        <div className="ix-head-actions">
          <button type="button" className="ix-secondary" onClick={load} disabled={loading}>
            {loading ? 'Lade…' : 'Aktualisieren'}
          </button>
          {counts.unread > 0 && (
            <button type="button" className="ix-secondary" onClick={markAllRead}>
              Alles gelesen
            </button>
          )}
        </div>
      </header>

      <div className="ix-toolbar">
        <div className="ix-filters">
          <FunnelSimple size={12} className="ix-filter-icon" />
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              className={`ix-filter${filter === f.id ? ' on' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section className="ix-list">
        {loading && filtered.length === 0 ? (
          <p className="ix-empty">Inbox wird geladen…</p>
        ) : filtered.length === 0 ? (
          <div className="ix-empty">
            <Tray size={20} weight="regular" />
            <p><strong>Inbox ist leer.</strong></p>
            <p>Wichtige Zusammenfassungen, Freigaben und Updates landen hier.</p>
            <Link href="/ai" className="ix-primary">Tagro fragen</Link>
          </div>
        ) : filtered.map(n => {
          const t = tone(n.kind ?? n.type ?? '')
          const label = KIND_LABEL[(n.kind ?? n.type ?? '') as keyof typeof KIND_LABEL] ?? 'Update'
          const project = n.project_id ? projectsById.get(n.project_id) : null
          const Wrap: any = n.link ? Link : 'div'
          const wrapProps: any = n.link ? { href: n.link, onClick: () => markRead(n.id) } : { onClick: () => markRead(n.id) }
          return (
            <Wrap
              key={n.id}
              className={`ix-row tone-${t}${n.read ? ' read' : ''}`}
              {...wrapProps}
            >
              <span className="ix-row-icon">{iconFor(n.kind ?? n.type ?? '')}</span>
              <div className="ix-row-main">
                <div className="ix-row-meta">
                  <span className={`ix-badge tone-${t}`}>{label}</span>
                  {project && (
                    <span className="ix-project">
                      <span className="ix-project-dot" style={{ background: project.color || 'var(--text-muted)' }} />
                      {project.title}
                    </span>
                  )}
                  {!n.read && <span className="ix-unread-dot" aria-label="ungelesen" />}
                  <span className="ix-time">{fmtAgo(n.created_at)}</span>
                </div>
                <p className="ix-title">{n.title || label}</p>
                {n.body && <p className="ix-body">{n.body}</p>}
              </div>
            </Wrap>
          )
        })}
      </section>

      <style jsx>{`
        .inbox-page { padding: 22px 18px 96px; max-width: 880px; margin: 0 auto; }
        @media (min-width: 768px) { .inbox-page { padding: 26px 28px 48px; } }

        .ix-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
        .ix-eyebrow { margin: 0 0 4px; font-size: 10.5px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); }
        h1 { margin: 0; font-size: 22px; font-weight: 500; letter-spacing: -.01em; color: var(--text); }
        .ix-meta { margin: 4px 0 0; font-size: 12.5px; color: var(--text-muted); font-weight: 500; }
        .ix-head-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .ix-secondary {
          height: 30px; padding: 0 12px; border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          background: transparent; color: var(--text-secondary);
          font: inherit; font-size: 11.5px; font-weight: 500; letter-spacing: .015em;
          cursor: pointer; transition: background .12s, color .12s;
        }
        .ix-secondary:hover:not(:disabled) {
          background: color-mix(in srgb, var(--surface-2) 60%, transparent); color: var(--text);
        }
        .ix-secondary:disabled { opacity: .5; cursor: not-allowed; }

        .ix-toolbar { margin-bottom: 12px; }
        .ix-filters { display: inline-flex; align-items: center; gap: 4px; padding: 4px; border-radius: 999px; background: color-mix(in srgb, var(--surface-2) 50%, transparent); overflow-x: auto; max-width: 100%; -webkit-overflow-scrolling: touch; }
        .ix-filter-icon { margin: 0 4px 0 8px; color: var(--text-muted); flex-shrink: 0; }
        .ix-filter {
          height: 26px; padding: 0 12px; border: 0;
          border-radius: 999px; background: transparent;
          color: var(--text-muted); font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .015em;
          cursor: pointer; flex-shrink: 0;
        }
        .ix-filter:hover { color: var(--text); }
        .ix-filter.on { background: var(--card); color: var(--text); box-shadow: 0 1px 2px color-mix(in srgb, var(--text) 8%, transparent); }

        .ix-list { display: flex; flex-direction: column; gap: 8px; }
        .ix-empty {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          padding: 38px 18px;
          border: 1px dashed color-mix(in srgb, var(--border) 60%, transparent);
          border-radius: 16px;
          color: var(--text-muted); font-size: 12.5px; line-height: 1.55;
          text-align: center;
        }
        .ix-empty strong { color: var(--text); font-size: 14px; }
        .ix-empty svg { color: var(--text-muted); }
        .ix-primary {
          display: inline-flex; align-items: center; height: 32px; padding: 0 14px;
          margin-top: 4px;
          background: var(--btn-prim); color: var(--btn-prim-text);
          border-radius: 999px; text-decoration: none;
          font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .015em;
        }
        .ix-primary:hover { opacity: .92; }

        .ix-row {
          display: grid; grid-template-columns: 32px 1fr; gap: 12px; align-items: flex-start;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
          background: color-mix(in srgb, var(--card) 96%, transparent);
          color: var(--text); text-decoration: none;
          cursor: pointer; transition: background .12s, border-color .12s;
        }
        .ix-row:hover { background: var(--card); border-color: var(--border); }
        .ix-row.read { opacity: .72; }
        .ix-row-icon {
          width: 32px; height: 32px; border-radius: 10px;
          display: inline-flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--surface-2) 65%, transparent);
          color: var(--text-secondary); flex-shrink: 0;
        }
        .ix-row.tone-good .ix-row-icon { background: color-mix(in srgb, #22a06b 14%, transparent); color: #22a06b; }
        .ix-row.tone-warn .ix-row-icon { background: color-mix(in srgb, #d4882b 14%, transparent); color: #d4882b; }
        .ix-row.tone-risk .ix-row-icon { background: color-mix(in srgb, #d44b4b 14%, transparent); color: #d44b4b; }
        .ix-row.tone-accent .ix-row-icon { background: color-mix(in srgb, var(--btn-prim) 16%, transparent); color: var(--btn-prim); }

        .ix-row-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .ix-row-meta {
          display: flex; align-items: center; gap: 8px;
          flex-wrap: wrap; row-gap: 4px;
        }
        .ix-badge {
          display: inline-flex; align-items: center;
          height: 18px; padding: 0 8px; border-radius: 999px;
          font-size: 9.5px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase;
          background: color-mix(in srgb, var(--surface-2) 65%, transparent);
          color: var(--text-secondary);
        }
        .ix-badge.tone-good   { color: #22a06b; background: color-mix(in srgb, #22a06b 12%, transparent); }
        .ix-badge.tone-warn   { color: #d4882b; background: color-mix(in srgb, #d4882b 12%, transparent); }
        .ix-badge.tone-risk   { color: #d44b4b; background: color-mix(in srgb, #d44b4b 12%, transparent); }
        .ix-badge.tone-accent { color: var(--btn-prim); background: color-mix(in srgb, var(--btn-prim) 14%, transparent); }
        .ix-project {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; color: var(--text-muted); font-weight: 500; letter-spacing: .015em;
          max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ix-project-dot { width: 6px; height: 6px; border-radius: 50%; }
        .ix-time { font-size: 11px; color: var(--text-muted); font-weight: 500; margin-left: auto; }
        .ix-unread-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--btn-prim);
        }
        .ix-title {
          margin: 0; font-size: 13.5px; font-weight: 500; letter-spacing: -.005em;
          color: var(--text); line-height: 1.4;
        }
        .ix-body {
          margin: 0; font-size: 12px; line-height: 1.5;
          color: var(--text-muted); font-weight: 500; letter-spacing: .012em;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
      `}</style>
    </div>
  )
}
