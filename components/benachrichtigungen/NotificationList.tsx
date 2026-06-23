'use client'

import { Bell, Faders } from '@phosphor-icons/react'
import type { Notification } from '@/types/notification'
import { formatRelativeTime } from '@/lib/utils/time'

const TABS = ['Alle', 'Projekt', 'Kunde', 'Tagro', 'Rechnung'] as const

interface Props {
  items: Notification[]
  activeId: string | null
  activeTab: string
  onTabChange: (tab: string) => void
  onSelect: (id: string) => void
  onMarkAllRead: () => void
}

export function NotificationList({
  items, activeId, activeTab, onTabChange, onSelect, onMarkAllRead,
}: Props) {
  const unreadCount = items.filter(n => !n.read).length

  return (
    <div className="bn-list">
      <div className="bn-list-head">
        <span className="bn-list-title">Benachrichtigungen</span>
        <div className="bn-list-tools">
          <button type="button" className="bn-icon-btn" aria-label="Filter">
            <Faders size={13} weight="regular" />
          </button>
          {unreadCount > 0 && (
            <button type="button" className="bn-mark-all" onClick={onMarkAllRead}>
              Alle gelesen
            </button>
          )}
        </div>
      </div>

      <div className="bn-tabs" role="tablist" aria-label="Kategorien">
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => onTabChange(tab)}
            className={`bn-tab${activeTab === tab ? ' on' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bn-rows">
        {items.length === 0 ? (
          <div className="bn-empty-list">
            <div className="bn-empty-visual bn-empty-visual--sm" aria-hidden>
              <Bell size={24} weight="regular" />
            </div>
            <p className="bn-empty-title">Alles auf dem neuesten Stand</p>
            <p className="bn-empty-sub">
              Hier erscheinen Updates von Tagro, Nachrichten von Kunden und Systemmeldungen.
            </p>
          </div>
        ) : (
          items.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => onSelect(n.id)}
              className={`bn-row${activeId === n.id ? ' on' : ''}`}
            >
              <div className="bn-dot-wrap">
                <div className={`bn-dot${!n.read ? ' unread' : ''}`} />
              </div>

              <div className="bn-row-body">
                <div className="bn-row-top">
                  <span className={`bn-row-title${!n.read ? ' unread' : ' read'}`}>
                    {n.title}
                  </span>
                  <span className="bn-row-time">{formatRelativeTime(n.created_at)}</span>
                </div>

                <p className="bn-row-preview">{n.preview}</p>

                <span className="bn-row-tag">{n.category}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
