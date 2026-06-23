'use client'

import { useState } from 'react'
import { X, ArrowUp } from '@phosphor-icons/react'
import type { Notification } from '@/types/notification'
import { formatFullDate } from '@/lib/utils/time'

interface Props {
  notification: Notification | null
  onClose: () => void
}

export function NotificationDetail({ notification, onClose }: Props) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  if (!notification) {
    return (
      <div className="bn-detail bn-detail-empty">
        <span className="bn-detail-empty-emoji" aria-hidden>🔔</span>
        <p className="bn-detail-empty-text">Wähle eine Benachrichtigung</p>
      </div>
    )
  }

  async function handleSend() {
    if (!reply.trim() || sending || !notification) return
    setSending(true)

    try {
      const res = await fetch('/api/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: notification.project_id,
          threadId: notification.thread_id ?? notification.id,
          content: reply.trim(),
        }),
      })
      if (res.ok) setReply('')
    } finally {
      setSending(false)
    }
  }

  const kickerParts = [notification.sender_name, notification.project_name].filter(Boolean)

  return (
    <div className="bn-detail">
      <div className="bn-detail-head">
        <div>
          {kickerParts.length > 0 && (
            <p className="bn-detail-kicker">{kickerParts.join(', ')}</p>
          )}
          <h2 className="bn-detail-title">{notification.title}</h2>
          <div className="bn-detail-meta">
            <span className="bn-detail-tag">{notification.category}</span>
            <span className="bn-detail-date">{formatFullDate(notification.created_at)}</span>
          </div>
        </div>
        <button type="button" onClick={onClose} className="bn-close" aria-label="Schließen">
          <X size={15} weight="regular" />
        </button>
      </div>

      <div className="bn-detail-scroll">
        {notification.original_text && (
          <div className="bn-block muted">
            <p className="bn-block-label">Originalnachricht</p>
            <p className="bn-block-text">{notification.original_text}</p>
          </div>
        )}

        {notification.tagro_translation && (
          <div className="bn-block outline">
            <div className="bn-block-label-row">
              <div className="bn-tagro-dot" aria-hidden />
              <p className="bn-block-label" style={{ margin: 0 }}>Tagro Übersetzung</p>
            </div>
            <p className="bn-block-text tagro">{notification.tagro_translation}</p>
          </div>
        )}

        {!notification.original_text && !notification.tagro_translation && (
          <div className="bn-block muted">
            <p className="bn-block-text">{notification.preview}</p>
          </div>
        )}

        {notification.category === 'Kunde' && (
          <p className="bn-hint">
            Deine Antwort wird von Tagro automatisch für den Kunden übersetzt.
          </p>
        )}
      </div>

      {notification.category === 'Kunde' && notification.project_id && (
        <div className="bn-composer">
          <div className="bn-composer-box">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSend()
              }}
              placeholder="Antworte auf Deutsch — Tagro übersetzt für den Kunden..."
              rows={2}
              className="bn-composer-input"
            />
            <div className="bn-composer-foot">
              <div className="bn-composer-note">
                <div className="bn-tagro-dot" aria-hidden />
                <span>Tagro übersetzt automatisch</span>
              </div>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!reply.trim() || sending}
                className="bn-send"
              >
                {sending ? 'Senden...' : 'Senden'}
                {!sending && <ArrowUp size={12} weight="bold" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
