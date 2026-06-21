'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CaretLeft, List } from '@phosphor-icons/react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import {
  SECTION_LEAD,
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

export default function SettingsMobileShell({ section, pathname, savedLabel, invalidSlug, children }: Props) {
  const [navOpen, setNavOpen] = useState(false)
  const [sectionOpen, setSectionOpen] = useState(false)
  const activeSlug = settingsSlugFromPath(pathname)
  const title = invalidSlug ? 'Einstellungen' : SECTION_TITLE[section]
  const lead = invalidSlug ? 'Dieser Bereich existiert nicht — wähle links oder unten einen gültigen Bereich.' : SECTION_LEAD[section]

  return (
    <>
      <header className="set-codex-head set-dt">
        <div className="set-codex-head-copy">
          <h1 className="set-page-title">{title}</h1>
          <p className="set-page-lead">{lead}</p>
        </div>
        <span className={`set-saved${savedLabel ? ' show' : ''}`}>{savedLabel || 'Alle Änderungen gespeichert'}</span>
      </header>

      <header className="set-codex-head set-m">
        <div className="set-codex-head-copy">
          <Link href="/dashboard" className="set-m-back" aria-label="Zurück zur App">
            <CaretLeft size={14} weight="regular" />
            <span>App</span>
          </Link>
          <h1 className="set-page-title">{title}</h1>
          <p className="set-page-lead set-m-lead">{lead}</p>
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
              {group.items.map(item => {
                const href = settingsHref(item.slug)
                const active = item.slug === activeSlug
                return (
                  <Link
                    key={item.slug || 'profile'}
                    href={href}
                    className={`set-m-sheet-item${active ? ' on' : ''}`}
                    onClick={() => setSectionOpen(false)}
                  >
                    <item.icon size={16} weight="regular" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />
      {children}
    </>
  )
}
