'use client'

import { DotsThree, MagnifyingGlass } from '@phosphor-icons/react'
import { CODEX_ORB_CSS } from '@/components/mobile/codex-mobile-styles'
import { useFestagGlobalDock } from '@/hooks/useFestagGlobalDock'
import { openPortalNav } from '@/lib/festag-global-dock'

type Props = {
  onMenu?: () => void
  onSearch?: () => void
  dark?: boolean
}

export default function CodexMobileActionPill({ onMenu, onSearch, dark = false }: Props) {
  const { portalDock } = useFestagGlobalDock()

  function handleMenu() {
    if (portalDock) {
      openPortalNav()
      return
    }
    onMenu?.()
  }

  return (
    <>
      <style>{CODEX_ORB_CSS}</style>
      <div className={`cx-action-pill${dark ? ' cx-action-pill--dark' : ''}${portalDock ? ' cx-action-pill--nav-delegated' : ''}`}>
        <button type="button" className="cx-action-pill-btn" aria-label="Suche" onClick={onSearch}>
          <MagnifyingGlass size={20} weight="regular" />
        </button>
        {!portalDock && (
          <button type="button" className="cx-action-pill-btn" aria-label="Menü" onClick={handleMenu}>
            <DotsThree size={20} weight="bold" />
          </button>
        )}
      </div>
    </>
  )
}
