'use client'

import { Suspense, useState } from 'react'
import { Check, PencilSimple, Sparkle } from '@phosphor-icons/react'
import { NotificationList } from '@/components/benachrichtigungen/NotificationList'
import { NotificationDetail } from '@/components/benachrichtigungen/NotificationDetail'
import { BENACHRICHTIGUNGEN_CSS } from '@/components/benachrichtigungen/benachrichtigungen-styles'
import { useInboxNotifications } from '@/hooks/useInboxNotifications'
import MobileCodexListChrome from '@/components/mobile/MobileCodexListChrome'
import MobilePageHeader from '@/components/MobilePageHeader'
import { openTagro } from '@/components/TagroOverlay'
import { tagroContextForClientInbox } from '@/lib/inbox/tagro-triage'
import type { InboxFeedItem } from '@/components/inbox/useInboxFeed'
import type { Notification } from '@/types/notification'

export default function BenachrichtigungenPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--text-muted)' }}>Benachrichtigungen werden geladen…</div>}>
      <BenachrichtigungenPageInner />
    </Suspense>
  )
}

function BenachrichtigungenPageInner() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('Alle')
  const { notifications, markAsRead, markAllRead } = useInboxNotifications()

  const filtered = activeTab === 'Alle'
    ? notifications
    : notifications.filter(n => n.category === activeTab)

  const active = notifications.find(n => n.id === activeId) ?? null
  const unreadTotal = notifications.filter(n => !n.read).length

  const tagroInbox = () => openTagro(tagroContextForClientInbox(
    notifications.map(toInboxFeedItem),
    unreadTotal,
  ))

  const subtitle = unreadTotal > 0
    ? `${unreadTotal} ungelesen`
    : `${notifications.length} Einträge`

  function handleSelect(id: string) {
    setActiveId(id)
    void markAsRead(id)
  }

  return (
    <MobileCodexListChrome
      className="msg-page"
      title="Benachrichtigungen"
      subtitle={subtitle}
      legacyHeader={<MobilePageHeader title="Benachrichtigungen" />}
      mobileActions={(
        <>
          {unreadTotal > 0 ? (
            <button type="button" className="mcl-add-btn" aria-label="Alles gelesen" onClick={() => void markAllRead()}>
              <Check size={18} weight="bold" />
            </button>
          ) : (
            <button type="button" className="mcl-add-btn" aria-label="Tagro Triage" onClick={tagroInbox}>
              <Sparkle size={17} weight="fill" />
            </button>
          )}
        </>
      )}
      dock={{
        onDragUp: tagroInbox,
        primary: {
          id: 'triage',
          label: 'Inbox besprechen...',
          icon: <Sparkle size={14} weight="fill" />,
          onClick: tagroInbox,
          ariaLabel: 'Mit Tagro besprechen',
        },
        secondary: {
          id: 'tagro',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: tagroInbox,
          ariaLabel: 'Mit Tagro bearbeiten',
        },
      }}
      extraCss={PAGE_CSS}
    >
      <div className="bn-root">
        <NotificationList
          items={filtered}
          activeId={activeId}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSelect={handleSelect}
          onMarkAllRead={() => void markAllRead()}
        />
        <NotificationDetail
          notification={active}
          onClose={() => setActiveId(null)}
        />
      </div>
    </MobileCodexListChrome>
  )
}

function toInboxFeedItem(n: Notification): InboxFeedItem {
  return {
    id: n.id,
    thread_id: n.thread_id ?? n.id,
    user_id: '',
    project_id: n.project_id ?? null,
    category: n.category,
    type: 'system_event',
    title: n.title,
    body: n.preview,
    metadata: null,
    read_at: n.read ? new Date().toISOString() : null,
    created_at: n.created_at,
  }
}

const PAGE_CSS = `
${BENACHRICHTIGUNGEN_CSS}

  .portal-app-main .msg-page.mcl-page {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
  }

  @media (min-width: 769px) {
    .msg-page.mcl-page {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      height: 100%;
    }
    .msg-page .mcl-shell,
    .msg-page .mcl-body {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .msg-page .bn-root {
      flex: 1 1 auto;
      min-height: 0;
      height: 100%;
    }
  }

  @media (max-width: 768px) {
    .msg-page .mcl-body { padding: 0 !important; gap: 0 !important; }
  }
`
