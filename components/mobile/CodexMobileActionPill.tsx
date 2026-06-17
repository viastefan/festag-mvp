'use client'

import { DotsThree, MagnifyingGlass } from '@phosphor-icons/react'
import { CODEX_ORB_CSS } from '@/components/mobile/codex-mobile-styles'

type Props = {
  onMenu?: () => void
  onSearch?: () => void
  dark?: boolean
}

export default function CodexMobileActionPill({ onMenu, onSearch, dark = false }: Props) {
  return (
    <>
      <style>{CODEX_ORB_CSS}</style>
      <div className={`cx-action-pill${dark ? ' cx-action-pill--dark' : ''}`}>
        <button type="button" className="cx-action-pill-btn" aria-label="Suche" onClick={onSearch}>
          <MagnifyingGlass size={20} weight="regular" />
        </button>
        <button type="button" className="cx-action-pill-btn" aria-label="Menü" onClick={onMenu}>
          <DotsThree size={20} weight="bold" />
        </button>
      </div>
    </>
  )
}
