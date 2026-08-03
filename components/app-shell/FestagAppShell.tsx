'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import AppShellSidebar from '@/components/app-shell/AppShellSidebar'
import AppShellTopBar from '@/components/app-shell/AppShellTopBar'
import { APP_SHELL_STYLES } from '@/components/app-shell/app-shell-styles'
import CommandPalette from '@/components/CommandPalette'
import { useUser } from '@/lib/hooks/useUser'
import { applyAppearanceForPath } from '@/lib/theme'

const COLLAPSE_KEY = 'festag-os-sidebar-collapsed'

export default function FestagAppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const pathname = usePathname() || '/overview'
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    applyAppearanceForPath(pathname)
  }, [pathname])

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true)
    } catch { /* noop */ }
  }, [])

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* noop */ }
      return next
    })
  }

  return (
    <div className={`fas-root${collapsed ? ' is-sidebar-collapsed' : ''}`} data-app-shell="">
      <style>{APP_SHELL_STYLES}</style>
      <AppShellSidebar
        user={user}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="fas-main-col">
        <AppShellTopBar user={user} />
        <main className="fas-content">{children}</main>
      </div>
      <CommandPalette theme="portal" />
    </div>
  )
}
