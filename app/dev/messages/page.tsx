'use client'

/**
 * /dev/messages — Execution Inbox (Human Execution Layer).
 * Reads notifications via /api/dev/execution-inbox — separate from client Posteingang.
 */

import { ArrowClockwise, Sliders } from '@phosphor-icons/react'
import TagroEntryButton from '@/components/TagroEntryButton'
import InboxMasterDetail from '@/components/inbox/InboxMasterDetail'
import { useDevExecutionFeed } from '@/components/inbox/useInboxFeed'
import { DEV_ACTIONABLE_KINDS } from '@/lib/inbox/catalog'
import type { InboxFeedItem } from '@/components/inbox/useInboxFeed'

function rawKind(item: InboxFeedItem) {
  return String(item.metadata?.kind ?? item.type ?? '')
}

export default function DevMessagesPage() {
  const { items, projects, loading, unreadTotal, load, markRead, markAllRead } = useDevExecutionFeed()

  const actionCount = items.filter(i => !i.read_at && DEV_ACTIONABLE_KINDS.has(rawKind(i))).length

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
              ✓
            </button>
          )}
          <TagroEntryButton
            context={{
              contextType: 'empty',
              id: 'dev-inbox',
              title: 'Execution Inbox · Triage',
              subtitle: `${items.length} Ereignisse · ${unreadTotal} ungelesen`,
            }}
          />
        </>
      )}
      footerNote={(
        <>
          <Sliders size={12} weight="regular" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            {actionCount > 0
              ? `${unreadTotal} ungelesen · ${actionCount} mit offener Aktion. `
              : ''}
            Operative Ereignisse für deine Ausführung — Client-Anfragen, Blocker, Reviews. Der Client-Posteingang zeigt nur die freigegebene Sicht.
          </span>
        </>
      )}
    />
  )
}
