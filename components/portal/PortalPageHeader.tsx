'use client'

import type { ReactNode } from 'react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'

/**
 * Portal list-page header — matches Entscheidungen: large title only.
 * Styles: DECISION_CSS (.dec-page-head). No page lead under h1.
 * Mobile: title + CodexMobileActionPill (Suche + Menü).
 */
export default function PortalPageHeader({
  title,
  actions,
  onMenu,
  onSearch,
}: {
  title: string
  actions?: ReactNode
  onMenu?: () => void
  onSearch?: () => void
}) {
  const openSearch = onSearch ?? (() => window.dispatchEvent(new CustomEvent('open-command-palette')))

  return (
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
  )
}
