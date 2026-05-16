'use client'

/**
 * /dev — DEV portal shell.
 *
 * Login model:
 *   1. Supabase session with profile.role in (dev, admin, project_owner)
 *      → reguläres DEV Portal.
 *   2. profile.role = pending_developer → /dev/pending wird durchgelassen
 *      (alle anderen /dev/* werden auf /dev/pending umgeleitet).
 *   3. legacy PIN-Pool dev-session (lib/dev-session) → bleibt als Fallback,
 *      damit bestehende Pool-Devs ohne Bruch weiterarbeiten können, bis
 *      sie ein eigenes Supabase-Konto haben.
 *
 * Wer keinen der drei Pfade erfüllt, wird auf /login geschickt.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clearStoredDevSession, devDisplayName, getStoredDevSession, type DevSession } from '@/lib/dev-session'
import { createClient } from '@/lib/supabase/client'
import {
  Briefcase, CheckSquare, Kanban, SignOut, UsersThree,
  Compass, GithubLogo, Article, ChatsCircle, Gear,
} from '@phosphor-icons/react'

const NAV = [
  { href: '/dev',         icon: Compass,      label: 'Overview',       meta: 'heute' },
  { href: '/dev/tasks',   icon: CheckSquare,  label: 'My Tasks',       meta: 'fokus' },
  { href: '/dev/plan',    icon: Kanban,       label: 'Daily Plan',     meta: 'tagro' },
  { href: '/dev/jobs',    icon: Briefcase,    label: 'Projects',       meta: 'zugewiesen' },
  { href: '/dev/github',  icon: GithubLogo,   label: 'GitHub',         meta: 'sync' },
  { href: '/dev/updates', icon: Article,      label: 'Updates',        meta: 'tagesreport' },
  { href: '/dev/team',    icon: UsersThree,   label: 'Team',           meta: 'delivery' },
  { href: '/dev/messages',icon: ChatsCircle,  label: 'Messages',       meta: 'intern' },
]

type Identity =
  | { kind: 'supabase'; name: string; role: string; avatarUrl?: string | null }
  | { kind: 'pool'; session: DevSession }

export default function DevLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [checking, setChecking] = useState(true)

  const isDevLogin   = pathname === '/dev/login'
  const isDevPending = pathname === '/dev/pending'

  useEffect(() => {
    if (isDevLogin) { setChecking(false); return }
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      // Path 1: Supabase user with proper role
      if (session) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role,full_name,first_name,github_username,github_avatar_url,approval_status,email')
          .eq('id', session.user.id)
          .maybeSingle()
        const role = (prof as any)?.role ?? null
        const approval = (prof as any)?.approval_status ?? 'approved'

        // Pending-Dev → /dev/pending erlaubt, alles andere wird umgeleitet
        if (role === 'pending_developer' || approval === 'pending') {
          if (!isDevPending) { router.replace('/dev/pending'); return }
          if (cancelled) return
          setIdentity({
            kind: 'supabase',
            name: (prof as any)?.github_username || (prof as any)?.full_name || (prof as any)?.email || 'Pending',
            role: 'pending_developer',
            avatarUrl: (prof as any)?.github_avatar_url ?? null,
          })
          setChecking(false)
          return
        }

        if (role === 'dev' || role === 'admin' || role === 'project_owner') {
          if (cancelled) return
          setIdentity({
            kind: 'supabase',
            name: (prof as any)?.full_name || (prof as any)?.first_name || (prof as any)?.github_username || session.user.email || 'Developer',
            role,
            avatarUrl: (prof as any)?.github_avatar_url ?? null,
          })
          setChecking(false)
          return
        }

        // Client mit Supabase-Session, kein Dev-Zugang
        router.replace('/dashboard')
        return
      }

      // Path 2: legacy PIN-Pool session
      const pool = getStoredDevSession()
      if (pool) {
        if (cancelled) return
        if (isDevPending) { router.replace('/dev'); return }
        setIdentity({ kind: 'pool', session: pool })
        setChecking(false)
        return
      }

      // No session → /login
      router.replace('/login')
    })()
    return () => { cancelled = true }
  }, [isDevLogin, isDevPending, pathname, router])

  async function logout() {
    if (identity?.kind === 'supabase') {
      const supabase = createClient()
      await supabase.auth.signOut()
    } else {
      clearStoredDevSession()
    }
    window.location.href = '/login'
  }

  if (isDevLogin) return <>{children}</>
  if (isDevPending) return <>{children}</>
  if (checking || !identity) return <div className="dev-loading" />

  const displayName = identity.kind === 'supabase' ? identity.name : devDisplayName(identity.session)
  const roleLabel = identity.kind === 'supabase'
    ? ({ dev: 'Developer', admin: 'Admin', project_owner: 'Project Owner', pending_developer: 'Wartet auf Freigabe' } as Record<string, string>)[identity.role] || identity.role
    : (identity.session.access_mode === 'pool' ? 'Pool Developer' : 'Workspace Developer')

  return (
    <div className="dev-shell">
      <aside className="dev-sidebar" aria-label="Developer Navigation">
        <div className="dev-brand">
          <img src="/brand/logo.svg" alt="festag" />
          <span>DEV</span>
        </div>

        <div className="dev-identity">
          {identity.kind === 'supabase' && identity.avatarUrl ? (
            <img src={identity.avatarUrl} alt="" className="dev-avatar dev-avatar-img" />
          ) : (
            <div className="dev-avatar">{displayName.slice(0, 2).toUpperCase()}</div>
          )}
          <div>
            <strong>{displayName}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>

        <div className="dev-sync-card">
          <span className="dev-pulse" />
          <div>
            <strong>Tagro Bridge aktiv</strong>
            <p>Technische Updates werden für Clients gespiegelt.</p>
          </div>
        </div>

        <nav className="dev-nav">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/dev' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} className={`dev-nav-row ${active ? 'active' : ''}`}>
                <Icon size={16} weight={active ? 'fill' : 'regular'} />
                <span>{item.label}</span>
                <small>{item.meta}</small>
              </Link>
            )
          })}
        </nav>

        <Link href="/dev/settings" className="dev-nav-row" style={{ marginTop: 4 }}>
          <Gear size={16} />
          <span>Settings</span>
          <small>account</small>
        </Link>
        <button className="dev-logout" onClick={logout}>
          <SignOut size={16} /> Abmelden
        </button>
      </aside>

      <main className="dev-main">{children}</main>

      <style jsx global>{`
        .dev-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 232px minmax(0, 1fr);
          background: var(--bg);
          color: var(--text);
        }
        .dev-sidebar {
          position: sticky; top: 0; height: 100vh;
          padding: 20px 12px 14px;
          border-right: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
          background: color-mix(in srgb, var(--surface) 72%, var(--bg));
          display: flex; flex-direction: column; gap: 12px;
        }
        .dev-brand { display:flex; align-items:center; gap:8px; padding:0 6px 4px; }
        .dev-brand img { height:16px; }
        .dev-brand span { font-size:9px; letter-spacing:.14em; font-weight:700; color:var(--text-muted); border:1px solid var(--border); border-radius:999px; padding:2px 7px; }
        .dev-identity { display:flex; align-items:center; gap:10px; padding:8px 8px; border-radius:10px; }
        .dev-avatar { width:28px; height:28px; border-radius:8px; display:grid; place-items:center; background:var(--accent); color:var(--accent-text); font-size:11px; font-weight:700; overflow:hidden; }
        .dev-avatar-img { display:block; }
        .dev-identity strong { display:block; font-size:12.5px; line-height:1.2; max-width:140px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .dev-identity span { display:block; font-size:11px; color:var(--text-muted); margin-top:2px; }
        .dev-sync-card {
          display:flex; gap:9px; padding:10px 10px;
          border-radius:10px;
          background:color-mix(in srgb, var(--surface-2) 70%, transparent);
          border:1px solid color-mix(in srgb, var(--border) 55%, transparent);
        }
        .dev-sync-card strong { display:block; font-size:11.5px; }
        .dev-sync-card p { margin:2px 0 0; font-size:10.5px; line-height:1.35; color:var(--text-muted); }
        .dev-pulse {
          width:6px; height:6px; flex:0 0 auto; border-radius:50%; margin-top:3px;
          background:var(--accent);
          box-shadow:0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent);
        }
        .dev-nav { display:flex; flex-direction:column; gap:1px; padding-top:2px; flex:1; min-height:0; overflow-y:auto; }
        .dev-nav-row {
          min-height:30px;
          display:grid; grid-template-columns:18px minmax(0, 1fr) auto;
          align-items:center; gap:8px;
          padding:0 9px; border-radius:7px;
          text-decoration:none; color:var(--text-secondary);
          transition:background .12s ease, color .12s ease;
        }
        .dev-nav-row span { font-size:12.5px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .dev-nav-row small { font-size:10px; color:var(--text-muted); opacity:.65; }
        .dev-nav-row:hover { background:color-mix(in srgb, var(--surface-2) 70%, transparent); color:var(--text); }
        .dev-nav-row.active { background:color-mix(in srgb, var(--surface-2) 90%, transparent); color:var(--text); }
        .dev-logout {
          height:30px; display:flex; align-items:center; gap:7px;
          border:0; background:transparent; color:var(--text-muted);
          font:inherit; font-size:12px; font-weight:500;
          border-radius:7px; padding:0 9px; cursor:pointer;
        }
        .dev-logout:hover { background:var(--surface-2); color:var(--text); }
        .dev-main { min-width:0; padding:28px clamp(22px, 3vw, 44px); }
        .dev-loading { min-height:100vh; background:var(--bg); }
        .dev-page { max-width:1180px; margin:0 auto; }
        .dev-page-header { display:flex; justify-content:space-between; gap:24px; align-items:flex-start; margin-bottom:24px; }
        .dev-eyebrow { margin:0 0 6px; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:.08em; font-weight:600; }
        .dev-page h1 { margin:0; font-size:22px; line-height:1.15; font-weight:500; letter-spacing:-.012em; color:var(--text); }
        .dev-page-header .meta { margin:6px 0 0; color:var(--text-muted); font-size:13px; }
        .dev-primary-btn, .dev-secondary-btn {
          height:32px; border-radius:8px; padding:0 12px;
          border:1px solid var(--border); font:inherit; font-size:12.5px; font-weight:500;
          cursor:pointer;
        }
        .dev-primary-btn { background:var(--accent); color:var(--accent-text); border-color:var(--accent); }
        .dev-secondary-btn { background:var(--surface); color:var(--text); }
        .dev-surface {
          border:1px solid var(--border);
          background:var(--surface);
          border-radius:10px;
        }
        .dev-row {
          display:grid; align-items:center; gap:14px;
          min-height:44px; padding:8px 14px; border-radius:8px;
          transition:background .12s ease;
        }
        .dev-row:hover { background:color-mix(in srgb, var(--surface-2) 70%, transparent); }
        .dev-kpi-grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:10px; margin-bottom:24px; }
        .dev-kpi { padding:14px; }
        .dev-kpi strong { display:block; font-size:18px; letter-spacing:-.015em; font-weight:600; }
        .dev-kpi span { display:block; margin-top:3px; font-size:11.5px; color:var(--text-muted); }
        .dev-section-title { margin:0 0 8px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--text-muted); font-weight:600; }
        .dev-chip {
          display:inline-flex; align-items:center; gap:6px;
          min-height:22px; padding:0 8px; border-radius:5px;
          background:var(--surface-2); color:var(--text-secondary);
          font-size:11px; font-weight:500;
          border:1px solid color-mix(in srgb, var(--border) 55%, transparent);
        }
        @media (max-width: 840px) {
          .dev-shell { grid-template-columns:1fr; }
          .dev-sidebar {
            position:relative; height:auto;
            border-right:0; border-bottom:1px solid var(--border);
            padding:14px 12px;
          }
          .dev-main { padding:22px 16px 88px; }
          .dev-nav-row small, .dev-sync-card { display:none; }
          .dev-kpi-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
    </div>
  )
}
