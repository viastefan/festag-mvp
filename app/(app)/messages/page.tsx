'use client'

/**
 * Festag Posteingang — strukturierte Projekt-Kommunikation.
 *
 * Liest aus `inbox_items` (RLS: nur eigene). Eingänge entstehen durch:
 *   · die Willkommensnachricht (POST /api/inbox/welcome, idempotent)
 *   · Entwickler-Tagesstände (Tagro übersetzt → create_inbox_item)
 *   · System-Events (Garantie, Rechnungen) via DB-Trigger
 *
 * UI-Regeln: corner-radius ≤ 8px, Aeonik Medium (500), keine schwarzen
 * Buttons — Slate ist der einzige Akzent.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Tray, Briefcase, Receipt, UsersThree, Sparkle,
  CheckCircle, ChatCircle, ArrowSquareOut, Play, Funnel,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

type Category = 'all' | 'project' | 'billing' | 'account' | 'tagro'
type ItemType = 'update' | 'action' | 'question' | 'deliverable' | 'note'

type CategoryDef = { id: Category; label: string; icon: React.ElementType; hint: string }

const CATEGORIES: CategoryDef[] = [
  { id: 'all',     label: 'Alle',                  icon: Tray,       hint: 'Alle Eingänge zusammen.' },
  { id: 'project', label: 'Projekt',               icon: Briefcase,  hint: 'Updates, Deliverables und Fragen aus deinen Projekten.' },
  { id: 'billing', label: 'Rechnungen & Verträge', icon: Receipt,    hint: 'Festag-Rechnungen, Vertragsversand, Zahlungsbestätigungen.' },
  { id: 'account', label: 'Konto & Team',          icon: UsersThree, hint: 'Seats, Einladungen, Rollen.' },
  { id: 'tagro',   label: 'Tagro Assist',          icon: Sparkle,    hint: 'Kuratierte Zusammenfassungen und Vorschläge von Tagro.' },
]

type Item = {
  id: string
  category: Exclude<Category, 'all'>
  type: ItemType
  source: string
  project?: string
  projectId?: string
  title: string
  preview: string
  body?: string
  videoUrl?: string
  createdAt: Date
  unread: boolean
  actionable: boolean
}

const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  update: 'Update', action: 'Aktion erforderlich', question: 'Frage',
  deliverable: 'Deliverable', note: 'Notiz',
}

type DbInboxRow = {
  id: string
  thread_id: string
  user_id: string
  project_id: string | null
  category: 'tagro' | 'client' | 'team' | 'system' | 'billing' | 'support'
  type:
    | 'chat_message' | 'system_event' | 'project_event'
    | 'invoice_created' | 'payment_event' | 'guarantee_event'
    | 'support_event' | 'task_event' | 'status_update'
  title: string
  body: string | null
  metadata: any
  read_at: string | null
  created_at: string
}

function dbCategoryToUi(c: DbInboxRow['category']): Exclude<Category, 'all'> {
  if (c === 'billing') return 'billing'
  if (c === 'system' || c === 'support') return 'account'
  if (c === 'client' || c === 'team') return 'project'
  return 'tagro'
}

function dbTypeToUi(t: DbInboxRow['type'], meta: any): ItemType {
  if (meta?.actionable === true) return 'action'
  if (t === 'chat_message') return 'note'
  if (t === 'support_event') return 'question'
  return 'update'
}

function sourceLabel(c: DbInboxRow['category']): string {
  if (c === 'billing') return 'Festag Abrechnung'
  if (c === 'system') return 'Festag'
  if (c === 'support') return 'Support'
  if (c === 'tagro') return 'Tagro'
  if (c === 'team') return 'Team'
  return 'Festag Team'
}

function dbRowToItem(row: DbInboxRow, projectTitles: Record<string, string>): Item {
  return {
    id: row.id,
    category: dbCategoryToUi(row.category),
    type: dbTypeToUi(row.type, row.metadata),
    source: row.metadata?.source_label || sourceLabel(row.category),
    project: row.project_id ? projectTitles[row.project_id] : undefined,
    projectId: row.project_id ?? undefined,
    title: row.title,
    preview: (row.body ?? '').replace(/\s+/g, ' ').slice(0, 200),
    body: row.body ?? undefined,
    videoUrl: row.metadata?.video_url || undefined,
    createdAt: new Date(row.created_at),
    unread: !row.read_at,
    actionable: Boolean(row.metadata?.actionable),
  }
}

function formatTime(d: Date) {
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1)  return 'gerade eben'
  if (diffMin < 60) return `vor ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24)   return `vor ${diffH} h`
  const diffD = Math.round(diffH / 24)
  if (diffD < 7)    return `vor ${diffD} Tg.`
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), [])
  const [active, setActive] = useState<Category>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [projectTitles, setProjectTitles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [unreadOnly, setUnreadOnly] = useState(false)

  // Load: ensure the welcome message exists, then pull inbox items.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      // Idempotent — yields exactly one welcome item per account.
      await fetch('/api/inbox/welcome', { method: 'POST' }).catch(() => {})
      if (cancelled) return

      const [{ data: rows }, { data: projs }] = await Promise.all([
        supabase.from('inbox_items')
          .select('id,thread_id,user_id,project_id,category,type,title,body,metadata,read_at,created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(120),
        supabase.from('projects').select('id,title'),
      ])
      if (cancelled) return

      const titleMap: Record<string, string> = {}
      ;((projs as { id: string; title: string }[] | null) ?? []).forEach(p => { titleMap[p.id] = p.title })
      setProjectTitles(titleMap)

      const dbRows = (rows as DbInboxRow[] | null) ?? []
      setItems(dbRows.map(r => dbRowToItem(r, titleMap)))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase])

  // Realtime: prepend new inbox items, update changed ones.
  useEffect(() => {
    let userId: string | null = null
    supabase.auth.getSession().then(({ data }) => { userId = data.session?.user.id ?? null })

    const channel = supabase
      .channel('inbox-stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inbox_items' }, payload => {
        const row = payload.new as DbInboxRow
        if (!userId || row.user_id !== userId) return
        setItems(prev => [dbRowToItem(row, projectTitles), ...prev.filter(i => i.id !== row.id)])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inbox_items' }, payload => {
        const row = payload.new as DbInboxRow
        if (!userId || row.user_id !== userId) return
        setItems(prev => prev.map(i => i.id === row.id ? dbRowToItem(row, projectTitles) : i))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, projectTitles])

  const filtered = items
    .filter(i => active === 'all' || i.category === active)
    .filter(i => !unreadOnly || i.unread)
  const selected = filtered.find(i => i.id === selectedId) || null

  async function markRead(itemId: string) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, unread: false } : i))
    try {
      await supabase.from('inbox_items').update({ read_at: new Date().toISOString() }).eq('id', itemId)
    } catch {}
  }

  const unreadByCategory: Record<Category, number> = {
    all:     items.filter(i => i.unread).length,
    project: items.filter(i => i.unread && i.category === 'project').length,
    billing: items.filter(i => i.unread && i.category === 'billing').length,
    account: items.filter(i => i.unread && i.category === 'account').length,
    tagro:   items.filter(i => i.unread && i.category === 'tagro').length,
  }

  // Keep a valid selection as the list changes.
  useEffect(() => {
    setSelectedId(prev => (filtered.some(i => i.id === prev) ? prev : filtered[0]?.id ?? null))
  }, [active, unreadOnly, filtered.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ix-root">
      <style>{INBOX_CSS}</style>

      <section className="ix-list" aria-label="Posteingang">
        <header className="ix-list-head">
          <div className="ix-list-title">Posteingang</div>
          <button
            type="button"
            className={`ix-iconbtn${unreadOnly ? ' on' : ''}`}
            onClick={() => setUnreadOnly(v => !v)}
            title={unreadOnly ? 'Alle anzeigen' : 'Nur ungelesene'}
            aria-pressed={unreadOnly}
          >
            <Funnel size={15} weight={unreadOnly ? 'fill' : 'regular'} />
          </button>
        </header>

        <nav className="ix-tabs" aria-label="Kategorien">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const isOn = active === cat.id
            const unread = unreadByCategory[cat.id]
            return (
              <button
                key={cat.id}
                type="button"
                className={`ix-tab${isOn ? ' on' : ''}`}
                onClick={() => setActive(cat.id)}
                title={cat.hint}
              >
                <Icon size={13} weight="regular" />
                <span>{cat.label}</span>
                {unread > 0 && <span className="ix-tab-count">{unread}</span>}
              </button>
            )
          })}
        </nav>

        <div className="ix-thread-scroll">
          {loading ? (
            <div className="ix-empty-list"><span className="ix-empty-sub">Posteingang wird geladen…</span></div>
          ) : filtered.length === 0 ? (
            <EmptyList active={active} unreadOnly={unreadOnly} />
          ) : (
            filtered.map(item => (
              <ThreadRow
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                onClick={() => {
                  setSelectedId(item.id)
                  if (item.unread) markRead(item.id)
                }}
              />
            ))
          )}
        </div>
      </section>

      <section className="ix-detail" aria-label="Eintrag">
        {selected ? <ThreadDetail item={selected} /> : <EmptyDetail />}
      </section>
    </div>
  )
}

function ThreadRow({ item, selected, onClick }: { item: Item; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`ix-row${selected ? ' on' : ''}${item.unread ? ' unread' : ''}`}
      onClick={onClick}
    >
      <div className="ix-row-marker" style={{ background: item.unread ? 'var(--ix-slate)' : 'transparent' }} />
      <div className="ix-row-body">
        <div className="ix-row-head">
          <span className="ix-row-source">{item.source}</span>
          {item.project && <span className="ix-row-tag">{item.project}</span>}
          <span className="ix-row-time">{formatTime(item.createdAt)}</span>
        </div>
        <div className="ix-row-title">{item.title}</div>
        <div className="ix-row-preview">{item.preview}</div>
        {item.actionable && (
          <span className="ix-row-actionable">
            <CheckCircle size={11} weight="fill" /> Aktion erforderlich
          </span>
        )}
      </div>
    </button>
  )
}

function ThreadDetail({ item }: { item: Item }) {
  const router = useRouter()
  const openHref = item.projectId
    ? `/project/${item.projectId}`
    : item.category === 'billing' ? '/reports' : '/dashboard'
  const openLabel = item.category === 'project'
    ? 'Projekt öffnen'
    : item.category === 'billing' ? 'Rechnungen öffnen' : 'Im Workspace öffnen'

  return (
    <article className="ix-detail-card">
      <header className="ix-detail-head">
        <div className="ix-detail-tags">
          <span className="ix-type-badge">{ITEM_TYPE_LABEL[item.type]}</span>
          {item.project && <span className="ix-detail-project">{item.project}</span>}
        </div>
        <h1 className="ix-detail-title">{item.title}</h1>
        <div className="ix-detail-meta">
          <span>{item.source}</span><span>·</span><span>{formatTime(item.createdAt)}</span>
        </div>
      </header>

      <div className="ix-detail-body">
        <p>{item.body || item.preview}</p>
      </div>

      {item.videoUrl && (
        <a className="ix-video" href={item.videoUrl} target="_blank" rel="noreferrer">
          <span className="ix-video-play"><Play size={14} weight="fill" /></span>
          <span>
            <strong>Einführung ansehen</strong>
            <small>So funktioniert Festag — in 2 Minuten erklärt.</small>
          </span>
        </a>
      )}

      <footer className="ix-detail-actions">
        {item.actionable && item.projectId && (
          <button type="button" className="ix-btn primary" onClick={() => router.push(`/project/${item.projectId}`)}>
            Im Projekt ansehen
          </button>
        )}
        <button type="button" className="ix-btn" onClick={() => router.push(openHref)}>
          <ArrowSquareOut size={13} weight="regular" /> {openLabel}
        </button>
      </footer>
    </article>
  )
}

function EmptyList({ active, unreadOnly }: { active: Category; unreadOnly: boolean }) {
  const cat = CATEGORIES.find(c => c.id === active)
  return (
    <div className="ix-empty-list">
      <Tray size={24} weight="regular" />
      <p className="ix-empty-title">{unreadOnly ? 'Alles gelesen' : 'Noch nichts hier'}</p>
      <p className="ix-empty-sub">
        {unreadOnly
          ? 'Keine ungelesenen Eingänge in dieser Ansicht.'
          : active === 'all'
            ? 'Sobald deine Projekte starten, landen Updates, Deliverables und Entscheidungs-Anfragen hier.'
            : cat?.hint || ''}
      </p>
    </div>
  )
}

function EmptyDetail() {
  return (
    <div className="ix-empty-detail">
      <ChatCircle size={26} weight="regular" />
      <p className="ix-empty-title">Wähle einen Eintrag</p>
      <p className="ix-empty-sub">
        Eingänge sind nach Projekt und Thema strukturiert. Für freie Fragen nutze den Tagro-Chat im jeweiligen Projekt.
      </p>
    </div>
  )
}

const INBOX_CSS = `
  .ix-root {
    --ix-slate:#5B647D;
    display: grid;
    grid-template-columns: minmax(312px, 372px) minmax(0, 1fr);
    height: 100%; min-height: 0;
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .ix-root *, .ix-root *::before, .ix-root *::after { letter-spacing: .012em; }

  /* LIST COLUMN */
  .ix-list {
    display: flex; flex-direction: column; min-height: 0;
    background: color-mix(in srgb, var(--sidebar-bg) 90%, transparent);
  }
  .ix-list-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 18px 12px;
  }
  .ix-list-title { font-size: 14.5px; font-weight: 500; color: var(--text); }
  .ix-iconbtn {
    width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px; border: none; background: transparent;
    color: var(--text-muted); cursor: pointer;
    transition: background .12s ease, color .12s ease;
  }
  .ix-iconbtn:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text); }
  .ix-iconbtn.on { background: color-mix(in srgb, var(--surface-2) 90%, transparent); color: var(--text); }

  .ix-tabs { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 14px 14px; }
  .ix-tab {
    display: inline-flex; align-items: center; gap: 6px;
    height: 28px; padding: 0 10px;
    border-radius: 8px; border: 1px solid transparent; background: transparent;
    font-family: inherit; font-size: 11.5px; font-weight: 500;
    color: var(--text-muted); cursor: pointer;
    transition: background .12s ease, color .12s ease;
  }
  .ix-tab:hover { color: var(--text); background: color-mix(in srgb, var(--surface-2) 55%, transparent); }
  .ix-tab.on { color: var(--text); background: color-mix(in srgb, var(--surface-2) 90%, transparent); }
  .ix-tab-count {
    font-size: 10px; font-weight: 500;
    padding: 0 5px; border-radius: 6px; min-width: 15px;
    text-align: center; line-height: 15px;
    background: color-mix(in srgb, var(--ix-slate) 16%, transparent);
    color: var(--ix-slate);
  }

  .ix-thread-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 10px 18px; }

  /* ROW */
  .ix-row {
    display: flex; align-items: stretch; gap: 9px;
    width: 100%; border: none; background: transparent;
    padding: 11px 11px 11px 8px;
    text-align: left; border-radius: 8px; cursor: pointer;
    font-family: inherit; color: var(--text);
    transition: background .12s ease;
  }
  .ix-row:hover { background: color-mix(in srgb, var(--surface-2) 55%, transparent); }
  .ix-row.on { background: color-mix(in srgb, var(--surface-2) 92%, transparent); }
  .ix-row-marker { width: 3px; min-width: 3px; border-radius: 2px; align-self: stretch; }
  .ix-row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .ix-row-head {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 500; color: var(--text-muted); line-height: 1.3;
  }
  .ix-row-source { color: var(--text-secondary); }
  .ix-row-tag {
    font-size: 10.5px; padding: 1px 6px; border-radius: 5px;
    background: color-mix(in srgb, var(--surface-2) 80%, transparent);
    color: var(--text-secondary);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px;
  }
  .ix-row-time { margin-left: auto; font-size: 10.5px; color: var(--text-muted); flex-shrink: 0; }
  .ix-row-title {
    font-size: 13px; font-weight: 500; color: var(--text); line-height: 1.35;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ix-row.unread .ix-row-title { color: var(--text); }
  .ix-row:not(.unread) .ix-row-title { color: var(--text-secondary); }
  .ix-row-preview {
    font-size: 12px; color: var(--text-muted); line-height: 1.4;
    overflow: hidden; text-overflow: ellipsis;
    display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
  }
  .ix-row-actionable {
    display: inline-flex; align-items: center; gap: 4px; margin-top: 3px;
    font-size: 10.5px; font-weight: 500; color: var(--ix-slate);
  }

  /* DETAIL COLUMN */
  .ix-detail {
    display: flex; align-items: flex-start; justify-content: center;
    padding: 40px clamp(20px, 4vw, 52px);
    overflow-y: auto; min-height: 0; background: var(--surface);
  }
  .ix-detail-card { width: 100%; max-width: 680px; display: flex; flex-direction: column; gap: 20px; }
  .ix-detail-tags { display: flex; align-items: center; gap: 9px; }
  .ix-type-badge {
    display: inline-flex; align-items: center;
    height: 22px; padding: 0 9px; border-radius: 6px;
    font-size: 10.5px; font-weight: 500;
    background: color-mix(in srgb, var(--surface-2) 80%, transparent);
    color: var(--text-secondary);
  }
  .ix-detail-project { font-size: 11px; color: var(--text-muted); font-weight: 500; }
  .ix-detail-title {
    margin: 0; font-size: 21px; font-weight: 500; color: var(--text);
    letter-spacing: -.014em; line-height: 1.25;
  }
  .ix-detail-meta {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--text-muted); margin-top: -12px;
  }
  .ix-detail-body { font-size: 14px; line-height: 1.7; color: var(--text-secondary); }
  .ix-detail-body p { margin: 0; white-space: pre-wrap; }

  .ix-video {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 8px; text-decoration: none;
    background: color-mix(in srgb, var(--surface-2) 55%, transparent);
    transition: background .12s ease;
  }
  .ix-video:hover { background: color-mix(in srgb, var(--surface-2) 85%, transparent); }
  .ix-video-play {
    width: 32px; height: 32px; flex-shrink: 0; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    background: var(--ix-slate); color: #fff;
  }
  .ix-video strong { display: block; font-size: 12.5px; font-weight: 500; color: var(--text); }
  .ix-video small { display: block; margin-top: 1px; font-size: 11.5px; color: var(--text-muted); }

  .ix-detail-actions { display: flex; gap: 8px; align-items: center; padding-top: 4px; }
  .ix-btn {
    display: inline-flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 14px; border-radius: 8px;
    border: 1px solid var(--border); background: transparent;
    font-family: inherit; font-size: 12.5px; font-weight: 500;
    color: var(--text); cursor: pointer;
    transition: background .12s ease, border-color .12s ease;
  }
  .ix-btn:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
  .ix-btn.primary {
    background: var(--ix-slate); color: #fff; border-color: var(--ix-slate);
  }
  .ix-btn.primary:hover { background: color-mix(in srgb, var(--ix-slate) 90%, #000 10%); }

  /* EMPTY STATES */
  .ix-empty-list, .ix-empty-detail {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; gap: 7px; color: var(--text-muted);
  }
  .ix-empty-list { padding: 52px 24px 24px; }
  .ix-empty-detail { padding: 76px 32px; max-width: 360px; margin: 0 auto; }
  .ix-empty-title { font-size: 13px; font-weight: 500; color: var(--text-secondary); margin: 6px 0 0; }
  .ix-empty-sub { font-size: 12.5px; line-height: 1.55; color: var(--text-muted); max-width: 320px; margin: 0; }

  /* MOBILE */
  @media (max-width: 760px) {
    .ix-root { grid-template-columns: 1fr; }
    .ix-detail { display: none; }
    .ix-list-head { padding: 16px 14px 10px; }
    .ix-tabs {
      padding: 0 12px 10px; gap: 5px; overflow-x: auto;
      flex-wrap: nowrap; scrollbar-width: none; -webkit-overflow-scrolling: touch;
    }
    .ix-tabs::-webkit-scrollbar { display: none; }
    .ix-tab { flex-shrink: 0; }
    .ix-row { padding: 13px 10px 13px 8px; min-height: 58px; }
    .ix-thread-scroll { padding: 4px 8px 92px; }
  }
`
