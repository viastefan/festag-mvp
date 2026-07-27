'use client'

import type { ReactNode } from 'react'
import MobilePageHeader from '@/components/MobilePageHeader'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'

type MenuItem = {
  id: string
  label: string
  onClick?: () => void
  href?: string
}

/**
 * Portal list-page header — matches Entscheidungen: large title only.
 * Styles: DECISION_CSS (.dec-page-head). No page lead under h1.
 */
export default function PortalPageHeader({
  title,
  lead = '',
  mobileMenuItems = [],
  actions,
  onMenu,
  onSearch,
}: {
  title: string
  /** @deprecated Page leads under h1 are banned — accepted but not rendered when empty. Prefer omit. */
  lead?: string
  mobileMenuItems?: MenuItem[]
  actions?: ReactNode
  onMenu?: () => void
  onSearch?: () => void
}) {
  const openSearch = onSearch ?? (() => window.dispatchEvent(new CustomEvent('open-command-palette')))

  return (
    <>
      <div className="dec-legacy-mph">
        <MobilePageHeader title={title} menuItems={mobileMenuItems} />
      </div>
      <header className="dec-page-head">
        <div className="dec-page-head-copy dec-m-title">
          <h1 className="dec-page-title festag-page-title">
            <span className="dec-dt">
              <span className="festag-page-lead-strong">{title}</span>
            </span>
            <span className="dec-m-t">
              <span className="festag-page-lead-strong">{title}</span>
            </span>
          </h1>
        </div>
        {onMenu && (
          <div className="dec-m-head-actions">
            <CodexMobileActionPill onMenu={onMenu} onSearch={openSearch} />
          </div>
        )}
        {actions ? <div className="dec-page-actions dec-dt">{actions}</div> : null}
      </header>
    </>
  )
}
