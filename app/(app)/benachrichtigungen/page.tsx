'use client'

import { Suspense } from 'react'
import { Check, ArrowsClockwise, PencilSimple, Sparkle } from '@phosphor-icons/react'
import { useSearchParams } from 'next/navigation'
import InboxMasterDetail from '@/components/inbox/InboxMasterDetail'
import MobileCodexListChrome from '@/components/mobile/MobileCodexListChrome'
import MobilePageHeader from '@/components/MobilePageHeader'
import { openTagro } from '@/components/TagroOverlay'
import { tagroContextForClientInbox } from '@/lib/inbox/tagro-triage'
import { useClientInboxFeed } from '@/components/inbox/useInboxFeed'

export default function BenachrichtigungenPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--text-muted)' }}>Benachrichtigungen werden geladen…</div>}>
      <BenachrichtigungenPageInner />
    </Suspense>
  )
}

function BenachrichtigungenPageInner() {
  const searchParams = useSearchParams()
  const activeThreadId = searchParams.get('thread')

  const { items, projects, loading, unreadTotal, load, markRead, markAllRead } = useClientInboxFeed()

  const tagroInbox = () => openTagro(tagroContextForClientInbox(items, unreadTotal))

  const subtitle = loading
    ? 'Wird geladen…'
    : unreadTotal > 0
      ? `${unreadTotal} ungelesen`
      : `${items.length} Einträge`

  return (
    <MobileCodexListChrome
      className="msg-page"
      title="Benachrichtigungen"
      subtitle={subtitle}
      legacyHeader={<MobilePageHeader title="Benachrichtigungen" />}
      mobileActions={(
        <>
          {unreadTotal > 0 ? (
            <button type="button" className="mcl-add-btn" aria-label="Alles gelesen" onClick={markAllRead}>
              <Check size={18} weight="bold" />
            </button>
          ) : (
            <button type="button" className="mcl-add-btn" aria-label="Tagro Triage" onClick={tagroInbox}>
              <Sparkle size={17} weight="fill" />
            </button>
          )}
          <div className="mcl-actions-group">
            <button type="button" className="mcl-ctl" aria-label="Aktualisieren" onClick={() => void load()}>
              <ArrowsClockwise size={17} weight="regular" />
            </button>
          </div>
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
      extraCss={MSG_INBOX_CSS}
    >
      <InboxMasterDetail
        variant="client"
        title="Benachrichtigungen"
        items={items}
        projects={projects}
        loading={loading}
        onMarkRead={markRead}
        onRefresh={load}
        welcomeOnMount
        initialThreadId={activeThreadId}
        horizontalCategoryTabs
      />
    </MobileCodexListChrome>
  )
}

const MSG_INBOX_CSS = `
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
    .msg-page .mcl-body,
    .msg-page .ix-shell {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .msg-page .ix-root {
      flex: 1 1 auto;
      min-height: 0;
      height: 100%;
    }
    .msg-page .ix-list,
    .msg-page .ix-detail {
      min-height: 0;
      height: 100%;
    }
  }

  @media (max-width: 768px) {
    .msg-page .mcl-body { padding: 0 !important; gap: 0 !important; }
    .msg-page .ix-shell { min-height: 0; }
    .msg-page .ix-root {
      min-height: 0;
      height: auto;
      background: transparent;
      border-radius: 0;
    }
    .msg-page .ix-list {
      border-right: 0;
      background: transparent;
    }
    .msg-page .ix-list-title { display: none !important; }
    .msg-page .ix-list-head {
      padding: 0 0 14px !important;
      margin-bottom: 0 !important;
    }
    .msg-page .ix-thread-scroll { padding: 0 0 20px !important; }
    .msg-page .ix-row {
      border-radius: 12px;
      margin-bottom: 2px;
    }
  }
`
