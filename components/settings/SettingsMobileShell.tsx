'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CaretLeft, List } from '@phosphor-icons/react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import SettingsNavItems from '@/components/settings/SettingsNavItems'
import {
  SECTION_TITLE,
  SETTINGS_NAV_GROUPS,
  settingsHref,
  settingsSlugFromPath,
  type SettingsSectionId,
} from '@/components/settings/settings-config'

type Props = {
  section: SettingsSectionId
  pathname: string | null
  savedLabel: string
  invalidSlug?: boolean
  children: React.ReactNode
}

function SettingsBreadcrumb({ title, invalidSlug }: { title: string; invalidSlug?: boolean }) {
  return (
    <nav className="set-breadcrumb" aria-label="Pfad">
      <Link href={settingsHref('')}>Einstellungen</Link>
      {!invalidSlug && (
        <>
          <span className="set-breadcrumb-sep" aria-hidden>/</span>
          <span className="set-breadcrumb-current">{title}</span>
        </>
      )}
    </nav>
  )
}

export default function SettingsMobileShell({ section, pathname, savedLabel, invalidSlug, children }: Props) {
  const [navOpen, setNavOpen] = useState(false)
  const [sectionOpen, setSectionOpen] = useState(false)
  const activeSlug = settingsSlugFromPath(pathname)
  const title = invalidSlug ? 'Einstellungen' : SECTION_TITLE[section]

  return (
    <div className="set-codex-frame">
      <header className="set-codex-head set-dt">
        <SettingsBreadcrumb title={title} invalidSlug={invalidSlug} />
        <div className="set-codex-head-row">
          <div className="set-codex-head-copy">
            <h1 className="set-page-title">{title}</h1>
          </div>
          <span className={`set-saved${savedLabel ? ' show' : ''}`}>{savedLabel || 'Alle Änderungen gespeichert'}</span>
        </div>
      </header>

      <header className="set-codex-head set-m">
        <div className="set-codex-head-copy">
          <Link href="/dashboard" className="set-m-back" aria-label="Zurück zur App">
            <CaretLeft size={14} weight="regular" />
            <span>App</span>
          </Link>
          <SettingsBreadcrumb title={title} invalidSlug={invalidSlug} />
          <h1 className="set-page-title">{title}</h1>
        </div>
        <div className="set-m-head-actions">
          <button type="button" className="set-m-section-btn" onClick={() => setSectionOpen(true)} aria-label="Bereich wechseln">
            <List size={16} weight="regular" />
          </button>
          <CodexMobileActionPill
            onMenu={() => setNavOpen(true)}
            onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          />
        </div>
      </header>

      {sectionOpen && (
        <button type="button" className="set-m-sheet-backdrop" aria-label="Schließen" onClick={() => setSectionOpen(false)} />
      )}
      {sectionOpen && (
        <div className="set-m-section-sheet" role="menu" aria-label="Einstellungsbereiche">
          <p className="set-m-sheet-title">Einstellungen</p>
          {SETTINGS_NAV_GROUPS.map(group => (
            <div key={group.label} className="set-m-sheet-group">
              <p className="set-m-sheet-group-label">{group.label}</p>
              <SettingsNavItems
                items={group.items}
                activeSlug={activeSlug}
                itemClassName={isActive => `set-m-sheet-item${isActive ? ' on' : ''}`}
                onNavigate={() => setSectionOpen(false)}
              />
            </div>
          ))}
        </div>
      )}

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />
      {children}
    </div>
  )
}
