'use client'

/**
 * Festag Posteingang — strukturierte Projekt-Kommunikation.
 *
 * Master-Detail-Inbox (keine Entscheidungs-Liste). Portal-Shell außen,
 * kompakte Thread-Liste links, Detail rechts — eine vertikale Trennlinie.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Tray, Briefcase, Receipt, UsersThree, Sparkle,
  CheckCircle, Bell, ArrowSquareOut, Play, Funnel, CaretDown, Check, CaretLeft,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { INBOX_CSS } from '@/components/inbox/inbox-styles'

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

const HINT_CATEGORIES = CATEGORIES.filter(c => c.id !== 'all')

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
  const [catMenuOpen, setCatMenuOpen] = useState(false)
  const [mobileDetail, setMobileDetail] = useState(false)
  const catMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!catMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target as Node)) setCatMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCatMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [catMenuOpen])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

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
    } catch { /* noop */ }
  }

  const unreadByCategory: Record<Category, number> = {
    all:     items.filter(i => i.unread).length,
    project: items.filter(i => i.unread && i.category === 'project').length,
    billing: items.filter(i => i.unread && i.category === 'billing').length,
    account: items.filter(i => i.unread && i.category === 'account').length,
    tagro:   items.filter(i => i.unread && i.category === 'tagro').length,
  }

  useEffect(() => {
    setSelectedId(prev => (filtered.some(i => i.id === prev) ? prev : filtered[0]?.id ?? null))
  }, [active, unreadOnly, filtered.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function selectItem(id: string, unread: boolean) {
    setSelectedId(id)
    if (unread) markRead(id)
    if (typeof window !== 'undefined' && window.innerWidth <= 760) setMobileDetail(true)
  }

  return (
    <div className="ix-root">
      <style>{INBOX_CSS}</style>

      <section className={`ix-list${mobileDetail ? ' ix-list--hidden' : ''}`} aria-label="Posteingang">
        <header className="ix-list-head">
          <div className="ix-list-title">Posteingang</div>
          <div className="ix-head-tools">
            <div className="ix-cat" ref={catMenuRef}>
              <button
                type="button"
                className={`ix-cat-trigger${catMenuOpen ? ' on' : ''}`}
                onClick={() => setCatMenuOpen(v => !v)}
                aria-expanded={catMenuOpen}
                aria-haspopup="listbox"
                title="Kategorie wählen"
              >
                {(() => {
                  const cur = CATEGORIES.find(c => c.id === active) || CATEGORIES[0]
                  const Icon = cur.icon
                  return (
                    <>
                      <Icon size={13} weight="regular" />
                      <span>{cur.label}</span>
                    </>
                  )
                })()}
                {unreadByCategory[active] > 0 && (
                  <span className="ix-cat-count">{unreadByCategory[active]}</span>
                )}
                <CaretDown size={10} weight="bold" />
              </button>

              {catMenuOpen && (
                <div className="ix-cat-menu" role="listbox" aria-label="Kategorien">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    const isOn = active === cat.id
                    const unread = unreadByCategory[cat.id]
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="option"
                        aria-selected={isOn}
                        className={`ix-cat-opt${isOn ? ' on' : ''}`}
                        onClick={() => { setActive(cat.id); setCatMenuOpen(false) }}
                      >
                        <Icon size={13} weight="regular" />
                        <span className="ix-cat-opt-main">
                          <strong>{cat.label}</strong>
                          <small>{cat.hint}</small>
                        </span>
                        {unread > 0 && <span className="ix-cat-count">{unread}</span>}
                        {isOn && <Check size={11} weight="bold" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              className={`ix-iconbtn${unreadOnly ? ' on' : ''}`}
              onClick={() => setUnreadOnly(v => !v)}
              title={unreadOnly ? 'Alle anzeigen' : 'Nur ungelesene'}
              aria-pressed={unreadOnly}
            >
              <Funnel size={15} weight={unreadOnly ? 'fill' : 'regular'} />
            </button>
          </div>
        </header>

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
                onClick={() => selectItem(item.id, item.unread)}
              />
            ))
          )}
        </div>
      </section>

      <section
        className={`ix-detail${selected ? ' ix-detail--filled' : ' ix-detail--empty'}${mobileDetail ? ' ix-detail--mobile' : ''}`}
        aria-label="Eintrag"
      >
        {selected ? (
          <ThreadDetail item={selected} onBack={() => setMobileDetail(false)} />
        ) : (
          <EmptyDetail />
        )}
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

function ThreadDetail({ item, onBack }: { item: Item; onBack: () => void }) {
  const router = useRouter()
  const openHref = item.projectId
    ? `/project/${item.projectId}`
    : item.category === 'billing' ? '/reports' : '/dashboard'
  const openLabel = item.category === 'project'
    ? 'Projekt öffnen'
    : item.category === 'billing' ? 'Rechnungen öffnen' : 'Im Workspace öffnen'

  return (
    <article className="ix-detail-card">
      <button type="button" className="ix-detail-back" onClick={onBack}>
        <CaretLeft size={14} weight="bold" /> Zurück
      </button>
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
      <Bell size={24} weight="regular" />
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
      <div className="ix-empty-visual" aria-hidden>
        <Bell size={30} weight="light" />
      </div>
      <p className="ix-empty-title">Wähle einen Eingang</p>
      <p className="ix-empty-sub">
        Updates, Rechnungen und Tagro-Zusammenfassungen erscheinen links. Für freie Fragen nutze Tagro im jeweiligen Projekt.
      </p>
      <div className="ix-empty-hints">
        {HINT_CATEGORIES.map(cat => {
          const Icon = cat.icon
          return (
            <span key={cat.id} className="ix-empty-hint">
              <Icon size={12} weight="regular" />
              {cat.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
