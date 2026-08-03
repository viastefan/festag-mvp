'use client'

import AppShellHome from '@/components/app-shell/AppShellHome'
import { useUser } from '@/lib/hooks/useUser'

export default function HomePage() {
  const { user } = useUser()
  return <AppShellHome user={user} />
}
