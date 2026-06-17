'use client'

/**
 * /messages — Festag Posteingang (Portal-Shell).
 *
 * Strukturierte Projekt-Kommunikation aus `inbox_items`.
 * Master-Detail im Codex/Portal-Stil — analog zu Entscheidungen.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Tray, Briefcase, Receipt, UsersThree, Sparkle,
  CheckCircle, ChatCircle, ArrowSquareOut, Play, FunnelSimple,
  ArrowsClockwise, CaretLeft, Check,
} from '@phosphor-icons/react'
import MobilePageHeader from '@/components/MobilePageHeader'
import TagroContentFab from '@/components/TagroContentFab'
import FestagPillButton from '@/components/ui/FestagPillButton'
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
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const filterWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!filterMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (filterWrapRef.current && !filterWrapRef.current.contains(e.target as Node)) setFilterMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFilterMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [filterMenuOpen])

  const reload = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    await fetch('/api/inbox/welcome', { method: 'POST' }).catch(() => {})

    const [{ data: rows }, { data: projs }] = await Promise.all([
      supabase.from('inbox_items')
        .select('id,thread_id,user_id,project_id,category,type,title,body,metadata,read_at,created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(120),
      supabase.from('projects').select('id,title'),
    ])

    const titleMap: Record<string, string> = {}
    ;((projs as { id: string; title: string }[] | null) ?? []).forEach(p => { titleMap[p.id] = p.title })
    setProjectTitles(titleMap)

    const dbRows = (rows as DbInboxRow[] | null) ?? []
    setItems(dbRows.map(r => dbRowToItem(r, titleMap)))
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await reload()
      if (cancelled) return
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const unreadTotal = items.filter(i => i.unread).length
  const unreadByCategory: Record<Category, number> = {
    all:     unreadTotal,
    project: items.filter(i => i.unread && i.category === 'project').length,
    billing: items.filter(i => i.unread && i.category === 'billing').length,
    account: items.filter(i => i.unread && i.category === 'account').length,
    tagro:   items.filter(i => i.unread && i.category === 'tagro').length,
  }

  async function markRead(itemId: string) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, unread: false } : i))
    try {
      await supabase.from('inbox_items').update({ read_at: new Date().toISOString() }).eq('id', itemId)
    } catch { /* noop */ }
  }

  useEffect(() => {
    setSelectedId(prev => (filtered.some(i => i.id === prev) ? prev : filtered[0]?.id ?? null))
  }, [active, unreadOnly, filtered.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const filterActive = active !== 'all' || unreadOnly
  const activeCat = CATEGORIES.find(c => c.id === active) || CATEGORIES[0]

  const leadLine = useMemo(() => {
    if (loading) return 'Posteingang wird geladen…'
    if (unreadTotal === 0) return 'Alles gelesen — keine neuen Eingänge.'
    if (unreadTotal === 1) return '1 ungelesener Eingang wartet auf dich.'
    return `${unreadTotal} ungelesene Eingänge — strukturiert nach Projekt und Thema.`
  }, [loading, unreadTotal])

  function selectItem(id: string, unread: boolean) {
    setSelectedId(id)
    if (unread) markRead(id)
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setMobileDetailOpen(true)
    }
  }

  return (
    <div className="inb-os">
      <style>{INBOX_CSS}</style>

      <div className="inb-static-top">
        <MobilePageHeader
          title="Posteingang"
          menuItems={[
            { id: 'refresh', label: 'Aktualisieren', onClick: reload },
            { id: 'unread', label: unreadOnly ? 'Alle anzeigen' : 'Nur ungelesene', onClick: () => setUnreadOnly(v => !v) },
          ]}
        />
        <header className="inb-page-head">
          <div className="inb-page-head-copy">
            <h1 className="inb-page-title">Posteingang</h1>
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
                  title="Kategorie & Filter"
                  aria-label="Kategorie & Filter"
                  aria-expanded={filterMenuOpen}
                  onClick={() => setFilterMenuOpen(v => !v)}
                >
                  <FunnelSimple size={15} weight="regular" />
                </button>
                {filterMenuOpen && (
                  <div className="inb-filter-menu" role="listbox" aria-label="Kategorien">
                    <p className="inb-filter-menu-label">Kategorie</p>
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
                          className={`inb-filter-menu-item${isOn ? ' on' : ''}`}
                          onClick={() => { setActive(cat.id); setFilterMenuOpen(false) }}
                        >
                          <Icon size={14} weight="regular" />
                          <span className="inb-filter-menu-item-main">
                            <strong>{cat.label}</strong>
                            <small>{cat.hint}</small>
                          </span>
                          {unread > 0 && <span className="inb-filter-count">{unread}</span>}
                          {isOn && <span className="inb-filter-check">✓</span>}
                        </button>
                      )
                    })}
                    <div className="inb-divider" />
                    <p className="inb-filter-menu-label">Ansicht</p>
                    <button
                      type="button"
                      role="option"
                      aria-selected={unreadOnly}
                      className={`inb-filter-menu-item${unreadOnly ? ' on' : ''}`}
                      onClick={() => { setUnreadOnly(v => !v); setFilterMenuOpen(false) }}
                    >
                      <Tray size={14} weight="regular" />
                      <span className="inb-filter-menu-item-main">
                        <strong>Nur ungelesene</strong>
                        <small>Blendet gelesene Eingänge aus</small>
                      </span>
                      {unreadOnly && <span className="inb-filter-check">✓</span>}
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className={`inb-head-tool${unreadOnly ? ' on' : ''}`}
                title={unreadOnly ? 'Alle anzeigen' : 'Nur ungelesene'}
                aria-pressed={unreadOnly}
                onClick={() => setUnreadOnly(v => !v)}
              >
                <Tray size={15} weight={unreadOnly ? 'fill' : 'regular'} />
              </button>
            </div>
            <button
              type="button"
              className="inb-head-tool"
              title="Aktualisieren"
              aria-label="Aktualisieren"
              onClick={reload}
            >
              <ArrowsClockwise size={15} weight="regular" />
            </button>
          </div>
        </header>
      </div>

      <div className="inb-body">
        <section
          className={`inb-list-col${mobileDetailOpen ? ' inb-list-col--hidden' : ''}`}
          aria-label="Eingänge"
        >
          <div className="inb-list-toolbar">
            <span className="inb-list-toolbar-label">
              {activeCat.label}
              {filtered.length > 0 && ` · ${filtered.length}`}
            </span>
          </div>
          <div className="inb-list-scroll">
            {loading ? (
              <p className="inb-loading">Posteingang wird geladen…</p>
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
          className={`inb-detail-col${mobileDetailOpen ? ' inb-detail-col--open' : ''}`}
          aria-label="Eintrag"
        >
          {selected ? (
            <ThreadDetail
              item={selected}
              onBack={() => setMobileDetailOpen(false)}
            />
          ) : (
            <EmptyDetail />
          )}
        </section>
      </div>

      <TagroContentFab
        context={{
          contextType: 'empty',
          id: 'inbox',
          title: 'Posteingang',
          subtitle: `${unreadTotal} ungelesen · ${items.length} gesamt`,
        }}
      />
    </div>
  )
}

