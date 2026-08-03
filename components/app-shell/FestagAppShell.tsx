'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AppShellSidebar from '@/components/app-shell/AppShellSidebar'
import AppShellTopBar from '@/components/app-shell/AppShellTopBar'
import { APP_SHELL_STYLES } from '@/components/app-shell/app-shell-styles'
import CommandPalette from '@/components/CommandPalette'
import { useUser } from '@/lib/hooks/useUser'
import { applyAppearanceForPath } from '@/lib/theme'

export default function FestagAppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const pathname = usePathname() || '/overview'

  useEffect(() => {
    applyAppearanceForPath(pathname)
  }, [pathname])

  return (
    <div className="fas-root" data-app-shell="">
      <style>{APP_SHELL_STYLES}</style>
      <AppShellSidebar user={user} />
      <div className="fas-main-col">
        <AppShellTopBar user={user} />
        <main className="fas-content">{children}</main>
      </div>
      <CommandPalette theme="portal" />
    </div>
  )
}
