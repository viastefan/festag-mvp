'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import {
  markPortalAreaIntroSeen,
  portalAreaIntroSeen,
  PORTAL_AREA_INTROS,
  type PortalAreaId,
} from '@/lib/portal-area-intros'
import './portal-area-intro.css'

type Props = {
  area: PortalAreaId
  /** Controlled open — omit for auto first-visit. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function PortalAreaIntro({ area, open: controlledOpen, onOpenChange }: Props) {
  const content = PORTAL_AREA_INTROS[area]
  const isMobile = useFestagMobile()
  const [mounted, setMounted] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (controlledOpen !== undefined) return
    if (!mounted || portalAreaIntroSeen(area)) return
    const t = window.setTimeout(() => setInternalOpen(true), 480)
    return () => window.clearTimeout(t)
  }, [area, controlledOpen, mounted])

  useEffect(() => {
    if (!open || !isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, isMobile])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }

  function close() {
    markPortalAreaIntroSeen(area)
    setOpen(false)
  }

  if (!mounted || !open) return null

  const Icon = content.Icon

  const body = (
    <>
      <div className="pai-head">
        <span className="pai-icon" aria-hidden>
          <Icon size={18} weight="regular" />
        </span>
        <div className="pai-head-copy">
          <p className="pai-kicker">{content.kicker}</p>
          <h2 className="pai-title">{content.title}</h2>
        </div>
        {!isMobile ? (
          <button type="button" className="pai-close" aria-label="Schließen" onClick={close}>
            <X size={14} weight="regular" />
          </button>
        ) : null}
      </div>

      <p className="pai-body">{content.body}</p>

      <ul className="pai-list">
        {content.bullets.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="pai-compare">
        <p className="pai-compare-label">Nicht verwechseln mit</p>
        {content.compare.map(row => (
          <div key={row.area} className="pai-compare-row">
            <span className="pai-compare-area">{row.area}</span>
            <span className="pai-compare-text">{row.text}</span>
          </div>
        ))}
      </div>

      <button type="button" className="pai-cta" onClick={close}>
        Verstanden
      </button>
    </>
  )

  return createPortal(
    isMobile ? (
      <div className="festag-popup-mobile-host">
        <button type="button" className="festag-popup-backdrop" aria-label="Schließen" onClick={close} />
        <div
          className="pai-pop festag-popup-surface festag-popup-mobile-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={`${content.title} — Einführung`}
        >
          <FestagPopupDragHandle onDismiss={close} />
          {body}
        </div>
      </div>
    ) : (
      <>
        <button type="button" className="festag-popup-backdrop" aria-label="Schließen" onClick={close} />
        <div
          className="pai-pop festag-popup-surface"
          role="dialog"
          aria-modal="true"
          aria-label={`${content.title} — Einführung`}
        >
          {body}
        </div>
      </>
    ),
    document.body,
  )
}
