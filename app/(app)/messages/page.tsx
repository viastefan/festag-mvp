'use client'

import { useMemo, useState } from 'react'
import { Check, ArrowsClockwise, PencilSimple, Sparkle } from '@phosphor-icons/react'
import InboxMasterDetail from '@/components/inbox/InboxMasterDetail'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { INBOX_CSS } from '@/components/inbox/inbox-styles'
import { openTagro } from '@/components/TagroOverlay'
import { tagroContextForClientInbox } from '@/lib/inbox/tagro-triage'
import { useClientInboxFeed } from '@/components/inbox/useInboxFeed'

export default function MessagesPage() {
  const { items, projects, loading, unreadTotal, load, markRead, markAllRead } = useClientInboxFeed()
  const [navOpen, setNavOpen] = useState(false)

  const tagroInbox = () => openTagro(tagroContextForClientInbox(items, unreadTotal))

  const pageLeadLine = useMemo(() => {
    if (loading) return 'Posteingang wird geladen…'
    if (unreadTotal > 0) return `${unreadTotal} ungelesen — Tagro sortiert Entscheidungen, Updates und Team-Signale.`
    if (items.length === 0) return 'Keine Nachrichten — Updates aus Projekten erscheinen hier.'
    return `${items.length} Einträge — Entscheidungen, Freigaben und Team-Updates an einem Ort.`
  }, [loading, unreadTotal, items.length])

  return (
    <div className="dec-os msg-portal-page">
      <style>{DECISION_CSS}</style>
      <style>{INBOX_CSS}</style>
      <style>{MSG_PORTAL_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell msg-portal-shell">
        <div className="dec-static-top msg-portal-head">
          <PortalPageHeader
            title="Posteingang"
            lead={pageLeadLine}
            onMenu={() => setNavOpen(true)}
            mobileMenuItems={[
              { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
              { id: 'read', label: 'Alles gelesen', onClick: markAllRead },
              { id: 'tagro', label: 'Mit Tagro besprechen', onClick: tagroInbox },
            ]}
            actions={(
              <>
                {unreadTotal > 0 && (
                  <button type="button" className="dec-head-tool" title="Alles gelesen" aria-label="Alles gelesen" onClick={markAllRead}>
                    <Check size={15} weight="bold" />
                  </button>
                )}
                <button type="button" className="dec-head-tool" title="Mit Tagro" aria-label="Mit Tagro" onClick={tagroInbox}>
                  <Sparkle size={15} weight="fill" />
                </button>
                <button type="button" className="dec-head-tool" onClick={() => void load()} aria-label="Aktualisieren">
                  <ArrowsClockwise size={15} />
                </button>
              </>
            )}
          />
        </div>

        <div className="dec-scroll-body msg-portal-body">
          <InboxMasterDetail
            variant="client"
            title="Posteingang"
            items={items}
            projects={projects}
            loading={loading}
            onMarkRead={markRead}
            onRefresh={load}
            welcomeOnMount
          />
        </div>
      </div>

      <div className="dec-fab-desktop msg-portal-dock-wrap">
        <MobilePageDock
          onDragUp={tagroInbox}
          primary={{
            id: 'triage',
            label: 'Inbox besprechen...',
            icon: <Sparkle size={14} weight="fill" />,
            onClick: tagroInbox,
            ariaLabel: 'Mit Tagro besprechen',
          }}
          secondary={{
            id: 'tagro',
            icon: <PencilSimple size={20} weight="bold" />,
            onClick: tagroInbox,
            ariaLabel: 'Mit Tagro bearbeiten',
          }}
        />
      </div>
    </div>
  )
}

const MSG_PORTAL_CSS = `
  .msg-portal-page {
    height: 100%;
    min-height: 0;
  }
  .msg-portal-shell {
    height: 100%;
    min-height: 0;
  }
  .msg-portal-head .dec-static-top {
    padding-bottom: 0;
  }
  .msg-portal-head .dec-page-head {
    padding-bottom: 16px;
  }
  .msg-portal-body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding-top: 0 !important;
  }
  .msg-portal-body .ix-shell,
  .msg-portal-body .ix-root {
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
  }
  .msg-portal-body .ix-list-title {
    display: none;
  }
  .msg-portal-dock-wrap {
    display: none;
  }
  @media (max-width: 768px) {
    .msg-portal-dock-wrap {
      display: block;
    }
    .msg-portal-body .ix-list-head {
      padding-top: 0 !important;
    }
  }
`
