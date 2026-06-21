'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { BookOpen, CaretRight, Moon, Sun, X } from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import {
  DEV_MOB_HERO,
  DEV_MOB_NAV_GROUPS,
  DEV_MOB_SETTINGS,
} from '@/lib/dev-mobile-nav'
import { getTheme, setTheme, type ThemeMode } from '@/lib/theme'
import { MOBILE_NAV_SHEET_CSS } from '@/components/mobile/mobile-nav-sheet-styles'

const HERO_GRADIENT =
  'linear-gradient(145deg, #3d4658 0%, #343b4d 52%, #2a3140 100%)'

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

export default function DevMobileNavSheet({ open, onClose }: Props) {
  const pathname = usePathname() || ''
  const [mounted, setMounted] = useState(false)
  const [theme, setThemeState] = useState<ThemeMode>('light')

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    setThemeState(getTheme())
    const onTheme = (e: Event) => {
      const next = (e as CustomEvent<ThemeMode>).detail
      if (next) setThemeState(next)
    }
    window.addEventListener('festag-theme', onTheme)
    return () => window.removeEventListener('festag-theme', onTheme)
  }, [mounted])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  function isActive(match?: (path: string) => boolean, href?: string) {
    if (match) return match(pathname)
    return href ? pathname === href || pathname.startsWith(`${href}/`) : false
  }

  function pickTheme(mode: ThemeMode) {
    setThemeState(mode)
    setTheme(mode)
  }

  const HeroIcon = DEV_MOB_HERO.Icon
  const SettingsIcon = DEV_MOB_SETTINGS.Icon

  return createPortal(
    <div className="mns-root" role="presentation">
      <button type="button" className="mns-backdrop" aria-label="Schließen" onClick={onClose} />
      <nav className="mns-sheet festag-popup-surface festag-popup-mobile-sheet" aria-label="Dev Navigation">
        <FestagPopupDragHandle onDismiss={onClose} />

        <header className="mns-head">
          <div>
            <p className="mns-kicker">Dev Panel</p>
            <h2 className="mns-title">Ausführung & Kunden-Sicht</h2>
          </div>
          <button type="button" className="mns-close" onClick={onClose} aria-label="Schließen">
            <X size={16} weight="bold" />
          </button>
        </header>

        <Link
          href={DEV_MOB_HERO.href}
          className={`mns-hero${isActive(DEV_MOB_HERO.match) ? ' on' : ''}`}
          style={{ background: HERO_GRADIENT }}
          onClick={onClose}
        >
          <span className="mns-hero-icon" aria-hidden>
            <HeroIcon size={20} weight="regular" color="#fff" />
          </span>
          <span className="mns-hero-copy">
            <strong>{DEV_MOB_HERO.label}</strong>
            <small>{DEV_MOB_HERO.sub}</small>
          </span>
          <span className="mns-hero-caret" aria-hidden>
            <CaretRight size={15} weight="bold" color="rgba(255,255,255,0.85)" />
          </span>
        </Link>

        {DEV_MOB_NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="mns-section">{group.label}</p>
            <div className="mns-group">
              {group.items.map((item, index) => {
                const Icon = item.Icon
                const active = isActive(item.match, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mns-row${active ? ' on' : ''}${index < group.items.length - 1 ? ' has-divider' : ''}`}
                    onClick={onClose}
                  >
                    <span className="mns-row-icon" aria-hidden>
                      <Icon size={16} weight="regular" />
                    </span>
                    <span className="mns-row-label">{item.label}</span>
                    <span className="mns-row-caret" aria-hidden>
                      <CaretRight size={13} weight="bold" />
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        <footer className="mns-foot">
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
        </footer>
      </nav>

      <style jsx global>{MOBILE_NAV_SHEET_CSS}</style>
    </div>,
    document.body,
  )
}
