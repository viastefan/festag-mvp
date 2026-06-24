'use client'

import { useEffect } from 'react'
import FestagDesktopAppInstall from '@/components/FestagDesktopAppInstall'
import { FESTAG_CHROME_EXTENSION } from '@/lib/extension/chrome-extension'

export default function DownloadPage() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash !== `#${FESTAG_CHROME_EXTENSION.anchorId}`) return
    const el = document.getElementById(FESTAG_CHROME_EXTENSION.anchorId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return <FestagDesktopAppInstall />
}
