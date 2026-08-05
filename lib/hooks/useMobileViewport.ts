'use client'

import { useEffect, useState } from 'react'

const QUERY = '(max-width: 768px)'

/** True when viewport is Festag mobile (≤768px). */
export function useMobileViewport(): boolean {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return mobile
}
