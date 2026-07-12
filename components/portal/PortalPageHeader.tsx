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
            <span className="dec-dt">
              <span className="festag-page-lead-strong">{title}</span>
              {lead.trim() ? <span className="festag-page-lead-muted"> {lead}</span> : null}
            </span>
            <span className="dec-m-t">
              <span className="festag-page-lead-strong">{title}</span>
              {lead.trim() ? <span className="festag-page-lead-muted"> {lead}</span> : null}
            </span>
          </h1>
          <p className="dec-m-lead dec-m-lead--legacy">
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
