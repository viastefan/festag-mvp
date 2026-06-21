'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BookOpen, CaretRight, Moon, Sun } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { PORTAL_SETTINGS } from '@/lib/portal-nav'
import { usePortalNavItems } from '@/hooks/usePortalNavItems'
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

export default function MobileNavSheet({ open, onClose }: Props) {
  const pathname = usePathname() || ''
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const { items: navItems } = usePortalNavItems()

  const featured = navItems[0]
  const primary = navItems.slice(1, 5)
  const more = navItems.slice(5).map(item =>
    item.href === '/docs' ? { ...item, href: '/documents' } : item,
  )

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

  function isActive(href: string, match?: (path: string) => boolean) {
    if (match) return match(pathname)
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  function pickTheme(mode: ThemeMode) {
    setThemeState(mode)
    setTheme(mode)
  }

  const SettingsIcon = PORTAL_SETTINGS.Icon

  const footer = (
    <>
      <Link
        href={PORTAL_SETTINGS.href}
        className={`mns-settings${isActive(PORTAL_SETTINGS.href, PORTAL_SETTINGS.match) ? ' on' : ''}`}
        onClick={onClose}
      >
        <span className="mns-settings-icon" aria-hidden>
          <SettingsIcon size={15} weight="regular" />
        </span>
        <span>{PORTAL_SETTINGS.label}</span>
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
              <Icon size={14} weight={on ? 'fill' : 'regular'} />
            </button>
          )
        })}
      </div>
    </>
  )

  return (
    <MobileNavSheetShell open={open} onClose={onClose} title="Menü" footer={footer}>
      <div className="mns-list" role="list">
        {featured && (
          <NavItem
            href={featured.href}
            label={featured.label}
            sub="Gesamtbericht · Voice"
            Icon={featured.Icon}
            active={isActive(featured.href, featured.match)}
            featured
            onClose={onClose}
          />
        )}
      </div>

      {primary.length > 0 && (
        <>
          <p className="mns-section">Arbeit</p>
          <div className="mns-list" role="list">
            {primary.map(item => (
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
        </>
      )}

      {more.length > 0 && (
        <>
          <p className="mns-section">Workspace</p>
          <div className="mns-list" role="list">
            {more.map(item => (
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
        </>
      )}
    </MobileNavSheetShell>
  )
}
