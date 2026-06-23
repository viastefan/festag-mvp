'use client'

/**
 * RailSidebar — Codex-style flat desktop rail for /projects.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Pulse, BellSimple, Cube, FlowArrow, SquaresFour, FileText, GearSix,
  SidebarSimple,
} from '@phosphor-icons/react'

type Item = { href: string; label: string; icon: React.ReactNode }

const ICON_SIZE = 18
const TOP_ITEMS: Item[] = [
  { href: '/dashboard', label: 'Statusabfrage', icon: <Pulse size={ICON_SIZE} weight="regular" /> },
  { href: '/benachrichtigungen',  label: 'Benachrichtigungen', icon: <BellSimple size={ICON_SIZE} weight="regular" /> },
]
const PERSONAL_ITEMS: Item[] = [
  { href: '/projects',  label: 'Projekte',      icon: <Cube size={ICON_SIZE} weight="regular" /> },
  { href: '/tasks',     label: 'Tasks',         icon: <FlowArrow size={ICON_SIZE} weight="regular" /> },
  { href: '/decisions', label: 'Entscheidungen', icon: <SquaresFour size={ICON_SIZE} weight="regular" /> },
  { href: '/docs',      label: 'Dokumente',     icon: <FileText size={ICON_SIZE} weight="regular" /> },
]

export default function RailSidebar() {
  const pathname = usePathname() || ''
  const [initials, setInitials] = useState('ST')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem('festag:rail-collapsed')
      if (v === '1') setCollapsed(true)
    } catch {}
  }, [])

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('festag:rail-collapsed', next ? '1' : '0') } catch {}
      document.body.dataset.railCollapsed = next ? '1' : '0'
      return next
    })
  }

  useEffect(() => {
    document.body.dataset.railCollapsed = collapsed ? '1' : '0'
  }, [collapsed])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        const u = data.session?.user
        if (!u || !alive) return
        const name: string = (u.user_metadata?.full_name || u.email || 'ST')
        const parts = name.replace(/^@/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2)
        const ini = parts.map(p => p[0]?.toUpperCase()).join('') || 'ST'
        setInitials(ini)
      } catch {}
    })()
    return () => { alive = false }
  }, [])

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="rail" aria-label="Hauptnavigation" data-collapsed={collapsed ? '1' : '0'}>
      <style>{CSS}</style>

      <div className="rail-head">
        <Link href="/account" className="rail-avatar" aria-label="Profil">
          <span>{initials}</span>
        </Link>
        <button
          type="button"
          className="rail-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
          title={collapsed ? 'Ausklappen' : 'Einklappen'}
        >
          <SidebarSimple size={16} weight="regular" />
        </button>
      </div>

      <nav className="rail-nav">
        <ul className="rail-group">
          {TOP_ITEMS.map(it => (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`rail-item${isActive(it.href) ? ' is-active' : ''}`}
                aria-label={it.label}
                title={it.label}
              >
                <span className="rail-icon">{it.icon}</span>
                <span className="rail-label">{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="rail-section-label">Persönlicher Bereich</div>

        <ul className="rail-group">
          {PERSONAL_ITEMS.map(it => (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`rail-item${isActive(it.href) ? ' is-active' : ''}`}
                aria-label={it.label}
                title={it.label}
              >
                <span className="rail-icon">{it.icon}</span>
                <span className="rail-label">{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="rail-footer">
        <Link href="/settings" className="rail-footer-link">
          <GearSix size={16} weight="regular" />
          <span>Einstellungen</span>
        </Link>
        <Link href="/support" className="rail-footer-pill">Hilfe</Link>
      </div>
    </aside>
  )
}

const CSS = `
  .rail {
    position: fixed; left: 0; top: 0; bottom: 0;
    width: var(--festag-sidebar-width, 260px);
    background: var(--sidebar-bg, #F6F6F7);
    box-shadow: none;
    z-index: 80;
    padding: 16px 14px 14px;
    display: flex; flex-direction: column;
    transition: width .22s cubic-bezier(.16,1,.3,1);
    overflow: hidden;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    box-sizing: border-box;
  }
  .rail[data-collapsed="1"] {
    width: 56px;
    padding-left: 8px;
    padding-right: 8px;
  }

  .rail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
    padding: 0 4px;
  }
  .rail[data-collapsed="1"] .rail-head {
    flex-direction: column;
    padding: 0;
  }

  .rail-toggle {
    width: 28px; height: 28px;
    border: 0; background: transparent;
    border-radius: 8px;
    color: #6B6B6F; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
    flex-shrink: 0;
  }
  .rail-toggle:hover { background: rgba(0,0,0,.04); color: #1C1C1E; }

  .rail-avatar {
    width: 24px; height: 24px;
    border: 0;
    background: #fff;
    border-radius: 6px;
    display: inline-flex; align-items: center; justify-content: center;
    color: #1C1C1E;
    font-size: 10px; font-weight: 500;
    text-decoration: none;
    flex-shrink: 0;
  }

  .rail-nav {
    flex: 1; min-height: 0;
    display: flex; flex-direction: column; gap: 4px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .rail-nav::-webkit-scrollbar { display: none; }

  .rail-group {
    list-style: none; margin: 0; padding: 0;
    display: flex; flex-direction: column; gap: 4px;
  }

  .rail-section-label {
    margin: 18px 0 8px 12px;
    font-size: 11px; font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #8E8E93;
    white-space: nowrap;
    transition: opacity .18s ease;
  }
  .rail[data-collapsed="1"] .rail-section-label { opacity: 0; height: 0; margin: 8px 0; overflow: hidden; }

  .rail-item {
    display: flex; align-items: center; gap: 12px;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 4px;
    color: #6B6B6F;
    text-decoration: none;
    transition: background .12s, color .12s;
    white-space: nowrap;
  }
  .rail-item:hover {
    background: rgba(0,0,0,.035);
    color: #1C1C1E;
  }
  .rail-item.is-active {
    color: #1C1C1E;
    background: rgba(0,0,0,.05);
  }
  .rail-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 18px; height: 18px; flex-shrink: 0;
  }
  .rail-label {
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0;
    transition: opacity .18s ease;
    white-space: nowrap;
  }
  .rail[data-collapsed="1"] .rail-label { opacity: 0; width: 0; overflow: hidden; pointer-events: none; }
  .rail[data-collapsed="1"] .rail-item { justify-content: center; padding: 0; width: 40px; margin: 0 auto; }

  .rail-footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 12px;
    margin-top: 8px;
  }
  .rail[data-collapsed="1"] .rail-footer { flex-direction: column; }
  .rail-footer-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 400;
    color: #6B6B6F;
    text-decoration: none;
    transition: background .12s, color .12s;
  }
  .rail-footer-link:hover { color: #1C1C1E; background: rgba(0,0,0,.035); }
  .rail[data-collapsed="1"] .rail-footer-link span { display: none; }
  .rail-footer-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 14px;
    border-radius: 999px;
    background: rgba(0,0,0,.06);
    color: #1C1C1E;
    font-size: 12.5px;
    font-weight: 400;
    text-decoration: none;
    transition: background .12s;
  }
  .rail-footer-pill:hover { background: rgba(0,0,0,.09); }

  @media (max-width: 720px) {
    .rail { display: none; }
  }
`
