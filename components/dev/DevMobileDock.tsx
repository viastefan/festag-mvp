'use client'

/**
 * DevMobileDock — persistent mobile bottom bar for the developer portal.
 *
 * Two floating pills, mirroring the Client Portal's `PortalMobileDock` so
 * Client and Developer share one mobile bottom language:
 *
 *   ┌────────────────────────────┬────────────┐
 *   │  [icon] Current area       │  ⌾ Tagro   │
 *   └────────────────────────────┴────────────┘
 *      Contextual navigation         Persistent Tagro entry
 *      (opens the full nav sheet)    (opens Tagro with route context)
 *
 * The left pill always reflects the current /dev/* area — the label swaps
 * between Aufgaben / Projekte / GitHub / Dateien / Einstellungen / …
 * as you move around, so users can see where they are and one tap opens
 * fast contextual navigation. The right pill is Tagro, using the exact
 * same visual language as the Client Portal so both portals feel like one
 * product on mobile.
 */

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CaretUpDown, ChatCircle } from '@phosphor-icons/react'

import DevMobileNavSheet from '@/components/dev/DevMobileNavSheet'
import { openTagro } from '@/components/TagroOverlay'
import { FESTAG_MOBILE_DOCK_CSS } from '@/components/mobile/festag-mobile-dock-styles'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { OPEN_DEV_NAV_EVENT } from '@/lib/festag-global-dock'
import {
  getCurrentDevArea,
  getDevRouteTagroContext,
} from '@/lib/dev-mobile-nav'

/**
 * Local additions to the shared dock CSS. Kept in-component so a single
 * `<style>` block emits everything the dock needs, and so PortalMobileDock
 * (which uses the same shared CSS for its segment + primary pill) is not
 * touched by this change.
 */
const DEV_MOBILE_DOCK_LOCAL_CSS = `
  .fmd-context {
    flex: 1 1 auto;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    height: 58px;
    padding: 0 20px;
    border: 0;
    border-radius: 999px;
    background: var(--fmd-segment-bg, #f2f2f7);
    color: var(--fmd-context-fg, #1e1e20);
    box-shadow: inset 0 0 0 1px var(--fmd-segment-border, rgba(0, 0, 0, 0.06));
    font: inherit;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.005em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    text-align: left;
    transition: background .16s ease, transform .14s ease, box-shadow .16s ease;
  }
  .fmd-context:active {
    transform: scale(0.985);
  }
  .fmd-context-icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    color: var(--fmd-context-icon, #1e1e20);
  }
  .fmd-context-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1;
  }
  .fmd-context-caret {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    color: var(--fmd-context-caret, rgba(30, 30, 32, 0.4));
  }

  [data-theme='dark'] .fmd-context,
  [data-theme='classic-dark'] .fmd-context {
    --fmd-context-fg: rgba(245, 245, 247, 0.94);
    --fmd-context-icon: rgba(245, 245, 247, 0.88);
    --fmd-context-caret: rgba(255, 255, 255, 0.36);
  }
`

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

  const area = getCurrentDevArea(pathname)
  const AreaIcon = area.Icon
  const tagroContext = getDevRouteTagroContext(pathname)

  function handleOpenTagro() {
    openTagro({
      contextType: 'dev_item',
      id: `dev:${pathname}`,
      title: `Tagro — ${tagroContext.title}`,
      prefill: tagroContext.prefill,
    })
  }

  return (
    <>
      <style>{FESTAG_MOBILE_DOCK_CSS}</style>
      <style>{DEV_MOBILE_DOCK_LOCAL_CSS}</style>
      <div className="fmd-root fmd-root--on" role="toolbar" aria-label="Dev Navigation">
        <button
          type="button"
          className="fmd-context"
          aria-label={`Bereich: ${area.label}. Navigation öffnen`}
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
        >
          <AreaIcon className="fmd-context-icon" weight="regular" />
          <span className="fmd-context-label">{area.label}</span>
          <CaretUpDown className="fmd-context-caret" weight="bold" />
        </button>
        <button
          type="button"
          className="fmd-primary"
          aria-label={`Tagro öffnen, Kontext ${tagroContext.title}`}
          onClick={handleOpenTagro}
        >
          <ChatCircle className="fmd-primary-icon" weight="fill" />
          <span>Tagro</span>
        </button>
      </div>

      <DevMobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />
    </>
  )
}
