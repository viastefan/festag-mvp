'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, BellRinging, Check } from '@phosphor-icons/react'
import { useNotifications, type Notification } from '@/hooks/useNotifications'

/**
 * Festag notifications bell.
 *
 * Drop-in for any header / sidebar slot. Renders an icon with an unread
 * pill, and a popover with the latest entries. Clicking an entry marks
 * it read and follows its link (if any).
 *
 * Works equally for Client and Dev surfaces — the audience tag on the
 * row tells you which side an entry came from.
 */
export default function NotificationsBell({
  variant = 'sidebar',
  limit = 18,
}: {
  variant?: 'sidebar' | 'header' | 'dock'
  limit?: number
}) {
  const { items, unread, markRead, markAllRead } = useNotifications({ limit })
  const [open, setOpen] = useState(false)
  const popRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!open) return
      if (popRef.current && e.target instanceof Node && !popRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div className={`nb ${variant}`} ref={popRef}>
      <button
        className={`nb-trigger ${variant}`}
        type="button"
        aria-label="Benachrichtigungen"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        {unread > 0 ? <BellRinging size={15} /> : <Bell size={15} />}
        {unread > 0 && <span className="nb-pill">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="nb-pop" role="menu">
          <div className="nb-head">
            <strong>Benachrichtigungen</strong>
            {unread > 0 && (
              <button className="nb-mark-all" onClick={markAllRead}>
                <Check size={11} /> Alle gelesen
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="nb-empty">Keine Benachrichtigungen.</p>
          ) : (
            <ul className="nb-list">
              {items.map(n => <Item key={n.id} n={n} onMarkRead={markRead} onClose={() => setOpen(false)} />)}
            </ul>
          )}
        </div>
      )}

      <style jsx>{`
        .nb { position: relative; }
        .nb-trigger {
          position: relative;
          height: 28px; min-width: 28px; padding: 0 8px;
          border: 0; background: transparent; cursor: pointer;
          color: var(--text-muted);
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 8px;
        }
        .nb-trigger:hover { color: var(--text); background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
        .nb-trigger.header { color: var(--text-secondary); }
        .nb-trigger.dock {
          width:34px;
          min-width:34px;
          height:34px;
          padding:0;
          border-radius:12px;
          background:#fff;
          color:var(--text-secondary);
          box-shadow:0 1px 2px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.05);
        }
        .nb-trigger.dock:hover,
        .nb-trigger.dock[aria-expanded="true"] {
          background:#fff;
          color:var(--text);
          transform:translateY(-1px);
          box-shadow:0 1px 2px rgba(15,23,42,.1), 0 3px 9px rgba(15,23,42,.07);
        }
        [data-theme="dark"] .nb-trigger.dock,
        [data-theme="classic-dark"] .nb-trigger.dock {
          background:color-mix(in srgb, var(--surface) 90%, #fff 10%);
          box-shadow:0 1px 2px rgba(0,0,0,.28), 0 2px 7px rgba(0,0,0,.16);
        }
        [data-theme="dark"] .nb-trigger.dock:hover,
        [data-theme="dark"] .nb-trigger.dock[aria-expanded="true"],
        [data-theme="classic-dark"] .nb-trigger.dock:hover,
        [data-theme="classic-dark"] .nb-trigger.dock[aria-expanded="true"] {
          background:color-mix(in srgb, var(--surface) 86%, #fff 14%);
        }
        .nb-pill {
          position: absolute; top: 2px; right: 2px;
          min-width: 14px; height: 14px; padding: 0 4px;
          border-radius: 999px;
          background: var(--red);
          color: #fff;
          font-size: 9px; font-weight: 500;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .nb-pop {
          position: absolute; right: 0; top: calc(100% + 6px);
          width: 320px; max-height: 440px; overflow: auto;
          border-radius: 12px;
          border: 1px solid color-mix(in srgb, var(--border) 80%, rgba(255,255,255,.12));
          background: color-mix(in srgb, var(--surface) 92%, rgba(255,255,255,.78));
          box-shadow: 0 16px 38px rgba(15,23,42,.12), 0 1px 0 rgba(255,255,255,.32) inset;
          backdrop-filter: blur(18px) saturate(150%);
          z-index: 9999;
          animation: nbIn .18s cubic-bezier(.16,1,.3,1) both;
        }
        .nb.dock .nb-pop {
          top:auto;
          bottom:calc(100% + 8px);
        }
        @keyframes nbIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .nb-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 12px; border-bottom: 1px solid var(--border);
          font-size: 11.5px; font-weight: 500;
        }
        .nb-mark-all {
          display: inline-flex; align-items: center; gap: 4px;
          border: 0; background: transparent;
          color: var(--accent); font: inherit; font-size: 11px; cursor: pointer;
        }
        .nb-mark-all:hover { color: var(--text); }
        .nb-empty { padding: 28px 14px; margin: 0; text-align: center; color: var(--text-muted); font-size: 12px; }
        .nb-list { list-style: none; margin: 0; padding: 4px; }
      `}</style>
    </div>
  )
}

function Item({ n, onMarkRead, onClose }: { n: Notification; onMarkRead: (id: string) => void; onClose: () => void }) {
  const body = n.body || n.message || ''
  const title = n.title
  const link = n.link
  const unread = !n.read
  const time = relativeTime(n.created_at)

  function handle(e: React.MouseEvent) {
    if (unread) onMarkRead(n.id)
    if (!link) { e.preventDefault(); return }
    // Let link navigate; close popover after the click.
    setTimeout(onClose, 60)
  }

  const Inner = (
    <>
      <span className={`nb-dot ${unread ? 'unread' : ''}`} />
      <div className="nb-text">
        <p className="nb-title">{title}</p>
        {body && <p className="nb-body">{body}</p>}
        <p className="nb-time">{time}{n.audience && n.audience !== 'auto' ? ` · ${labelAudience(n.audience)}` : ''}</p>
      </div>
      <style jsx>{`
        .nb-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 7px; background: transparent; flex: 0 0 auto; }
        .nb-dot.unread { background: var(--accent); }
        .nb-text { min-width: 0; }
        .nb-title { margin: 0; font-size: 12.5px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nb-body { margin: 2px 0 0; font-size: 11.5px; color: var(--text-secondary); line-height: 1.4; }
        .nb-time { margin: 4px 0 0; font-size: 10.5px; color: var(--text-muted); }
      `}</style>
    </>
  )

  return (
    <li>
      {link ? (
        <Link href={link} onClick={handle} className="nb-row">{Inner}</Link>
      ) : (
        <button className="nb-row" onClick={handle as any}>{Inner}</button>
      )}
      <style jsx>{`
        li { margin: 0; }
        .nb-row {
          width: 100%; text-align: left; border: 0; background: transparent;
          display: grid; grid-template-columns: 10px 1fr; gap: 9px; align-items: flex-start;
          padding: 8px 10px; border-radius: 8px; cursor: pointer;
          color: inherit; text-decoration: none;
          font: inherit;
        }
        .nb-row:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
      `}</style>
    </li>
  )
}

function labelAudience(audience: string) {
  if (audience === 'client') return 'Client'
  if (audience === 'dev') return 'Developer'
  if (audience === 'admin') return 'Owner'
  return ''
}

function relativeTime(ts: string) {
  try {
    const diff = Math.round((Date.now() - new Date(ts).getTime()) / 1000)
    if (diff < 60) return 'gerade eben'
    if (diff < 3600) return `vor ${Math.round(diff / 60)} Min.`
    if (diff < 86400) return `vor ${Math.round(diff / 3600)}h`
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ts))
  } catch { return '' }
}
