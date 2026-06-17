'use client'

/**
 * Festag Posteingang — strukturierte Projekt-Kommunikation.
 * Master-Detail-Inbox im Portal-Shell-Stil.
 */

import InboxMasterDetail from '@/components/inbox/InboxMasterDetail'
import { useInboxFeed } from '@/components/inbox/useInboxFeed'

export default function InboxPage() {
  const { items, projects, loading, markRead } = useInboxFeed({ variant: 'client' })

  return (
    <InboxMasterDetail
      variant="client"
      title="Posteingang"
      items={items}
      projects={projects}
      loading={loading}
      onMarkRead={markRead}
      welcomeOnMount
    />
  )
}
