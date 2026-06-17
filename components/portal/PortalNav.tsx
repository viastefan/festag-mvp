'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ChartLineUp,
  Tray,
  Briefcase,
  Scales,
  CheckSquare,
  FileText,
  UsersThree,
  Question,
  SidebarSimple,
} from '@phosphor-icons/react'

const NAV = [
  { href: '/dashboard', label: 'Statusabfrage', Icon: ChartLineUp },
  { href: '/messages', label: 'Inbox', Icon: Tray },
  { href: '/dashboard', label: 'Projekte', Icon: Briefcase },
  { href: '/decisions', label: 'Entscheidungen', Icon: Scales },
  { href: '/activity', label: 'Tasks', Icon: CheckSquare },
  { href: '/documents', label: 'Dokumente', Icon: FileText },
  { href: '/teams', label: 'Teams', Icon: UsersThree },
] as const

export default function PortalNav() {
  const pathname = usePathname()
  const [initials, setInitials] = useState('ST')

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: p } = await createClient()
        .from('profiles')
        .select('first_name,full_name')
        .eq('id', data.user.id)
        .single()
      const name = (p as { first_name?: string; full_name?: string } | null)?.first_name
        ?? (p as { full_name?: string } | null)?.full_name?.split(' ')[0]
        ?? data.user.email?.split('@')[0]
        ?? 'ST'
      setInitials(name.slice(0, 2).toUpperCase())
    })
  }, [])

  return (
    <aside className="portal-nav">
      <style>{`
        .portal-nav {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: calc(100vh - 16px);
          padding: 12px 0;
          flex-shrink: 0;
        }
        .portal-nav-top { display: flex; flex-direction: column; gap: 45px; width: 100%; }
        .portal-nav-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 115px;
          width: 100%;
          padding: 0 4px;
        }
        .portal-nav-avatar {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid #f3f5f7;
          background: rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 500;
          color: #0f0f10;
          flex-shrink: 0;
        }
        .portal-nav-collapse {
          width: 14px;
          height: 14px;
          border: none;
          background: transparent;
          color: #6e717e;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .portal-nav-list { display: flex; flex-direction: column; gap: 8px; width: 100%; min-width: 190px; }
        .portal-nav-link {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 8px 12px;
          border-radius: 6px;
          text-decoration: none;
          color: #6e717e;
          font-size: 16px;
          letter-spacing: 0.32px;
          transition: background .12s, color .12s;
        }
        .portal-nav-link.is-active {
          background: rgba(255,255,255,0.8);
          color: #0f0f10;
        }
        .portal-nav-link:hover:not(.is-active) { color: #0f0f10; }
        .portal-nav-help {
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: #6e717e;
          cursor: pointer;
          padding: 0;
          margin-left: 12px;
        }
        @media (max-width: 900px) {
          .portal-nav { display: none; }
        }
      `}</style>

      <div className="portal-nav-top">
        <div className="portal-nav-head">
          <div className="portal-nav-avatar">{initials}</div>
          <button type="button" className="portal-nav-collapse" aria-label="Sidebar">
            <SidebarSimple size={14} weight="bold" />
          </button>
        </div>

        <nav className="portal-nav-list">
          {NAV.map(({ href, label, Icon }) => {
            const active = href === '/decisions' ? pathname.startsWith('/decisions') : pathname === href
            return (
              <Link key={label} href={href} className={`portal-nav-link${active ? ' is-active' : ''}`}>
                <Icon size={18} weight={active ? 'bold' : 'regular'} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <button type="button" className="portal-nav-help" aria-label="Hilfe">
        <Question size={24} weight="light" />
      </button>
    </aside>
  )
}
