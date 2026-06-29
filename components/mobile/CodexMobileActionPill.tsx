'use client'

import { List, MagnifyingGlass } from '@phosphor-icons/react'
import { CODEX_ORB_CSS } from '@/components/mobile/codex-mobile-styles'

type Props = {
  onMenu?: () => void
  onSearch?: () => void
  dark?: boolean
}

/** Cursor-style separate circular orbs — search + menu on the right. */
export default function CodexMobileActionPill({ onMenu, onSearch, dark = false }: Props) {
  return (
    <>
      <style>{CODEX_ORB_CSS}</style>
      <div className={`cx-orb-group${dark ? ' cx-action-pill--dark' : ''}`}>
        <button type="button" className="cx-orb" aria-label="Suche" onClick={onSearch}>
          <MagnifyingGlass size={18} weight="regular" />
        </button>
        <button type="button" className="cx-orb" aria-label="Menü" onClick={onMenu}>
          <List size={18} weight="regular" />
        </button>
      </div>
    </>
  )
}
