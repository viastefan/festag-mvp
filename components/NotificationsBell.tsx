'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  ArrowsClockwise,
  Bell,
  BellRinging,
  Check,
  CheckCircle,
  FileText,
  Prohibit,
  Scales,
  Tray,
  WarningCircle,
} from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { useNotifications, type Notification } from '@/hooks/useNotifications'
import { useUnreadCount } from '@/hooks/useUnreadCount'

type Filter = 'all' | 'unread'

/**
 * Festag notifications bell — anchor popover (desktop) / bottom sheet (mobile).
 * Drop-in for sidebar, header, dock, or portal utility rail.
 */
export default function NotificationsBell({
  variant = 'sidebar',
  limit = 18,
  inboxHref = '/benachrichtigungen',
}: {
  variant?: 'sidebar' | 'header' | 'dock' | 'portal'
  limit?: number
  inboxHref?: string
}) {
  const { items, unread: notifUnread, loading, markRead, markAllRead } = useNotifications({ limit })
  const inboxUnread = useUnreadCount()
  const unread = Math.max(notifUnread, inboxUnread)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [popPos, setPopPos] = useState({ top: 0, left: 0 })
  const isMobile = useFestagMobile()
  const close = () => setOpen(false)

  const filtered = useMemo(
    () => (filter === 'unread' ? items.filter(n => !n.read) : items),
    [items, filter],
  )

  const groups = useMemo(() => groupByDay(filtered), [filtered])

  useEffect(() => {
    function place() {
      if (!open || variant !== 'portal' || isMobile) return
      const r = triggerRef.current?.getBoundingClientRect()
      if (!r) return
      const popW = 360
      setPopPos({
        top: r.bottom + 8,
        left: Math.max(12, Math.min(r.right - popW, window.innerWidth - popW - 12)),
      })
    }
    if (open) place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, variant, isMobile])

  useEffect(() => {
    if (!open || !isMobile || variant !== 'portal') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, isMobile, variant])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!open) return
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      if (popRef.current?.contains(t)) return
      setOpen(false)
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const popContent = (
    <>
      <header className="nb-head">
        <div className="nb-head-main">
          <h2 className="nb-title">Benachrichtigungen</h2>
          {unread > 0 && <span className="nb-count">{unread > 99 ? '99+' : unread}</span>}
        </div>
        {unread > 0 && (
          <button type="button" className="nb-mark-all" onClick={markAllRead}>
            <Check size={12} weight="bold" />
            Alle gelesen
          </button>
        )}
      </header>

      <div className="nb-filters" role="tablist" aria-label="Filter">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={`nb-filter${filter === 'all' ? ' on' : ''}`}
          onClick={() => setFilter('all')}
        >
          Alle
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'unread'}
          className={`nb-filter${filter === 'unread' ? ' on' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Ungelesen
          {unread > 0 && <span className="nb-filter-badge">{unread > 9 ? '9+' : unread}</span>}
        </button>
      </div>

      <div className="nb-scroll">
        {loading ? (
          <div className="nb-loading">
            {[0, 1, 2].map(i => (
              <div key={i} className="nb-skel">
                <span className="nb-skel-line" />
                <span className="nb-skel-line short" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          groups.map(group => (
            <section key={group.label} className="nb-group">
              <h3 className="nb-group-label">{group.label}</h3>
              <ul className="nb-list">
                {group.items.map(n => (
                  <Item key={n.id} n={n} onMarkRead={markRead} onClose={close} inboxHref={inboxHref} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <footer className="nb-foot">
        <Link href={inboxHref} className="nb-inbox-link" onClick={close}>
          Alle Benachrichtigungen anzeigen →
        </Link>
      </footer>
    </>
  )

  const popNode = (
    <div
      ref={popRef}
      className={[
        'nb-pop festag-popup-surface',
        variant === 'portal' && isMobile ? ' festag-popup-mobile-sheet' : '',
        variant === 'portal' && !isMobile ? ' festag-anchor-popover' : '',
      ].join('')}
      role="dialog"
      aria-label="Benachrichtigungen"
      style={variant === 'portal' && !isMobile ? {
        position: 'fixed',
        top: popPos.top,
        left: popPos.left,
        right: 'auto',
        zIndex: 120001,
      } : undefined}
    >
      {variant === 'portal' && isMobile && <FestagPopupDragHandle onDismiss={close} />}
      {popContent}
    </div>
  )

  const portalNode = variant === 'portal' && isMobile ? (
    <div className="festag-popup-mobile-host">
      <button type="button" className="festag-popup-backdrop" aria-label="Schließen" onClick={close} />
      {popNode}
    </div>
  ) : popNode

  return (
    <div className={`nb ${variant}`} ref={rootRef}>
      <button
        ref={triggerRef}
        className={`nb-trigger ${variant}`}
        type="button"
        aria-label="Benachrichtigungen"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        {unread > 0 ? (
          <BellRinging size={variant === 'portal' ? 13 : 15} weight={variant === 'portal' ? 'light' : 'regular'} />
        ) : (
          <Bell size={variant === 'portal' ? 13 : 15} weight={variant === 'portal' ? 'light' : 'regular'} />
        )}
        {unread > 0 && <span className="nb-pill">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        variant === 'portal' && typeof document !== 'undefined'
          ? createPortal(portalNode, document.body)
          : popNode
      )}

      <style>{CSS}</style>
    </div>
  )
}

function resolveNotificationLink(n: Notification, inboxHref: string) {
  const payload = n.payload as Record<string, unknown> | null
  const inboxItemId = payload?.inbox_item_id ?? payload?.inboxItemId
  if (typeof inboxItemId === 'string' && inboxItemId) {
    return `${inboxHref}?thread=${inboxItemId}`
  }
  const raw = n.link
  if (!raw) return null
  if (raw.startsWith('/messages') || raw.startsWith('/inbox')) {
    return raw.replace(/^\/(messages|inbox)/, inboxHref)
  }
  return raw
}

function EmptyState({ filter }: { filter: Filter }) {
  const isUnreadFilter = filter === 'unread'
  return (
    <div className="nb-empty">
      <div className="nb-empty-visual" aria-hidden>
        <Bell size={26} weight="regular" />
      </div>
      <p className="nb-empty-title">
        {isUnreadFilter ? 'Keine ungelesenen Hinweise' : 'Alles erledigt'}
      </p>
      <p className="nb-empty-sub">
        {isUnreadFilter
          ? 'Du hast alle aktuellen Benachrichtigungen gelesen.'
          : 'Neue Updates zu Aufgaben, Freigaben und Entscheidungen erscheinen hier.'}
      </p>
    </div>
  )
}

function Item({ n, onMarkRead, onClose, inboxHref }: { n: Notification; onMarkRead: (id: string) => void; onClose: () => void; inboxHref: string }) {
  const body = (n.body || n.message || '').trim()
  const title = n.title
  const link = resolveNotificationLink(n, inboxHref)
  const unread = !n.read
  const time = relativeTime(n.created_at)
  const kind = n.kind || n.type || ''
  const Icon = iconForKind(kind)
  const source = labelKind(kind) || labelAudience(n.audience)

  function handle(e: React.MouseEvent) {
    if (unread) onMarkRead(n.id)
    if (!link) { e.preventDefault(); return }
    setTimeout(onClose, 60)
  }

  const row = (
    <>
      <div className="nb-row-marker" style={{ background: unread ? 'var(--fp-text)' : 'transparent' }} />
      <div className="nb-row-icon" aria-hidden>
        <Icon size={14} weight="regular" />
      </div>
      <div className="nb-row-body">
        <div className="nb-row-head">
          {source && <span className="nb-row-source">{source}</span>}
          <span className="nb-row-time">{time}</span>
        </div>
        <p className="nb-row-title">{title}</p>
        {body && <p className="nb-row-preview">{body}</p>}
      </div>
    </>
  )

  return (
    <li>
      {link ? (
        <Link href={link} onClick={handle} className={`nb-row${unread ? ' unread' : ''}`}>{row}</Link>
      ) : (
        <button type="button" className={`nb-row${unread ? ' unread' : ''}`} onClick={handle}>{row}</button>
      )}
    </li>
  )
}

function iconForKind(kind: string) {
  const k = kind.toLowerCase()
  if (k.includes('blocker')) return Prohibit
  if (k.includes('approved') || k.includes('finished') || k.includes('verified') || k.includes('tagro_verified')) return CheckCircle
  if (k.includes('review') || k.includes('quality') || k.includes('changes') || k.includes('proof_missing')) return WarningCircle
  if (k.includes('assigned') || k.includes('request')) return Tray
  if (k.includes('proof')) return FileText
  if (k.includes('status')) return ArrowsClockwise
  if (k.includes('decision')) return Scales
  return Bell
}

function labelKind(kind: string) {
  const k = kind.toLowerCase()
  if (k.includes('blocker')) return 'Blocker'
  if (k.includes('approved') || k.includes('finished')) return 'Freigabe'
  if (k.includes('verified') || k.includes('tagro')) return 'Tagro'
  if (k.includes('review') || k.includes('quality')) return 'Review'
  if (k.includes('assigned')) return 'Aufgabe'
  if (k.includes('request')) return 'Anfrage'
  if (k.includes('proof')) return 'Nachweis'
  if (k.includes('status')) return 'Status'
  if (k.includes('decision')) return 'Entscheidung'
  if (k.includes('work_log')) return 'Update'
  return ''
}

function labelAudience(audience: string | null) {
  if (!audience || audience === 'auto') return ''
  if (audience === 'client') return 'Client'
  if (audience === 'dev') return 'Developer'
  if (audience === 'admin') return 'Owner'
  return ''
}

function groupByDay(items: Notification[]) {
  const today: Notification[] = []
  const earlier: Notification[] = []
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  for (const n of items) {
    const d = new Date(n.created_at)
    if (d >= startOfToday) today.push(n)
    else earlier.push(n)
  }

  const out: { label: string; items: Notification[] }[] = []
  if (today.length) out.push({ label: 'Heute', items: today })
  if (earlier.length) out.push({ label: 'Früher', items: earlier })
  return out
}

function relativeTime(ts: string) {
  try {
    const diff = Math.round((Date.now() - new Date(ts).getTime()) / 1000)
    if (diff < 60) return 'gerade eben'
    if (diff < 3600) return `vor ${Math.round(diff / 60)} Min.`
    if (diff < 86400) return `vor ${Math.round(diff / 3600)} Std.`
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(ts))
  } catch { return '' }
}

const CSS = `
  .nb { position: relative; }
  .nb-trigger {
    position: relative;
    height: 28px; min-width: 28px; padding: 0 8px;
    border: 0; background: transparent; cursor: pointer;
    color: var(--text-muted);
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 8px;
    transition: color .12s ease, background .12s ease;
  }
  .nb-trigger:hover { color: var(--text); background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
  .nb-trigger.header { color: var(--text-secondary); }
  .nb-trigger.portal {
    width: 28px; min-width: 28px; height: 28px; padding: 0;
    border-radius: 8px;
    color: var(--portal-text, #1D1D1F);
  }
  .nb-trigger.portal svg {
    vertical-align: middle;
  }
  .nb-trigger.portal:hover,
  .nb-trigger.portal[aria-expanded="true"] {
    background: rgba(255,255,255,.08);
    color: var(--portal-text, #fff);
  }
  [data-theme="light"] .nb-trigger.portal,
  [data-theme="read"] .nb-trigger.portal,
  [data-theme="pure-light"] .nb-trigger.portal {
    color: var(--portal-text, #1D1D1F);
  }
  [data-theme="light"] .nb-trigger.portal:hover,
  [data-theme="light"] .nb-trigger.portal[aria-expanded="true"],
  [data-theme="read"] .nb-trigger.portal:hover,
  [data-theme="read"] .nb-trigger.portal[aria-expanded="true"],
  [data-theme="pure-light"] .nb-trigger.portal:hover,
  [data-theme="pure-light"] .nb-trigger.portal[aria-expanded="true"] {
    background: rgba(0,0,0,.04);
    color: var(--portal-text, #1D1D1F);
  }
  .nb.portal .nb-pill {
    top: 2px; right: 2px;
    min-width: 18px; height: 18px;
    font-size: 10px;
  }
  .nb-trigger.dock {
    width: 34px; min-width: 34px; height: 34px; padding: 0;
    border-radius: 12px;
    background: #fff;
    color: var(--text-secondary);
    box-shadow: 0 1px 2px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.05);
  }
  .nb-trigger.dock:hover,
  .nb-trigger.dock[aria-expanded="true"] {
    background: #fff;
    color: var(--text);
    transform: translateY(-1px);
    box-shadow: 0 1px 2px rgba(15,23,42,.1), 0 3px 9px rgba(15,23,42,.07);
  }
  [data-theme="dark"] .nb-trigger.dock,
  [data-theme="classic-dark"] .nb-trigger.dock {
    background: color-mix(in srgb, var(--surface) 90%, #fff 10%);
    box-shadow: 0 1px 2px rgba(0,0,0,.28), 0 2px 7px rgba(0,0,0,.16);
  }
  [data-theme="dark"] .nb-trigger.dock:hover,
  [data-theme="dark"] .nb-trigger.dock[aria-expanded="true"],
  [data-theme="classic-dark"] .nb-trigger.dock:hover,
  [data-theme="classic-dark"] .nb-trigger.dock[aria-expanded="true"] {
    background: color-mix(in srgb, var(--surface) 86%, #fff 14%);
  }
  .nb-pill {
    position: absolute; top: 2px; right: 2px;
    min-width: 18px; height: 18px; padding: 0 4px;
    border-radius: 999px;
    background: #000;
    color: #fff;
    font-size: 10px; font-weight: 500;
    display: inline-flex; align-items: center; justify-content: center;
    line-height: 1;
  }
  [data-theme="dark"] .nb-pill,
  [data-theme="classic-dark"] .nb-pill {
    background: #fff;
    color: #000;
  }

  .nb-pop {
    display: flex; flex-direction: column;
    width: 360px; max-width: calc(100vw - 24px);
    max-height: min(520px, 72dvh);
    overflow: hidden;
    z-index: 9999;
    border-radius: 24px;
    animation: nbIn .16s cubic-bezier(.16, 1, .3, 1) both;
  }
  .nb:not(.portal) .nb-pop {
    position: absolute; right: 0; top: calc(100% + 8px);
  }
  .nb.dock .nb-pop {
    top: auto;
    bottom: calc(100% + 8px);
  }
  .nb-pop.festag-popup-mobile-sheet {
    position: relative;
    width: 100%;
    max-width: 100%;
    max-height: min(88dvh, 560px);
    border-radius: 20px 20px 0 0;
    animation: none;
    z-index: auto;
  }
  @keyframes nbIn {
    from { opacity: 0; transform: translateY(4px) scale(.985); }
    to { opacity: 1; transform: none; }
  }

  .nb-head {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 12px 12px 8px;
    flex-shrink: 0;
  }
  .nb-head-main {
    display: inline-flex; align-items: center; gap: 7px; min-width: 0;
  }
  .nb-title {
    margin: 0;
    font-size: 14px; font-weight: 400; letter-spacing: -0.01em;
    color: var(--fp-text);
  }
  .nb-count {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--fp-text) 12%, var(--fp-pill));
    color: var(--fp-text);
    font-size: 10px; font-weight: 500;
  }
  .nb-mark-all {
    display: inline-flex; align-items: center; gap: 5px;
    border: 0; background: transparent;
    color: var(--fp-muted);
    font: inherit; font-size: 11.5px; font-weight: 400;
    cursor: pointer; flex-shrink: 0;
    padding: 4px 6px; border-radius: 8px;
    transition: color .12s ease, background .12s ease;
  }
  .nb-mark-all:hover {
    color: var(--fp-text);
    background: var(--fp-hover);
  }

  .nb-filters {
    display: flex; gap: 4px;
    padding: 0 10px 10px;
    flex-shrink: 0;
  }
  .nb-filter {
    display: inline-flex; align-items: center; gap: 5px;
    height: 28px; padding: 0 10px;
    border: 0; border-radius: 8px;
    background: transparent;
    color: var(--fp-muted);
    font: inherit; font-size: 12px; font-weight: 400;
    cursor: pointer;
    transition: background .12s ease, color .12s ease;
  }
  .nb-filter:hover { background: var(--fp-hover); color: var(--fp-text); }
  .nb-filter.on {
    background: var(--fp-pill);
    color: var(--fp-text);
  }
  .nb-filter-badge {
    min-width: 16px; height: 16px; padding: 0 4px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--fp-text) 14%, transparent);
    color: var(--fp-text);
    font-size: 9px; font-weight: 500;
    display: inline-flex; align-items: center; justify-content: center;
  }

  .nb-scroll {
    flex: 1 1 auto; min-height: 0;
    overflow-y: auto; overflow-x: hidden;
    padding: 0 6px 4px;
    scrollbar-width: none;
  }
  .nb-scroll::-webkit-scrollbar { display: none; }

  .nb-group { margin-bottom: 4px; }
  .nb-group-label {
    margin: 0; padding: 4px 8px 6px;
    font-size: 10.5px; font-weight: 500;
    letter-spacing: 0.04em; text-transform: uppercase;
    color: var(--fp-muted);
  }
  .nb-list { list-style: none; margin: 0; padding: 0; }

  .nb-row {
    display: grid;
    grid-template-columns: 3px 28px 1fr;
    gap: 8px; align-items: stretch;
    width: 100%; padding: 9px 8px;
    border: 0; border-radius: 8px;
    background: transparent;
    text-align: left; cursor: pointer;
    color: inherit; text-decoration: none;
    font: inherit;
    transition: background .12s ease;
    box-sizing: border-box;
  }
  .nb-row:hover { background: var(--fp-hover); }
  .nb-row-marker {
    width: 3px; min-width: 3px; border-radius: 2px; align-self: stretch;
  }
  .nb-row-icon {
    width: 28px; height: 28px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px;
    background: var(--fp-pill);
    color: var(--fp-muted);
    align-self: start;
    margin-top: 1px;
  }
  .nb-row.unread .nb-row-icon { color: var(--fp-text); }
  .nb-row-body { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .nb-row-head {
    display: flex; align-items: center; gap: 6px;
    font-size: 10.5px; color: var(--fp-muted);
  }
  .nb-row-source {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    color: var(--fp-soft);
  }
  .nb-row-time { margin-left: auto; flex-shrink: 0; }
  .nb-row-title {
    margin: 0;
    font-size: 13px; font-weight: 400; letter-spacing: -0.01em;
    color: var(--fp-text); line-height: 1.35;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .nb-row:not(.unread) .nb-row-title { color: var(--fp-soft); }
  .nb-row-preview {
    margin: 0;
    font-size: 12px; line-height: 1.4; color: var(--fp-muted);
    overflow: hidden; text-overflow: ellipsis;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }

  .nb-empty {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; padding: 28px 20px 20px;
  }
  .nb-empty-visual {
    width: 56px; height: 56px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: var(--fp-pill);
    color: var(--fp-muted);
    margin-bottom: 14px;
    box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 35%, transparent);
  }
  [data-theme="dark"] .nb-empty-visual,
  [data-theme="classic-dark"] .nb-empty-visual {
    box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
  }
  .nb-empty-title {
    margin: 0 0 6px;
    font-size: 14px; font-weight: 400; color: var(--fp-text);
  }
  .nb-empty-sub {
    margin: 0;
    font-size: 12.5px; line-height: 1.55; color: var(--fp-muted);
    max-width: 260px;
  }

  .nb-loading { padding: 8px 10px 12px; display: flex; flex-direction: column; gap: 10px; }
  .nb-skel { display: flex; flex-direction: column; gap: 6px; padding: 6px 4px; }
  .nb-skel-line {
    height: 10px; border-radius: 6px;
    background: linear-gradient(90deg, var(--fp-pill) 0%, var(--fp-hover) 50%, var(--fp-pill) 100%);
    background-size: 200% 100%;
    animation: nbShimmer 1.2s ease-in-out infinite;
  }
  .nb-skel-line.short { width: 55%; }
  @keyframes nbShimmer {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }

  .nb-foot {
    flex-shrink: 0;
    padding: 6px 6px 8px;
    border-top: 1px solid var(--fp-divider);
  }
  .nb-inbox-link {
    display: flex; align-items: center; justify-content: center;
    width: 100%; min-height: 34px;
    border-radius: 8px;
    font-size: 12.5px; font-weight: 400; letter-spacing: -0.01em;
    color: var(--fp-muted); text-decoration: none;
    transition: background .12s ease, color .12s ease;
  }
  .nb-inbox-link:hover {
    background: var(--fp-hover);
    color: var(--fp-text);
  }
`
