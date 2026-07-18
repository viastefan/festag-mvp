'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BookOpen, GearSix, Moon, Question, Sun } from '@phosphor-icons/react'
import { openFestagHelp } from '@/lib/help/festag-help-index'
import type { Icon } from '@phosphor-icons/react'
import { PORTAL_SETTINGS } from '@/lib/portal-nav'
import { usePortalNavItems } from '@/hooks/usePortalNavItems'
import { getTheme, setTheme, parseThemeEventDetail, type PanelThemeMode, type ThemeMode } from '@/lib/theme'
import MobileNavSheetShell from '@/components/mobile/MobileNavSheetShell'
import MobileNavAccountBar from '@/components/mobile/MobileNavAccountBar'

const THEME_OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'light', label: 'Hell', Icon: Sun },
  { mode: 'dark', label: 'Dunkel', Icon: Moon },
  { mode: 'read', label: 'Lesen', Icon: BookOpen },
]

function themeMatches(stored: ThemeMode, option: ThemeMode) {
  if (option === 'dark') return stored === 'dark' || stored === 'classic-dark'
  if (option === 'light') return stored === 'light' || stored === 'pure-light'
  return stored === option
}

type Props = {
  open: boolean
  onClose: () => void
}

function NavItem({
  href,
  label,
  Icon,
  active,
  onClose,
}: {
  href: string
  label: string
  Icon: Icon
  active?: boolean
  onClose: () => void
}) {
  return (
    <Link
      href={href}
      className={`mns-item${active ? ' on' : ''}`}
      onClick={onClose}
    >
      <span className="mns-item-icon" aria-hidden>
        <Icon size={18} weight={active ? 'fill' : 'regular'} />
      </span>
      <span className="mns-item-label">{label}</span>
    </Link>
  )
}

export default function MobileNavSheet({ open, onClose }: Props) {
  const pathname = usePathname() || ''
  const [theme, setThemeState] = useState<PanelThemeMode>('light')
  const { items: navItems } = usePortalNavItems()

  const items = navItems.map(item =>
    item.href === '/docs' ? { ...item, href: '/documents' } : item,
  )

  useEffect(() => {
    if (!open) return
    setThemeState(getTheme('client'))
    const onTheme = (e: Event) => {
      const parsed = parseThemeEventDetail((e as CustomEvent).detail)
      if (!parsed || parsed.surface !== 'client') return
      setThemeState(parsed.mode as PanelThemeMode)
    }
    window.addEventListener('festag-theme', onTheme)
    return () => window.removeEventListener('festag-theme', onTheme)
  }, [open])

  function isActive(href: string, match?: (path: string) => boolean) {
    if (match) return match(pathname)
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  function pickTheme(mode: ThemeMode) {
    setThemeState(mode as PanelThemeMode)
    setTheme(mode, 'client')
  }

  const footer = (
    <>
      <div className="mns-foot-links">
        <button
          type="button"
          className="mns-settings"
          onClick={() => {
            onClose()
            openFestagHelp()
          }}
        >
          <span className="mns-settings-icon" aria-hidden>
            <Question size={15} weight="regular" />
          </span>
          <span>Festag Help</span>
        </button>
        <Link
          href={PORTAL_SETTINGS.href}
          className={`mns-settings${isActive(PORTAL_SETTINGS.href, PORTAL_SETTINGS.match) ? ' on' : ''}`}
          onClick={onClose}
        >
          <span className="mns-settings-icon" aria-hidden>
            <GearSix size={15} weight="regular" />
          </span>
          <span>{PORTAL_SETTINGS.label}</span>
        </Link>
      </div>
      <div className="mns-theme" role="group" aria-label="Erscheinungsbild">
        {THEME_OPTIONS.map(({ mode, label, Icon }) => {
          const on = themeMatches(theme, mode)
          return (
            <button
              key={mode}
              type="button"
              className={`mns-theme-btn${on ? ' on' : ''}`}
              onClick={() => pickTheme(mode)}
              aria-label={label}
              aria-pressed={on}
              title={label}
            >
              <span className="mns-orb mns-orb--sm" aria-hidden>
                <Icon size={14} weight={on ? 'fill' : 'regular'} />
              </span>
            </button>
          )
        })}
      </div>
    </>
  )

  return (
    <MobileNavSheetShell
      open={open}
      onClose={onClose}
      title="Menü"
      footer={footer}
      headerBelow={<MobileNavAccountBar active={open} />}
    >
      <div className="mns-list" role="list">
        {items.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.Icon}
            active={isActive(item.href, item.match)}
            onClose={onClose}
          />
        ))}
      </div>
    </MobileNavSheetShell>
  )
}
