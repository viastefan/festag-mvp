'use client'

/**
 * DevMobileDock — persistent dev navigation on mobile.
 *
 * Segmented tabs: Überblick · Aufnahmen · Aufgaben
 * Primary action: Mehr → DevMobileNavSheet
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SquaresFour } from '@phosphor-icons/react'
import { DEV_MOB_DOCK_TABS } from '@/lib/dev-mobile-nav'
import DevMobileNavSheet from '@/components/dev/DevMobileNavSheet'
import { FESTAG_MOBILE_DOCK_CSS } from '@/components/mobile/festag-mobile-dock-styles'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { OPEN_DEV_NAV_EVENT } from '@/lib/festag-global-dock'

export default function DevMobileDock() {
  const pathname = usePathname() || ''
  const mobile = useFestagMobile()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    function onOpenNav() { setNavOpen(true) }
    window.addEventListener(OPEN_DEV_NAV_EVENT, onOpenNav)
    return () => window.removeEventListener(OPEN_DEV_NAV_EVENT, onOpenNav)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('festag-dev-dock', mobile)
    return () => { document.body.classList.remove('festag-dev-dock') }
  }, [mobile])

  if (!mobile) return null

  function isActive(match?: (path: string) => boolean, href?: string) {
    if (match) return match(pathname)
    return href ? pathname === href || pathname.startsWith(`${href}/`) : false
  }

  return (
    <>
      <style>{FESTAG_MOBILE_DOCK_CSS}</style>
      <div className="fmd-root fmd-root--on" role="toolbar" aria-label="Dev Navigation">
        <div className="fmd-segment">
          {DEV_MOB_DOCK_TABS.map(tab => {
            const active = isActive(tab.match, tab.href)
            const Icon = tab.Icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`fmd-tab${active ? ' on' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} weight={active ? 'fill' : 'regular'} />
                <span className="fmd-tab-label">{tab.label}</span>
              </Link>
            )
          })}
        </div>
        <button
          type="button"
          className="fmd-primary"
          aria-label="Weitere Bereiche"
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
        >
          <SquaresFour className="fmd-primary-icon" weight="fill" />
          <span>Mehr</span>
        </button>
      </div>

      <DevMobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />
    </>
  )
}
