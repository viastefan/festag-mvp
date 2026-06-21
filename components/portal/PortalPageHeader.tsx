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
 * Portal list-page header — matches Entscheidungen: large title + soft lead line.
 * Styles: DECISION_CSS + FESTAG_CONTENT_HEAD_CSS (.dec-page-head, .dec-page-lead-line).
 */
export default function PortalPageHeader({
  title,
  lead,
  mobileMenuItems = [],
  actions,
  onMenu,
  onSearch,
}: {
  title: string
  lead: string
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
            <span className="dec-dt">{title}</span>
            <span className="dec-m-t">{title}</span>
          </h1>
          <p className="dec-m-lead">
            <span className="dec-m-t">{lead}</span>
          </p>
          <div className="dec-page-lead dec-dt">
            <p className="dec-page-lead-line festag-page-lead-line">{lead}</p>
          </div>
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
