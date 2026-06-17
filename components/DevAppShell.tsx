'use client'

/**
 * DevAppShell — die outer App-Shell für /dev.
 *
 * Spiegelt 1:1 die Mechanik von ClientAppShell:
 *   • `festag-app-shell` Container, schwebende Content-Box (top:8px, bottom:38px)
 *   • Sidebar 212px links, einklappbar, mit Return-Icon
 *   • Footer-Controls rechts unten: Copilot-Trigger + Theme-Toggle-Menü
 *   • theme-aware via `--logo-filter`, `--sidebar-bg`, alle Tokens
 *
 * Unterschied zur Client-Shell:
 *   • verwendet DevSidebar statt Sidebar
 *   • erzwingt Role ∈ (dev | admin | project_owner). Pending-Devs werden
 *     auf /dev/pending umgeleitet; ungültige Rollen auf /dashboard.
 *   • toleriert die legacy PIN-Pool-Session (kein Supabase Account) als
 *     Fallback bis alle Pool-Devs migriert sind.
 */

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Check, FunnelSimple } from '@phosphor-icons/react'

import DevSidebar from '@/components/DevSidebar'
import LoadingScreen from '@/components/LoadingScreen'
import TagroOverlay from '@/components/TagroOverlay'
import { DEV_SHELL_MENU_CSS } from '@/components/dev/dev-shell-styles'
import { clearStoredDevSession, getStoredDevSession, type DevSession } from '@/lib/dev-session'
import { createClient } from '@/lib/supabase/client'
import { getTheme, setTheme, type ThemeMode } from '@/lib/theme'

export type DevIdentity =
  | { kind: 'supabase'; userId: string; name: string; role: string; email: string | null; avatarUrl: string | null; githubUsername: string | null }
  | { kind: 'pool'; session: DevSession }

