'use client'

import InboxMasterDetail from '@/components/inbox/InboxMasterDetail'
import { useClientInboxFeed } from '@/components/inbox/useInboxFeed'

export default function InboxPage() {
  const { items, projects, loading, markRead } = useClientInboxFeed()

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
