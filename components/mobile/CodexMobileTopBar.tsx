'use client'

import { ArrowLeft, DotsThree, List, MagnifyingGlass } from '@phosphor-icons/react'
import CodexOrbButton from '@/components/mobile/CodexOrbButton'
import { CODEX_ORB_CSS } from '@/components/mobile/codex-mobile-styles'

type LeftKind = 'menu' | 'back' | 'none'
type RightKind = 'more' | 'search' | 'none'

type Props = {
  left?: LeftKind
  right?: RightKind
  onLeft?: () => void
  onRight?: () => void
  dark?: boolean
}

export default function CodexMobileTopBar({
  left = 'menu',
  right = 'more',
  onLeft,
  onRight,
  dark = false,
}: Props) {
  return (
    <>
      <style>{CODEX_ORB_CSS}</style>
      <div className="cx-topbar">
        {left === 'menu' ? (
          <CodexOrbButton ariaLabel="Menü" onClick={onLeft} dark={dark}>
            <List size={20} weight="regular" />
          </CodexOrbButton>
        ) : left === 'back' ? (
          <CodexOrbButton ariaLabel="Zurück" onClick={onLeft} dark={dark}>
            <ArrowLeft size={20} weight="regular" />
          </CodexOrbButton>
        ) : (
          <span className="cx-topbar-spacer" aria-hidden />
        )}

        {right === 'search' ? (
          <CodexOrbButton ariaLabel="Suche" onClick={onRight} dark={dark}>
            <MagnifyingGlass size={20} weight="regular" />
          </CodexOrbButton>
        ) : right === 'more' ? (
          <CodexOrbButton ariaLabel="Mehr" onClick={onRight} dark={dark}>
            <DotsThree size={22} weight="bold" />
          </CodexOrbButton>
        ) : (
          <span className="cx-topbar-spacer" aria-hidden />
        )}
      </div>
    </>
  )
}