const THEME_OPTIONS: Array<{ id: ThemeMode; label: string; tone: 'dark' | 'light' }> = [
  { id: 'dark', label: 'Darkmode', tone: 'dark' },
  { id: 'light', label: 'Light', tone: 'light' },
  { id: 'read', label: 'Read', tone: 'light' },
]

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

  const isDevLogin   = pathname === '/dev/login'
  const isDevPending = pathname === '/dev/pending'

  const [checking, setChecking] = useState(true)
  const [identity, setIdentity] = useState<DevIdentity | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('read')
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const themeMenuRef = useRef<HTMLDivElement | null>(null)

  const sidebarWidth = sidebarCollapsed ? '0px' : 'var(--festag-sidebar-width, 260px)'

  // local prefs
  useEffect(() => {
    try { setSidebarCollapsed(localStorage.getItem('festag-dev-sidebar-collapsed') === 'true') } catch {}
    try { setThemeMode(getTheme()) } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('festag-dev-sidebar-collapsed', String(sidebarCollapsed)) } catch {}
  }, [sidebarCollapsed])
  useEffect(() => {
    document.body.classList.add('festag-app-mode')
    return () => document.body.classList.remove('festag-app-mode')
  }, [])

  useEffect(() => {
    function onTagroApplied() { router.refresh() }
    window.addEventListener('festag:tagro-applied', onTagroApplied)
    return () => window.removeEventListener('festag:tagro-applied', onTagroApplied)
  }, [router])

  // theme event sync (e.g. when /settings page changes theme)
  useEffect(() => {
    const onTheme = (event: Event) => {
      if (event instanceof CustomEvent) setThemeMode(event.detail as ThemeMode)
    }
    window.addEventListener('festag-theme', onTheme)
    return () => window.removeEventListener('festag-theme', onTheme)
  }, [])

  // theme menu close on outside click / esc
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!themeMenuOpen) return
      if (themeMenuRef.current && event.target instanceof Node && !themeMenuRef.current.contains(event.target)) {
        setThemeMenuOpen(false)
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setThemeMenuOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onEscape)
    }
  }, [themeMenuOpen])

  // Once we've resolved a valid identity we never re-run the full auth
  // gate again — otherwise every in-/dev navigation (pathname changes)
  // re-queried the session and, on a transient null read during client
  // nav, bounced the user to /login. That was the "click anywhere in the
  // dev panel → thrown out" bug. We resolve once; pending↔dev redirects
  // are handled separately below.
  const authResolvedRef = useRef(false)

  // auth / role check
  useEffect(() => {
    if (isDevLogin) { setChecking(false); return }
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
        if (role === 'pending_developer' || approval === 'pending') {
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
        if (role === 'dev' || role === 'admin' || role === 'project_owner') {
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
        // logged-in but no dev access → client portal
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
  }, [isDevLogin])

  async function logout() {
    if (identity?.kind === 'supabase') {
      try { await createClient().auth.signOut() } catch { /* noop */ }
    } else {
      clearStoredDevSession()
    }
    window.location.href = '/login'
  }

  function applyThemeChoice(next: ThemeMode) {
    setTheme(next)
    setThemeMode(next)
    setThemeMenuOpen(false)
  }

  if (isDevLogin) return <>{children}</>
  if (isDevPending && identity) return <>{children}</>
  if (checking || !identity) return <LoadingScreen onDone={() => undefined} />

  return (
    <div
      className={`festag-app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
      style={{ '--app-sidebar-width': sidebarWidth } as React.CSSProperties}
    >
      {/* Tagro works in the Dev Panel too — same global overlay as the
          client shell, listening for festag:open-tagro events. */}
      <TagroOverlay />
      <style>{`
        @keyframes panelFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .panel-enter { animation: panelFadeIn .22s cubic-bezier(.16,1,.3,1) both; }
        @keyframes sidebarReturnIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes routeFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .route-fade { animation: routeFadeIn .18s cubic-bezier(.16,1,.3,1) both; }

        .festag-app-shell {
          position: fixed; inset: 0; height: 100dvh; overflow: hidden;
          background: var(--bg-app, var(--bg));
        }
        .app-workspace {
          position: fixed;
          top: 8px; right: 0; bottom: 38px;
          left: calc(var(--app-sidebar-width) + 1px);
          min-width: 0; display: flex; flex-direction: column; overflow: hidden;
          max-height: calc(100dvh - 46px);
          border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
          border-radius: 10px;
          background: var(--surface);
          box-shadow: 0 0 0 1px rgba(255,255,255,.03);
          transition: left .18s cubic-bezier(.16,1,.3,1), border-color .18s ease, background .18s ease;
        }
        .sidebar-collapsed .app-workspace :where(.dev-page-header) {
          padding-left: 52px;
          transition: padding-left .18s cubic-bezier(.16,1,.3,1);
        }
        .app-sidebar-return {
          position: absolute; top: 25px; left: 18px; z-index: 210;
          width: 24px; height: 24px;
          border: 0; border-radius: 8px;
          background: transparent;
          color: color-mix(in srgb, var(--text-secondary) 88%, var(--text));
          display: inline-flex; align-items: center; justify-content: center;
          animation: sidebarReturnIn .18s cubic-bezier(.16,1,.3,1) both;
          transition: color .14s ease, transform .14s ease;
          cursor: pointer;
        }
        .app-sidebar-return:hover { color: var(--text); }
        .app-sidebar-return:active { transform: scale(.94); }
        .app-workspace-scroll {
          height: 100%; min-height: 0;
          overflow-y: auto; overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        .app-workspace-inner { padding: 28px clamp(22px, 3vw, 44px) 60px; }

        /* ── Shared /dev page primitives ── */
        .dev-page {
          max-width: 1180px; margin: 0 auto;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-weight: 400;
        }
        .dev-page-header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 24px; }
        .dev-eyebrow {
          margin: 0 0 6px; color: var(--text-muted);
          font-size: 12px; text-transform: uppercase; letter-spacing: .06em; font-weight: 400;
        }
        .dev-page h1 {
          margin: 0; font-size: 28px; line-height: 1.15; font-weight: 400;
          letter-spacing: 0; color: var(--text);
        }
        .dev-page-header .meta { margin: 8px 0 0; color: var(--text-muted); font-size: 14px; font-weight: 400; line-height: 1.45; }
        .dev-primary-btn, .dev-secondary-btn {
          height: 36px; border-radius: 999px; padding: 0 16px;
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          line-height: 1; white-space: nowrap;
          border: 1px solid var(--border);
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px; font-weight: 400;
          letter-spacing: 0;
          cursor: pointer;
          transition: background .14s ease, border-color .14s ease;
        }
        .dev-primary-btn { background: var(--btn-prim); color: var(--btn-prim-text); border-color: var(--btn-prim); }
        .dev-primary-btn:hover { background: color-mix(in srgb, var(--btn-prim) 86%, #fff); }
        .dev-secondary-btn { background: var(--surface); color: var(--text); }
        .dev-secondary-btn:hover { background: color-mix(in srgb, var(--surface-2) 60%, var(--surface)); border-color: var(--border-strong); }
        .dev-surface {
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: 10px;
        }
        .dev-row {
          display: grid; align-items: center; gap: 14px;
          min-height: 44px; padding: 8px 14px; border-radius: 8px;
          transition: background .12s ease;
        }
        .dev-row:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
        .dev-kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 24px; }
        .dev-kpi { padding: 14px; }
        .dev-kpi strong { display: block; font-size: 18px; letter-spacing: -.015em; font-weight: 500; }
        .dev-kpi span { display: block; margin-top: 3px; font-size: 11.5px; color: var(--text-muted); }
        .dev-section-title { margin: 0 0 8px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted); font-weight: 500; }
        .dev-chip {
          display: inline-flex; align-items: center; gap: 6px;
          min-height: 22px; padding: 0 8px; border-radius: 5px;
          background: var(--surface-2); color: var(--text-secondary);
          font-size: 11px; font-weight: 500;
          border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
        }

        @media (max-width: 768px) {
          .festag-app-shell { position: relative; min-height: 100dvh; overflow: visible; }
          .app-workspace {
            position: relative; inset: auto; min-height: 100dvh;
            border: 0; border-radius: 0; box-shadow: none; background: var(--bg);
          }
          .app-workspace-scroll { overflow-y: visible; }
          .app-workspace-inner { padding: 18px 14px 110px; }
          .app-footer-controls { display: none; }
          .dev-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .dev-page-header { flex-direction: column; gap: 14px; }
        }

        /* ── Footer controls (Copilot + theme toggle) ── */
        .app-footer-controls {
          position: fixed; right: 12px; bottom: 7px; z-index: 145;
          display: flex; flex-direction: row; align-items: center; gap: 8px;
          color: var(--text-muted);
        }
        .app-footer-btn {
          position: relative; height: 26px;
          border: 1px solid transparent; background: transparent;
          color: color-mix(in srgb, var(--text-secondary) 78%, var(--accent));
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          padding: 0 6px; border-radius: 10px;
          font: inherit; font-size: 11.5px; font-weight: 500;
          letter-spacing: .02em; cursor: pointer; text-decoration: none;
          transition: background .16s ease, color .16s ease;
        }
        .app-footer-btn.icon-only { width: 26px; padding: 0; }
        .app-footer-btn:hover { color: var(--text); }
        [data-theme="light"] .app-footer-btn.icon-only,
        [data-theme="pure-light"] .app-footer-btn.icon-only { color: #4F5A74; }
        [data-theme="light"] .app-footer-btn.icon-only:hover,
        [data-theme="pure-light"] .app-footer-btn.icon-only:hover { color: #202532; }

        .app-footer-theme-menu {
          position: absolute; right: 0; bottom: calc(100% + 7px); width: 196px; padding: 7px;
          border-radius: 12px;
          border: 1px solid color-mix(in srgb, var(--border) 80%, rgba(255,255,255,.12));
          background: color-mix(in srgb, var(--surface) 92%, rgba(255,255,255,.78));
          box-shadow:
            0 16px 38px rgba(15,23,42,.12),
            0 1px 0 rgba(255,255,255,.32) inset,
            0 0 0 1px rgba(255,255,255,.08);
          backdrop-filter: blur(18px) saturate(150%);
          -webkit-backdrop-filter: blur(18px) saturate(150%);
          animation: panelFadeIn .18s cubic-bezier(.16,1,.3,1) both;
        }
        [data-theme="dark"] .app-footer-theme-menu,
        [data-theme="classic-dark"] .app-footer-theme-menu {
          background: color-mix(in srgb, #101215 88%, rgba(18,22,30,.72));
          box-shadow:
            0 18px 42px rgba(0,0,0,.34),
            0 1px 0 rgba(255,255,255,.06) inset,
            0 0 0 1px rgba(255,255,255,.04);
        }
        .app-footer-theme-option {
          width: 100%; min-height: 38px;
          border: 0; border-radius: 10px;
          background: transparent; color: var(--text);
          display: flex; align-items: center; justify-content: space-between; gap: 9px;
          padding: 6px 8px;
          font: inherit; font-size: 12px; font-weight: 500;
          text-align: left; cursor: pointer;
          transition: background .16s ease, color .16s ease, transform .16s ease;
        }
        .app-footer-theme-option:hover { background: color-mix(in srgb, var(--surface-2) 82%, transparent); }
        .app-footer-theme-option.active { background: color-mix(in srgb, var(--surface-2) 90%, rgba(255,255,255,.18)); }
        .app-footer-theme-option:active { transform: scale(.988); }
        .app-footer-theme-chip {
          width: 32px; height: 22px; border-radius: 8px;
          border: 1px solid rgba(0,0,0,.08);
          display: inline-flex; align-items: center; justify-content: center; gap: 3px;
          flex-shrink: 0;
          font-size: 9px; font-weight: 500; letter-spacing: -.02em;
          box-shadow: 0 1px 2px rgba(15,23,42,.08) inset;
        }
        .app-footer-theme-chip.dark { background: linear-gradient(180deg, #17191d 0%, #0f1114 100%); border-color: rgba(255,255,255,.08); color: #f5f7fb; }
        .app-footer-theme-chip.light { background: linear-gradient(180deg, #ffffff 0%, #f1f4f8 100%); border-color: rgba(16,24,40,.12); color: #344054; }
        .app-footer-theme-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .app-footer-theme-check {
          width: 16px; height: 16px;
          display: inline-flex; align-items: center; justify-content: center;
          color: color-mix(in srgb, var(--text) 78%, var(--text-muted));
          flex-shrink: 0;
        }

        ${DEV_SHELL_MENU_CSS}
      `}</style>

      {!sidebarCollapsed && (
        <div className="panel-enter" style={{ display: 'contents' }}>
          <DevSidebar identity={identity} onCollapse={() => setSidebarCollapsed(true)} onLogout={logout} />
        </div>
      )}

      <main className="main-content app-workspace">
        {sidebarCollapsed && (
          <button
            className="app-sidebar-return"
            type="button"
            aria-label="Sidebar ausklappen"
            title="Sidebar ausklappen"
            onClick={() => setSidebarCollapsed(false)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="5" width="16" height="14" rx="3" />
              <path d="M9 5v14" />
            </svg>
          </button>
        )}
        <div id={scrollId} className="app-workspace-scroll" style={{ overflowY: isFullHeight ? 'hidden' : 'auto' }}>
          <div key={pathname} className="route-fade app-workspace-inner" style={{ minHeight: '100%' }}>
            {children}
          </div>
        </div>
      </main>

      <div className="app-footer-controls" aria-label="Workspace Schnellzugriff">
        <button
          className="app-footer-btn"
          type="button"
          title="GitHub Sync"
          onClick={() => window.dispatchEvent(new CustomEvent('dev-trigger-github-sync'))}
        >
          <span>Sync GitHub</span>
        </button>
        <div ref={themeMenuRef} style={{ position: 'relative' }}>
          <button
            className="app-footer-btn icon-only"
            type="button"
            onClick={() => setThemeMenuOpen(open => !open)}
            title="Theme wechseln"
            aria-label="Theme wechseln"
            aria-expanded={themeMenuOpen}
          >
            <FunnelSimple size={16} weight="regular" />
          </button>
          {themeMenuOpen && (
            <div className="app-footer-theme-menu" role="menu" aria-label="Theme Auswahl">
              {THEME_OPTIONS.map(option => {
                const active = themeMode === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`app-footer-theme-option${active ? ' active' : ''}`}
                    onClick={() => applyThemeChoice(option.id)}
                  >
                    <span className={`app-footer-theme-chip ${option.tone}`} aria-hidden="true">
                      <span>Aa</span>
                    </span>
                    <span className="app-footer-theme-label">{option.label}</span>
                    <span className="app-footer-theme-check" aria-hidden="true">
                      {active ? <Check size={16} weight="bold" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
