'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [collapsed, setCollapsed] = useState(true)
  const [peek, setPeek] = useState(false)
  const [chromeReady, setChromeReady] = useState(false)
  const peekTimer = useRef<number | null>(null)
  const isSettingsWorkspace =
    pathname === '/settings' || pathname.startsWith('/settings/')
  /** Main layout stays collapsed when pinned; peek expands the rail as an overlay. */
  const sidebarVisuallyCollapsed = collapsed && !peek

  useEffect(() => {
    applyAppearanceForPath(pathname)
  }, [pathname])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_KEY)
      if (stored === '0') setCollapsed(false)
      else setCollapsed(true)
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

  useEffect(() => {
    return () => {
      if (peekTimer.current) globalThis.clearTimeout(peekTimer.current)
    }
  }, [])

  function toggleCollapse() {
    setPeek(false)
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* noop */ }
      return next
    })
  }

  function onPeekEnter() {
    if (!collapsed) return
    if (peekTimer.current) globalThis.clearTimeout(peekTimer.current)
    setPeek(true)
  }

  function onPeekLeave() {
    if (!collapsed) return
    if (peekTimer.current) globalThis.clearTimeout(peekTimer.current)
    peekTimer.current = globalThis.setTimeout(() => setPeek(false), 180) as unknown as number
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
    <div className={`fas-root${collapsed ? ' is-sidebar-collapsed' : ''}${peek ? ' is-sidebar-peek' : ''}`} data-app-shell="">
      <style>{APP_SHELL_STYLES}</style>
      {collapsed ? <div className="fas-sidebar-spacer" aria-hidden /> : null}
      <AppShellSidebar
        user={user}
        collapsed={sidebarVisuallyCollapsed}
        onToggleCollapse={toggleCollapse}
        onPeekEnter={onPeekEnter}
        onPeekLeave={onPeekLeave}
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
