'use client'

/**
 * Festag Posteingang — strukturierte Projekt-Kommunikation.
 *
 * Modell:
 *   Vier Kategorien:
 *     · Projekt              — Updates, Deliverables, Fragen, Milestone-Approvals
 *     · Rechnungen & Verträge — Invoices, Vertragsversand
 *     · Konto & Team          — Seats, Einladungen, Rollen, Domains
 *     · Tagro Assist          — Wochen-Zusammenfassungen, Vorschläge (selten, kuratiert)
 *
 *   Item-Typen: update · action · question · deliverable · note
 *   "action" ist der einzige Typ, der eine echte E-Mail triggert.
 *
 * Phase 1 (dieser Stand) liefert nur die UI + Empty States. Persistenz
 * (Tabellen `inbox_threads`, `inbox_items`, RLS, system-event-trigger)
 * folgt im nächsten Push, sobald das Design steht.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Tray, Briefcase, Receipt, UsersThree, Sparkle,
  CheckCircle, ChatCircle, ArrowSquareOut,
  SlidersHorizontal, Funnel,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

type Category = 'all' | 'project' | 'billing' | 'account' | 'tagro'
type ItemType = 'update' | 'action' | 'question' | 'deliverable' | 'note'

type CategoryDef = {
  id: Category
  label: string
  icon: React.ElementType
  hint: string
}

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
  title: string
  preview: string
  body?: string
  createdAt: Date
  unread: boolean
  actionable: boolean
}

const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  update:      'Update',
  action:      'Aktion erforderlich',
  question:    'Frage',
  deliverable: 'Deliverable',
  note:        'Notiz',
}

const ITEM_TYPE_COLOR: Record<ItemType, string> = {
  update:      'var(--text-muted)',
  action:      '#D97706',
  question:    '#0369A1',
  deliverable: '#15803D',
  note:        'var(--text-muted)',
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
  const cat = dbCategoryToUi(row.category)
  return {
    id: row.id,
    category: cat,
    type: dbTypeToUi(row.type, row.metadata),
    source: row.metadata?.source_label || sourceLabel(row.category),
    project: row.project_id ? projectTitles[row.project_id] : undefined,
    title: row.title,
    preview: (row.body ?? '').slice(0, 200),
    body: row.body ?? undefined,
    createdAt: new Date(row.created_at),
    unread: !row.read_at,
    actionable: Boolean(row.metadata?.actionable),
  }
}

function formatTime(d: Date) {
  const now = Date.now()
  const diffMin = Math.round((now - d.getTime()) / 60000)
  if (diffMin < 1)   return 'gerade eben'
  if (diffMin < 60)  return `vor ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24)    return `vor ${diffH} h`
  const diffD = Math.round(diffH / 24)
  if (diffD < 7)     return `vor ${diffD} Tg.`
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), [])
  const [active, setActive] = useState<Category>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [projectTitles, setProjectTitles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  // Load inbox items + project titles for the project tag.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

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
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      userId = session?.user.id ?? null
    }
    init()

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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, projectTitles])

  const filtered = active === 'all' ? items : items.filter(i => i.category === active)
  const selected = filtered.find(i => i.id === selectedId) || null

  async function markRead(itemId: string) {
    const now = new Date().toISOString()
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, unread: false } : i))
    try {
      await supabase.from('inbox_items').update({ read_at: now }).eq('id', itemId)
    } catch {}
  }

  const unreadByCategory: Record<Category, number> = {
    all:     items.filter(i => i.unread).length,
    project: items.filter(i => i.unread && i.category === 'project').length,
    billing: items.filter(i => i.unread && i.category === 'billing').length,
    account: items.filter(i => i.unread && i.category === 'account').length,
    tagro:   items.filter(i => i.unread && i.category === 'tagro').length,
  }

  // Default-select the top item when the list changes.
  useEffect(() => {
    setSelectedId(filtered[0]?.id ?? null)
  }, [active, filtered.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ix-root">
      <style>{INBOX_CSS}</style>

      <section className="ix-list" aria-label="Posteingang">
        <header className="ix-list-head">
          <div className="ix-list-title">Posteingang</div>
          <div className="ix-list-actions">
            <button className="ix-iconbtn" type="button" title="Filter" aria-label="Filter">
              <Funnel size={15} weight="regular" />
            </button>
            <button className="ix-iconbtn" type="button" title="Anzeige" aria-label="Anzeige">
              <SlidersHorizontal size={15} weight="regular" />
            </button>
          </div>
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
                <Icon size={13} weight={isOn ? 'bold' : 'regular'} />
                <span>{cat.label}</span>
                {unread > 0 && <span className="ix-tab-count">{unread}</span>}
              </button>
            )
          })}
        </nav>

        <div className="ix-thread-scroll">
          {loading ? (
            <div className="ix-empty-list">
              <span className="ix-empty-sub">Posteingang wird geladen…</span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyList active={active} />
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

function ThreadRow({ item, selected, onClick }: {
  item: Item; selected: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`ix-row${selected ? ' on' : ''}${item.unread ? ' unread' : ''}`}
      onClick={onClick}
    >
      <div
        className="ix-row-marker"
        style={{ background: item.unread ? ITEM_TYPE_COLOR[item.type] : 'transparent' }}
      />
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
  return (
    <article className="ix-detail-card">
      <header className="ix-detail-head">
        <div className="ix-detail-tags">
          <span
            className="ix-type-badge"
            style={{ color: ITEM_TYPE_COLOR[item.type], borderColor: 'currentColor' }}
          >
            {ITEM_TYPE_LABEL[item.type]}
          </span>
          {item.project && <span className="ix-detail-project">{item.project}</span>}
        </div>
        <h1 className="ix-detail-title">{item.title}</h1>
        <div className="ix-detail-meta">
          <span>{item.source}</span>
          <span>·</span>
          <span>{formatTime(item.createdAt)}</span>
        </div>
      </header>

      <div className="ix-detail-body">
        {item.body ? <p>{item.body}</p> : <p className="ix-muted">{item.preview}</p>}
      </div>

      <footer className="ix-detail-actions">
        {item.actionable && <button type="button" className="ix-btn primary">Freigeben</button>}
        <button type="button" className="ix-btn">Antworten</button>
        <button type="button" className="ix-btn ghost">
          <ArrowSquareOut size={13} weight="regular" />
          {item.category === 'project' ? 'Projekt öffnen'
            : item.category === 'billing' ? 'Rechnung öffnen'
            : 'Im Kontext öffnen'}
        </button>
      </footer>
    </article>
  )
}

function EmptyList({ active }: { active: Category }) {
  const cat = CATEGORIES.find(c => c.id === active)
  return (
    <div className="ix-empty-list">
      <Tray size={26} weight="regular" />
      <p className="ix-empty-title">Noch nichts hier</p>
      <p className="ix-empty-sub">
        {active === 'all'
          ? 'Sobald deine Projekte starten, landen Updates, Deliverables und Entscheidungs-Anfragen hier.'
          : cat?.hint || ''}
      </p>
    </div>
  )
}

function EmptyDetail() {
  return (
    <div className="ix-empty-detail">
      <ChatCircle size={28} weight="regular" />
      <p className="ix-empty-title">Wähle einen Eintrag</p>
      <p className="ix-empty-sub">
        Eingänge sind nach Projekt und Thema strukturiert. Tagro postet hier nur kuratierte Zusammenfassungen — für freie Fragen nutze den Tagro-Chat.
      </p>
    </div>
  )
}

const INBOX_CSS = `
  .ix-root {
    display: grid;
    grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
    height: 100%; min-height: 0;
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    letter-spacing: 0.01em;
  }

  /* LIST COLUMN */
  .ix-list {
    display: flex; flex-direction: column;
    min-height: 0;
    border-right: 1px solid var(--border);
    background: color-mix(in srgb, var(--sidebar-bg) 90%, transparent);
  }
  .ix-list-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 22px 22px 14px;
  }
  .ix-list-title { font-size: 15px; font-weight: 650; color: var(--text); }
  .ix-list-actions { display: flex; gap: 4px; }
  .ix-iconbtn {
    width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 12px; border: none; background: transparent;
    color: var(--text-muted); cursor: pointer;
    transition: background .12s, color .12s;
  }
  .ix-iconbtn:hover { background: rgba(0,0,0,.05); color: var(--text); }
  [data-theme="dark"] .ix-iconbtn:hover { background: rgba(255,255,255,.04); }

  .ix-tabs {
    display: flex; flex-wrap: wrap; gap: 4px;
    padding: 0 16px 18px;
  }
  .ix-tab {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid transparent; background: transparent;
    font-family: inherit;
    font-size: 11.5px; font-weight: 500;
    color: var(--text-muted); cursor: pointer;
    transition: background .12s, color .12s, border-color .12s;
  }
  .ix-tab:hover { color: var(--text); background: rgba(0,0,0,.04); }
  [data-theme="dark"] .ix-tab:hover { background: rgba(255,255,255,.04); }
  .ix-tab.on {
    color: var(--text);
    background: var(--card);
    border-color: var(--border);
  }
  .ix-tab-count {
    font-size: 10px; font-weight: 600;
    padding: 0 5px; border-radius: 999px;
    background: rgba(0,0,0,.08); color: var(--text);
    min-width: 14px; text-align: center; line-height: 14px;
  }
  [data-theme="dark"] .ix-tab-count { background: rgba(255,255,255,.10); }

  .ix-thread-scroll {
    flex: 1; min-height: 0;
    overflow-y: auto;
    padding: 6px 10px 18px;
  }

  /* ROW */
  .ix-row {
    display: flex; align-items: stretch; gap: 8px;
    width: 100%;
    border: none; background: transparent;
    padding: 12px 12px 12px 8px;
    text-align: left;
    border-radius: 18px;
    cursor: pointer;
    font-family: inherit;
    color: var(--text);
    transition: background .12s;
  }
  .ix-row:hover { background: rgba(0,0,0,.03); }
  [data-theme="dark"] .ix-row:hover { background: rgba(255,255,255,.035); }
  .ix-row.on { background: var(--card); box-shadow: 0 0 0 1px rgba(255,255,255,.02); }
  .ix-row-marker {
    width: 3px; min-width: 3px; border-radius: 999px;
    align-self: stretch;
  }
  .ix-row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
  .ix-row-head {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 500; color: var(--text-muted);
    line-height: 1.3;
  }
  .ix-row-source { color: var(--text-secondary); font-weight: 600; }
  .ix-row-tag {
    font-size: 10.5px; padding: 1px 6px; border-radius: 4px;
    background: rgba(0,0,0,.05); color: var(--text-secondary);
  }
  [data-theme="dark"] .ix-row-tag { background: rgba(255,255,255,.06); }
  .ix-row-time { margin-left: auto; font-size: 10.5px; color: var(--text-muted); }
  .ix-row-title {
    font-size: 13.5px; font-weight: 500; color: var(--text);
    line-height: 1.35;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ix-row.unread .ix-row-title { font-weight: 600; }
  .ix-row-preview {
    font-size: 12px; color: var(--text-muted); line-height: 1.4;
    overflow: hidden; text-overflow: ellipsis;
    display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
  }
  .ix-row-actionable {
    display: inline-flex; align-items: center; gap: 4px;
    margin-top: 3px;
    font-size: 10.5px; font-weight: 600;
    color: #D97706;
  }

  /* DETAIL COLUMN */
  .ix-detail {
    display: flex; align-items: flex-start; justify-content: center;
    padding: 44px clamp(24px, 4vw, 56px);
    overflow-y: auto;
    min-height: 0;
    background: var(--surface);
  }
  .ix-detail-card {
    width: 100%; max-width: 760px;
    display: flex; flex-direction: column; gap: 26px;
  }
  .ix-detail-tags { display: flex; align-items: center; gap: 8px; }
  .ix-type-badge {
    display: inline-flex; align-items: center;
    padding: 5px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.01em;
    border: 1px solid; background: transparent;
  }
  .ix-detail-project { font-size: 11px; color: var(--text-muted); font-weight: 500; }
  .ix-detail-title {
    font-size: 24px; font-weight: 620; color: var(--text);
    letter-spacing: -0.01em; line-height: 1.25;
    margin-top: 4px;
  }
  .ix-detail-meta {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--text-muted);
    margin-top: -10px;
  }
  .ix-detail-body {
    font-size: 14.5px; line-height: 1.78;
    color: var(--text-secondary);
  }
  .ix-detail-body p { margin: 0; }
  .ix-muted { color: var(--text-muted); }

  .ix-detail-actions {
    display: flex; gap: 8px; align-items: center;
    padding-top: 8px; border-top: 1px solid var(--border);
    margin-top: 8px;
  }
  .ix-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 16px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--card);
    font-family: inherit;
    font-size: 12.5px; font-weight: 500; letter-spacing: 0.01em;
    color: var(--text);
    cursor: pointer;
    transition: background .12s, border-color .12s, color .12s, transform .15s;
  }
  .ix-btn:hover { background: var(--hover); }
  .ix-btn:active { transform: scale(0.97); }
  .ix-btn.primary {
    background: var(--text); color: var(--bg); border-color: var(--text);
  }
  .ix-btn.primary:hover { opacity: .9; }
  .ix-btn.ghost {
    background: transparent; border-color: transparent; color: var(--text-muted);
  }
  .ix-btn.ghost:hover { color: var(--text); background: var(--surface-2); }

  /* EMPTY STATES */
  .ix-empty-list, .ix-empty-detail {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; gap: 8px;
    color: var(--text-muted);
  }
  .ix-empty-list { padding: 56px 24px 24px; }
  .ix-empty-detail { padding: 80px 32px; max-width: 380px; margin: 0 auto; }
  .ix-empty-title {
    font-size: 13.5px; font-weight: 600; color: var(--text-secondary);
    margin-top: 6px;
  }
  .ix-empty-sub {
    font-size: 12.5px; line-height: 1.55; color: var(--text-muted);
    max-width: 320px;
  }

  /* MOBILE */
  @media (max-width: 760px) {
    .ix-root { grid-template-columns: 1fr; }
    .ix-detail { display: none; }
    .ix-list { border-right: none; }
    .ix-list-head { padding: 16px 16px 10px; }
    .ix-list-title { font-size: 15px; }
    .ix-tabs { padding: 0 12px 10px; gap: 5px; overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
    .ix-tabs::-webkit-scrollbar { display: none; }
    .ix-tab { flex-shrink: 0; padding: 7px 11px; font-size: 12px; min-height: 32px; }
    .ix-row { padding: 14px 12px 14px 8px; min-height: 60px; }
    .ix-row-title { font-size: 13.5px; }
    .ix-row-preview { font-size: 12.5px; }
    .ix-thread-scroll { padding: 4px 6px 90px; }
  }
`
