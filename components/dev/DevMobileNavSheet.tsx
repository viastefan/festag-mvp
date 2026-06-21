'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BookOpen, CaretRight, Moon, Sun } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import {
  DEV_MOB_HERO,
  DEV_MOB_NAV_GROUPS,
  DEV_MOB_SETTINGS,
} from '@/lib/dev-mobile-nav'
import { getTheme, setTheme, type ThemeMode } from '@/lib/theme'
import MobileNavSheetShell from '@/components/mobile/MobileNavSheetShell'

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
  sub,
  Icon,
  active,
  featured,
  onClose,
}: {
  href: string
  label: string
  sub?: string
  Icon: Icon
  active?: boolean
  featured?: boolean
  onClose: () => void
}) {
  return (
    <Link
      href={href}
      className={`mns-item${featured ? ' mns-item-featured' : ''}${active ? ' on' : ''}`}
      onClick={onClose}
    >
      <span className="mns-item-icon" aria-hidden>
        <Icon size={18} weight={active ? 'fill' : 'regular'} />
      </span>
      <span className="mns-item-label">
        {label}
        {sub ? <span className="mns-item-sub">{sub}</span> : null}
      </span>
      <span className="mns-item-caret" aria-hidden>
        <CaretRight size={14} weight="bold" />
      </span>
    </Link>
  )
}

export default function DevMobileNavSheet({ open, onClose }: Props) {
  const pathname = usePathname() || ''
  const [theme, setThemeState] = useState<ThemeMode>('light')

  useEffect(() => {
    if (!open) return
    setThemeState(getTheme())
    const onTheme = (e: Event) => {
      const next = (e as CustomEvent<ThemeMode>).detail
      if (next) setThemeState(next)
    }
    window.addEventListener('festag-theme', onTheme)
    return () => window.removeEventListener('festag-theme', onTheme)
  }, [open])

  function isActive(match?: (path: string) => boolean, href?: string) {
    if (match) return match(pathname)
    return href ? pathname === href || pathname.startsWith(`${href}/`) : false
  }

  function pickTheme(mode: ThemeMode) {
    setThemeState(mode)
    setTheme(mode)
  }

  const SettingsIcon = DEV_MOB_SETTINGS.Icon

  const footer = (
    <>
      <Link
        href={DEV_MOB_SETTINGS.href}
        className={`mns-settings${isActive(DEV_MOB_SETTINGS.match) ? ' on' : ''}`}
        onClick={onClose}
      >
        <SettingsIcon size={16} weight="regular" />
        <span>{DEV_MOB_SETTINGS.label}</span>
      </Link>
      <div className="mns-theme" role="group" aria-label="Erscheinungsbild">
        {THEME_OPTIONS.map(({ mode, label, Icon }) => {
          const on = themeMatches(theme, mode)
          return (
            <button
              key={mode}
              type="button"
              className={on ? 'on' : ''}
              onClick={() => pickTheme(mode)}
              aria-label={label}
              aria-pressed={on}
              title={label}
            >
              <Icon size={16} weight={on ? 'fill' : 'regular'} />
            </button>
          )
        })}
      </div>
    </>
  )

  return (
    <MobileNavSheetShell open={open} onClose={onClose} title="Dev Panel" ariaLabel="Dev Navigation" footer={footer}>
      <div className="mns-list" role="list">
        <NavItem
          href={DEV_MOB_HERO.href}
          label={DEV_MOB_HERO.label}
          sub={DEV_MOB_HERO.sub}
          Icon={DEV_MOB_HERO.Icon}
          active={isActive(DEV_MOB_HERO.match)}
          featured
          onClose={onClose}
        />
      </div>

      {DEV_MOB_NAV_GROUPS.map(group => (
        <div key={group.label}>
          <p className="mns-section">{group.label}</p>
          <div className="mns-list" role="list">
            {group.items.map(item => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.Icon}
                active={isActive(item.match, item.href)}
                onClose={onClose}
              />
            ))}
          </div>
        </div>
      ))}
    </MobileNavSheetShell>
  )
}
