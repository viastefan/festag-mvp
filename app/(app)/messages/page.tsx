'use client'

import { Check, ArrowsClockwise, PencilSimple, Sparkle } from '@phosphor-icons/react'
import InboxMasterDetail from '@/components/inbox/InboxMasterDetail'
import MobileCodexListChrome from '@/components/mobile/MobileCodexListChrome'
import MobilePageHeader from '@/components/MobilePageHeader'
import { openTagro } from '@/components/TagroOverlay'
import { tagroContextForClientInbox } from '@/lib/inbox/tagro-triage'
import { useClientInboxFeed } from '@/components/inbox/useInboxFeed'

export default function MessagesPage() {
  const { items, projects, loading, unreadTotal, load, markRead, markAllRead } = useClientInboxFeed()

  const tagroInbox = () => openTagro(tagroContextForClientInbox(items, unreadTotal))

  return (
    <MobileCodexListChrome
      className="msg-page"
      title="Nachrichten"
      legacyHeader={<MobilePageHeader title="Nachrichten" />}
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
      extraCss={MSG_MOBILE_CSS}
    >
      <InboxMasterDetail
        variant="client"
        title="Nachrichten"
        items={items}
        projects={projects}
        loading={loading}
        onMarkRead={markRead}
        onRefresh={load}
        welcomeOnMount
      />
    </MobileCodexListChrome>
  )
}

const MSG_MOBILE_CSS = `
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
