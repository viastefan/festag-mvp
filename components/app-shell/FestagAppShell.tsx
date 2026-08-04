'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import AppShellSidebar from '@/components/app-shell/AppShellSidebar'
import AppShellTopBar from '@/components/app-shell/AppShellTopBar'
import { APP_SHELL_STYLES } from '@/components/app-shell/app-shell-styles'
import { useUser } from '@/lib/hooks/useUser'
import { applyAppearanceForPath } from '@/lib/theme'

const COLLAPSE_KEY = 'festag-os-sidebar-collapsed'

const CommandPalette = dynamic(() => import('@/components/CommandPalette'), { ssr: false })
const AppShellAccountPanel = dynamic(() => import('@/components/app-shell/AppShellAccountPanel'), { ssr: false })
const WorkspaceCreateWizardModal = dynamic(() => import('@/components/app-shell/WorkspaceCreateWizardModal'), { ssr: false })
const WorkspaceRenameSheet = dynamic(() => import('@/components/app-shell/WorkspaceRenameSheet'), { ssr: false })
const WorkspaceManageModal = dynamic(() => import('@/components/app-shell/WorkspaceManageModal'), { ssr: false })
const AppShellNewProjectHost = dynamic(() => import('@/components/app-shell/AppShellNewProjectHost'), { ssr: false })

export default function FestagAppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const pathname = usePathname() || '/overview'
  const [collapsed, setCollapsed] = useState(false)
  const [chromeReady, setChromeReady] = useState(false)
  const isSettingsWorkspace =
    pathname === '/settings' || pathname.startsWith('/settings/')

  useEffect(() => {
    applyAppearanceForPath(pathname)
  }, [pathname])

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true)
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    let cancelled = false
    const enable = () => {
      if (!cancelled) setChromeReady(true)
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(enable, { timeout: 1200 })
      return () => {
        cancelled = true
        w.cancelIdleCallback?.(id)
      }
    }
    const id = globalThis.setTimeout(enable, 200)
    return () => {
      cancelled = true
      globalThis.clearTimeout(id)
    }
  }, [])

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* noop */ }
      return next
    })
  }

  const deferredChrome = chromeReady ? (
    <>
      <CommandPalette theme="portal" />
      <WorkspaceCreateWizardModal />
      <WorkspaceRenameSheet />
      <WorkspaceManageModal />
      <AppShellNewProjectHost />
    </>
  ) : null

  /* Full settings workspace keeps its own rail — park the OS chrome. */
  if (isSettingsWorkspace) {
    return (
      <div className="fas-root fas-root--settings" data-app-shell="">
        <style>{APP_SHELL_STYLES}</style>
        {children}
        {deferredChrome}
      </div>
    )
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
      {chromeReady ? <AppShellAccountPanel user={user} /> : null}
      {deferredChrome}
    </div>
  )
}
