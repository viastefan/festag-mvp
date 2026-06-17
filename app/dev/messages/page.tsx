'use client'

/**
 * /dev/messages — Execution Inbox (Human Execution Layer).
 * Reads notifications via /api/dev/execution-inbox — separate from client Posteingang.
 */

import { ArrowClockwise, Check, Sliders, Sparkle } from '@phosphor-icons/react'
import InboxMasterDetail from '@/components/inbox/InboxMasterDetail'
import { useDevExecutionFeed } from '@/components/inbox/useInboxFeed'
import { DEV_ACTIONABLE_KINDS } from '@/lib/inbox/catalog'
import { tagroContextForDevInbox } from '@/lib/inbox/tagro-triage'
import { openTagro } from '@/components/TagroOverlay'
import type { InboxFeedItem } from '@/components/inbox/useInboxFeed'

function rawKind(item: InboxFeedItem) {
  return String(item.metadata?.kind ?? item.type ?? '')
}

export default function DevMessagesPage() {
  const { items, projects, loading, unreadTotal, load, markRead, markAllRead } = useDevExecutionFeed()

  const actionCount = items.filter(i => !i.read_at && DEV_ACTIONABLE_KINDS.has(rawKind(i))).length
  const triageTagro = () => openTagro(tagroContextForDevInbox(items, unreadTotal, actionCount))

  return (
    <InboxMasterDetail
      variant="dev"
      title="Execution Inbox"
      items={items}
      projects={projects}
      loading={loading}
      onMarkRead={markRead}
      onRefresh={load}
      headerExtra={(
        <>
          <button type="button" className="ix-iconbtn" onClick={load} disabled={loading} title="Aktualisieren">
            <ArrowClockwise size={15} weight="regular" />
          </button>
          {unreadTotal > 0 && (
            <button type="button" className="ix-iconbtn" onClick={markAllRead} title="Alles gelesen">
              <Check size={14} weight="bold" />
            </button>
          )}
          <button type="button" className="ix-iconbtn on" onClick={triageTagro} title="Tagro Triage">
            <Sparkle size={15} weight="fill" />
          </button>
        </>
      )}
      footerNote={(
        <>
          <Sliders size={12} weight="regular" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            {actionCount > 0
              ? `${unreadTotal} ungelesen · ${actionCount} mit offener Aktion. `
              : ''}
            Operative Signale für deine Ausführung — Tagro übersetzt sie für den Client, wenn du bereit bist.
          </span>
        </>
      )}
    />
  )
}
