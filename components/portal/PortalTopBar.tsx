'use client'

/**
 * PortalTopBar — Dev-style utility header for the Client Portal plate.
 *
 * Search (⌘K), Status-Briefing, Notifications — client-facing, no GitHub/repo.
 * Auth sand gradients stay on login/register only (untouched).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlass, SidebarSimple } from '@phosphor-icons/react'
import BriefingEqualizerIcon from '@/components/icons/BriefingEqualizerIcon'
import NotificationsBell from '@/components/NotificationsBell'
import FestagIconButton from '@/components/ui/FestagIconButton'
import { createClient } from '@/lib/supabase/client'
import { openWeeklyBriefing } from '@/lib/weekly-briefing'
import { PORTAL_NAV } from '@/lib/portal-nav'
import { PORTAL_TOPBAR_CSS } from '@/components/portal/portal-topbar-styles'

const ROUTE_LABEL_FALLBACK: Record<string, string> = {
  '/dashboard': 'Status',
  '/statusabfrage': 'Status',
  '/projects': 'Projekte',
  '/tasks': 'Aufgaben',
  '/decisions': 'Entscheidungen',
  '/documents': 'Dokumente',
  '/benachrichtigungen': 'Inbox',
  '/messages': 'Inbox',
  '/inbox': 'Inbox',
  '/tagro': 'Tagro',
  '/workspace': 'Workspace',
  '/settings': 'Einstellungen',
  '/team': 'Team',
  '/lieferungen': 'Lieferungen',
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'FT'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function resolveSectionLabel(pathname: string): string {
  const hit = PORTAL_NAV.find(item =>
    item.match ? item.match(pathname) : pathname === item.href || pathname.startsWith(`${item.href}/`),
  )
  if (hit) return hit.label
  if (pathname.startsWith('/project/')) return 'Projekt'
  if (pathname.startsWith('/settings')) return 'Einstellungen'
  for (const [href, label] of Object.entries(ROUTE_LABEL_FALLBACK)) {
    if (pathname === href || pathname.startsWith(`${href}/`)) return label
  }
  return 'Festag'
}

type Props = {
  sidebarCollapsed: boolean
  onExpandSidebar: () => void
}

export default function PortalTopBar({ sidebarCollapsed, onExpandSidebar }: Props) {
  const pathname = usePathname() || '/dashboard'
  const sectionLabel = useMemo(() => resolveSectionLabel(pathname), [pathname])
  const [displayName, setDisplayName] = useState('Festag')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const u = sessionData.session?.user
        if (!u || !alive) return
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, first_name, email, avatar_url')
          .eq('id', u.id)
          .maybeSingle()
        if (!alive) return
        const p = profile as {
          full_name?: string | null
          first_name?: string | null
          email?: string | null
          avatar_url?: string | null
        } | null
        const email = p?.email || u.email || ''
        const name =
          (p?.full_name || '').trim() ||
          (p?.first_name || '').trim() ||
          email.split('@')[0] ||
          'Festag'
        setDisplayName(name)
        setAvatarUrl(p?.avatar_url || null)
      } catch {
        /* noop */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <>
      <style>{PORTAL_TOPBAR_CSS}</style>
      <header className="ptb" aria-label="Portal Kopfzeile">
        {sidebarCollapsed ? (
          <button
            type="button"
            className="ptb-icon-btn"
            onClick={onExpandSidebar}
            title="Sidebar ausklappen"
            aria-label="Sidebar ausklappen"
          >
            <SidebarSimple size={16} weight="regular" />
          </button>
        ) : null}

        <nav className="ptb-crumbs" aria-label="Pfad">
          <span className="ptb-crumb">{sectionLabel}</span>
        </nav>

        <div className="ptb-spacer" />

        <button
          type="button"
          className="ptb-search"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          title="Suchen und Aktionen"
        >
          <MagnifyingGlass size={14} weight="regular" aria-hidden />
          <span className="ptb-search-label">Suchen…</span>
          <span className="ptb-kbd" aria-hidden="true">⌘K</span>
        </button>

        <FestagIconButton
          size={28}
          aria-label="Wöchentliches Status-Briefing"
          title="Status-Briefing"
          onClick={openWeeklyBriefing}
          className="ptb-icon-btn portal-nav-briefing-btn"
          data-briefing-anchor=""
        >
          <BriefingEqualizerIcon size={15} stroke={1.2} />
        </FestagIconButton>

        <div className="ptb-bell">
          <NotificationsBell variant="portal" limit={14} />
        </div>

        <Link
          href="/settings"
          className="ptb-avatar"
          title={`${displayName}, Einstellungen`}
          aria-label="Profil und Einstellungen"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" />
          ) : (
            initials(displayName)
          )}
        </Link>
      </header>
    </>
  )
}
