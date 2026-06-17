'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell, Check, CaretDown, CaretLeft, Funnel, ArrowSquareOut, Play, CheckCircle, Sparkle,
} from '@phosphor-icons/react'
import { INBOX_CSS } from '@/components/inbox/inbox-styles'
import { openTagro } from '@/components/TagroOverlay'
import { tagroContextForDevItem } from '@/lib/inbox/tagro-triage'
import type { InboxFeedItem, InboxProject } from '@/components/inbox/useInboxFeed'
import {
  CLIENT_CATEGORIES, DEV_CATEGORIES, DEV_ACTIONABLE_KINDS,
  DEV_KIND_LABEL, DEV_KIND_ACTION, CLIENT_ITEM_TYPE_LABEL,
  type InboxCategoryDef, type InboxCategoryId, type InboxVariant,
} from '@/lib/inbox/catalog'

function formatTime(iso: string) {
  const d = new Date(iso)
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'gerade eben'
  if (diffMin < 60) return `vor ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `vor ${diffH} h`
  const diffD = Math.round(diffH / 24)
  if (diffD < 7) return `vor ${diffD} Tg.`
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

function rawKind(item: InboxFeedItem) {
  return String(item.metadata?.kind ?? item.type ?? '')
}

function isUnread(item: InboxFeedItem) { return !item.read_at }

function isActionable(item: InboxFeedItem, variant: InboxVariant) {
  if (variant === 'dev') return DEV_ACTIONABLE_KINDS.has(rawKind(item)) && isUnread(item)
  return Boolean(item.metadata?.actionable) || item.type === 'task_event' && isUnread(item)
}

function dbCategoryForClient(cat: InboxCategoryId): string | null {
  const def = CLIENT_CATEGORIES.find(c => c.id === cat)
  return def?.dbCategory ?? null
}

function filterItems(
  items: InboxFeedItem[],
  active: InboxCategoryId,
  unreadOnly: boolean,
  variant: InboxVariant,
) {
  let out = items
  if (unreadOnly) out = out.filter(isUnread)

  if (active === 'all') return out

  if (variant === 'dev') {
    const def = DEV_CATEGORIES.find(c => c.id === active)
    const kinds = def?.kinds ?? []
    return out.filter(i => kinds.includes(rawKind(i)))
  }

  const dbCat = dbCategoryForClient(active)
  if (active === 'account') {
    return out.filter(i => i.category === 'system' || i.category === 'support')
  }
  if (active === 'project') {
    return out.filter(i => i.category === 'client' || i.category === 'team' && (i.metadata?.audience === 'client'))
  }
  if (dbCat) return out.filter(i => i.category === dbCat)
  return out
}

type InboxMasterDetailProps = {
  variant: InboxVariant
  title: string
  items: InboxFeedItem[]
  projects: Record<string, InboxProject>
  loading: boolean
  onMarkRead: (id: string) => void
  onRefresh?: () => void
  headerExtra?: React.ReactNode
  footerNote?: React.ReactNode
  welcomeOnMount?: boolean
}

export default function InboxMasterDetail({
  variant,
  title,
  items,
  projects,
  loading,
  onMarkRead,
  onRefresh,
  headerExtra,
  footerNote,
  welcomeOnMount,
}: InboxMasterDetailProps) {
  const categories = variant === 'dev' ? DEV_CATEGORIES : CLIENT_CATEGORIES
  const hintCategories = categories.filter(c => c.id !== 'all')

  const [active, setActive] = useState<InboxCategoryId>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [catMenuOpen, setCatMenuOpen] = useState(false)
  const [mobileDetail, setMobileDetail] = useState(false)
  const catMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!welcomeOnMount) return
    fetch('/api/inbox/welcome', { method: 'POST' }).catch(() => undefined)
  }, [welcomeOnMount])

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

  const filtered = useMemo(
    () => filterItems(items, active, unreadOnly, variant),
    [items, active, unreadOnly, variant],
  )

  const selected = filtered.find(i => i.id === selectedId) ?? null

  const unreadByCategory = useMemo(() => {
    const counts: Partial<Record<InboxCategoryId, number>> = { all: items.filter(isUnread).length }
    for (const cat of categories) {
      if (cat.id === 'all') continue
      counts[cat.id] = filterItems(items, cat.id, true, variant).length
    }
    return counts
  }, [items, categories, variant])

  useEffect(() => {
    setSelectedId(prev => (filtered.some(i => i.id === prev) ? prev : filtered[0]?.id ?? null))
  }, [active, unreadOnly, filtered.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function selectItem(id: string, unread: boolean) {
    setSelectedId(id)
    if (unread) onMarkRead(id)
    if (typeof window !== 'undefined' && window.innerWidth <= 760) setMobileDetail(true)
  }

  return (
    <div className={variant === 'dev' ? 'ix-shell ix-shell--dev' : 'ix-shell'}>
      <div className={`ix-root${variant === 'dev' ? ' ix-root--dev' : ''}`}>
      <style>{INBOX_CSS}</style>
      {variant === 'dev' && (
        <style>{`
          .ix-shell--dev { display: flex; flex-direction: column; height: 100%; min-height: 0; }
          .ix-root--dev { flex: 1; min-height: 0; }
          .ix-root--dev .ix-type-badge.tone-warn { color: var(--amber); background: color-mix(in srgb, var(--amber) 13%, transparent); }
          .ix-root--dev .ix-type-badge.tone-risk { color: var(--red); background: color-mix(in srgb, var(--red) 14%, transparent); }
          .ix-root--dev .ix-type-badge.tone-good { color: var(--green-dark); background: color-mix(in srgb, var(--green-dark) 13%, transparent); }
          .ix-root--dev .ix-type-badge.tone-accent { color: var(--accent); background: color-mix(in srgb, var(--accent) 15%, transparent); }
          .ix-dev-action-hint { font-size: 12px; color: var(--accent); margin-top: 4px; }
          .ix-dev-foot {
            display: flex; align-items: flex-start; gap: 7px;
            padding: 12px 18px; font-size: 11.5px; line-height: 1.55; color: var(--ix-muted);
            border-top: 1px solid var(--ix-divider);
          }
        `}</style>
      )}

      <section className={`ix-list${mobileDetail ? ' ix-list--hidden' : ''}`} aria-label={title}>
        <header className="ix-list-head">
          <div className="ix-list-title">{title}</div>
          <div className="ix-head-tools">
            {headerExtra}
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
                  const cur = categories.find(c => c.id === active) || categories[0]
                  const Icon = cur.icon
                  return (
                    <>
                      <Icon size={13} weight="regular" />
                      <span>{cur.label}</span>
                    </>
                  )
                })()}
                {(unreadByCategory[active] ?? 0) > 0 && (
                  <span className="ix-cat-count">{unreadByCategory[active]}</span>
                )}
                <CaretDown size={10} weight="bold" />
              </button>

              {catMenuOpen && (
                <div className="ix-cat-menu" role="listbox" aria-label="Kategorien">
                  {categories.map(cat => {
                    const Icon = cat.icon
                    const isOn = active === cat.id
                    const unread = unreadByCategory[cat.id] ?? 0
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
            <div className="ix-empty-list"><span className="ix-empty-sub">{title} wird geladen…</span></div>
          ) : filtered.length === 0 ? (
            <EmptyList variant={variant} active={active} unreadOnly={unreadOnly} categories={categories} />
          ) : (
            filtered.map(item => (
              <ThreadRow
                key={item.id}
                item={item}
                variant={variant}
                project={item.project_id ? projects[item.project_id] : undefined}
                selected={item.id === selectedId}
                onClick={() => selectItem(item.id, isUnread(item))}
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
          <ThreadDetail
            item={selected}
            variant={variant}
            project={selected.project_id ? projects[selected.project_id] : undefined}
            onBack={() => setMobileDetail(false)}
          />
        ) : (
          <EmptyDetail variant={variant} hintCategories={hintCategories} />
        )}
      </section>
      </div>

      {footerNote && <div className="ix-dev-foot">{footerNote}</div>}
    </div>
  )
}

function ThreadRow({
  item, variant, project, selected, onClick,
}: {
  item: InboxFeedItem
  variant: InboxVariant
  project?: InboxProject
  selected: boolean
  onClick: () => void
}) {
  const unread = isUnread(item)
  const source = String(item.metadata?.source_label ?? (variant === 'dev' ? 'Festag Ops' : 'Festag'))
  const preview = (item.body ?? '').replace(/\s+/g, ' ').slice(0, 200)
  const kind = rawKind(item)
  const devLabel = DEV_KIND_LABEL[kind]
  const devAction = unread ? DEV_KIND_ACTION[kind] : undefined

  return (
    <button
      type="button"
      className={`ix-row${selected ? ' on' : ''}${unread ? ' unread' : ''}`}
      onClick={onClick}
    >
      <div className="ix-row-marker" style={{ background: unread ? 'var(--ix-slate)' : 'transparent' }} />
      <div className="ix-row-body">
        <div className="ix-row-head">
          <span className="ix-row-source">{variant === 'dev' && devLabel ? devLabel : source}</span>
          {project && <span className="ix-row-tag">{project.title}</span>}
          <span className="ix-row-time">{formatTime(item.created_at)}</span>
        </div>
        <div className="ix-row-title">{item.title}</div>
        {preview && <div className="ix-row-preview">{preview}</div>}
        {variant === 'dev' && devAction && (
          <span className="ix-row-actionable"><CheckCircle size={11} weight="fill" /> {devAction}</span>
        )}
        {variant === 'client' && isActionable(item, variant) && (
          <span className="ix-row-actionable"><CheckCircle size={11} weight="fill" /> Aktion erforderlich</span>
        )}
      </div>
    </button>
  )
}

function ThreadDetail({
  item, variant, project, onBack,
}: {
  item: InboxFeedItem
  variant: InboxVariant
  project?: InboxProject
  onBack: () => void
}) {
  const router = useRouter()
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const kind = rawKind(item)
  const link = typeof item.metadata?.link === 'string' ? item.metadata.link : null
  const ctaUrl = typeof item.metadata?.cta_url === 'string' ? item.metadata.cta_url : link
  const ctaLabel = typeof item.metadata?.cta_label === 'string' ? item.metadata.cta_label : null
  const videoUrl = typeof item.metadata?.video_url === 'string' ? item.metadata.video_url : null

  const typeLabel = variant === 'dev'
    ? (DEV_KIND_LABEL[kind] ?? 'Update')
    : (CLIENT_ITEM_TYPE_LABEL[item.type] ?? 'Update')

  const tone = variant === 'dev'
    ? (['blocker_reported', 'owner_changes_requested', 'quality_issue'].includes(kind) ? 'tone-risk'
      : ['finished_by_dev', 'needs_review', 'proof_missing'].includes(kind) ? 'tone-warn'
      : ['tagro_verified', 'approved_by_owner'].includes(kind) ? 'tone-good'
      : ['task_assigned', 'project_available'].includes(kind) ? 'tone-accent' : '')
    : ''

  const openHref = ctaUrl
    ?? (item.project_id ? (variant === 'dev' ? `/dev/tasks?project=${item.project_id}` : `/project/${item.project_id}`)
      : variant === 'dev' ? '/dev/tasks' : '/dashboard')

  const openLabel = ctaLabel
    ?? (variant === 'dev' ? 'In Dev-Panel öffnen'
      : item.category === 'billing' ? 'Rechnungen öffnen' : 'Im Workspace öffnen')

  const devAction = isUnread(item) ? DEV_KIND_ACTION[kind] : undefined
  const canPublishToClient = variant === 'dev' && !!item.project_id && !!(item.body || item.title)

  async function publishViaTagro() {
    if (!item.project_id || publishing) return
    setPublishing(true)
    try {
      const res = await fetch('/api/dev/publish-to-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: item.project_id,
          taskId: item.metadata?.task_id ?? null,
          text: item.body || item.title,
        }),
      })
      if (res.ok) {
        setPublished(true)
        const notifId = item.metadata?.notification_id
        if (notifId) {
          await fetch('/api/dev/execution-inbox', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: String(notifId) }),
          }).catch(() => undefined)
        }
      }
    } finally {
      setPublishing(false)
    }
  }

  return (
    <article className="ix-detail-card">
      <button type="button" className="ix-detail-back" onClick={onBack}>
        <CaretLeft size={14} weight="bold" /> Zurück
      </button>
      <header className="ix-detail-head">
        <div className="ix-detail-tags">
          <span className={`ix-type-badge${tone ? ` ${tone}` : ''}`}>{typeLabel}</span>
          {project && <span className="ix-detail-project">{project.title}</span>}
        </div>
        <h1 className="ix-detail-title">{item.title}</h1>
        <div className="ix-detail-meta">
          <span>{String(item.metadata?.source_label ?? 'Festag')}</span>
          <span>·</span>
          <span>{formatTime(item.created_at)}</span>
        </div>
      </header>

      <div className="ix-detail-body">
        <p>{item.body || ''}</p>
        {variant === 'dev' && devAction && (
          <p className="ix-dev-action-hint">{devAction} →</p>
        )}
      </div>

      {videoUrl && (
        <a className="ix-video" href={videoUrl} target="_blank" rel="noreferrer">
          <span className="ix-video-play"><Play size={14} weight="fill" /></span>
          <span>
            <strong>Einführung ansehen</strong>
            <small>So funktioniert Festag — in 2 Minuten erklärt.</small>
          </span>
        </a>
      )}

      <footer className="ix-detail-actions">
        {variant === 'dev' && (
          <button
            type="button"
            className="ix-btn primary"
            onClick={() => openTagro(tagroContextForDevItem(item, project?.title))}
          >
            <Sparkle size={13} weight="fill" /> Mit Tagro bearbeiten
          </button>
        )}
        {link && variant === 'dev' ? (
          <>
            {canPublishToClient && (
              <button
                type="button"
                className="ix-btn primary"
                disabled={publishing || published}
                onClick={publishViaTagro}
              >
                {published ? 'An Client gesendet' : publishing ? 'Tagro übersetzt…' : 'Via Tagro an Client'}
              </button>
            )}
            <Link href={link} className="ix-btn">
              <ArrowSquareOut size={13} weight="regular" /> {devAction ?? 'Task öffnen'}
            </Link>
          </>
        ) : (
          <>
            {isActionable(item, variant) && item.project_id && variant === 'client' && (
              <button type="button" className="ix-btn primary" onClick={() => router.push(`/project/${item.project_id}`)}>
                Im Projekt ansehen
              </button>
            )}
            <button type="button" className="ix-btn" onClick={() => router.push(openHref)}>
              <ArrowSquareOut size={13} weight="regular" /> {openLabel}
            </button>
          </>
        )}
      </footer>
    </article>
  )
}

function EmptyList({
  variant, active, unreadOnly, categories,
}: {
  variant: InboxVariant
  active: InboxCategoryId
  unreadOnly: boolean
  categories: InboxCategoryDef[]
}) {
  const cat = categories.find(c => c.id === active)
  return (
    <div className="ix-empty-list">
      <Bell size={24} weight="regular" />
      <p className="ix-empty-title">{unreadOnly ? 'Alles gelesen' : 'Noch nichts hier'}</p>
      <p className="ix-empty-sub">
        {unreadOnly
          ? 'Keine ungelesenen Eingänge in dieser Ansicht.'
          : variant === 'dev'
            ? 'Client-Anfragen, Blocker, Prüf-Ergebnisse und Freigaben landen hier — sobald ein Projekt in die Ausführung geht.'
            : active === 'all'
              ? 'Sobald deine Projekte starten, landen Updates, Deliverables und Entscheidungs-Anfragen hier.'
              : cat?.hint || ''}
      </p>
    </div>
  )
}

function EmptyDetail({
  variant, hintCategories,
}: {
  variant: InboxVariant
  hintCategories: InboxCategoryDef[]
}) {
  return (
    <div className="ix-empty-detail">
      <div className="ix-empty-visual" aria-hidden>
        <Bell size={30} weight="light" />
      </div>
      <p className="ix-empty-title">
        {variant === 'dev' ? 'Wähle einen Eingang' : 'Wähle einen Eingang'}
      </p>
      <p className="ix-empty-sub">
        {variant === 'dev'
          ? 'Client-Anfragen, Blocker und Freigaben erscheinen links. Klicke einen Eintrag, um die nächste Aktion zu sehen.'
          : 'Updates, Rechnungen und Tagro-Zusammenfassungen erscheinen links. Für freie Fragen nutze Tagro im jeweiligen Projekt.'}
      </p>
      <div className="ix-empty-hints">
        {hintCategories.map(cat => {
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
