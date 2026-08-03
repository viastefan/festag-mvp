'use client'

import AppShellOverview from '@/components/app-shell/AppShellOverview'
import { useUser } from '@/lib/hooks/useUser'

export default function OverviewPage() {
  const { user } = useUser()
  return <AppShellOverview user={user} />
}
