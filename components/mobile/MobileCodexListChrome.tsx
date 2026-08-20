'use client'

import { useState, type ReactNode } from 'react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobilePageDock, { type MobileDockAction } from '@/components/mobile/MobilePageDock'
import { MOBILE_CODEX_LIST_CSS } from '@/components/mobile/mobile-codex-list-styles'

type DockConfig = {
  onDragUp: () => void
  primary: MobileDockAction
  secondary: MobileDockAction
}

type Props = {
  /** Root page class (e.g. inbox-page) — also gets mcl-page on mobile */
  className?: string
  title: string
  titleMobile?: string
  /** Optional mobile-only context under title — omit for clean title-only headers (hidden on mobile by CSS) */
  subtitle?: string
  /** Desktop-only lead block below mobile subtitle */
  desktopLead?: ReactNode
  /** @deprecated Prefer omitting — legacy MobilePageHeader is no longer part of the chrome contract */
  legacyHeader?: ReactNode
  /** Mobile action row: primary chip + filter controls */
  mobileActions?: ReactNode
  /** Page content */
  children: ReactNode
  dock: DockConfig
  extraCss?: string
}

export default function MobileCodexListChrome({
  className = '',
  title,
  titleMobile,
  subtitle = '',
  desktopLead,
  legacyHeader,
  mobileActions,
  children,
  dock,
  extraCss = '',
}: Props) {
  const [navOpen, setNavOpen] = useState(false)
  const mobileTitle = titleMobile ?? title

  return (
    <div className={`mcl-page ${className}`.trim()}>
      {/* One __html string, not two text children: React separates adjacent
          text children with a comment node, and inside a raw-text <style> that
          separator becomes literal stylesheet content the client never
          reproduces. Escaping would break this the same way it broke elsewhere. */}
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: MOBILE_CODEX_LIST_CSS + extraCss }} />

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      {legacyHeader ? <div className="mcl-legacy-mph">{legacyHeader}</div> : null}

      <div className="mcl-shell">
        <div className="festag-mobile-chrome">
          <header className="mcl-head">
            <div className="mcl-nav-row">
              <span className="mcl-nav-spacer" aria-hidden />
              <CodexMobileActionPill
                onMenu={() => setNavOpen(true)}
                onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              />
            </div>
            <div className="mcl-head-copy">
              <h1>
                <span className="mcl-dt">{title}</span>
                <span className="mcl-m">{mobileTitle}</span>
              </h1>
              {subtitle.trim() ? (
                <p className="mcl-page-sub">
                  <span className="mcl-m">{subtitle}</span>
                </p>
              ) : null}
              {desktopLead ? <div className="mcl-dt">{desktopLead}</div> : null}
            </div>
          </header>

          {mobileActions ? <div className="mcl-actions">{mobileActions}</div> : null}
        </div>

        <div className="mcl-body">{children}</div>
      </div>

      <MobilePageDock
        onDragUp={dock.onDragUp}
        primary={dock.primary}
        secondary={dock.secondary}
      />
    </div>
  )
}
