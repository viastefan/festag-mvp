'use client'

import { useEffect, useState } from 'react'

export const FESTAG_MOBILE_MQ = '(max-width: 768px)'

/** True when viewport is mobile — popups become bottom sheets. */
export function useFestagMobile(): boolean {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(FESTAG_MOBILE_MQ)
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return mobile
}
