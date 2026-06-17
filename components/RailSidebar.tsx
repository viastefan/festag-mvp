'use client'

/**
 * RailSidebar — schmale Icon-Sidebar mit Hover-Expand.
 *
 * Default 72px breit, nur Icons. Sobald die Maus drüber geht, fährt
 * sie für den Mouseover-Moment auf 240px aus und zeigt die Labels.
 * Verlässt der Cursor die Sidebar, klappt sie zurück.
 *
 * Items: Statusabfrage · Inbox · (sep Persönlicher Bereich) Projekte ·
 *        Tasks · Entscheidungen · Dokumente.
 *
 * Tagro-Round-Button bleibt eine separate Komponente — sitzt
 * unten-rechts auf der Page, nicht in der Sidebar.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Pulse, BellSimple, Cube, FlowArrow, SquaresFour, FileText, Question,
  SidebarSimple,
} from '@phosphor-icons/react'

type Item = { href: string; label: string; icon: React.ReactNode }

const ICON_SIZE = 16
const TOP_ITEMS: Item[] = [
  { href: '/dashboard', label: 'Statusabfrage', icon: <Pulse size={ICON_SIZE} weight="regular" /> },
  { href: '/messages',  label: 'Inbox',         icon: <BellSimple size={ICON_SIZE} weight="regular" /> },
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

      <button
        type="button"
        className="rail-toggle"
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
        title={collapsed ? 'Ausklappen' : 'Einklappen'}
      >
        <SidebarSimple size={16} weight="regular" />
      </button>

      <Link href="/account" className="rail-avatar" aria-label="Profil">
        <span>{initials}</span>
      </Link>

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

      <Link href="/support" className="rail-help" aria-label="Hilfe" title="Hilfe">
        <Question size={ICON_SIZE} weight="regular" />
      </Link>
    </aside>
  )
}

const CSS = `
  .rail {
    position: fixed; left: 0; top: 0; bottom: 0;
    width: 240px;
    background: rgba(252,252,252,0.92);
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
    border-right: 1px solid rgba(15,23,42,.05);
    z-index: 80;
    padding: 44px 0 20px;
    display: flex; flex-direction: column; align-items: stretch;
    transition: width .26s cubic-bezier(.16,1,.3,1);
    overflow: hidden;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .rail[data-collapsed="1"] {
    width: 60px;
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-right-color: transparent;
  }

  .rail-toggle {
    align-self: flex-end;
    margin: 0 14px 8px 0;
    width: 28px; height: 28px;
    border: 0; background: transparent;
    border-radius: 8px;
    color: #9AA0AC; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .14s, color .14s;
    flex-shrink: 0;
  }
  .rail-toggle:hover { background: rgba(91,100,125,.08); color: #2A3032; }
  .rail[data-collapsed="1"] .rail-toggle { align-self: center; margin-right: 0; }

  .rail-avatar {
    width: 40px; height: 40px;
    margin: 0 10px;
    border: 1px solid #F3F5F7;
    background: rgba(255,255,255,0.8);
    border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    color: #0F0F10;
    font-size: 14px; font-weight: 500;
    text-decoration: none;
    flex-shrink: 0;
  }

  .rail-nav {
    flex: 1; min-height: 0;
    margin: 32px 0 0;
    display: flex; flex-direction: column; gap: 4px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .rail-nav::-webkit-scrollbar { display: none; }

  .rail-group {
    list-style: none; margin: 0; padding: 0;
    display: flex; flex-direction: column;
  }

  .rail-section-label {
    margin: 22px 0 8px 22px;
    font-size: 11px; font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #9AA0AC;
    white-space: nowrap;
    opacity: 1;
    transition: opacity .18s ease;
  }
  .rail[data-collapsed="1"] .rail-section-label { opacity: 0; pointer-events: none; height: 12px; }

  .rail-item {
    display: flex; align-items: center; gap: 14px;
    height: 32px;
    padding: 0 22px;
    color: #6E717E;
    text-decoration: none;
    transition: background .14s, color .14s;
    white-space: nowrap;
  }
  .rail-item:hover {
    background: rgba(91,100,125,.04);
    color: #2A3032;
  }
  .rail-item.is-active {
    color: #0F0F10;
  }
  .rail-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 16px; height: 16px; flex-shrink: 0;
  }
  .rail-label {
    font-size: 13px;
    font-weight: 400;
    letter-spacing: .01em;
    opacity: 1;
    transform: none;
    transition: opacity .18s ease;
    white-space: nowrap;
  }
  .rail[data-collapsed="1"] .rail-label { opacity: 0; pointer-events: none; }

  .rail-help {
    align-self: flex-start;
    margin: 0 0 0 22px;
    width: 16px; height: 16px;
    color: #6E717E;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .rail-help:hover { color: #2A3032; }

  @media (max-width: 720px) {
    .rail { display: none; }
  }
`
