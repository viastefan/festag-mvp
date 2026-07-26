'use client'

import { ArrowLeft, List, MagnifyingGlass } from '@phosphor-icons/react'
import CodexOrbButton from '@/components/mobile/CodexOrbButton'
import { CODEX_ORB_CSS } from '@/components/mobile/codex-mobile-styles'

type LeftKind = 'menu' | 'back' | 'none'
type RightKind = 'actions' | 'search' | 'menu' | 'none'

type Props = {
  left?: LeftKind
  right?: RightKind
  onLeft?: () => void
  onSearch?: () => void
  onMenu?: () => void
  dark?: boolean
}

export default function CodexMobileTopBar({
  left = 'menu',
  right = 'actions',
  onLeft,
  onSearch,
  onMenu,
  dark = false,
}: Props) {
  return (
    <>
      <style>{CODEX_ORB_CSS}</style>
      <div className="cx-topbar">
        {left === 'menu' ? (
          <CodexOrbButton ariaLabel="Menü" onClick={onLeft} dark={dark}>
            <List size={18} weight="regular" />
          </CodexOrbButton>
        ) : left === 'back' ? (
          <CodexOrbButton ariaLabel="Zurück" onClick={onLeft} dark={dark}>
            <ArrowLeft size={18} weight="regular" />
          </CodexOrbButton>
        ) : (
          <span className="cx-topbar-spacer" aria-hidden />
        )}

        {right === 'actions' ? (
          <div className="cx-topbar-right">
            <CodexOrbButton ariaLabel="Suche" onClick={onSearch} dark={dark}>
              <MagnifyingGlass size={18} weight="regular" />
            </CodexOrbButton>
            <CodexOrbButton ariaLabel="Menü" onClick={onMenu ?? onLeft} dark={dark}>
              <List size={18} weight="regular" />
            </CodexOrbButton>
          </div>
        ) : right === 'search' ? (
          <CodexOrbButton ariaLabel="Suche" onClick={onSearch} dark={dark}>
            <MagnifyingGlass size={18} weight="regular" />
          </CodexOrbButton>
        ) : right === 'menu' ? (
          <CodexOrbButton ariaLabel="Menü" onClick={onMenu ?? onLeft} dark={dark}>
            <List size={18} weight="regular" />
          </CodexOrbButton>
        ) : (
          <span className="cx-topbar-spacer" aria-hidden />
        )}
      </div>
    </>
  )
}
