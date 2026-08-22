'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import AppShellSidebar from '@/components/app-shell/AppShellSidebar'
import AppShellTopBar from '@/components/app-shell/AppShellTopBar'
import { APP_SHELL_STYLES } from '@/components/app-shell/app-shell-styles'
import { useUser } from '@/lib/hooks/useUser'
import { useNotifications } from '@/hooks/useNotifications'
import { applyAppearanceForPath } from '@/lib/theme'

/* '0' = pinned open, '1'/absent = rail. Key name kept for existing prefs. */
const COLLAPSE_KEY = 'festag-os-sidebar-collapsed'

const CommandPalette = dynamic(() => import('@/components/CommandPalette'), { ssr: false })
const TagroOverlay = dynamic(() => import('@/components/TagroOverlay'), { ssr: false })
const AppShellAccountPanel = dynamic(() => import('@/components/app-shell/AppShellAccountPanel'), { ssr: false })
const WorkspaceCreateWizardModal = dynamic(() => import('@/components/app-shell/WorkspaceCreateWizardModal'), { ssr: false })
const WorkspaceRenameSheet = dynamic(() => import('@/components/app-shell/WorkspaceRenameSheet'), { ssr: false })
const WorkspaceManageModal = dynamic(() => import('@/components/app-shell/WorkspaceManageModal'), { ssr: false })
const AppShellNewProjectHost = dynamic(() => import('@/components/app-shell/AppShellNewProjectHost'), { ssr: false })
const CodexMobileActionPill = dynamic(() => import('@/components/mobile/CodexMobileActionPill'), { ssr: false })
const AppShellMobileNav = dynamic(() => import('@/components/app-shell/AppShellMobileNav'), { ssr: false })

export default function FestagAppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const pathname = usePathname() || '/overview'
  /* `pinned` = user locked the panel open (content reflows around it).
     `peek` = transient hover/focus expansion — floats over the canvas, so the
     page must never reflow for it. Two flags, two very different contracts. */
  const [pinned, setPinned] = useState(false)
  const [peek, setPeek] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [chromeReady, setChromeReady] = useState(false)
  /* Only once the deferred chrome is up — the bell is not worth a request on
     first paint, and the sidebar already loads the same list on desktop. */
  const { unread } = useNotifications({ limit: 1, enabled: chromeReady })
  const isSettingsWorkspace =
    pathname === '/settings' || pathname.startsWith('/settings/')

  useEffect(() => {
    applyAppearanceForPath(pathname)
  }, [pathname])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  useEffect(() => {
    try {
      setPinned(localStorage.getItem(COLLAPSE_KEY) === '0')
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
    if (!pinned) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPinned(false)
        try { localStorage.setItem(COLLAPSE_KEY, '1') } catch { /* noop */ }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinned])

  function togglePin() {
    setPinned((prev) => {
      const next = !prev
      try { localStorage.setItem(COLLAPSE_KEY, next ? '0' : '1') } catch { /* noop */ }
      return next
    })
  }

  const deferredChrome = chromeReady ? (
    <>
      <CommandPalette theme="portal" />
      <TagroOverlay />
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
        {/* Must be dangerouslySetInnerHTML, not a text child: React escapes
            text children (' → &#x27;, " → &quot;), and <style> is a raw-text
            element so the browser never decodes them back. Server and client
            then disagree on this node's text and hydration fails for the whole
            tree — which silently stops later text-only updates from applying. */}
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: APP_SHELL_STYLES }} />
        {children}
        {deferredChrome}
      </div>
    )
  }

  return (
    <div
      className={
        `fas-root${pinned ? ' is-sidebar-expanded' : ' is-sidebar-collapsed'}` +
        `${!pinned && peek ? ' is-sidebar-peek' : ''}`
      }
      data-app-shell=""
    >
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: APP_SHELL_STYLES }} />
      <div className="fas-sidebar-spacer" aria-hidden />
      <AppShellSidebar
        user={user}
        pinned={pinned}
        onTogglePin={togglePin}
        onPeekChange={setPeek}
      />
      <div className="fas-main-col">
        <AppShellTopBar user={user} />
        <main className="fas-content">{children}</main>
      </div>
      {/* Mobile chrome per .cursor/rules/festag-mobile-ui.mdc: search + menu
          together, top right. CSS decides whether it shows — gating on a
          measured viewport during render is how hydration mismatches start. */}
      <div className="fas-mobile-actions">
        {chromeReady ? (
          <CodexMobileActionPill
            onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            onNotifications={() => { window.location.href = '/benachrichtigungen' }}
            unread={unread}
            onMenu={() => setMobileNavOpen(true)}
          />
        ) : null}
      </div>
      {chromeReady ? (
        <AppShellMobileNav
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          unread={unread}
        />
      ) : null}
      {chromeReady ? <AppShellAccountPanel user={user} /> : null}
      {deferredChrome}
    </div>
  )
}
