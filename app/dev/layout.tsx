'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clearStoredDevSession, devDisplayName, getStoredDevSession, type DevSession } from '@/lib/dev-session'
import { Briefcase, CheckSquare, House, Kanban, SignOut, UsersThree } from '@phosphor-icons/react'

const NAV = [
  { href: '/dev', icon: House, label: 'Mission Control', meta: 'Übersicht' },
  { href: '/dev/jobs', icon: Kanban, label: 'Execution Board', meta: 'Client Sync' },
  { href: '/dev/tasks', icon: CheckSquare, label: 'Meine Tasks', meta: 'Fokus' },
  { href: '/dev/team', icon: UsersThree, label: 'Team', meta: 'Delivery' },
]

export default function DevLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [devInfo, setDevInfo] = useState<DevSession | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const session = getStoredDevSession()
    if (!session) {
      window.location.href = '/dev/login'
      return
    }
    setDevInfo(session)
    setChecking(false)
  }, [])

  function logout() {
    clearStoredDevSession()
    window.location.href = '/login'
  }

  if (checking) {
    return (
      <div className="dev-loading">
        <div>
          <p>Execution layer initializing</p>
          <h1>Developer Workspace wird vorbereitet.</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="dev-shell">
      <aside className="dev-sidebar" aria-label="Developer Navigation">
        <div className="dev-brand">
          <img src="/brand/logo.svg" alt="festag" />
          <span>DEV</span>
        </div>

        <div className="dev-identity">
          <div className="dev-avatar">{devDisplayName(devInfo).slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{devDisplayName(devInfo)}</strong>
            <span>{devInfo?.access_mode === 'pool' ? 'Pool Developer' : 'Workspace Developer'}</span>
          </div>
        </div>

        <div className="dev-sync-card">
          <span className="dev-pulse" />
          <div>
            <strong>Client Board verbunden</strong>
            <p>Technische Updates werden über Tagro verständlich gespiegelt.</p>
          </div>
        </div>

        <nav className="dev-nav">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/dev' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} className={`dev-nav-row ${active ? 'active' : ''}`}>
                <Icon size={18} weight={active ? 'fill' : 'regular'} />
                <span>{item.label}</span>
                <small>{item.meta}</small>
              </Link>
            )
          })}
        </nav>

        <button className="dev-logout" onClick={logout}>
          <SignOut size={16} /> Abmelden
        </button>
      </aside>

      <main className="dev-main">
        {children}
      </main>

      <style jsx global>{`
        .dev-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 252px minmax(0, 1fr);
          background: var(--bg);
          color: var(--text);
        }
        .dev-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          padding: 22px 14px 16px;
          border-right: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
          background: color-mix(in srgb, var(--surface) 72%, var(--bg));
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .dev-brand { display:flex; align-items:center; gap:9px; padding:0 8px 4px; }
        .dev-brand img { height:18px; }
        .dev-brand span { font-size:9px; letter-spacing:.14em; font-weight:750; color:var(--text-muted); border:1px solid var(--border); border-radius:999px; padding:3px 7px; }
        .dev-identity { display:flex; align-items:center; gap:10px; padding:10px 9px; border-radius:14px; }
        .dev-avatar { width:32px; height:32px; border-radius:10px; display:grid; place-items:center; background:var(--text); color:var(--bg); font-size:11px; font-weight:800; }
        .dev-identity strong { display:block; font-size:13px; line-height:1.2; max-width:150px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .dev-identity span { display:block; font-size:11px; color:var(--text-muted); margin-top:2px; }
        .dev-sync-card { display:flex; gap:9px; padding:11px 10px; border-radius:15px; background:color-mix(in srgb, var(--surface-2) 70%, transparent); border:1px solid color-mix(in srgb, var(--border) 55%, transparent); }
        .dev-sync-card strong { display:block; font-size:12px; }
        .dev-sync-card p { margin:2px 0 0; font-size:11px; line-height:1.35; color:var(--text-muted); }
        .dev-pulse { width:8px; height:8px; flex:0 0 auto; border-radius:50%; margin-top:3px; background:#22c55e; box-shadow:0 0 0 4px color-mix(in srgb, #22c55e 16%, transparent); }
        .dev-nav { display:flex; flex-direction:column; gap:3px; padding-top:2px; flex:1; }
        .dev-nav-row { min-height:36px; display:grid; grid-template-columns:22px minmax(0, 1fr) auto; align-items:center; gap:8px; padding:0 9px; border-radius:10px; text-decoration:none; color:var(--text-secondary); transition:background .18s ease, color .18s ease; }
        .dev-nav-row span { font-size:13px; font-weight:650; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .dev-nav-row small { font-size:10px; color:var(--text-muted); opacity:.75; }
        .dev-nav-row:hover { background:color-mix(in srgb, var(--surface-2) 70%, transparent); color:var(--text); }
        .dev-nav-row.active { background:color-mix(in srgb, var(--surface-2) 88%, transparent); color:var(--text); }
        .dev-logout { height:34px; display:flex; align-items:center; gap:7px; border:0; background:transparent; color:var(--text-muted); font:inherit; font-size:12px; font-weight:650; border-radius:10px; padding:0 9px; cursor:pointer; }
        .dev-logout:hover { background:var(--surface-2); color:var(--text); }
        .dev-main { min-width:0; padding:42px clamp(24px, 4vw, 56px); }
        .dev-loading { min-height:100vh; display:flex; align-items:center; padding-left:12vw; background:var(--bg); color:var(--text); }
        .dev-loading p { margin:0 0 12px; color:var(--text-muted); font-size:12px; text-transform:uppercase; letter-spacing:.18em; }
        .dev-loading h1 { margin:0; max-width:620px; font-size:clamp(34px, 5vw, 70px); line-height:.98; letter-spacing:-.06em; }
        .dev-page { max-width:1180px; margin:0 auto; }
        .dev-page-header { display:flex; justify-content:space-between; gap:24px; align-items:flex-start; margin-bottom:36px; }
        .dev-eyebrow { margin:0 0 10px; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:.16em; font-weight:800; }
        .dev-page h1 { margin:0; font-size:clamp(34px, 4vw, 58px); line-height:.98; letter-spacing:-.06em; }
        .dev-page-header .meta { margin:12px 0 0; color:var(--text-muted); font-size:15px; }
        .dev-primary-btn, .dev-secondary-btn { height:34px; border-radius:10px; padding:0 13px; border:1px solid var(--border); font:inherit; font-size:12.5px; font-weight:750; cursor:pointer; }
        .dev-primary-btn { background:var(--text); color:var(--bg); border-color:var(--text); }
        .dev-secondary-btn { background:transparent; color:var(--text); }
        .dev-surface { border:1px solid color-mix(in srgb, var(--border) 55%, transparent); background:color-mix(in srgb, var(--surface) 70%, transparent); border-radius:18px; }
        .dev-row { display:grid; align-items:center; gap:14px; min-height:56px; padding:10px 14px; border-radius:14px; transition:background .18s ease, transform .18s ease; }
        .dev-row:hover { background:color-mix(in srgb, var(--surface-2) 70%, transparent); transform:translateY(-1px); }
        .dev-kpi-grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; margin-bottom:28px; }
        .dev-kpi { padding:16px; }
        .dev-kpi strong { display:block; font-size:24px; letter-spacing:-.04em; }
        .dev-kpi span { display:block; margin-top:3px; font-size:12px; color:var(--text-muted); }
        .dev-section-title { margin:0 0 12px; font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--text-muted); font-weight:800; }
        .dev-chip { display:inline-flex; align-items:center; gap:6px; min-height:26px; padding:0 9px; border-radius:999px; background:var(--surface-2); color:var(--text-secondary); font-size:12px; font-weight:700; border:1px solid color-mix(in srgb, var(--border) 55%, transparent); }
        @media (max-width: 840px) {
          .dev-shell { grid-template-columns:1fr; }
          .dev-sidebar { position:relative; height:auto; border-right:0; border-bottom:1px solid var(--border); }
          .dev-main { padding:28px 18px 90px; }
          .dev-nav-row small, .dev-sync-card { display:none; }
          .dev-kpi-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
    </div>
  )
}
