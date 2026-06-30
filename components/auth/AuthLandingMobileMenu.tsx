'use client'

import { useState } from 'react'
import { DotsThree } from '@phosphor-icons/react'
import MobileNavSheetShell from '@/components/mobile/MobileNavSheetShell'
import { CODEX_ORB_CSS } from '@/components/mobile/codex-mobile-styles'
import { AUTH_LEGAL_LINKS } from '@/lib/legal-nav'

type Props = {
  onNavigate: (href: string) => void
}

export default function AuthLandingMobileMenu({ onNavigate }: Props) {
  const [open, setOpen] = useState(false)

  function go(href: string) {
    setOpen(false)
    onNavigate(href)
  }

  return (
    <>
      <style>{CODEX_ORB_CSS}</style>
      <div className="al-mobile-menu">
        <button
          type="button"
          className="cx-action-pill-btn"
          aria-label="Menü"
          onClick={() => setOpen(true)}
        >
          <DotsThree size={18} weight="bold" />
        </button>
      </div>

      <MobileNavSheetShell
        open={open}
        onClose={() => setOpen(false)}
        title="Menü"
        ariaLabel="Festag Navigation"
      >
        <div className="mns-list" role="list">
          {AUTH_LEGAL_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="mns-item"
              role="listitem"
              onClick={e => {
                e.preventDefault()
                go(href)
              }}
            >
              <span className="mns-item-label">{label}</span>
            </a>
          ))}
        </div>
      </MobileNavSheetShell>
    </>
  )
}
