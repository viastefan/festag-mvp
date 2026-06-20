'use client'

import { useEffect, useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'

/** Reset sheet/backdrop state whenever decisions routes change (incl. router cache restore). */
export function dismissDecisionsOverlays() {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent('festag:decisions-dismiss-overlays'))
  } catch { /* noop */ }
  document.body.style.overflow = ''
}

export default function DecisionsRouteEffects() {
  const pathname = usePathname() || ''

  useLayoutEffect(() => {
    dismissDecisionsOverlays()
  }, [pathname])

  useEffect(() => {
    dismissDecisionsOverlays()
    function onPageShow() { dismissDecisionsOverlays() }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [pathname])

  return null
}
