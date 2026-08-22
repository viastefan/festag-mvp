'use client'

import { Bell, List, MagnifyingGlass } from '@phosphor-icons/react'
import { CODEX_ORB_CSS } from '@/components/mobile/codex-mobile-styles'

type Props = {
  onMenu?: () => void
  onSearch?: () => void
  /** Optional third control. Stays inside the one pill — the mobile rule
      forbids replacing it with separate orbs, not carrying another button. */
  onNotifications?: () => void
  unread?: number
  dark?: boolean
}

/** Cursor-style rounded controls — search + menu on the right. */
export default function CodexMobileActionPill({
  onMenu,
  onSearch,
  onNotifications,
  unread = 0,
  dark = false,
}: Props) {
  return (
    <>
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: CODEX_ORB_CSS }} />
      <div className={`cx-orb-group${dark ? ' cx-action-pill--dark' : ''}`}>
        <button type="button" className="cx-orb" aria-label="Suche" onClick={onSearch}>
          <MagnifyingGlass size={18} weight="regular" />
        </button>
        {onNotifications ? (
          <button
            type="button"
            className="cx-orb cx-orb--notif"
            aria-label={unread > 0 ? `Benachrichtigungen, ${unread} ungelesen` : 'Benachrichtigungen'}
            onClick={onNotifications}
          >
            <Bell size={18} weight="regular" />
            {unread > 0 ? <span className="cx-orb-dot" aria-hidden="true" /> : null}
          </button>
        ) : null}
        <button type="button" className="cx-orb" aria-label="Menü" onClick={onMenu}>
          <List size={18} weight="regular" />
        </button>
      </div>
    </>
  )
}
