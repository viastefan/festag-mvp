'use client'

import { useEffect, useState } from 'react'
import { Bell, FilePdf, X, ArrowUp } from '@phosphor-icons/react'
import type { Notification } from '@/types/notification'
import { formatFullDate } from '@/lib/utils/time'
import { CLIENT_CATEGORIES } from '@/lib/inbox/catalog'
import { openAgencyDocumentPdfById } from '@/lib/documents/open-document-pdf'

const HINT_CATEGORIES = CLIENT_CATEGORIES.filter(c => c.id !== 'all')

interface Props {
  notification: Notification | null
  onClose: () => void
}

export function NotificationDetail({ notification, onClose }: Props) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)

  const documentId = typeof notification?.metadata?.document_id === 'string'
    ? notification.metadata.document_id
    : null

  useEffect(() => {
    setReply('')
    setSending(false)
    setSendError('')
  }, [notification?.id])

  if (!notification) {
    return (
      <div className="bn-detail bn-detail-empty">
        <div className="bn-empty-detail">
          <div className="bn-empty-visual" aria-hidden>
            <Bell size={30} weight="light" />
          </div>
          <p className="bn-empty-title">Alles auf dem neuesten Stand</p>
          <p className="bn-empty-sub">
            Hier erscheinen Updates von Tagro, Nachrichten von Kunden und Systemmeldungen.
            Wähle links einen Eintrag für Details.
          </p>
          <div className="bn-empty-hints">
            {HINT_CATEGORIES.map(cat => {
              const Icon = cat.icon
              return (
                <span key={cat.id} className="bn-empty-hint">
                  <Icon size={12} weight="regular" />
                  {cat.label}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  async function handleSend() {
    if (!reply.trim() || sending || !notification) return
    setSending(true)
    setSendError('')

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
      if (res.ok) {
        setReply('')
        return
      }
      await res.json().catch(() => ({}))
      setSendError(
        res.status === 403
          ? 'Keine Berechtigung für dieses Projekt.'
          : 'Antwort konnte nicht gesendet werden.',
      )
    } catch {
      setSendError('Antwort konnte nicht gesendet werden.')
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

        {documentId && (notification.category === 'Rechnung' || notification.db_category === 'billing') && (
          <div className="bn-block outline">
            <p className="bn-block-label">Dokument</p>
            <button
              type="button"
              className="bn-doc-pdf"
              disabled={pdfBusy}
              onClick={async () => {
                setPdfBusy(true)
                try {
                  const ok = await openAgencyDocumentPdfById(documentId)
                  if (!ok) setSendError('PDF konnte nicht geöffnet werden.')
                } finally {
                  setPdfBusy(false)
                }
              }}
            >
              <FilePdf size={15} weight="fill" />
              {pdfBusy ? 'Öffne PDF…' : 'Rechnung als PDF öffnen'}
            </button>
          </div>
        )}

        {notification.category === 'Kunde' && (
          <p className="bn-hint">
            Deine Antwort wird von Tagro automatisch für den Kunden übersetzt.
          </p>
        )}
        {sendError && (
          <p className="bn-hint" style={{ color: '#b45309' }}>{sendError}</p>
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