function ThreadRow({ item, selected, onClick }: { item: Item; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`inb-row${selected ? ' on' : ''}${item.unread ? ' unread' : ''}`}
      onClick={onClick}
    >
      <div className="inb-row-marker" style={{ background: item.unread ? 'var(--inb-slate)' : 'transparent' }} />
      <div className="inb-row-body">
        <div className="inb-row-head">
          <span className="inb-row-source">{item.source}</span>
          {item.project && <span className="inb-row-tag">{item.project}</span>}
          <span className="inb-row-time">{formatTime(item.createdAt)}</span>
        </div>
        <div className="inb-row-title">{item.title}</div>
        <div className="inb-row-preview">{item.preview}</div>
        {item.actionable && (
          <span className="inb-row-actionable">
            <CheckCircle size={12} weight="fill" /> Aktion erforderlich
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
    <article className="inb-detail-inner">
      <button type="button" className="inb-detail-back" onClick={onBack}>
        <CaretLeft size={14} weight="bold" /> Zurück
      </button>
      <header>
        <div className="inb-detail-tags">
          <span className="inb-type-badge">{ITEM_TYPE_LABEL[item.type]}</span>
          {item.project && <span className="inb-detail-project">{item.project}</span>}
        </div>
        <h2 className="inb-detail-title">{item.title}</h2>
        <div className="inb-detail-meta">
          <span>{item.source}</span><span>·</span><span>{formatTime(item.createdAt)}</span>
        </div>
      </header>

      <div className="inb-detail-body">
        <p>{item.body || item.preview}</p>
      </div>

      {item.videoUrl && (
        <a className="inb-video" href={item.videoUrl} target="_blank" rel="noreferrer">
          <span className="inb-video-play"><Play size={14} weight="fill" /></span>
          <span>
            <strong>Einführung ansehen</strong>
            <small>So funktioniert Festag — in 2 Minuten erklärt.</small>
          </span>
        </a>
      )}

      <footer className="inb-detail-actions">
        {item.actionable && item.projectId && (
          <FestagPillButton variant="primary" onClick={() => router.push(`/project/${item.projectId}`)}>
            Im Projekt ansehen
          </FestagPillButton>
        )}
        <FestagPillButton onClick={() => router.push(openHref)}>
          <ArrowSquareOut size={14} weight="regular" /> {openLabel}
        </FestagPillButton>
      </footer>
    </article>
  )
}

function EmptyList({ active, unreadOnly }: { active: Category; unreadOnly: boolean }) {
  const cat = CATEGORIES.find(c => c.id === active)
  return (
    <div className="inb-empty">
      <Tray size={24} weight="regular" />
      <p className="inb-empty-title">{unreadOnly ? 'Alles gelesen' : 'Noch nichts hier'}</p>
      <p className="inb-empty-sub">
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
    <div className="inb-empty-detail">
      <ChatCircle size={28} weight="regular" />
      <p className="inb-empty-title">Wähle einen Eintrag</p>
      <p className="inb-empty-sub">
        Eingänge sind nach Projekt und Thema strukturiert. Für freie Fragen nutze den Tagro-Chat im jeweiligen Projekt.
      </p>
    </div>
  )
}
