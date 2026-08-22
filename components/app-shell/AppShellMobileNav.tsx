'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, GearSix } from '@phosphor-icons/react'
import MobileNavSheetShell from '@/components/mobile/MobileNavSheetShell'
import {
  APP_SHELL_PRIMARY_NAV,
  APP_SHELL_SECONDARY_NAV,
  isAppShellNavActive,
} from '@/components/app-shell/app-shell-nav'

type Props = {
  open: boolean
  onClose: () => void
  unread?: number
}

/**
 * Navigation for the OS shell on mobile.
 *
 * MobileNavSheet exists already but reads lib/portal-nav — the retired portal
 * routes, not the shell's own. Mobile would have offered a different product
 * than the desktop rail. Same sheet chrome, shell nav inside.
 */
export default function AppShellMobileNav({ open, onClose, unread = 0 }: Props) {
  const pathname = usePathname() || '/overview'

  const row = (href: string, label: string, Icon: typeof GearSix, badge?: number) => {
    const active = isAppShellNavActive(pathname, href)
    return (
      <Link
        key={href}
        href={href}
        className={`asmn-item${active ? ' is-active' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={onClose}
      >
        <Icon size={19} weight="light" />
        <span className="asmn-label">{label}</span>
        {badge ? <span className="asmn-badge">{badge > 99 ? '99+' : badge}</span> : null}
      </Link>
    )
  }

  return (
    <MobileNavSheetShell open={open} onClose={onClose} title="Navigation" ariaLabel="Navigation">
      <nav className="asmn-list" aria-label="Workspace">
        {APP_SHELL_PRIMARY_NAV.map((i) => row(i.href, i.label, i.icon))}
        <span className="asmn-sep" aria-hidden />
        {APP_SHELL_SECONDARY_NAV.map((i) => row(i.href, i.label, i.icon))}
        <span className="asmn-sep" aria-hidden />
        {/* The bell leaves the top bar on mobile — it lives one tap in here
            rather than competing with search and menu for the same corner. */}
        {row('/benachrichtigungen', 'Benachrichtigungen', Bell, unread)}
        {row('/settings', 'Einstellungen', GearSix)}
      </nav>
    </MobileNavSheetShell>
  )
}
