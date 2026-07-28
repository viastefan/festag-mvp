'use client'

/**
 * DevAppShell — the outer shell for /dev.
 *
 * Layout is three fixed regions: rail on the left, one thin top bar, and a
 * scrolling canvas. The canvas has no frame or panel of its own — content
 * sits directly on the workspace so pages read as lists rather than as boxes
 * inside a box. Design tokens live in app/dev/dev-portal.css.
 *
 * Role handling is unchanged from the previous shell: dev | admin |
 * project_owner may enter, pending devs go to /dev/pending, everyone else
 * lands in the client portal, and the legacy PIN-pool session is still
 * accepted until those developers are migrated.
 *
 * Settings parks this chrome (like Client Portal) instead of remounting —
 * leaving /dev/settings must not re-play the glassy enter animation.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import DevSidebar, { type DevLiveStats } from '@/components/DevSidebar'
import DevTopBar from '@/components/dev/DevTopBar'
import DevMobileDock from '@/components/dev/DevMobileDock'
import CommandPalette from '@/components/CommandPalette'
import FestagLoadingScreen from '@/components/FestagLoadingScreen'
import TagroOverlay from '@/components/TagroOverlay'
import TagroFocusComposeBar from '@/components/tagro/TagroFocusComposeBar'
import DevTagroFab from '@/components/dev/DevTagroFab'
import DevAmbient from '@/components/dev/DevAmbient'
import { DEV_SHELL_MENU_CSS } from '@/components/dev/dev-shell-styles'
import { DEV_SHELL_MOBILE_CSS } from '@/components/dev/dev-mobile-page-styles'
import { FESTAG_GLASSY_ENTER_MS, FESTAG_GLASSY_TEXT_CSS } from '@/lib/ui/glassy-text'
import { clearStoredDevSession, getStoredDevSession, type DevSession } from '@/lib/dev-session'
import { createClient } from '@/lib/supabase/client'
import {
  canAccessExecutionPanel,
  isExecutionPanelPending,
} from '@/lib/execution-panel/access'

export type DevIdentity =
  | { kind: 'supabase'; userId: string; name: string; role: string; email: string | null; avatarUrl: string | null; githubUsername: string | null }
  | { kind: 'pool'; session: DevSession }

const DEV_SETTINGS_AWAY_CSS = `
  .dv-shell.is-settings-away {
    visibility: hidden;
    pointer-events: none;
  }
  .dv-shell.is-settings-away .dv-rail,
  .dv-shell.is-settings-away .dv-topbar,
  .dv-shell.is-settings-away .dv-canvas {
    content-visibility: hidden;
  }
`

export default function DevAppShell({
  children,
  isFullHeight = false,
  scrollId = 'dev-main-scroll',
}: {
  children: React.ReactNode
  isFullHeight?: boolean
  scrollId?: string
}) {
  const pathname = usePathname()
  const router = useRouter()

  const isDevLogin      = pathname === '/dev/login'
  const isDevOnboarding = pathname === '/dev/onboarding'
  const isDevPending    = pathname === '/dev/pending'
  const isDevJoin       = pathname.startsWith('/dev/join/')
  const isDevSettings   = pathname.startsWith('/dev/settings')
  const isPublicDevAuth = isDevLogin || isDevOnboarding || isDevJoin

  const [loaderDone, setLoaderDone] = useState(false)
  const [playEnter, setPlayEnter] = useState(true)
  const [checking, setChecking] = useState(true)
  const [identity, setIdentity] = useState<DevIdentity | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [stats, setStats] = useState<DevLiveStats | null>(null)

  useEffect(() => {
    try { setSidebarCollapsed(localStorage.getItem('festag-dev-sidebar-collapsed') === 'true') } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('festag-dev-sidebar-collapsed', String(sidebarCollapsed)) } catch {}
  }, [sidebarCollapsed])
  useEffect(() => {
    document.body.classList.add('festag-app-mode', 'festag-dev-shell')
    return () => {
      document.body.classList.remove('festag-app-mode', 'festag-dev-shell')
    }
  }, [])

  useEffect(() => {
    if (!loaderDone) return
    const t = window.setTimeout(() => setPlayEnter(false), FESTAG_GLASSY_ENTER_MS + 40)
    return () => window.clearTimeout(t)
  }, [loaderDone])

  useEffect(() => {
    function onTagroApplied() { router.refresh() }
    window.addEventListener('festag:tagro-applied', onTagroApplied)
    return () => window.removeEventListener('festag:tagro-applied', onTagroApplied)
  }, [router])

  // Soft route changes: keep the canvas mounted, just reset scroll.
  useEffect(() => {
    if (isPublicDevAuth || isDevSettings) return
    const el = document.getElementById(scrollId)
    if (el) el.scrollTop = 0
  }, [pathname, scrollId, isPublicDevAuth, isDevSettings])

  // Toggle the rail with ⌘\ — ⌘K stays with the command palette.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === '\\') {
        event.preventDefault()
        setSidebarCollapsed(collapsed => !collapsed)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Once we've resolved a valid identity we never re-run the full auth
  // gate again — otherwise every in-/dev navigation (pathname changes)
  // re-queried the session and, on a transient null read during client
  // nav, bounced the user to /login. That was the "click anywhere in the
  // dev panel → thrown out" bug. We resolve once; pending↔dev redirects
  // are handled separately below.
  const authResolvedRef = useRef(false)

  useEffect(() => {
    if (isPublicDevAuth) { setChecking(false); return }
    if (authResolvedRef.current) { setChecking(false); return }
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      // Prefer getUser() — it validates the token with the server and
      // triggers a refresh, instead of trusting a possibly-stale local
      // session snapshot.
      const { data: { user: authedUser } } = await supabase.auth.getUser()
      const session = authedUser ? { user: authedUser } : null
      if (session) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role,full_name,first_name,github_username,github_avatar_url,approval_status,email')
          .eq('id', session.user.id).maybeSingle()
        const role = (prof as any)?.role ?? null
        const approval = (prof as any)?.approval_status ?? 'approved'
        const bits = { role, approval_status: approval }
        if (isExecutionPanelPending(bits)) {
          if (!isDevPending) { router.replace('/dev/pending'); return }
          if (cancelled) return
          setIdentity({
            kind: 'supabase',
            userId: session.user.id,
            name: (prof as any)?.full_name || (prof as any)?.first_name || (prof as any)?.email || 'Pending',
            email: session.user.email ?? null,
            role: 'pending_developer',
            avatarUrl: (prof as any)?.github_avatar_url ?? null,
            githubUsername: (prof as any)?.github_username ?? null,
          })
          authResolvedRef.current = true
          setChecking(false)
          return
        }
        if (canAccessExecutionPanel(bits)) {
          if (cancelled) return
          setIdentity({
            kind: 'supabase',
            userId: session.user.id,
            name: (prof as any)?.full_name || (prof as any)?.first_name || (prof as any)?.github_username || session.user.email || 'Developer',
            email: session.user.email ?? null,
            role,
            avatarUrl: (prof as any)?.github_avatar_url ?? null,
            githubUsername: (prof as any)?.github_username ?? null,
          })
          authResolvedRef.current = true
          setChecking(false)
          return
        }
        // logged-in but no Execution Panel access → client portal
        router.replace('/dashboard')
        return
      }

      // legacy PIN-Pool fallback
      const pool = getStoredDevSession()
      if (pool) {
        if (cancelled) return
        if (isDevPending) { router.replace('/dev'); return }
        setIdentity({ kind: 'pool', session: pool })
        authResolvedRef.current = true
        setChecking(false)
        return
      }
      router.replace('/login')
    })()
    return () => { cancelled = true }
    // Intentionally NOT depending on `pathname`: the auth gate resolves
    // once and must not re-run (and risk a transient /login bounce) on
    // every in-/dev navigation. isDevLogin only flips on the login route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublicDevAuth])

  const logout = useCallback(async () => {
    if (identity?.kind === 'supabase') {
      try { await createClient().auth.signOut() } catch { /* noop */ }
    } else {
      clearStoredDevSession()
    }
    window.location.href = '/login'
  }, [identity])

  const handleStats = useCallback((next: DevLiveStats) => { setStats(next) }, [])

  if (isPublicDevAuth) return <>{children}</>
  if (isDevPending && identity) return <>{children}</>
  if (!loaderDone) return <FestagLoadingScreen surface="dev" onDone={() => setLoaderDone(true)} />
  if (checking || !identity) return null

  return (
    <>
      {/* Execution chrome stays mounted when opening settings — park instead of remount. */}
      <div
        className={[
          'dv-shell',
          playEnter ? 'festag-glassy-enter' : '',
          sidebarCollapsed ? 'is-collapsed' : '',
          isDevSettings ? 'is-settings-away' : '',
        ].filter(Boolean).join(' ')}
        aria-hidden={isDevSettings || undefined}
        {...(isDevSettings ? { inert: true } : {})}
      >
        <DevAmbient key="dev-panel" routeKey="dev-panel" />
        {!isDevSettings ? <DevTagroFab /> : null}

        <style>{`${DEV_SHELL_MENU_CSS}${DEV_SHELL_MOBILE_CSS}${FESTAG_GLASSY_TEXT_CSS}${DEV_SETTINGS_AWAY_CSS}`}</style>

        <DevSidebar
          identity={identity}
          onCollapse={() => setSidebarCollapsed(true)}
          onLogout={logout}
          onStats={handleStats}
        />

        <DevTopBar
          identity={identity}
          sidebarCollapsed={sidebarCollapsed}
          onExpandSidebar={() => setSidebarCollapsed(false)}
          inboxUnread={stats?.inbox ?? 0}
        />

        {!isDevSettings ? (
          <div
            id={scrollId}
            className="dv-canvas"
            style={isFullHeight ? { overflowY: 'hidden' } : undefined}
          >
            <div className="dv-canvas-inner dv-route">
              {children}
            </div>
          </div>
        ) : null}

        {!isDevSettings ? <DevMobileDock /> : null}
      </div>

      {isDevSettings ? children : null}

      <TagroOverlay />
      <TagroFocusComposeBar />
      <CommandPalette theme="portal" />
    </>
  )
}
